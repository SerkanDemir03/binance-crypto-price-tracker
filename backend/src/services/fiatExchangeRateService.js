const coingeckoService = require('./coingeckoService');
const databaseService = require('./databaseService');
const logger = require('../utils/logger');
const cacheService = require('./cacheService');
const rateLimitService = require('./rateLimitService');

// Fiat para birimleri listesi
const FIAT_CURRENCIES = [
  'USD', 'EUR', 'TRY', 'SAR', 'GBP', 'JPY', 'CNY', 'INR', 'KRW', 'BRL',
  'MXN', 'CAD', 'AUD', 'CHF', 'NZD', 'SEK', 'NOK', 'DKK', 'PLN', 'HUF',
  'CZK', 'RON', 'BGN', 'HRK', 'RUB', 'ILS', 'AED', 'QAR', 'KWD', 'BHD',
  'OMR', 'JOD', 'EGP', 'ZAR', 'THB', 'SGD', 'MYR', 'IDR', 'PHP', 'VND'
];

/**
 * Fiat Exchange Rate Service
 * Periyodik olarak fiat para birimlerinin kurlarını günceller ve veritabanında saklar
 * Rate limit sorunlarını önlemek için veritabanı cache kullanır
 */
class FiatExchangeRateService {
  constructor(io = null) {
    this.io = io; // Socket.io instance for real-time updates
    this.isUpdating = false;
    this.lastUpdateTime = null;
    
    // In-memory cache for fast access (prevents API calls)
    this.memoryCache = new Map(); // currency -> { rate, timestamp }
    this.cacheTTL = 5 * 60 * 1000; // 5 dakika cache
    
    // Request queue to prevent duplicate API calls for same currency
    this.pendingRequests = new Map(); // currency -> Promise<rate>
    
    // Rate limiting per currency (prevent multiple API calls in short time)
    this.lastApiCall = new Map(); // currency -> timestamp
    this.minApiCallInterval = 10 * 1000; // 10 saniye minimum interval per currency
  }

  /**
   * Tüm fiat para birimlerinin kurlarını günceller
   * CoinGecko Exchange Rates API'den çeker ve veritabanına kaydeder
   */
  async updateAllExchangeRates() {
    if (this.isUpdating) {
      logger.warn('⚠️ Fiat exchange rates güncellemesi zaten devam ediyor');
      return;
    }

    this.isUpdating = true;
    const startTime = Date.now();

    try {
      logger.info('🔄 Fiat exchange rates güncelleniyor...');

      // Check rate limit
      if (!rateLimitService.canMakeRequest('coingecko', 1200)) {
        await rateLimitService.waitForBackoff('coingecko');
      }

      // CoinGecko exchange rates API'den tüm kurları çek
      const axios = require('axios');
      const COINGECKO_EXCHANGE_RATES_URL = 'https://api.coingecko.com/api/v3/exchange_rates';

      let response;
      const maxRetries = 5;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          response = await axios.get(COINGECKO_EXCHANGE_RATES_URL, {
            timeout: 15000,
            headers: {
              'Accept': 'application/json'
            }
          });
          if (response && response.status === 200) break;
        } catch (err) {
          const isRetryable = err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT' || (err.response && err.response.status >= 500) || (err.response && err.response.status === 429);
          if (isRetryable && attempt < maxRetries) {
            logger.warn(`⚠️ CoinGecko fiat kurları çekilemedi (deneme ${attempt}/${maxRetries}): ${err.message}. ${(1.5 * attempt).toFixed(1)} saniye sonra tekrar denenecek...`);
            await new Promise(r => setTimeout(r, 1500 * attempt));
            continue;
          }
          throw err;
        }
      }

