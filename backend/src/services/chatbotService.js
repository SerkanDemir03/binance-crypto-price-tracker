const databaseService = require('./databaseService');
const binanceService = require('./binanceService');
const logger = require('../utils/logger');

/**
 * Yapay Zeka Asistanı (Chatbot) Servisi
 * - Kullanıcı sorularını yanıtlar
 * - Güncel fiyat verilerini (DB + Binance 24s) kullanır
 * - Al/sat tahmini veri odaklı yorumlar (yatırım tavsiyesi değildir uyarısı ile)
 * - Hiçbir durumda "cevap veremiyorum" bırakmaz; her zaman anlamlı yanıt döner
 */
class ChatbotService {
  constructor() {
    this.conversationHistory = new Map();
  }

  async generateResponse(message, userId = 'default') {
    try {
      const lowerMessage = message.toLowerCase().trim();

      if (!this.conversationHistory.has(userId)) {
        this.conversationHistory.set(userId, []);
      }
      const history = this.conversationHistory.get(userId);
      history.push({ role: 'user', content: message });

      let response = await this.processMessage(lowerMessage, history, message.trim());

      history.push({ role: 'assistant', content: response.text });
      if (history.length > 20) history.splice(0, 2);

      return {
        text: response.text,
        suggestions: response.suggestions || [],
        data: response.data || null
      };
    } catch (error) {
      logger.error('Chatbot error:', error);
      return {
        text: 'Şu an bağlantıda kısa bir gecikme yaşandı. Lütfen tekrar deneyin veya "Yardım" yazarak neler yapabileceğinizi görebilirsiniz.',
        suggestions: ['Yardım', 'BTC fiyatı', 'Merhaba']
      };
    }
  }

