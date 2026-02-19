const databaseService = require('./databaseService');
const binanceService = require('./binanceService');
const logger = require('../utils/logger');

/**
 * AI Chatbot Service
 * Kripto para hakkında soruları yanıtlayan chatbot servisi
 */
class ChatbotService {
  constructor() {
    this.conversationHistory = new Map(); // Kullanıcı bazlı konuşma geçmişi
  }

  /**
   * Chatbot yanıtı oluştur
   * @param {string} message - Kullanıcı mesajı
   * @param {string} userId - Kullanıcı ID (session ID)
   * @returns {Promise<Object>} Chatbot yanıtı
   */
  async generateResponse(message, userId = 'default') {
    try {
      const lowerMessage = message.toLowerCase().trim();
      
      // Konuşma geçmişini al veya oluştur
      if (!this.conversationHistory.has(userId)) {
        this.conversationHistory.set(userId, []);
      }
      const history = this.conversationHistory.get(userId);

      // Kullanıcı mesajını geçmişe ekle
      history.push({ role: 'user', content: message });

      // Mesajı analiz et ve yanıt oluştur
      let response = await this.processMessage(lowerMessage, history);

      // Bot yanıtını geçmişe ekle
      history.push({ role: 'assistant', content: response.text });

      // Geçmişi sınırla (son 20 mesaj)
      if (history.length > 20) {
        history.shift();
      }

      return {
        text: response.text,
        suggestions: response.suggestions || [],
        data: response.data || null
      };
    } catch (error) {
      logger.error('Chatbot error:', error);
      return {
        text: 'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.',
        suggestions: ['Yardım', 'Fiyat Sorgula', 'Merhaba']
      };
    }
  }

