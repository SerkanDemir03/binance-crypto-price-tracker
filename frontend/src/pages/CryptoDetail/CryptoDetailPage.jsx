import { useParams } from 'react-router-dom'
import { useQuery } from 'react-query'
import { cryptoAPI } from '../../services/api'
import LoadingSpinner from '../../components/Common/LoadingSpinner'
import { ComposedChart, Area, Bar, Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import CandlestickChart from '../../components/Charts/CandlestickChart'
import { ArrowLeft, TrendingUp, TrendingDown, RefreshCw, Calendar, Edit2, Save, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useState, useMemo, useCallback } from 'react'
import toast from 'react-hot-toast'
import { formatPrice, getCryptoName, formatVolume } from '../../utils/cryptoUtils'

// Binance tarzı tüm zaman dilimleri (detaylı grafik)
const BINANCE_INTERVALS = [
  { key: '1m', label: '1m' },
  { key: '3m', label: '3m' },
  { key: '5m', label: '5m' },
  { key: '15m', label: '15m' },
  { key: '30m', label: '30m' },
  { key: '1h', label: '1H' },
  { key: '2h', label: '2H' },
  { key: '4h', label: '4H' },
  { key: '1d', label: '1D' },
  { key: '1w', label: '1W' }
]

const CryptoDetailPage = () => {
  const { symbol } = useParams()
  const navigate = useNavigate()
  const [chartSource, setChartSource] = useState('binance') // 'binance' | 'db'
  const [interval, setInterval] = useState('1h') // Binance klines interval
  const [limit, setLimit] = useState(500) // Veritabanı: daha fazla kayıt = daha detaylı mum
  const [timeRange, setTimeRange] = useState('limit')
  const [lang, setLang] = useState('tr') // 'tr' | 'en'
  
  // Metadata editing state
  const [isEditingMetadata, setIsEditingMetadata] = useState(false)
  const [metadataForm, setMetadataForm] = useState({
    name: '',
    description: '',
    description_tr: '',
    logoUrl: '',
    homepage: '',
    whitepaper: '',
    categories: ''
  })

  // Get latest price (hata olsa bile sayfa render olsun)
  const { data: latestPriceData, isLoading: isLoadingPrice } = useQuery(
    ['latestPrice', symbol],
    () => cryptoAPI.getLatestPriceFromDB(symbol),
    { enabled: !!symbol, retry: 1, staleTime: 30000, keepPreviousData: true }
  )

  // Get 24h stats (Binance erişilemezse backend null döner, sayfa kırılmaz)
  const { data: statsData } = useQuery(
    ['24hStats', symbol],
    () => cryptoAPI.get24hStats(symbol),
    { enabled: !!symbol, retry: false, staleTime: 60000 }
  )

  // Get price history with time range filter
  const { data: historyData, isLoading: isLoadingHistory, isError: isHistoryError, refetch: refetchHistory } = useQuery(
    ['priceHistory', symbol, limit, timeRange],
    async () => {
      try {
        if (timeRange === 'limit') {
          return await cryptoAPI.getPriceHistory(symbol, limit)
        } else {
          const now = new Date()
          let startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
          if (timeRange === '1h') startDate = new Date(now.getTime() - 60 * 60 * 1000)
          else if (timeRange === '24h') startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
          else if (timeRange === '7d') startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          else if (timeRange === '30d') startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          else if (timeRange === '90d') startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
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
      staleTime: 30000,
      cacheTime: 300000,
      keepPreviousData: true,
      onError: (error) => {
        console.error('Price history fetch error:', error)
        toast.error('Veri yüklenirken hata oluştu. Lütfen tekrar deneyin.')
      }
    }
  )

  // Binance klines (OHLCV) – grafik için
  const { data: klinesData, isLoading: isLoadingKlines, isError: isKlinesError, refetch: refetchKlines } = useQuery(
    ['klines', symbol, interval],
    () => cryptoAPI.getKlines(symbol, interval, 1000),
    {
      enabled: !!symbol && chartSource === 'binance',
      staleTime: 60000,
      cacheTime: 300000,
      keepPreviousData: true,
      retry: 2,
    }
  )

  // Get coin metadata (hata olsa bile sayfa açılsın)
  const { data: metadataData, isLoading: isLoadingMetadata, refetch: refetchMetadata } = useQuery(
    ['coinMetadata', symbol],
    () => cryptoAPI.getCoinMetadata(symbol.replace('USDT', '')),
    {
      enabled: !!symbol,
      retry: false,
      staleTime: 300000,
      onSuccess: (data) => {
        // Metadata yüklendiğinde form'u doldur
        if (data?.data?.data) {
          const meta = data.data.data
          setMetadataForm({
            name: meta.name || '',
            description: meta.description || '',
            description_tr: meta.description_tr || '',
            logoUrl: meta.logoUrl || '',
            homepage: meta.homepage || '',
            whitepaper: meta.whitepaper || '',
            categories: Array.isArray(meta.categories) ? meta.categories.join(', ') : (meta.categories || '')
          })
        }
      }
    }
  )

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
              rawTime: date.getTime(),
              time: formatDate(item.binancetime),
              price: price,
              date: date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
              fullDate: date.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
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

  // Zaman aralığı seçiliyken eksik günleri doldur: her gün/saat için son bilinen fiyat (düz adım çizgi yerine anlamlı grafik)
  const chartDataToShow = useMemo(() => {
    if (!Array.isArray(chartData) || chartData.length === 0) return []
    if (timeRange === 'limit') return chartData
    const minT = Math.min(...chartData.map((d) => d.rawTime))
    const maxT = Math.max(...chartData.map((d) => d.rawTime))
    const dayMs = 24 * 60 * 60 * 1000
    const hourMs = 60 * 60 * 1000
    let stepMs = dayMs
    let numPoints = 90
    if (timeRange === '1h') {
      stepMs = 5 * 60 * 1000
      numPoints = Math.min(12, Math.ceil((maxT - minT) / stepMs))
    } else if (timeRange === '24h') {
      stepMs = hourMs
      numPoints = Math.min(24, Math.ceil((maxT - minT) / stepMs))
    } else if (timeRange === '7d') numPoints = 7
    else if (timeRange === '30d') numPoints = 30
    else if (timeRange === '90d') numPoints = 90
    const filled = []
    let lastPrice = chartData[0]?.price
    for (let i = 0; i < numPoints; i++) {
      const t = minT + i * stepMs
      if (t > maxT) break
      const upTo = chartData.filter((d) => d.rawTime <= t)
      if (upTo.length > 0) lastPrice = upTo[upTo.length - 1].price
      const d = new Date(t)
      filled.push({
        rawTime: t,
        price: lastPrice,
        time: d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
        date: d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        fullDate: d.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      })
    }
    return filled.length > 0 ? filled : chartData
  }, [chartData, timeRange])

  // Binance klines -> grafik formatı (lightweight-charts için)
  const klinesChartData = useMemo(() => {
    const raw = klinesData?.data?.data
    if (!Array.isArray(raw) || raw.length === 0) return []
    return raw.map((k) => {
      const t = Number(k.time)
      const d = new Date(t)
      const timeLabel = interval === '1d' || interval === '1w'
        ? d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })
        : d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
      return {
        time: Math.floor(t / 1000), // lightweight-charts: Unix saniye
        timeLabel,
        fullDate: d.toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }),
        open: k.open,
        high: k.high,
        low: k.low,
        close: k.close,
        price: k.close,
        volume: k.volume,
      }
    })
  }, [klinesData, interval])

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
        description_tr: metadataForm.description_tr,
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
        description_tr: metadata.description_tr || '',
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] rounded-xl bg-gray-50 dark:bg-gray-800/80 animate-fade-in">
        <div className="relative">
          <div className="absolute inset-0 bg-primary-200 dark:bg-primary-800 rounded-full blur-2xl opacity-50 animate-pulse-slow"></div>
          <LoadingSpinner size="xl" />
        </div>
        <p className="mt-6 text-gray-600 dark:text-gray-300 font-medium animate-pulse">Veriler yükleniyor...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in pb-8">
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

      {/* Binance tarzı: Sembol + Fiyat + 24s Chg, High, Low, Vol */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/80">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{symbol?.replace('USDT', '')}/USDT</span>
            <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {latestPrice ? formatPrice(latestPrice.price) : '—'}
            </span>
          </div>
          <div className={`flex items-center gap-1 text-sm font-semibold ${(stats?.priceChangePercent ?? 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {(stats?.priceChangePercent ?? 0) >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span>24s Değişim {(stats?.priceChangePercent != null) ? `${(stats.priceChangePercent >= 0 ? '+' : '')}${stats.priceChangePercent.toFixed(2)}%` : '—'}</span>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <span className="text-gray-500 dark:text-gray-500">24s Yüksek </span>
            <span className="font-medium text-green-600 dark:text-green-400">{stats ? formatPrice(stats.highPrice) : '—'}</span>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <span className="text-gray-500 dark:text-gray-500">24s Düşük </span>
            <span className="font-medium text-red-600 dark:text-red-400">{stats ? formatPrice(stats.lowPrice) : '—'}</span>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <span className="text-gray-500 dark:text-gray-500">24s Hacim ({symbol?.replace('USDT', '')}) </span>
            <span className="font-medium">{stats ? formatVolume(stats.volume) : '—'}</span>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <span className="text-gray-500 dark:text-gray-500">24s Hacim (USDT) </span>
            <span className="font-medium">{stats ? formatVolume(stats.quoteVolume) : '—'}</span>
          </div>
        </div>
      </div>

      {/* Coin Bilgileri / Metadata */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md dark:shadow-gray-900/50 p-6 border-2 border-gray-100 dark:border-gray-700">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Coin Bilgileri</h2>
            {!isEditingMetadata && (
              <div className="flex bg-gray-100 dark:bg-gray-700 p-0.5 rounded-lg border border-gray-200 dark:border-gray-600 shadow-inner">
                <button
                  type="button"
                  onClick={() => setLang('tr')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                    lang === 'tr'
                      ? 'bg-white dark:bg-gray-600 text-primary-600 dark:text-primary-400 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  TR
                </button>
                <button
                  type="button"
                  onClick={() => setLang('en')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                    lang === 'en'
                      ? 'bg-white dark:bg-gray-600 text-primary-600 dark:text-primary-400 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  EN
                </button>
              </div>
            )}
          </div>
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
                Açıklama (Türkçe)
              </label>
              <textarea
                value={metadataForm.description_tr}
                onChange={(e) => setMetadataForm({ ...metadataForm, description_tr: e.target.value })}
                placeholder="Coin hakkında Türkçe açıklayıcı bilgi girin..."
                rows={5}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-y"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Açıklama (İngilizce / English)
              </label>
              <textarea
                value={metadataForm.description}
                onChange={(e) => setMetadataForm({ ...metadataForm, description: e.target.value })}
                placeholder="Coin hakkında İngilizce açıklayıcı bilgi girin (Enter description in English)..."
                rows={5}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-y"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Coin hakkında Türkçe ve İngilizce detaylı açıklama yazabilirsiniz. Bu bilgiler coin detay sayfasında görüntülenecektir.
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

            {lang === 'tr' ? (
              (metadata?.description_tr || metadata?.description) ? (
                <div>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {metadata.description_tr || metadata.description}
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    <span className="font-semibold">ℹ️ Bilgi:</span> Bu coin için henüz Türkçe açıklama eklenmemiş. 
                    "Bilgileri Düzenle" butonuna tıklayarak coin hakkında Türkçe bilgi ekleyebilirsiniz.
                  </p>
                </div>
              )
            ) : (
              metadata?.description ? (
                <div>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {metadata.description}
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    <span className="font-semibold">ℹ️ Info:</span> No description in English is available for this coin.
                    Click "Bilgileri Düzenle" to add a description.
                  </p>
                </div>
              )
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

      {/* Grafik: Binance tarzı koyu kart, mum + hacim */}
      <div className="relative z-10 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-900 shadow-xl">
        <div className="p-4 relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex flex-wrap items-center gap-2">
              {chartSource === 'binance' && (
                <div className="flex flex-wrap gap-1">
                  {BINANCE_INTERVALS.map((int) => (
                    <button
                      key={int.key}
                      type="button"
                      onClick={() => setInterval(int.key)}
                      className={`px-2.5 py-1 rounded text-sm font-medium transition-colors ${
                        interval === int.key
                          ? 'bg-sky-600 text-white'
                          : 'bg-slate-700/80 text-slate-300 hover:bg-slate-600 border border-slate-600'
                      }`}
                    >
                      {int.label}
                    </button>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => setChartSource((s) => (s === 'binance' ? 'db' : 'binance'))}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700/80 border border-slate-600 text-slate-200 text-sm font-medium hover:bg-slate-600"
              >
                <RefreshCw className="w-4 h-4" />
                {chartSource === 'binance' ? 'Binance (canlı)' : 'Veritabanı geçmişi'}
              </button>
            </div>
          </div>

          {chartSource === 'binance' ? (
            isLoadingKlines && klinesChartData.length === 0 ? (
              <div className="h-[420px] flex items-center justify-center rounded-lg bg-[#1e293b]">
                <div className="text-center text-slate-400">
                  <LoadingSpinner size="lg" />
                  <p className="mt-3">Binance verileri yükleniyor...</p>
                </div>
              </div>
            ) : (isKlinesError || klinesChartData.length === 0) ? (
              /* Binance verisi yoksa veritabanı grafiği – aynı koyu panelde */
              <>
                <div className="flex flex-wrap gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-slate-400 self-center" />
                  <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} className="px-3 py-2 rounded-lg bg-slate-700/80 border border-slate-600 text-slate-200 text-sm focus:ring-2 focus:ring-sky-500">
                    <option value="limit">Son N Kayıt</option>
                    <option value="1h">Son 1 Saat</option>
                    <option value="24h">Son 24 Saat</option>
                    <option value="7d">Son 7 Gün</option>
                    <option value="30d">Son 30 Gün</option>
                    <option value="90d">Son 90 Gün</option>
                  </select>
                  {timeRange === 'limit' && (
                    <select value={limit} onChange={(e) => setLimit(parseInt(e.target.value))} className="px-3 py-2 rounded-lg bg-slate-700/80 border border-slate-600 text-slate-200 text-sm focus:ring-2 focus:ring-sky-500">
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value={200}>200</option>
                      <option value={500}>500</option>
                      <option value={1000}>1000</option>
                    </select>
                  )}
                </div>
                {isLoadingHistory ? (
                  <div className="h-[420px] flex items-center justify-center rounded-lg bg-slate-800/50">
                    <div className="text-center text-slate-400"><LoadingSpinner size="lg" /><p className="mt-2">Yükleniyor...</p></div>
                  </div>
                ) : isHistoryError ? (
                  <div className="h-[420px] flex items-center justify-center rounded-lg bg-slate-800/50 px-4">
                    <div className="text-center text-slate-200">
                      <p className="font-medium mb-2">Veritabanından veri alınamadı</p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        <button onClick={() => refetchHistory()} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-sm">Tekrar dene</button>
                        <button onClick={() => refetchKlines()} className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-semibold text-sm">Binance&apos;i tekrar dene</button>
                      </div>
                    </div>
                  </div>
                ) : chartData.length === 0 ? (
                  <div className="h-[420px] flex items-center justify-center rounded-lg bg-slate-800/50 text-slate-400">
                    <p>Bu coin için henüz fiyat geçmişi yok. Dashboard&apos;dan &quot;Güncelle&quot; ile veri çekin.</p>
                  </div>
                ) : (
                  <div className="h-[420px] w-full rounded-lg bg-[#1e293b]">
                    <ResponsiveContainer width="100%" height={420}>
                      <LineChart data={chartDataToShow} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey={timeRange !== 'limit' ? 'fullDate' : 'date'} tick={{ fontSize: 11, fill: '#94a3b8' }} interval="preserveStartEnd" stroke="#475569" />
                        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `$${formatPrice(v)}`} stroke="#475569" />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8 }} labelStyle={{ color: '#e2e8f0' }} formatter={(v) => [`$${formatPrice(v)}`, 'Fiyat']} labelFormatter={(_, payload) => payload[0]?.payload?.fullDate} />
                        <Line type="natural" dataKey="price" stroke="#38bdf8" strokeWidth={2} dot={false} activeDot={{ r: 5, fill: '#38bdf8' }} name="Fiyat (USDT)" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-lg bg-slate-900">
                <CandlestickChart data={klinesChartData} height={420} />
              </div>
            )
          ) : (
            /* Veritabanı geçmişi seçili – yine Binance tarzı koyu grafik */
            <>
              <div className="flex flex-wrap gap-2 mb-3">
                <Calendar className="w-4 h-4 text-slate-400 self-center" />
                <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} className="px-3 py-2 rounded-lg bg-slate-700/80 border border-slate-600 text-slate-200 text-sm focus:ring-2 focus:ring-sky-500">
                  <option value="limit">Son N Kayıt</option>
                  <option value="1h">Son 1 Saat</option>
                  <option value="24h">Son 24 Saat</option>
                  <option value="7d">Son 7 Gün</option>
                  <option value="30d">Son 30 Gün</option>
                  <option value="90d">Son 90 Gün</option>
                </select>
                {timeRange === 'limit' && (
                  <select value={limit} onChange={(e) => setLimit(parseInt(e.target.value))} className="px-3 py-2 rounded-lg bg-slate-700/80 border border-slate-600 text-slate-200 text-sm focus:ring-2 focus:ring-sky-500">
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={200}>200</option>
                    <option value={500}>500</option>
                    <option value={1000}>1000</option>
                  </select>
                )}
              </div>
              {isLoadingHistory ? (
                <div className="h-[420px] flex items-center justify-center rounded-lg bg-slate-800/50 text-slate-400"><LoadingSpinner size="lg" /><p className="mt-2 ml-2">Yükleniyor...</p></div>
              ) : isHistoryError ? (
                <div className="h-[420px] flex items-center justify-center rounded-lg bg-slate-800/50 px-4">
                  <div className="text-center text-slate-200 max-w-md">
                    <p className="font-medium mb-1">Veritabanından veri alınamadı</p>
                    <p className="text-sm text-slate-400 mb-4">Backend ve PostgreSQL çalışıyor olmalı. Veri yoksa Dashboard&apos;dan &quot;Güncelle&quot; ile fiyat çekin.</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      <button onClick={() => refetchHistory()} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-sm">Tekrar dene</button>
                      <button onClick={() => setChartSource('binance')} className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-semibold text-sm">Binance grafiğini göster</button>
                    </div>
                  </div>
                </div>
              ) : chartData.length === 0 ? (
                <div className="h-[420px] flex items-center justify-center rounded-lg bg-slate-800/50 text-slate-400 px-4">
                  <div className="text-center">
                    <p className="mb-4">Bu coin için veritabanında fiyat geçmişi yok.</p>
                    <button onClick={() => setChartSource('binance')} className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-semibold text-sm">Binance grafiğini göster</button>
                  </div>
                </div>
              ) : (
                <div className="h-[420px] w-full rounded-lg bg-[#1e293b]">
                  <ResponsiveContainer width="100%" height={420}>
                    <LineChart data={chartDataToShow} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey={timeRange !== 'limit' ? 'fullDate' : 'date'} tick={{ fontSize: 11, fill: '#94a3b8' }} interval="preserveStartEnd" stroke="#475569" />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `$${formatPrice(v)}`} stroke="#475569" />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8 }} labelStyle={{ color: '#e2e8f0' }} formatter={(v) => [`$${formatPrice(v)}`, 'Fiyat']} labelFormatter={(_, payload) => payload[0]?.payload?.fullDate} />
                      <Line type="natural" dataKey="price" stroke="#38bdf8" strokeWidth={2} dot={false} activeDot={{ r: 5, fill: '#38bdf8' }} name="Fiyat (USDT)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}


export default CryptoDetailPage

