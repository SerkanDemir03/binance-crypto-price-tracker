const pool = require('../config/database');
const { TABLE_NAME } = require('../config/constants');
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');

class DatabaseService {
  /**
   * Tabloyu oluşturur (yoksa)
   */
  async createTable() {
    try {
      logger.info(`Creating table: ${TABLE_NAME}`);
      
      // binance.py ile uyumlu tablo yapısı (created_at kolonu yok)
      const createQuery = `
        CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
          id SERIAL PRIMARY KEY,
          name VARCHAR(20),
          price NUMERIC,
          binancetime TIMESTAMP
        );
      `;

      await pool.query(createQuery);
      
      // Index'leri ayrı oluştur (hata olsa bile devam et)
      // Composite index ekle (name + binancetime) - daha hızlı sorgular için
      try {
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_name ON ${TABLE_NAME}(name);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_binancetime ON ${TABLE_NAME}(binancetime DESC);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_name_time ON ${TABLE_NAME}(name, binancetime DESC);`);
      } catch (indexError) {
        logger.warn(`Index oluşturulurken hata (devam ediliyor):`, indexError.message);
      }
      
      logger.info(`✅ Table ${TABLE_NAME} created or already exists`);
      
      // Also create metadata table
      await this.createMetadataTable();
      
      // Also create fiat exchange rates table
      await this.createFiatExchangeRatesTable();
      
      return true;
    } catch (error) {
      logger.error('Error creating table:', error);
      throw new AppError('Tablo oluşturulurken hata oluştu', 500);
    }
  }

  /**
   * Metadata tablosunu oluşturur (yoksa)
   * Stores coin metadata (name, logo, description, market cap) with 24-hour caching
   */
  async createMetadataTable() {
    try {
      logger.info('Creating metadata table: coin_metadata');
      
      const createQuery = `
        CREATE TABLE IF NOT EXISTS coin_metadata (
          id SERIAL PRIMARY KEY,
          symbol VARCHAR(20) UNIQUE NOT NULL,
          coin_id VARCHAR(100),
          name VARCHAR(200),
          logo_url TEXT,
          description TEXT,
          description_tr TEXT,
          market_cap NUMERIC,
          market_cap_rank INTEGER,
          homepage TEXT,
          whitepaper TEXT,
          categories JSONB,
          current_price NUMERIC,
          price_change_24h NUMERIC,
          circulating_supply NUMERIC,
          total_supply NUMERIC,
          max_supply NUMERIC,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;

      await pool.query(createQuery);

      // Add description_tr column dynamically if it doesn't exist (for existing databases)
      try {
        await pool.query(`ALTER TABLE coin_metadata ADD COLUMN IF NOT EXISTS description_tr TEXT;`);
      } catch (alterError) {
        logger.warn(`coin_metadata'ya description_tr sütunu eklenirken hata (devam ediliyor):`, alterError.message);
      }
      
      // Create indexes for faster queries
      try {
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_metadata_symbol ON coin_metadata(symbol);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_metadata_updated_at ON coin_metadata(updated_at DESC);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_metadata_coin_id ON coin_metadata(coin_id);`);
      } catch (indexError) {
        logger.warn(`Metadata index oluşturulurken hata (devam ediliyor):`, indexError.message);
      }
      
      logger.info('✅ Metadata table created or already exists');
      return true;
    } catch (error) {
      logger.error('Error creating metadata table:', error);
      throw new AppError('Metadata tablosu oluşturulurken hata oluştu', 500);
    }
  }

  /**
   * Fiat exchange rates tablosunu oluşturur (yoksa)
   * Stores fiat currency exchange rates with caching to avoid rate limits
   */
  async createFiatExchangeRatesTable() {
    try {
      logger.info('Creating fiat exchange rates table: fiat_exchange_rates');
      
      const createQuery = `
        CREATE TABLE IF NOT EXISTS fiat_exchange_rates (
          id SERIAL PRIMARY KEY,
          currency VARCHAR(10) UNIQUE NOT NULL,
          rate_to_usd NUMERIC NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;

      await pool.query(createQuery);
      
      // Create indexes for faster queries
      try {
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_fiat_currency ON fiat_exchange_rates(currency);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_fiat_updated_at ON fiat_exchange_rates(updated_at DESC);`);
      } catch (indexError) {
        logger.warn(`Fiat exchange rates index oluşturulurken hata (devam ediliyor):`, indexError.message);
      }
      
      logger.info('✅ Fiat exchange rates table created or already exists');
      return true;
    } catch (error) {
      logger.error('Error creating fiat exchange rates table:', error);
      throw new AppError('Fiat exchange rates tablosu oluşturulurken hata oluştu', 500);
    }
  }

  /**
   * Fiat para biriminin USD karşılığını veritabanından getirir
   * @param {string} currency - Para birimi kodu (EUR, TRY, SAR, vb.)
   * @returns {Promise<number|null>} USD karşılığı veya null
   */
  async getFiatExchangeRate(currency) {
    try {
      const query = `
        SELECT rate_to_usd, updated_at 
        FROM fiat_exchange_rates 
        WHERE currency = $1
        ORDER BY updated_at DESC
        LIMIT 1
      `;
      
      const result = await pool.query(query, [currency.toUpperCase()]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting fiat exchange rate:', error);
      throw new AppError('Fiat exchange rate getirilirken hata oluştu', 500);
    }
  }

  /**
   * Fiat para biriminin USD karşılığını veritabanına kaydeder veya günceller
   * @param {string} currency - Para birimi kodu
   * @param {number} rate - USD karşılığı
   * @returns {Promise<boolean>}
   */
  async saveFiatExchangeRate(currency, rate) {
    try {
      const query = `
        INSERT INTO fiat_exchange_rates (currency, rate_to_usd, updated_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (currency) 
        DO UPDATE SET 
          rate_to_usd = EXCLUDED.rate_to_usd,
          updated_at = CURRENT_TIMESTAMP
      `;
      
      await pool.query(query, [currency.toUpperCase(), rate]);
      logger.debug(`✅ Fiat exchange rate kaydedildi: ${currency} = ${rate} USD`);
      return true;
    } catch (error) {
      logger.error('Error saving fiat exchange rate:', error);
      throw new AppError('Fiat exchange rate kaydedilirken hata oluştu', 500);
    }
  }

  /**
   * Tüm fiat exchange rate'leri getirir
   * @returns {Promise<Array>}
   */
  async getAllFiatExchangeRates() {
    try {
      const query = `
        SELECT currency, rate_to_usd, updated_at 
        FROM fiat_exchange_rates 
        ORDER BY currency
      `;
      
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Error getting all fiat exchange rates:', error);
      throw new AppError('Fiat exchange rate\'leri getirilirken hata oluştu', 500);
    }
  }

  /**
   * Belirli bir coin'in tüm kayıtlarını veritabanından siler
   * @param {string} symbol - Silinecek coin sembolü (örn: "BTCUSDT")
   * @returns {number} Silinen kayıt sayısı
   */
  async deleteCoin(symbol) {
    try {
      const query = `DELETE FROM ${TABLE_NAME} WHERE name = $1`;
      const result = await pool.query(query, [symbol]);
      logger.info(`✅ ${symbol} coin'inin ${result.rowCount} kaydı veritabanından silindi`);
      return result.rowCount;
    } catch (error) {
      logger.error(`Error deleting coin ${symbol}:`, error);
      throw new AppError(`Coin silinirken hata oluştu: ${error.message}`, 500);
    }
  }

  /**
   * Kripto para fiyatını veritabanına kaydeder
   * Her coin ekleme işleminde bu fonksiyon çağrılır ve veritabanına kaydedilir
   */
  async savePrice(symbol, price) {
    try {
      // Önce tabloyu oluştur (yoksa)
      await this.createTable();
      
      const istanbul_tz = new Date().toLocaleString('en-US', { timeZone: 'Europe/Istanbul' });
      const query = `
        INSERT INTO ${TABLE_NAME} (name, price, binancetime)
        VALUES ($1, $2, $3)
        RETURNING *
      `;
      
      logger.info(`💾 Veritabanına kaydediliyor: ${symbol} = $${price}`);
      const result = await pool.query(query, [symbol, price, new Date(istanbul_tz)]);
      logger.info(`✅ ${symbol} başarıyla veritabanına kaydedildi (ID: ${result.rows[0].id})`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error saving price:', error);
      throw new AppError('Fiyat kaydedilirken hata oluştu', 500);
    }
  }
  
  /**
   * Veritabanı bağlantısını test eder
   */
  async testConnection() {
    try {
      // Bağlantı timeout'u ile test et
      const result = await Promise.race([
        pool.query('SELECT NOW() as current_time, version() as pg_version'),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Veritabanı bağlantısı zaman aşımına uğradı')), 3000)
        )
      ]);
      
      return {
        connected: true,
        timestamp: result.rows[0].current_time,
        version: result.rows[0].pg_version,
        tableExists: await this.checkTableExists()
      };
    } catch (error) {
      logger.error('Database connection test failed:', error);
      const errorMessage = error.code === 'ECONNREFUSED' 
        ? 'PostgreSQL servisine bağlanılamadı. Servisin çalıştığından emin olun.'
        : error.code === 'ETIMEDOUT' || error.message.includes('timeout')
        ? 'Veritabanı bağlantısı zaman aşımına uğradı.'
        : error.message;
      
      return {
        connected: false,
        error: errorMessage,
        errorCode: error.code
      };
    }
  }
  
  /**
   * Tablonun var olup olmadığını kontrol eder
   */
  async checkTableExists() {
    try {
      const query = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE LOWER(table_name) = LOWER($1)
        );
      `;
      const result = await pool.query(query, [TABLE_NAME]);
      return result.rows[0].exists;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Veritabanındaki coin sayısını getirir
   */
  async getCoinCount() {
    try {
      const query = `SELECT COUNT(DISTINCT name) as count FROM ${TABLE_NAME}`;
      const result = await pool.query(query);
      return parseInt(result.rows[0].count) || 0;
    } catch (error) {
      return 0;
    }
  }
  
  /**
   * Veritabanı tablo yapısını getirir (kolonlar, tipler, vs.)
   */
  async getTableStructure() {
    try {
      const query = `
        SELECT 
          column_name,
          data_type,
          character_maximum_length,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position;
      `;
      const result = await pool.query(query, [TABLE_NAME]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting table structure:', error);
      return [];
    }
  }
  
  /**
   * Veritabanı istatistiklerini getirir
   */
  async getDatabaseStatistics() {
    try {
      const stats = {
        totalRecords: 0,
        uniqueCoins: 0,
        oldestRecord: null,
        newestRecord: null,
        averagePrice: null,
        minPrice: null,
        maxPrice: null
      };
      
      const query = `
        SELECT 
          COUNT(*) as total_records,
          COUNT(DISTINCT name) as unique_coins,
          MIN(binancetime) as oldest_record,
          MAX(binancetime) as newest_record,
          AVG(price) as avg_price,
          MIN(price) as min_price,
          MAX(price) as max_price
        FROM ${TABLE_NAME};
      `;
      
      const result = await pool.query(query);
      if (result.rows.length > 0) {
        const row = result.rows[0];
        stats.totalRecords = parseInt(row.total_records) || 0;
        stats.uniqueCoins = parseInt(row.unique_coins) || 0;
        stats.oldestRecord = row.oldest_record;
        stats.newestRecord = row.newest_record;
        stats.averagePrice = parseFloat(row.avg_price) || 0;
        stats.minPrice = parseFloat(row.min_price) || 0;
        stats.maxPrice = parseFloat(row.max_price) || 0;
      }
      
      return stats;
    } catch (error) {
      logger.error('Error getting database statistics:', error);
      return null;
    }
  }
  
  /**
   * Coin bazında istatistikleri getirir
   */
  async getCoinStatistics() {
    try {
      const query = `
        SELECT 
          name,
          COUNT(*) as record_count,
          MIN(price) as min_price,
          MAX(price) as max_price,
          AVG(price) as avg_price,
          MIN(binancetime) as first_record,
          MAX(binancetime) as last_record
        FROM ${TABLE_NAME}
        GROUP BY name
        ORDER BY name;
      `;
      
      const result = await pool.query(query);
      return result.rows.map(row => ({
        symbol: row.name,
        recordCount: parseInt(row.record_count),
        minPrice: parseFloat(row.min_price),
        maxPrice: parseFloat(row.max_price),
        avgPrice: parseFloat(row.avg_price),
        firstRecord: row.first_record,
        lastRecord: row.last_record
      }));
    } catch (error) {
      logger.error('Error getting coin statistics:', error);
      return [];
    }
  }

  /**
   * Tüm kripto paraların fiyatlarını kaydeder
   */
  async saveAllPrices(prices) {
    try {
      const istanbul_tz = new Date().toLocaleString('en-US', { timeZone: 'Europe/Istanbul' });
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        for (const { symbol, price } of prices) {
          await client.query(
            `INSERT INTO ${TABLE_NAME} (name, price, binancetime) VALUES ($1, $2, $3)`,
            [symbol, price, new Date(istanbul_tz)]
          );
        }
        
        await client.query('COMMIT');
        logger.info(`Saved ${prices.length} prices to database`);
        return true;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Error saving all prices:', error);
      throw new AppError('Fiyatlar kaydedilirken hata oluştu', 500);
    }
  }

  /**
   * Belirli bir kripto paranın son fiyatını getirir
   */
  async getLatestPrice(symbol) {
    try {
      const query = `
        SELECT * FROM ${TABLE_NAME}
        WHERE name = $1
        ORDER BY binancetime DESC
        LIMIT 1
      `;
      
      const result = await pool.query(query, [symbol]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting latest price:', error);
      throw new AppError('Fiyat getirilirken hata oluştu', 500);
    }
  }

  /**
   * Belirli bir kripto paranın fiyat geçmişini getirir
   */
  async getPriceHistory(symbol, limit = 100, startDate = null, endDate = null) {
    try {
      // Önce veritabanı bağlantısını test et
      try {
        await pool.query('SELECT 1');
      } catch (connError) {
        logger.error('Veritabanı bağlantı hatası:', connError.message);
        throw new AppError(`Veritabanı bağlantısı başarısız: ${connError.message}`, 503);
      }
      
      // Symbol'ü temizle ve USDT ekle (eğer yoksa)
      const cleanSymbol = symbol.toUpperCase().endsWith('USDT') 
        ? symbol.toUpperCase() 
        : symbol.toUpperCase() + 'USDT';
      
      let query = `
        SELECT * FROM ${TABLE_NAME}
        WHERE name = $1
      `;
      const params = [cleanSymbol];
      
      if (startDate) {
        // Tarih formatını PostgreSQL'e uygun hale getir
        // ISO 8601 formatını PostgreSQL TIMESTAMP'e çevir
        let startDateFormatted = startDate;
        try {
          // Eğer string ise Date objesine çevir ve ISO formatına getir
          if (typeof startDate === 'string') {
            const dateObj = new Date(startDate);
            if (!isNaN(dateObj.getTime())) {
              startDateFormatted = dateObj.toISOString();
            }
          }
        } catch (dateError) {
          logger.warn('Start date format error:', dateError);
          // Hata durumunda orijinal değeri kullan
        }
        query += ` AND binancetime >= $${params.length + 1}::timestamp`;
        params.push(startDateFormatted);
      }
      
      if (endDate) {
        // Tarih formatını PostgreSQL'e uygun hale getir
        let endDateFormatted = endDate;
        try {
          if (typeof endDate === 'string') {
            const dateObj = new Date(endDate);
            if (!isNaN(dateObj.getTime())) {
              endDateFormatted = dateObj.toISOString();
            }
          }
        } catch (dateError) {
          logger.warn('End date format error:', dateError);
          // Hata durumunda orijinal değeri kullan
        }
        query += ` AND binancetime <= $${params.length + 1}::timestamp`;
        params.push(endDateFormatted);
      }
      
      query += ` ORDER BY binancetime DESC LIMIT $${params.length + 1}`;
      params.push(limit);
      
      const result = await pool.query(query, params);
      
      // Veri yoksa boş array döndür (hata fırlatma)
      if (!result.rows || result.rows.length === 0) {
        logger.info(`⚠️ ${cleanSymbol} için fiyat geçmişi bulunamadı`);
        return [];
      }
      
      logger.info(`✅ ${cleanSymbol} için ${result.rows.length} kayıt getirildi`);
      return result.rows;
    } catch (error) {
      // AppError ise direkt fırlat
      if (error instanceof AppError) {
        throw error;
      }
      
      // Tablo yoksa oluştur ve boş array döndür
      if (error.message.includes('does not exist') || error.message.includes('relation') || error.code === '42P01') {
        logger.warn(`⚠️ Tablo ${TABLE_NAME} bulunamadı, oluşturuluyor...`);
        await this.createTable();
        return []; // Tablo yeni oluşturuldu, henüz veri yok
      }
      
      // Bağlantı hatası ise özel mesaj
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.message.includes('connection')) {
        logger.error('Veritabanı bağlantı hatası:', error.message);
        throw new AppError(`Veritabanı bağlantısı başarısız: ${error.message}`, 503);
      }
      
      logger.error('Error getting price history:', error);
      throw new AppError(`Fiyat geçmişi getirilirken hata oluştu: ${error.message}`, 500);
    }
  }

  /**
   * Tüm kripto paraların son fiyatlarını getirir
   * Optimize edilmiş: Tablo kontrolü sadece ilk çağrıda yapılır
   */
  async getAllLatestPrices(customSymbols = null) {
    try {
      // Önce veritabanı bağlantısını test et
      try {
        await pool.query('SELECT 1');
      } catch (connError) {
        logger.error('Veritabanı bağlantı hatası:', connError.message);
        throw new AppError(`Veritabanı bağlantısı başarısız: ${connError.message}`, 503);
      }
      
      // Tablo kontrolünü atla, direkt sorgu çalıştır (daha hızlı)
      // Eğer tablo yoksa hata alırız, o zaman oluştururuz
      try {
        let query, params;
        
        if (customSymbols && Array.isArray(customSymbols) && customSymbols.length > 0) {
          // Belirli coinler için filtrele (USDT formatına çevir)
          const dbSymbols = customSymbols.map(s => s.toUpperCase() + 'USDT');
          const placeholders = dbSymbols.map((_, i) => `$${i + 1}`).join(', ');
          
          query = `
            SELECT DISTINCT ON (name) 
              id, name, price, binancetime
            FROM ${TABLE_NAME}
            WHERE name IN (${placeholders})
            ORDER BY name, binancetime DESC
          `;
          params = dbSymbols;
        } else {
          // Tüm coinler
          query = `
            SELECT DISTINCT ON (name) 
              id, name, price, binancetime
            FROM ${TABLE_NAME}
            ORDER BY name, binancetime DESC
          `;
          params = [];
        }
        
        const result = await pool.query(query, params);
        logger.info(`✅ ${result.rows.length} fiyat veritabanından hızlıca çekildi`);
        return result.rows;
      } catch (queryError) {
        // Tablo yoksa oluştur
        if (queryError.message.includes('does not exist') || queryError.message.includes('relation') || queryError.code === '42P01') {
          logger.warn(`⚠️ Tablo ${TABLE_NAME} bulunamadı, oluşturuluyor...`);
          await this.createTable();
          return []; // Tablo yeni oluşturuldu, henüz veri yok
        }
        // Bağlantı hatası ise özel mesaj
        if (queryError.code === 'ECONNREFUSED' || queryError.code === 'ETIMEDOUT' || queryError.message.includes('connection')) {
          logger.error('Veritabanı bağlantı hatası:', queryError.message);
          throw new AppError(`Veritabanı bağlantısı başarısız: ${queryError.message}`, 503);
        }
        throw queryError;
      }
    } catch (error) {
      // AppError ise direkt fırlat
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error getting all latest prices:', error);
      throw new AppError(`Fiyatlar getirilirken hata oluştu: ${error.message}`, 500);
    }
  }

  /**
   * Tüm kripto paraların fiyat geçmişini tek sorguda getirir (batch)
   * Her kripto para için son N kaydı döndürür
   * @param {number} limit - Her coin için kaç kayıt
   * @param {Array} customSymbols - Filtrelenecek coinler (opsiyonel)
   */
  async getAllPriceHistories(limit = 20, customSymbols = null) {
    try {
      let query, params;
      
      if (customSymbols && Array.isArray(customSymbols) && customSymbols.length > 0) {
        // Belirli coinler için filtrele (USDT formatına çevir)
        const dbSymbols = customSymbols.map(s => s.toUpperCase() + 'USDT');
        const placeholders = dbSymbols.map((_, i) => `$${i + 1}`).join(', ');
        
        query = `
          WITH ranked_prices AS (
            SELECT 
              id,
              name,
              price,
              binancetime,
              ROW_NUMBER() OVER (PARTITION BY name ORDER BY binancetime DESC) as rn
            FROM ${TABLE_NAME}
            WHERE name IN (${placeholders})
          )
          SELECT id, name, price, binancetime
          FROM ranked_prices
          WHERE rn <= $${dbSymbols.length + 1}
        ORDER BY name, binancetime DESC
      `;
        params = [...dbSymbols, limit];
      } else {
        // Tüm coinler
        query = `
          WITH ranked_prices AS (
            SELECT 
              id,
              name,
              price,
              binancetime,
              ROW_NUMBER() OVER (PARTITION BY name ORDER BY binancetime DESC) as rn
            FROM ${TABLE_NAME}
          )
          SELECT id, name, price, binancetime
          FROM ranked_prices
          WHERE rn <= $1
          ORDER BY name, binancetime DESC
        `;
        params = [limit];
      }
      
      const result = await pool.query(query, params);
      
      // Verileri symbol bazında grupla
      const histories = {};
      result.rows.forEach(row => {
        if (!histories[row.name]) {
          histories[row.name] = [];
        }
        histories[row.name].push(row);
      });
      
      logger.info(`Retrieved price histories for ${Object.keys(histories).length} cryptocurrencies`);
      return histories;
    } catch (error) {
      logger.error('Error getting all price histories:', error);
      throw new AppError('Fiyat geçmişleri getirilirken hata oluştu', 500);
    }
  }

  /**
   * İstatistikleri getirir
   */
  async getStatistics(symbol = null) {
    try {
      let query;
      let params = [];
      
      if (symbol) {
        query = `
          SELECT 
            COUNT(*) as total_records,
            MIN(price) as min_price,
            MAX(price) as max_price,
            AVG(price) as avg_price,
            MIN(binancetime) as first_record,
            MAX(binancetime) as last_record
          FROM ${TABLE_NAME}
          WHERE name = $1
        `;
        params = [symbol];
      } else {
        query = `
          SELECT 
            COUNT(*) as total_records,
            COUNT(DISTINCT name) as unique_symbols,
            MIN(binancetime) as first_record,
            MAX(binancetime) as last_record
          FROM ${TABLE_NAME}
        `;
      }
      
      const result = await pool.query(query, params);
      return result.rows[0];
    } catch (error) {
      logger.error('Error getting statistics:', error);
      throw new AppError('İstatistikler getirilirken hata oluştu', 500);
    }
  }

  /**
   * Get metadata for a coin symbol
   * @param {string} symbol - Coin symbol (e.g., 'BTC')
   * @returns {Promise<Object|null>} Metadata object or null
   */
  async getMetadata(symbol) {
    try {
      const query = `
        SELECT * FROM coin_metadata
        WHERE symbol = $1
        LIMIT 1;
      `;
      
      const result = await pool.query(query, [symbol.toUpperCase()]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Error getting metadata for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Save or update metadata for a coin
   * @param {string} symbol - Coin symbol (e.g., 'BTC')
   * @param {Object} metadata - Metadata object
   * @returns {Promise<Object>} Saved metadata record
   */
  async saveMetadata(symbol, metadata) {
    try {
      // Ensure metadata table exists
      await this.createMetadataTable();

      const query = `
        INSERT INTO coin_metadata (
          symbol, coin_id, name, logo_url, description, description_tr, market_cap,
          market_cap_rank, homepage, whitepaper, categories,
          current_price, price_change_24h, circulating_supply,
          total_supply, max_supply, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        ON CONFLICT (symbol)
        DO UPDATE SET
          coin_id = EXCLUDED.coin_id,
          name = EXCLUDED.name,
          logo_url = EXCLUDED.logo_url,
          description = EXCLUDED.description,
          description_tr = EXCLUDED.description_tr,
          market_cap = EXCLUDED.market_cap,
          market_cap_rank = EXCLUDED.market_cap_rank,
          homepage = EXCLUDED.homepage,
          whitepaper = EXCLUDED.whitepaper,
          categories = EXCLUDED.categories,
          current_price = EXCLUDED.current_price,
          price_change_24h = EXCLUDED.price_change_24h,
          circulating_supply = EXCLUDED.circulating_supply,
          total_supply = EXCLUDED.total_supply,
          max_supply = EXCLUDED.max_supply,
          updated_at = EXCLUDED.updated_at
        RETURNING *;
      `;

      const values = [
        symbol.toUpperCase(),
        metadata.coinId || null,
        metadata.name || symbol,
        metadata.logoUrl || '',
        metadata.description || '',
        metadata.description_tr || '',
        metadata.marketCap || 0,
        metadata.marketCapRank || null,
        metadata.homepage || '',
        metadata.whitepaper || '',
        JSON.stringify(metadata.categories || []),
        metadata.currentPrice || 0,
        metadata.priceChange24h || 0,
        metadata.circulatingSupply || 0,
        metadata.totalSupply || 0,
        metadata.maxSupply || null,
        new Date()
      ];

      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error(`Error saving metadata for ${symbol}:`, error);
      throw new AppError(`Metadata kaydedilirken hata oluştu: ${error.message}`, 500);
    }
  }

  /**
   * Delete metadata for a coin
   * @param {string} symbol - Coin symbol
   * @returns {Promise<boolean>} True if deleted
   */
  async deleteMetadata(symbol) {
    try {
      const query = `
        DELETE FROM coin_metadata
        WHERE symbol = $1;
      `;
      
      const result = await pool.query(query, [symbol.toUpperCase()]);
      return result.rowCount > 0;
    } catch (error) {
      logger.error(`Error deleting metadata for ${symbol}:`, error);
      return false;
    }
  }

  /**
   * Get all metadata records
   * @returns {Promise<Array>} Array of metadata records
   */
  async getAllMetadata() {
    try {
      const query = `
        SELECT * FROM coin_metadata
        ORDER BY symbol;
      `;
      
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Error getting all metadata:', error);
      return [];
    }
  }
}

module.exports = new DatabaseService();

