const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { BINANCE_API_URL, CRYPTO_SYMBOLS } = require('../config/constants');
const logger = require('../utils/logger');
const cacheService = require('./cacheService');
const rateLimitService = require('./rateLimitService');

// Bölge engelini aşmak için: BINANCE_PROXY veya HTTPS_PROXY ile proxy kullanılır (örn. VPN/proxy sunucusu)
const BINANCE_PROXY_URL = process.env.BINANCE_PROXY || process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const binanceAxios = BINANCE_PROXY_URL
  ? axios.create({
      httpsAgent: new HttpsProxyAgent(BINANCE_PROXY_URL),
      httpAgent: new HttpsProxyAgent(BINANCE_PROXY_URL),
      proxy: false
    })
  : axios;
if (BINANCE_PROXY_URL) logger.info('Binance istekleri proxy üzerinden yapılıyor.');

// Binance official mirror domains for geobypass and network resilience
const BINANCE_DOMAINS = [
  'https://api.binance.com',
  'https://api1.binance.com',
  'https://api2.binance.com',
  'https://api3.binance.com',
  'https://api4.binance.com',
  'https://api.binance.us'
];
let currentDomainIndex = 0;

/**
 * Executes an Axios GET request with automatic Binance mirror domain rotation
 * on HTTP 451 (geoblock), ECONNRESET, ETIMEDOUT, or server errors.
 * Optimizes geoblocks by jumping immediately to the US mirror.
 */
