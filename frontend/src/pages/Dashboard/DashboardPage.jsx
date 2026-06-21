import { useState, useEffect, useMemo } from 'react'
import { useQuery } from 'react-query'
import { useNavigate } from 'react-router-dom'
import { cryptoAPI } from '../../services/api'
import LoadingSpinner from '../../components/Common/LoadingSpinner'
import CryptoLogo from '../../components/Common/CryptoLogo'
import { TrendingUp, TrendingDown, RefreshCw, ArrowRight, Plus, X, Search, Info, ExternalLink, FileText, BarChart3 } from 'lucide-react'
import toast from 'react-hot-toast'
import { LineChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { DEFAULT_BINANCE_COINS, COIN_TECHNICAL_INFO } from '../../constants/coins'
import { formatPrice, getCryptoName, getCryptoIcon } from '../../utils/cryptoUtils'

// Coin Search Results Component (fiyat gösterimi için) - Modern Design
const CoinSearchResults = ({ results, customCoins, onAddCoin, formatPrice }) => {
  const [priceMap, setPriceMap] = useState({})
  const [loadingPrices, setLoadingPrices] = useState({})

  const loadPrice = async (coinSymbol, coinId) => {
    if (priceMap[coinId] || loadingPrices[coinId]) return
    
    setLoadingPrices(prev => ({ ...prev, [coinId]: true }))
    try {
      const validation = await cryptoAPI.validateCoin(coinSymbol, false)
      if (validation.data.data.valid) {
        setPriceMap(prev => ({ ...prev, [coinId]: validation.data.data.price }))
      }
    } catch (error) {
      console.error('Price load error:', error)
    } finally {
      setLoadingPrices(prev => ({ ...prev, [coinId]: false }))
    }
  }

  return (
    <div className="max-h-64 overflow-y-auto space-y-2 mb-6 custom-scrollbar">
      {results.map((coin) => {
        const isAdded = customCoins.includes(coin.symbol.toUpperCase())
        const price = priceMap[coin.id]
        const isLoading = loadingPrices[coin.id]
        
        return (
          <button
            key={coin.id}
            onClick={() => !isAdded && onAddCoin(coin)}
            onMouseEnter={() => !price && !isLoading && loadPrice(coin.symbol, coin.id)}
            disabled={isAdded}
            className={`group w-full flex items-center space-x-3 p-3.5 rounded-xl border-2 transition-all duration-200 ${
              isAdded
                ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 opacity-60 cursor-not-allowed'
                : 'border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md'
            }`}
          >
            {coin.thumb && (
              <div className="flex-shrink-0">
                <img src={coin.thumb} alt={coin.name} className="w-10 h-10 rounded-full border-2 border-gray-200 dark:border-gray-700" />
              </div>
            )}
            <div className="flex-1 text-left min-w-0">
              <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">{coin.name}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">{coin.symbol.toUpperCase()}</div>
              {price && (
                <div className="text-xs font-bold text-primary-600 dark:text-primary-400 mt-1">
                  ${formatPrice(price)}
                </div>
              )}
              {isLoading && (
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 flex items-center space-x-1">
                  <div className="w-3 h-3 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                  <span>Fiyat yükleniyor...</span>
                </div>
              )}
            </div>
            {isAdded && (
              <div className="flex-shrink-0 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-xs font-semibold">
                Ekli
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}

const DashboardPage = () => {
  const navigate = useNavigate()
  const [priceHistoryMap, setPriceHistoryMap] = useState({})
  const [change24hMap, setChange24hMap] = useState({}) // Gerçek 24h % (Binance)
  const [change7dMap, setChange7dMap] = useState({})   // Gerçek 7d % (Binance klines)
  const [apiProvider, setApiProvider] = useState('coingecko') // Binance engelli bölgelerde CoinGecko kullanılır
  const [cooldownSeconds, setCooldownSeconds] = useState(0) // Cooldown süresi
  const [cooldownResetTime, setCooldownResetTime] = useState(null) // Cooldown reset zamanı (timestamp)
  const [isFetching, setIsFetching] = useState(false) // İstek devam ediyor mu?
  
  // Custom coin management
  const [customCoins, setCustomCoins] = useState(() => {
    // localStorage'dan custom coin'leri yükle
    const saved = localStorage.getItem('customCoins')
    return saved ? JSON.parse(saved) : []
  })
  const [showAddCoinModal, setShowAddCoinModal] = useState(false)
  const [coinSearchQuery, setCoinSearchQuery] = useState('')
  const [coinSearchResults, setCoinSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  
  // Coin info modal state
  const [selectedCoinInfo, setSelectedCoinInfo] = useState(null)
  const [showCoinInfoModal, setShowCoinInfoModal] = useState(false)
  const [isLoadingCoinInfo, setIsLoadingCoinInfo] = useState(false)

  // Tüm gösterilecek coinler: varsayılan Binance coinleri + custom coinler
  // useMemo ile memoize et - customCoins değişmediğinde yeniden hesaplama
  const allDisplayCoins = useMemo(() => {
    return [...new Set([...DEFAULT_BINANCE_COINS, ...customCoins])]
  }, [customCoins])
  
  // Fetch latest prices from database (varsayılan coinler + custom coinler)
  const { data: pricesData, isLoading, isError, error, refetch, dataUpdatedAt } = useQuery(
    ['latestPrices', allDisplayCoins.join(',')], // coinler değiştiğinde yeniden fetch
      async () => {
      try {
        return await cryptoAPI.getLatestPricesFromDB(allDisplayCoins.length > 0 ? allDisplayCoins : null)
      } catch (error) {
        // 429 hatası durumunda cache'deki verileri kullan (hata fırlatma, keepPreviousData çalışsın)
        if (error.response?.status === 429) {
          console.warn('Rate limit (429) - Cache\'deki veriler kullanılıyor')
          // Hata fırlat ama keepPreviousData sayesinde cache'deki veriler gösterilecek
          throw error
        }
        // Timeout veya network hatası durumunda daha açıklayıcı mesaj
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
          throw new Error('Veritabanı sorgusu zaman aşımına uğradı. Lütfen tekrar deneyin.')
        }
        throw error
      }
    },
    {
      refetchInterval: false, // Otomatik yenileme kapalı
      staleTime: 30000, // 30 saniye cache kullan (sayfa yeniden açıldığında hızlı yükleme)
      cacheTime: 300000, // 5 dakika cache'te tut
      retry: (failureCount, error) => {
        // 429 hatası durumunda retry yapma
        if (error?.response?.status === 429) {
          return false
        }
        return failureCount < 2 // Diğer hatalar için 2 kez dene
      },
      retryDelay: 500, // 0.5 saniye bekle (daha hızlı)
      refetchOnWindowFocus: false, // Pencere focus olduğunda refetch yapma
      refetchOnMount: true, // Mount olduğunda refetch yap (cache'de veri varsa önce onu göster, sonra güncelle)
      keepPreviousData: true, // Önceki verileri göster (cache'de veri varsa hemen göster, arka planda güncelle)
    }
  )
  
  // Eksik coin'ler için otomatik güncelleme (arka planda) - sadece custom coinler için
  const [hasCheckedMissingCoins, setHasCheckedMissingCoins] = useState(false)
  
  useEffect(() => {
    if (pricesData?.data?.data && customCoins.length > 0 && !hasCheckedMissingCoins) {
      const allPrices = pricesData.data.data || []
      const existingCoinNames = allPrices.map(p => p.name.replace('USDT', ''))
      const missingCoins = customCoins.filter(c => !existingCoinNames.includes(c))
      
      // Eksik coin'ler varsa ve cooldown yoksa, arka planda güncelle (sadece custom coinler)
      if (missingCoins.length > 0 && cooldownSeconds === 0 && !isFetching) {
        setHasCheckedMissingCoins(true) // Tekrar kontrol etme
        
        // 3 saniye bekle (kullanıcı mevcut verileri görsün)
        const timer = setTimeout(async () => {
          try {
            console.log(`🔄 ${missingCoins.length} eksik custom coin için arka planda fiyatlar çekiliyor...`)
            await cryptoAPI.fetchAndSavePrices(apiProvider, customCoins)
            // Güncelleme sonrası verileri yenile
            await refetch()
            setHasCheckedMissingCoins(false) // Tekrar kontrol edebilir
          } catch (error) {
            console.error('Arka plan güncelleme hatası:', error)
            setHasCheckedMissingCoins(false) // Hata durumunda tekrar dene
          }
        }, 3000)
        
        return () => clearTimeout(timer)
      } else if (missingCoins.length === 0) {
        // Eksik coin yoksa, kontrolü sıfırla
        setHasCheckedMissingCoins(false)
      }
    }
  }, [pricesData, customCoins, cooldownSeconds, isFetching, apiProvider, refetch, hasCheckedMissingCoins])

  // Her kripto para için fiyat geçmişini çek
  // Varsayılan Binance coinleri + custom coinler göster
  // useMemo ile prices hesaplamasını optimize et - gereksiz re-render'ları önle
  const prices = useMemo(() => {
    const allPrices = pricesData?.data?.data || []
    
    // Varsayılan coinler + custom coinler için filtrele
    const filteredPrices = allPrices.filter(p => {
      const coinName = p.name.replace('USDT', '')
      return allDisplayCoins.includes(coinName)
    })
    
    // Veritabanında olmayan custom coin'ler için placeholder ekle (sadece custom coinler için)
    // Varsayılan coinler için placeholder ekleme - onlar zaten veritabanında olmalı
    const existingCoinNames = allPrices.map(p => p.name.replace('USDT', ''))
    const missingCustomCoins = customCoins.filter(c => !existingCoinNames.includes(c))
    
    // Sadece custom coinler için loading placeholder ekle (ve sadece loading tamamlandıysa)
    // İlk yüklemede loading placeholder gösterme - cache'deki verileri göster
    // Eğer veri varsa (cache'den veya yeni fetch'ten), eksik coin'ler için placeholder ekle
    if (missingCustomCoins.length > 0 && pricesData && !isLoading) {
      // Eksik custom coin'ler için placeholder ekle (veritabanına henüz kaydedilmemiş)
      missingCustomCoins.forEach(coin => {
        filteredPrices.push({
          name: coin + 'USDT',
          price: null, // Henüz fiyat yok
          binancetime: new Date(),
          _isLoading: true // Yükleniyor işareti
        })
      })
    }
    
    // Fiyata göre sırala (yüksekten düşüğe) - piyasa sıralaması için
    // Fiyatı olmayan coin'ler en sona
    return filteredPrices.sort((a, b) => {
      if (a._isLoading && !b._isLoading) return 1
      if (!a._isLoading && b._isLoading) return -1
      if (!a.price && b.price) return 1
      if (a.price && !b.price) return -1
      if (!a.price && !b.price) return 0
      return (b.price || 0) - (a.price || 0)
    })
  }, [pricesData, allDisplayCoins, customCoins, isLoading])

  useEffect(() => {
    if (prices.length > 0 && !isFetching) {
      // API'den gerçek mum geçmişini çek
      const fetchHistories = async () => {
        try {
          const [historyRes, stats24hRes, stats7dRes] = await Promise.allSettled([
            cryptoAPI.getKlinesBatch(allDisplayCoins, '4h', 42), // 7 gün
            cryptoAPI.get24hStatsBatch(allDisplayCoins),
            cryptoAPI.get7dStatsBatch(allDisplayCoins)
          ])
          const historiesData = historyRes.status === 'fulfilled' ? (historyRes.value.data.data || {}) : {}
          const formattedHistories = {}
          Object.keys(historiesData).forEach(symbol => {
            if (Array.isArray(historiesData[symbol]) && historiesData[symbol].length > 0) {
              formattedHistories[symbol] = historiesData[symbol]
                .map((item) => ({
                  time: new Date(item.time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
                  price: parseFloat(item.close), // kline verisi 'close' içerir
                }))
            }
          })
          setPriceHistoryMap(formattedHistories)
          if (stats24hRes.status === 'fulfilled' && stats24hRes.value.data?.data) {
            setChange24hMap(stats24hRes.value.data.data)
          }
          if (stats7dRes.status === 'fulfilled' && stats7dRes.value.data?.data) {
            setChange7dMap(stats7dRes.value.data.data)
          }
        } catch (error) {
          console.error('Error fetching histories:', error)
        }
      }
      // Debounce ile hızlı değişikliklerde gereksiz istekleri önle
      const timer = setTimeout(() => {
        fetchHistories()
      }, 300)
      
      return () => clearTimeout(timer)
    } else if (prices.length === 0) {
      // Fiyat yoksa history map'i temizle
      setPriceHistoryMap({})
    }
  }, [prices.length, allDisplayCoins, isFetching]) // prices.length kullan - sadece uzunluk değiştiğinde tetikle

  // Custom coin'leri localStorage'a kaydet
  useEffect(() => {
    localStorage.setItem('customCoins', JSON.stringify(customCoins))
  }, [customCoins])

  // Cooldown timer'ı başlat - resetTime varsa onu kullan, yoksa countdown kullan
  useEffect(() => {
    if (cooldownResetTime) {
      // Reset time'dan kalan süreyi hesapla
      const updateCooldown = () => {
        const now = Date.now()
        const resetTime = new Date(cooldownResetTime).getTime()
        const remaining = Math.ceil((resetTime - now) / 1000)
        
        if (remaining > 0) {
          setCooldownSeconds(remaining)
        } else {
          setCooldownSeconds(0)
          setCooldownResetTime(null)
        }
      }
      
      // İlk güncelleme
      updateCooldown()
      
      // Her saniye güncelle
      const timer = setInterval(updateCooldown, 1000)
      return () => clearInterval(timer)
    } else if (cooldownSeconds > 0) {
      // Eski yöntem (geriye dönük uyumluluk)
      const timer = setTimeout(() => {
        setCooldownSeconds(cooldownSeconds - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [cooldownSeconds, cooldownResetTime])

  // Coin info göster
  const handleShowCoinInfo = async (symbol) => {
    setIsLoadingCoinInfo(true)
    setShowCoinInfoModal(true)
    setSelectedCoinInfo(null)
    
    try {
      // Önce local'deki teknik bilgileri kontrol et
      const cleanSymbol = symbol.replace('USDT', '').toUpperCase()
      const localInfo = COIN_TECHNICAL_INFO[cleanSymbol]
      
      if (localInfo) {
        // Local bilgileri kullan, API'den sadece market data çek
        try {
          const response = await cryptoAPI.getCoinInfo(symbol)
          const apiData = response.data.data
          
          // Local teknik bilgileri API market data ile birleştir
          setSelectedCoinInfo({
            ...localInfo,
            symbol: cleanSymbol,
            // API'den gelen market data
            currentPrice: apiData.currentPrice || { usd: 0, try: 0 },
            priceChange24h: apiData.priceChange24h || 0,
            marketCapRank: apiData.marketCapRank || null,
            marketCapDominance: apiData.marketCapDominance || null,
            circulatingSupply: apiData.circulatingSupply || 0,
            totalSupply: apiData.totalSupply || localInfo.maxSupply || 0,
            image: apiData.image || '',
            homepage: localInfo.website || apiData.homepage || '',
            whitepaper: localInfo.whitepaper || apiData.whitepaper || '',
            categories: apiData.categories || []
          })
        } catch (apiError) {
          // API hatası olsa bile local bilgileri göster
          console.warn('API error, using local data only:', apiError)
          setSelectedCoinInfo({
            ...localInfo,
            symbol: cleanSymbol,
            currentPrice: { usd: 0, try: 0 },
            priceChange24h: 0,
            marketCapRank: null,
            marketCapDominance: null,
            circulatingSupply: 0,
            totalSupply: localInfo.maxSupply || 0,
            image: '',
            homepage: localInfo.website || '',
            whitepaper: localInfo.whitepaper || '',
            categories: []
          })
        }
      } else {
        // Local'de bilgi yoksa API'den çek
        const response = await cryptoAPI.getCoinInfo(symbol)
        setSelectedCoinInfo(response.data.data)
      }
    } catch (error) {
      console.error('Coin info error:', error)
      toast.error('Coin bilgileri yüklenemedi')
      setShowCoinInfoModal(false)
    } finally {
      setIsLoadingCoinInfo(false)
    }
  }

  // Coin arama
  useEffect(() => {
    if (coinSearchQuery.trim().length >= 2) {
      const searchTimer = setTimeout(async () => {
        setIsSearching(true)
        try {
          const response = await cryptoAPI.searchCoins(coinSearchQuery, 10)
          setCoinSearchResults(response.data.data || [])
        } catch (error) {
          console.error('Coin search error:', error)
          setCoinSearchResults([])
        } finally {
          setIsSearching(false)
        }
      }, 500) // Debounce 500ms

      return () => clearTimeout(searchTimer)
    } else {
      setCoinSearchResults([])
    }
  }, [coinSearchQuery])

  // Fetch and save prices from API, then reload from database
  const handleFetchPrices = async () => {
    // Cooldown kontrolü
    if (cooldownSeconds > 0) {
      toast.error(`Lütfen ${cooldownSeconds} saniye bekleyin (Rate limit koruması)`, {
        duration: 3000
      })
      return
    }

    // Zaten bir istek devam ediyorsa
    if (isFetching) {
      toast.error('Bir istek zaten devam ediyor, lütfen bekleyin...', {
        duration: 2000
      })
      return
    }

    setIsFetching(true)
    
    try {
      const providerName = apiProvider === 'coingecko' ? 'CoinGecko' : 'Binance'
      
      // 1. Custom symbols'ı önce tanımla
      const customSymbols = allDisplayCoins.length > 0 ? allDisplayCoins : null
      
      // 2. Daha detaylı loading mesajı
      const loadingMessage = customSymbols && customSymbols.length > 0
        ? `${providerName} API'den ${customSymbols.length} coin için fiyatlar çekiliyor...`
        : `${providerName} API'den tüm fiyatlar çekiliyor...`
      
      toast.loading(loadingMessage, { id: 'fetch-prices', duration: Infinity })
      
      // 3. Seçilen API'den fiyatları çek ve veritabanına kaydet
      
      // API fetch'i başlat
      const fetchResponse = await cryptoAPI.fetchAndSavePrices(apiProvider, customSymbols)
      
      // Backend'den gelen response'u parse et
      const responseData = fetchResponse.data
      const savedCount = responseData.count || 0
      const message = responseData.message || 'Fiyatlar güncellendi'
      const totalInDb = responseData.totalInDb || 0
      
      // 4. Veritabanından en güncel fiyatları, history ve 24h istatistiklerini paralel çek
      const [updatedPricesResponse, historyResponse, stats24hResponse, stats7dResponse] = await Promise.allSettled([
        cryptoAPI.getLatestPricesFromDB(customSymbols),
        cryptoAPI.getKlinesBatch(customSymbols, '4h', 42),
        cryptoAPI.get24hStatsBatch(customSymbols),
        cryptoAPI.get7dStatsBatch(customSymbols)
      ])
      
      if (historyResponse.status === 'fulfilled') {
        const historiesData = historyResponse.value.data.data || {}
        const histories = {}
        Object.keys(historiesData).forEach(symbol => {
          if (Array.isArray(historiesData[symbol]) && historiesData[symbol].length > 0) {
            histories[symbol] = historiesData[symbol]
              .map((item) => ({
                time: new Date(item.time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
                price: parseFloat(item.close),
              }))
          }
        })
        setPriceHistoryMap(histories)
      }
      if (stats24hResponse.status === 'fulfilled' && stats24hResponse.value.data?.data) {
        setChange24hMap(stats24hResponse.value.data.data)
      }
      if (stats7dResponse.status === 'fulfilled' && stats7dResponse.value.data?.data) {
        setChange7dMap(stats7dResponse.value.data.data)
      }
      
      // 5. React Query cache'ini güncelle
      await refetch()
      
      // Başarı mesajını göster (backend'den gelen mesajı kullan)
      if (savedCount > 0) {
        toast.success(
          message, 
          { id: 'fetch-prices', duration: 3000 }
        )
      } else if (totalInDb > 0) {
        // API başarısız ama veritabanında veri var
        toast.success(
          message, 
          { id: 'fetch-prices', duration: 3000 }
        )
      } else {
        // Hiç veri yok veya güncellenecek coin bulunamadı
        toast.error(
          message || 'Güncellenecek coin bulunamadı. Coin eklemek için "Coin Ekle" butonunu kullanın.', 
          { id: 'fetch-prices', duration: 4000 }
        )
      }
      
      // Başarılı istekten sonra kısa bir cooldown başlat (sadece 5 saniye - spam koruması için)
      setCooldownSeconds(5)
      setCooldownResetTime(null) // Reset time'ı temizle
    } catch (error) {
      // Hata yönetimi
      const errorMsg = error.response?.data?.message || error.message || 'Bir hata oluştu'
      
      // 429 hatası için özel mesaj göster
      if (error.response?.status === 429 || error.message?.includes('rate limit')) {
        // Backend'den gelen retryAfter bilgisini kullan (en güvenilir)
        let retryAfter = error.response?.data?.retryAfter
        
        // Eğer backend'den gelmediyse, resetTime'dan hesapla
        if (!retryAfter && error.response?.data?.resetTime) {
          const resetTime = new Date(error.response.data.resetTime)
          retryAfter = Math.ceil((resetTime - new Date()) / 1000)
        }
        
        // Hala yoksa header'lardan al
        if (!retryAfter) {
          retryAfter = error.response?.headers?.['retry-after'] || 
                      error.response?.headers?.['x-ratelimit-reset']
          
          // Header'dan gelen değer timestamp ise saniyeye çevir
          if (retryAfter && retryAfter > 1000000000) {
            retryAfter = Math.ceil((retryAfter * 1000 - Date.now()) / 1000)
          }
        }
        
        // Eğer hala yoksa, rate limiter'ın window süresini kullan (60 saniye)
        if (!retryAfter || retryAfter <= 0) {
          retryAfter = 60 // Backend window süresi
        }
        
        // retryAfter'ı integer'a çevir ve pozitif yap
        retryAfter = Math.max(1, Math.ceil(parseFloat(retryAfter) || 60))
        
        // Reset time varsa onu kullan, yoksa şu anki zamandan hesapla
        if (error.response?.data?.resetTime) {
          setCooldownResetTime(error.response.data.resetTime)
        } else {
          // Şu anki zamandan retryAfter kadar sonra reset olacak
          const resetTime = new Date(Date.now() + retryAfter * 1000)
          setCooldownResetTime(resetTime.toISOString())
        }
        setCooldownSeconds(retryAfter)
        
        // 429 hatası için bilgilendirici mesaj göster
        const providerName = apiProvider === 'coingecko' ? 'CoinGecko' : 'Binance'
        toast.error(
          `${providerName} API rate limit aşıldı. Lütfen ${retryAfter} saniye bekleyin veya diğer API'yi deneyin. Veritabanındaki mevcut veriler gösteriliyor.`,
          { id: 'fetch-prices', duration: 6000 }
        )
        
        // Veritabanından mevcut verileri göster
        try {
          await refetch()
        } catch (refetchError) {
          console.error('Refetch error:', refetchError)
        }
        
        setIsFetching(false)
        return
      }
      
      // Diğer hatalar için mesaj göster
      toast.error(errorMsg, { 
        id: 'fetch-prices',
        duration: 4000
      })
      
      // Hata olsa bile veritabanından mevcut verileri göster
      try {
        await refetch()
      } catch (refetchError) {
        console.error('Refetch error:', refetchError)
      }
      
      console.error('Fetch prices error:', error)
    } finally {
      setIsFetching(false)
    }
  }

  // Coin ekleme fonksiyonu (coin objesi veya symbol string alabilir)
  const handleAddCoin = async (coinSymbolOrObject) => {
    try {
      let symbol, coinId, coinName
      
      // Eğer coin objesi ise (arama sonuçlarından), ID'yi kullan
      if (typeof coinSymbolOrObject === 'object' && coinSymbolOrObject.id) {
        // ÖNEMLİ: Arama sonuçlarından gelen coin objesinin symbol'ünü kullan (en güvenilir)
        symbol = coinSymbolOrObject.symbol.toUpperCase()
        coinId = coinSymbolOrObject.id
        coinName = coinSymbolOrObject.name
        
        // Debug: Coin objesi bilgilerini logla
        console.log('🔍 Coin objesi bilgileri:', {
          id: coinId,
          symbol: symbol,
          name: coinName,
          fullObject: coinSymbolOrObject
        })
      } else {
        // String ise (manuel giriş), sadece symbol
        symbol = coinSymbolOrObject.toUpperCase()
      }
      
      // Zaten ekli mi kontrol et
      if (customCoins.includes(symbol)) {
        toast.error(`${symbol} zaten listenizde`)
        return
      }

      toast.loading(`${symbol} coin'i ekleniyor ve veritabanına kaydediliyor...`, { id: 'add-coin' })
      
      let validation
      try {
        // Coin ID varsa direkt fiyat çek, yoksa validate et
        if (coinId) {
          // ÖNEMLİ: Backend'e gönderirken de arama sonuçlarından gelen coin objesinin symbol'ünü kullan
          // Backend bu symbol'ü veritabanına kaydedecek, bu yüzden doğru olmalı
          const priceResponse = await cryptoAPI.getPriceByCoinId(coinId, symbol, true)
          validation = { data: { data: priceResponse.data.data } }
          
          // Veritabanına kaydedildi mi kontrol et
          if (priceResponse.data.data.savedToDb) {
            toast.success(`${symbol} veritabanına kaydedildi!`, { id: 'add-coin-db', duration: 2000 })
          }
        } else {
          // Symbol ile validate et ve veritabanına kaydet (saveToDb = true)
          validation = await cryptoAPI.validateCoin(symbol, true) // saveToDb = true
          
          // Veritabanına kaydedildi mi kontrol et
          if (validation.data.data.savedToDb) {
            toast.success(`${symbol} veritabanına kaydedildi!`, { id: 'add-coin-db', duration: 2000 })
          }
        }
      } catch (error) {
        // Hata durumunda tekrar symbol ile dene
        try {
          validation = await cryptoAPI.validateCoin(symbol, true)
          
          if (validation.data.data.savedToDb) {
            toast.success(`${symbol} veritabanına kaydedildi!`, { id: 'add-coin-db', duration: 2000 })
          }
        } catch (retryError) {
          // İkinci deneme de başarısız oldu
          console.error('Coin validation retry failed:', retryError)
          toast.error(`${symbol} için coin doğrulanamadı: ${retryError.response?.data?.message || retryError.message}`, { id: 'add-coin' })
          return
        }
      }
      
      if (!validation.data.data.valid) {
        toast.error(`${symbol} için coin bulunamadı veya geçersiz`, { id: 'add-coin' })
        return
      }
      
      // ÖNEMLİ: Backend artık CoinGecko'dan doğru symbol'ü alıyor, bu yüzden backend'den dönen symbol'ü kullan
      // Backend'den dönen symbol CoinGecko'dan geldiği için en güvenilir kaynak
      let finalSymbol
      if (validation.data.data.symbol) {
        // Backend'den dönen symbol'ü kullan (CoinGecko'dan alınan, en güvenilir)
        finalSymbol = validation.data.data.symbol.toUpperCase()
        console.log('✅ Backend\'den dönen symbol kullanılıyor (CoinGecko\'dan):', finalSymbol)
      } else if (coinId && coinSymbolOrObject && typeof coinSymbolOrObject === 'object') {
        // Fallback: Arama sonuçlarından gelen coin objesinin symbol'ünü kullan
        finalSymbol = coinSymbolOrObject.symbol.toUpperCase()
        console.log('⚠️ Backend symbol yok, arama sonuçlarından gelen symbol kullanılıyor:', finalSymbol)
      } else {
        // Son fallback: Manuel giriş veya orijinal symbol
        finalSymbol = symbol
        console.log('⚠️ Fallback: Orijinal symbol kullanılıyor:', finalSymbol)
      }
      
      // Debug: Backend response'unu logla
      console.log('📥 Backend response ve final symbol:', {
        validationData: validation.data.data,
        backendSymbol: validation.data.data.symbol,
        originalSymbol: symbol,
        finalSymbol: finalSymbol,
        coinId: coinId,
        coinName: coinName,
        coinObject: coinSymbolOrObject
      })
      
      // Veritabanı formatına çevir (USDT ekle) - CryptoDetailPage bunu bekliyor
      const dbSymbol = finalSymbol.toUpperCase().endsWith('USDT') 
        ? finalSymbol.toUpperCase() 
        : finalSymbol.toUpperCase() + 'USDT'
      
      // Coin başarıyla veritabanına kaydedildi
      console.log(`✅ ${dbSymbol} coin'i veritabanına kaydedildi:`, {
        finalSymbol: finalSymbol,
        dbSymbol: dbSymbol,
        originalSymbol: symbol,
        coinId: coinId,
        coinName: coinName,
        price: validation.data.data.price,
        savedToDb: validation.data.data.savedToDb
      })

      // Coin'i custom listesine ekle - USDT olmadan ekle (çünkü customCoins'de USDT olmadan tutuluyor)
      const symbolWithoutUSDT = finalSymbol.toUpperCase()
      const updatedCustomCoins = [...customCoins, symbolWithoutUSDT]
      setCustomCoins(updatedCustomCoins)
      
      // Modal'ı kapat
      setShowAddCoinModal(false)
      setCoinSearchQuery('')
      setCoinSearchResults([])
      
      // Coin veritabanına kaydedildi, şimdi fiyatları çek ve güncelle
      toast.loading(`${symbolWithoutUSDT} için fiyatlar güncelleniyor...`, { id: 'add-coin' })
      
      try {
        // ÖNEMLİ: Backend'den dönen symbol'ü kullan (CoinGecko'dan alınan, en güvenilir)
        // Backend artık CoinGecko'dan doğru symbol'ü alıyor ve veritabanına kaydediyor
        const savedSymbol = validation.data.data.symbol || finalSymbol
        const savedDbSymbol = savedSymbol.toUpperCase().endsWith('USDT') 
          ? savedSymbol.toUpperCase() 
          : savedSymbol.toUpperCase() + 'USDT'
        
        // Yönlendirme için backend'den dönen symbol'ü kullan (CoinGecko'dan alınan)
        const navigationSymbol = dbSymbol // finalSymbol'den oluşturulan dbSymbol (backend'den gelen)
        
        console.log('🎯 Yönlendirme için symbol kontrolü (fetch öncesi):', {
          coinObjectSymbol: coinSymbolOrObject?.symbol,
          finalSymbol: finalSymbol,
          dbSymbol: dbSymbol,
          savedSymbol: savedSymbol,
          savedDbSymbol: savedDbSymbol,
          navigationSymbol: navigationSymbol,
          backendResponse: validation.data.data,
          coinId: coinId,
          coinName: coinName
        })
        
        // Custom coin'ler için fiyatları çek ve veritabanına kaydet
        const fetchResponse = await cryptoAPI.fetchAndSavePrices(apiProvider, updatedCustomCoins)
        
        // Veritabanından güncel verileri çek (yeni eklenen coin dahil)
        await refetch()
        
        // History'leri de güncelle
        try {
          const historyResponse = await cryptoAPI.getKlinesBatch(updatedCustomCoins, '4h', 42)
          const historiesData = historyResponse.data.data || {}
          
          const histories = {}
          Object.keys(historiesData).forEach(sym => {
            histories[sym] = historiesData[sym]
              .map((item) => ({
                time: new Date(item.time).toLocaleTimeString('tr-TR', {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
                price: parseFloat(item.close),
              }))
          })
          
          setPriceHistoryMap(histories)
        } catch (histError) {
          console.error('Error fetching histories:', histError)
        }
        
        toast.success(
          `${symbolWithoutUSDT} başarıyla eklendi! Coin detay sayfasında "Bilgileri Düzenle" butonuna tıklayarak açıklama, logo ve diğer bilgileri ekleyebilirsiniz.`, 
          { 
            id: 'add-coin', 
            duration: 6000
          }
        )
        
        // Kullanıcıyı coin detay sayfasına yönlendir - arama sonuçlarından gelen coin objesinin symbol'ünü kullan
        setTimeout(() => {
          console.log(`🚀 Yönlendirme yapılıyor: /crypto/${navigationSymbol} (coin: ${coinName}, coinId: ${coinId})`)
          navigate(`/crypto/${navigationSymbol}`)
        }, 1500) // 1.5 saniye sonra yönlendir
      } catch (fetchError) {
        // Fiyat çekme hatası olsa bile coin eklendi, sadece uyarı ver
        console.error('Price fetch error:', fetchError)
        toast.success(
          `${symbolWithoutUSDT} eklendi! Coin detay sayfasında "Bilgileri Düzenle" butonuna tıklayarak açıklama, logo ve diğer bilgileri ekleyebilirsiniz.`, 
          { 
            id: 'add-coin', 
            duration: 6000
          }
        )
        
        // Kullanıcıyı coin detay sayfasına yönlendir - arama sonuçlarından gelen coin objesinin symbol'ünü kullan
        setTimeout(() => {
          console.log(`🚀 Yönlendirme yapılıyor (hata durumunda): /crypto/${navigationSymbol} (coin: ${coinName}, coinId: ${coinId})`)
          navigate(`/crypto/${navigationSymbol}`)
        }, 1500) // 1.5 saniye sonra yönlendir
        // Veritabanından mevcut verileri çek
        await refetch()
      }
    } catch (error) {
      toast.error(`Coin eklenirken hata oluştu: ${error.message}`, { id: 'add-coin' })
    }
  }

  // Coin silme fonksiyonu (veritabanından da siler)
  const handleRemoveCoin = async (coinSymbol) => {
    try {
      // Kullanıcıya onay sor
      const confirmed = window.confirm(
        `${coinSymbol} coin'ini listeden kaldırmak ve veritabanından silmek istediğinizden emin misiniz?\n\n` +
        `⚠️ Bu işlem geri alınamaz ve tüm geçmiş fiyat verileri silinecektir.`
      )
      
      if (!confirmed) {
        return
      }

      toast.loading(`${coinSymbol} coin'i veritabanından siliniyor...`, { id: 'remove-coin' })
      
      // Veritabanından sil
      try {
        const deleteResponse = await cryptoAPI.deleteCoin(coinSymbol)
        const deletedCount = deleteResponse.data.data.deletedCount
        
        // Listeden kaldır
        const updatedCustomCoins = customCoins.filter(c => c !== coinSymbol)
        setCustomCoins(updatedCustomCoins)
        
        // Veritabanından güncel verileri çek
        await refetch()
        
        toast.success(
          `${coinSymbol} başarıyla silindi! (${deletedCount} kayıt veritabanından kaldırıldı)`, 
          { id: 'remove-coin', duration: 3000 }
        )
      } catch (error) {
        // Veritabanı silme hatası olsa bile listeden kaldır
        console.error('Error deleting coin from database:', error)
        const updatedCustomCoins = customCoins.filter(c => c !== coinSymbol)
        setCustomCoins(updatedCustomCoins)
        
        toast.error(
          `${coinSymbol} listeden kaldırıldı ancak veritabanından silinirken hata oluştu: ${error.message}`, 
          { id: 'remove-coin', duration: 4000 }
        )
      }
    } catch (error) {
      toast.error(`Coin silinirken hata oluştu: ${error.message}`, { id: 'remove-coin' })
    }
  }

  // Loading state - sadece cache'de veri yoksa ve ilk yüklemede göster
  // Cache'de veri varsa göster, arka planda güncelle
  if (isLoading && !pricesData?.data?.data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
        <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary-500/60 via-primary-400/55 to-primary-200/55 dark:from-primary-700/55 dark:via-primary-600/55 dark:to-primary-500/45 rounded-full blur-3xl opacity-60 animate-pulse-slow"></div>
          <div className="relative">
            <LoadingSpinner size="xl" />
          </div>
        </div>
        <p className="mt-8 text-xl text-gray-700 dark:text-gray-200 font-bold animate-pulse bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">
          Veriler yükleniyor...
        </p>
      </div>
    )
  }

  // Error state kontrolü - 429 hatası durumunda cache'deki verileri göster
  const is429Error = error?.response?.status === 429
  const is503Error = error?.response?.status === 503 // Veritabanı bağlantı hatası
  const hasCachedData = pricesData?.data?.data && pricesData.data.data.length > 0
  
  // 429 hatası durumunda cache'deki verileri göster (error state gösterme)
  // keepPreviousData sayesinde cache'deki veriler gösterilecek
  // Sadece cache'de veri yoksa ve 429 hatası değilse error state göster
  if (isError && !hasCachedData && !is429Error) {
    const errorMessage = is503Error 
      ? 'Veritabanı bağlantısı başarısız. PostgreSQL servisinin çalıştığından emin olun.'
      : error?.response?.data?.message || error?.message || 'Veritabanından veri çekilirken bir hata oluştu.'
    
    return (
      <div className="flex flex-col items-center justify-center h-96 animate-fade-in">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md">
          <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-3">
            {is503Error ? 'Veritabanı Bağlantı Hatası' : 'Veri Yüklenemedi'}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {errorMessage}
          </p>
          {is503Error && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3 mb-4">
              <p className="text-xs text-yellow-800 dark:text-yellow-300">
                💡 <strong>Çözüm:</strong> PostgreSQL servisinin çalıştığından ve bağlantı bilgilerinin doğru olduğundan emin olun.
              </p>
            </div>
          )}
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    )
  }
  
  // 429 hatası durumunda uyarı göster ama verileri de göster (keepPreviousData sayesinde)
  const show429Warning = is429Error && hasCachedData

  return (
    <div className="space-y-8 animate-fade-in relative" style={{ transformStyle: 'preserve-3d' }}>
      {/* Deep background layers for 3D depth effect */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        {/* Layer 1 - Deepest */}
        <div className="absolute inset-0 mesh-gradient opacity-30 parallax-bg"></div>
        
        {/* Layer 2 - Mid depth */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-400/25 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-300/25 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-200/25 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }}></div>
        
        {/* Layer 3 - Surface depth */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-amber-300/12 rounded-full blur-2xl animate-float" style={{ animationDelay: '4s' }}></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-orange-200/12 rounded-full blur-2xl animate-float" style={{ animationDelay: '5s' }}></div>
      </div>
      {/* 429 Rate Limit uyarısı */}
      {show429Warning && (
        <div className="glass border border-amber-300/50 dark:border-amber-600/50 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
            </div>
            <div>
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                Rate Limit: Cache'deki veriler gösteriliyor
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-0.5">
                Yeni veriler için birkaç saniye bekleyin
              </p>
            </div>
          </div>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-yellow-500/90 hover:bg-yellow-500 text-white rounded-lg text-xs font-medium transition-colors duration-200 shadow-sm"
          >
            Yenile
          </button>
        </div>
      )}
      
      {/* Üst panel: başlık + kontroller */}
      <div className="glass rounded-2xl shadow-xl border border-white/20 dark:border-gray-600/40 overflow-hidden">
        <div className="p-6 md:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3 mb-2">
                <CryptoLogo size="md" />
                Kripto Para Fiyatları
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base">
                {prices.length > 0 ? (
                  <><span className="font-semibold text-primary-600 dark:text-primary-400">{prices.length}</span> kripto para canlı takip ediliyor</>
                ) : (
                  'Fiyatları güncelleyerek listeyi doldurun'
                )}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setShowAddCoinModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white rounded-xl text-sm font-medium transition-colors shadow-md hover:shadow-lg"
              >
                <Plus className="w-4 h-4" />
                Coin Ekle
              </button>
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 text-xs font-medium">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                {DEFAULT_BINANCE_COINS.length} varsayılan + {customCoins.length} özel = <span className="font-semibold">{allDisplayCoins.length} coin</span>
              </div>
              {customCoins.length > 0 && (
                <button
                  onClick={() => {
                    if (confirm('Tüm özel coin\'leri kaldırmak istediğinize emin misiniz?')) {
                      setCustomCoins([])
                      toast.success('Tüm özel coin\'ler kaldırıldı')
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-medium transition-colors"
                  title="Özel coin'leri temizle"
                >
                  <X className="w-3.5 h-3.5" /> Temizle
                </button>
              )}
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
                <label className="text-xs text-gray-500 dark:text-gray-400">API</label>
                <select
                  value={apiProvider}
                  onChange={(e) => {
                    const newProvider = e.target.value
                    const oldProvider = apiProvider
                    setApiProvider(newProvider)
                    setCooldownSeconds(0)
                    setCooldownResetTime(null)
                    setIsFetching(false)
                    if (oldProvider !== newProvider) {
                      toast.success(`API: ${newProvider === 'binance' ? 'Binance' : 'CoinGecko'}`, { duration: 3000 })
                    }
                  }}
                  disabled={isFetching}
                  className="bg-transparent text-gray-800 dark:text-gray-200 font-medium text-xs border-0 focus:ring-0 cursor-pointer"
                  title={apiProvider === 'binance' ? 'Binance erişilemiyorsa CoinGecko seçin' : 'Fiyatlar CoinGecko üzerinden güncellenir'}
                >
                  <option value="binance">Binance</option>
                  <option value="coingecko">CoinGecko</option>
                </select>
              </div>
              <button
                onClick={handleFetchPrices}
                disabled={isFetching || cooldownSeconds > 0}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isFetching || cooldownSeconds > 0
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-800 dark:bg-gray-700 text-white hover:bg-gray-700 dark:hover:bg-gray-600'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                {isFetching ? 'Güncelleniyor...' : cooldownSeconds > 0 ? `Bekle (${cooldownSeconds}s)` : 'Güncelle'}
              </button>
              {cooldownSeconds > 0 && (
                <span className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                  Rate limit
                </span>
              )}
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span>Veritabanı aktif</span>
            {prices.length > 0 && <span>• {prices.length} coin takip ediliyor</span>}
            <span className="hidden sm:inline">• Otomatik kayıt ve fiyat takibi açık</span>
          </div>
        </div>
      </div>

      {/* Crypto Cards Grid */}
      {prices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 glass rounded-3xl shadow-2xl border-2 border-white/30 animate-fade-in relative overflow-hidden">
          {/* Background effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary-50/70 via-primary-100/65 to-primary-50/70 dark:from-primary-900/24 dark:via-primary-800/20 dark:to-primary-700/18"></div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-200/35 dark:bg-primary-800/25 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary-100/35 dark:bg-primary-700/25 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
          
          <div className="relative z-10">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-primary-300/55 dark:bg-primary-700/50 rounded-full blur-3xl opacity-60 animate-pulse-slow"></div>
              <div className="relative text-9xl animate-bounce-slow drop-shadow-2xl">📊</div>
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Henüz veri yok
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md text-sm">
              Kripto para fiyatlarını görmek için fiyatları güncelleyin
            </p>
            <button
              onClick={handleFetchPrices}
              disabled={isFetching || cooldownSeconds > 0}
              className={`group px-6 py-3 rounded-lg transition-all duration-200 shadow-sm font-medium text-sm flex items-center space-x-2 border ${
                isFetching || cooldownSeconds > 0
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed border-gray-300 dark:border-gray-600'
                  : 'bg-primary-600 hover:bg-primary-700 text-white hover:shadow-md border-primary-700'
              }`}
            >
              <RefreshCw 
                className={`w-4 h-4 transition-transform duration-300 ${
                  isFetching ? 'animate-spin' : 'group-hover:rotate-180'
                }`} 
              />
              <span>
                {isFetching 
                  ? 'Güncelleniyor...' 
                  : cooldownSeconds > 0 
                    ? `Bekle (${cooldownSeconds}s)` 
                    : 'Fiyatları Çek'
                }
              </span>
            </button>
            {cooldownSeconds > 0 && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 font-normal">
                Rate limit koruması: {cooldownSeconds} saniye kaldı
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="glass rounded-2xl shadow-xl border border-white/20 dark:border-gray-600/40 overflow-hidden">
          <div className="relative px-6 py-5 border-b border-primary-200 dark:border-primary-600/50 overflow-hidden bg-primary-100/90 dark:bg-primary-900/50">
            <div className="absolute bottom-0 left-0 right-0 h-px bg-primary-300/60 dark:bg-primary-600/40 pointer-events-none" />
            <div className="relative flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-500/25 dark:bg-primary-500/35 text-primary-600 dark:text-primary-400">
                <BarChart3 size={22} strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Kripto Paralar</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Piyasa sıralamasına göre listelenmiştir</p>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-200 dark:border-gray-700 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider w-12">#</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider w-24">24h %</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider w-24">7d %</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider min-w-[120px]">Price</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider w-36">Price Graph (7D)</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900/30 divide-y divide-gray-100 dark:divide-gray-700/50">
                {prices.map((crypto, index) => {
            // Eğer coin yükleniyorsa (veritabanında yok), loading göster
            if (crypto._isLoading) {
              return (
                <tr key={crypto.name} className="bg-white dark:bg-gray-900/30">
                  <td className="px-4 py-3"><div className="h-4 w-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                      <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right"><div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse ml-auto" /></td>
                  <td className="px-4 py-3 text-right"><div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse ml-auto" /></td>
                  <td className="px-4 py-3 text-right"><div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse ml-auto" /></td>
                  <td className="px-4 py-3"><div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded mx-auto animate-pulse" /></td>
                </tr>
              )
            }
            
            const history = priceHistoryMap[crypto.name] || []
            // Gerçek 24 saatlik değişim (Binance) varsa onu kullan, yoksa history'den hesapla
            const real24h = change24hMap[crypto.name]
            const priceChange = (real24h != null && real24h !== undefined)
              ? real24h
              : (history.length >= 2
                ? ((history[history.length - 1]?.price || 0) - (history[0]?.price || 0)) / (history[0]?.price || 1) * 100
                : 0)
            const isPositive = priceChange >= 0
            const isZeroChange = Math.abs(priceChange) < 0.005
            const has24hValue = (real24h != null && real24h !== undefined) || history.length >= 2
            const real7d = change7dMap[crypto.name]
            const change7d = (real7d != null && real7d !== undefined) ? real7d : 0
            const is7dPositive = change7d >= 0
            const is7dZero = Math.abs(change7d) < 0.005
            const has7dValue = (real7d != null && real7d !== undefined)
            
            // Calculate Y-axis domain to emphasize trend direction
            const yAxisDomain = history.length >= 2
              ? (() => {
                  const prices = history.map(h => h.price).filter(p => p != null && p > 0)
                  if (prices.length === 0) return [0, 100]
                  const minPrice = Math.min(...prices)
                  const maxPrice = Math.max(...prices)
                  const priceRange = maxPrice - minPrice
                  // Add padding to make trend more visible (10% of range on each side)
                  const padding = priceRange * 0.1 || (maxPrice * 0.01)
                  return [minPrice - padding, maxPrice + padding]
                })()
              : [0, 100]
            
            // Veri durumu kontrolü
            const hasPrice = crypto.price && crypto.price > 0
            const hasHistory = history.length > 0
            const hasEnoughHistory = history.length >= 2
            const priceDate = crypto.binancetime ? new Date(crypto.binancetime) : null
            const isPriceStale = priceDate ? (Date.now() - priceDate.getTime()) > 24 * 60 * 60 * 1000 : false // 24 saatten eski

            return (
              <tr
                key={crypto.name}
                onClick={() => navigate(`/crypto/${crypto.name}`)}
                className="group cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-500 dark:text-gray-400">
                  {index + 1}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-lg font-bold text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600">
                      {getCryptoIcon(crypto.name)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors truncate">
                        {getCryptoName(crypto.name)} <span className="text-gray-500 dark:text-gray-400 font-medium">• {crypto.name}</span>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  {has24hValue ? (
                    <span className={`text-sm font-semibold ${
                      isZeroChange ? 'text-gray-500 dark:text-gray-400' : isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {isZeroChange ? '0.00' : (isPositive ? '+' : '') + priceChange.toFixed(2)}%
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  {has7dValue ? (
                    <span className={`text-sm font-semibold ${
                      is7dZero ? 'text-gray-500 dark:text-gray-400' : is7dPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {is7dZero ? '0.00' : (is7dPositive ? '+' : '') + change7d.toFixed(2)}%
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  {hasPrice ? (
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">${formatPrice(crypto.price)}</span>
                  ) : (
                    <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {hasEnoughHistory ? (
                    <div className="h-9 w-28 mx-auto bg-gray-50 dark:bg-gray-800/50 rounded-md p-1 border border-gray-100 dark:border-gray-700/50">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={history} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                          <defs>
                            <linearGradient id={`gradient-table-${crypto.name}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={isZeroChange ? '#6b7280' : isPositive ? '#10b981' : '#ef4444'} stopOpacity={isZeroChange ? 0.25 : 0.4}/>
                              <stop offset="95%" stopColor={isZeroChange ? '#6b7280' : isPositive ? '#10b981' : '#ef4444'} stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <YAxis hide domain={yAxisDomain} />
                          <XAxis hide />
                          <Area
                            type="monotone"
                            dataKey="price"
                            stroke="none"
                            fill={`url(#gradient-table-${crypto.name})`}
                            isAnimationActive={true}
                            animationDuration={1000}
                          />
                          <Line
                            type="monotone"
                            dataKey="price"
                            stroke={isZeroChange ? '#6b7280' : isPositive ? '#10b981' : '#ef4444'}
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={true}
                            animationDuration={1000}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-9 w-28 mx-auto flex items-center justify-center bg-gray-50 dark:bg-gray-800/30 rounded-md border border-gray-100 dark:border-gray-700/50">
                      <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Coin Info Modal */}
      {showCoinInfoModal && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="glass border-2 border-white/20 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-scale-in my-8">
            {isLoadingCoinInfo ? (
              <div className="flex flex-col items-center justify-center p-16">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-primary-300/50 dark:bg-primary-700/50 rounded-full blur-2xl opacity-60 animate-pulse-slow"></div>
                  <LoadingSpinner size="lg" />
                </div>
                <p className="mt-4 text-lg text-gray-700 dark:text-gray-200 font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
                  Coin bilgileri yükleniyor...
                </p>
              </div>
            ) : selectedCoinInfo ? (
              <>
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-primary-600 via-purple-600 to-pink-600 p-8 text-white sticky top-0 z-10 rounded-t-3xl shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-5">
                      {selectedCoinInfo.image && (
                        <div className="relative">
                          <img src={selectedCoinInfo.image} alt={selectedCoinInfo.name} className="w-16 h-16 rounded-2xl border-4 border-white/30 shadow-xl" />
                          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl"></div>
                        </div>
                      )}
                      <div>
                        <h2 className="text-3xl font-extrabold drop-shadow-lg">{selectedCoinInfo.name}</h2>
                        <p className="text-white/90 font-semibold text-lg">{selectedCoinInfo.symbol}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowCoinInfoModal(false)}
                      className="hover:bg-white/20 rounded-xl p-2.5 transition-all duration-300 hover:scale-110 hover:rotate-90"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                {/* Modal Content */}
                <div className="p-6 space-y-6 overflow-y-auto flex-grow">
                  {/* Genel Bakış */}
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                      {selectedCoinInfo.name} için Genel Bakış
                    </h3>
                    {selectedCoinInfo.description && (
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                        {selectedCoinInfo.description}
                      </p>
                    )}
                    {selectedCoinInfo.circulatingSupply > 0 && (
                      <p className="text-gray-700 dark:text-gray-300">
                        {selectedCoinInfo.name} ({selectedCoinInfo.symbol}){selectedCoinInfo.categories && selectedCoinInfo.categories.length > 0 ? `, ${selectedCoinInfo.categories[0]}` : ''} platformunda çalışan bir kripto paradır. {selectedCoinInfo.name}, dolaşımda {new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 3 }).format(selectedCoinInfo.circulatingSupply)} olan mevcut {new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 3 }).format(selectedCoinInfo.totalSupply)} kaynağa sahiptir. Bilinen son {selectedCoinInfo.name} fiyatı {selectedCoinInfo.currentPrice?.try > 0 ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(selectedCoinInfo.currentPrice.try) : selectedCoinInfo.currentPrice?.usd ? `$${formatPrice(selectedCoinInfo.currentPrice.usd)}` : 'N/A'} ve son 24 saat içinde fiyat %{selectedCoinInfo.priceChange24h != null ? (selectedCoinInfo.priceChange24h >= 0 ? '+' : '') + selectedCoinInfo.priceChange24h.toFixed(3) : '0.000'} {selectedCoinInfo.priceChange24h != null && selectedCoinInfo.priceChange24h >= 0 ? 'yükseldi' : 'düştü'}.
                      </p>
                    )}
                  </div>

                  {/* Teknik Detaylar */}
                  {(selectedCoinInfo.technology || selectedCoinInfo.consensus || selectedCoinInfo.maxSupply || selectedCoinInfo.blockTime) && (
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-600">
                      <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                        <span className="mr-2">⚙️</span>
                        Teknik Detaylar
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedCoinInfo.technology && (
                          <div>
                            <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Teknoloji</p>
                            <p className="text-gray-900 dark:text-gray-100 font-medium">{selectedCoinInfo.technology}</p>
                          </div>
                        )}
                        {selectedCoinInfo.consensus && (
                          <div>
                            <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Konsensüs Mekanizması</p>
                            <p className="text-gray-900 dark:text-gray-100 font-medium">{selectedCoinInfo.consensus}</p>
                          </div>
                        )}
                        {selectedCoinInfo.maxSupply !== null && selectedCoinInfo.maxSupply !== undefined && (
                          <div>
                            <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Maksimum Arz</p>
                            <p className="text-gray-900 dark:text-gray-100 font-medium">
                              {selectedCoinInfo.maxSupply 
                                ? new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(selectedCoinInfo.maxSupply)
                                : 'Sınırsız'}
                            </p>
                          </div>
                        )}
                        {selectedCoinInfo.blockTime && (
                          <div>
                            <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Blok Süresi</p>
                            <p className="text-gray-900 dark:text-gray-100 font-medium">{selectedCoinInfo.blockTime}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Linkler */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedCoinInfo.homepage && (
                      <a
                        href={selectedCoinInfo.homepage}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      >
                        <ExternalLink className="w-5 h-5 text-primary-600" />
                        <span className="font-semibold text-gray-900 dark:text-gray-100">Resmi web sitesi</span>
                      </a>
                    )}
                    {selectedCoinInfo.whitepaper && (
                      <a
                        href={selectedCoinInfo.whitepaper}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      >
                        <FileText className="w-5 h-5 text-primary-600" />
                        <span className="font-semibold text-gray-900 dark:text-gray-100">Teknik belge</span>
                      </a>
                    )}
                  </div>

                  {/* Pazar Bilgileri */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {selectedCoinInfo.marketCapRank && (
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-xl">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Pazar Sıralaması</p>
                        <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">#{selectedCoinInfo.marketCapRank}</p>
                      </div>
                    )}
                    {selectedCoinInfo.categories && selectedCoinInfo.categories.length > 0 && (
                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-4 rounded-xl">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Kategori</p>
                        <p className="text-lg font-bold text-purple-700 dark:text-purple-300 capitalize">{selectedCoinInfo.categories[0]}</p>
                      </div>
                    )}
                    {selectedCoinInfo.marketCapDominance && (
                      <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-xl">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Piyasa Hakimiyeti</p>
                        <p className="text-2xl font-bold text-green-700 dark:text-green-300">{selectedCoinInfo.marketCapDominance}%</p>
                      </div>
                    )}
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 p-4 rounded-xl">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">24 Saat Değişim</p>
                      <p className={`text-2xl font-bold ${selectedCoinInfo.priceChange24h != null && selectedCoinInfo.priceChange24h >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                        {selectedCoinInfo.priceChange24h != null ? (selectedCoinInfo.priceChange24h >= 0 ? '+' : '') + selectedCoinInfo.priceChange24h.toFixed(2) : '0.00'}%
                      </p>
                    </div>
                  </div>

                  {/* Daha Fazla Bilgi */}
                  {selectedCoinInfo.id && (
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                        Daha fazla bilgi için <a href={`https://www.coingecko.com/en/coins/${selectedCoinInfo.id}`} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">CoinGecko</a> sayfasını ziyaret edin.
                      </p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="p-12 text-center">
                <p className="text-gray-600 dark:text-gray-300">Coin bilgileri yüklenemedi.</p>
                <button
                  onClick={() => setShowCoinInfoModal(false)}
                  className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Kapat
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Coin Ekleme Modal - Modern Design */}
      {showAddCoinModal && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="glass border-2 border-white/20 dark:border-gray-700/30 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-scale-in bg-white/95 dark:bg-gray-900/95">
            {/* Modal Header - Modern Design */}
            <div className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-primary-500 dark:from-[#071428] dark:via-[#07283b] dark:to-[#0b3650] p-6 gradient-animated">
              <div className="absolute inset-0 bg-black/10 dark:bg-black/20"></div>
              <div className="absolute inset-0 mesh-gradient opacity-30"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/30 shadow-lg">
                      <Plus className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-extrabold text-white drop-shadow-lg">Coin Ekle</h2>
                      <p className="text-white/80 text-sm mt-0.5">Takip etmek istediğiniz coin'i arayın</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowAddCoinModal(false)
                      setCoinSearchQuery('')
                      setCoinSearchResults([])
                    }}
                    className="hover:bg-white/20 rounded-xl p-2.5 transition-all duration-300 hover:scale-110 hover:rotate-90"
                  >
                    <X className="w-6 h-6 text-white" />
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Body - Modern Design */}
            <div className="p-6 bg-white/50 dark:bg-gray-900/50">
              {/* Arama Input - Modern Design */}
              <div className="relative mb-6">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5 z-10" />
                  <input
                    type="text"
                    value={coinSearchQuery}
                    onChange={(e) => setCoinSearchQuery(e.target.value)}
                    placeholder="Coin adı veya symbol (örn: Bitcoin, BTC, ETH)"
                    className="w-full pl-12 pr-12 py-3.5 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-primary-500 dark:focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:focus:ring-primary-400/20 transition-all text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm hover:shadow-md"
                    autoFocus
                  />
                  {isSearching && (
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary-500 border-t-transparent"></div>
                    </div>
                  )}
                </div>
              </div>

              {/* Arama Sonuçları */}
              {coinSearchResults.length > 0 && (
                <CoinSearchResults 
                  results={coinSearchResults}
                  customCoins={customCoins}
                  onAddCoin={handleAddCoin}
                  formatPrice={formatPrice}
                />
              )}

              {/* Manuel Giriş - Modern Design */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-5 mt-5">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Veya manuel olarak symbol girin:
                </label>
                <div className="flex space-x-3">
                  <input
                    type="text"
                    value={coinSearchQuery}
                    onChange={(e) => setCoinSearchQuery(e.target.value)}
                    placeholder="BTC, ETH, SOL..."
                    className="flex-1 px-4 py-2.5 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-primary-500 dark:focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:focus:ring-primary-400/20 transition-all text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && coinSearchQuery.trim()) {
                        handleAddCoin(coinSearchQuery.trim())
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (coinSearchQuery.trim()) {
                        handleAddCoin(coinSearchQuery.trim())
                      }
                    }}
                    disabled={!coinSearchQuery.trim() || isSearching}
                    className="px-6 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 dark:from-primary-600 dark:to-primary-700 text-white rounded-xl hover:from-primary-700 hover:to-primary-800 dark:hover:from-primary-700 dark:hover:to-primary-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg hover:shadow-xl"
                  >
                    Ekle
                  </button>
                </div>
              </div>

              {/* Varsayılan Binance Coinleri - Modern Design */}
              <div className="mt-6 p-5 bg-gradient-to-br from-green-50/80 to-emerald-50/80 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border-2 border-green-200/50 dark:border-green-800/50 backdrop-blur-sm shadow-md">
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-3 flex items-center space-x-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span>Varsayılan Binance Coinleri ({DEFAULT_BINANCE_COINS.length})</span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_BINANCE_COINS.map((coin) => (
                    <span
                      key={coin}
                      className="px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-semibold border border-green-300 dark:border-green-700 shadow-sm hover:shadow-md transition-shadow"
                    >
                      {coin}
                    </span>
                  ))}
                </div>
              </div>

              {/* Özel Eklenen Coin'ler - Modern Design */}
              {customCoins.length > 0 && (
                <div className="mt-4 p-5 bg-gradient-to-br from-primary-50/80 to-blue-50/80 dark:from-primary-900/20 dark:to-blue-900/20 rounded-xl border-2 border-primary-200/50 dark:border-primary-800/50 backdrop-blur-sm shadow-md">
                  <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-3 flex items-center space-x-2">
                    <span className="w-2 h-2 bg-primary-500 rounded-full"></span>
                    <span>Özel Eklenen Coin'ler ({customCoins.length})</span>
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {customCoins.map((coin) => (
                      <div
                        key={coin}
                        className="flex items-center space-x-2 bg-white dark:bg-gray-800 text-primary-700 dark:text-primary-400 px-3 py-1.5 rounded-lg border border-primary-300 dark:border-primary-700 shadow-sm hover:shadow-md transition-all group"
                      >
                        <span className="font-semibold text-sm">{coin}</span>
                        <button
                          onClick={() => handleRemoveCoin(coin)}
                          className="hover:bg-primary-100 dark:hover:bg-primary-900/50 rounded p-0.5 transition-colors opacity-70 group-hover:opacity-100"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DashboardPage


