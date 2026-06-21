const axios = require('axios');
const databaseService = require('./databaseService');
const logger = require('../utils/logger');

/**
 * Automatically translates English text to Turkish using Google Translate API
 * @param {string} text - English text to translate
 * @returns {Promise<string>} Translated Turkish text or original text if failed
 */
async function translateToTurkish(text) {
  if (!text || typeof text !== 'string') return '';
  try {
    // Split by paragraphs to respect potential GET URL limitations
    const paragraphs = text.split('\n');
    const translatedParagraphs = [];
    
    for (const paragraph of paragraphs) {
      if (!paragraph.trim()) {
        translatedParagraphs.push('');
        continue;
      }
      
      const response = await axios.get('https://translate.googleapis.com/translate_a/single', {
        params: {
          client: 'gtx',
          sl: 'en',
          tl: 'tr',
          dt: 't',
          q: paragraph
        },
        timeout: 8000
      });
      
      if (response.data && response.data[0]) {
        const translatedPart = response.data[0].map(item => item[0]).join('');
        translatedParagraphs.push(translatedPart);
      } else {
        translatedParagraphs.push(paragraph);
      }
    }
    
    return translatedParagraphs.join('\n');
  } catch (error) {
    logger.warn('Google Translate API error (using original text):', error.message);
    return text;
  }
}

/**
 * Metadata Service for CoinGecko API
 * Handles static data (name, logo, description, market cap) with 24-hour caching
 * Uses PostgreSQL to cache metadata and only fetches from API if data is missing or stale
 */
class MetadataService {
  constructor() {
    this.cache = new Map(); // In-memory cache
    // Note: Using direct CoinGecko API calls instead of ccxt for better control
  }

  /**
   * Get coin metadata (name, logo, description, market cap)
   * Checks database first, only fetches from CoinGecko if data is missing or older than 24 hours
   * @param {string} symbol - Coin symbol (e.g., 'BTCUSDT' or 'BTC')
   * @param {string} coinId - Optional CoinGecko coin ID (e.g., 'bitcoin')
   * @returns {Promise<Object>} Metadata object
   */
  async getMetadata(symbol, coinId = null) {
    try {
      // Normalize symbol
      const normalizedSymbol = symbol.toUpperCase().replace('USDT', '').replace('USD', '');
      
      // Check database first
      const cachedMetadata = await databaseService.getMetadata(normalizedSymbol);
      
      if (cachedMetadata && this.isCacheValid(cachedMetadata.updated_at)) {
        // If cached metadata exists but has no Turkish translation, translate it on-the-fly!
        if (cachedMetadata.description && !cachedMetadata.description_tr) {
          logger.info(`🔄 Cached metadata for ${normalizedSymbol} has no Turkish translation. Translating on-the-fly...`);
          try {
            const translatedDescription = await translateToTurkish(cachedMetadata.description);
            cachedMetadata.description_tr = translatedDescription;
            
            // Save updated metadata to database
            const formatted = this.formatMetadata(cachedMetadata);
            await databaseService.saveMetadata(normalizedSymbol, formatted);
            
            logger.info(`✅ On-the-fly translation saved for ${normalizedSymbol}`);
            return formatted;
          } catch (transError) {
            logger.warn(`⚠️ On-the-fly translation failed for ${normalizedSymbol}:`, transError.message);
          }
        }

        logger.debug(`✅ Using cached metadata for ${normalizedSymbol} from database`);
        return this.formatMetadata(cachedMetadata);
      }

      // Cache is stale or missing, fetch from CoinGecko
      logger.info(`🔄 Fetching fresh metadata for ${normalizedSymbol} from CoinGecko...`);
      const freshMetadata = await this.fetchFromCoinGecko(normalizedSymbol, coinId);
      
      // Save to database
      if (freshMetadata) {
        await databaseService.saveMetadata(normalizedSymbol, freshMetadata);
        logger.info(`✅ Metadata for ${normalizedSymbol} saved to database`);
      }

      return freshMetadata;

    } catch (error) {
      logger.error(`❌ Error getting metadata for ${symbol}:`, error);
      
      // Fallback: try to return cached data even if stale
      try {
        const staleMetadata = await databaseService.getMetadata(symbol.toUpperCase().replace('USDT', ''));
        if (staleMetadata) {
          if (staleMetadata.description && !staleMetadata.description_tr) {
            logger.info(`🔄 Stale metadata for ${symbol} has no Turkish translation. Translating...`);
            try {
              const translatedDescription = await translateToTurkish(staleMetadata.description);
              staleMetadata.description_tr = translatedDescription;
              const formatted = this.formatMetadata(staleMetadata);
              await databaseService.saveMetadata(symbol.toUpperCase().replace('USDT', ''), formatted);
              return formatted;
            } catch (transError) {
              logger.warn(`⚠️ Stale on-the-fly translation failed:`, transError.message);
            }
          }
          logger.warn(`⚠️ Using stale metadata for ${symbol} due to API error`);
          return this.formatMetadata(staleMetadata);
        }
      } catch (fallbackError) {
        logger.error('❌ Fallback to stale metadata also failed:', fallbackError);
      }

      throw error;
    }
  }

