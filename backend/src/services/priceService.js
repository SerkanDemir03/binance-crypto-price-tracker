const WebSocket = require('ws');
const databaseService = require('./databaseService');
const logger = require('../utils/logger');
const { CRYPTO_SYMBOLS, WEBSOCKET_SAVE_INTERVAL } = require('../config/constants');

/**
 * Binance WebSocket Price Streaming Service
 * Real-time price updates via WebSocket (Hot Path)
 */
class PriceService {
  constructor(io) {
    this.io = io; // Socket.io instance for frontend communication
    this.ws = null;
    this.symbols = new Set();
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 5000; // 5 seconds
    this.priceCache = new Map(); // In-memory cache for latest prices
    this.lastSaveTime = new Map(); // Track last save time for each symbol (throttle)
    this.saveInterval = WEBSOCKET_SAVE_INTERVAL; // Save to database interval (configurable, default: 60 seconds)
    // Bu interval analiz için yeterli veri sağlar ve depolama sorunlarını önler
    // Örnek: 1 dakika = günde 1440 kayıt/coin, 40 coin = günde ~57,600 kayıt
  }

  /**
   * Initialize WebSocket connection to Binance
   * @param {Array<string>} symbols - Array of symbols to subscribe (e.g., ['btcusdt', 'ethusdt'])
   */
  async initialize(symbols = null) {
    try {
      // Use provided symbols or default from constants
      const symbolsToTrack = symbols || CRYPTO_SYMBOLS.map(s => s.toLowerCase().replace('usdt', ''));
      
      // Convert to lowercase and remove USDT suffix for Binance WebSocket
      this.symbols = new Set(
        symbolsToTrack.map(s => 
          s.toLowerCase().replace('usdt', '').replace('usd', '')
        )
      );

      logger.info(`📡 Initializing Binance WebSocket for ${this.symbols.size} symbols`);
      
      // Connect asynchronously, don't wait for it to complete
      // This ensures server continues even if WebSocket fails
      this.connect().catch(error => {
        logger.error('❌ WebSocket connection failed, but server will continue:', error.message);
        // Server will continue running even if WebSocket fails
      });
    } catch (error) {
      logger.error('❌ Error initializing PriceService:', error);
      // Don't throw error - let server continue
      logger.warn('⚠️ PriceService initialization failed, but server will continue running');
    }
  }

  /**
   * Connect to Binance WebSocket Stream
   */
  async connect() {
    return new Promise((resolve, reject) => {
      try {
        // Binance WebSocket URL for ticker stream
        // Format: wss://stream.binance.com:9443/ws/!ticker@arr
        // This streams all ticker updates, we'll filter by our symbols
        const wsUrl = 'wss://stream.binance.com:9443/ws/!ticker@arr';
        
        logger.info(`🔌 Connecting to Binance WebSocket: ${wsUrl}`);

        this.ws = new WebSocket(wsUrl);

        // Set timeout for connection
        const connectionTimeout = setTimeout(() => {
          if (!this.isConnected) {
            logger.warn('⚠️ WebSocket connection timeout, will retry...');
            this.handleReconnect();
            reject(new Error('WebSocket connection timeout'));
          }
        }, 10000); // 10 second timeout

        this.ws.on('open', () => {
          clearTimeout(connectionTimeout);
          logger.info('✅ Binance WebSocket connected successfully');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          resolve(); // Resolve promise when connected
        });

        this.ws.on('message', (data) => {
          try {
            const tickers = JSON.parse(data.toString());
            this.handlePriceUpdate(tickers);
          } catch (error) {
            logger.error('❌ Error parsing WebSocket message:', error);
          }
        });

        this.ws.on('error', (error) => {
          clearTimeout(connectionTimeout);
          logger.error('❌ Binance WebSocket error:', error);
          this.isConnected = false;
          // Don't reject here - let it try to reconnect
          // reject(error); // Commented out to allow reconnection
        });

        this.ws.on('close', () => {
          clearTimeout(connectionTimeout);
          logger.warn('⚠️ Binance WebSocket connection closed');
          this.isConnected = false;
          this.handleReconnect();
        });

        this.ws.on('pong', () => {
          // Heartbeat response received
          logger.debug('💓 WebSocket heartbeat pong received');
        });

        // Setup heartbeat to keep connection alive
        this.setupHeartbeat();

    } catch (error) {
      logger.error('❌ Error connecting to Binance WebSocket:', error);
      this.isConnected = false;
      this.handleReconnect();
      reject(error);
    }
  });
  }

