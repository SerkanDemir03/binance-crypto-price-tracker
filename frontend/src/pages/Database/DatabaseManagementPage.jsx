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
      'varchar': 'bg-blue-100 text-blue-700',
      'numeric': 'bg-green-100 text-green-700',
      'timestamp': 'bg-purple-100 text-purple-700',
      'serial': 'bg-orange-100 text-orange-700',
      'integer': 'bg-pink-100 text-pink-700',
    }
    return colors[type.toLowerCase()] || 'bg-gray-100 text-gray-700'
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
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Server className="w-6 h-6 text-primary-600" />
              Bağlantı Durumu
            </h2>
            {connection.connected ? (
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircle className="w-6 h-6" />
                <span className="font-semibold">Aktif</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-red-600">
                <XCircle className="w-6 h-6" />
                <span className="font-semibold">Bağlantı Yok</span>
              </div>
            )}
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <span className="text-gray-600 dark:text-gray-300 font-medium">PostgreSQL Versiyonu:</span>
              <span className="text-gray-900 dark:text-gray-100 font-semibold">
                {connection.version ? connection.version.split(' ')[0] + ' ' + connection.version.split(' ')[1] : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <span className="text-gray-600 dark:text-gray-300 font-medium">Son Kontrol:</span>
              <span className="text-gray-900 dark:text-gray-100 font-semibold">
                {formatDate(connection.timestamp)}
              </span>
            </div>
            {connection.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm font-medium">Hata: {connection.error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Tablo Bilgileri */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl dark:shadow-gray-900/50 p-6 border-2 border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Table className="w-6 h-6 text-primary-600" />
              Tablo Bilgileri
            </h2>
            {table.exists ? (
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-semibold">Mevcut</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-yellow-600">
                <Info className="w-5 h-5" />
                <span className="text-sm font-semibold">Oluşturulacak</span>
              </div>
            )}
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <span className="text-gray-600 dark:text-gray-300 font-medium">Tablo Adı:</span>
              <span className="text-gray-900 font-semibold font-mono">{table.name || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <span className="text-gray-600 dark:text-gray-300 font-medium">Takip Edilen Coin:</span>
              <span className="text-gray-900 dark:text-gray-100 font-semibold">{details.coinCount || 0} coin</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tablo Yapısı */}
      {table.exists && table.structure && table.structure.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl dark:shadow-gray-900/50 p-6 border-2 border-gray-100 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-6">
            <Table className="w-6 h-6 text-primary-600" />
            Tablo Yapısı
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-primary-50 to-purple-50">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Kolon Adı</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Veri Tipi</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Maksimum Uzunluk</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Null Olabilir</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Varsayılan Değer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {table.structure.map((column, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">{column.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getDataTypeColor(column.type)}`}>
                        {column.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {column.maxLength ? `${column.maxLength} karakter` : '-'}
                    </td>
                    <td className="px-4 py-3">
                      {column.nullable ? (
                        <span className="text-yellow-600 font-semibold">Evet</span>
                      ) : (
                        <span className="text-red-600 font-semibold">Hayır</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm text-gray-600">
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
            <BarChart3 className="w-6 h-6 text-primary-600" />
            Fiyat İstatistikleri
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 dark:text-gray-300 font-medium">Ortalama Fiyat</span>
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-3xl font-bold text-green-700">
                ${formatNumber(statistics.averagePrice)}
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl p-6 border-2 border-red-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 dark:text-gray-300 font-medium">Minimum Fiyat</span>
                <TrendingDown className="w-5 h-5 text-red-600" />
              </div>
              <div className="text-3xl font-bold text-red-700">
                ${formatNumber(statistics.minPrice)}
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border-2 border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 dark:text-gray-300 font-medium">Maksimum Fiyat</span>
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-blue-700">
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
            <BarChart3 className="w-6 h-6 text-primary-600" />
            Coin Bazında İstatistikler
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-primary-50 to-purple-50">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Coin</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Kayıt Sayısı</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Min Fiyat</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Max Fiyat</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Ortalama Fiyat</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">İlk Kayıt</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Son Kayıt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {coinStatistics.map((coin, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono font-semibold text-gray-900">{coin.symbol}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                        {coin.recordCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 font-medium">
                      ${formatNumber(coin.minPrice)}
                    </td>
                    <td className="px-4 py-3 text-gray-700 font-medium">
                      ${formatNumber(coin.maxPrice)}
                    </td>
                    <td className="px-4 py-3 text-gray-700 font-medium">
                      ${formatNumber(coin.avgPrice)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatDate(coin.firstRecord)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatDate(coin.lastRecord)}
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
          <Info className="w-6 h-6 text-primary-600" />
          Bağlantı Ayarları
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <span className="text-sm text-gray-600 font-medium">Host:</span>
            <p className="text-gray-900 font-semibold font-mono">localhost</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <span className="text-sm text-gray-600 font-medium">Port:</span>
            <p className="text-gray-900 font-semibold font-mono">5432</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <span className="text-sm text-gray-600 font-medium">Database:</span>
            <p className="text-gray-900 font-semibold font-mono">postgres</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <span className="text-sm text-gray-600 font-medium">User:</span>
            <p className="text-gray-900 font-semibold font-mono">postgres</p>
          </div>
        </div>
        
        <div className="mt-4 p-4 bg-primary-50 border border-primary-200 rounded-lg">
          <p className="text-sm text-primary-700">
            <strong>Not:</strong> Bağlantı ayarları backend'deki <code className="bg-white px-2 py-1 rounded">.env</code> dosyasından yönetilir.
            Güvenlik nedeniyle şifre bilgileri gösterilmemektedir.
          </p>
        </div>
      </div>
    </div>
  )
}

export default DatabaseManagementPage

