const axios = require('axios');
const logger = require('../utils/logger');
const cacheService = require('./cacheService');

class NewsService {
  constructor() {
    // Free crypto news APIs
    this.newsSources = [
      {
        name: 'CryptoCompare',
        url: 'https://min-api.cryptocompare.com/data/v2/news/',
        enabled: true
      },
      {
        name: 'CoinGecko',
        url: 'https://api.coingecko.com/api/v3/news',
        enabled: true
      }
    ];
  }

  /**
   * CryptoCompare'dan haberleri çeker
   */
  async getCryptoCompareNews(limit = 20) {
    try {
      const cacheKey = cacheService.generateKey('news', 'cryptocompare', limit);
      const cached = cacheService.get(cacheKey);
      if (cached) {
        logger.info('✅ CryptoCompare haberleri cache\'den alındı');
        return cached;
      }

      const response = await axios.get('https://min-api.cryptocompare.com/data/v2/news/', {
        params: {
          lang: 'EN',
          sortOrder: 'latest'
        },
        timeout: 10000
      });

      if (response.status === 200 && response.data && response.data.Data && Array.isArray(response.data.Data)) {
        const news = response.data.Data
          .filter(item => item && item.title && item.id) // Geçersiz haberleri filtrele
          .slice(0, limit)
          .map(item => ({
            id: item.id || `cryptocompare-${Date.now()}-${Math.random()}`,
            title: item.title || 'Başlıksız Haber',
            body: item.body || '',
            url: item.url || '',
            source: item.source || 'CryptoCompare',
            imageUrl: item.imageurl || null,
            publishedAt: item.published_on 
              ? new Date(item.published_on * 1000).toISOString()
              : new Date().toISOString(),
            categories: item.categories ? item.categories.split('|').filter(Boolean) : [],
            tags: item.tags ? item.tags.split('|').filter(Boolean) : []
          }));

        // Cache for 10 minutes
        if (news.length > 0) {
          cacheService.set(cacheKey, news, 10 * 60 * 1000);
          logger.info(`✅ ${news.length} haber CryptoCompare'dan alındı`);
        }
        return news;
      }

      logger.warn('⚠️ CryptoCompare API yanıtı geçersiz veya boş');
      return [];
    } catch (error) {
      logger.error('Error fetching CryptoCompare news:', error.message || error);
      // Hata durumunda boş array döndür (uygulama çökmesin)
      return [];
    }
  }

  /**
   * CoinGecko'dan haberleri çeker
   */
  async getCoinGeckoNews(limit = 20) {
    try {
      const cacheKey = cacheService.generateKey('news', 'coingecko', limit);
      const cached = cacheService.get(cacheKey);
      if (cached) {
        logger.info('✅ CoinGecko haberleri cache\'den alındı');
        return cached;
      }

      const response = await axios.get('https://api.coingecko.com/api/v3/news', {
        timeout: 10000
      });

      if (response.status === 200 && response.data && response.data.data && Array.isArray(response.data.data)) {
        const news = response.data.data
          .filter(item => item && item.title && item.id) // Geçersiz haberleri filtrele
          .slice(0, limit)
          .map(item => ({
            id: item.id || `coingecko-${Date.now()}-${Math.random()}`,
            title: item.title || 'Başlıksız Haber',
            description: item.description || '',
            url: item.url || '',
            source: item.news_site || 'CoinGecko',
            imageUrl: item.thumb_2x || item.thumb || null,
            publishedAt: item.published_at 
              ? new Date(item.published_at).toISOString()
              : new Date().toISOString(),
            tags: Array.isArray(item.tags) ? item.tags.filter(Boolean) : []
          }));

        // Cache for 10 minutes
        if (news.length > 0) {
          cacheService.set(cacheKey, news, 10 * 60 * 1000);
          logger.info(`✅ ${news.length} haber CoinGecko'dan alındı`);
        }
        return news;
      }

      logger.warn('⚠️ CoinGecko API yanıtı geçersiz veya boş');
      return [];
    } catch (error) {
      logger.error('Error fetching CoinGecko news:', error.message || error);
      // Hata durumunda boş array döndür (uygulama çökmesin)
      return [];
    }
  }

  /**
   * Tüm haber kaynaklarından haberleri birleştirir
   * Promise.allSettled kullanarak bir API başarısız olsa bile diğeri çalışır
   */
  async getAllNews(limit = 30) {
    try {
      // Promise.allSettled kullan - bir API başarısız olsa bile diğeri çalışsın
      const results = await Promise.allSettled([
        this.getCryptoCompareNews(Math.ceil(limit / 2)),
        this.getCoinGeckoNews(Math.ceil(limit / 2))
      ]);

      // Başarılı sonuçları topla
      const allNews = [];
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && Array.isArray(result.value)) {
          allNews.push(...result.value);
        } else {
          const sourceName = index === 0 ? 'CryptoCompare' : 'CoinGecko';
          logger.warn(`⚠️ ${sourceName} haberleri alınamadı:`, result.reason?.message || 'Bilinmeyen hata');
        }
      });

      // Combine and sort by date
      const sortedNews = allNews
        .filter(news => news && news.title) // Geçersiz haberleri filtrele
        .sort((a, b) => {
          try {
            return new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0);
          } catch {
            return 0;
          }
        })
        .slice(0, limit);

      logger.info(`✅ Toplam ${sortedNews.length} haber birleştirildi`);
      return sortedNews;
    } catch (error) {
      logger.error('Error fetching all news:', error);
      return [];
    }
  }

  /**
   * Belirli bir coin ile ilgili haberleri arar
   */
  async searchNewsByCoin(coinSymbol, limit = 20) {
    try {
      const allNews = await this.getAllNews(limit * 2);
      const coinUpper = coinSymbol.toUpperCase();
      
      const filteredNews = allNews.filter(news => {
        const title = (news.title || '').toUpperCase();
        const body = (news.body || news.description || '').toUpperCase();
        const tags = (news.tags || []).join(' ').toUpperCase();
        
        return title.includes(coinUpper) || 
               body.includes(coinUpper) || 
               tags.includes(coinUpper);
      }).slice(0, limit);

      logger.info(`✅ ${filteredNews.length} haber ${coinSymbol} için bulundu`);
      return filteredNews;
    } catch (error) {
      logger.error('Error searching news by coin:', error);
      return [];
    }
  }
}

module.exports = new NewsService();

