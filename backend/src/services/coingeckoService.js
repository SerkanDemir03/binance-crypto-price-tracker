const axios = require('axios');
const { CRYPTO_SYMBOLS } = require('../config/constants');
const logger = require('../utils/logger');
const cacheService = require('./cacheService');
const rateLimitService = require('./rateLimitService');

// CoinGecko API URL
const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3/simple/price';
const COINGECKO_EXCHANGE_RATES_URL = 'https://api.coingecko.com/api/v3/exchange_rates';

// Binance symbol'lerini CoinGecko ID'lerine map et
const SYMBOL_TO_COINGECKO_ID = {
  'BTCUSDT': 'bitcoin',
  'ETHUSDT': 'ethereum',
  'BNBUSDT': 'binancecoin',
  'ADAUSDT': 'cardano',
  'XRPUSDT': 'ripple',
  'DOGEUSDT': 'dogecoin',
  'DOTUSDT': 'polkadot',
  'LINKUSDT': 'chainlink',
  'LTCUSDT': 'litecoin',
  'BCHUSDT': 'bitcoin-cash',
  'BCCUSDT': 'bitcoin-cash',
  'BCHABCUSDT': 'bitcoin-cash',
  'BCHSVUSDT': 'bitcoin-sv',
  'EOSUSDT': 'eos',
  'XLMUSDT': 'stellar',
  'TRXUSDT': 'tron',
  'ETCUSDT': 'ethereum-classic',
  'VETUSDT': 'vechain',
  'MATICUSDT': 'matic-network',
  'ATOMUSDT': 'cosmos',
  'ALGOUSDT': 'algorand',
  'FTMUSDT': 'fantom',
  'THETAUSDT': 'theta-token',
  'FILUSDT': 'filecoin',
  'AAVEUSDT': 'aave',
  'UNIUSDT': 'uniswap',
  'SOLUSDT': 'solana',
  'AVAXUSDT': 'avalanche-2',
  'NEARUSDT': 'near',
  'APTUSDT': 'aptos',
  'ARBUSDT': 'arbitrum',
  'OPUSDT': 'optimism',
  'SUIUSDT': 'sui',
  'INJUSDT': 'injective-protocol',
  'TIAUSDT': 'celestia',
  'SEIUSDT': 'sei-network',
  'WAVESUSDT': 'waves',
  'ZECUSDT': 'zcash',
  'XMRUSDT': 'monero',
  'DASHUSDT': 'dash',
  'ZILUSDT': 'zilliqa',
  'ONTUSDT': 'ontology',
  'ICXUSDT': 'icon',
  'OMGUSDT': 'omisego',
  'ENJUSDT': 'enjincoin',
  'BATUSDT': 'basic-attention-token',
  'ZRXUSDT': '0x',
  'IOSTUSDT': 'iostoken',
  'CELRUSDT': 'celer-network',
  'ONEUSDT': 'harmony',
  'HOTUSDT': 'holo',
  'NANOUSDT': 'nano',
  'IOTAUSDT': 'iota',
  'QTUMUSDT': 'qtum',
  'NEOUSDT': 'neo',
  'FETUSDT': 'fetch-ai',
  'MITHUSDT': 'mithril',
  'TFUELUSDT': 'theta-fuel',
  'USDCUSDT': 'usd-coin',
  'TUSDUSDT': 'true-usd',
  'PAXUSDT': 'paxos-standard',
  'USDSUSDT': 'usd-coin',
  'ONGUSDT': 'ontology-gas',
};

