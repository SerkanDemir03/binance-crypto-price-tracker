const WebSocket = require('ws');
const databaseService = require('./databaseService');
const logger = require('../utils/logger');
const {
  CRYPTO_SYMBOLS,
  WEBSOCKET_SAVE_INTERVAL,
  WS_BINANCE_URL,
  WS_CONNECT_TIMEOUT_MS,
  WS_HEARTBEAT_INTERVAL_MS,
  WS_RECONNECT_DELAY_MS,
  WS_MAX_RECONNECT_ATTEMPTS
} = require('../config/constants');

const toBaseSymbol = (s) => (s || '').toLowerCase().replace(/usdt|usd/g, '');

/**
 * Binance WebSocket Price Streaming Service
 * Tek bağlantı, throttle ile DB kaydı, tek batch emit.
 */
class PriceService {
  constructor(io) {
    this.io = io;
    this.ws = null;
    this.symbols = new Set();
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.reconnectScheduled = false;
    this.priceCache = new Map();
    this.lastSaveTime = new Map();
    this.saveInterval = WEBSOCKET_SAVE_INTERVAL;
    this.heartbeatTimer = null;
    this.connectTimeout = null;
  }

  async initialize(symbols = null) {
    try {
      const list = symbols || CRYPTO_SYMBOLS;
      this.symbols = new Set(list.map((s) => toBaseSymbol(s)));
      logger.info(`📡 Binance WebSocket: ${this.symbols.size} sembol`);
      this.connect().catch((err) => logger.error('❌ WebSocket başlatılamadı:', err.message));
    } catch (err) {
      logger.error('❌ PriceService init:', err.message);
    }
  }

  cleanup() {
    if (this.connectTimeout) {
      clearTimeout(this.connectTimeout);
      this.connectTimeout = null;
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.ws) {
      this.ws.removeAllListeners();
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      this.ws = null;
    }
    this.isConnected = false;
  }

  async connect() {
    this.cleanup();
    return new Promise((resolve, reject) => {
      try {
        // Toggle stream URL between stream.binance.com and stream.binance.us on retry attempts
        let targetWsUrl = WS_BINANCE_URL;
        if (this.reconnectAttempts % 2 !== 0) {
          targetWsUrl = WS_BINANCE_URL.replace('stream.binance.com', 'stream.binance.us');
        }
        
        this.ws = new WebSocket(targetWsUrl);

        this.connectTimeout = setTimeout(() => {
          if (!this.isConnected) {
            logger.warn('⚠️ WebSocket bağlantı zaman aşımı');
            this.cleanup();
            this.scheduleReconnect();
            reject(new Error('WebSocket connection timeout'));
          }
        }, WS_CONNECT_TIMEOUT_MS);

        this.ws.on('open', () => {
          if (this.connectTimeout) clearTimeout(this.connectTimeout);
          this.connectTimeout = null;
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.reconnectScheduled = false;
          this.heartbeatTimer = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.ping();
          }, WS_HEARTBEAT_INTERVAL_MS);
          logger.info('✅ Binance WebSocket bağlandı');
          resolve();
        });

        this.ws.on('message', (data) => {
          try {
            const tickers = JSON.parse(data.toString());
            this.handlePriceUpdate(tickers);
          } catch (e) {
            logger.error('❌ WebSocket mesaj parse:', e.message);
          }
        });

        this.ws.on('error', () => {
          if (this.connectTimeout) clearTimeout(this.connectTimeout);
          this.isConnected = false;
        });

        this.ws.on('close', () => {
          if (this.connectTimeout) clearTimeout(this.connectTimeout);
          this.isConnected = false;
          this.cleanup();
          if (!this.reconnectScheduled) this.scheduleReconnect();
        });
      } catch (err) {
        this.cleanup();
        this.scheduleReconnect();
        reject(err);
      }
    });
  }

  scheduleReconnect() {
    if (this.reconnectScheduled || this.reconnectAttempts >= WS_MAX_RECONNECT_ATTEMPTS) {
      if (this.reconnectAttempts >= WS_MAX_RECONNECT_ATTEMPTS) {
        logger.warn(`⚠️ Binance WebSocket ${WS_MAX_RECONNECT_ATTEMPTS} denemeden sonra durduruldu. CoinGecko ile güncelleyebilirsiniz.`);
      }
      return;
    }
    this.reconnectScheduled = true;
    this.reconnectAttempts++;
    const delay = WS_RECONNECT_DELAY_MS * this.reconnectAttempts;
    logger.info(`🔄 WebSocket yeniden bağlanıyor (${this.reconnectAttempts}/${WS_MAX_RECONNECT_ATTEMPTS}) ${delay / 1000}s sonra`);
    setTimeout(() => {
      this.reconnectScheduled = false;
      this.connect().catch(() => {});
    }, delay);
  }

  async handlePriceUpdate(tickers) {
    if (!Array.isArray(tickers)) return;
    const now = new Date();
    const updates = [];

    for (const ticker of tickers) {
      const symbol = ticker.s;
      const base = toBaseSymbol(symbol);
      if (!this.symbols.has(base)) continue;

      const price = parseFloat(ticker.c);
      const priceChange = parseFloat(ticker.P);
      const volume = parseFloat(ticker.v);
      this.priceCache.set(symbol, { symbol, price, priceChange, volume, timestamp: now });

      const lastSave = this.lastSaveTime.get(symbol);
      if (!lastSave || now - lastSave >= this.saveInterval) {
        try {
          await databaseService.savePrice(symbol, price);
          this.lastSaveTime.set(symbol, now);
        } catch (e) {
          logger.warn(`⚠️ DB kayıt ${symbol}:`, e.message);
        }
      }
      updates.push({ symbol, price, priceChange, volume, timestamp: now.toISOString() });
    }

    if (updates.length && this.io) {
      this.io.emit('price-update', { type: 'batch', updates, timestamp: now.toISOString() });
    }
  }

  addSymbol(symbol) {
    const base = toBaseSymbol(symbol);
    if (!this.symbols.has(base)) {
      this.symbols.add(base);
      logger.info(`➕ WebSocket: ${symbol} eklendi`);
    }
  }

  removeSymbol(symbol) {
    const base = toBaseSymbol(symbol);
    if (this.symbols.has(base)) {
      this.symbols.delete(base);
      this.priceCache.delete((symbol || '').toUpperCase());
      logger.info(`➖ WebSocket: ${symbol} kaldırıldı`);
    }
  }

  getLatestPrice(symbol) {
    return this.priceCache.get((symbol || '').toUpperCase()) || null;
  }

  getAllCachedPrices() {
    return Array.from(this.priceCache.values());
  }

  getStatus() {
    return {
      isConnected: this.isConnected,
      symbolsTracked: Array.from(this.symbols),
      cachedPricesCount: this.priceCache.size,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  disconnect() {
    this.reconnectScheduled = true;
    this.cleanup();
    logger.info('🔌 Binance WebSocket kapatıldı');
  }
}

module.exports = PriceService;
