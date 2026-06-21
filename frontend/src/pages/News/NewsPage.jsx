import { useState } from 'react'
import { useQuery } from 'react-query'
import { cryptoAPI } from '../../services/api'
import LoadingSpinner from '../../components/Common/LoadingSpinner'
import { Newspaper, ExternalLink, Calendar, Search, AlertCircle } from 'lucide-react'

const getFallbackGradient = (title) => {
  const gradients = [
    'from-indigo-500 to-purple-600 dark:from-indigo-600 dark:to-purple-800',
    'from-blue-500 to-cyan-600 dark:from-blue-600 dark:to-cyan-800',
    'from-emerald-500 to-teal-600 dark:from-emerald-600 dark:to-teal-800',
    'from-orange-500 to-amber-600 dark:from-orange-600 dark:to-amber-800',
    'from-pink-500 to-rose-600 dark:from-pink-600 dark:to-rose-800',
  ]
  const charCodeSum = (title || '').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return gradients[charCodeSum % gradients.length]
}

const getThematicPlaceholder = (title) => {
  const t = (title || '').toLowerCase()
  if (t.includes('bitcoin') || t.includes('btc')) {
    return 'https://images.unsplash.com/photo-1516245834210-c4c142787335?auto=format&fit=crop&q=80&w=300'
  }
  if (t.includes('ethereum') || t.includes('eth')) {
    return 'https://images.unsplash.com/photo-1622790694515-617f9b8aa751?auto=format&fit=crop&q=80&w=300'
  }
  if (t.includes('solana') || t.includes('sol')) {
    return 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&q=80&w=300'
  }
  if (t.includes('doge') || t.includes('shib') || t.includes('meme')) {
    return 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?auto=format&fit=crop&q=80&w=300'
  }
  if (t.includes('cardano') || t.includes('ada')) {
    return 'https://images.unsplash.com/photo-1639762681057-408e52192e55?auto=format&fit=crop&q=80&w=300'
  }
  if (t.includes('ripple') || t.includes('xrp')) {
    return 'https://images.unsplash.com/photo-1622630998477-20aa696ecb05?auto=format&fit=crop&q=80&w=300'
  }
  if (t.includes('market') || t.includes('price') || t.includes('bull') || t.includes('bear') || t.includes('trillion') || t.includes('billion') || t.includes('chart') || t.includes('growth')) {
    return 'https://images.unsplash.com/photo-1642790106117-e829e14a795f?auto=format&fit=crop&q=80&w=300'
  }
  if (t.includes('ai ') || t.includes('artificial intelligence') || t.includes('quantum') || t.includes('tech') || t.includes('sec') || t.includes('regulation') || t.includes('security')) {
    return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=300'
  }
  // Default general cryptocurrency artwork
  return 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?auto=format&fit=crop&q=80&w=300'
}