  /**
   * Fetch metadata from CoinGecko API
   * @param {string} symbol - Coin symbol (e.g., 'BTC')
   * @param {string} coinId - Optional CoinGecko coin ID
   * @returns {Promise<Object>} Metadata object
   */
  async fetchFromCoinGecko(symbol, coinId = null) {
    try {
      let coinIdToUse = coinId;

      // If coinId not provided, try to find it
      if (!coinIdToUse) {
        coinIdToUse = await this.findCoinGeckoId(symbol);
      }

      if (!coinIdToUse) {
        throw new Error(`CoinGecko ID not found for symbol: ${symbol}`);
      }

      // Fetch coin data from CoinGecko
      // Using direct API call instead of ccxt for more control
      const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${coinIdToUse}`, {
        params: {
          localization: true,
          tickers: false,
          market_data: true,
          community_data: false,
          developer_data: false,
          sparkline: false
        },
        timeout: 15000,
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.data) {
        const coinData = response.data;
        const enDescription = coinData.description?.en || '';
        let trDescription = coinData.description?.tr || '';

        // If Turkish description is missing or identical to the English description, automatically translate it!
        if (!trDescription.trim() || trDescription === enDescription) {
          if (enDescription.trim()) {
            logger.info(`Translating description for ${symbol} to Turkish automatically...`);
            trDescription = await translateToTurkish(enDescription);
          }
        }
        
        return {
          symbol: symbol.toUpperCase(),
          coinId: coinIdToUse,
          name: coinData.name || symbol,
          logoUrl: coinData.image?.large || coinData.image?.small || coinData.image?.thumb || '',
          description: enDescription,
          description_tr: trDescription || enDescription,
          marketCap: coinData.market_data?.market_cap?.usd || 0,
          marketCapRank: coinData.market_cap_rank || null,
          homepage: coinData.links?.homepage?.[0] || '',
          whitepaper: coinData.links?.whitepaper || '',
          categories: coinData.categories || [],
          currentPrice: coinData.market_data?.current_price?.usd || 0,
          priceChange24h: coinData.market_data?.price_change_percentage_24h || 0,
          circulatingSupply: coinData.market_data?.circulating_supply || 0,
          totalSupply: coinData.market_data?.total_supply || 0,
          maxSupply: coinData.market_data?.max_supply || null,
          updated_at: new Date()
        };
      }

      throw new Error('No data returned from CoinGecko API');

    } catch (error) {
      if (error.response?.status === 429) {
        logger.error('❌ CoinGecko rate limit exceeded. Please wait before retrying.');
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      
      logger.error(`❌ Error fetching from CoinGecko for ${symbol}:`, error.message);
      throw error;
    }
  }

  /**
   * Find CoinGecko ID from symbol
   * @param {string} symbol - Coin symbol (e.g., 'BTC')
   * @returns {Promise<string|null>} CoinGecko ID or null
   */
  async findCoinGeckoId(symbol) {
    try {
      // Use direct CoinGecko search API
      const searchResponse = await axios.get('https://api.coingecko.com/api/v3/search', {
        params: {
          query: symbol
        },
        timeout: 10000,
        headers: {
          'Accept': 'application/json'
        }
      });

      if (searchResponse.data?.coins && searchResponse.data.coins.length > 0) {
        // Find exact match first
        const exactMatch = searchResponse.data.coins.find(
          coin => coin.symbol.toUpperCase() === symbol.toUpperCase()
        );
        
        if (exactMatch) {
          return exactMatch.id;
        }
        
        // Return first result if no exact match
        return searchResponse.data.coins[0].id;
      }

      return null;

    } catch (error) {
      if (error.response?.status === 429) {
        logger.warn(`⚠️ CoinGecko rate limit exceeded for ${symbol}`);
      } else {
        logger.warn(`⚠️ CoinGecko search API failed for ${symbol}:`, error.message);
      }
      return null;
    }
  }

  /**
   * Check if cached metadata is still valid (less than 24 hours old)
   * @param {Date|string} updatedAt - Timestamp of last update
   * @returns {boolean} True if cache is valid
   */
  isCacheValid(updatedAt) {
    if (!updatedAt) return false;

    const cacheAge = new Date() - new Date(updatedAt);
    const twentyFourHours = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    return cacheAge < twentyFourHours;
  }

  /**
   * Format metadata from database record
   * @param {Object} dbRecord - Database record
   * @returns {Object} Formatted metadata
   */
  formatMetadata(dbRecord) {
    return {
      symbol: dbRecord.symbol,
      coinId: dbRecord.coin_id,
      name: dbRecord.name,
      logoUrl: dbRecord.logo_url,
      description: dbRecord.description,
      description_tr: dbRecord.description_tr || '',
      marketCap: parseFloat(dbRecord.market_cap || 0),
      marketCapRank: dbRecord.market_cap_rank,
      homepage: dbRecord.homepage,
      whitepaper: dbRecord.whitepaper,
      categories: dbRecord.categories || [],
      currentPrice: parseFloat(dbRecord.current_price || 0),
      priceChange24h: parseFloat(dbRecord.price_change_24h || 0),
      circulatingSupply: parseFloat(dbRecord.circulating_supply || 0),
      totalSupply: parseFloat(dbRecord.total_supply || 0),
      maxSupply: dbRecord.max_supply ? parseFloat(dbRecord.max_supply) : null,
      updated_at: dbRecord.updated_at
    };
  }

  /**
   * Batch fetch metadata for multiple symbols
   * @param {Array<string>} symbols - Array of symbols
   * @returns {Promise<Array<Object>>} Array of metadata objects
   */
  async getBatchMetadata(symbols) {
    try {
      const metadataPromises = symbols.map(symbol => 
        this.getMetadata(symbol).catch(error => {
          logger.warn(`⚠️ Failed to get metadata for ${symbol}:`, error.message);
          return null;
        })
      );

      const results = await Promise.all(metadataPromises);
      return results.filter(meta => meta !== null);

    } catch (error) {
      logger.error('❌ Error in batch metadata fetch:', error);
      return [];
    }
  }

  /**
   * Invalidate cache for a symbol (force refresh on next request)
   * @param {string} symbol - Symbol to invalidate
   */
  async invalidateCache(symbol) {
    const normalizedSymbol = symbol.toUpperCase().replace('USDT', '').replace('USD', '');
    await databaseService.deleteMetadata(normalizedSymbol);
    this.cache.delete(normalizedSymbol);
    logger.info(`🗑️ Cache invalidated for ${normalizedSymbol}`);
  }
}

module.exports = MetadataService;
