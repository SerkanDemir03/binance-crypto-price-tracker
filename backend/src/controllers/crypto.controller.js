const asyncHandler = require('../utils/asyncHandler');
const binanceService = require('../services/binanceService');
const databaseService = require('../services/databaseService');
const schedulerService = require('../services/schedulerService');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

/**
 * Tüm kripto paraların son fiyatlarını getirir
 */
exports.getAllPrices = asyncHandler(async (req, res) => {
  const prices = await binanceService.getAllPrices();
  
  res.status(200).json({
    status: 'success',
    data: prices,
    count: prices.length
  });
});

/**
 * Belirli bir kripto paranın fiyatını getirir
 */
exports.getPriceBySymbol = asyncHandler(async (req, res) => {
  const { symbol } = req.params;
  
  if (!symbol) {
    throw new AppError('Symbol parametresi gerekli', 400);
  }
  
  const price = await binanceService.getPriceBySymbol(symbol);
  
  res.status(200).json({
    status: 'success',
    data: price
  });
});

/**
 * Binance API'den veri çekip veritabanına kaydeder
 * İşlem sırası: 1. API'den çek (başarısız olursa sessizce geç), 2. DB'ye kaydet, 3. DB'den en güncel verileri döndür
 * API hatası olsa bile veritabanındaki mevcut verileri döndürür (kullanıcı her zaman veri görür)
 */
exports.fetchAndSavePrices = asyncHandler(async (req, res) => {
  try {
    // 1. Önce tabloyu oluştur (yoksa)
    await databaseService.createTable();
    
    // 2. Binance API'den fiyatları çekmeyi dene (başarısız olursa sessizce geç)
    let apiSuccess = false;
    let prices = [];
    
    try {
      logger.info('🔄 Binance API\'den fiyatlar çekiliyor...');
      prices = await binanceService.getAllPrices(2); // 2 deneme hakkı (daha hızlı)
      
      if (prices.length > 0) {
        logger.info(`✅ ${prices.length} kripto para fiyatı Binance API'den çekildi`);
        
        // 3. Veritabanına kaydet
        await databaseService.saveAllPrices(prices);
        logger.info(`✅ ${prices.length} kripto para fiyatı veritabanına kaydedildi`);
        apiSuccess = true;
      }
    } catch (error) {
      // API hatası olsa bile sessizce geç, veritabanındaki mevcut verileri döndür
      if (error.response?.status === 429 || error.message?.includes('rate limit')) {
        logger.warn('⚠️ Binance API rate limit hatası - Veritabanındaki mevcut veriler kullanılacak');
      } else {
        logger.warn(`⚠️ Binance API hatası: ${error.message} - Veritabanındaki mevcut veriler kullanılacak`);
      }
      // Hata olsa bile devam et, veritabanındaki verileri döndür
    }
    
    // 4. Her durumda veritabanından en güncel verileri çek
    const latestPrices = await databaseService.getAllLatestPrices();
    
    // Başarı mesajı
    if (apiSuccess && latestPrices.length > 0) {
      res.status(200).json({
        status: 'success',
        message: `${prices.length} kripto para fiyatı başarıyla güncellendi`,
        data: latestPrices,
        count: latestPrices.length
      });
    } else if (latestPrices.length > 0) {
      // API başarısız ama veritabanında veri var
      res.status(200).json({
        status: 'success',
        message: `Veritabanındaki ${latestPrices.length} kripto para fiyatı gösteriliyor`,
        data: latestPrices,
        count: latestPrices.length,
        note: 'API güncellemesi başarısız oldu, mevcut veriler gösteriliyor'
      });
    } else {
      // Hem API başarısız hem veritabanı boş
      res.status(200).json({
        status: 'success',
        message: 'Henüz veri yok. Lütfen daha sonra tekrar deneyin.',
        data: [],
        count: 0
      });
    }
  } catch (error) {
    logger.error('Error in fetchAndSavePrices:', error);
    // Kritik hatalar için bile veritabanındaki verileri döndürmeyi dene
    try {
      const latestPrices = await databaseService.getAllLatestPrices();
      if (latestPrices.length > 0) {
        return res.status(200).json({
          status: 'success',
          message: `Veritabanındaki ${latestPrices.length} kripto para fiyatı gösteriliyor`,
          data: latestPrices,
          count: latestPrices.length
        });
      }
    } catch (dbError) {
      logger.error('Database error:', dbError);
    }
    throw error;
  }
});

/**
 * Veritabanından tüm kripto paraların son fiyatlarını getirir
 */
exports.getLatestPricesFromDB = asyncHandler(async (req, res) => {
  try {
    const prices = await databaseService.getAllLatestPrices();
    
    res.status(200).json({
      status: 'success',
      data: prices,
      count: prices.length
    });
  } catch (error) {
    logger.error('Error getting latest prices from DB:', error);
    throw new AppError(
      `Veritabanından fiyatlar getirilemedi: ${error.message}`,
      500
    );
  }
});

/**
 * Belirli bir kripto paranın son fiyatını veritabanından getirir
 */
exports.getLatestPriceFromDB = asyncHandler(async (req, res) => {
  const { symbol } = req.params;
  
  if (!symbol) {
    throw new AppError('Symbol parametresi gerekli', 400);
  }
  
  const price = await databaseService.getLatestPrice(symbol);
  
  if (!price) {
    throw new AppError(`${symbol} için veri bulunamadı`, 404);
  }
  
  res.status(200).json({
    status: 'success',
    data: price
  });
});

/**
 * Belirli bir kripto paranın fiyat geçmişini getirir
 */
exports.getPriceHistory = asyncHandler(async (req, res) => {
  const { symbol } = req.params;
  const { limit = 100, startDate, endDate } = req.query;
  
  if (!symbol) {
    throw new AppError('Symbol parametresi gerekli', 400);
  }
  
  const history = await databaseService.getPriceHistory(
    symbol,
    parseInt(limit),
    startDate || null,
    endDate || null
  );
  
  res.status(200).json({
    status: 'success',
    data: history,
    count: history.length
  });
});

/**
 * 24 saatlik istatistikleri getirir
 */
exports.get24hStats = asyncHandler(async (req, res) => {
  const { symbol } = req.params;
  
  if (!symbol) {
    throw new AppError('Symbol parametresi gerekli', 400);
  }
  
  const stats = await binanceService.get24hStats(symbol);
  
  res.status(200).json({
    status: 'success',
    data: stats
  });
});

/**
 * İstatistikleri getirir
 */
exports.getStatistics = asyncHandler(async (req, res) => {
  const { symbol } = req.query;
  
  const stats = await databaseService.getStatistics(symbol || null);
  
  res.status(200).json({
    status: 'success',
    data: stats
  });
});

/**
 * Scheduler durumunu getirir
 */
exports.getSchedulerStatus = asyncHandler(async (req, res) => {
  const status = schedulerService.getStatus();
  
  res.status(200).json({
    status: 'success',
    data: status
  });
});

/**
 * Scheduler'ı başlatır
 */
exports.startScheduler = asyncHandler(async (req, res) => {
  const { interval } = req.body;
  const cronInterval = interval || '*/1 * * * *';
  
  schedulerService.start(cronInterval);
  
  res.status(200).json({
    status: 'success',
    message: 'Scheduler başlatıldı',
    data: schedulerService.getStatus()
  });
});

/**
 * Scheduler'ı durdurur
 */
exports.stopScheduler = asyncHandler(async (req, res) => {
  schedulerService.stop();
  
  res.status(200).json({
    status: 'success',
    message: 'Scheduler durduruldu'
  });
});

