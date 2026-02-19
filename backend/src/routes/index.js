const express = require('express');
const router = express.Router();

// Route imports
const cryptoRoutes = require('./crypto.routes');

// API version info
router.get('/', (req, res) => {
  res.json({
    message: 'Binance Crypto Price Tracker API',
    version: '1.0.0',
    endpoints: {
      crypto: '/api/crypto'
    }
  });
});

// Routes
router.use('/crypto', cryptoRoutes);

module.exports = router;

