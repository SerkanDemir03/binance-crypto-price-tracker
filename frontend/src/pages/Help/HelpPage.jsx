import { HelpCircle, BookOpen, MessageCircle, TrendingUp, Database, FileText, Calculator, Newspaper, Bot, BarChart3, Settings, Shield, Info, Sparkles } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'

const HelpPage = () => {
  const { theme } = useTheme()

  const sections = [
    {
      id: 'overview',
      title: 'Uygulama Hakkında',
      icon: <Info className="w-6 h-6" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            <strong>Serkan Crypto Tracker</strong>, kripto para fiyatlarını gerçek zamanlı olarak takip etmenizi sağlayan modern bir web uygulamasıdır. 
            Binance ve CoinGecko API'lerini kullanarak güncel fiyat bilgilerini sunar.
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              ⚠️ <strong>Önemli:</strong> Bu uygulama yatırım tavsiyesi niteliğinde değildir; bu sayede kullanıcı sorumluluğu konusunda şeffaflık sağlandı.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'features',
      title: 'Özellikler',
      icon: <Sparkles className="w-6 h-6" />,
      content: (
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h4 className="font-semibold">Gerçek Zamanlı Fiyat Takibi</h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Binance ve CoinGecko API'lerinden güncel fiyat bilgilerini alın
              </p>
            </div>
            <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-5 h-5 text-green-600 dark:text-green-400" />
                <h4 className="font-semibold">İnteraktif Grafikler</h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Fiyat geçmişini görselleştirin ve analiz edin
              </p>
            </div>
            <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Database className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h4 className="font-semibold">Veritabanı Yönetimi</h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Fiyat verilerini PostgreSQL veritabanında saklayın
              </p>
            </div>
            <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Bot className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                <h4 className="font-semibold">AI Chatbot</h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Kripto para hakkında sorularınızı yanıtlayan yapay zeka asistanı
              </p>
            </div>
            <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                <h4 className="font-semibold">Notlar</h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Kripto paralar hakkında kişisel notlar oluşturun
              </p>
            </div>
            <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="w-5 h-5 text-red-600 dark:text-red-400" />
                <h4 className="font-semibold">Hesap Makinesi</h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Kar/zarar, ROI ve dönüşüm hesaplamaları yapın
              </p>
            </div>
            <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Newspaper className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                <h4 className="font-semibold">Haberler</h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Kripto para dünyasından son haberleri takip edin
              </p>
            </div>
            <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h4 className="font-semibold">Güvenlik</h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Rate limiting ve güvenlik önlemleri ile korumalı API
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'getting-started',
      title: 'Başlangıç Rehberi',
      icon: <BookOpen className="w-6 h-6" />,
      content: (
        <div className="space-y-6">
          <div>
            <h4 className="font-semibold text-lg mb-3">1. Dashboard'u Kullanma</h4>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
              <li>Ana sayfada tüm kripto paraların kartlarını görebilirsiniz</li>
              <li>Arama kutusunu kullanarak belirli bir coin arayabilirsiniz</li>
              <li>Coin kartına tıklayarak detaylı bilgilere ulaşabilirsiniz</li>
              <li>Filtreleme seçenekleri ile coinleri sıralayabilirsiniz</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-lg mb-3">2. Coin Detay Sayfası</h4>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
              <li>Coin'in fiyat grafiğini görüntüleyin</li>
              <li>24 saatlik istatistikleri inceleyin</li>
              <li>Fiyat geçmişini analiz edin</li>
              <li>Notlar ekleyin ve yönetin</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-lg mb-3">3. Veritabanı Yönetimi</h4>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
              <li>Veritabanı durumunu kontrol edin</li>
              <li>Yeni coin'ler ekleyin (CoinGecko API ile)</li>
              <li>Mevcut coin'leri silin</li>
              <li>Manuel olarak fiyat güncellemesi yapın</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-lg mb-3">4. AI Chatbot Kullanımı</h4>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
              <li>Sağ alt köşedeki chatbot butonuna tıklayın</li>
              <li>Kripto para hakkında sorular sorun</li>
              <li>Fiyat sorgulama yapın (örn: "BTC fiyatı nedir?")</li>
              <li>Öneri butonlarını kullanarak hızlı sorular sorun</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'faq',
      title: 'Sık Sorulan Sorular (SSS)',
      icon: <HelpCircle className="w-6 h-6" />,
      content: (
        <div className="space-y-6">
          <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
            <h4 className="font-semibold mb-2">Fiyatlar ne sıklıkla güncelleniyor?</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Fiyatlar manuel olarak güncellenmektedir. Veritabanı Yönetimi sayfasından "Fiyatları Güncelle" butonunu kullanarak güncel fiyatları çekebilirsiniz.
            </p>
          </div>
          <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
            <h4 className="font-semibold mb-2">Hangi coin'leri takip edebilirim?</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Binance'de işlem gören tüm coin'leri ve CoinGecko API'sinde bulunan binlerce coin'i takip edebilirsiniz. Veritabanı Yönetimi sayfasından yeni coin'ler ekleyebilirsiniz.
            </p>
          </div>
          <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
            <h4 className="font-semibold mb-2">Chatbot nasıl çalışıyor?</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Chatbot, kripto para hakkında sorularınızı yanıtlayan bir yapay zeka asistanıdır. Fiyat sorgulama, coin bilgileri ve genel kripto para bilgileri hakkında yardımcı olabilir.
            </p>
          </div>
          <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
            <h4 className="font-semibold mb-2">Notlarım nerede saklanıyor?</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Notlarınız veritabanında saklanmaktadır. Her not bir coin ile ilişkilendirilebilir ve daha sonra düzenlenebilir veya silinebilir.
            </p>
          </div>
          <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
            <h4 className="font-semibold mb-2">Hesap makinesi hangi hesaplamaları yapabilir?</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Hesap makinesi ile kar/zarar hesaplama, ROI (Yatırım Getirisi) hesaplama ve para birimi dönüşümü yapabilirsiniz.
            </p>
          </div>
          <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
            <h4 className="font-semibold mb-2">Uygulama ücretsiz mi?</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Evet, uygulama tamamen ücretsizdir. Ancak API rate limit'leri nedeniyle bazı işlemlerde kısıtlamalar olabilir.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'tips',
      title: 'İpuçları ve Püf Noktaları',
      icon: <Settings className="w-6 h-6" />,
      content: (
        <div className="space-y-4">
          <div className={`p-4 rounded-lg border-l-4 ${theme === 'dark' ? 'bg-gray-800 border-blue-500' : 'bg-blue-50 border-blue-500'}`}>
            <h4 className="font-semibold mb-2">💡 Performans İpuçları</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
              <li>Fiyat güncellemelerini gerektiğinde yapın (rate limit koruması için)</li>
              <li>Grafiklerde tarih aralığı seçerek daha hızlı yükleme sağlayın</li>
              <li>Notlarınızı düzenli olarak temizleyin</li>
            </ul>
          </div>
          <div className={`p-4 rounded-lg border-l-4 ${theme === 'dark' ? 'bg-gray-800 border-green-500' : 'bg-green-50 border-green-500'}`}>
            <h4 className="font-semibold mb-2">✅ En İyi Uygulamalar</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
              <li>Önemli coin'leri favorilerinize ekleyin</li>
              <li>Düzenli olarak fiyat geçmişini kontrol edin</li>
              <li>Chatbot'u kullanarak hızlı bilgi alın</li>
              <li>Notlar özelliğini kullanarak analizlerinizi kaydedin</li>
            </ul>
          </div>
          <div className={`p-4 rounded-lg border-l-4 ${theme === 'dark' ? 'bg-gray-800 border-yellow-500' : 'bg-yellow-50 border-yellow-500'}`}>
            <h4 className="font-semibold mb-2">⚠️ Dikkat Edilmesi Gerekenler</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
              <li>Bu uygulama yatırım tavsiyesi değildir</li>
              <li>Yatırım kararlarınızı kendi araştırmanıza dayandırın</li>
              <li>API rate limit'lerine dikkat edin</li>
              <li>Verilerin doğruluğunu kontrol edin</li>
            </ul>
          </div>
        </div>
      )
    }
  ]

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className={`p-3 rounded-full ${theme === 'dark' ? 'bg-blue-600/20' : 'bg-blue-100'}`}>
              <HelpCircle className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              Yardım ve Rehber
            </h1>
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Uygulamayı kullanmak için ihtiyacınız olan tüm bilgiler burada
          </p>
        </div>

        {/* Navigation */}
        <div className="mb-8">
          <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">Hızlı Navigasyon</h3>
            <div className="flex flex-wrap gap-2">
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className={`px-3 py-1 rounded-md text-sm transition-colors ${
                    theme === 'dark'
                      ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                      : 'bg-white text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {section.title}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-8">
          {sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className={`p-6 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm'}`}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  {section.icon}
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {section.title}
                </h2>
              </div>
              <div className="text-gray-700 dark:text-gray-300">
                {section.content}
              </div>
            </section>
          ))}
        </div>

        {/* Contact Section */}
        <div className={`mt-12 p-6 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center gap-3 mb-4">
            <MessageCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Yardıma mı İhtiyacınız Var?
            </h2>
          </div>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Sorularınız için chatbot'u kullanabilir veya aşağıdaki bilgileri inceleyebilirsiniz:
          </p>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <p>• Sağ alt köşedeki chatbot butonuna tıklayarak sorularınızı sorabilirsiniz</p>
            <p>• Uygulama hakkında daha fazla bilgi için yukarıdaki bölümleri inceleyin</p>
            <p>• Teknik sorunlar için tarayıcı konsolunu kontrol edin</p>
          </div>
        </div>

        {/* Footer Warning */}
        <div className={`mt-8 p-6 rounded-lg border-2 ${theme === 'dark' ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-start gap-3">
            <Shield className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-red-800 dark:text-red-300 mb-2">
                Yasal Uyarı
              </h3>
              <p className="text-sm text-red-700 dark:text-red-400">
                Bu uygulama yatırım tavsiyesi niteliğinde değildir; bu sayede kullanıcı sorumluluğu konusunda şeffaflık sağlandı. 
                Kripto para yatırımları yüksek risk içerir. Yatırım kararlarınızı kendi araştırmanıza dayandırın ve sadece kaybetmeyi göze alabileceğiniz parayı yatırın.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HelpPage