  async processMessage(message, history, originalMessage = '') {
    const defaultSuggestions = ['Yardım', 'BTC fiyatı', 'En güncel fiyatlar'];

    // ----- Selamlama -----
    if (this.matchesPattern(message, ['merhaba', 'selam', 'hey', 'hi', 'hello', 'günaydın', 'iyi günler'])) {
      return {
        text: 'Merhaba! 👋 Ben kripto para asistanınızım. Size nasıl yardımcı olabilirim?\n\n• Güncel fiyatları sorgulayabilirsiniz\n• Belirli bir coin için veri odaklı yorum alabilirsiniz (al/sat eğilimi)\n• Genel kripto bilgisi ve yardım',
        suggestions: ['BTC fiyatı', 'BTC alınır mı?', 'Yardım']
      };
    }

    // ----- Yardım -----
    if (this.matchesPattern(message, ['yardım', 'help', 'ne yapabilirsin', 'komutlar', 'komut'])) {
      return {
        text: 'Size şu konularda yardımcı olabilirim:\n\n📊 **Fiyat** – "BTC fiyatı", "Ethereum kaç dolar?"\n📈 **Al/Sat yorumu** – "BTC alınır mı?", "ETH satmalı mıyım?", "DOGE yorum"\n📉 **Tahmin / eğilim** – "BTC ne olacak?", "ETH tahmin"\n🪙 **Bilgi** – "Bitcoin nedir?", "En popüler coinler"\n\nTüm yorumlar güncel veritabanı ve piyasa verilerine göredir; yatırım tavsiyesi değildir.',
        suggestions: ['BTC fiyatı', 'BTC alınır mı?', 'En güncel fiyatlar']
      };
    }

    // ----- Al / sat / yorum / tahmin / ne olacak (veri odaklı) -----
    if (this.matchesPattern(message, ['alınır mı', 'alabilir miyim', 'almalı mıyım', 'satmalı mıyım', 'satılır mı', 'yorum', 'tahmin', 'ne olacak', 'al sat', 'alsam mı', 'satsam mı'])) {
      const symbol = this.extractSymbol(message, originalMessage);
      if (symbol) {
        const priceData = await this.getPriceInfo(symbol);
        if (priceData) {
          const trend = this.getTrendText(priceData.change24h, priceData.trendShort);
          const advice = this.getDataBasedComment(priceData.change24h, priceData.trendShort);
          const text = `💰 **${priceData.symbol}** – Güncel verilere göre:\n\n💵 Fiyat: $${this.fmt(priceData.price)}\n📊 24s değişim: ${priceData.change24h >= 0 ? '📈' : '📉'} ${priceData.change24h.toFixed(2)}%\n${trend}\n\n${advice}\n\n⚠️ Bu bilgi yatırım tavsiyesi değildir; karar sizin sorumluluğunuzdadır.`;
          return {
            text,
            suggestions: [`${symbol} fiyatı`, 'Başka coin yorumu', 'Yardım'],
            data: priceData
          };
        }
      }
      if (this.matchesPattern(message, ['yorum', 'tahmin', 'ne olacak'])) {
        return {
          text: 'Hangi kripto para hakkında yorum istersiniz? Örn: "BTC alınır mı?", "ETH yorum", "DOGE tahmin"',
          suggestions: ['BTC alınır mı?', 'ETH yorum', 'DOGE fiyatı']
        };
      }
    }

    // ----- Fiyat sorgulama -----
    if (this.matchesPattern(message, ['fiyat', 'price', 'kaç', 'ne kadar', 'değer', 'value']) || this.extractSymbol(message, originalMessage)) {
      const symbol = this.extractSymbol(message, originalMessage);
      if (symbol) {
        const priceData = await this.getPriceInfo(symbol);
        if (priceData) {
          return {
            text: `💰 **${priceData.symbol}**\n\n💵 Fiyat: $${this.fmt(priceData.price)}\n📊 24s değişim: ${priceData.change24h >= 0 ? '📈' : '📉'} ${priceData.change24h.toFixed(2)}%\n🕐 Güncelleme: ${priceData.lastUpdate}`,
            suggestions: [`${symbol} alınır mı?`, 'Başka coin fiyatı', 'Yardım'],
            data: priceData
          };
        }
        return {
          text: `"${symbol.toUpperCase()}" için şu an fiyat verisi (veritabanı veya canlı borsa) alınamadı. Lütfen geçerli bir sembol deneyin veya bağlantınızı kontrol edin.`,
          suggestions: ['BTC fiyatı', 'ETH fiyatı', 'Yardım']
        };
      }
      return {
        text: 'Hangi kripto paranın fiyatını istersiniz? Örn: "BTC fiyatı", "Ethereum kaç dolar?"',
        suggestions: ['BTC fiyatı', 'ETH fiyatı', 'DOGE fiyatı']
      };
    }

    // ----- En güncel fiyatlar / tüm coinler -----
    if (this.matchesPattern(message, ['güncel', 'tüm fiyatlar', 'hepsi', 'liste', 'coin listesi', 'takip edilen'])) {
      const ctx = await this.getContextData();
      if (ctx.prices.length > 0) {
        const lines = ctx.prices.slice(0, 10).map(p => `• **${p.symbol}**: $${this.fmt(p.price)} ${p.change24h != null ? `(${p.change24h >= 0 ? '+' : ''}${p.change24h.toFixed(1)}% 24s)` : ''}`).join('\n');
        return {
          text: `📊 Takip edilen coinlerden güncel değerler:\n\n${lines}\n\nBelirli bir coin için "BTC fiyatı" veya "ETH alınır mı?" yazabilirsiniz.`,
          suggestions: ['BTC fiyatı', 'ETH alınır mı?', 'Yardım']
        };
      }
      return {
        text: 'Şu an veritabanında fiyat kaydı bulunamadı. Dashboard\'dan "Fiyat Güncelle" ile veri çekebilirsiniz. Belirli coin için "BTC fiyatı" deneyebilirsiniz.',
        suggestions: ['Yardım', 'BTC fiyatı']
      };
    }

    // ----- Bitcoin / Ethereum / genel bilgi -----
    if (this.matchesPattern(message, ['bitcoin', 'btc']) && !this.matchesPattern(message, ['fiyat', 'al', 'sat', 'yorum', 'kaç'])) {
      return {
        text: '₿ **Bitcoin (BTC)** – Merkezi olmayan dijital para; blockchain ile güvenli işlem. Sınırlı arz: 21 milyon. Güncel fiyat için "BTC fiyatı", veri odaklı yorum için "BTC alınır mı?" yazabilirsiniz.',
        suggestions: ['BTC fiyatı', 'BTC alınır mı?', 'Ethereum nedir?']
      };
    }
    if (this.matchesPattern(message, ['ethereum', 'eth']) && !this.matchesPattern(message, ['fiyat', 'al', 'sat', 'yorum', 'kaç'])) {
      return {
        text: '🔷 **Ethereum (ETH)** – Akıllı sözleşmeler ve DApp platformu; DeFi ve NFT ekosistemi. Güncel fiyat için "ETH fiyatı", yorum için "ETH alınır mı?" yazabilirsiniz.',
        suggestions: ['ETH fiyatı', 'ETH alınır mı?', 'Bitcoin nedir?']
      };
    }
    if (this.matchesPattern(message, ['kripto para', 'kripto nedir', 'coin nedir'])) {
      return {
        text: '🪙 **Kripto para** – Şifreleme ile güvenli, merkezi olmayan dijital varlıklar. Bitcoin, Ethereum, Dogecoin gibi coinler takip edilebilir. Fiyat için "BTC fiyatı", yorum için "BTC alınır mı?" yazın.',
        suggestions: ['BTC fiyatı', 'En güncel fiyatlar', 'Yardım']
      };
    }
    if (this.matchesPattern(message, ['popüler', 'en iyi', 'hangi coin', 'coinler'])) {
      return {
        text: '📊 Popüler örnekler: Bitcoin (BTC), Ethereum (ETH), Dogecoin (DOGE), Cardano (ADA), Solana (SOL), Polygon (MATIC). Güncel fiyat ve yorum için örn: "BTC fiyatı", "ETH alınır mı?"',
        suggestions: ['BTC fiyatı', 'ETH fiyatı', 'En güncel fiyatlar']
      };
    }

    // ----- Yatırım uyarısı -----
    if (this.matchesPattern(message, ['yatırım', 'tavsiye', 'hangi coin alınmalı'])) {
      return {
        text: '⚠️ Yatırım tavsiyesi veremiyorum. Ancak güncel verilere göre coin bazında eğilim yorumu yapabilirim. Örn: "BTC alınır mı?" – 24s değişim ve kısa trende göre bilgi veririm; karar sizin. "Yardım" ile tüm seçenekleri görebilirsiniz.',
        suggestions: ['BTC alınır mı?', 'Yardım', 'En güncel fiyatlar']
      };
    }

    // ----- Teşekkür / veda -----
    if (this.matchesPattern(message, ['teşekkür', 'thanks', 'sağol'])) {
      return { text: 'Rica ederim! 😊 Başka bir sorunuz varsa yazın.', suggestions: defaultSuggestions };
    }
    if (this.matchesPattern(message, ['görüşürüz', 'bye', 'hoşça kal'])) {
      return { text: 'Görüşmek üzere! 👋', suggestions: [] };
    }

    // ----- Catch-all: Her zaman anlamlı yanıt (cevap verememe yok) -----
    const anySymbol = this.extractSymbol(message, originalMessage);
    if (anySymbol) {
      // Geçmiş tarih tespiti ("3 ay önce", "dün", "geçen hafta", vb.)
      const historicalDate = this.extractHistoricalDate(message);
      
      if (historicalDate) {
        // Geçmiş fiyatı getir
        const histData = await this.getHistoricalPrice(anySymbol, historicalDate.timestamp);
        if (histData && histData.price) {
          return {
            text: `📅 **${histData.symbol}**'nin ${historicalDate.text} fiyatı yaklaşık **$${this.fmt(histData.price)}** seviyesindeydi. (Güncel: $${this.fmt(histData.currentPrice)})`,
            suggestions: [`${anySymbol} alınır mı?`, 'En güncel fiyatlar', 'Yardım'],
            data: histData
          };
        } else {
          return {
            text: `Üzgünüm, **${anySymbol}** için ${historicalDate.text} fiyat verisine ulaşamadım. Binance üzerinde o tarihte listelenmemiş veya veri eksik olabilir.`,
            suggestions: [`${anySymbol} fiyatı`, 'Yardım', 'En güncel fiyatlar']
          };
        }
      }

      // Güncel fiyat getir
      const priceData = await this.getPriceInfo(anySymbol);
      if (priceData) {
        return {
          text: `💰 **${priceData.symbol}** – $${this.fmt(priceData.price)} (24s: ${priceData.change24h >= 0 ? '+' : ''}${priceData.change24h.toFixed(2)}%). Başka bir sorunuz var mı? "Yardım" yazarak neler sorabileceğinizi görebilirsiniz.`,
          suggestions: [`${anySymbol} alınır mı?`, 'Yardım', 'En güncel fiyatlar'],
          data: priceData
        };
      }
    }

    const ctx = await this.getContextData();
    if (ctx.prices.length > 0) {
      const sample = ctx.prices.slice(0, 5).map(p => `${p.symbol} $${this.fmt(p.price)}`).join(', ');
      return {
        text: `Sorunuzu tam eşleştiremedim. Şu an takip edilen coinlerden örnekler: ${sample}. Belirli biri için "BTC fiyatı" veya "ETH alınır mı?" yazabilirsiniz. "Yardım" ile tüm seçenekleri görebilirsiniz.`,
        suggestions: ['Yardım', 'BTC fiyatı', 'En güncel fiyatlar']
      };
    }

    return {
      text: 'Nasıl yardımcı olabileceğimi görmek için "Yardım" yazın. Örn: "BTC fiyatı", "ETH alınır mı?"',
      suggestions: ['Yardım', 'BTC fiyatı', 'Merhaba']
    };
  }

