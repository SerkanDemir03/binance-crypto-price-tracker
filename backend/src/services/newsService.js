const axios = require('axios');
const logger = require('../utils/logger');
const cacheService = require('./cacheService');

class NewsService {
  constructor() {
    // Free crypto news APIs + RSS yedek
    this.newsSources = [
      { name: 'CryptoCompare', url: 'https://min-api.cryptocompare.com/data/v2/news/', enabled: true },
      { name: 'CoinGecko', url: 'https://api.coingecko.com/api/v3/news', enabled: true },
      { name: 'CoinDesk RSS', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', enabled: true }
    ];
  }

  /**
   * RSS feed'den haber çeker (CoinDesk - API key gerektirmez, yedek kaynak)
   */
  async getRssNews(limit = 20) {
    try {
      const cacheKey = cacheService.generateKey('news', 'rss-coindesk', limit);
      const cached = cacheService.get(cacheKey);
      if (cached) {
        logger.info('✅ RSS (CoinDesk) haberleri cache\'den alındı');
        return cached;
      }

      const response = await axios.get('https://www.coindesk.com/arc/outboundfeeds/rss/', {
        timeout: 10000,
        responseType: 'text',
        headers: { 'Accept': 'application/rss+xml, application/xml, text/xml' }
      });

      if (response.status !== 200 || typeof response.data !== 'string') {
        return [];
      }

      const xml = response.data;
      const news = [];
      const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
      const stripCdata = (s) => (s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1').trim();
      let match;
      let count = 0;

      while ((match = itemRegex.exec(xml)) !== null && count < limit) {
        const block = match[1];
        const titleMatch = block.match(/<title>([\s\S]*?)<\/title>/i);
        const linkMatch = block.match(/<link>([^<]*)<\/link>/i);
        const pubDateMatch = block.match(/<pubDate>([^<]*)<\/pubDate>/i);
        const descMatch = block.match(/<description>([\s\S]*?)<\/description>/i);
        const guidMatch = block.match(/<guid[^>]*>([^<]*)<\/guid>/i);

        // Extract image URL from enclosure, media:content or standard img tag
        const mediaMatch = block.match(/<media:content[^>]*url="([^"]*)"/i) || 
                           block.match(/<enclosure[^>]*url="([^"]*)"/i) ||
                           block.match(/<img[^>]*src="([^"]*)"/i);
        const imageUrl = mediaMatch ? mediaMatch[1] : null;

        const title = stripCdata(titleMatch ? titleMatch[1] : '');
        if (!title) continue;

        const link = linkMatch ? linkMatch[1].trim() : '';
        const pubDate = pubDateMatch ? pubDateMatch[1].trim() : '';
        const description = stripCdata(descMatch ? descMatch[1] : '');
        const guid = guidMatch ? guidMatch[1].trim() : `rss-${Date.now()}-${count}`;

        let publishedAt = new Date().toISOString();
        try {
          if (pubDate) publishedAt = new Date(pubDate).toISOString();
        } catch (_) {}

        news.push({
          id: guid,
          title,
          body: description,
          description,
          url: link,
          source: 'CoinDesk',
          imageUrl,
          publishedAt,
          tags: []
        });
        count++;
      }

      if (news.length > 0) {
        cacheService.set(cacheKey, news, 10 * 60 * 1000);
        logger.info(`✅ ${news.length} haber RSS (CoinDesk) üzerinden alındı`);
      }
      return news;
    } catch (error) {
      logger.error('Error fetching RSS news:', error.message || error);
      return [];
    }
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
            imageUrl: item.imageurl ? (item.imageurl.startsWith('/') ? `https://www.cryptocompare.com${item.imageurl}` : item.imageurl) : null,
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
      const perSource = Math.ceil(limit / 3);
      const results = await Promise.allSettled([
        this.getCryptoCompareNews(perSource),
        this.getCoinGeckoNews(perSource),
        this.getRssNews(perSource)
      ]);

      const allNews = [];
      const sourceNames = ['CryptoCompare', 'CoinGecko', 'CoinDesk RSS'];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && Array.isArray(result.value)) {
          allNews.push(...result.value);
        } else {
          logger.warn(`⚠️ ${sourceNames[index]} haberleri alınamadı:`, result.reason?.message || 'Bilinmeyen hata');
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

