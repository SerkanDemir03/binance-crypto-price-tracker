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
const TABLE_NAME = process.env.TABLE_NAME || 'tbl_binance2_staj';
// Rate limit'i önlemek için varsayılan interval 5 dakika
const UPDATE_INTERVAL = process.env.UPDATE_INTERVAL || '*/5 * * * *'; // Varsayılan: 5 dakika

module.exports = {
  CRYPTO_SYMBOLS,
  BINANCE_API_URL,
  TABLE_NAME,
  UPDATE_INTERVAL
};