  fmt(num) {
    if (num == null || isNaN(num)) return '—';
    if (num >= 1000) return Number(num).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (num >= 1) return Number(num).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    return Number(num).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
  }

  getTrendText(change24h, trendShort) {
    if (trendShort != null) return `📉📈 Kısa dönem eğilim: ${trendShort}`;
    if (change24h > 0) return '📈 Son 24 saatte yükseliş var.';
    if (change24h < 0) return '📉 Son 24 saatte düşüş var.';
    return '➡️ Son 24 saatte belirgin değişim yok.';
  }

  getDataBasedComment(change24h, trendShort) {
    if (change24h > 2) return 'Verilere göre son 24 saatte güçlü yükseliş var; bazı yorumcular alım fırsatı olarak değerlendirebilir.';
    if (change24h > 0) return 'Son 24 saatte hafif yükseliş görülüyor.';
    if (change24h < -2) return 'Son 24 saatte belirgin düşüş var; dikkatli olmakta fayda var.';
    if (change24h < 0) return 'Son 24 saatte hafif düşüş var.';
    return 'Son 24 saatte fiyat nispeten sabit.';
  }

  extractSymbol(message, originalMessage = '') {
    const coinMap = {
      'bitcoin': 'BTC', 'btc': 'BTC', 'ethereum': 'ETH', 'eth': 'ETH',
      'binance coin': 'BNB', 'bnb': 'BNB', 'cardano': 'ADA', 'ada': 'ADA',
      'solana': 'SOL', 'sol': 'SOL', 'dogecoin': 'DOGE', 'doge': 'DOGE',
      'polygon': 'MATIC', 'matic': 'MATIC', 'polkadot': 'DOT', 'dot': 'DOT',
      'ripple': 'XRP', 'xrp': 'XRP', 'litecoin': 'LTC', 'ltc': 'LTC',
      'chainlink': 'LINK', 'link': 'LINK', 'avalanche': 'AVAX', 'avax': 'AVAX',
      'uniswap': 'UNI', 'uni': 'UNI', 'tron': 'TRX', 'trx': 'TRX',
      'cosmos': 'ATOM', 'atom': 'ATOM', 'bitcoin cash': 'BCC', 'bcc': 'BCC', 'bch': 'BCH'
    };
    for (const [key, symbol] of Object.entries(coinMap)) {
      if (message.includes(key)) return symbol;
    }
    
    // Orijinal mesajdan tamamen büyük harf olan 2-10 karakterli kelimeyi bul
    const match = originalMessage.match(/\b([A-Z]{2,10})\b/);
    if (match) return match[1].toUpperCase();
    
    return null;
  }

