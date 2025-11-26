import { useState, useEffect } from 'react'
import { useQuery } from 'react-query'
import { useNavigate } from 'react-router-dom'
import { cryptoAPI } from '../../services/api'
import LoadingSpinner from '../../components/Common/LoadingSpinner'
import { TrendingUp, TrendingDown, RefreshCw, ArrowRight, Plus, X, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { LineChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

// Varsayılan Binance coinleri (backend constants.js ile aynı)
const DEFAULT_BINANCE_COINS = [
  "BTC", "ETH", "BCC", "NEO", "LTC", "QTUM", "ADA",
  "XRP", "EOS", "TUSD", "IOTA", "XLM", "ONT", "TRX",
  "ETC", "ICX", "VEN", "NULS", "VET", "PAX", "BCHABC",
  "BCHSV", "USDC", "LINK", "WAVES", "BTT", "USDS", "ONG",
  "HOT", "ZIL", "ZRX", "FET", "BAT", "XMR", "ZEC",
  "IOST", "CELR", "DASH", "NANO", "OMG", "THETA",
  "ENJ", "MITH", "MATIC", "ATOM", "TFUEL", "ONE",
  "FTM", "ALGO"
]

// Coin Search Results Component (fiyat gösterimi için)
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
    <div className="max-h-64 overflow-y-auto space-y-2 mb-4">
      {results.map((coin) => {
        const isAdded = customCoins.includes(coin.symbol.toUpperCase())
        const price = priceMap[coin.id]
        const isLoading = loadingPrices[coin.id]
        
        return (
          <button
            key={coin.id}
            onClick={() => !isAdded && onAddCoin(coin)} // Coin objesini gönder
            onMouseEnter={() => !price && !isLoading && loadPrice(coin.symbol, coin.id)}
            disabled={isAdded}
            className={`w-full flex items-center space-x-3 p-3 rounded-xl border-2 transition-all hover:shadow-lg ${
              isAdded
                ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                : 'border-gray-200 hover:border-primary-500 hover:bg-primary-50'
            }`}
          >
            {coin.thumb && (
              <img src={coin.thumb} alt={coin.name} className="w-8 h-8 rounded-full" />
            )}
            <div className="flex-1 text-left">
              <div className="font-semibold text-gray-900 dark:text-gray-100">{coin.name}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{coin.symbol.toUpperCase()}</div>
              {price && (
                <div className="text-xs font-semibold text-primary-600 mt-1">
                  ${formatPrice(price)}
                </div>
              )}
              {isLoading && (
                <div className="text-xs text-gray-400 mt-1">Fiyat yükleniyor...</div>
              )}
            </div>
            {isAdded && (
              <span className="text-xs text-gray-400">Ekli</span>
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
  const [apiProvider, setApiProvider] = useState('coingecko') // 'binance' veya 'coingecko'
  const [cooldownSeconds, setCooldownSeconds] = useState(0) // Cooldown süresi
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

  // Tüm gösterilecek coinler: varsayılan Binance coinleri + custom coinler
  const allDisplayCoins = [...new Set([...DEFAULT_BINANCE_COINS, ...customCoins])]
  
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
  const allPrices = pricesData?.data?.data || []
  
  // Varsayılan coinler + custom coinler için filtrele
  let prices = allPrices.filter(p => {
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
      prices.push({
        name: coin + 'USDT',
        price: null, // Henüz fiyat yok
        binancetime: new Date(),
        _isLoading: true // Yükleniyor işareti
      })
    })
  }

  useEffect(() => {
    if (prices.length > 0 && !isFetching) {
      // Batch endpoint kullanarak tüm history'leri tek istekle çek
      // Sadece gösterilen coinler için (performans için)
      // handleFetchPrices sırasında çalışmasın (orada zaten çekiliyor)
      const fetchHistories = async () => {
        try {
          // Gösterilen coinler için history çek
          const response = await cryptoAPI.getAllPriceHistories(20, allDisplayCoins)
          const historiesData = response.data.data || {}
          
          // Verileri formatla
          const formattedHistories = {}
          Object.keys(historiesData).forEach(symbol => {
            if (Array.isArray(historiesData[symbol]) && historiesData[symbol].length > 0) {
              formattedHistories[symbol] = historiesData[symbol]
              .map((item) => ({
                time: new Date(item.binancetime).toLocaleTimeString('tr-TR', {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
                price: parseFloat(item.price),
              }))
              .reverse()
            }
          })
          
          setPriceHistoryMap(formattedHistories)
          } catch (error) {
          console.error('Error fetching histories:', error)
          // Hata durumunda mevcut history'leri koru (boş map set etme)
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
  }, [prices, allDisplayCoins, isFetching])

  // Custom coin'leri localStorage'a kaydet
  useEffect(() => {
    localStorage.setItem('customCoins', JSON.stringify(customCoins))
  }, [customCoins])

  // Cooldown timer'ı başlat
  useEffect(() => {
    if (cooldownSeconds > 0) {
      const timer = setTimeout(() => {
        setCooldownSeconds(cooldownSeconds - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [cooldownSeconds])

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
      const cooldownTime = apiProvider === 'coingecko' ? 60 : 30 // CoinGecko: 60s, Binance: 30s
      
      toast.loading(`${providerName} API'den fiyatlar çekiliyor...`, { id: 'fetch-prices' })
      
      // 1. Seçilen API'den fiyatları çek ve veritabanına kaydet (paralel olarak başlat)
      const customSymbols = allDisplayCoins.length > 0 ? allDisplayCoins : null
      const fetchPromise = cryptoAPI.fetchAndSavePrices(apiProvider, customSymbols)
      
      // 2. Paralel olarak veritabanından en güncel fiyatları ve history'leri çek
      // API fetch tamamlanmasını beklemeden veritabanından veri çek (daha hızlı)
      const [response, updatedPricesResponse, historyResponse] = await Promise.allSettled([
        fetchPromise,
        cryptoAPI.getLatestPricesFromDB(customSymbols), // Sadece gösterilen coinler için
        cryptoAPI.getAllPriceHistories(20, customSymbols) // Sadece gösterilen coinler için
      ])
      
      // API fetch sonucunu kontrol et
      if (response.status === 'rejected' && response.reason?.response?.status !== 429) {
        throw response.reason
      }
      
      // Veritabanı verilerini al
      const updatedPrices = updatedPricesResponse.status === 'fulfilled' 
        ? (updatedPricesResponse.value.data.data || [])
        : []
      
      // History verilerini formatla (hızlı)
      if (historyResponse.status === 'fulfilled') {
        const historiesData = historyResponse.value.data.data || {}
        const histories = {}
        Object.keys(historiesData).forEach(symbol => {
          if (Array.isArray(historiesData[symbol]) && historiesData[symbol].length > 0) {
            histories[symbol] = historiesData[symbol]
              .map((item) => ({
                time: new Date(item.binancetime).toLocaleTimeString('tr-TR', {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
                price: parseFloat(item.price),
              }))
              .reverse()
          }
        })
        setPriceHistoryMap(histories)
      }
      
      // 3. React Query cache'ini güncelle (async, beklemeden devam et)
      refetch()
      
      toast.success(
        `${updatedPrices.length} kripto para fiyatı başarıyla güncellendi!`, 
        { id: 'fetch-prices', duration: 2000 }
      )
      
      // Başarılı istekten sonra cooldown başlat
      setCooldownSeconds(cooldownTime)
    } catch (error) {
      // Sadece kritik hatalar için mesaj göster (API hatası olsa bile veritabanından veri çekilebilir)
      // Eğer response varsa ve status 200 ise, hata yok demektir (veritabanından veri geldi)
      if (error.response?.status !== 200) {
        // Sadece gerçek hatalar için mesaj göster
        const errorMsg = error.response?.data?.message || error.message || 'Bir hata oluştu'
        
        // 429 hatası için özel mesaj göster (toast gösterme, sadece cooldown başlat)
        if (error.response?.status === 429 || error.message?.includes('rate limit')) {
          // Backend'den gelen retryAfter bilgisini kullan
          const retryAfter = error.response?.data?.retryAfter || (apiProvider === 'coingecko' ? 60 : 30)
          const rateLimitCooldown = retryAfter
          setCooldownSeconds(rateLimitCooldown)
          
          // 429 hatası için toast gösterme - cache'deki veriler gösterilecek
          console.warn('Rate limit (429) - Cache\'deki veriler gösterilecek, cooldown başlatıldı:', rateLimitCooldown)
          
          // Veritabanından mevcut verileri göster (toast göstermeden)
          // Cache'deki veriler zaten gösterilecek, sadece refetch yap
          // 429 hatası durumunda cache'deki veriler gösterilecek, yeni istek yapma
          setIsFetching(false)
          return // 429 hatası - cache'deki veriler gösterilecek
        }
        
        // Diğer hatalar için mesaj göster
        toast.error(errorMsg, { 
          id: 'fetch-prices',
          duration: 4000
        })
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
        symbol = coinSymbolOrObject.symbol.toUpperCase()
        coinId = coinSymbolOrObject.id
        coinName = coinSymbolOrObject.name
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
          // Coin ID ile direkt fiyat çek ve veritabanına kaydet (saveToDb = true)
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
        validation = await cryptoAPI.validateCoin(symbol, true)
        
        if (validation.data.data.savedToDb) {
          toast.success(`${symbol} veritabanına kaydedildi!`, { id: 'add-coin-db', duration: 2000 })
        }
      }
      
      if (!validation.data.data.valid) {
        toast.error(`${symbol} için coin bulunamadı veya geçersiz`, { id: 'add-coin' })
        return
      }
      
      // Coin başarıyla veritabanına kaydedildi
      console.log(`✅ ${symbol} coin'i veritabanına kaydedildi:`, {
        symbol: validation.data.data.symbol,
        price: validation.data.data.price,
        savedToDb: validation.data.data.savedToDb
      })

      // Coin'i custom listesine ekle
      const updatedCustomCoins = [...customCoins, symbol]
      setCustomCoins(updatedCustomCoins)
      
      // Modal'ı kapat
      setShowAddCoinModal(false)
      setCoinSearchQuery('')
      setCoinSearchResults([])
      
      // Coin veritabanına kaydedildi, şimdi fiyatları çek ve güncelle
      toast.loading(`${symbol} için fiyatlar güncelleniyor...`, { id: 'add-coin' })
      
      try {
        // Custom coin'ler için fiyatları çek ve veritabanına kaydet
        const fetchResponse = await cryptoAPI.fetchAndSavePrices(apiProvider, updatedCustomCoins)
        
        // Veritabanından güncel verileri çek (yeni eklenen coin dahil)
        await refetch()
        
        // History'leri de güncelle
        try {
          const historyResponse = await cryptoAPI.getAllPriceHistories(20)
          const historiesData = historyResponse.data.data || {}
          
          const histories = {}
          Object.keys(historiesData).forEach(sym => {
            histories[sym] = historiesData[sym]
              .map((item) => ({
                time: new Date(item.binancetime).toLocaleTimeString('tr-TR', {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
                price: parseFloat(item.price),
              }))
              .reverse()
          })
          
          setPriceHistoryMap(histories)
        } catch (histError) {
          console.error('Error fetching histories:', histError)
        }
        
        toast.success(
          `${symbol} başarıyla eklendi ve fiyatı güncellendi! Fiyat: $${formatPrice(validation.data.data.price)}`, 
          { id: 'add-coin', duration: 3000 }
        )
      } catch (fetchError) {
        // Fiyat çekme hatası olsa bile coin eklendi, sadece uyarı ver
        console.error('Price fetch error:', fetchError)
        toast.success(
          `${symbol} eklendi! Fiyat: $${formatPrice(validation.data.data.price)}`, 
          { id: 'add-coin', duration: 3000 }
        )
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

  // Loading state - sadece cache'de veri yoksa ve ilk yüklemede göster
  // Cache'de veri varsa göster, arka planda güncelle
  if (isLoading && !pricesData?.data?.data) {
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
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-2xl p-8 max-w-md">
          <h3 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">
            {is503Error ? 'Veritabanı Bağlantı Hatası' : 'Veri Yüklenemedi'}
          </h3>
          <p className="text-gray-700 dark:text-gray-300 mb-6">
            {errorMessage}
          </p>
          {is503Error && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                💡 <strong>Çözüm:</strong> PostgreSQL servisinin çalıştığından ve bağlantı bilgilerinin doğru olduğundan emin olun.
              </p>
            </div>
          )}
          <button
            onClick={() => refetch()}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors"
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
    <div className="space-y-8 animate-fade-in">
      {/* 429 Rate Limit Uyarısı (cache'deki veriler gösteriliyorsa) */}
      {show429Warning && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-xl p-4 flex items-center justify-between animate-fade-in">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
            <div>
              <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">
                Rate Limit: Cache'deki veriler gösteriliyor
              </p>
              <p className="text-xs text-yellow-600 dark:text-yellow-400">
                Yeni veriler için birkaç saniye bekleyin veya "Fiyatları Güncelle" butonuna tıklayın
              </p>
            </div>
          </div>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            Yenile
          </button>
        </div>
      )}
      
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
            {/* Coin Ekleme Butonu */}
            <button
              onClick={() => setShowAddCoinModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 font-semibold"
            >
              <Plus className="w-5 h-5" />
              <span>Coin Ekle</span>
            </button>
            
            {/* Coin Bilgisi */}
            <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
              <span className="text-sm font-semibold text-white/90">
                {DEFAULT_BINANCE_COINS.length} varsayılan + {customCoins.length} özel = {allDisplayCoins.length} coin
              </span>
            </div>
            
            {/* Custom Coin Temizleme */}
            {customCoins.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('Tüm özel coin\'leri kaldırmak istediğinize emin misiniz?')) {
                    setCustomCoins([])
                    toast.success('Tüm özel coin\'ler kaldırıldı')
                  }
                }}
                className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2 text-white/90 hover:bg-white/30 transition-colors text-sm"
                title="Özel coin'leri temizle"
              >
                <X className="w-4 h-4" />
                <span>Özel Coin'leri Temizle</span>
              </button>
            )}
            
            {/* API Provider Seçimi */}
            <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
              <label className="text-sm font-semibold text-white/90">API:</label>
              <select
                value={apiProvider}
                onChange={(e) => {
                  setApiProvider(e.target.value)
                  setCooldownSeconds(0) // API değiştiğinde cooldown'u sıfırla
                }}
                disabled={isFetching || cooldownSeconds > 0}
                className="bg-white/30 text-white rounded-lg px-3 py-1.5 text-sm font-semibold border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="coingecko" className="text-gray-900">CoinGecko (50/dk)</option>
                <option value="binance" className="text-gray-900">Binance</option>
              </select>
            </div>
            <button
              onClick={handleFetchPrices}
              disabled={isFetching || cooldownSeconds > 0}
              className={`group flex items-center space-x-2 px-6 py-3 rounded-xl transition-all duration-300 shadow-lg font-semibold ${
                isFetching || cooldownSeconds > 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-white text-primary-600 hover:bg-primary-50 hover:shadow-xl hover:scale-105'
              }`}
            >
              <RefreshCw 
                className={`w-5 h-5 transition-transform duration-500 ${
                  isFetching ? 'animate-spin' : 'group-hover:rotate-180'
                }`} 
              />
              <span>
                {isFetching 
                  ? 'Güncelleniyor...' 
                  : cooldownSeconds > 0 
                    ? `Bekle (${cooldownSeconds}s)` 
                    : 'Fiyatları Güncelle'
                }
              </span>
            </button>
            {cooldownSeconds > 0 && (
              <div className="flex items-center space-x-2 text-white/80 text-sm">
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                <span>Rate limit koruması aktif</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Veritabanı Durumu Bilgisi */}
        <div className="mt-4 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 text-white/90 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="font-semibold">Veritabanı Aktif:</span>
            <span>
              {prices.length > 0 
                ? `${prices.length} coin veritabanında takip ediliyor`
                : 'Veritabanı hazır, coin ekleyebilirsiniz'
              }
            </span>
          </div>
          <p className="text-xs text-white/70 mt-1">
            Coin eklediğinizde otomatik olarak veritabanına kaydedilir ve fiyatları takip edilir.
          </p>
        </div>
      </div>

      {/* Crypto Cards Grid */}
      {prices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-gradient-to-br from-white via-primary-50 to-purple-50 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 rounded-2xl shadow-xl border-2 border-primary-100 dark:border-gray-700 animate-fade-in">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-primary-200 dark:bg-primary-800 rounded-full blur-2xl opacity-50 animate-pulse-slow"></div>
            <div className="relative text-8xl animate-bounce-slow">📊</div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Henüz veri yok
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6 text-center max-w-md">
            Kripto para fiyatlarını görmek için fiyatları güncelleyin
          </p>
          <button
            onClick={handleFetchPrices}
            disabled={isFetching || cooldownSeconds > 0}
            className={`group px-8 py-4 rounded-xl transition-all duration-300 shadow-lg font-semibold text-lg flex items-center space-x-2 ${
              isFetching || cooldownSeconds > 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-primary-600 to-purple-600 text-white hover:from-primary-700 hover:to-purple-700 hover:shadow-xl hover:scale-105'
            }`}
          >
            <RefreshCw 
              className={`w-5 h-5 transition-transform duration-500 ${
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
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Rate limit koruması: {cooldownSeconds} saniye kaldı
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {prices.map((crypto, index) => {
            // Eğer coin yükleniyorsa (veritabanında yok), loading göster
            if (crypto._isLoading) {
              return (
                <div
                  key={crypto.name}
                  className="relative bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-lg animate-pulse"
                >
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                      <div>
                        <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                        <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                      </div>
                    </div>
                  </div>
                  <div className="mb-5">
                    <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                    <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </div>
                  <div className="h-28 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 dark:border-primary-400 mx-auto mb-2"></div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Fiyat yükleniyor...</p>
                    </div>
                  </div>
                </div>
              )
            }
            
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
                <div className={`relative bg-white dark:bg-gray-800 border-2 ${cardColor.border} dark:border-gray-700 rounded-2xl p-6 shadow-lg dark:shadow-gray-900/50 hover:shadow-2xl transition-all duration-500 hover:scale-105 overflow-hidden`}>
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
                          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                            {getCryptoName(crypto.name)}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{crypto.name}</p>
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
                      <p className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent mb-2">
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
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 font-medium">
                        {new Date(crypto.binancetime).toLocaleString('tr-TR')}
                      </p>
                    </div>

                    {/* Mini Chart */}
                    {history.length > 0 ? (
                      <div className="mb-5 h-28 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-600 shadow-inner">
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
                      <div className="mb-5 h-28 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-xl flex items-center justify-center border border-gray-200 dark:border-gray-600">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 dark:border-primary-400 mx-auto mb-2"></div>
                          <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Grafik yükleniyor...</p>
                        </div>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700 group-hover:border-primary-200 dark:group-hover:border-primary-500 transition-colors">
                      <span className="text-sm font-semibold text-gray-600 dark:text-gray-300 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
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

      {/* Coin Ekleme Modal */}
      {showAddCoinModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden animate-slide-up">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-primary-600 to-purple-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Coin Ekle</h2>
                <button
                  onClick={() => {
                    setShowAddCoinModal(false)
                    setCoinSearchQuery('')
                    setCoinSearchResults([])
                  }}
                  className="hover:bg-white/20 rounded-lg p-2 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <p className="text-primary-100 mt-2">Takip etmek istediğiniz coin'i arayın ve ekleyin</p>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {/* Arama Input */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={coinSearchQuery}
                  onChange={(e) => setCoinSearchQuery(e.target.value)}
                  placeholder="Coin adı veya symbol (örn: Bitcoin, BTC, ETH)"
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-100 rounded-xl focus:border-primary-500 dark:focus:border-primary-400 focus:outline-none transition-colors"
                  autoFocus
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
                  </div>
                )}
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

              {/* Manuel Giriş */}
              <div className="border-t pt-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Veya manuel olarak symbol girin:
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={coinSearchQuery}
                    onChange={(e) => setCoinSearchQuery(e.target.value)}
                    placeholder="BTC, ETH, SOL..."
                    className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && coinSearchQuery.trim()) {
                        // Manuel giriş için symbol string gönder
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
                    className="px-6 py-2 bg-gradient-to-r from-primary-600 to-purple-600 text-white rounded-xl hover:from-primary-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                  >
                    Ekle
                  </button>
                </div>
              </div>

              {/* Varsayılan Binance Coinleri */}
              <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Varsayılan Binance Coinleri ({DEFAULT_BINANCE_COINS.length}):
                </h3>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_BINANCE_COINS.map((coin) => (
                    <span
                      key={coin}
                      className="px-3 py-1 bg-white text-gray-700 rounded-full text-xs font-semibold border border-green-300 shadow-sm"
                    >
                      {coin}
                    </span>
                  ))}
                </div>
              </div>

              {/* Özel Eklenen Coin'ler */}
              {customCoins.length > 0 && (
                <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    Özel Eklenen Coin'ler ({customCoins.length}):
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {customCoins.map((coin) => (
                      <div
                        key={coin}
                        className="flex items-center space-x-2 bg-primary-100 text-primary-700 px-3 py-1.5 rounded-lg"
                      >
                        <span className="font-semibold">{coin}</span>
                        <button
                          onClick={() => handleRemoveCoin(coin)}
                          className="hover:bg-primary-200 rounded p-0.5 transition-colors"
                        >
                          <X className="w-4 h-4" />
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

