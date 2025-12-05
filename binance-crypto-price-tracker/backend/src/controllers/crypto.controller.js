const asyncHandler = require('../utils/asyncHandler');
const axios = require('axios');
const binanceService = require('../services/binanceService');
const coingeckoService = require('../services/coingeckoService');
const databaseService = require('../services/databaseService');
const schedulerService = require('../services/schedulerService');
const MetadataService = require('../services/metadataService');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const { DEFAULT_API_PROVIDER } = require('../config/constants');

// Initialize Metadata Service
const metadataService = new MetadataService();

/**
 * Tüm kripto paraların son fiyatlarını getirir
 * API provider parametresi ile Binance veya CoinGecko seçilebilir
 */
exports.getAllPrices = asyncHandler(async (req, res) => {
  const provider = req.query.provider || DEFAULT_API_PROVIDER; // 'binance' veya 'coingecko'
  
  let prices = [];
  try {
    if (provider === 'coingecko') {
      prices = await coingeckoService.getAllPrices();
      logger.info(`✅ ${prices.length} fiyat CoinGecko API'den alındı`);
    } else {
      prices = await binanceService.getAllPrices();
      logger.info(`✅ ${prices.length} fiyat Binance API'den alındı`);
    }
  } catch (error) {
    // Bir API başarısız olursa diğerini dene
    logger.warn(`⚠️ ${provider} API başarısız, alternatif API deneniyor...`);
    try {
      if (provider === 'coingecko') {
        prices = await binanceService.getAllPrices();
        logger.info(`✅ Fallback: ${prices.length} fiyat Binance API'den alındı`);
      } else {
        prices = await coingeckoService.getAllPrices();
        logger.info(`✅ Fallback: ${prices.length} fiyat CoinGecko API'den alındı`);
      }
    } catch (fallbackError) {
      logger.error('❌ Her iki API de başarısız oldu');
      throw error; // İlk hatayı fırlat
    }
  }
  
  res.status(200).json({
    status: 'success',
    data: prices,
    count: prices.length,
    provider: provider
  });
});

/**
 * Belirli bir kripto paranın fiyatını getirir
 * API provider parametresi ile Binance veya CoinGecko seçilebilir
 */
exports.getPriceBySymbol = asyncHandler(async (req, res) => {
  const { symbol } = req.params;
  const provider = req.query.provider || DEFAULT_API_PROVIDER;
  
  if (!symbol) {
    throw new AppError('Symbol parametresi gerekli', 400);
  }
  
  let price;
  try {
    if (provider === 'coingecko') {
      price = await coingeckoService.getPriceBySymbol(symbol);
    } else {
      price = await binanceService.getPriceBySymbol(symbol);
    }
  } catch (error) {
    // Fallback to alternative API
    try {
      if (provider === 'coingecko') {
        price = await binanceService.getPriceBySymbol(symbol);
      } else {
        price = await coingeckoService.getPriceBySymbol(symbol);
      }
    } catch (fallbackError) {
      throw error;
    }
  }
  
  res.status(200).json({
    status: 'success',
    data: price,
    provider: provider
  });
});

/**
 * API'den veri çekip veritabanına kaydeder
 * İşlem sırası: 1. API'den çek (başarısız olursa alternatif API'yi dene), 2. DB'ye kaydet, 3. DB'den en güncel verileri döndür
 * API hatası olsa bile veritabanındaki mevcut verileri döndürür (kullanıcı her zaman veri görür)
 */
