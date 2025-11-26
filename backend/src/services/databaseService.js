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
      return true;
    } catch (error) {
      logger.error('Error creating table:', error);
      throw new AppError('Tablo oluşturulurken hata oluştu', 500);
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
        query += ` AND binancetime >= $${params.length + 1}`;
        params.push(startDate);
      }
      
      if (endDate) {
        query += ` AND binancetime <= $${params.length + 1}`;
        params.push(endDate);
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
}

module.exports = new DatabaseService();

