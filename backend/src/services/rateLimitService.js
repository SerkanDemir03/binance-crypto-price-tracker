const logger = require('../utils/logger');

/**
 * Advanced rate limiting service with exponential backoff
 * Tracks API usage and implements intelligent retry logic
 */
class RateLimitService {
  constructor() {
    this.requestHistory = new Map(); // Track request history per provider
    this.backoffTimers = new Map(); // Track backoff timers
    this.maxRetries = 3;
    this.baseBackoffMs = 1000; // 1 second base backoff
  }

  /**
   * Check if we should make a request (considering rate limits)
   */
  canMakeRequest(provider, minIntervalMs = 1000) {
    const key = `provider:${provider}`;
    const lastRequest = this.requestHistory.get(key);
    
    if (!lastRequest) {
      return true;
    }

    const timeSinceLastRequest = Date.now() - lastRequest;
    
    // Check if we're in backoff period
    const backoffUntil = this.backoffTimers.get(key);
    if (backoffUntil && Date.now() < backoffUntil) {
      const remaining = Math.ceil((backoffUntil - Date.now()) / 1000);
      logger.warn(`⏳ ${provider} için backoff süresi devam ediyor. ${remaining} saniye kaldı.`);
      return false;
    }

    // Check minimum interval
    if (timeSinceLastRequest < minIntervalMs) {
      return false;
    }

    return true;
  }

  /**
   * Record a successful request
   */
  recordSuccess(provider) {
    const key = `provider:${provider}`;
    this.requestHistory.set(key, Date.now());
    this.backoffTimers.delete(key); // Clear backoff on success
  }

  /**
   * Record a rate limit error and set backoff
   */
  recordRateLimit(provider, retryAfterSeconds = null) {
    const key = `provider:${provider}`;
    this.requestHistory.set(key, Date.now());
    
    // Calculate backoff time
    const backoffMs = retryAfterSeconds 
      ? retryAfterSeconds * 1000 
      : this.baseBackoffMs * Math.pow(2, this.getRetryCount(provider));
    
    const backoffUntil = Date.now() + backoffMs;
    this.backoffTimers.set(key, backoffUntil);
    
    logger.warn(`⚠️ ${provider} için rate limit aşıldı. ${Math.ceil(backoffMs / 1000)} saniye backoff uygulanıyor.`);
    
    return backoffMs;
  }

  /**
   * Get retry count for a provider
   */
  getRetryCount(provider) {
    const key = `retry:${provider}`;
    return this.requestHistory.get(key) || 0;
  }

  /**
   * Increment retry count
   */
  incrementRetryCount(provider) {
    const key = `retry:${provider}`;
    const count = this.getRetryCount(provider);
    this.requestHistory.set(key, count + 1);
  }

  /**
   * Reset retry count
   */
  resetRetryCount(provider) {
    const key = `retry:${provider}`;
    this.requestHistory.delete(key);
  }

  /**
   * Calculate exponential backoff delay
   */
  getBackoffDelay(attempt, baseDelayMs = 1000) {
    return baseDelayMs * Math.pow(2, attempt);
  }

  /**
   * Wait for backoff period
   */
  async waitForBackoff(provider) {
    const backoffUntil = this.backoffTimers.get(`provider:${provider}`);
    if (!backoffUntil) {
      return;
    }

    const waitTime = backoffUntil - Date.now();
    if (waitTime > 0) {
      logger.info(`⏳ ${provider} için ${Math.ceil(waitTime / 1000)} saniye bekleniyor...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  /**
   * Get status for a provider
   */
  getStatus(provider) {
    const key = `provider:${provider}`;
    const lastRequest = this.requestHistory.get(key);
    const backoffUntil = this.backoffTimers.get(key);
    
    return {
      canMakeRequest: this.canMakeRequest(provider),
      lastRequest: lastRequest ? new Date(lastRequest).toISOString() : null,
      backoffUntil: backoffUntil ? new Date(backoffUntil).toISOString() : null,
      isInBackoff: backoffUntil ? Date.now() < backoffUntil : false,
      retryCount: this.getRetryCount(provider)
    };
  }

  /**
   * Clear all rate limit data
   */
  clear() {
    this.requestHistory.clear();
    this.backoffTimers.clear();
    logger.info('✅ Rate limit service cleared');
  }
}

// Singleton instance
const rateLimitService = new RateLimitService();

module.exports = rateLimitService;

