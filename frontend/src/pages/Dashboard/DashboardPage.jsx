import { useState, useEffect } from 'react'
import { useQuery } from 'react-query'
import { useNavigate } from 'react-router-dom'
import { cryptoAPI } from '../../services/api'
import LoadingSpinner from '../../components/Common/LoadingSpinner'
import { TrendingUp, TrendingDown, RefreshCw, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { LineChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const DashboardPage = () => {
  const navigate = useNavigate()
  const [priceHistoryMap, setPriceHistoryMap] = useState({})

  // Fetch latest prices from database (NOT from API - always from DB)
  const { data: pricesData, isLoading, refetch } = useQuery(
    'latestPrices',
    () => cryptoAPI.getLatestPricesFromDB(), // Sadece veritabanından çek
    {
      refetchInterval: false, // Otomatik yenileme kapalı
      staleTime: 0, // Her zaman fresh data iste
    }
  )

  // Her kripto para için fiyat geçmişini çek
  const prices = pricesData?.data?.data || []

  useEffect(() => {
    if (prices.length > 0) {
      // Her kripto para için son 20 kaydı çek (küçük grafik için)
      const fetchHistories = async () => {
        const histories = {}
        for (const crypto of prices) {
          try {
            const response = await cryptoAPI.getPriceHistory(crypto.name, 20)
            histories[crypto.name] = response.data.data
              .map((item) => ({
                time: new Date(item.binancetime).toLocaleTimeString('tr-TR', {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
                price: parseFloat(item.price),
              }))
              .reverse()
          } catch (error) {
            console.error(`Error fetching history for ${crypto.name}:`, error)
          }
        }
        setPriceHistoryMap(histories)
      }
      fetchHistories()
    }
  }, [prices])

  // Fetch and save prices from Binance API, then reload from database
  const handleFetchPrices = async () => {
    try {
      toast.loading('Binance API\'den fiyatlar çekiliyor...', { id: 'fetch-prices' })
      
      // 1. Binance API'den fiyatları çek ve veritabanına kaydet
      const response = await cryptoAPI.fetchAndSavePrices()
      
      toast.loading('Veritabanından güncel veriler yükleniyor...', { id: 'fetch-prices' })
      
      // 2. Veritabanından en güncel fiyatları çek
      const updatedPricesResponse = await cryptoAPI.getLatestPricesFromDB()
      const updatedPrices = updatedPricesResponse.data.data || []
      
      // 3. Her kripto para için fiyat geçmişini veritabanından çek (grafikler için)
      const histories = {}
      for (const crypto of updatedPrices) {
        try {
          const historyResponse = await cryptoAPI.getPriceHistory(crypto.name, 20)
          histories[crypto.name] = historyResponse.data.data
            .map((item) => ({
              time: new Date(item.binancetime).toLocaleTimeString('tr-TR', {
                hour: '2-digit',
                minute: '2-digit',
              }),
              price: parseFloat(item.price),
            }))
            .reverse()
        } catch (error) {
          console.error(`Error fetching history for ${crypto.name}:`, error)
        }
      }
      
      // 4. Grafik verilerini güncelle
      setPriceHistoryMap(histories)
      
      // 5. React Query cache'ini güncelle
      refetch()
      
      toast.success(
        `${updatedPrices.length} kripto para fiyatı başarıyla güncellendi!`, 
        { id: 'fetch-prices', duration: 3000 }
      )
    } catch (error) {
      // Sadece kritik hatalar için mesaj göster (API hatası olsa bile veritabanından veri çekilebilir)
      // Eğer response varsa ve status 200 ise, hata yok demektir (veritabanından veri geldi)
      if (error.response?.status !== 200) {
        // Sadece gerçek hatalar için mesaj göster
        const errorMsg = error.response?.data?.message || error.message || 'Bir hata oluştu'
        
        // 429 hatası için özel mesaj gösterme - sessizce geç, veritabanından veri göster
        if (error.response?.status === 429 || error.message?.includes('rate limit')) {
          // Sessizce geç, veritabanından mevcut verileri göster
          toast.loading('Veritabanındaki mevcut veriler yükleniyor...', { id: 'fetch-prices' })
          
          // Veritabanından mevcut verileri çek
          try {
            const dbResponse = await cryptoAPI.getLatestPricesFromDB()
            const dbPrices = dbResponse.data.data || []
            
            if (dbPrices.length > 0) {
              // Grafik verilerini de yükle
              const histories = {}
              for (const crypto of dbPrices) {
                try {
                  const historyResponse = await cryptoAPI.getPriceHistory(crypto.name, 20)
                  histories[crypto.name] = historyResponse.data.data
                    .map((item) => ({
                      time: new Date(item.binancetime).toLocaleTimeString('tr-TR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      }),
                      price: parseFloat(item.price),
                    }))
                    .reverse()
                } catch (err) {
                  console.error(`Error fetching history for ${crypto.name}:`, err)
                }
              }
              
              setPriceHistoryMap(histories)
              refetch()
              
              toast.success(
                `${dbPrices.length} kripto para fiyatı veritabanından yüklendi`, 
                { id: 'fetch-prices', duration: 3000 }
              )
              return // Başarılı, hata gösterme
            }
          } catch (dbError) {
            console.error('Database fetch error:', dbError)
          }
        }
        
        // Diğer hatalar için mesaj göster
        toast.error(errorMsg, { 
          id: 'fetch-prices',
          duration: 4000
        })
      }
      console.error('Fetch prices error:', error)
    }
  }

  // Format price
  const formatPrice = (price) => {
    if (!price) return 'N/A'
    return new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    }).format(price)
  }

  // Get crypto name without USDT
  const getCryptoName = (symbol) => {
    return symbol?.replace('USDT', '') || symbol
  }

  // Get crypto icon/emoji
  const getCryptoIcon = (symbol) => {
    const icons = {
      BTC: '₿',
      ETH: 'Ξ',
      BNB: 'BNB',
      ADA: '₳',
      XRP: '✕',
      DOGE: 'Ð',
      DOT: '●',
      LINK: '🔗',
      LTC: 'Ł',
      BCH: '₿',
    }
    const name = getCryptoName(symbol)
    return icons[name] || '₿'
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 animate-fade-in">
        <div className="relative">
          <div className="absolute inset-0 bg-primary-200 rounded-full blur-2xl opacity-50 animate-pulse-slow"></div>
          <LoadingSpinner size="xl" />
        </div>
        <p className="mt-6 text-gray-600 font-medium animate-pulse">Veriler yükleniyor...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header with gradient background */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-500 to-purple-600 rounded-2xl shadow-2xl p-8 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIxLjUiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20"></div>
        <div className="relative z-10 flex items-center justify-between">
          <div className="animate-slide-up">
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
              <span className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                💎
              </span>
              Kripto Para Fiyatları
            </h1>
            <p className="text-primary-100 text-lg">
              {prices.length > 0 ? (
                <>
                  <span className="font-semibold text-white">{prices.length}</span> kripto para birimi canlı takip ediliyor
                </>
              ) : (
                'Kripto para fiyatlarını takip etmeye başlayın'
              )}
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handleFetchPrices}
              className="group flex items-center space-x-2 px-6 py-3 bg-white text-primary-600 rounded-xl hover:bg-primary-50 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 font-semibold"
            >
              <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
              <span>Fiyatları Güncelle</span>
            </button>
          </div>
        </div>
      </div>

      {/* Crypto Cards Grid */}
      {prices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-gradient-to-br from-white via-primary-50 to-purple-50 rounded-2xl shadow-xl border-2 border-primary-100 animate-fade-in">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-primary-200 rounded-full blur-2xl opacity-50 animate-pulse-slow"></div>
            <div className="relative text-8xl animate-bounce-slow">📊</div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            Henüz veri yok
          </h3>
          <p className="text-gray-600 mb-6 text-center max-w-md">
            Kripto para fiyatlarını görmek için fiyatları güncelleyin
          </p>
          <button
            onClick={handleFetchPrices}
            className="group px-8 py-4 bg-gradient-to-r from-primary-600 to-purple-600 text-white rounded-xl hover:from-primary-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 font-semibold text-lg flex items-center space-x-2"
          >
            <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
            <span>Fiyatları Çek</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {prices.map((crypto, index) => {
            const history = priceHistoryMap[crypto.name] || []
            const priceChange = history.length >= 2 
              ? ((history[history.length - 1]?.price || 0) - (history[0]?.price || 0)) / (history[0]?.price || 1) * 100
              : 0
            const isPositive = priceChange >= 0

            // Her kart için farklı gradient renkleri
            const cardColors = [
              { bg: 'from-blue-500 to-cyan-500', border: 'border-blue-300', icon: 'bg-blue-100' },
              { bg: 'from-purple-500 to-pink-500', border: 'border-purple-300', icon: 'bg-purple-100' },
              { bg: 'from-green-500 to-emerald-500', border: 'border-green-300', icon: 'bg-green-100' },
              { bg: 'from-orange-500 to-red-500', border: 'border-orange-300', icon: 'bg-orange-100' },
              { bg: 'from-indigo-500 to-blue-500', border: 'border-indigo-300', icon: 'bg-indigo-100' },
              { bg: 'from-pink-500 to-rose-500', border: 'border-pink-300', icon: 'bg-pink-100' },
            ]
            const colorIndex = index % cardColors.length
            const cardColor = cardColors[colorIndex]

            return (
              <div
                key={crypto.name}
                className="relative group cursor-pointer animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
                onClick={() => navigate(`/crypto/${crypto.name}`)}
              >
                {/* Card Container with gradient */}
                <div className={`relative bg-white border-2 ${cardColor.border} rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-105 overflow-hidden`}>
                  {/* Animated gradient background */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${cardColor.bg} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}></div>
                  
                  {/* Shimmer effect on hover */}
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                  
                  {/* Content */}
                  <div className="relative z-10">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center space-x-3">
                        <div className={`relative ${cardColor.icon} rounded-xl p-3 shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}>
                          <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent rounded-xl"></div>
                          <span className="relative text-3xl">{getCryptoIcon(crypto.name)}</span>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
                            {getCryptoName(crypto.name)}
                          </h3>
                          <p className="text-sm text-gray-500 font-medium">{crypto.name}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        <div className={`flex items-center space-x-1 px-2 py-1 rounded-full ${isPositive ? 'bg-green-100' : 'bg-red-100'}`}>
                          <div className={`w-2 h-2 ${isPositive ? 'bg-green-500' : 'bg-red-500'} rounded-full animate-pulse`}></div>
                          <span className={`text-xs font-semibold ${isPositive ? 'text-green-700' : 'text-red-700'}`}>
                            {isPositive ? '↑' : '↓'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="mb-5">
                      <p className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">
                        ${formatPrice(crypto.price)}
                      </p>
                      {history.length >= 2 && (
                        <div className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg ${isPositive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'} font-semibold text-sm`}>
                          {isPositive ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          )}
                          <span>
                            {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
                          </span>
                        </div>
                      )}
                      <p className="text-xs text-gray-400 mt-2 font-medium">
                        {new Date(crypto.binancetime).toLocaleString('tr-TR')}
                      </p>
                    </div>

                    {/* Mini Chart */}
                    {history.length > 0 ? (
                      <div className="mb-5 h-28 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-3 border border-gray-200 shadow-inner">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={history}>
                            <defs>
                              <linearGradient id={`gradient-${crypto.name}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity={0.4}/>
                                <stop offset="95%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <Area
                              type="monotone"
                              dataKey="price"
                              stroke="none"
                              fill={`url(#gradient-${crypto.name})`}
                              isAnimationActive={true}
                              animationDuration={1000}
                            />
                            <Line
                              type="monotone"
                              dataKey="price"
                              stroke={isPositive ? '#10b981' : '#ef4444'}
                              strokeWidth={3}
                              dot={false}
                              isAnimationActive={true}
                              animationDuration={1000}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'rgba(255, 255, 255, 0.98)',
                                border: `2px solid ${isPositive ? '#10b981' : '#ef4444'}`,
                                borderRadius: '8px',
                                padding: '8px 12px',
                                fontSize: '12px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                fontWeight: '600',
                              }}
                              formatter={(value) => [`$${formatPrice(value)}`, 'Fiyat']}
                              labelStyle={{ color: isPositive ? '#10b981' : '#ef4444', fontWeight: 'bold' }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="mb-5 h-28 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl flex items-center justify-center border border-gray-200">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto mb-2"></div>
                          <p className="text-xs text-gray-400 font-medium">Grafik yükleniyor...</p>
                        </div>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200 group-hover:border-primary-200 transition-colors">
                      <span className="text-sm font-semibold text-gray-600 group-hover:text-primary-600 transition-colors">
                        Detayları Gör
                      </span>
                      <div className={`w-9 h-9 ${cardColor.icon} rounded-full flex items-center justify-center shadow-md group-hover:scale-110 group-hover:bg-primary-600 transition-all duration-300`}>
                        <ArrowRight className={`w-5 h-5 text-primary-600 group-hover:text-white group-hover:translate-x-1 transition-all duration-300`} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default DashboardPage

