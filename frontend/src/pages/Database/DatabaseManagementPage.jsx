import { useState, useEffect } from 'react'
import { useQuery } from 'react-query'
import { cryptoAPI } from '../../services/api'
import LoadingSpinner from '../../components/Common/LoadingSpinner'
import { 
  Database, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Table, 
  BarChart3, 
  Info,
  Server,
  Clock,
  TrendingUp,
  TrendingDown,
  Activity
} from 'lucide-react'
import toast from 'react-hot-toast'

const DatabaseManagementPage = () => {
  const [refetchKey, setRefetchKey] = useState(0)
  
  const { data: dbDetails, isLoading, refetch } = useQuery(
    ['databaseDetails', refetchKey],
    () => cryptoAPI.getDatabaseDetails(),
    {
      refetchInterval: false, // Otomatik yenileme kapalı - sadece manuel yenileme
      retry: 2,
    }
  )

  const handleRefresh = async () => {
    setRefetchKey(prev => prev + 1)
    const loadingToast = toast.loading('Veritabanı bilgileri güncelleniyor...')
    try {
      await refetch()
      toast.success('Veritabanı bilgileri başarıyla güncellendi!', { id: loadingToast })
    } catch (error) {
      toast.error('Veritabanı bilgileri güncellenirken hata oluştu', { id: loadingToast })
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const formatNumber = (num) => {
    if (!num && num !== 0) return 'N/A'
    return new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    }).format(num)
  }

  const getDataTypeColor = (type) => {
    const colors = {
      'varchar': 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
      'numeric': 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
      'timestamp': 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
      'serial': 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300',
      'integer': 'bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300',
    }
    return colors[type.toLowerCase()] || 'bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300'
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 animate-fade-in">
        <div className="relative">
          <div className="absolute inset-0 bg-primary-200 dark:bg-primary-800 rounded-full blur-2xl opacity-50 animate-pulse-slow"></div>
          <LoadingSpinner size="xl" />
        </div>
        <p className="mt-6 text-gray-600 dark:text-gray-300 font-medium animate-pulse">Veritabanı bilgileri yükleniyor...</p>
      </div>
    )
  }

  // Hata durumunda kullanıcı dostu mesaj göster
  if (!dbDetails?.data?.data) {
    return (
      <div className="flex flex-col items-center justify-center h-96 animate-fade-in">
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-2xl p-8 max-w-md">
          <XCircle className="w-16 h-16 text-red-600 dark:text-red-400 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4 text-center">Veritabanı Bağlantı Hatası</h3>
          <p className="text-gray-700 dark:text-gray-300 mb-6 text-center">
            Veritabanı bilgileri alınamadı. PostgreSQL servisinin çalıştığından emin olun.
          </p>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              💡 <strong>Çözüm:</strong> PostgreSQL servisinin çalıştığından ve bağlantı bilgilerinin doğru olduğundan emin olun.
            </p>
          </div>
          <button
            onClick={handleRefresh}
            className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors"
          >
            <RefreshCw className="w-5 h-5 inline-block mr-2" />
            Tekrar Dene
          </button>
        </div>
      </div>
    )
  }

  const details = dbDetails?.data?.data || {}
  const connection = details.connection || {}
  const table = details.table || {}
  const statistics = details.statistics || {}
  const coinStatistics = details.coinStatistics || []

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-500 to-purple-600 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 rounded-2xl shadow-2xl p-8 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIxLjUiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20"></div>
        <div className="relative z-10 flex items-center justify-between">
          <div className="animate-slide-up">
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
              <span className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                <Database className="w-8 h-8" />
              </span>
              Veritabanı Yönetimi
            </h1>
            <p className="text-primary-100 text-lg">
              Veritabanı bağlantı durumu, tablo yapısı ve istatistikler
            </p>
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center space-x-2 px-6 py-3 bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 rounded-xl hover:bg-primary-50 dark:hover:bg-gray-600 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 font-semibold"
          >
            <RefreshCw className="w-5 h-5" />
            <span>Yenile</span>
          </button>
        </div>
      </div>

      {/* Bağlantı Durumu */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bağlantı Bilgileri */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl dark:shadow-gray-900/50 p-6 border-2 border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Server className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              Bağlantı Durumu
            </h2>
            {connection.connected ? (
              <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
                <CheckCircle className="w-6 h-6" />
                <span className="font-semibold">Aktif</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
                <XCircle className="w-6 h-6" />
                <span className="font-semibold">Bağlantı Yok</span>
              </div>
            )}
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/80 rounded-lg border border-gray-200 dark:border-gray-600">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">PostgreSQL Versiyonu:</span>
              <span className="text-base font-bold text-gray-900 dark:text-gray-100">
                {connection.version ? connection.version.split(' ')[0] + ' ' + connection.version.split(' ')[1] : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/80 rounded-lg border border-gray-200 dark:border-gray-600">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Son Kontrol:</span>
              <span className="text-base font-bold text-gray-900 dark:text-gray-100">
                {formatDate(connection.timestamp)}
              </span>
            </div>
            {connection.error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-700 dark:text-red-300 text-sm font-semibold">Hata: {connection.error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Tablo Bilgileri */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl dark:shadow-gray-900/50 p-6 border-2 border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Table className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              Tablo Bilgileri
            </h2>
            {table.exists ? (
              <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-semibold">Mevcut</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-yellow-600 dark:text-yellow-400">
                <Info className="w-5 h-5" />
                <span className="text-sm font-semibold">Oluşturulacak</span>
              </div>
            )}
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/80 rounded-lg border border-gray-200 dark:border-gray-600">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Tablo Adı:</span>
              <span className="text-base font-bold text-gray-900 dark:text-gray-100 font-mono">{table.name || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/80 rounded-lg border border-gray-200 dark:border-gray-600">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Takip Edilen Coin:</span>
              <span className="text-base font-bold text-gray-900 dark:text-gray-100">{details.coinCount || 0} coin</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tablo Yapısı */}
      {table.exists && table.structure && table.structure.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl dark:shadow-gray-900/50 p-6 border-2 border-gray-100 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-6">
            <Table className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            Tablo Yapısı
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-primary-600 via-primary-500 to-primary-600 dark:from-[#071428] dark:via-[#07283b] dark:to-[#0b3650]">
                  <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Kolon Adı</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Veri Tipi</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Maksimum Uzunluk</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Null Olabilir</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Varsayılan Değer</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {table.structure.map((column, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/70 transition-colors bg-white dark:bg-gray-900">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono font-bold text-base text-gray-900 dark:text-gray-100">{column.name}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${getDataTypeColor(column.type)} dark:border dark:border-opacity-30`}>
                        {column.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {column.maxLength ? `${column.maxLength} karakter` : '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {column.nullable ? (
                        <span className="text-sm font-bold text-green-600 dark:text-green-400">Evet</span>
                      ) : (
                        <span className="text-sm font-bold text-red-600 dark:text-red-400">Hayır</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {column.defaultValue || '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* İstatistikler */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <Activity className="w-8 h-8 opacity-80" />
              <span className="text-3xl font-bold">{statistics.totalRecords || 0}</span>
            </div>
            <h3 className="text-sm font-semibold opacity-90">Toplam Kayıt</h3>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-8 h-8 opacity-80" />
              <span className="text-3xl font-bold">{statistics.uniqueCoins || 0}</span>
            </div>
            <h3 className="text-sm font-semibold opacity-90">Farklı Coin</h3>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <Clock className="w-8 h-8 opacity-80" />
              <div className="text-right">
                <div className="text-2xl font-bold">{formatDate(statistics.oldestRecord)?.split(' ')[0] || 'N/A'}</div>
                <div className="text-xs opacity-80">İlk Kayıt</div>
              </div>
            </div>
            <h3 className="text-sm font-semibold opacity-90">En Eski Kayıt</h3>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <Clock className="w-8 h-8 opacity-80" />
              <div className="text-right">
                <div className="text-2xl font-bold">{formatDate(statistics.newestRecord)?.split(' ')[0] || 'N/A'}</div>
                <div className="text-xs opacity-80">Son Kayıt</div>
              </div>
            </div>
            <h3 className="text-sm font-semibold opacity-90">En Yeni Kayıt</h3>
          </div>
        </div>
      )}

      {/* Fiyat İstatistikleri */}
      {statistics && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl dark:shadow-gray-900/50 p-6 border-2 border-gray-100 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-6">
            <BarChart3 className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            Fiyat İstatistikleri
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-xl p-6 border-2 border-green-200 dark:border-green-700 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Ortalama Fiyat</span>
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-4xl font-extrabold text-green-700 dark:text-green-300">
                ${formatNumber(statistics.averagePrice)}
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/30 dark:to-rose-900/30 rounded-xl p-6 border-2 border-red-200 dark:border-red-700 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Minimum Fiyat</span>
                <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="text-4xl font-extrabold text-red-700 dark:text-red-300">
                ${formatNumber(statistics.minPrice)}
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 rounded-xl p-6 border-2 border-blue-200 dark:border-blue-700 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Maksimum Fiyat</span>
                <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-4xl font-extrabold text-blue-700 dark:text-blue-300">
                ${formatNumber(statistics.maxPrice)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Coin Bazında İstatistikler */}
      {coinStatistics.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl dark:shadow-gray-900/50 p-6 border-2 border-gray-100 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-6">
            <BarChart3 className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            Coin Bazında İstatistikler
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-primary-600 via-primary-500 to-primary-600 dark:from-[#071428] dark:via-[#07283b] dark:to-[#0b3650]">
                  <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Coin</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Kayıt Sayısı</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Min Fiyat</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Max Fiyat</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Ortalama Fiyat</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">İlk Kayıt</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Son Kayıt</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {coinStatistics.map((coin, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/70 transition-colors bg-white dark:bg-gray-900">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono font-bold text-base text-gray-900 dark:text-gray-100">{coin.symbol}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full text-sm font-bold border border-blue-200 dark:border-blue-700">
                        {coin.recordCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-base font-bold text-gray-900 dark:text-gray-100">
                        ${formatNumber(coin.minPrice)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-base font-bold text-gray-900 dark:text-gray-100">
                        ${formatNumber(coin.maxPrice)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-base font-bold text-primary-600 dark:text-primary-400">
                        ${formatNumber(coin.avgPrice)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {formatDate(coin.firstRecord)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {formatDate(coin.lastRecord)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Veritabanı Bağlantı Bilgileri */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl dark:shadow-gray-900/50 p-6 border-2 border-gray-100 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-6">
          <Info className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          Bağlantı Ayarları
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-700/80 rounded-lg border border-gray-200 dark:border-gray-600">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Host:</span>
            <p className="text-base font-bold text-gray-900 dark:text-gray-100 font-mono mt-1">localhost</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700/80 rounded-lg border border-gray-200 dark:border-gray-600">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Port:</span>
            <p className="text-base font-bold text-gray-900 dark:text-gray-100 font-mono mt-1">5432</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700/80 rounded-lg border border-gray-200 dark:border-gray-600">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Database:</span>
            <p className="text-base font-bold text-gray-900 dark:text-gray-100 font-mono mt-1">postgres</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700/80 rounded-lg border border-gray-200 dark:border-gray-600">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">User:</span>
            <p className="text-base font-bold text-gray-900 dark:text-gray-100 font-mono mt-1">postgres</p>
          </div>
        </div>
        
        <div className="mt-4 p-4 bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800 rounded-lg">
          <p className="text-sm font-medium text-primary-700 dark:text-primary-300">
            <strong>Not:</strong> Bağlantı ayarları backend'deki <code className="bg-white dark:bg-gray-800 px-2 py-1 rounded text-primary-800 dark:text-primary-200 font-mono">.env</code> dosyasından yönetilir.
            Güvenlik nedeniyle şifre bilgileri gösterilmemektedir.
          </p>
        </div>
      </div>
    </div>
  )
}

export default DatabaseManagementPage

