import axios from 'axios'
import toast from 'react-hot-toast'

// Base URL
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// Axios instance
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Response interceptor - Error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Detaylı hata mesajı
    let errorMessage = 'Bir hata oluştu'
    
    if (error.response) {
      // Sunucu yanıt verdi ama hata kodu var
      errorMessage = error.response?.data?.message || error.response?.data?.error || `Sunucu hatası: ${error.response.status}`
    } else if (error.request) {
      // İstek gönderildi ama yanıt alınamadı
      errorMessage = 'Backend sunucusuna bağlanılamadı. Backend çalışıyor mu kontrol edin.'
    } else {
      // İstek hazırlanırken hata oluştu
      errorMessage = error.message || 'Bilinmeyen bir hata oluştu'
    }
    
    // 429 (Rate Limit) hatalarını sessizce geç - hiçbir toast gösterme
    const status = error.response?.status
    if (status === 429) {
      // Rate limit hatası - sessizce geç, hiçbir toast gösterme
      console.warn('Rate limit hatası (429) - Cache\'deki veriler kullanılacak:', {
        url: error.config?.url,
        method: error.config?.method
      })
      // Toast gösterme, sadece reject et (cache'deki veriler gösterilecek)
      return Promise.reject(error)
    }
    
    // Diğer hataları göster (429 hariç)
    if (status >= 400 && status !== 429) {
      toast.error(errorMessage)
      console.error('API Error:', {
        message: errorMessage,
        status: status,
        url: error.config?.url,
        method: error.config?.method,
        data: error.response?.data
      })
    }

    return Promise.reject(error)
  }
)

// Crypto API functions
export const cryptoAPI = {
  // Get all prices from Binance API
  getAllPrices: () => api.get('/crypto/prices'),
  
  // Get price by symbol from Binance API
  getPriceBySymbol: (symbol) => api.get(`/crypto/prices/${symbol}`),
  
  // Get 24h stats
  get24hStats: (symbol) => api.get(`/crypto/stats/${symbol}`),
  
  // Get all latest prices from database
  getLatestPricesFromDB: (customSymbols = null) => {
    const params = customSymbols ? { customSymbols: customSymbols.join(',') } : {}
    return api.get('/crypto/db/prices', { 
      params,
      timeout: 10000 // 10 saniye timeout
    })
  },
  
  // Get latest price by symbol from database
  getLatestPriceFromDB: (symbol) => api.get(`/crypto/db/prices/${symbol}`),
  
  // Get price history
  getPriceHistory: (symbol, limit = 100, startDate = null, endDate = null) => {
    const params = { limit }
    if (startDate) params.startDate = startDate
    if (endDate) params.endDate = endDate
    return api.get(`/crypto/db/history/${symbol}`, { params })
  },
  
  // Get all price histories in batch (optimized)
  getAllPriceHistories: (limit = 20, customSymbols = null) => {
    const params = { limit }
    if (customSymbols && Array.isArray(customSymbols) && customSymbols.length > 0) {
      params.customSymbols = customSymbols.join(',')
    }
    return api.get('/crypto/db/histories', { 
      params,
      timeout: 15000 // 15 saniye timeout (grafik verileri için)
    })
  },
  
  // Get statistics
  getStatistics: (symbol = null) => {
    const params = symbol ? { symbol } : {}
    return api.get('/crypto/db/statistics', { params })
  },
  
  // Fetch and save prices
  fetchAndSavePrices: (provider = 'coingecko', customSymbols = null) => {
    const body = customSymbols ? { customSymbols } : {}
    return api.post('/crypto/fetch', body, { 
      params: { provider } 
    })
  },
  
  // Coin management
  searchCoins: (query, limit = 20) => api.get('/crypto/coins/search', { 
    params: { query, limit } 
  }),
  
  validateCoin: (symbol, saveToDb = false) => api.get('/crypto/coins/validate', { 
    params: { symbol, saveToDb: saveToDb.toString() } 
  }),
  
  // Coin ID ile direkt fiyat çekme (arama sonuçlarından gelen coin'ler için)
  getPriceByCoinId: (coinId, symbol, saveToDb = false) => api.post('/crypto/coins/price-by-id', {
    coinId,
    symbol,
    saveToDb
  }),
  
  getPricesByCustomSymbols: (symbols) => api.post('/crypto/coins/prices', { symbols }),
  
  // Database status
  checkDatabaseStatus: () => api.get('/crypto/health/database-status'),
  
  // Database details (for management panel)
  getDatabaseDetails: () => api.get('/crypto/database/details'),
  
  // Coin silme (veritabanından)
  deleteCoin: (symbol) => api.delete('/crypto/coins/delete', { data: { symbol } }),
}

export default api

