const { Pool } = require('pg');
const logger = require('../utils/logger');

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '12345678',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000, // Increased timeout
  allowExitOnIdle: false,
};

// Create pool
const pool = new Pool(dbConfig);

// Connection state tracking
let isConnected = false;
let lastConnectionAttempt = null;
let connectionRetries = 0;
const maxRetries = 5;

// Enhanced error handling
pool.on('error', (err) => {
  logger.error('⚠️ Unexpected error on idle client:', err.message);
  isConnected = false;
  
  // Don't exit process, just log and try to reconnect
  if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
    logger.warn('⚠️ Database connection lost. Attempting to reconnect...');
    attemptReconnection();
  }
});

// Connection event handlers
pool.on('connect', () => {
  logger.info('✅ New database connection established');
  isConnected = true;
  connectionRetries = 0;
});

pool.on('remove', () => {
  logger.info('ℹ️ Database connection removed from pool');
});

// Health check function
async function checkConnection() {
  try {
    const result = await Promise.race([
      pool.query('SELECT NOW() as current_time, version() as version'),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 3000)
      )
    ]);
    
    isConnected = true;
    connectionRetries = 0;
    return {
      connected: true,
      timestamp: result.rows[0].current_time,
      version: result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1]
    };
  } catch (error) {
    isConnected = false;
    logger.error('❌ Database connection check failed:', error.message);
    return {
      connected: false,
      error: error.message,
      errorCode: error.code
    };
  }
}

// Reconnection logic
async function attemptReconnection() {
  if (connectionRetries >= maxRetries) {
    logger.error(`❌ Max reconnection attempts (${maxRetries}) reached. Please check database configuration.`);
    return;
  }

  connectionRetries++;
  lastConnectionAttempt = new Date();
  
  const waitTime = Math.min(1000 * Math.pow(2, connectionRetries - 1), 30000); // Exponential backoff, max 30s
  logger.info(`⏳ Attempting to reconnect to database (${connectionRetries}/${maxRetries}) in ${waitTime/1000}s...`);
  
  setTimeout(async () => {
    const status = await checkConnection();
    if (!status.connected) {
      attemptReconnection();
    }
  }, waitTime);
}

// Initial connection test
(async () => {
  try {
    const status = await checkConnection();
    if (status.connected) {
      logger.info('✅ Database connected successfully');
      logger.info(`📊 Database: ${dbConfig.database}@${dbConfig.host}:${dbConfig.port}`);
    } else {
      logger.warn('⚠️ Initial database connection failed. Will retry automatically.');
      attemptReconnection();
    }
  } catch (error) {
    logger.error('❌ Database initialization error:', error.message);
    attemptReconnection();
  }
})();

// Periodic health check (every 30 seconds)
setInterval(async () => {
  if (!isConnected) {
    await checkConnection();
  }
}, 30000);

// Get pool statistics
function getPoolStats() {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
    isConnected,
    lastConnectionAttempt,
    connectionRetries
  };
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('🛑 Closing database pool...');
  await pool.end();
  logger.info('✅ Database pool closed');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('🛑 Closing database pool...');
  await pool.end();
  logger.info('✅ Database pool closed');
  process.exit(0);
});

// Export pool with additional utilities
module.exports = pool;
module.exports.checkConnection = checkConnection;
module.exports.getPoolStats = getPoolStats;
module.exports.isConnected = () => isConnected;

