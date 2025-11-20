const express = require('express');
const router = express.Router();
const cryptoController = require('../controllers/crypto.controller');
const pool = require('../config/database');

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
router.get('/db/statistics', cryptoController.getStatistics);

// Fetch and save route
router.post('/fetch', cryptoController.fetchAndSavePrices);

// Scheduler routes
router.get('/scheduler/status', cryptoController.getSchedulerStatus);
router.post('/scheduler/start', cryptoController.startScheduler);
router.post('/scheduler/stop', cryptoController.stopScheduler);

module.exports = router;
