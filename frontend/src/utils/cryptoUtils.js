// Format price utility
export const formatPrice = (price) => {
  if (!price) return 'N/A'
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  }).format(price)
}

// Get crypto name without USDT
export const getCryptoName = (symbol) => {
  return symbol?.replace('USDT', '') || symbol
}

// Get crypto icon/emoji
export const getCryptoIcon = (symbol) => {
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

// Binance-style compact volume (1.2M, 450K)
export const formatVolume = (num) => {
  if (num == null || !Number.isFinite(num)) return '0'
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B'
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M'
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K'
  return num.toFixed(2)
}