  /**
   * Mesajı işle ve uygun yanıtı oluştur
   * @param {string} message - Kullanıcı mesajı (lowercase)
   * @param {Array} history - Konuşma geçmişi
   * @returns {Promise<Object>} Yanıt objesi
   */
  async processMessage(message, history) {
    // Selamlama
    if (this.matchesPattern(message, ['merhaba', 'selam', 'hey', 'hi', 'hello', 'günaydın', 'iyi günler'])) {
      return {
        text: 'Merhaba! 👋 Ben kripto para asistanınızım. Size nasıl yardımcı olabilirim?\n\n• Kripto para fiyatlarını sorgulayabilirsiniz\n• Genel kripto para bilgileri alabilirsiniz\n• Yatırım tavsiyeleri hakkında bilgi edinebilirsiniz',
        suggestions: ['BTC fiyatı nedir?', 'En popüler coinler', 'Yardım']
      };
    }

    // Yardım
    if (this.matchesPattern(message, ['yardım', 'help', 'ne yapabilirsin', 'komutlar', 'komut'])) {
      return {
        text: 'Size şu konularda yardımcı olabilirim:\n\n📊 **Fiyat Sorgulama**\n• "BTC fiyatı nedir?"\n• "Ethereum kaç dolar?"\n• "DOGE fiyatı"\n\n📈 **Genel Bilgiler**\n• "Bitcoin nedir?"\n• "En popüler coinler"\n• "Kripto para nedir?"\n\n💡 **Yatırım Tavsiyeleri**\n• "Yatırım tavsiyesi"\n• "Hangi coin alınmalı?"\n\n💬 **Diğer**\n• "Teşekkürler"\n• "Görüşürüz"',
        suggestions: ['BTC fiyatı nedir?', 'Bitcoin nedir?', 'Yatırım tavsiyesi']
      };
    }

    // Fiyat sorgulama
    if (this.matchesPattern(message, ['fiyat', 'price', 'kaç', 'ne kadar', 'değer', 'value'])) {
      const symbol = this.extractSymbol(message);
      if (symbol) {
        try {
          const priceData = await this.getPriceInfo(symbol);
          if (priceData) {
            return {
              text: `💰 **${priceData.symbol}** fiyatı:\n\n💵 **Fiyat:** $${priceData.price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n📊 **24s Değişim:** ${priceData.change24h > 0 ? '📈' : '📉'} ${priceData.change24h.toFixed(2)}%\n🕐 **Güncelleme:** ${priceData.lastUpdate}`,
              suggestions: [`${symbol} hakkında daha fazla bilgi`, 'Başka bir coin sorgula', 'Yardım'],
              data: priceData
            };
          } else {
            return {
              text: `❌ ${symbol.toUpperCase()} için fiyat bilgisi bulunamadı. Lütfen geçerli bir coin sembolü girin (örn: BTC, ETH, DOGE).`,
              suggestions: ['BTC fiyatı', 'ETH fiyatı', 'Yardım']
            };
          }
        } catch (error) {
          logger.error('Price query error:', error);
          return {
            text: 'Fiyat bilgisi alınırken bir hata oluştu. Lütfen daha sonra tekrar deneyin.',
            suggestions: ['Yardım', 'Başka bir coin sorgula']
          };
        }
      } else {
        return {
          text: 'Hangi kripto paranın fiyatını öğrenmek istersiniz? Örneğin: "BTC fiyatı", "Ethereum kaç dolar?"',
          suggestions: ['BTC fiyatı', 'ETH fiyatı', 'DOGE fiyatı']
        };
      }
    }

    // Bitcoin hakkında
    if (this.matchesPattern(message, ['bitcoin', 'btc', 'bitcoin nedir'])) {
      return {
        text: '₿ **Bitcoin (BTC)**\n\nBitcoin, 2009 yılında Satoshi Nakamoto tarafından oluşturulan ilk ve en büyük kripto paradır.\n\n**Özellikler:**\n• Merkezi olmayan (decentralized) dijital para\n• Blockchain teknolojisi kullanır\n• Sınırlı arz: 21 milyon coin\n• "Dijital altın" olarak bilinir\n\n**Kullanım Alanları:**\n• Dijital ödeme\n• Değer saklama (store of value)\n• Yatırım aracı\n\nFiyat bilgisi için "BTC fiyatı" yazabilirsiniz.',
        suggestions: ['BTC fiyatı', 'Ethereum nedir?', 'Kripto para nedir?']
      };
    }

    // Ethereum hakkında
    if (this.matchesPattern(message, ['ethereum', 'eth', 'ethereum nedir'])) {
      return {
        text: '🔷 **Ethereum (ETH)**\n\nEthereum, akıllı sözleşmeler (smart contracts) çalıştırabilen bir blockchain platformudur.\n\n**Özellikler:**\n• Programlanabilir blockchain\n• DApp (Decentralized Applications) desteği\n• NFT ve DeFi ekosistemi\n• Proof of Stake (PoS) konsensüs mekanizması\n\n**Kullanım Alanları:**\n• DeFi uygulamaları\n• NFT\'ler\n• Akıllı sözleşmeler\n• Token oluşturma\n\nFiyat bilgisi için "ETH fiyatı" yazabilirsiniz.',
        suggestions: ['ETH fiyatı', 'Bitcoin nedir?', 'DeFi nedir?']
      };
    }

    // Kripto para genel bilgi
    if (this.matchesPattern(message, ['kripto para', 'cryptocurrency', 'kripto nedir', 'coin nedir'])) {
      return {
        text: '🪙 **Kripto Para Nedir?**\n\nKripto para, şifreleme teknikleri kullanılarak güvenliği sağlanan dijital varlıklardır.\n\n**Temel Özellikler:**\n• Merkezi olmayan yapı\n• Blockchain teknolojisi\n• Güvenli ve şeffaf işlemler\n• Sınırlı veya kontrollü arz\n\n**Popüler Kripto Paralar:**\n• Bitcoin (BTC) - Dijital altın\n• Ethereum (ETH) - Akıllı sözleşmeler\n• Binance Coin (BNB)\n• Cardano (ADA)\n• Solana (SOL)\n\nDaha fazla bilgi için belirli bir coin hakkında soru sorabilirsiniz.',
        suggestions: ['Bitcoin nedir?', 'Ethereum nedir?', 'En popüler coinler']
      };
    }

    // En popüler coinler
    if (this.matchesPattern(message, ['popüler', 'popular', 'en iyi', 'hangi coin', 'coinler', 'coins'])) {
      return {
        text: '📊 **En Popüler Kripto Paralar:**\n\n1. **Bitcoin (BTC)** - İlk ve en büyük kripto para\n2. **Ethereum (ETH)** - Akıllı sözleşmeler platformu\n3. **Binance Coin (BNB)** - Binance ekosistemi\n4. **Cardano (ADA)** - Bilimsel yaklaşımlı blockchain\n5. **Solana (SOL)** - Yüksek hızlı blockchain\n6. **Dogecoin (DOGE)** - Popüler meme coin\n7. **Polygon (MATIC)** - Ethereum ölçeklendirme\n8. **Polkadot (DOT)** - Çoklu blockchain ağı\n\nFiyat bilgisi için coin adını yazabilirsiniz (örn: "BTC fiyatı").',
        suggestions: ['BTC fiyatı', 'ETH fiyatı', 'Bitcoin nedir?']
      };
    }

    // Yatırım tavsiyesi
    if (this.matchesPattern(message, ['yatırım', 'investment', 'tavsiye', 'hangi coin al', 'alınmalı', 'yorum'])) {
      return {
        text: '⚠️ **Yatırım Tavsiyesi Uyarısı**\n\nBen bir yapay zeka asistanıyım ve yatırım tavsiyesi veremem. Ancak şu bilgileri paylaşabilirim:\n\n**Genel Bilgiler:**\n• Kripto para yatırımları yüksek risk içerir\n• Sadece kaybetmeyi göze alabileceğiniz parayı yatırın\n• Kendi araştırmanızı yapın (DYOR - Do Your Own Research)\n• Çeşitlendirme önemlidir\n• Uzun vadeli düşünün\n\n**Öneriler:**\n• Güvenilir borsalardan alım yapın\n• Soğuk cüzdan kullanın\n• Güncel haberleri takip edin\n• Teknik analiz öğrenin\n\nBelirli bir coin hakkında bilgi almak için coin adını yazabilirsiniz.',
        suggestions: ['Bitcoin nedir?', 'Ethereum nedir?', 'Yardım']
      };
    }

    // Teşekkür
    if (this.matchesPattern(message, ['teşekkür', 'thanks', 'thank you', 'sağol', 'sağ ol'])) {
      return {
        text: 'Rica ederim! 😊 Başka bir konuda yardımcı olabilir miyim?',
        suggestions: ['Yardım', 'BTC fiyatı', 'Bitcoin nedir?']
      };
    }

    // Veda
    if (this.matchesPattern(message, ['görüşürüz', 'bye', 'goodbye', 'hoşça kal', 'çıkış'])) {
      return {
        text: 'Görüşmek üzere! 👋 İyi günler dilerim.',
        suggestions: []
      };
    }

    // Bilinmeyen mesaj
    return {
      text: 'Anlamadım, lütfen sorunuzu farklı şekilde ifade edin. "Yardım" yazarak ne yapabileceğimi görebilirsiniz.',
      suggestions: ['Yardım', 'BTC fiyatı', 'Bitcoin nedir?']
    };
  }

