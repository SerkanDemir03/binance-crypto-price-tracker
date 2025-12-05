// Binance API symbols
const CRYPTO_SYMBOLS = [
  "BTCUSDT", "ETHUSDT", "BCCUSDT", "NEOUSDT", "LTCUSDT", "QTUMUSDT", "ADAUSDT",
  "XRPUSDT", "EOSUSDT", "TUSDUSDT", "IOTAUSDT", "XLMUSDT", "ONTUSDT", "TRXUSDT",
  "ETCUSDT", "ICXUSDT", "VENUSDT", "NULSUSDT", "VETUSDT", "PAXUSDT", "BCHABCUSDT",
  "BCHSVUSDT", "USDCUSDT", "LINKUSDT", "WAVESUSDT", "BTTUSDT", "USDSUSDT", "ONGUSDT",
  "HOTUSDT", "ZILUSDT", "ZRXUSDT", "FETUSDT", "BATUSDT", "XMRUSDT", "ZECUSDT",
  "IOSTUSDT", "CELRUSDT", "DASHUSDT", "NANOUSDT", "OMGUSDT", "THETAUSDT",
  "ENJUSDT", "MITHUSDT", "MATICUSDT", "ATOMUSDT", "TFUELUSDT", "ONEUSDT",
  "FTMUSDT", "ALGOUSDT"
];

const BINANCE_API_URL = process.env.BINANCE_API_URL || 'https://api.binance.com/api/v3/ticker/price';
const COINGECKO_API_URL = process.env.COINGECKO_API_URL || 'https://api.coingecko.com/api/v3/simple/price';
const TABLE_NAME = process.env.TABLE_NAME || 'tbl_binance2_staj';
// Rate limit'i önlemek için varsayılan interval 1 dakika
// WebSocket zaten gerçek zamanlı veri sağladığı için scheduler sadece yedek/fallback olarak çalışır
const UPDATE_INTERVAL = process.env.UPDATE_INTERVAL || '*/1 * * * *'; // Varsayılan: 1 dakika (WebSocket yedek)
// Varsayılan API provider: 'binance' veya 'coingecko'
const DEFAULT_API_PROVIDER = process.env.DEFAULT_API_PROVIDER || 'coingecko';
// WebSocket throttle interval (milisaniye) - her coin için veritabanına kayıt sıklığı
const WEBSOCKET_SAVE_INTERVAL = parseInt(process.env.WEBSOCKET_SAVE_INTERVAL) || 60000; // 60 saniye (1 dakika)

module.exports = {
  CRYPTO_SYMBOLS,
  BINANCE_API_URL,
  COINGECKO_API_URL,
  TABLE_NAME,
  UPDATE_INTERVAL,
  DEFAULT_API_PROVIDER,
  WEBSOCKET_SAVE_INTERVAL
};

