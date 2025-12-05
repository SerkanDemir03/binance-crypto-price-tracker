import { useParams } from 'react-router-dom'
import { useQuery } from 'react-query'
import { cryptoAPI } from '../../services/api'
import LoadingSpinner from '../../components/Common/LoadingSpinner'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { ArrowLeft, TrendingUp, TrendingDown, RefreshCw, Calendar, Edit2, Save, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useState, useMemo, useCallback } from 'react'
import toast from 'react-hot-toast'

const CryptoDetailPage = () => {
  const { symbol } = useParams()
  const navigate = useNavigate()
  const [limit, setLimit] = useState(100)
  const [timeRange, setTimeRange] = useState('limit') // 'limit', '1h', '24h', '7d', '30d', '90d'
  
  // Metadata editing state
  const [isEditingMetadata, setIsEditingMetadata] = useState(false)
  const [metadataForm, setMetadataForm] = useState({
    name: '',
    description: '',
    logoUrl: '',
    homepage: '',
    whitepaper: '',
    categories: ''
  })

  // Get latest price
  const { data: latestPriceData, isLoading: isLoadingPrice, isError: isPriceError, error: priceError } = useQuery(
    ['latestPrice', symbol],
    () => cryptoAPI.getLatestPriceFromDB(symbol),
    {
      enabled: !!symbol,
      retry: 2,
      retryDelay: 1000,
      staleTime: 30000, // 30 saniye cache kullan
      cacheTime: 300000, // 5 dakika cache'te tut
      keepPreviousData: true, // Önceki verileri göster
    }
  )

  // Get 24h stats
  const { data: statsData, isLoading: isLoadingStats } = useQuery(
    ['24hStats', symbol],
    () => cryptoAPI.get24hStats(symbol),
    {
      enabled: !!symbol,
    }
  )

  // Get coin metadata
  const { data: metadataData, isLoading: isLoadingMetadata, refetch: refetchMetadata } = useQuery(
    ['coinMetadata', symbol],
    () => cryptoAPI.getCoinMetadata(symbol.replace('USDT', '')),
    {
      enabled: !!symbol,
      retry: 1,
      staleTime: 300000, // 5 dakika cache kullan
      cacheTime: 600000, // 10 dakika cache'te tut
      onSuccess: (data) => {
        // Metadata yüklendiğinde form'u doldur
        if (data?.data?.data) {
          const meta = data.data.data
          setMetadataForm({
            name: meta.name || '',
            description: meta.description || '',
            logoUrl: meta.logoUrl || '',
            homepage: meta.homepage || '',
            whitepaper: meta.whitepaper || '',
            categories: Array.isArray(meta.categories) ? meta.categories.join(', ') : (meta.categories || '')
          })
        }
      }
    }
  )

  // Get price history with time range filter
  const { data: historyData, isLoading: isLoadingHistory, isError: isHistoryError, error: historyError, refetch: refetchHistory } = useQuery(
    ['priceHistory', symbol, limit, timeRange],
    async () => {
      try {
        if (timeRange === 'limit') {
          // Limit modu - son N kayıt
          return await cryptoAPI.getPriceHistory(symbol, limit)
        } else {
          // Zaman aralığı modu - son X saat/gün
          const now = new Date()
          let startDate = new Date()
          
          switch (timeRange) {
            case '1h':
              startDate = new Date(now.getTime() - 60 * 60 * 1000) // Son 1 saat
              break
            case '24h':
              startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000) // Son 24 saat
              break
            case '7d':
              startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) // Son 7 gün
              break
            case '30d':
              startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) // Son 30 gün
              break
            case '90d':
              startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) // Son 90 gün
              break
            default:
              startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000) // Varsayılan: Son 24 saat
          }
          
          const startISO = startDate.toISOString()
          const endISO = now.toISOString()
          
          return await cryptoAPI.getPriceHistory(symbol, 10000, startISO, endISO)
        }
      } catch (error) {
        console.error('Error in price history query:', error)
        throw error
      }
    },
    {
      enabled: !!symbol,
      retry: 1,
      retryDelay: 1000,
      staleTime: 30000, // 30 saniye cache kullan
      cacheTime: 300000, // 5 dakika cache'te tut
      keepPreviousData: true, // Önceki verileri göster
      onError: (error) => {
        console.error('Price history fetch error:', error)
        toast.error('Veri yüklenirken hata oluştu. Lütfen tekrar deneyin.')
      }
    }
  )

  // Format price
  const formatPrice = (price) => {
    if (!price) return 'N/A'
    return new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    }).format(price)
  }

  // Format date - useCallback ile sarmala
  const formatDate = useCallback((dateString) => {
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        return dateString // Geçersiz tarih ise orijinal string'i döndür
      }
      return date.toLocaleString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch (error) {
      console.error('Error formatting date:', error)
      return dateString
    }
  }, [])

  // Get crypto name without USDT
  const getCryptoName = (symbol) => {
    return symbol?.replace('USDT', '') || symbol
  }

  // Prepare chart data - hata durumunda boş array döndür
  const chartData = useMemo(() => {
    try {
      if (!historyData?.data?.data || !Array.isArray(historyData.data.data) || historyData.data.data.length === 0) {
        return []
      }

      return historyData.data.data
        .map((item) => {
          try {
            const date = new Date(item.binancetime)
            if (isNaN(date.getTime())) {
              console.warn('Invalid date:', item.binancetime)
              return null
            }
            
            const price = parseFloat(item.price)
            if (isNaN(price)) {
              console.warn('Invalid price:', item.price)
              return null
            }

            return {
              time: formatDate(item.binancetime),
              price: price,
              date: date.toLocaleTimeString('tr-TR', {
                hour: '2-digit',
                minute: '2-digit',
              }),
              fullDate: date.toLocaleString('tr-TR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              }),
            }
          } catch (itemError) {
            console.error('Error processing chart item:', itemError, item)
            return null
          }
        })
        .filter(item => item !== null) // null değerleri filtrele
        .reverse()
    } catch (error) {
      console.error('Error preparing chart data:', error)
      return []
    }
  }, [historyData, formatDate])

  const latestPrice = latestPriceData?.data?.data
  const stats = statsData?.data?.data
  const metadata = metadataData?.data?.data


  // Handle metadata save
  const handleSaveMetadata = async () => {
    try {
      const cleanSymbol = symbol.replace('USDT', '')
      
      // Parse categories
      const categories = metadataForm.categories
        ? metadataForm.categories.split(',').map(c => c.trim()).filter(c => c.length > 0)
        : []

      await cryptoAPI.updateCoinMetadata(cleanSymbol, {
        name: metadataForm.name,
        description: metadataForm.description,
        logoUrl: metadataForm.logoUrl,
        homepage: metadataForm.homepage,
        whitepaper: metadataForm.whitepaper,
        categories: categories
      })

      toast.success('Coin bilgileri başarıyla kaydedildi!')
      setIsEditingMetadata(false)
      refetchMetadata()
    } catch (error) {
      toast.error('Bilgiler kaydedilirken hata oluştu: ' + (error.response?.data?.message || error.message))
    }
  }

  // Handle edit cancel
  const handleCancelEdit = () => {
    // Reset form to original metadata
    if (metadata) {
      setMetadataForm({
        name: metadata.name || '',
        description: metadata.description || '',
        logoUrl: metadata.logoUrl || '',
        homepage: metadata.homepage || '',
        whitepaper: metadata.whitepaper || '',
        categories: Array.isArray(metadata.categories) ? metadata.categories.join(', ') : (metadata.categories || '')
      })
    }
    setIsEditingMetadata(false)
  }

  // İlk yüklemede sadece loading göster (cache'de veri varsa göster)
  if ((isLoadingPrice || isLoadingHistory) && !latestPriceData && !historyData) {
    return (
      <div className="flex flex-col items-center justify-center h-96 animate-fade-in">
        <div className="relative">
          <div className="absolute inset-0 bg-primary-200 dark:bg-primary-800 rounded-full blur-2xl opacity-50 animate-pulse-slow"></div>
          <LoadingSpinner size="xl" />
        </div>
        <p className="mt-6 text-gray-600 dark:text-gray-300 font-medium animate-pulse">Veriler yükleniyor...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {getCryptoName(symbol)}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">{symbol}</p>
        </div>
      </div>

      {/* Current Price Card */}
      {latestPrice && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md dark:shadow-gray-900/50 p-6 border-2 border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Güncel Fiyat</p>
              <p className="text-4xl font-bold text-gray-900 dark:text-gray-100">
                ${formatPrice(latestPrice.price)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                {formatDate(latestPrice.binancetime)}
              </p>
            </div>
            {stats && (
              <div className="text-right">
                <p className="text-sm text-gray-500 mb-1">24 Saat Değişim</p>
                <div
                  className={`flex items-center space-x-1 text-2xl font-bold ${
                    stats.priceChangePercent >= 0
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  {stats.priceChangePercent >= 0 ? (
                    <TrendingUp className="w-6 h-6" />
                  ) : (
                    <TrendingDown className="w-6 h-6" />
                  )}
                  <span>{stats.priceChangePercent.toFixed(2)}%</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  ${formatPrice(Math.abs(stats.priceChange))}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 24h Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 p-4 border border-gray-100 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Açılış Fiyatı</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
              ${formatPrice(stats.openPrice)}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 p-4 border border-gray-100 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">En Yüksek</p>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">
              ${formatPrice(stats.highPrice)}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 p-4 border border-gray-100 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">En Düşük</p>
            <p className="text-xl font-bold text-red-600 dark:text-red-400">
              ${formatPrice(stats.lowPrice)}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 p-4 border border-gray-100 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Hacim</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {formatPrice(stats.volume)}
            </p>
          </div>
        </div>
      )}

      {/* Coin Bilgileri / Metadata */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md dark:shadow-gray-900/50 p-6 border-2 border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Coin Bilgileri</h2>
          {!isEditingMetadata ? (
            <button
              onClick={() => setIsEditingMetadata(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors text-sm font-semibold"
            >
              <Edit2 className="w-4 h-4" />
              Bilgileri Düzenle
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleSaveMetadata}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-semibold"
              >
                <Save className="w-4 h-4" />
                Kaydet
              </button>
              <button
                onClick={handleCancelEdit}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm font-semibold"
              >
                <X className="w-4 h-4" />
                İptal
              </button>
            </div>
          )}
        </div>

        {isLoadingMetadata ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="md" />
            <p className="ml-3 text-gray-600 dark:text-gray-300">Bilgiler yükleniyor...</p>
          </div>
        ) : isEditingMetadata ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Coin Adı
              </label>
              <input
                type="text"
                value={metadataForm.name}
                onChange={(e) => setMetadataForm({ ...metadataForm, name: e.target.value })}
                placeholder="Örn: Bitcoin"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Açıklama
              </label>
              <textarea
                value={metadataForm.description}
                onChange={(e) => setMetadataForm({ ...metadataForm, description: e.target.value })}
                placeholder="Coin hakkında açıklayıcı bilgi girin..."
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-y"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Coin hakkında detaylı açıklama yazabilirsiniz. Bu bilgi coin detay sayfasında görüntülenecektir.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Logo URL
                </label>
                <input
                  type="url"
                  value={metadataForm.logoUrl}
                  onChange={(e) => setMetadataForm({ ...metadataForm, logoUrl: e.target.value })}
                  placeholder="https://example.com/logo.png"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Ana Sayfa URL
                </label>
                <input
                  type="url"
                  value={metadataForm.homepage}
                  onChange={(e) => setMetadataForm({ ...metadataForm, homepage: e.target.value })}
                  placeholder="https://example.com"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Whitepaper URL
              </label>
              <input
                type="url"
                value={metadataForm.whitepaper}
                onChange={(e) => setMetadataForm({ ...metadataForm, whitepaper: e.target.value })}
                placeholder="https://example.com/whitepaper.pdf"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Kategoriler (virgülle ayırın)
              </label>
              <input
                type="text"
                value={metadataForm.categories}
                onChange={(e) => setMetadataForm({ ...metadataForm, categories: e.target.value })}
                placeholder="Örn: DeFi, NFT, Layer 1"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Kategorileri virgülle ayırın (örn: DeFi, NFT, Layer 1)
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {metadata?.logoUrl && (
              <div className="flex justify-center mb-4">
                <img 
                  src={metadata.logoUrl} 
                  alt={metadata.name || getCryptoName(symbol)} 
                  className="w-24 h-24 rounded-full border-4 border-gray-200 dark:border-gray-700 shadow-lg"
                  onError={(e) => {
                    e.target.style.display = 'none'
                  }}
                />
              </div>
            )}

            {metadata?.name && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {metadata.name}
                </h3>
              </div>
            )}

            {metadata?.description ? (
              <div>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {metadata.description}
                </p>
              </div>
            ) : (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  <span className="font-semibold">ℹ️ Bilgi:</span> Bu coin için henüz açıklama eklenmemiş. 
                  "Bilgileri Düzenle" butonuna tıklayarak coin hakkında bilgi ekleyebilirsiniz.
                </p>
              </div>
            )}

            {(metadata?.homepage || metadata?.whitepaper || (metadata?.categories && metadata.categories.length > 0)) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                {metadata?.homepage && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Ana Sayfa</p>
                    <a 
                      href={metadata.homepage} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary-600 dark:text-primary-400 hover:underline break-all"
                    >
                      {metadata.homepage}
                    </a>
                  </div>
                )}

                {metadata?.whitepaper && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Whitepaper</p>
                    <a 
                      href={metadata.whitepaper} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary-600 dark:text-primary-400 hover:underline break-all"
                    >
                      {metadata.whitepaper}
                    </a>
                  </div>
                )}

                {metadata?.categories && metadata.categories.length > 0 && (
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Kategoriler</p>
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(metadata.categories) ? metadata.categories.map((cat, idx) => (
                        <span 
                          key={idx}
                          className="px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-sm font-medium"
                        >
                          {cat}
                        </span>
                      )) : (
                        <span className="px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-sm font-medium">
                          {metadata.categories}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md dark:shadow-gray-900/50 p-6 border-2 border-gray-100 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Fiyat Geçmişi</h2>
          
          {/* Zaman Aralığı Filtresi */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Zaman Aralığı:</label>
              <select
                value={timeRange}
                onChange={(e) => {
                  setTimeRange(e.target.value)
                  if (e.target.value === 'limit') {
                    // Limit moduna geçildiğinde varsayılan limit'i ayarla
                  }
                }}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
              >
                <option value="limit">Son N Kayıt</option>
                <option value="1h">Son 1 Saat</option>
                <option value="24h">Son 24 Saat</option>
                <option value="7d">Son 7 Gün</option>
                <option value="30d">Son 30 Gün</option>
                <option value="90d">Son 90 Gün</option>
              </select>
            </div>

            {/* Limit Modu - Sadece "Son N Kayıt" seçildiğinde göster */}
            {timeRange === 'limit' && (
              <select
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
              >
                <option value={50}>Son 50 Kayıt</option>
                <option value={100}>Son 100 Kayıt</option>
                <option value={200}>Son 200 Kayıt</option>
                <option value={500}>Son 500 Kayıt</option>
                <option value={1000}>Son 1000 Kayıt</option>
              </select>
            )}
          </div>
        </div>

        {/* Seçili Zaman Aralığı Bilgisi */}
        {timeRange !== 'limit' && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <span className="font-semibold">Gösterilen Zaman Aralığı:</span>{' '}
              {timeRange === '1h' && 'Son 1 Saat'}
              {timeRange === '24h' && 'Son 24 Saat'}
              {timeRange === '7d' && 'Son 7 Gün'}
              {timeRange === '30d' && 'Son 30 Gün'}
              {timeRange === '90d' && 'Son 90 Gün'}
            </p>
          </div>
        )}

        {isLoadingHistory ? (
          <div className="h-96 flex items-center justify-center bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-center">
              <LoadingSpinner size="lg" />
              <p className="text-gray-600 dark:text-gray-300 mt-4">Veriler yükleniyor...</p>
            </div>
          </div>
        ) : isHistoryError ? (
          <div className="h-96 flex items-center justify-center bg-red-50 dark:bg-red-900/20 rounded-lg border-2 border-red-200 dark:border-red-800">
            <div className="text-center">
              <div className="text-4xl mb-4">⚠️</div>
              <p className="text-red-600 dark:text-red-400 font-semibold mb-2">Veri yüklenemedi</p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                {historyError?.response?.data?.message || historyError?.message || 'Veritabanından veri çekilirken bir hata oluştu.'}
              </p>
              <button
                onClick={() => refetchHistory()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
              >
                Tekrar Dene
              </button>
            </div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-96 flex items-center justify-center bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-center">
              <div className="text-4xl mb-4">📊</div>
              <p className="text-gray-600 dark:text-gray-300 font-semibold mb-2">Veri bulunamadı</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Bu coin için henüz fiyat geçmişi kaydedilmemiş.
              </p>
              <button
                onClick={() => refetchHistory()}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition-colors"
              >
                Yenile
              </button>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey={timeRange !== 'limit' ? 'fullDate' : 'date'}
                stroke="#6b7280"
                tick={{ fill: '#6b7280', fontSize: timeRange !== 'limit' ? 10 : 12 }}
                angle={timeRange !== 'limit' ? -45 : 0}
                textAnchor={timeRange !== 'limit' ? 'end' : 'middle'}
                height={timeRange !== 'limit' ? 100 : 60}
                interval="preserveStartEnd"
              />
              <YAxis
                stroke="#6b7280"
                tick={{ fill: '#6b7280', fontSize: 12 }}
                tickFormatter={(value) => `$${formatPrice(value)}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
                formatter={(value) => `$${formatPrice(value)}`}
                labelFormatter={(label) => {
                  // Tooltip'te tam tarih göster
                  const dataPoint = chartData.find(d => d.time === label || d.fullDate === label || d.date === label)
                  return dataPoint ? dataPoint.fullDate || dataPoint.time : label
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="price"
                stroke="#0ea5e9"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
                name="Fiyat (USDT)"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

export default CryptoDetailPage