  /**
   * Mesaj içerisindeki geçmiş zaman ifadelerini yakalar ve timestamp döndürür
   */
  extractHistoricalDate(message) {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    
    // Basit ifadeler
    if (message.includes('dün')) return { timestamp: now - dayMs, text: 'dün' };
    if (message.includes('geçen hafta') || message.includes('1 hafta önce')) return { timestamp: now - 7 * dayMs, text: '1 hafta önceki' };
    if (message.includes('geçen ay') || message.includes('1 ay önce')) return { timestamp: now - 30 * dayMs, text: '1 ay önceki' };
    if (message.includes('geçen yıl') || message.includes('1 yıl önce')) return { timestamp: now - 365 * dayMs, text: '1 yıl önceki' };

    // Dinamik "X gün/ay/yıl önce"
    let match = message.match(/(\d+)\s+(gün|ay|yıl|sene)\s+önce/);
    if (match) {
      const amount = parseInt(match[1]);
      const unit = match[2];
      if (unit === 'gün') return { timestamp: now - amount * dayMs, text: `${amount} gün önceki` };
      if (unit === 'ay') return { timestamp: now - amount * 30 * dayMs, text: `${amount} ay önceki` };
      if (unit === 'yıl' || unit === 'sene') return { timestamp: now - amount * 365 * dayMs, text: `${amount} yıl önceki` };
    }
    
    return null;
  }

