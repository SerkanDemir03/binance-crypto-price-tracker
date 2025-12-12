import { useState } from 'react'
import { useQuery } from 'react-query'
import { cryptoAPI } from '../../services/api'
import LoadingSpinner from '../../components/Common/LoadingSpinner'
import { Newspaper, ExternalLink, Calendar, Search, RefreshCw } from 'lucide-react'

const NewsPage = () => {
  const [searchCoin, setSearchCoin] = useState('')
  const [limit, setLimit] = useState(30)

  const { data: news, isLoading, refetch } = useQuery(
    ['news', searchCoin, limit],
    () => searchCoin 
      ? cryptoAPI.getNewsByCoin(searchCoin, limit)
      : cryptoAPI.getAllNews(limit),
    { refetchOnWindowFocus: false, staleTime: 10 * 60 * 1000 } // 10 minutes cache
  )

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('tr-TR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Kripto Para Haberleri</h1>
            <p className="text-gray-600 dark:text-gray-400">En güncel kripto para piyasası haberleri</p>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <RefreshCw size={20} />
            Yenile
          </button>
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

        {/* News List */}
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <div className="space-y-4">
            {news?.data?.length === 0 ? (
              <div className="text-center py-12">
                <Newspaper className="mx-auto text-gray-400 mb-4" size={48} />
                <p className="text-gray-600 dark:text-gray-400">Haber bulunamadı</p>
              </div>
            ) : (
              news?.data?.map((item) => (
                <div
                  key={item.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition"
                >
                  <div className="flex gap-4">
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-32 h-32 object-cover rounded-lg"
                        onError={(e) => {
                          e.target.style.display = 'none'
                        }}
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        {item.title}
                      </h3>
                      {(item.body || item.description) && (
                        <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                          {item.body || item.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar size={16} />
                          {formatDate(item.publishedAt)}
                        </div>
                        {item.source && (
                          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                            {item.source}
                          </span>
                        )}
                        {item.url && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            <ExternalLink size={16} />
                            Devamını Oku
                          </a>
                        )}
                      </div>
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {item.tags.slice(0, 5).map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default NewsPage