  /**
   * Setup heartbeat to keep WebSocket connection alive
   */
  setupHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.ping();
        logger.debug('💓 WebSocket heartbeat ping sent');
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Handle price updates from WebSocket
   * @param {Array} tickers - Array of ticker data from Binance
   */
  async handlePriceUpdate(tickers) {
    if (!Array.isArray(tickers)) {
      return;
    }

    const updates = [];
    const now = new Date();

    for (const ticker of tickers) {
      try {
        const symbol = ticker.s; // Symbol (e.g., 'BTCUSDT')
        const price = parseFloat(ticker.c); // Current price
        const priceChange = parseFloat(ticker.P); // 24h price change percentage
        const volume = parseFloat(ticker.v); // 24h volume

        // Check if we're tracking this symbol
        const baseSymbol = symbol.toLowerCase().replace('usdt', '').replace('usd', '');
        if (!this.symbols.has(baseSymbol)) {
          continue;
        }

        // Update cache
        this.priceCache.set(symbol, {
          symbol,
          price,
          priceChange,
          volume,
          timestamp: now
        });

        // Save to database with throttle (her coin için 1 dakikada bir)
        // Bu sayede:
        // 1. Analiz için yeterli veri noktası sağlanır (dakikada 1 kayıt = günde 1440 kayıt)
        // 2. Depolama sorunları önlenir (gereksiz kayıtlar yapılmaz)
        // 3. Veritabanı performansı korunur
        const lastSave = this.lastSaveTime.get(symbol);
        const shouldSave = !lastSave || (now - lastSave) >= this.saveInterval;
        
        if (shouldSave) {
          try {
            await databaseService.savePrice(symbol, price);
            this.lastSaveTime.set(symbol, now);
            logger.debug(`💾 ${symbol} veritabanına kaydedildi (throttled: ${this.saveInterval/1000}s)`);
          } catch (dbError) {
            logger.warn(`⚠️ Failed to save ${symbol} to database:`, dbError.message);
          }
        } else {
          // Throttle nedeniyle kaydedilmedi, sadece cache güncellendi
          logger.debug(`⏭️ ${symbol} cache güncellendi (DB kaydı throttle nedeniyle atlandı)`);
        }

        updates.push({
          symbol,
          price,
          priceChange,
          volume,
          timestamp: now.toISOString()
        });

      } catch (error) {
        logger.error(`❌ Error processing ticker ${ticker.s}:`, error);
      }
    }

    // Emit updates to frontend via Socket.io
    if (updates.length > 0 && this.io) {
      this.io.emit('price-update', {
        type: 'batch',
        updates,
        timestamp: now.toISOString()
      });

      // Also emit individual updates for granular frontend handling
      updates.forEach(update => {
        this.io.emit('price-update-single', update);
      });

      logger.debug(`📊 Emitted ${updates.length} price updates to frontend`);
    }
  }

  /**
   * Handle reconnection logic
   */
  handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error(`❌ Max reconnection attempts (${this.maxReconnectAttempts}) reached. Stopping reconnection.`);
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts; // Exponential backoff

    logger.info(`🔄 Reconnecting to Binance WebSocket in ${delay / 1000} seconds (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Add a new symbol to track
   * @param {string} symbol - Symbol to add (e.g., 'SOLUSDT')
   */
  addSymbol(symbol) {
    const baseSymbol = symbol.toLowerCase().replace('usdt', '').replace('usd', '');
    if (!this.symbols.has(baseSymbol)) {
      this.symbols.add(baseSymbol);
      logger.info(`➕ Added ${symbol} to WebSocket tracking`);
    }
  }

  /**
   * Remove a symbol from tracking
   * @param {string} symbol - Symbol to remove
   */
  removeSymbol(symbol) {
    const baseSymbol = symbol.toLowerCase().replace('usdt', '').replace('usd', '');
    if (this.symbols.has(baseSymbol)) {
      this.symbols.delete(baseSymbol);
      this.priceCache.delete(symbol.toUpperCase());
      logger.info(`➖ Removed ${symbol} from WebSocket tracking`);
    }
  }

  /**
   * Get latest price from cache
   * @param {string} symbol - Symbol to get price for
   * @returns {Object|null} Latest price data or null
   */
  getLatestPrice(symbol) {
    return this.priceCache.get(symbol.toUpperCase()) || null;
  }

  /**
   * Get all cached prices
   * @returns {Array} Array of all cached prices
   */
  getAllCachedPrices() {
    return Array.from(this.priceCache.values());
  }

  /**
   * Get connection status
   * @returns {Object} Connection status information
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      symbolsTracked: Array.from(this.symbols),
      cachedPricesCount: this.priceCache.size,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  /**
   * Close WebSocket connection
   */
  disconnect() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isConnected = false;
    logger.info('🔌 Binance WebSocket disconnected');
  }
}

module.exports = PriceService;
