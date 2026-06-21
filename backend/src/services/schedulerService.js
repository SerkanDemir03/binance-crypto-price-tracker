const cron = require('node-cron');
const binanceService = require('./binanceService');
const coingeckoService = require('./coingeckoService');
const databaseService = require('./databaseService');
const { DEFAULT_API_PROVIDER } = require('../config/constants');
const logger = require('../utils/logger');

class SchedulerService {
  constructor() {
    this.isRunning = false;
    this.job = null;
  }

  /**
   * Scheduler'ı başlatır
   * @param {string} interval - Cron expression formatında zaman aralığı
   */
  start(interval = '*/1 * * * *') {
    if (this.isRunning) {
      logger.warn('Scheduler zaten çalışıyor');
      return;
    }

    try {
      // Önce tabloyu oluştur (hata olsa bile devam et)
      databaseService.createTable().catch(err => {
        logger.error('Tablo oluşturulurken hata:', err.message);
        logger.warn('Scheduler çalışmaya devam edecek, tablo oluşturma daha sonra tekrar denenecek');
      });

      // İlk çalıştırmayı hemen yap (await olmadan, arka planda çalışsın)
      // Hata olsa bile scheduler çalışmaya devam etsin
      // Rate limit'i önlemek için 5 saniye bekle
      setTimeout(() => {
        this.fetchAndSavePrices().catch(err => {
          logger.error('İlk fiyat güncellemesi sırasında hata:', err.message);
        });
      }, 5000); // 5 saniye bekle, server'ın tamamen başlamasını bekle ve rate limit'i önle

      // Periyodik görevi başlat
      this.job = cron.schedule(interval, async () => {
        try {
          await this.fetchAndSavePrices();
        } catch (error) {
          logger.error('Scheduled price update error:', error.message);
          // Hata olsa bile scheduler çalışmaya devam etsin
        }
      }, {
        scheduled: true,
        timezone: 'Europe/Istanbul'
      });

      this.isRunning = true;
      logger.info(`✅ Scheduler başlatıldı. Interval: ${interval}`);
    } catch (error) {
      logger.error('Scheduler başlatılırken kritik hata:', error.message);
      this.isRunning = false;
      throw error; // Kritik hataları yukarı fırlat
    }
  }

  /**
   * Scheduler'ı durdurur
   */
  stop() {
    if (this.job) {
      this.job.stop();
      this.job = null;
      this.isRunning = false;
      logger.info('⏹️ Scheduler durduruldu');
    }
  }

  /**
   * API'den fiyatları çekip veritabanına kaydeder.
   * DEFAULT_API_PROVIDER (binance/coingecko) kullanılır; başarısız olursa otomatik diğer API denenir.
   * Binance IP engeli / rate limit durumunda CoinGecko ile çalışmaya devam eder.
   */
  async fetchAndSavePrices() {
    const provider = DEFAULT_API_PROVIDER || 'coingecko';
    let prices = [];
    let usedProvider = provider;

    try {
      logger.info(`🔄 Fiyatlar güncelleniyor (önce ${provider})...`);

      if (provider === 'coingecko') {
        try {
          prices = await coingeckoService.getAllPrices();
          usedProvider = 'coingecko';
        } catch (err) {
          logger.warn(`⚠️ CoinGecko başarısız: ${err.message}. Binance deneniyor...`);
          try {
            prices = await binanceService.getAllPrices(2);
            usedProvider = 'binance';
          } catch (binanceErr) {
            logger.error('❌ CoinGecko ve Binance ikisi de başarısız:', binanceErr.message);
            throw binanceErr;
          }
        }
      } else {
        try {
          prices = await binanceService.getAllPrices(2);
          usedProvider = 'binance';
        } catch (err) {
          logger.warn(`⚠️ Binance başarısız (IP engeli/rate limit olabilir): ${err.message}. CoinGecko deneniyor...`);
          try {
            prices = await coingeckoService.getAllPrices();
            usedProvider = 'coingecko';
          } catch (cgErr) {
            logger.error('❌ Binance ve CoinGecko ikisi de başarısız:', cgErr.message);
            throw cgErr;
          }
        }
      }

      if (prices.length === 0) {
        logger.warn('⚠️ Fiyat verisi alınamadı');
        return;
      }

      await databaseService.saveAllPrices(prices);
      logger.info(`✅ ${prices.length} kripto para fiyatı ${usedProvider} ile güncellendi`);
      return prices;
    } catch (error) {
      logger.error('❌ Fiyatlar güncellenirken hata:', error.message);
      throw error;
    }
  }

  /**
   * Scheduler durumunu getirir
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      interval: this.job ? this.job.cronTime.source : null
    };
  }
}

module.exports = new SchedulerService();