exports.fetchAndSavePrices = asyncHandler(async (req, res) => {
  try {
    // 1. Önce tabloyu oluştur (yoksa)
    await databaseService.createTable();
    
    // 2. API provider'ı belirle (query param veya default)
    const provider = req.query.provider || req.body.provider || DEFAULT_API_PROVIDER;
    
    // 3. Custom symbols kontrolü
    const customSymbols = req.body.customSymbols; // Kullanıcı coin'leri
    
    // 4. API'den fiyatları çekmeyi dene (başarısız olursa alternatif API'yi dene)
    let apiSuccess = false;
    let prices = [];
    let usedProvider = provider;
    
    try {
      // Custom symbols varsa önce seçilen provider'ı dene, olmazsa alternatifi kullan
      if (customSymbols && Array.isArray(customSymbols) && customSymbols.length > 0) {
        logger.info(`🔄 ${customSymbols.length} custom coin için ${provider === 'binance' ? 'Binance' : 'CoinGecko'} API'den fiyatlar çekiliyor...`);
        
        // Önce seçilen provider'ı dene
        if (provider === 'binance') {
          // Binance için custom symbols'ı USDT formatına çevir ve dene
          try {
            const binanceSymbols = customSymbols.map(s => s.toUpperCase() + 'USDT');
            // Binance'den tek tek çek (batch endpoint custom symbols desteklemiyor)
            prices = await binanceService.getPricesBySymbols(binanceSymbols);
            if (prices.length > 0) {
              usedProvider = 'binance';
            }
          } catch (binanceError) {
            logger.warn(`⚠️ Binance API custom symbols için başarısız: ${binanceError.message}`);
            // Binance başarısız olursa CoinGecko'ya geç
            prices = await coingeckoService.getPricesBySymbols(customSymbols);
            usedProvider = 'coingecko';
          }
        } else {
          // CoinGecko kullan
          prices = await coingeckoService.getPricesBySymbols(customSymbols);
          usedProvider = 'coingecko';
        }
      } else {
        // Custom symbols yoksa tüm fiyatları çek
        logger.info(`🔄 ${provider === 'coingecko' ? 'CoinGecko' : 'Binance'} API'den tüm fiyatlar çekiliyor...`);
        
        if (provider === 'coingecko') {
          prices = await coingeckoService.getAllPrices();
        } else {
          prices = await binanceService.getAllPrices(2); // 2 deneme hakkı (daha hızlı)
        }
      }
      
      if (prices.length > 0) {
        logger.info(`✅ ${prices.length} kripto para fiyatı ${usedProvider === 'coingecko' ? 'CoinGecko' : 'Binance'} API'den çekildi`);
        
        // 4. Veritabanına kaydet
        await databaseService.saveAllPrices(prices);
        logger.info(`✅ ${prices.length} kripto para fiyatı veritabanına kaydedildi`);
        apiSuccess = true;
      } else {
        logger.warn(`⚠️ API'den hiç fiyat çekilemedi. Alternatif API deneniyor...`);
        throw new Error('API\'den hiç fiyat çekilemedi');
      }
    } catch (error) {
      // İlk API başarısız olursa alternatif API'yi dene
      logger.warn(`⚠️ ${usedProvider === 'coingecko' ? 'CoinGecko' : 'Binance'} API hatası: ${error.message}`);
      logger.info(`🔄 Alternatif API deneniyor...`);
      
      try {
        if (customSymbols && Array.isArray(customSymbols) && customSymbols.length > 0) {
          // Custom symbols için alternatif API'yi dene
          if (usedProvider === 'binance') {
            prices = await coingeckoService.getPricesBySymbols(customSymbols);
            usedProvider = 'coingecko';
          } else {
            // CoinGecko başarısız oldu, Binance'i dene
            const binanceSymbols = customSymbols.map(s => s.toUpperCase() + 'USDT');
            prices = await binanceService.getPricesBySymbols(binanceSymbols);
            usedProvider = 'binance';
          }
        } else {
          // Tüm fiyatlar için alternatif API
          if (usedProvider === 'coingecko') {
            prices = await binanceService.getAllPrices(2);
            usedProvider = 'binance';
          } else {
            prices = await coingeckoService.getAllPrices();
            usedProvider = 'coingecko';
          }
        }
        
        if (prices.length > 0) {
          logger.info(`✅ ${prices.length} kripto para fiyatı ${usedProvider === 'coingecko' ? 'CoinGecko' : 'Binance'} API'den çekildi (fallback)`);
          await databaseService.saveAllPrices(prices);
          logger.info(`✅ ${prices.length} kripto para fiyatı veritabanına kaydedildi`);
          apiSuccess = true;
        } else {
          logger.warn(`⚠️ Alternatif API'den de hiç fiyat çekilemedi`);
        }
      } catch (fallbackError) {
        // Her iki API de başarısız
        logger.error(`❌ Her iki API de başarısız oldu:`, {
          firstError: error.message,
          fallbackError: fallbackError.message,
          customSymbols: customSymbols?.length || 0
        });
        
        if (fallbackError.response?.status === 429 || fallbackError.message?.includes('rate limit')) {
          logger.warn('⚠️ Her iki API de rate limit hatası - Veritabanındaki mevcut veriler kullanılacak');
        } else {
          logger.warn(`⚠️ Her iki API de başarısız - Veritabanındaki mevcut veriler kullanılacak`);
        }
        // Hata olsa bile devam et, veritabanındaki verileri döndür
      }
    }
    
    // 4. Her durumda veritabanından en güncel verileri çek
    // Custom symbols varsa sadece onları çek, yoksa tümünü çek
    let latestPrices;
    if (customSymbols && Array.isArray(customSymbols) && customSymbols.length > 0) {
      // Custom symbols için USDT ekle
      const symbolsWithUSDT = customSymbols.map(s => s.toUpperCase() + 'USDT');
      latestPrices = await databaseService.getAllLatestPrices(symbolsWithUSDT);
    } else {
      latestPrices = await databaseService.getAllLatestPrices();
    }
    
    // Gerçekten kaydedilen coin sayısı (API'den çekilen)
    const savedCount = prices.length;
    
    // Başarı mesajı
    if (apiSuccess && savedCount > 0) {
      res.status(200).json({
        status: 'success',
        message: `${savedCount} kripto para fiyatı başarıyla güncellendi`,
        data: latestPrices,
        count: savedCount,
        totalInDb: latestPrices.length,
        provider: usedProvider
      });
    } else if (apiSuccess && savedCount === 0) {
      // API başarılı ama hiç coin kaydedilmedi (muhtemelen custom symbols bulunamadı)
      res.status(200).json({
        status: 'success',
        message: 'Güncellenecek coin bulunamadı. Coin listesini kontrol edin.',
        data: latestPrices,
        count: 0,
        totalInDb: latestPrices.length,
        provider: usedProvider,
        note: 'API başarılı ama hiç coin kaydedilmedi'
      });
    } else if (latestPrices.length > 0) {
      // API başarısız ama veritabanında veri var
      res.status(200).json({
        status: 'success',
        message: `Veritabanındaki ${latestPrices.length} kripto para fiyatı gösteriliyor`,
        data: latestPrices,
        count: 0,
        totalInDb: latestPrices.length,
        note: 'API güncellemesi başarısız oldu, mevcut veriler gösteriliyor',
        provider: usedProvider
      });
    } else {
      // Hem API başarısız hem veritabanı boş
      const errorDetails = [];
      if (!apiSuccess) {
        errorDetails.push('API\'lerden veri çekilemedi');
      }
      if (latestPrices.length === 0) {
        errorDetails.push('Veritabanında veri yok');
      }
      
      res.status(200).json({
        status: 'success',
        message: `Henüz veri yok. ${errorDetails.join(', ')}. Lütfen daha sonra tekrar deneyin veya "Coin Ekle" butonunu kullanarak coin ekleyin.`,
        data: [],
        count: 0,
        totalInDb: 0,
        provider: usedProvider,
        note: 'İlk kullanım için "Coin Ekle" butonunu kullanarak coin ekleyebilirsiniz.'
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
 * Eğer customSymbols varsa, önce mevcut verileri döndür, eksik coin'leri arka planda güncelle
 */
exports.getLatestPricesFromDB = asyncHandler(async (req, res) => {
  try {
    const { customSymbols } = req.query; // Custom coin'ler (virgülle ayrılmış)
    
    // Symbol array'i hazırla
    let symbolArray = null;
    if (customSymbols) {
      symbolArray = customSymbols.split(',').map(s => s.trim().toUpperCase()).filter(s => s.length > 0);
    }
    
    // Önce mevcut verileri hızlıca çek (filtrelenmiş veya tümü)
    let prices = await databaseService.getAllLatestPrices(symbolArray);
    
    // Custom symbols varsa, veritabanında olmayanları kontrol et
    if (symbolArray && symbolArray.length > 0) {
      const existingSymbols = prices.map(p => p.name.replace('USDT', ''));
      
      // Veritabanında olmayan coin'leri bul
      const missingSymbols = symbolArray.filter(s => !existingSymbols.includes(s));
      
      // Eksik coin'ler varsa, önce mevcut verileri döndür, sonra arka planda güncelle
      if (missingSymbols.length > 0) {
        logger.info(`⚠️ ${missingSymbols.length} coin veritabanında yok: ${missingSymbols.join(', ')}`);
        
        // Arka planda API'den çek (async, kullanıcı beklemesin)
        setImmediate(async () => {
          try {
            logger.info(`🔄 Arka planda ${missingSymbols.length} coin için fiyatlar çekiliyor...`);
            const apiPrices = await coingeckoService.getPricesBySymbols(missingSymbols);
            
            if (apiPrices.length > 0) {
              await databaseService.saveAllPrices(apiPrices);
              logger.info(`✅ ${apiPrices.length} coin arka planda veritabanına kaydedildi`);
            }
          } catch (apiError) {
            logger.warn(`⚠️ Arka planda coin çekilemedi: ${apiError.message}`);
          }
        });
      }
    }
    
    // Mevcut verileri hemen döndür (hızlı yanıt)
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

/**
 * API provider'ların durumunu kontrol eder
 */
exports.checkApiHealth = asyncHandler(async (req, res) => {
  const binanceHealth = await binanceService.getPriceBySymbol('BTCUSDT').then(() => true).catch(() => false);
  const coingeckoHealth = await coingeckoService.checkHealth();
  
  res.status(200).json({
    status: 'success',
    data: {
      binance: {
        available: binanceHealth,
        name: 'Binance API'
      },
      coingecko: {
        available: coingeckoHealth,
        name: 'CoinGecko API'
      }
    }
  });
});

/**
 * Veritabanı durumunu ve coin ekleme işlemlerini kontrol eder
 */
exports.checkDatabaseStatus = asyncHandler(async (req, res) => {
  const dbStatus = await databaseService.testConnection();
  const coinCount = await databaseService.getCoinCount();
  const tableExists = await databaseService.checkTableExists();
  
  res.status(200).json({
    status: 'success',
    data: {
      connected: dbStatus.connected,
      timestamp: dbStatus.timestamp,
      version: dbStatus.version,
      tableExists: tableExists,
      coinCount: coinCount,
      tableName: require('../config/constants').TABLE_NAME,
      message: dbStatus.connected 
        ? `Veritabanı aktif ve çalışıyor. ${coinCount} farklı coin takip ediliyor.`
        : 'Veritabanı bağlantısı başarısız!'
    }
  });
});

/**
 * Veritabanı detaylı bilgilerini getirir (yönetim paneli için)
 */
exports.getDatabaseDetails = asyncHandler(async (req, res) => {
  try {
    const dbStatus = await databaseService.testConnection();
    const tableExists = await databaseService.checkTableExists();
    const tableStructure = tableExists ? await databaseService.getTableStructure() : [];
    const statistics = tableExists ? await databaseService.getDatabaseStatistics() : null;
    const coinStatistics = tableExists ? await databaseService.getCoinStatistics() : [];
    const coinCount = await databaseService.getCoinCount();
    
    res.status(200).json({
      status: 'success',
      data: {
        connection: {
          connected: dbStatus.connected,
          timestamp: dbStatus.timestamp,
          version: dbStatus.version,
          error: dbStatus.error
        },
        table: {
          name: require('../config/constants').TABLE_NAME,
          exists: tableExists,
          structure: tableStructure.map(col => ({
            name: col.column_name,
            type: col.data_type,
            maxLength: col.character_maximum_length,
            nullable: col.is_nullable === 'YES',
            defaultValue: col.column_default
          }))
        },
        statistics: statistics,
        coinStatistics: coinStatistics,
        coinCount: coinCount
      }
    });
  } catch (error) {
    logger.error('Error getting database details:', error);
    throw new AppError(`Veritabanı bilgileri alınamadı: ${error.message}`, 500);
  }
});

/**
 * Coin arama/autocomplete endpoint'i
 */
exports.searchCoins = asyncHandler(async (req, res) => {
  const { query, limit = 20 } = req.query;
  
  if (!query || query.trim().length < 2) {
    return res.status(200).json({
      status: 'success',
      data: [],
      count: 0
    });
  }

  const coins = await coingeckoService.searchCoins(query.trim(), parseInt(limit));
  
  res.status(200).json({
    status: 'success',
    data: coins,
    count: coins.length
  });
});

/**
 * Coin validation endpoint'i (symbol veya coin adı ile)
 * Ayrıca coin'i veritabanına kaydeder (eğer yoksa)
 */
exports.validateCoin = asyncHandler(async (req, res) => {
  const { symbol, saveToDb = false } = req.query; // saveToDb: coin'i veritabanına kaydet
  
  if (!symbol) {
    throw new AppError('Symbol parametresi gerekli', 400);
  }

  try {
    const priceData = await coingeckoService.getPriceBySymbolOrName(symbol);
    
    // Eğer saveToDb true ise, coin'i veritabanına kaydet
    if (saveToDb === 'true' || saveToDb === true) {
      try {
        await databaseService.createTable();
        // USDT formatına çevir (veritabanı formatı)
        const dbSymbol = priceData.symbol + 'USDT';
        await databaseService.savePrice(dbSymbol, priceData.price);
        logger.info(`✅ ${dbSymbol} coin'i veritabanına kaydedildi`);
      } catch (dbError) {
        logger.warn(`⚠️ Coin veritabanına kaydedilemedi: ${dbError.message}`);
        // DB hatası olsa bile coin valid, sadece kaydedilemedi
      }
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        symbol: priceData.symbol,
        coinId: priceData.coinId,
        price: priceData.price,
        valid: true,
        savedToDb: saveToDb === 'true' || saveToDb === true
      }
    });
  } catch (error) {
    res.status(200).json({
      status: 'success',
      data: {
        symbol: symbol,
        valid: false,
        message: error.message
      }
    });
  }
});

/**
 * Custom coin listesi ile fiyatları çeker
 */
exports.getPricesByCustomSymbols = asyncHandler(async (req, res) => {
  const { symbols } = req.body; // Array of symbols
  
  if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
    throw new AppError('Symbols array gerekli', 400);
  }

  const prices = await coingeckoService.getPricesBySymbols(symbols);
  
  res.status(200).json({
    status: 'success',
    data: prices,
    count: prices.length
  });
});

/**
 * Coin ID ile direkt fiyat çeker (arama sonuçlarından gelen coin'ler için)
 */
exports.getPriceByCoinId = asyncHandler(async (req, res) => {
  const { coinId, symbol, saveToDb = false } = req.body;
  
  if (!coinId || !symbol) {
    throw new AppError('coinId ve symbol parametreleri gerekli', 400);
  }

  try {
    // CoinGecko API'den direkt fiyat çek (ID ile)
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
      params: {
        ids: coinId,
        vs_currencies: 'usd'
      },
      timeout: 10000
    });

    if (response.status === 200 && response.data[coinId]) {
      const price = parseFloat(response.data[coinId].usd);
      const symbolUpper = symbol.toUpperCase();
      
      // Eğer saveToDb true ise, veritabanına kaydet
      if (saveToDb) {
        try {
          await databaseService.createTable();
          const dbSymbol = symbolUpper + 'USDT';
          await databaseService.savePrice(dbSymbol, price);
          logger.info(`✅ ${dbSymbol} coin'i veritabanına kaydedildi (ID: ${coinId})`);
        } catch (dbError) {
          logger.warn(`⚠️ Coin veritabanına kaydedilemedi: ${dbError.message}`);
        }
      }
      
      res.status(200).json({
        status: 'success',
        data: {
          symbol: symbolUpper,
          coinId: coinId,
          price: price,
          valid: true,
          savedToDb: saveToDb
        }
      });
    } else {
      throw new Error(`${symbol} için fiyat bulunamadı`);
    }
  } catch (error) {
    logger.error(`Error fetching price by coin ID for ${symbol}:`, error);
    throw new AppError(`${symbol} için fiyat çekilemedi: ${error.message}`, 400);
  }
});

/**
 * Tüm kripto paraların fiyat geçmişini tek istekle getirir (batch)
 */
exports.getAllPriceHistories = asyncHandler(async (req, res) => {
  const { limit = 20, customSymbols } = req.query;
  
  // Custom symbols varsa array'e çevir
  let symbolArray = null;
  if (customSymbols) {
    symbolArray = customSymbols.split(',').map(s => s.trim().toUpperCase()).filter(s => s.length > 0);
  }
  
  const histories = await databaseService.getAllPriceHistories(parseInt(limit), symbolArray);
  
  res.status(200).json({
    status: 'success',
    data: histories,
    count: Object.keys(histories).length
  });
});

/**
 * Coin detaylı bilgilerini getirir (CoinGecko API'den)
 */
exports.getCoinInfo = asyncHandler(async (req, res) => {
  const { symbol } = req.params;
  
  if (!symbol) {
    throw new AppError('Symbol parametresi gerekli', 400);
  }

  try {
    // USDT'yi kaldır (eğer varsa)
    const cleanSymbol = symbol.toUpperCase().replace('USDT', '');
    
    // CoinGecko'dan detaylı bilgileri çek
    const coinInfo = await coingeckoService.getCoinInfo(cleanSymbol);
    
    res.status(200).json({
      status: 'success',
      data: coinInfo
    });
  } catch (error) {
    logger.error(`Error fetching coin info for ${symbol}:`, error);
    throw new AppError(`Coin bilgileri alınamadı: ${error.message}`, 400);
  }
});

/**
 * Coin'i veritabanından siler (tüm kayıtları)
 */
exports.deleteCoin = asyncHandler(async (req, res) => {
  const { symbol } = req.body;
  
  if (!symbol) {
    throw new AppError('Symbol parametresi gerekli', 400);
  }

  try {
    // Symbol'ü USDT formatına çevir (veritabanı formatı)
    const dbSymbol = symbol.toUpperCase().endsWith('USDT') 
      ? symbol.toUpperCase() 
      : symbol.toUpperCase() + 'USDT';
    
    const deletedCount = await databaseService.deleteCoin(dbSymbol);
    
    logger.info(`✅ ${dbSymbol} coin'i veritabanından silindi (${deletedCount} kayıt)`);
    
    res.status(200).json({
      status: 'success',
      data: {
        symbol: symbol.toUpperCase(),
        dbSymbol: dbSymbol,
        deletedCount: deletedCount,
        message: `${deletedCount} kayıt başarıyla silindi`
      }
    });
  } catch (error) {
    logger.error(`Error deleting coin ${symbol}:`, error);
    throw new AppError(`Coin silinirken hata oluştu: ${error.message}`, 500);
  }
});

/**
 * Get WebSocket/Price Service status
 */
exports.getPriceServiceStatus = asyncHandler(async (req, res) => {
  try {
    const priceService = global.priceService;
    
    if (!priceService) {
      return res.status(200).json({
        status: 'success',
        data: {
          initialized: false,
          message: 'Price Service not yet initialized'
        }
      });
    }

    const status = priceService.getStatus();
    
    res.status(200).json({
      status: 'success',
      data: status
    });
  } catch (error) {
    logger.error('Error getting price service status:', error);
    throw new AppError('Price service durumu alınamadı', 500);
  }
});

/**
 * Add symbol to WebSocket tracking
 */
exports.addSymbolToTracking = asyncHandler(async (req, res) => {
  try {
    const { symbol } = req.body;
    
    if (!symbol) {
      throw new AppError('Symbol parametresi gerekli', 400);
    }

    const priceService = global.priceService;
    
    if (!priceService) {
      throw new AppError('Price Service henüz başlatılmadı', 503);
    }

    priceService.addSymbol(symbol);
    
    res.status(200).json({
      status: 'success',
      message: `${symbol} WebSocket tracking'e eklendi`,
      data: priceService.getStatus()
    });
  } catch (error) {
    logger.error('Error adding symbol to tracking:', error);
    throw new AppError(`Symbol eklenirken hata oluştu: ${error.message}`, 500);
  }
});

/**
 * Remove symbol from WebSocket tracking
 */
exports.removeSymbolFromTracking = asyncHandler(async (req, res) => {
  try {
    const { symbol } = req.body;
    
    if (!symbol) {
      throw new AppError('Symbol parametresi gerekli', 400);
    }

    const priceService = global.priceService;
    
    if (!priceService) {
      throw new AppError('Price Service henüz başlatılmadı', 503);
    }

    priceService.removeSymbol(symbol);
    
    res.status(200).json({
      status: 'success',
      message: `${symbol} WebSocket tracking'den kaldırıldı`,
      data: priceService.getStatus()
    });
  } catch (error) {
    logger.error('Error removing symbol from tracking:', error);
    throw new AppError(`Symbol kaldırılırken hata oluştu: ${error.message}`, 500);
  }
});

/**
 * Get coin metadata (with caching)
 */
exports.getCoinMetadata = asyncHandler(async (req, res) => {
  try {
    const { symbol } = req.params;
    const { coinId } = req.query;
    
    if (!symbol) {
      throw new AppError('Symbol parametresi gerekli', 400);
    }

    const metadata = await metadataService.getMetadata(symbol, coinId);
    
    res.status(200).json({
      status: 'success',
      data: metadata
    });
  } catch (error) {
    logger.error(`Error getting metadata for ${symbol}:`, error);
    throw new AppError(`Metadata alınamadı: ${error.message}`, 500);
  }
});

/**
 * Update coin metadata (user can add/edit metadata for custom coins)
 */
exports.updateCoinMetadata = asyncHandler(async (req, res) => {
  try {
    const { symbol } = req.params;
    const {
      name,
      description,
      logoUrl,
      homepage,
      whitepaper,
      categories
    } = req.body;
    
    if (!symbol) {
      throw new AppError('Symbol parametresi gerekli', 400);
    }

    // Normalize symbol
    const normalizedSymbol = symbol.toUpperCase().replace('USDT', '').replace('USD', '');
    
    // Get existing metadata or create new
    let existingMetadata = await databaseService.getMetadata(normalizedSymbol);
    
    // Prepare metadata object
    const metadataToSave = {
      symbol: normalizedSymbol,
      coinId: existingMetadata?.coin_id || null,
      name: name || existingMetadata?.name || normalizedSymbol,
      logoUrl: logoUrl || existingMetadata?.logo_url || '',
      description: description || existingMetadata?.description || '',
      marketCap: existingMetadata?.market_cap || 0,
      marketCapRank: existingMetadata?.market_cap_rank || null,
      homepage: homepage || existingMetadata?.homepage || '',
      whitepaper: whitepaper || existingMetadata?.whitepaper || '',
      categories: categories || existingMetadata?.categories || [],
      currentPrice: existingMetadata?.current_price || 0,
      priceChange24h: existingMetadata?.price_change_24h || 0,
      circulatingSupply: existingMetadata?.circulating_supply || 0,
      totalSupply: existingMetadata?.total_supply || 0,
      maxSupply: existingMetadata?.max_supply || null,
    };

    // Save to database
    const savedMetadata = await databaseService.saveMetadata(normalizedSymbol, metadataToSave);
    
    res.status(200).json({
      status: 'success',
      message: `${normalizedSymbol} için metadata güncellendi`,
      data: savedMetadata
    });
  } catch (error) {
    logger.error(`Error updating metadata for ${symbol}:`, error);
    throw new AppError(`Metadata güncellenirken hata oluştu: ${error.message}`, 500);
  }
});

/**
 * Invalidate metadata cache for a coin
 */
exports.invalidateMetadataCache = asyncHandler(async (req, res) => {
  try {
    const { symbol } = req.body;
    
    if (!symbol) {
      throw new AppError('Symbol parametresi gerekli', 400);
    }

    await metadataService.invalidateCache(symbol);
    
    res.status(200).json({
      status: 'success',
      message: `${symbol} için metadata cache temizlendi`
    });
  } catch (error) {
    logger.error(`Error invalidating cache for ${symbol}:`, error);
    throw new AppError(`Cache temizlenirken hata oluştu: ${error.message}`, 500);
  }
});

