require('dotenv').config();
const { httpServer, io } = require('./app');
const schedulerService = require('./services/schedulerService');
const PriceService = require('./services/priceService');
const FiatExchangeRateService = require('./services/fiatExchangeRateService');
const cryptoController = require('./controllers/crypto.controller');
const { UPDATE_INTERVAL, CRYPTO_SYMBOLS, DEFAULT_API_PROVIDER } = require('./config/constants');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;

// Initialize Price Service (Binance WebSocket)
let priceService = null;

// Make priceService globally accessible
global.priceService = null;

httpServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    logger.error(`Port ${PORT} zaten kullanımda. .env ile farklı PORT tanımlayın (örn. PORT=5001).`);
    process.exit(1);
  }
  logger.error('Sunucu hatası:', err.message);
  process.exit(1);
});

httpServer.listen(PORT, async () => {
  logger.info(`Server running on port ${PORT}. Env: ${process.env.NODE_ENV || 'development'}. Cron: ${UPDATE_INTERVAL}`);
  // Binance kısıtlı bölgelerde: SKIP_BINANCE_WEBSOCKET=true veya DEFAULT_API_PROVIDER=coingecko ile WebSocket devre dışı
  const explicitSkip = process.env.SKIP_BINANCE_WEBSOCKET === 'true' || process.env.SKIP_BINANCE_WEBSOCKET === '1';
  const useCoinGeckoDefault = (DEFAULT_API_PROVIDER || '').toLowerCase() === 'coingecko';
  const skipBinanceWs = explicitSkip || useCoinGeckoDefault;

  try {
    priceService = new PriceService(io);
    global.priceService = priceService;

    setImmediate(async () => {
      try {
        const databaseService = require('./services/databaseService');
        await databaseService.createTable();
        logger.info('Database tables ready');

        if (skipBinanceWs) {
          if (useCoinGeckoDefault && !explicitSkip) {
            logger.info('Binance WebSocket atlandı (DEFAULT_API_PROVIDER=coingecko). Fiyatlar CoinGecko ile güncellenir.');
          } else {
            logger.info('Binance WebSocket devre dışı (SKIP_BINANCE_WEBSOCKET). Dashboard "Güncelle" ile CoinGecko kullanın.');
          }
        } else {
          priceService.initialize(CRYPTO_SYMBOLS).catch((err) => logger.warn('WebSocket init failed:', err.message));
        }

        schedulerService.fetchAndSavePrices().catch((err) => logger.warn('Initial price fetch failed:', err.message));

        const fiatExchangeRateService = new FiatExchangeRateService(io);
        cryptoController.setFiatExchangeRateService(fiatExchangeRateService);

        setTimeout(async () => {
          try {
            await fiatExchangeRateService.updateAllExchangeRates();
            logger.info('Fiat exchange rates updated');
          } catch (err) {
            logger.warn('Fiat rates update failed:', err.message);
          }
        }, 5000);

        const cron = require('node-cron');
        cron.schedule('0 * * * *', async () => {
          try {
            await fiatExchangeRateService.updateAllExchangeRates();
          } catch (e) {
            logger.warn('Scheduled fiat rates update failed:', e.message);
          }
        }, { scheduled: true, timezone: 'Europe/Istanbul' });
      } catch (error) {
        logger.error('Error initializing services:', error.message);
      }
    });

    if (!skipBinanceWs) logger.info('WebSocket initializing in background');
    logger.info('Server ready', PORT);
  } catch (error) {
    logger.error('Price Service creation failed:', error.message);
  }
});

const shutdown = () => {
  logger.warn('Shutting down gracefully');
  if (priceService) priceService.disconnect();
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
process.on('uncaughtException', (error) => logger.error('Uncaught Exception:', error));
process.on('unhandledRejection', (reason, promise) => logger.error('Unhandled Rejection', promise, reason));

