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