class CoinGeckoService {
  /**
   * CoinGecko API'den tüm kripto paraların fiyatlarını çeker
   * Rate limit: 50 calls/minute (ücretsiz plan)
   * Tek istekle tüm fiyatları alır
   */
  async getAllPrices() {
    // Check cache first
    const cacheKey = cacheService.generateKey('coingecko', 'all-prices');
    const cached = cacheService.get(cacheKey);
    if (cached) {
      logger.info('✅ CoinGecko fiyatları cache\'den alındı');
      return cached;
    }

    // Check rate limit (CoinGecko: 50 calls/minute)
    if (!rateLimitService.canMakeRequest('coingecko', 1200)) {
      await rateLimitService.waitForBackoff('coingecko');
    }

    try {
      // Tüm CoinGecko ID'lerini topla
      const coinIds = CRYPTO_SYMBOLS
        .map(symbol => SYMBOL_TO_COINGECKO_ID[symbol])
        .filter(id => id !== undefined); // Map edilemeyen symbol'leri filtrele

      if (coinIds.length === 0) {
        logger.warn('⚠️ CoinGecko için map edilebilir kripto para bulunamadı');
        return [];
      }

      // CoinGecko API'den fiyatları çek (USD cinsinden)
      const response = await axios.get(COINGECKO_API_URL, {
        params: {
          ids: coinIds.join(','),
          vs_currencies: 'usd',
          include_24hr_change: false
        },
        timeout: 15000,
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.status === 200 && response.data) {
        const prices = [];
        
        // CoinGecko response'unu Binance formatına çevir
        for (const symbol of CRYPTO_SYMBOLS) {
          const coinGeckoId = SYMBOL_TO_COINGECKO_ID[symbol];
          if (coinGeckoId && response.data[coinGeckoId]) {
            const price = response.data[coinGeckoId].usd;
            if (price) {
              prices.push({
                symbol: symbol,
                price: parseFloat(price)
              });
            }
          }
        }

        logger.info(`✅ ${prices.length} kripto para fiyatı CoinGecko API'den alındı`);
        
        // Cache the result (1 minute TTL)
        cacheService.set(cacheKey, prices, 60 * 1000);
        rateLimitService.recordSuccess('coingecko');
        
        return prices;
      }

      return [];
    } catch (error) {
      if (error.response?.status === 429) {
        const retryAfter = parseInt(error.response.headers['retry-after']) || null;
        rateLimitService.recordRateLimit('coingecko', retryAfter);
        logger.warn('⚠️ CoinGecko API rate limit aşıldı (429). Lütfen birkaç saniye bekleyin.');
        throw new Error('CoinGecko API rate limit aşıldı. Lütfen birkaç saniye sonra tekrar deneyin.');
      } else if (error.response?.status === 404) {
        logger.warn('⚠️ CoinGecko API endpoint bulunamadı');
        throw new Error('CoinGecko API endpoint bulunamadı');
      } else {
        logger.error('❌ CoinGecko API hatası:', error.message);
        throw new Error(`CoinGecko API'den fiyatlar alınamadı: ${error.message}`);
      }
    }
  }

  /**
   * Belirli bir kripto paranın fiyatını çeker
   */
  async getPriceBySymbol(symbol) {
    try {
      const coinGeckoId = SYMBOL_TO_COINGECKO_ID[symbol];
      if (!coinGeckoId) {
        throw new Error(`${symbol} için CoinGecko ID bulunamadı`);
      }

      const response = await axios.get(COINGECKO_API_URL, {
        params: {
          ids: coinGeckoId,
          vs_currencies: 'usd'
        },
        timeout: 5000
      });

      if (response.status === 200 && response.data[coinGeckoId]) {
        return {
          symbol: symbol,
          price: parseFloat(response.data[coinGeckoId].usd)
        };
      }

      throw new Error(`${symbol} için fiyat bulunamadı`);
    } catch (error) {
      logger.error(`Error fetching price for ${symbol} from CoinGecko:`, error);
      throw error;
    }
  }

  /**
   * CoinGecko API durumunu kontrol eder
   */
  async checkHealth() {
    try {
      const response = await axios.get('https://api.coingecko.com/api/v3/ping', {
        timeout: 5000
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * CoinGecko'dan coin listesini çeker (search/autocomplete için)
   */
  async searchCoins(query, limit = 20) {
    try {
      const response = await axios.get('https://api.coingecko.com/api/v3/search', {
        params: {
          query: query
        },
        timeout: 10000
      });

      if (response.status === 200 && response.data.coins) {
        return response.data.coins
          .slice(0, limit)
          .map(coin => ({
            id: coin.id,
            name: coin.name,
            symbol: coin.symbol.toUpperCase(),
            thumb: coin.thumb,
            large: coin.large
          }));
      }
      return [];
    } catch (error) {
      logger.error('Error searching coins:', error);
      return [];
    }
  }

  /**
   * Symbol veya coin adından CoinGecko ID'yi bulur
   */
  async findCoinId(symbolOrName) {
    try {
      const searchTerm = symbolOrName.trim();
      if (!searchTerm) return null;
      
      // Önce symbol'e göre ara
      const searchResults = await this.searchCoins(searchTerm, 20); // Daha fazla sonuç al
      
      if (searchResults.length > 0) {
        const upperSearch = searchTerm.toUpperCase();
        const lowerSearch = searchTerm.toLowerCase();
        
        // 1. Önce tam symbol eşleşmesi ara
        const exactSymbolMatch = searchResults.find(
          coin => coin.symbol.toUpperCase() === upperSearch
        );
        if (exactSymbolMatch) {
          logger.info(`✅ Tam symbol eşleşmesi bulundu: ${exactSymbolMatch.symbol} -> ${exactSymbolMatch.id}`);
          return exactSymbolMatch.id;
        }
        
        // 2. Tam coin adı eşleşmesi ara
        const exactNameMatch = searchResults.find(
          coin => coin.name.toLowerCase() === lowerSearch
        );
        if (exactNameMatch) {
          logger.info(`✅ Tam ad eşleşmesi bulundu: ${exactNameMatch.name} -> ${exactNameMatch.id}`);
          return exactNameMatch.id;
        }
        
        // 3. Kısmi eşleşme ara (symbol başlangıcı)
        const partialSymbolMatch = searchResults.find(
          coin => coin.symbol.toUpperCase().startsWith(upperSearch) ||
                  upperSearch.startsWith(coin.symbol.toUpperCase())
        );
        if (partialSymbolMatch) {
          logger.info(`✅ Kısmi symbol eşleşmesi bulundu: ${partialSymbolMatch.symbol} -> ${partialSymbolMatch.id}`);
          return partialSymbolMatch.id;
        }
        
        // 4. Kısmi ad eşleşmesi ara
        const partialNameMatch = searchResults.find(
          coin => coin.name.toLowerCase().includes(lowerSearch) ||
                  lowerSearch.includes(coin.name.toLowerCase())
        );
        if (partialNameMatch) {
          logger.info(`✅ Kısmi ad eşleşmesi bulundu: ${partialNameMatch.name} -> ${partialNameMatch.id}`);
          return partialNameMatch.id;
        }
        
        // 5. İlk sonucu döndür (en popüler olanı)
        logger.info(`⚠️ Tam eşleşme bulunamadı, ilk sonuç kullanılıyor: ${searchResults[0].name} -> ${searchResults[0].id}`);
        return searchResults[0].id;
      }
      
      logger.warn(`⚠️ ${searchTerm} için arama sonucu bulunamadı`);
      return null;
    } catch (error) {
      logger.error('Error finding coin ID:', error);
      return null;
    }
  }

  /**
   * Belirli bir coin'in fiyatını symbol veya coin adı ile çeker
   */
  async getPriceBySymbolOrName(symbolOrName) {
    try {
      // CoinGecko ID'yi bul
      const coinId = await this.findCoinId(symbolOrName);
      
      if (!coinId) {
        throw new Error(`${symbolOrName} için coin bulunamadı`);
      }

      // Fiyatı çek
      const response = await axios.get(COINGECKO_API_URL, {
        params: {
          ids: coinId,
          vs_currencies: 'usd'
        },
        timeout: 10000
      });

      if (response.status === 200 && response.data[coinId]) {
        return {
          symbol: symbolOrName.toUpperCase(),
          coinId: coinId,
          price: parseFloat(response.data[coinId].usd)
        };
      }

      throw new Error(`${symbolOrName} için fiyat bulunamadı`);
    } catch (error) {
      logger.error(`Error fetching price for ${symbolOrName}:`, error);
      throw error;
    }
  }

  /**
   * Coin detaylarını çeker (genel bakış, market data, links, vs.)
   */
  async getCoinInfo(symbolOrId) {
    try {
      // Önce CoinGecko ID'yi bul
      let coinId;
      if (symbolOrId.includes('-') || symbolOrId.length > 10) {
        // Zaten bir ID gibi görünüyor
        coinId = symbolOrId.toLowerCase();
      } else {
        // Symbol ise ID'yi bul
        coinId = await this.findCoinId(symbolOrId);
        if (!coinId) {
          throw new Error(`${symbolOrId} için CoinGecko ID bulunamadı`);
        }
      }

      // CoinGecko API'den detaylı bilgileri çek
      const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${coinId}`, {
        params: {
          localization: false,
          tickers: false,
          market_data: true,
          community_data: false,
          developer_data: false,
          sparkline: false
        },
        timeout: 15000
      });

      if (response.status === 200 && response.data) {
        const data = response.data;
        const marketData = data.market_data || {};
        const description = data.description?.en || data.description?.tr || '';
        
        // TRY fiyatını CoinGecko'dan direkt çek
        const usdPrice = marketData.current_price?.usd || 0;
        const tryPrice = marketData.current_price?.try || 0;
        
        // 24 saatlik değişim
        const priceChange24h = marketData.price_change_percentage_24h || 0;
        
        // Market cap dominance hesapla (global market cap'ten)
        let marketCapDominance = null;
        if (marketData.market_cap?.usd && marketData.total_market_cap?.usd) {
          marketCapDominance = ((marketData.market_cap.usd / marketData.total_market_cap.usd) * 100).toFixed(2);
        }
        
        return {
          id: data.id,
          name: data.name,
          symbol: data.symbol.toUpperCase(),
          description: description.replace(/<[^>]*>/g, ''), // HTML tag'lerini temizle
          image: data.image?.large || data.image?.small || '',
          homepage: data.links?.homepage?.[0] || '',
          whitepaper: data.links?.whitepaper || '',
          marketCapRank: data.market_cap_rank || null,
          categories: data.categories || [],
          circulatingSupply: marketData.circulating_supply || 0,
          totalSupply: marketData.total_supply || marketData.circulating_supply || 0,
          currentPrice: {
            usd: usdPrice,
            try: tryPrice
          },
          priceChange24h: priceChange24h,
          marketCap: marketData.market_cap?.usd || 0,
          marketCapDominance: marketCapDominance
        };
      }

      throw new Error('Coin bilgileri alınamadı');
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error(`${symbolOrId} için coin bulunamadı`);
      }
      logger.error(`Error fetching coin info for ${symbolOrId}:`, error);
      throw error;
    }
  }

  /**
   * Birden fazla coin'in fiyatını çeker (custom coin listesi için)
   * Optimize edilmiş: Paralel search yaparak daha hızlı çalışır
   */
  async getPricesBySymbols(symbols) {
    try {
      if (!symbols || symbols.length === 0) {
        return [];
      }

      logger.info(`🔄 ${symbols.length} coin için CoinGecko ID'leri aranıyor (paralel)...`);
      
      // Paralel olarak tüm symbol'ler için CoinGecko ID bul (çok daha hızlı)
      const coinIdPromises = symbols.map(symbol => 
        this.findCoinId(symbol).catch(err => {
          logger.warn(`⚠️ ${symbol} için CoinGecko ID bulunamadı: ${err.message}`);
          return null;
        })
      );
      
      const coinIdResults = await Promise.all(coinIdPromises);
      
      const coinIds = [];
      const symbolToIdMap = {};
      
      // Başarılı sonuçları topla
      coinIdResults.forEach((coinId, index) => {
        if (coinId) {
          coinIds.push(coinId);
          symbolToIdMap[coinId] = symbols[index].toUpperCase();
        }
      });

      if (coinIds.length === 0) {
        logger.warn(`⚠️ Hiçbir coin için CoinGecko ID bulunamadı`);
        return [];
      }

      logger.info(`✅ ${coinIds.length}/${symbols.length} coin için CoinGecko ID bulundu, fiyatlar çekiliyor...`);

      // Tüm fiyatları tek istekle çek (batch request - çok daha hızlı)
      const response = await axios.get(COINGECKO_API_URL, {
        params: {
          ids: coinIds.join(','),
          vs_currencies: 'usd'
        },
        timeout: 20000 // 20 saniye timeout (çok coin için)
      });

      if (response.status === 200 && response.data) {
        const prices = [];
        for (const [coinId, priceData] of Object.entries(response.data)) {
          if (priceData.usd && symbolToIdMap[coinId]) {
            prices.push({
              symbol: symbolToIdMap[coinId] + 'USDT', // Binance formatına uyumlu (veritabanı için)
              price: parseFloat(priceData.usd)
            });
          }
        }
        
        logger.info(`✅ ${prices.length} coin fiyatı başarıyla çekildi`);
        return prices;
      }

      return [];
    } catch (error) {
      if (error.response?.status === 429) {
        logger.warn('⚠️ CoinGecko API rate limit aşıldı (429)');
        throw new Error('CoinGecko API rate limit aşıldı. Lütfen birkaç saniye sonra tekrar deneyin.');
      }
      logger.error('❌ Error fetching prices by symbols:', error);
      throw error;
    }
  }

  /**
   * Fiat para birimlerinin USD karşılığını getirir
   * @param {string} currency - Para birimi kodu (EUR, TRY, SAR, vb.)
   * @returns {Promise<number>} USD karşılığı
   */
  async getFiatExchangeRate(currency) {
    try {
      // Check cache first
      const cacheKey = cacheService.generateKey('coingecko', `fiat-rate-${currency.toLowerCase()}`);
      const cached = cacheService.get(cacheKey);
      if (cached) {
        logger.debug(`✅ Fiat exchange rate cache'den alındı: ${currency}`);
        return cached;
      }

      // Check rate limit
      if (!rateLimitService.canMakeRequest('coingecko', 1200)) {
        await rateLimitService.waitForBackoff('coingecko');
      }

      // CoinGecko exchange rates API'den tüm kurları çek
      const response = await axios.get(COINGECKO_EXCHANGE_RATES_URL, {
        timeout: 10000,
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.status === 200 && response.data && response.data.rates) {
        const currencyUpper = currency.toUpperCase();
        const rateData = response.data.rates[currencyUpper.toLowerCase()];
        
        if (!rateData) {
          throw new Error(`${currency} için kur bulunamadı`);
        }

        // CoinGecko rates API'si USD bazlı değerler döner
        // value: 1 USD = X currency (örneğin EUR için ~0.92)
        // Ama bizim ihtiyacımız 1 currency = X USD
        // Bu yüzden 1 / value yapmalıyız
        const rate = rateData.value ? (1 / rateData.value) : null;
        
        if (!rate || rate <= 0) {
          throw new Error(`${currency} için geçersiz kur değeri`);
        }

        // Cache'e kaydet (5 dakika)
        cacheService.set(cacheKey, rate, 5 * 60 * 1000);
        
        logger.info(`✅ ${currency} exchange rate alındı: ${rate}`);
        return rate;
      }

      throw new Error('Exchange rates API yanıtı geçersiz');
    } catch (error) {
      logger.error(`❌ Error getting fiat exchange rate for ${currency}:`, error);
      throw error;
    }
  }
}

module.exports = new CoinGeckoService();

