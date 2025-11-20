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
    
    // Tüm hataları göster (sadece kritik olanlar değil)
    const status = error.response?.status
    if (status >= 400) {
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
  getLatestPricesFromDB: () => api.get('/crypto/db/prices'),
  
  // Get latest price by symbol from database
  getLatestPriceFromDB: (symbol) => api.get(`/crypto/db/prices/${symbol}`),
  
  // Get price history
  getPriceHistory: (symbol, limit = 100, startDate = null, endDate = null) => {
    const params = { limit }
    if (startDate) params.startDate = startDate
    if (endDate) params.endDate = endDate
    return api.get(`/crypto/db/history/${symbol}`, { params })
  },
  
  // Get statistics
  getStatistics: (symbol = null) => {
    const params = symbol ? { symbol } : {}
    return api.get('/crypto/db/statistics', { params })
  },
  
  // Fetch and save prices
  fetchAndSavePrices: () => api.post('/crypto/fetch'),
}

export default api

