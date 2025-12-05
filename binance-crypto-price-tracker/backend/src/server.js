require('dotenv').config();
const { httpServer, io } = require('./app');
const schedulerService = require('./services/schedulerService');
const PriceService = require('./services/priceService');
const { UPDATE_INTERVAL, CRYPTO_SYMBOLS } = require('./config/constants');

const PORT = process.env.PORT || 5000;

// Initialize Price Service (Binance WebSocket)
let priceService = null;

// Make priceService globally accessible
global.priceService = null;

// Server'ı başlat
httpServer.listen(PORT, async () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⏰ Auto-update interval: ${UPDATE_INTERVAL}`);
  
  // Initialize Price Service with Socket.io (non-blocking)
  try {
    console.log(`📡 Initializing Binance WebSocket service...`);
    priceService = new PriceService(io);
    global.priceService = priceService; // Make globally accessible
    
    // Wait a bit for database to be ready, then initialize WebSocket
    // Use setImmediate to ensure this doesn't block server startup
    setImmediate(async () => {
      try {
        const databaseService = require('./services/databaseService');
        await databaseService.createTable();
        console.log(`✅ Database tables ready`);
        
        // Initialize WebSocket connection (non-blocking, won't crash server if it fails)
        priceService.initialize(CRYPTO_SYMBOLS).catch(err => {
          console.error('⚠️ WebSocket initialization failed, but server continues:', err.message);
        });
        
        // Also do initial price fetch (non-blocking)
        schedulerService.fetchAndSavePrices().catch(err => {
          console.error('⚠️ Initial price fetch failed, but server continues:', err.message);
        });
      } catch (error) {
        console.error('⚠️ Error initializing services (server continues):', error.message);
        console.error('Full error:', error);
      }
    });
    
    console.log(`ℹ️ Real-time price streaming via WebSocket enabled (initializing in background...)`);
  } catch (error) {
    console.error('⚠️ Error creating Price Service (server continues):', error.message);
    console.error('Full error:', error);
    // Don't exit - server should continue even if WebSocket fails
  }
  
  console.log(`✅ Server is ready and listening on port ${PORT}`);
  console.log(`💡 Note: WebSocket connection is being established in the background`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('⚠️ SIGTERM received, shutting down gracefully...');
  if (priceService) {
    priceService.disconnect();
  }
  httpServer.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('⚠️ SIGINT received, shutting down gracefully...');
  if (priceService) {
    priceService.disconnect();
  }
  httpServer.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Unhandled error handling
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.error('⚠️ Server çalışmaya devam edecek...');
  // process.exit(1) yerine sadece log yap
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  console.error('⚠️ Server çalışmaya devam edecek...');
  // process.exit(1) yerine sadece log yap
});

