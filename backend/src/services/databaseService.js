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
      try {
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_name ON ${TABLE_NAME}(name);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_binancetime ON ${TABLE_NAME}(binancetime);`);
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
   * Kripto para fiyatını veritabanına kaydeder
   */
  async savePrice(symbol, price) {
    try {
      const istanbul_tz = new Date().toLocaleString('en-US', { timeZone: 'Europe/Istanbul' });
      const query = `
        INSERT INTO ${TABLE_NAME} (name, price, binancetime)
        VALUES ($1, $2, $3)
        RETURNING *
      `;
      
      const result = await pool.query(query, [symbol, price, new Date(istanbul_tz)]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error saving price:', error);
      throw new AppError('Fiyat kaydedilirken hata oluştu', 500);
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
      let query = `
        SELECT * FROM ${TABLE_NAME}
        WHERE name = $1
      `;
      const params = [symbol];
      
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
      return result.rows;
    } catch (error) {
      logger.error('Error getting price history:', error);
      throw new AppError('Fiyat geçmişi getirilirken hata oluştu', 500);
    }
  }

  /**
   * Tüm kripto paraların son fiyatlarını getirir
   */
  async getAllLatestPrices() {
    try {
      logger.info(`Checking for table: ${TABLE_NAME}`);
      
      // Önce tablonun var olup olmadığını kontrol et (case-insensitive)
      const tableCheckQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE LOWER(table_name) = LOWER($1)
        );
      `;
      const tableExists = await pool.query(tableCheckQuery, [TABLE_NAME]);
      
      logger.info(`Table ${TABLE_NAME} exists: ${tableExists.rows[0].exists}`);
      
      if (!tableExists.rows[0].exists) {
        logger.warn(`Table ${TABLE_NAME} does not exist. Creating it...`);
        await this.createTable();
        return []; // Tablo yeni oluşturuldu, henüz veri yok
      }

      // Tablo var, verileri çek
      const query = `
        SELECT DISTINCT ON (name) 
          id, name, price, binancetime
        FROM ${TABLE_NAME}
        ORDER BY name, binancetime DESC
      `;
      
      logger.info(`Executing query on table: ${TABLE_NAME}`);
      const result = await pool.query(query);
      logger.info(`Retrieved ${result.rows.length} latest prices from database`);
      return result.rows;
    } catch (error) {
      logger.error('Error getting all latest prices:', error);
      throw new AppError(`Fiyatlar getirilirken hata oluştu: ${error.message}`, 500);
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

