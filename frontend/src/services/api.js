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

// Aynı genel hata için tek toast (birden fazla istek aynı anda hata verince 5x "Bir şeyler yanlış gitti!" çıkmasın)
const GENERIC_MESSAGE = 'Bir şeyler yanlış gitti!'
const TOAST_ID = 'api-error'

api.interceptors.response.use(
  (response) => response,
  (error) => {
    let errorMessage = 'Bir hata oluştu'
    if (error.response) {
      errorMessage = error.response?.data?.message || error.response?.data?.error || `Sunucu hatası: ${error.response.status}`
    } else if (error.request) {
      errorMessage = 'Backend sunucusuna bağlanılamadı. Backend çalışıyor mu kontrol edin.'
    } else {
      errorMessage = error.message || 'Bilinmeyen bir hata oluştu'
    }

    const status = error.response?.status
    if (status === 429) {
      console.warn('Rate limit (429) - cache kullanılacak:', error.config?.url)
      return Promise.reject(error)
    }

    if (status >= 400 && status !== 429) {
      // Genel mesaj ise sabit id ile tek toast (üst üste binmesin)
      const isGeneric = errorMessage === GENERIC_MESSAGE || errorMessage === 'Bir hata oluştu'
      toast.error(errorMessage, isGeneric ? { id: TOAST_ID } : undefined)
      console.error('API Error:', { message: errorMessage, status, url: error.config?.url })
    }

    return Promise.reject(error)
  }
)

// Crypto API functions
export const cryptoAPI = {
  getAllPrices: () => api.get('/crypto/prices'),
  get24hStats: (symbol) => api.get(`/crypto/stats/${symbol}`),
  getKlines: (symbol, interval = '1h', limit = 500) =>
    api.get(`/crypto/klines/${symbol}`, { params: { interval, limit }, timeout: 15000 }),
  // Toplu geçmiş verisi çekme (Dashboard vb. için)
  getKlinesBatch: (customSymbols = null, interval = '4h', limit = 42) => {
    const params = { interval, limit }
    if (customSymbols && customSymbols.length) params.customSymbols = customSymbols.join(',')
    return api.get('/crypto/klines/batch', { params, timeout: 20000 })
  },
  // Tüm semboller için gerçek 24 saatlik yüzde değişimi (Binance ticker/24hr)
  get24hStatsBatch: (customSymbols = null) => {
    const params = customSymbols?.length ? { customSymbols: customSymbols.join(',') } : {}
    return api.get('/crypto/stats/24h', { params, timeout: 10000 })
  },
  // Tüm semboller için 7 günlük yüzde değişimi (Binance klines)
  get7dStatsBatch: (customSymbols = null) => {
    const params = customSymbols?.length ? { customSymbols: customSymbols.join(',') } : {}
    return api.get('/crypto/stats/7d', { params, timeout: 20000 })
  },

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

  getDatabaseDetails: () => api.get('/crypto/database/details'),

  // Coin silme (veritabanından)
  deleteCoin: (symbol) => api.delete('/crypto/coins/delete', { data: { symbol } }),

  // Coin detaylı bilgileri
  getCoinInfo: (symbol) => api.get(`/crypto/coins/${symbol}/info`),

  // Metadata operations
  getCoinMetadata: (symbol, coinId = null) => {
    const params = coinId ? { coinId } : {}
    return api.get(`/crypto/metadata/${symbol}`, { params })
  },

  updateCoinMetadata: (symbol, metadata) => api.put(`/crypto/metadata/${symbol}`, metadata),

  createNote: (noteData) => api.post('/crypto/notes', noteData),
  getNotes: (userId = 'default', filters = {}) => {
    const params = { userId, ...filters }
    return api.get('/crypto/notes', { params })
  },
  updateNote: (id, noteData) => api.put(`/crypto/notes/${id}`, noteData),
  deleteNote: (id, userId = 'default') => api.delete(`/crypto/notes/${id}`, { params: { userId } }),
  getNotesByCoin: (symbol, userId = 'default') => api.get(`/crypto/notes/coin/${symbol}`, { params: { userId } }),

  // News API
  getAllNews: (limit = 30) => api.get('/crypto/news', { params: { limit } }),
  getNewsByCoin: (symbol, limit = 20) => api.get(`/crypto/news/coin/${symbol}`, { params: { limit } }),

  // Calculator API
  calculateProfitLoss: (data) => api.post('/crypto/calculator/profit-loss', data),
  convertCurrency: (data) => api.post('/crypto/calculator/convert', data),
}

// Chatbot API functions
export const chatbotAPI = {
  sendMessage: (message, userId = 'default') =>
    api.post('/crypto/chatbot/message', { message, userId }),
  clearHistory: (userId = 'default') =>
    api.post('/crypto/chatbot/clear-history', { userId }),
}

export default api

