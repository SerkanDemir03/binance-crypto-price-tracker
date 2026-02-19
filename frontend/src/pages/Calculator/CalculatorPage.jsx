import { useState, useEffect, useMemo } from 'react'
import { useQuery } from 'react-query'
import { cryptoAPI } from '../../services/api'
import { TrendingUp, TrendingDown, ArrowRightLeft } from 'lucide-react'
import toast from 'react-hot-toast'

const CalculatorPage = () => {
  const [activeTab, setActiveTab] = useState('profit-loss')
  
  // Profit/Loss Calculator
  const [profitLoss, setProfitLoss] = useState({
    buyPrice: '',
    sellPrice: '',
    quantity: '',
    fees: '0.1'
  })
  const [profitLossResult, setProfitLossResult] = useState(null)

  // Currency Converter
  const [converter, setConverter] = useState({
    amount: '',
    fromSymbol: '',
    toSymbol: ''
  })
  const [converterResult, setConverterResult] = useState(null)
  const [isConverting, setIsConverting] = useState(false)

  // Fetch coin list for converter
  const { data: coinsData, isLoading: isLoadingCoins } = useQuery(
    ['coinsForConverter'],
    async () => {
      const response = await cryptoAPI.getLatestPricesFromDB()
      return response.data
    },
    {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 dakika cache
    }
  )

  // Fiat para birimleri listesi
  const fiatCurrencies = [
    'USD', 'EUR', 'TRY', 'SAR', 'GBP', 'JPY', 'CNY', 'INR', 'KRW', 'BRL',
    'MXN', 'CAD', 'AUD', 'CHF', 'NZD', 'SEK', 'NOK', 'DKK', 'PLN', 'HUF',
    'CZK', 'RON', 'BGN', 'HRK', 'RUB', 'ILS', 'AED', 'QAR', 'KWD', 'BHD',
    'OMR', 'JOD', 'EGP', 'ZAR', 'THB', 'SGD', 'MYR', 'IDR', 'PHP', 'VND'
  ]

  // Extract unique coin symbols from prices
  const availableCoins = useMemo(() => {
    const fiatSet = new Set(fiatCurrencies)
    const cryptoSet = new Set()
    
    if (coinsData?.data) {
      coinsData.data.forEach((price) => {
        const symbol = price.name.replace('USDT', '')
        if (symbol && !fiatCurrencies.includes(symbol)) {
          cryptoSet.add(symbol)
        }
      })
    }
    
    // Fiat para birimlerini alfabetik sırala
    const sortedFiat = Array.from(fiatSet).sort((a, b) => a.localeCompare(b))
    
    // Kripto paraları alfabetik sırala
    const sortedCrypto = Array.from(cryptoSet).sort((a, b) => a.localeCompare(b))
    
    return {
      fiat: sortedFiat,
      crypto: sortedCrypto
    }
  }, [coinsData])

  const calculateProfitLoss = async () => {
    try {
      const result = await cryptoAPI.calculateProfitLoss(profitLoss)
      setProfitLossResult(result.data.data)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Hesaplama yapılırken hata oluştu')
    }
  }


  const convertCurrency = async () => {
    // Validation
    if (!converter.amount || parseFloat(converter.amount) <= 0) {
      toast.error('Lütfen geçerli bir miktar girin')
      return
    }
    
    if (!converter.fromSymbol) {
      toast.error('Lütfen kaynak para birimini seçin')
      return
    }
    
    if (!converter.toSymbol) {
      toast.error('Lütfen hedef para birimini seçin')
      return
    }
    
    if (converter.fromSymbol === converter.toSymbol) {
      toast.error('Kaynak ve hedef para birimi aynı olamaz')
      return
    }

    setIsConverting(true)
    try {
      const result = await cryptoAPI.convertCurrency(converter)
      setConverterResult(result.data.data)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Dönüştürme yapılırken hata oluştu')
      setConverterResult(null)
    } finally {
      setIsConverting(false)
    }
  }

  const formatNumber = (num) => {
    return new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8
    }).format(num)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Kripto Para Hesap Makinesi</h1>
          <p className="text-gray-600 dark:text-gray-400">Kâr/zarar ve dönüşüm hesaplamaları yapın</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('profit-loss')}
            className={`px-4 py-2 font-medium transition ${
              activeTab === 'profit-loss'
                ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <TrendingUp size={20} />
              Kâr/Zarar
            </div>
          </button>
          <button
            onClick={() => setActiveTab('convert')}
            className={`px-4 py-2 font-medium transition ${
              activeTab === 'convert'
                ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <ArrowRightLeft size={20} />
              Dönüştür
            </div>
          </button>
        </div>

        {/* Profit/Loss Calculator */}
        {activeTab === 'profit-loss' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Kâr/Zarar Hesaplayıcı</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Alış Fiyatı (USD)
                </label>
                <input
                  type="number"
                  value={profitLoss.buyPrice}
                  onChange={(e) => setProfitLoss({ ...profitLoss, buyPrice: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Satış Fiyatı (USD)
                </label>
                <input
                  type="number"
                  value={profitLoss.sellPrice}
                  onChange={(e) => setProfitLoss({ ...profitLoss, sellPrice: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Miktar
                </label>
                <input
                  type="number"
                  value={profitLoss.quantity}
                  onChange={(e) => setProfitLoss({ ...profitLoss, quantity: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  İşlem Ücreti (%)
                </label>
                <input
                  type="number"
                  value={profitLoss.fees}
                  onChange={(e) => setProfitLoss({ ...profitLoss, fees: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="0.1"
                  step="0.01"
                />
              </div>
              <button
                onClick={calculateProfitLoss}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Hesapla
              </button>
              {profitLossResult && (
                <div className={`mt-4 p-4 rounded-lg ${profitLossResult.isProfit ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {profitLossResult.isProfit ? (
                      <TrendingUp className="text-green-600 dark:text-green-400" size={24} />
                    ) : (
                      <TrendingDown className="text-red-600 dark:text-red-400" size={24} />
                    )}
                    <h3 className={`text-lg font-semibold ${profitLossResult.isProfit ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                      {profitLossResult.isProfit ? 'Kâr' : 'Zarar'}
                    </h3>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="text-gray-700 dark:text-gray-300">
                      <span className="font-medium">Kâr/Zarar:</span> ${formatNumber(profitLossResult.profitLoss)} ({profitLossResult.profitLossPercent}%)
                    </p>
                    <p className="text-gray-700 dark:text-gray-300">
                      <span className="font-medium">Toplam Alış:</span> ${formatNumber(profitLossResult.buyTotal)}
                    </p>
                    <p className="text-gray-700 dark:text-gray-300">
                      <span className="font-medium">Toplam Satış:</span> ${formatNumber(profitLossResult.sellTotal)}
                    </p>
                    <p className="text-gray-700 dark:text-gray-300">
                      <span className="font-medium">Toplam Ücret:</span> ${formatNumber(profitLossResult.totalFees)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Currency Converter */}
        {activeTab === 'convert' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Para Birimi Dönüştürücü</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Miktar
                </label>
                <input
                  type="number"
                  step="any"
                  value={converter.amount}
                  onChange={(e) => setConverter({ ...converter, amount: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Kaynak Para Birimi
                </label>
                <select
                  value={converter.fromSymbol}
                  onChange={(e) => setConverter({ ...converter, fromSymbol: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoadingCoins}
                >
                  <option value="">Para birimi seçin...</option>
                  
                  {/* Fiat Para Birimleri */}
                  {availableCoins.fiat.length > 0 && (
                    <optgroup label="💵 Fiat Para Birimleri" className="font-semibold text-gray-700 dark:text-gray-300">
                      {availableCoins.fiat.map((coin) => (
                        <option key={coin} value={coin}>
                          {coin}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  
                  {/* Kripto Paralar */}
                  {availableCoins.crypto.length > 0 && (
                    <optgroup label="₿ Kripto Paralar" className="font-semibold text-gray-700 dark:text-gray-300">
                      {availableCoins.crypto.map((coin) => (
                        <option key={coin} value={coin}>
                          {coin}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Hedef Para Birimi
                </label>
                <select
                  value={converter.toSymbol}
                  onChange={(e) => setConverter({ ...converter, toSymbol: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoadingCoins}
                >
                  <option value="">Para birimi seçin...</option>
                  
                  {/* Fiat Para Birimleri */}
                  {availableCoins.fiat.length > 0 && (
                    <optgroup label="💵 Fiat Para Birimleri" className="font-semibold text-gray-700 dark:text-gray-300">
                      {availableCoins.fiat.map((coin) => (
                        <option key={coin} value={coin}>
                          {coin}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  
                  {/* Kripto Paralar */}
                  {availableCoins.crypto.length > 0 && (
                    <optgroup label="₿ Kripto Paralar" className="font-semibold text-gray-700 dark:text-gray-300">
                      {availableCoins.crypto.map((coin) => (
                        <option key={coin} value={coin}>
                          {coin}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
              <button
                onClick={convertCurrency}
                disabled={isConverting || isLoadingCoins}
                className={`w-full px-4 py-2 rounded-lg transition ${
                  isConverting || isLoadingCoins
                    ? 'bg-gray-400 dark:bg-gray-600 text-white cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isConverting ? 'Hesaplanıyor...' : 'Dönüştür'}
              </button>
              {converterResult && (
                <div className="mt-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-3">
                    <ArrowRightLeft className="text-blue-600 dark:text-blue-400" size={20} />
                    <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-400">Dönüşüm Sonucu</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-700 dark:text-gray-300">
                      <span className="font-medium">{formatNumber(converter.amount)}</span>{' '}
                      <span className="font-semibold text-blue-600 dark:text-blue-400">{converter.fromSymbol}</span>
                    </p>
                    <div className="flex items-center justify-center text-gray-400 dark:text-gray-500">
                      <ArrowRightLeft size={16} />
                    </div>
                    <p className="text-gray-700 dark:text-gray-300">
                      <span className="font-medium text-lg">{formatNumber(converterResult.convertedAmount)}</span>{' '}
                      <span className="font-semibold text-blue-600 dark:text-blue-400">{converter.toSymbol}</span>
                    </p>
                    {converterResult.fromPrice && converterResult.toPrice && (
                      <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800 text-xs text-gray-600 dark:text-gray-400">
                        <p>1 {converter.fromSymbol} = {formatNumber(converterResult.fromPrice)} USD</p>
                        <p>1 {converter.toSymbol} = {formatNumber(converterResult.toPrice)} USD</p>
                        <p className="mt-1 font-medium">Kur: {formatNumber(converterResult.exchangeRate)}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CalculatorPage

