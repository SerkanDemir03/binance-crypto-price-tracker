const cron = require('node-cron');
const binanceService = require('./binanceService');
const databaseService = require('./databaseService');
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
   * Binance API'den fiyatları çekip veritabanına kaydeder
   * Bu fonksiyon hem scheduler hem de manuel güncelleme için kullanılır
   */
  async fetchAndSavePrices() {
    try {
      logger.info('🔄 Fiyatlar güncelleniyor...');
      
      // Binance API'den fiyatları çek
      const prices = await binanceService.getAllPrices();
      
      if (prices.length === 0) {
        logger.warn('⚠️ Fiyat verisi alınamadı');
        return;
      }
      
      // Veritabanına kaydet
      await databaseService.saveAllPrices(prices);
      
      logger.info(`✅ ${prices.length} kripto para fiyatı başarıyla güncellendi`);
      return prices;
    } catch (error) {
      logger.error('❌ Fiyatlar güncellenirken hata oluştu:', error.message);
      throw error; // Hata durumunda yukarı fırlat
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

