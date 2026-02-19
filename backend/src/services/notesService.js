const pool = require('../config/database');
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');

class NotesService {
  /**
   * Notes tablosunu oluşturur
   */
  async createTable() {
    try {
      const createQuery = `
        CREATE TABLE IF NOT EXISTS user_notes (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(100) DEFAULT 'default',
          title VARCHAR(255) NOT NULL,
          content TEXT,
          coin_symbol VARCHAR(20),
          tags TEXT[],
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;

      await pool.query(createQuery);
      
      // Create indexes
      try {
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_notes_user_id ON user_notes(user_id);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_notes_coin_symbol ON user_notes(coin_symbol);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_notes_created_at ON user_notes(created_at DESC);`);
      } catch (indexError) {
        logger.warn(`Index oluşturulurken hata (devam ediliyor):`, indexError.message);
      }
      
      logger.info('✅ Notes table created or already exists');
      return true;
    } catch (error) {
      logger.error('Error creating notes table:', error);
      throw new AppError('Notes tablosu oluşturulurken hata oluştu', 500);
    }
  }

  /**
   * Yeni not oluşturur
   */
  async createNote(userId, noteData) {
    try {
      await this.createTable();
      
      const { title, content, coinSymbol, tags } = noteData;
      
      const query = `
        INSERT INTO user_notes (user_id, title, content, coin_symbol, tags, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `;
      
      const result = await pool.query(query, [
        userId || 'default',
        title,
        content || '',
        coinSymbol || null,
        tags || []
      ]);
      
      logger.info(`✅ Not oluşturuldu: ${result.rows[0].id}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating note:', error);
      throw new AppError('Not oluşturulurken hata oluştu', 500);
    }
  }

  /**
   * Notları getirir (filtreleme ile)
   */
  async getNotes(userId, filters = {}) {
    try {
      await this.createTable();
      
      const { coinSymbol, search, limit = 100, offset = 0 } = filters;
      
      let query = `
        SELECT * FROM user_notes
        WHERE user_id = $1
      `;
      const params = [userId || 'default'];
      let paramIndex = 2;
      
      if (coinSymbol) {
        query += ` AND coin_symbol = $${paramIndex}`;
        params.push(coinSymbol.toUpperCase());
        paramIndex++;
      }
      
      if (search) {
        // Case-insensitive arama için LOWER() kullanıyoruz
        // Hem arama terimini hem de veritabanındaki değerleri küçük harfe çeviriyoruz
        // Arama terimini normalize et (trim ve boşlukları temizle)
        const normalizedSearch = search.trim();
        query += ` AND (LOWER(title) LIKE LOWER($${paramIndex}) OR LOWER(content) LIKE LOWER($${paramIndex}))`;
        params.push(`%${normalizedSearch}%`);
        paramIndex++;
      }
      
      query += ` ORDER BY updated_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);
      
      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error getting notes:', error);
      throw new AppError('Notlar getirilirken hata oluştu', 500);
    }
  }

  /**
   * Belirli bir notu getirir
   */
  async getNoteById(noteId, userId) {
    try {
      const query = `
        SELECT * FROM user_notes
        WHERE id = $1 AND user_id = $2
      `;
      
      const result = await pool.query(query, [noteId, userId || 'default']);
      
      if (result.rows.length === 0) {
        throw new AppError('Not bulunamadı', 404);
      }
      
      return result.rows[0];
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error getting note:', error);
      throw new AppError('Not getirilirken hata oluştu', 500);
    }
  }

  /**
   * Notu günceller
   */
  async updateNote(noteId, userId, noteData) {
    try {
      const { title, content, coinSymbol, tags } = noteData;
      
      const query = `
        UPDATE user_notes
        SET 
          title = COALESCE($1, title),
          content = COALESCE($2, content),
          coin_symbol = COALESCE($3, coin_symbol),
          tags = COALESCE($4, tags),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $5 AND user_id = $6
        RETURNING *
      `;
      
      const result = await pool.query(query, [
        title,
        content,
        coinSymbol,
        tags,
        noteId,
        userId || 'default'
      ]);
      
      if (result.rows.length === 0) {
        throw new AppError('Not bulunamadı', 404);
      }
      
      logger.info(`✅ Not güncellendi: ${noteId}`);
      return result.rows[0];
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating note:', error);
      throw new AppError('Not güncellenirken hata oluştu', 500);
    }
  }

  /**
   * Notu siler
   */
  async deleteNote(noteId, userId) {
    try {
      const query = `
        DELETE FROM user_notes
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `;
      
      const result = await pool.query(query, [noteId, userId || 'default']);
      
      if (result.rows.length === 0) {
        throw new AppError('Not bulunamadı', 404);
      }
      
      logger.info(`✅ Not silindi: ${noteId}`);
      return result.rows[0];
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error deleting note:', error);
      throw new AppError('Not silinirken hata oluştu', 500);
    }
  }

  /**
   * Coin'e göre notları getirir
   */
  async getNotesByCoin(coinSymbol, userId) {
    try {
      const query = `
        SELECT * FROM user_notes
        WHERE coin_symbol = $1 AND user_id = $2
        ORDER BY updated_at DESC
      `;
      
      const result = await pool.query(query, [coinSymbol.toUpperCase(), userId || 'default']);
      return result.rows;
    } catch (error) {
      logger.error('Error getting notes by coin:', error);
      throw new AppError('Notlar getirilirken hata oluştu', 500);
    }
  }
}

module.exports = new NotesService();