const NewsImage = ({ imageUrl, title, source }) => {
  const [imageState, setImageState] = useState('primary') // 'primary', 'thematic', 'gradient'
  
  const thematicUrl = getThematicPlaceholder(title)

  if (imageState === 'gradient') {
    return (
      <div className={`w-full md:w-40 h-40 rounded-lg bg-gradient-to-br ${getFallbackGradient(title)} flex flex-col items-center justify-center text-white p-4 shadow-inner relative overflow-hidden group flex-shrink-0`}>
        <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-white/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500" />
        <div className="absolute -left-6 -top-6 w-16 h-16 bg-white/10 rounded-full blur-lg group-hover:scale-125 transition-transform duration-500" />
        
        <div className="z-10 bg-white/15 backdrop-blur-md p-3 rounded-full border border-white/25 shadow-lg">
          <Newspaper size={32} className="text-white drop-shadow-md" />
        </div>
        <span className="z-10 text-[10px] uppercase font-bold tracking-widest text-white/80 mt-3 text-center">
          {source || 'KRİPTO'}
        </span>
      </div>
    )
  }

  const currentSrc = (imageState === 'primary' && imageUrl) ? imageUrl : thematicUrl

  return (
    <div className="w-full md:w-40 h-40 flex-shrink-0 relative overflow-hidden rounded-lg shadow-md group">
      <img
        src={currentSrc}
        alt={title || 'Haber görseli'}
        className="w-full h-full object-cover rounded-lg transform group-hover:scale-105 transition-transform duration-500"
        onError={() => {
          if (imageState === 'primary' && imageUrl) {
            setImageState('thematic')
          } else {
            setImageState('gradient')
          }
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
  )
}

const NewsPage = () => {
  const [searchCoin, setSearchCoin] = useState('')
  const [limit, setLimit] = useState(30)

  const { data: newsResponse, isLoading, isError, error, refetch } = useQuery(
    ['news', searchCoin, limit],
    async () => {
      try {
        const response = searchCoin 
          ? await cryptoAPI.getNewsByCoin(searchCoin, limit)
          : await cryptoAPI.getAllNews(limit)
        return response.data
      } catch (error) {
        console.error('News fetch error:', error)
        // Hata durumunda boş array döndür (uygulama çökmesin)
        return { status: 'success', data: [], count: 0 }
      }
    },
    { 
      refetchOnWindowFocus: false, 
      staleTime: 10 * 60 * 1000, // 10 minutes cache
      retry: 1,
      onError: (error) => {
        console.error('News query error:', error)
        // Toast gösterme - sessizce geç, boş liste göster
      }
    }
  )

  // Güvenli data extraction
  const news = newsResponse?.data || []
  const newsCount = newsResponse?.count || 0

  const formatDate = (dateString) => {
    if (!dateString) return 'Tarih bilgisi yok'
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return 'Geçersiz tarih'
      return date.toLocaleString('tr-TR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (error) {
      console.error('Date formatting error:', error)
      return 'Tarih formatlanamadı'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Kripto Para & Borsa Haberleri</h1>
          <p className="text-gray-600 dark:text-gray-400">En güncel kripto para ve borsa piyasası haberleri</p>
          {newsCount > 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
              {newsCount} haber gösteriliyor
            </p>
          )}
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Coin sembolü ile ara (örn: BTC, ETH)..."
              value={searchCoin}
              onChange={(e) => setSearchCoin(e.target.value.toUpperCase())}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Error State */}
        {isError && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
              <AlertCircle size={20} />
              <p className="font-medium">Haberler yüklenirken bir sorun oluştu. Lütfen daha sonra tekrar deneyin.</p>
            </div>
          </div>
        )}

        {/* News List */}
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <div className="space-y-4">
            {!news || news.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
                <Newspaper className="mx-auto text-gray-400 dark:text-gray-500 mb-4" size={48} />
                <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">
                  {searchCoin ? `${searchCoin} için haber bulunamadı` : 'Henüz haber bulunmuyor'}
                </p>
                <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
                  Lütfen daha sonra tekrar deneyin veya farklı bir coin arayın.
                </p>
              </div>
            ) : (
              news.map((item) => {
                // Güvenli data extraction
                if (!item || !item.title) return null
                
                return (
                  <div
                    key={item.id || `news-${Date.now()}-${Math.random()}`}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 p-6 border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex flex-col md:flex-row gap-6 items-start">
                      <NewsImage imageUrl={item.imageUrl} title={item.title} source={item.source} />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 line-clamp-2">
                          {item.title}
                        </h3>
                        {(item.body || item.description) && (
                          <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-3 text-sm leading-relaxed">
                            {item.body || item.description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-3 text-sm">
                          <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                            <Calendar size={16} />
                            <span>{formatDate(item.publishedAt)}</span>
                          </div>
                          {item.source && (
                            <span className="px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-xs font-medium">
                              {item.source}
                            </span>
                          )}
                          {item.url && (
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
                            >
                              <ExternalLink size={16} />
                              Devamını Oku
                            </a>
                          )}
                        </div>
                        {item.tags && Array.isArray(item.tags) && item.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                            {item.tags.slice(0, 5).map((tag, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 rounded-md text-xs font-medium"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              }).filter(Boolean) // null değerleri filtrele
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default NewsPage

