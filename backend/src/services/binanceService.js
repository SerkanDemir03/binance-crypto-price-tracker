const axios = require('axios');
const { BINANCE_API_URL, CRYPTO_SYMBOLS } = require('../config/constants');
const logger = require('../utils/logger');

class BinanceService {
  /**
   * Binance API'den tüm kripto paraların fiyatlarını çeker
   * Batch endpoint kullanarak tek istekle tüm fiyatları alır (rate limit'i önlemek için)
   * Retry mekanizması ile 429 hatası durumunda otomatik tekrar dener
   */
  async getAllPrices(maxRetries = 3) {
    let lastError = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          // Exponential backoff: 2^attempt saniye bekle
          const waitTime = Math.pow(2, attempt) * 1000;
          logger.info(`⏳ Rate limit nedeniyle ${waitTime/1000} saniye bekleniyor... (Deneme ${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        // Tüm fiyatları tek istekle al (batch endpoint - rate limit'i önlemek için)
        const allPricesResponse = await axios.get(BINANCE_API_URL, {
          timeout: 15000,
          headers: {
            'Accept': 'application/json'
          }
        });

        if (allPricesResponse.status === 200 && Array.isArray(allPricesResponse.data)) {
          // Tüm fiyatları al, sadece ilgilendiğimiz symbol'leri filtrele
          const allPrices = allPricesResponse.data;
          const filteredPrices = allPrices
            .filter(item => CRYPTO_SYMBOLS.includes(item.symbol))
            .map(item => ({
              symbol: item.symbol,
              price: parseFloat(item.price)
            }));

          logger.info(`✅ ${filteredPrices.length} kripto para fiyatı batch endpoint'den alındı`);
          return filteredPrices;
        }

        // Eğer batch endpoint array döndürmüyorsa, tek tek istek at
        logger.warn('Batch endpoint beklenmeyen format döndürdü, tek tek istek atılıyor...');
        return await this.getAllPricesOneByOne();

      } catch (error) {
        lastError = error;
        
        if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'] || Math.pow(2, attempt);
          logger.warn(`⚠️ Rate limit hatası (429). ${retryAfter} saniye sonra tekrar denenecek... (Deneme ${attempt + 1}/${maxRetries})`);
          
          if (attempt < maxRetries - 1) {
            // Son deneme değilse, retry-after süresi kadar bekle
            await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
            continue; // Tekrar dene
          } else {
            // Son deneme de başarısız oldu
            logger.error('❌ Tüm denemeler başarısız oldu. Rate limit aşıldı.');
            throw new Error(`Binance API rate limit aşıldı. Lütfen ${retryAfter} saniye sonra tekrar deneyin.`);
          }
        } else if (error.response?.status >= 500) {
          // Sunucu hatası, tekrar dene
          logger.warn(`⚠️ Binance sunucu hatası (${error.response.status}). Tekrar denenecek...`);
          if (attempt < maxRetries - 1) continue;
        } else {
          // Diğer hatalar için tekrar dene
          logger.warn(`⚠️ İstek hatası: ${error.message}. Tekrar denenecek...`);
          if (attempt < maxRetries - 1) continue;
        }
      }
    }

    // Tüm denemeler başarısız oldu
    logger.error('❌ Tüm denemeler başarısız oldu:', lastError?.message);
    throw lastError || new Error('Binance API\'den fiyatlar alınamadı');
  }

  /**
   * Her kripto para için ayrı ayrı istek atar (fallback method)
   * Rate limit'i önlemek için istekler arasında bekleme yapar
   */
  async getAllPricesOneByOne() {
    logger.warn('⚠️ Tek tek istek atılıyor (yavaş yöntem)...');
    const prices = [];
    
    for (let i = 0; i < CRYPTO_SYMBOLS.length; i++) {
      const symbol = CRYPTO_SYMBOLS[i];
      try {
        // Her 5 istekten sonra 1 saniye bekle (rate limit'i önlemek için)
        if (i > 0 && i % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const response = await axios.get(BINANCE_API_URL, {
          params: { symbol },
          timeout: 5000
        });

        if (response.status === 200) {
          prices.push({
            symbol: response.data.symbol,
            price: parseFloat(response.data.price)
          });
        }
      } catch (error) {
        if (error.response?.status === 429) {
          logger.warn(`Rate limit! ${symbol} için 3 saniye bekleniyor...`);
          await new Promise(resolve => setTimeout(resolve, 3000));
          i--; // Bu symbol'ü tekrar dene
          continue;
        }
        logger.warn(`Failed to fetch price for ${symbol}:`, error.message);
      }
    }

    return prices;
  }

  /**
   * Belirli bir kripto paranın fiyatını çeker
   */
  async getPriceBySymbol(symbol) {
    try {
      const response = await axios.get(BINANCE_API_URL, {
        params: { symbol },
        timeout: 5000
      });

      if (response.status === 200) {
        return {
          symbol: response.data.symbol,
          price: parseFloat(response.data.price)
        };
      }
    } catch (error) {
      logger.error(`Error fetching price for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Binance API'den 24 saatlik istatistikleri çeker
   */
  async get24hStats(symbol) {
    try {
      const response = await axios.get('https://api.binance.com/api/v3/ticker/24hr', {
        params: { symbol },
        timeout: 5000
      });

      if (response.status === 200) {
        return {
          symbol: response.data.symbol,
          priceChange: parseFloat(response.data.priceChange),
          priceChangePercent: parseFloat(response.data.priceChangePercent),
          weightedAvgPrice: parseFloat(response.data.weightedAvgPrice),
          prevClosePrice: parseFloat(response.data.prevClosePrice),
          lastPrice: parseFloat(response.data.lastPrice),
          bidPrice: parseFloat(response.data.bidPrice),
          askPrice: parseFloat(response.data.askPrice),
          openPrice: parseFloat(response.data.openPrice),
          highPrice: parseFloat(response.data.highPrice),
          lowPrice: parseFloat(response.data.lowPrice),
          volume: parseFloat(response.data.volume),
          quoteVolume: parseFloat(response.data.quoteVolume),
          count: parseInt(response.data.count)
        };
      }
    } catch (error) {
      logger.error(`Error fetching 24h stats for ${symbol}:`, error);
      throw error;
    }
  }
}

module.exports = new BinanceService();

