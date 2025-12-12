import { useState } from 'react'
import { cryptoAPI } from '../../services/api'
import { Calculator, TrendingUp, TrendingDown, ArrowRightLeft } from 'lucide-react'
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

  // ROI Calculator
  const [roi, setRoi] = useState({
    initialInvestment: '',
    currentValue: '',
    fees: '0.1'
  })
  const [roiResult, setRoiResult] = useState(null)

  // Currency Converter
  const [converter, setConverter] = useState({
    amount: '',
    fromPrice: '',
    toPrice: ''
  })
  const [converterResult, setConverterResult] = useState(null)

  const calculateProfitLoss = async () => {
    try {
      const result = await cryptoAPI.calculateProfitLoss(profitLoss)
      setProfitLossResult(result.data.data)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Hesaplama yapılırken hata oluştu')
    }
  }

  const calculateROI = async () => {
    try {
      const result = await cryptoAPI.calculateROI(roi)
      setRoiResult(result.data.data)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Hesaplama yapılırken hata oluştu')
    }
  }

  const convertCurrency = async () => {
    try {
      const result = await cryptoAPI.convertCurrency(converter)
      setConverterResult(result.data.data)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Dönüştürme yapılırken hata oluştu')
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
          <p className="text-gray-600 dark:text-gray-400">Kâr/zarar, ROI ve dönüşüm hesaplamaları yapın</p>
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
            onClick={() => setActiveTab('roi')}
            className={`px-4 py-2 font-medium transition ${
              activeTab === 'roi'
                ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Calculator size={20} />
              ROI
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

        {/* ROI Calculator */}
        {activeTab === 'roi' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">ROI Hesaplayıcı</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Başlangıç Yatırımı (USD)
                </label>
                <input
                  type="number"
                  value={roi.initialInvestment}
                  onChange={(e) => setRoi({ ...roi, initialInvestment: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Mevcut Değer (USD)
                </label>
                <input
                  type="number"
                  value={roi.currentValue}
                  onChange={(e) => setRoi({ ...roi, currentValue: e.target.value })}
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
                  value={roi.fees}
                  onChange={(e) => setRoi({ ...roi, fees: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="0.1"
                  step="0.01"
                />
              </div>
              <button
                onClick={calculateROI}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Hesapla
              </button>
              {roiResult && (
                <div className={`mt-4 p-4 rounded-lg ${roiResult.isProfit ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {roiResult.isProfit ? (
                      <TrendingUp className="text-green-600 dark:text-green-400" size={24} />
                    ) : (
                      <TrendingDown className="text-red-600 dark:text-red-400" size={24} />
                    )}
                    <h3 className={`text-lg font-semibold ${roiResult.isProfit ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                      ROI: {roiResult.roi}%
                    </h3>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="text-gray-700 dark:text-gray-300">
                      <span className="font-medium">Kâr/Zarar:</span> ${formatNumber(roiResult.profitLoss)}
                    </p>
                    <p className="text-gray-700 dark:text-gray-300">
                      <span className="font-medium">Net Değer:</span> ${formatNumber(roiResult.netValue)}
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
                  value={converter.amount}
                  onChange={(e) => setConverter({ ...converter, amount: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Kaynak Fiyat (USD)
                </label>
                <input
                  type="number"
                  value={converter.fromPrice}
                  onChange={(e) => setConverter({ ...converter, fromPrice: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Hedef Fiyat (USD)
                </label>
                <input
                  type="number"
                  value={converter.toPrice}
                  onChange={(e) => setConverter({ ...converter, toPrice: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="0.00"
                />
              </div>
              <button
                onClick={convertCurrency}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Dönüştür
              </button>
              {converterResult && (
                <div className="mt-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-400 mb-2">Sonuç</h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    <span className="font-medium">{formatNumber(converter.amount)}</span> coin (${formatNumber(converter.fromPrice)}/coin) ={' '}
                    <span className="font-medium">{formatNumber(converterResult.convertedAmount)}</span> coin (${formatNumber(converter.toPrice)}/coin)
                  </p>
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