      if (response.status === 200 && response.data && response.data.rates) {
        const rates = response.data.rates;
        let successCount = 0;
        let errorCount = 0;

        // USD için özel durum (1 USD = 1 USD)
        await databaseService.saveFiatExchangeRate('USD', 1);
        successCount++;

        // Her fiat para birimi için kur kaydet
        for (const currency of FIAT_CURRENCIES) {
          if (currency === 'USD') continue; // USD zaten kaydedildi

          try {
            const currencyLower = currency.toLowerCase();
            const rateData = rates[currencyLower];

            if (rateData && rateData.value) {
              // CoinGecko rates API'si USD bazlı değerler döner
              // value: 1 USD = X currency (örneğin EUR için ~0.92)
              // Bizim ihtiyacımız 1 currency = X USD
              // Bu yüzden 1 / value yapmalıyız
              const rateToUSD = 1 / rateData.value;

              if (rateToUSD > 0) {
                await databaseService.saveFiatExchangeRate(currency, rateToUSD);
                successCount++;
              } else {
                logger.warn(`⚠️ ${currency} için geçersiz kur değeri: ${rateToUSD}`);
                errorCount++;
              }
            } else {
              logger.warn(`⚠️ ${currency} için kur bulunamadı`);
              errorCount++;
            }
          } catch (error) {
            logger.error(`❌ ${currency} kur kaydedilirken hata:`, error.message);
            errorCount++;
          }
        }

        const duration = Date.now() - startTime;
        this.lastUpdateTime = new Date();

        logger.info(`✅ Fiat exchange rates güncellendi: ${successCount} başarılı, ${errorCount} hata (${duration}ms)`);

        // Memory cache'i güncelle
        for (const rateRow of await databaseService.getAllFiatExchangeRates()) {
          this.memoryCache.set(rateRow.currency, {
            rate: parseFloat(rateRow.rate_to_usd),
            timestamp: Date.now()
          });
        }

        // Socket.io ile frontend'e broadcast et
        if (this.io) {
          const allRates = await databaseService.getAllFiatExchangeRates();
          this.io.emit('fiat-exchange-rates-update', {
            type: 'batch',
            rates: allRates,
            timestamp: this.lastUpdateTime.toISOString()
          });
          logger.debug(`📡 Fiat exchange rates frontend'e gönderildi`);
        }

        return {
          success: true,
          successCount,
          errorCount,
          duration
        };
      } else {
        throw new Error('Exchange rates API yanıtı geçersiz');
      }
    } catch (error) {
      logger.error('❌ Fiat exchange rates güncellenirken hata:', error);
      
      // Hata durumunda veritabanındaki mevcut verileri kullan
      if (this.io) {
        try {
          const allRates = await databaseService.getAllFiatExchangeRates();
          this.io.emit('fiat-exchange-rates-update', {
            type: 'cached',
            rates: allRates,
            timestamp: new Date().toISOString(),
            error: 'API güncellemesi başarısız, cache verileri kullanılıyor'
          });
        } catch (dbError) {
          logger.error('❌ Cache verileri gönderilirken hata:', dbError);
        }
      }

      throw error;
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * Belirli bir fiat para biriminin kurunu getirir
   * Önce in-memory cache, sonra veritabanı, en son API'den çeker
   * Rate limit koruması ile çalışır
   * @param {string} currency - Para birimi kodu
   * @returns {Promise<number>} USD karşılığı
   */
  async getExchangeRate(currency) {
    const currencyUpper = currency.toUpperCase();
    
    try {
      // USD için özel durum
      if (currencyUpper === 'USD') {
        return 1;
      }

      // 1. In-memory cache kontrolü (en hızlı)
      const cached = this.memoryCache.get(currencyUpper);
      if (cached && (Date.now() - cached.timestamp) < this.cacheTTL) {
        logger.debug(`✅ ${currencyUpper} kur memory cache'den alındı`);
        return cached.rate;
      }

      // 2. Eğer aynı para birimi için zaten bir API isteği devam ediyorsa, onu bekle
      if (this.pendingRequests.has(currencyUpper)) {
        logger.debug(`⏳ ${currencyUpper} için bekleyen istek var, bekleniyor...`);
        return await this.pendingRequests.get(currencyUpper);
      }

      // 3. Rate limiting kontrolü - aynı para birimi için çok sık API çağrısı yapma
      const lastCall = this.lastApiCall.get(currencyUpper);
      const now = Date.now();
      if (lastCall && (now - lastCall) < this.minApiCallInterval) {
        logger.debug(`⏸️ ${currencyUpper} için rate limit koruması aktif, veritabanından okunuyor...`);
        // Rate limit aktif, sadece veritabanından oku
        const dbRate = await databaseService.getFiatExchangeRate(currencyUpper);
        if (dbRate && dbRate.rate_to_usd) {
          const rate = parseFloat(dbRate.rate_to_usd);
          // Memory cache'e kaydet
          this.memoryCache.set(currencyUpper, { rate, timestamp: now });
          return rate;
        }
      }

      // 4. Veritabanından kontrol et
      const dbRate = await databaseService.getFiatExchangeRate(currencyUpper);
      
      if (dbRate && dbRate.rate_to_usd) {
        const rate = parseFloat(dbRate.rate_to_usd);
        const updatedAt = new Date(dbRate.updated_at);
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

        // Veritabanındaki veri 1 saatten yeni ise kullan
        if (updatedAt > oneHourAgo) {
          logger.debug(`✅ ${currencyUpper} kur veritabanından alındı (cache)`);
          // Memory cache'e kaydet
          this.memoryCache.set(currencyUpper, { rate, timestamp: now });
          return rate;
        } else {
          // Veri eski, arka planda güncelle (await etme)
          logger.debug(`🔄 ${currencyUpper} kur eski, arka planda güncelleniyor...`);
          this.updateAllExchangeRates().catch(err => {
            logger.warn(`⚠️ Arka plan güncellemesi başarısız: ${err.message}`);
          });
          // Eski veriyi döndür ve memory cache'e kaydet
          this.memoryCache.set(currencyUpper, { rate, timestamp: now });
          return rate;
        }
      }

      // 5. Veritabanında yoksa API'den çek (rate limit koruması ile)
      logger.info(`🔄 ${currencyUpper} kur veritabanında yok, API'den çekiliyor...`);
      
      // Request queue'ya ekle (aynı para birimi için bekleyen istekler aynı promise'i kullanacak)
      const apiPromise = this.fetchRateFromAPI(currencyUpper);
      this.pendingRequests.set(currencyUpper, apiPromise);
      
      try {
        const rate = await apiPromise;
        return rate;
      } finally {
        // Request tamamlandı, queue'dan çıkar
        this.pendingRequests.delete(currencyUpper);
      }
    } catch (error) {
      logger.error(`❌ Error getting exchange rate for ${currencyUpper}:`, error);
      
      // Hata durumunda veritabanındaki eski veriyi döndür (varsa)
      try {
        const dbRate = await databaseService.getFiatExchangeRate(currencyUpper);
        if (dbRate && dbRate.rate_to_usd) {
          const rate = parseFloat(dbRate.rate_to_usd);
          logger.warn(`⚠️ ${currencyUpper} için eski veri kullanılıyor`);
          // Memory cache'e kaydet
          this.memoryCache.set(currencyUpper, { rate, timestamp: Date.now() });
          return rate;
        }
      } catch (dbError) {
        logger.error(`❌ Veritabanı kontrolü başarısız:`, dbError.message);
      }
      
      throw error;
    }
  }

  /**
   * API'den kur çeker (rate limit koruması ile)
   * @private
   */
  async fetchRateFromAPI(currency) {
    try {
      // Rate limiting - son API çağrısından bu yana yeterli zaman geçti mi?
      const lastCall = this.lastApiCall.get(currency);
      const now = Date.now();
      
      if (lastCall && (now - lastCall) < this.minApiCallInterval) {
        // Rate limit aktif, veritabanından oku
        logger.debug(`⏸️ ${currency} için rate limit koruması aktif`);
        const dbRate = await databaseService.getFiatExchangeRate(currency);
        if (dbRate && dbRate.rate_to_usd) {
          const rate = parseFloat(dbRate.rate_to_usd);
          this.memoryCache.set(currency, { rate, timestamp: now });
          return rate;
        }
      }

      // API'den çek
      const rate = await coingeckoService.getFiatExchangeRate(currency);
      
      // Rate limiting timestamp güncelle
      this.lastApiCall.set(currency, now);
      
      // Veritabanına kaydet (hata olsa bile devam et)
      databaseService.saveFiatExchangeRate(currency, rate).catch(err => {
        logger.warn(`⚠️ ${currency} kur veritabanına kaydedilemedi: ${err.message}`);
      });
      
      // Memory cache'e kaydet
      this.memoryCache.set(currency, { rate, timestamp: now });
      
      logger.debug(`✅ ${currency} kur API'den alındı ve cache'lendi`);
      return rate;
    } catch (apiError) {
      logger.error(`❌ ${currency} için API'den kur alınamadı:`, apiError.message);
      
      // API hatası durumunda veritabanından oku (varsa)
      const dbRate = await databaseService.getFiatExchangeRate(currency);
      if (dbRate && dbRate.rate_to_usd) {
        const rate = parseFloat(dbRate.rate_to_usd);
        this.memoryCache.set(currency, { rate, timestamp: Date.now() });
        logger.warn(`⚠️ ${currency} için veritabanı verisi kullanılıyor (API hatası)`);
        return rate;
      }
      
      throw new Error(`${currency} için kur bilgisi alınamadı. Lütfen daha sonra tekrar deneyin.`);
    }
  }

  /**
   * Servis durumunu getirir
   */
  getStatus() {
    return {
      isUpdating: this.isUpdating,
      lastUpdateTime: this.lastUpdateTime,
      supportedCurrencies: FIAT_CURRENCIES.length
    };
  }
}

module.exports = FiatExchangeRateService;

