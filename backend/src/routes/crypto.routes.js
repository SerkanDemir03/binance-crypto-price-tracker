const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const cryptoController = require('../controllers/crypto.controller');
const pool = require('../config/database');

// Fetch endpoint için özel rate limiter (API rate limit'lerini korumak için)
const fetchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 dakika
  max: 1, // Dakikada sadece 1 fetch isteği
  message: {
    error: 'Rate limit aşıldı',
    message: 'Çok sık istek gönderiyorsunuz. Lütfen 60 saniye bekleyin.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
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

module.exports = router;
