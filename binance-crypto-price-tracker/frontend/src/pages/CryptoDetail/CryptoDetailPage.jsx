import { useParams } from 'react-router-dom'
import { useQuery } from 'react-query'
import { cryptoAPI } from '../../services/api'
import LoadingSpinner from '../../components/Common/LoadingSpinner'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { ArrowLeft, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'

const CryptoDetailPage = () => {
  const { symbol } = useParams()
  const navigate = useNavigate()
  const [limit, setLimit] = useState(100)

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

  // Get price history
  const { data: historyData, isLoading: isLoadingHistory, isError: isHistoryError, error: historyError, refetch: refetchHistory } = useQuery(
    ['priceHistory', symbol, limit],
    () => cryptoAPI.getPriceHistory(symbol, limit),
    {
      enabled: !!symbol,
      retry: 2,
      retryDelay: 1000,
      staleTime: 30000, // 30 saniye cache kullan
      cacheTime: 300000, // 5 dakika cache'te tut
      keepPreviousData: true, // Önceki verileri göster
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

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Get crypto name without USDT
  const getCryptoName = (symbol) => {
    return symbol?.replace('USDT', '') || symbol
  }

  // Prepare chart data - hata durumunda boş array döndür
  const chartData = (historyData?.data?.data && Array.isArray(historyData.data.data) && historyData.data.data.length > 0)
    ? historyData.data.data
        .map((item) => ({
          time: formatDate(item.binancetime),
          price: parseFloat(item.price),
          date: new Date(item.binancetime).toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        }))
        .reverse()
    : []

  const latestPrice = latestPriceData?.data?.data
  const stats = statsData?.data?.data

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

      {/* Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md dark:shadow-gray-900/50 p-6 border-2 border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Fiyat Geçmişi</h2>
          <select
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value={50}>Son 50 Kayıt</option>
            <option value={100}>Son 100 Kayıt</option>
            <option value={200}>Son 200 Kayıt</option>
            <option value={500}>Son 500 Kayıt</option>
          </select>
        </div>

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
                dataKey="date"
                stroke="#6b7280"
                tick={{ fill: '#6b7280', fontSize: 12 }}
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

