const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const cryptoController = require('../controllers/crypto.controller');
const pool = require('../config/database');

// Fetch endpoint için özel rate limiter (API rate limit'lerini korumak için)
// Her API provider için ayrı rate limit (IP + provider kombinasyonu)
const fetchLimiter = rateLimit({
  windowMs: 30 * 1000, // 30 saniye (daha kısa window - daha hızlı reset)
  max: 2, // 30 saniyede 2 fetch isteği (daha esnek)
  standardHeaders: true, // X-RateLimit-* header'larını ekle (X-RateLimit-Reset dahil)
  legacyHeaders: true, // Retry-After header'ını da ekle
  // Rate limit'i IP + API provider kombinasyonuna göre ayır
  // Böylece Binance rate limit'i aşıldığında CoinGecko kullanılabilir
  keyGenerator: (req) => {
    // IP adresini al (proxy arkasındaysa X-Forwarded-For header'ından)
    let ip = req.ip || 
             req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
             req.connection?.remoteAddress || 
             req.socket?.remoteAddress ||
             'unknown';
    
    // Provider'ı al (query veya body'den)
    const provider = req.query?.provider || req.body?.provider || 'binance';
    
    // Key oluştur
    const key = `${ip}-${provider}`;
    
    // Debug log (production'da kaldırılabilir)
    console.log(`[Rate Limit] Key generated: ${key}, IP: ${ip}, Provider: ${provider}`);
    
    return key;
  },
  // Rate limit aşıldığında özel response handler
  handler: (req, res) => {
    const windowMs = 30 * 1000; // 30 saniye
    const retryAfter = 30; // Window süresi (30 saniye)
    const resetTime = new Date(Date.now() + windowMs);
    
    const provider = req.query?.provider || req.body?.provider || 'binance';
    const ip = req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.connection?.remoteAddress || 'unknown';
    const key = `${ip}-${provider}`;
    
    // Debug log
    console.log(`[Rate Limit] 429 Error - Key: ${key}, Provider: ${provider}, IP: ${ip}`);
    
    // Header'ları manuel olarak set et
    res.setHeader('Retry-After', retryAfter);
    res.setHeader('X-RateLimit-Reset', Math.floor(resetTime.getTime() / 1000).toString());
    
    res.status(429).json({
      error: 'Rate limit aşıldı',
      message: 'Çok sık istek gönderiyorsunuz. Lütfen birkaç saniye bekleyin.',
      retryAfter: retryAfter,
      resetTime: resetTime.toISOString(),
      provider: provider,
      key: key // Debug için
    });
  },
  skip: (req) => {
    // Eğer custom symbols varsa (sadece belirli coin'ler için), rate limit'i biraz gevşet
    return false; // Şimdilik tüm istekler için rate limit uygula
  },
  // Başarısız istekleri de sayma (sadece başarılı istekleri say)
  skipSuccessfulRequests: false,
  // Başarısız istekleri de sayma (sadece 429 hatası dışındaki hataları sayma)
  skipFailedRequests: false
});

// Health check endpoint for database
router.get('/health/db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.status(200).json({
      status: 'success',
      message: 'Database connection successful',
      timestamp: result.rows[0].now
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// Binance API routes
router.get('/prices', cryptoController.getAllPrices);
router.get('/prices/:symbol', cryptoController.getPriceBySymbol);
router.get('/stats/:symbol', cryptoController.get24hStats);

// Database routes
router.get('/db/prices', cryptoController.getLatestPricesFromDB);
router.get('/db/prices/:symbol', cryptoController.getLatestPriceFromDB);
router.get('/db/history/:symbol', cryptoController.getPriceHistory);
router.get('/db/histories', cryptoController.getAllPriceHistories); // Batch endpoint
router.get('/db/statistics', cryptoController.getStatistics);

// Fetch and save route (rate limited)
router.post('/fetch', fetchLimiter, cryptoController.fetchAndSavePrices);

// Scheduler routes
router.get('/scheduler/status', cryptoController.getSchedulerStatus);
router.post('/scheduler/start', cryptoController.startScheduler);
router.post('/scheduler/stop', cryptoController.stopScheduler);

// API Health check
router.get('/health/apis', cryptoController.checkApiHealth);

// Database Status check
router.get('/health/database-status', cryptoController.checkDatabaseStatus);
router.get('/database/details', cryptoController.getDatabaseDetails);

// Coin silme
router.delete('/coins/delete', cryptoController.deleteCoin);

// Coin management routes
router.get('/coins/search', cryptoController.searchCoins);
router.get('/coins/validate', cryptoController.validateCoin);
router.post('/coins/price-by-id', cryptoController.getPriceByCoinId);
router.post('/coins/prices', cryptoController.getPricesByCustomSymbols);
router.get('/coins/:symbol/info', cryptoController.getCoinInfo);

module.exports = router;
