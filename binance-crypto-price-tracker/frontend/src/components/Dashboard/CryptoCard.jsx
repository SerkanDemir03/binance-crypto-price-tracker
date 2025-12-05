import { memo, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, TrendingDown, Info } from 'lucide-react'
import { LineChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { CARD_COLORS } from '../../constants/coins'
import { getCryptoIcon, getCryptoName, formatPrice } from '../../utils/cryptoUtils'

const CryptoCard = memo(({ 
  crypto, 
  index, 
  priceHistoryMap, 
  onShowCoinInfo 
}) => {
  const navigate = useNavigate()
  
  const history = useMemo(() => priceHistoryMap[crypto.name] || [], [priceHistoryMap, crypto.name])
  
  const priceChange = useMemo(() => {
    if (history.length < 2) return 0
    return ((history[history.length - 1]?.price || 0) - (history[0]?.price || 0)) / (history[0]?.price || 1) * 100
  }, [history])
  
  const isPositive = useMemo(() => priceChange >= 0, [priceChange])
  
  const hasPrice = useMemo(() => crypto.price && crypto.price > 0, [crypto.price])
  const hasHistory = useMemo(() => history.length > 0, [history.length])
  const hasEnoughHistory = useMemo(() => history.length >= 2, [history.length])
  
  // Calculate Y-axis domain to emphasize trend direction
  const yAxisDomain = useMemo(() => {
    if (history.length < 2) return [0, 100]
    const prices = history.map(h => h.price).filter(p => p != null && p > 0)
    if (prices.length === 0) return [0, 100]
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const priceRange = maxPrice - minPrice
    // Add padding to make trend more visible (10% of range on each side)
    const padding = priceRange * 0.1 || (maxPrice * 0.01)
    return [minPrice - padding, maxPrice + padding]
  }, [history])
  
  const priceDate = useMemo(() => {
    return crypto.binancetime ? new Date(crypto.binancetime) : null
  }, [crypto.binancetime])
  
  const isPriceStale = useMemo(() => {
    return priceDate ? (Date.now() - priceDate.getTime()) > 24 * 60 * 60 * 1000 : false
  }, [priceDate])
  
  const cardColor = useMemo(() => {
    return CARD_COLORS[index % CARD_COLORS.length]
  }, [index])
  
  const handleCardClick = () => {
    navigate(`/crypto/${crypto.name}`)
  }
  
  const handleInfoClick = (e) => {
    e.stopPropagation()
    onShowCoinInfo(crypto.name)
  }
  
  // Loading state
  if (crypto._isLoading) {
    return (
      <div className="relative glass border-2 border-gray-200/50 dark:border-gray-700/50 rounded-3xl p-6 shadow-xl animate-pulse">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 rounded-2xl animate-shimmer"></div>
            <div>
              <div className="h-6 w-24 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 rounded-lg mb-2 animate-shimmer"></div>
              <div className="h-4 w-28 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 rounded-lg animate-shimmer"></div>
            </div>
          </div>
        </div>
        <div className="mb-6">
          <div className="h-10 w-36 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 rounded-lg mb-3 animate-shimmer"></div>
          <div className="h-4 w-44 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 rounded-lg animate-shimmer"></div>
        </div>
        <div className="h-32 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-2xl flex items-center justify-center border border-gray-200/50 dark:border-gray-600/50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-3 border-primary-600 dark:border-primary-400 border-t-transparent mx-auto mb-3"></div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Fiyat yükleniyor...</p>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div
      className="relative group cursor-pointer animate-slide-up"
      style={{ 
        animationDelay: `${index * 0.05}s`,
        transformStyle: 'preserve-3d',
        perspective: '1000px'
      }}
      onClick={handleCardClick}
    >
      <div className={`relative glass border-2 ${hasPrice && hasEnoughHistory ? cardColor.border : 'border-gray-200 dark:border-gray-700'} dark:border-gray-700 rounded-2xl p-6 shadow-lg dark:shadow-gray-900/50 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 hover:scale-[1.02] overflow-hidden group ${!hasPrice || !hasEnoughHistory ? 'opacity-90' : ''}`} style={{ transform: 'translateZ(20px)' }}>
        {hasPrice && hasEnoughHistory && (
          <>
            <div className={`absolute inset-0 bg-gradient-to-br ${cardColor.bg} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}></div>
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            <div className={`absolute inset-0 bg-gradient-to-br ${cardColor.bg} opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500 -z-10`}></div>
          </>
        )}
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className={`relative ${hasPrice && hasEnoughHistory ? cardColor.icon : 'bg-gray-100 dark:bg-gray-800'} rounded-xl p-3 shadow-md transition-all duration-300 border-2 border-gray-200/50 dark:border-gray-700/50 group-hover:scale-110 group-hover:shadow-lg`}>
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent rounded-xl"></div>
                <span className="relative text-2xl transform group-hover:rotate-12 transition-transform duration-300">{getCryptoIcon(crypto.name)}</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-300 tracking-tight">
                  {getCryptoName(crypto.name)}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">{crypto.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-1.5">
              <button
                onClick={handleInfoClick}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors duration-200 group/info"
                title="Coin Bilgileri"
              >
                <Info className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 group-hover/info:text-primary-600 dark:group-hover/info:text-primary-400 transition-colors" />
              </button>
              {hasEnoughHistory ? (
                <div className={`flex items-center space-x-1 px-1.5 py-0.5 rounded text-xs font-medium ${isPositive ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'}`}>
                  <div className={`w-1 h-1 ${isPositive ? 'bg-green-500' : 'bg-red-500'} rounded-full`}></div>
                  <span>{isPositive ? '↑' : '↓'}</span>
                </div>
              ) : !hasPrice ? (
                <div className="px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  Veri yok
                </div>
              ) : hasHistory ? (
                <div className="px-1.5 py-0.5 rounded text-xs font-medium bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">
                  Yetersiz
                </div>
              ) : null}
            </div>
          </div>

          <div className="mb-6">
            {hasPrice ? (
              <>
                <div className="flex items-baseline gap-3 mb-3">
                  <p className="text-4xl font-bold text-gray-900 dark:text-gray-100 tracking-tight bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
                    ${formatPrice(crypto.price)}
                  </p>
                  {isPriceStale && (
                    <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded">
                      Eski veri
                    </span>
                  )}
                </div>
                {hasEnoughHistory ? (
                  <div className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium mb-2 ${isPositive ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'}`}>
                    {isPositive ? (
                      <TrendingUp className="w-3.5 h-3.5" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
                    </span>
                  </div>
                ) : hasHistory && (
                  <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium mb-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                    <span>Yetersiz veri</span>
                  </div>
                )}
                {priceDate && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 font-normal">
                    {priceDate.toLocaleString('tr-TR', { 
                      day: '2-digit', 
                      month: '2-digit', 
                      year: 'numeric',
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                )}
              </>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-medium text-gray-400 dark:text-gray-500">
                    Fiyat yok
                  </p>
                  <span className="text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                    Veri bekleniyor
                  </span>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Bu coin için henüz fiyat verisi bulunmuyor
                </p>
              </div>
            )}
          </div>

          {hasEnoughHistory ? (
            <div className="mb-4 h-36 bg-gradient-to-br from-gray-50/90 via-white/50 to-gray-100/90 dark:from-gray-800/90 dark:via-gray-700/50 dark:to-gray-800/90 rounded-2xl p-4 border-2 border-gray-200/60 dark:border-gray-600/60 shadow-inner backdrop-blur-md group-hover:border-primary-300/50 dark:group-hover:border-primary-600/50 transition-colors duration-300">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <defs>
                    <linearGradient id={`gradient-${crypto.name}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity={0.4}/>
                      <stop offset="95%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <YAxis hide domain={yAxisDomain} />
                  <XAxis hide />
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke="none"
                    fill={`url(#gradient-${crypto.name})`}
                    isAnimationActive={true}
                    animationDuration={1500}
                  />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke={isPositive ? '#10b981' : '#ef4444'}
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 5, fill: isPositive ? '#10b981' : '#ef4444', strokeWidth: 2, stroke: '#fff' }}
                    isAnimationActive={true}
                    animationDuration={1500}
                    animationEasing="ease-out"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      backdropFilter: 'blur(10px)',
                      border: `1px solid ${isPositive ? '#10b981' : '#ef4444'}`,
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      fontWeight: '500',
                    }}
                    formatter={(value) => [`$${formatPrice(value)}`, 'Fiyat']}
                    labelStyle={{ color: isPositive ? '#10b981' : '#ef4444', fontWeight: '600' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : hasHistory ? (
            <div className="mb-6 h-32 bg-gray-50 dark:bg-gray-800/50 rounded-xl flex items-center justify-center border border-gray-200 dark:border-gray-700 border-dashed">
              <div className="text-center px-4">
                <div className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Yetersiz grafik verisi</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Daha fazla veri toplandıkça grafik görünecek</p>
              </div>
            </div>
          ) : (
            <div className="mb-6 h-32 bg-gray-50 dark:bg-gray-800/50 rounded-xl flex items-center justify-center border border-gray-200 dark:border-gray-700 border-dashed">
              <div className="text-center px-4">
                <div className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-600">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Grafik verisi yok</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Fiyat verisi toplandıkça grafik görünecek</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

CryptoCard.displayName = 'CryptoCard'

export default CryptoCard
