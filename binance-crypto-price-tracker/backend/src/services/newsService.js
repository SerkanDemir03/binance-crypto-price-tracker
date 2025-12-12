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

      if (response.status === 200 && response.data.Data) {
        const news = response.data.Data
          .slice(0, limit)
          .map(item => ({
            id: item.id,
            title: item.title,
            body: item.body,
            url: item.url,
            source: item.source,
            imageUrl: item.imageurl,
            publishedAt: new Date(item.published_on * 1000).toISOString(),
            categories: item.categories?.split('|') || [],
            tags: item.tags?.split('|') || []
          }));

        // Cache for 10 minutes
        cacheService.set(cacheKey, news, 10 * 60 * 1000);
        logger.info(`✅ ${news.length} haber CryptoCompare'dan alındı`);
        return news;
      }

      return [];
    } catch (error) {
      logger.error('Error fetching CryptoCompare news:', error);
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

      if (response.status === 200 && response.data.data) {
        const news = response.data.data
          .slice(0, limit)
          .map(item => ({
            id: item.id,
            title: item.title,
            description: item.description,
            url: item.url,
            source: item.news_site,
            imageUrl: item.thumb_2x || item.thumb,
            publishedAt: new Date(item.published_at).toISOString(),
            tags: item.tags || []
          }));

        // Cache for 10 minutes
        cacheService.set(cacheKey, news, 10 * 60 * 1000);
        logger.info(`✅ ${news.length} haber CoinGecko'dan alındı`);
        return news;
      }

      return [];
    } catch (error) {
      logger.error('Error fetching CoinGecko news:', error);
      return [];
    }
  }

  /**
   * Tüm haber kaynaklarından haberleri birleştirir
   */
  async getAllNews(limit = 30) {
    try {
      const [cryptoCompareNews, coinGeckoNews] = await Promise.all([
        this.getCryptoCompareNews(Math.ceil(limit / 2)),
        this.getCoinGeckoNews(Math.ceil(limit / 2))
      ]);

      // Combine and sort by date
      const allNews = [...cryptoCompareNews, ...coinGeckoNews]
        .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
        .slice(0, limit);

      logger.info(`✅ Toplam ${allNews.length} haber birleştirildi`);
      return allNews;
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

