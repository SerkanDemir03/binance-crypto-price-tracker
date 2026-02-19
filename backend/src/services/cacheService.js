const logger = require('../utils/logger');

/**
 * In-memory cache service for API responses
 * Prevents rate limiting by caching successful responses
 */
class CacheService {
  constructor() {
    this.cache = new Map();
    this.defaultTTL = 60 * 1000; // 1 minute default TTL
    this.maxSize = 1000; // Maximum cache entries
  }

  /**
   * Generate cache key from parameters
   */
  generateKey(prefix, ...params) {
    const keyParts = [prefix, ...params.map(p => String(p).toLowerCase())];
    return keyParts.join(':');
  }

  /**
   * Get cached value
   */
  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Set cache value
   */
  set(key, value, ttl = null) {
    // If cache is full, remove oldest entries
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    const ttlMs = ttl || this.defaultTTL;
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
      createdAt: Date.now()
    });
  }

  /**
   * Delete cache entry
   */
  delete(key) {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
    logger.info('✅ Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let expired = 0;
    let active = 0;

    for (const entry of this.cache.values()) {
      if (now > entry.expiresAt) {
        expired++;
      } else {
        active++;
      }
    }

    return {
      total: this.cache.size,
      active,
      expired,
      maxSize: this.maxSize
    };
  }

  /**
   * Clean expired entries
   */
  cleanExpired() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info(`🧹 Cleaned ${cleaned} expired cache entries`);
    }

    return cleaned;
  }
}

// Singleton instance
const cacheService = new CacheService();

// Auto-clean expired entries every 5 minutes
setInterval(() => {
  cacheService.cleanExpired();
}, 5 * 60 * 1000);

module.exports = cacheService;