async function executeBinanceRequest(path, config = {}, retries = BINANCE_DOMAINS.length) {
  let lastError = null;
  for (let attempt = 0; attempt < retries; attempt++) {
    const domain = BINANCE_DOMAINS[currentDomainIndex];
    const url = domain + path;
    try {
      const response = await binanceAxios.get(url, {
        ...config,
        timeout: config.timeout || 10000
      });
      return response;
    } catch (error) {
      lastError = error;
      const status = error.response?.status;
      const isRetryable = status === 451 || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || status >= 500;

      if (isRetryable && attempt < retries - 1) {
        if (status === 451) {
          // If geoblocked, jump immediately to the US mirror to bypass!
          currentDomainIndex = BINANCE_DOMAINS.indexOf('https://api.binance.us');
        } else {
          currentDomainIndex = (currentDomainIndex + 1) % BINANCE_DOMAINS.length;
        }
        const nextDomain = BINANCE_DOMAINS[currentDomainIndex];
        logger.warn(`⚠️ Binance isteği başarısız (${domain}${path}): ${error.message || status}. ${nextDomain} mirror'ına rotasyon yapılıyor... (Deneme ${attempt + 1}/${retries})`);
        
        // Wait 1.5 seconds before retrying
        await new Promise(resolve => setTimeout(resolve, 1500));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

class BinanceService {
  /**
   * Binance API'den tüm kripto paraların fiyatlarını çeker
   * Batch endpoint kullanarak tek istekle tüm fiyatları alır (rate limit'i önlemek için)
   * Retry mekanizması ile 429 hatası durumunda otomatik tekrar dener
   */
  async getAllPrices(maxRetries = 3) {
    // Check cache first
    const cacheKey = cacheService.generateKey('binance', 'all-prices');
    const cached = cacheService.get(cacheKey);
    if (cached) {
      logger.info('✅ Binance fiyatları cache\'den alındı');
      return cached;
    }

    // Check rate limit
    if (!rateLimitService.canMakeRequest('binance', 2000)) {
      await rateLimitService.waitForBackoff('binance');
    }

    let lastError = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          // Exponential backoff: 2^attempt saniye bekle
          const waitTime = rateLimitService.getBackoffDelay(attempt);
          logger.info(`⏳ Rate limit nedeniyle ${waitTime/1000} saniye bekleniyor... (Deneme ${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        // Tüm fiyatları tek istekle al (batch endpoint - rate limit'i önlemek için)
        const allPricesResponse = await executeBinanceRequest('/api/v3/ticker/price', {
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
          
          // Cache the result (1 minute TTL)
          cacheService.set(cacheKey, filteredPrices, 60 * 1000);
          rateLimitService.recordSuccess('binance');
          
          return filteredPrices;
        }

        // Eğer batch endpoint array döndürmüyorsa, tek tek istek at
        logger.warn('Batch endpoint beklenmeyen format döndürdü, tek tek istek atılıyor...');
        return await this.getAllPricesOneByOne();

      } catch (error) {
        lastError = error;
        
        if (error.response?.status === 429) {
          const retryAfter = parseInt(error.response.headers['retry-after']) || null;
          rateLimitService.recordRateLimit('binance', retryAfter);
          
          if (attempt < maxRetries - 1) {
            // Son deneme değilse, backoff süresi kadar bekle
            await rateLimitService.waitForBackoff('binance');
            continue; // Tekrar dene
          } else {
            // Son deneme de başarısız oldu
            logger.error('❌ Tüm denemeler başarısız oldu. Rate limit aşıldı.');
            throw new Error(`Binance API rate limit aşıldı. Lütfen birkaç saniye sonra tekrar deneyin.`);
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

        const response = await executeBinanceRequest('/api/v3/ticker/price', {
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
      const response = await executeBinanceRequest('/api/v3/ticker/price', {
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
   * Belirli symbol'ler için fiyatları çeker (custom coin listesi için)
   */
  async getPricesBySymbols(symbols) {
    try {
      const prices = [];
      
      // Her symbol için fiyat çek (paralel olarak)
      const pricePromises = symbols.map(async (symbol) => {
        try {
          const response = await executeBinanceRequest('/api/v3/ticker/price', {
            params: { symbol },
            timeout: 5000
          });
          
          if (response.status === 200 && response.data) {
            return {
              symbol: response.data.symbol,
              price: parseFloat(response.data.price)
            };
          }
          return null;
        } catch (error) {
          // Bu symbol için fiyat bulunamadı (sessizce geç)
          logger.debug(`⚠️ ${symbol} için Binance'de fiyat bulunamadı: ${error.message}`);
          return null;
        }
      });
      
      const results = await Promise.all(pricePromises);
      const validPrices = results.filter(p => p !== null);
      
      logger.info(`✅ ${validPrices.length}/${symbols.length} coin için Binance'den fiyat çekildi`);
      return validPrices;
    } catch (error) {
      logger.error('Error fetching prices by symbols from Binance:', error);
      return [];
    }
  }

  /**
   * Binance API'den 24 saatlik istatistikleri çeker
   */
  async get24hStats(symbol) {
    try {
      const response = await executeBinanceRequest('/api/v3/ticker/24hr', {
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

  /**
   * Binance API'den belirtilen semboller için gerçek 24 saatlik yüzde değişimini toplu çeker
   * @param {string[]} symbols - USDT sembolleri (örn. ['BTCUSDT', 'ETHUSDT'])
   * @returns {Promise<Object>} { BTCUSDT: -0.22, ETHUSDT: 2.1, ... }
   */
  async getAll24hStats(symbols) {
    try {
      const response = await executeBinanceRequest('/api/v3/ticker/24hr', {
        timeout: 10000
      });
      if (response.status !== 200 || !Array.isArray(response.data)) {
        return {};
      }
      const set = new Set((symbols || []).map(s => s.toUpperCase()));
      const result = {};
      for (const row of response.data) {
        const sym = row.symbol;
        if (set.has(sym)) {
          const pct = parseFloat(row.priceChangePercent);
          result[sym] = Number.isFinite(pct) ? pct : 0;
        }
      }
      return result;
    } catch (error) {
      logger.error('Error fetching all 24h stats from Binance:', error);
      return {};
    }
  }

  /**
   * Tek sembol için Binance klines ile 7 günlük yüzde değişimini hesaplar
   * @param {string} symbol - Örn. BTCUSDT
   * @returns {Promise<number|null>} Yüzde değişim veya hata durumunda null
   */
  async get7dChangeForSymbol(symbol) {
    try {
      const response = await executeBinanceRequest('/api/v3/klines', {
        params: { symbol: symbol.toUpperCase(), interval: '1d', limit: 9 },
        timeout: 8000
      });
      if (response.status !== 200 || !Array.isArray(response.data) || response.data.length < 8) {
        return null;
      }
      const k = response.data;
      // k[0]=8 gün önce, k[1]=7 gün önce (open), k[7]=dün (close) = son bilinen
      const open7dAgo = parseFloat(k[1][1]);
      const lastClose = parseFloat(k[k.length - 1][4]);
      if (!Number.isFinite(open7dAgo) || open7dAgo <= 0 || !Number.isFinite(lastClose)) {
        return null;
      }
      return ((lastClose - open7dAgo) / open7dAgo) * 100;
    } catch (err) {
      logger.debug(`get7dChangeForSymbol ${symbol}: ${err.message}`);
      return null;
    }
  }

  /**
   * Binance klines (OHLCV) - grafik için gerçek mum verisi
   * @param {string} symbol - Örn. LINKUSDT
   * @param {string} interval - 1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 6h, 8h, 12h, 1d, 3d, 1w, 1M
   * @param {number} limit - 1-1000
   * @returns {Promise<Array>} [{ time, open, high, low, close, volume }, ...]
   */
  async getKlines(symbol, interval = '1h', limit = 500) {
    const sym = (symbol || '').toUpperCase().endsWith('USDT') ? symbol.toUpperCase() : symbol.toUpperCase() + 'USDT';
    const validIntervals = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M'];
    const int = validIntervals.includes(interval) ? interval : '1h';
    const lim = Math.min(1000, Math.max(1, parseInt(limit) || 500));
    try {
      const response = await executeBinanceRequest('/api/v3/klines', {
        params: { symbol: sym, interval: int, limit: lim },
        timeout: 15000
      });
      if (!Array.isArray(response.data)) return [];
      return response.data.map((k) => ({
        time: k[0],
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5])
      }));
    } catch (err) {
      logger.warn(`getKlines ${sym} ${int}: ${err.message}`);
      return [];
    }
  }

  /**
   * Belirtilen semboller için geçmiş klines (mum) grafik verilerini toplu çeker
   * @param {string[]} symbols - USDT sembolleri
   * @param {string} interval - Zaman aralığı (örn. '4h')
   * @param {number} limit - Veri noktası sayısı (örn. 42)
   * @returns {Promise<Object>} { BTCUSDT: [...], ETHUSDT: [...] }
   */
  async getKlinesBatch(symbols, interval = '4h', limit = 42) {
    if (!symbols || symbols.length === 0) return {};
    const result = {};
    const list = symbols.map(s => (s.endsWith('USDT') ? s : s + 'USDT').toUpperCase());
    const BATCH = 5; // Aynı anda 5 istek
    
    for (let i = 0; i < list.length; i += BATCH) {
      const chunk = list.slice(i, i + BATCH);
      const values = await Promise.all(chunk.map(sym => this.getKlines(sym, interval, limit)));
      chunk.forEach((sym, j) => {
        if (values[j] && values[j].length > 0) {
          result[sym] = values[j];
        }
      });
      // Rate limit'i aşmamak için chunk'lar arası ufak bir bekleme (ilk chunk hariç)
      if (i + BATCH < list.length) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
    return result;
  }

  /**
   * Belirtilen semboller için 7 günlük yüzde değişimini toplu çeker (Binance klines)
   * @param {string[]} symbols - USDT sembolleri
   * @returns {Promise<Object>} { BTCUSDT: 2.5, ETHUSDT: -1.1, ... }
   */
  async getAll7dStats(symbols) {
    if (!symbols || symbols.length === 0) return {};
    const result = {};
    const list = symbols.map(s => (s.endsWith('USDT') ? s : s + 'USDT').toUpperCase());
    const BATCH = 6;
    for (let i = 0; i < list.length; i += BATCH) {
      const chunk = list.slice(i, i + BATCH);
      const values = await Promise.all(chunk.map(sym => this.get7dChangeForSymbol(sym)));
      chunk.forEach((sym, j) => {
        const v = values[j];
        result[sym] = v != null && Number.isFinite(v) ? v : 0;
      });
    }
    return result;
  }
}

module.exports = new BinanceService();