  /**
   * Binance üzerinden geçmiş tarihli fiyatı çeker
   */
  async getHistoricalPrice(symbol, timestampMs) {
    const sym = symbol.toUpperCase().endsWith('USDT') ? symbol.toUpperCase() : symbol.toUpperCase() + 'USDT';
    try {
      // Güncel fiyatı da alalım ki kıyas yapalım
      let currentPrice = null;
      try {
         const cp = await binanceService.getPriceBySymbol(sym);
         if(cp) currentPrice = cp.price;
      } catch(e){}

      // Timestamp için kline al: o zamanın etrafında (±1 gün) 1d interval ile 1 mum alalım
      const startTime = timestampMs - (12 * 60 * 60 * 1000); // 12 saat öncesi
      const endTime = timestampMs + (12 * 60 * 60 * 1000);   // 12 saat sonrası
      
      const response = await require('axios').get('https://api.binance.com/api/v3/klines', {
        params: {
          symbol: sym,
          interval: '1d',
          startTime: startTime,
          endTime: endTime,
          limit: 1
        },
        timeout: 5000
      });
      
      if (response.data && response.data.length > 0) {
        // [0: Open time, 1: Open, 2: High, 3: Low, 4: Close, ...]
        const price = parseFloat(response.data[0][4]); // Close price
        return {
          symbol: sym.replace('USDT', ''),
          price: price,
          currentPrice: currentPrice || price
        };
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Güncel fiyat + 24s değişim + kısa trend (veritabanı geçmişi)
   */
  async getPriceInfo(symbol) {
    const sym = symbol.toUpperCase();
    const symbolUsdt = sym.endsWith('USDT') ? sym : sym + 'USDT';
    let price = null;
    let lastUpdate = '—';
    let change24h = 0;
    let trendShort = null;

    try {
      const dbPrice = await databaseService.getLatestPrice(symbolUsdt);
      if (dbPrice && dbPrice.price != null) {
        price = parseFloat(dbPrice.price);
        lastUpdate = dbPrice.binancetime ? new Date(dbPrice.binancetime).toLocaleString('tr-TR') : '—';
      }
    } catch (e) {
      logger.warn('getPriceInfo DB:', e.message);
    }

    try {
      const stats = await binanceService.get24hStats(symbolUsdt);
      if (stats && Number.isFinite(stats.priceChangePercent)) {
        change24h = parseFloat(stats.priceChangePercent);
        if (price == null && stats.lastPrice) price = parseFloat(stats.lastPrice);
      }
    } catch (e) {
      logger.warn('get24hStats:', e.message);
    }

    if (price == null) {
      try {
        const binancePrice = await binanceService.getPriceBySymbol(symbolUsdt);
        if (binancePrice && binancePrice.price) price = parseFloat(binancePrice.price);
      } catch (e) {
        logger.warn('getPriceBySymbol:', e.message);
      }
    }

    // Binance de patlarsa CoinGecko'ya başvur
    if (price == null) {
      try {
        const coingeckoService = require('./coingeckoService');
        const cgPrice = await coingeckoService.getPriceBySymbolOrName(sym);
        if (cgPrice && cgPrice.price) price = parseFloat(cgPrice.price);
      } catch (e) {
        logger.warn('coingeckoService.getPriceBySymbolOrName:', e.message);
      }
    }

    if (price == null) return null;

    try {
      const history = await databaseService.getPriceHistory(symbolUsdt, 5);
      if (Array.isArray(history) && history.length >= 2) {
        const prices = history.map(r => parseFloat(r.price)).filter(n => !isNaN(n));
        if (prices.length >= 2) {
          const first = prices[prices.length - 1];
          const last = prices[0];
          if (first > 0) {
            const pct = ((last - first) / first) * 100;
            trendShort = pct > 0 ? 'yükseliş eğilimi' : pct < 0 ? 'düşüş eğilimi' : 'yatay';
          }
        }
      }
    } catch (e) {
      logger.warn('getPriceHistory for trend:', e.message);
    }

    return {
      symbol: sym,
      price,
      change24h,
      lastUpdate,
      trendShort
    };
  }

  /**
   * Takip edilen coinlerin güncel fiyatları + 24s (özet context)
   */
  async getContextData() {
    const prices = [];
    try {
      const rows = await databaseService.getAllLatestPrices(null);
      if (!rows || !rows.length) return { prices: [] };
      const symbols = [...new Set(rows.map(r => r.name))];
      let stats24h = {};
      try {
        stats24h = await binanceService.getAll24hStats(symbols);
      } catch (e) {
        logger.warn('getAll24hStats:', e.message);
      }
      for (const row of rows) {
        const sym = (row.name || '').replace('USDT', '');
        if (!sym) continue;
        prices.push({
          symbol: sym,
          price: parseFloat(row.price),
          change24h: stats24h[row.name] != null ? stats24h[row.name] : null
        });
      }
    } catch (e) {
      logger.warn('getContextData:', e.message);
    }
    return { prices };
  }

  matchesPattern(message, patterns) {
    return patterns.some(p => message.includes(p));
  }

  clearHistory(userId) {
    this.conversationHistory.delete(userId);
  }
}

module.exports = new ChatbotService();