  /**
   * Mesajdan coin sembolü çıkar
   * @param {string} message - Kullanıcı mesajı
   * @returns {string|null} Coin sembolü
   */
  extractSymbol(message) {
    // Yaygın coin isimleri ve sembolleri
    const coinMap = {
      'bitcoin': 'BTC',
      'btc': 'BTC',
      'ethereum': 'ETH',
      'eth': 'ETH',
      'binance coin': 'BNB',
      'bnb': 'BNB',
      'cardano': 'ADA',
      'ada': 'ADA',
      'solana': 'SOL',
      'sol': 'SOL',
      'dogecoin': 'DOGE',
      'doge': 'DOGE',
      'polygon': 'MATIC',
      'matic': 'MATIC',
      'polkadot': 'DOT',
      'dot': 'DOT',
      'ripple': 'XRP',
      'xrp': 'XRP',
      'litecoin': 'LTC',
      'ltc': 'LTC',
      'chainlink': 'LINK',
      'link': 'LINK',
      'avalanche': 'AVAX',
      'avax': 'AVAX',
      'uniswap': 'UNI',
      'uni': 'UNI'
    };

    // Mesajda coin ismi veya sembolü ara
    for (const [key, symbol] of Object.entries(coinMap)) {
      if (message.includes(key)) {
        return symbol;
      }
    }

    // Büyük harflerle yazılmış sembol ara (BTC, ETH, vb.)
    const symbolMatch = message.match(/\b([A-Z]{2,10})\b/);
    if (symbolMatch) {
      return symbolMatch[1].toUpperCase();
    }

    return null;
  }

  /**
   * Coin fiyat bilgisini al
   * @param {string} symbol - Coin sembolü
   * @returns {Promise<Object|null>} Fiyat bilgisi
   */
  async getPriceInfo(symbol) {
    try {
      // Önce veritabanından son fiyatı al
      const dbPrice = await databaseService.getLatestPrice(symbol.toUpperCase() + 'USDT');
      
      if (dbPrice && dbPrice.price) {
        // Veritabanından fiyat bilgisi alındı
        return {
          symbol: symbol.toUpperCase(),
          price: parseFloat(dbPrice.price),
          change24h: 0, // 24 saatlik değişim bilgisi şu an için mevcut değil
          lastUpdate: new Date(dbPrice.binancetime).toLocaleString('tr-TR')
        };
      }

      // Veritabanında yoksa Binance API'den al
      try {
        const priceData = await binanceService.getPriceBySymbol(symbol.toUpperCase() + 'USDT');
        if (priceData && priceData.price) {
          return {
            symbol: symbol.toUpperCase(),
            price: parseFloat(priceData.price),
            change24h: 0,
            lastUpdate: 'Şimdi'
          };
        }
      } catch (error) {
        logger.error(`Price fetch error for ${symbol}:`, error);
      }

      return null;
    } catch (error) {
      logger.error(`Get price info error for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Mesajın belirli pattern'lere uyup uymadığını kontrol et
   * @param {string} message - Kullanıcı mesajı
   * @param {Array<string>} patterns - Aranacak pattern'ler
   * @returns {boolean} Eşleşme var mı?
   */
  matchesPattern(message, patterns) {
    return patterns.some(pattern => message.includes(pattern));
  }

  /**
   * Kullanıcı konuşma geçmişini temizle
   * @param {string} userId - Kullanıcı ID
   */
  clearHistory(userId) {
    this.conversationHistory.delete(userId);
  }
}

module.exports = new ChatbotService();

