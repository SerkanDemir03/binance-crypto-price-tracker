# Binance Crypto Price Tracker - Backend

Node.js/Express.js backend API for Binance cryptocurrency price tracking.

## 🚀 Features

- Fetch cryptocurrency prices from Binance API
- Store prices in PostgreSQL database
- Get price history and statistics
- **Automatic price updates with scheduler** (every 1 minute by default)
- RESTful API endpoints
- Error handling and logging
- Rate limiting and security

## 📦 Installation

```bash
npm install
```

## ⚙️ Configuration

Copy `.env.example` to `.env` and configure:

```env
NODE_ENV=development
PORT=5000
CORS_ORIGIN=http://localhost:3000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=12345678

BINANCE_API_URL=https://api.binance.com/api/v3/ticker/price
TABLE_NAME=tbl_binance2_staj

# Scheduler Configuration (Cron expression)
# */1 * * * * = every 1 minute
# */5 * * * * = every 5 minutes
# 0 * * * * = every hour
UPDATE_INTERVAL=*/1 * * * *
```

## 🏃 Running

```bash
# Development
npm run dev

# Production
npm start
```

**Not:** Server başladığında otomatik olarak scheduler çalışmaya başlar ve belirli aralıklarla fiyatları günceller.

## 📚 API Endpoints

### Binance API Routes

- `GET /api/crypto/prices` - Get all cryptocurrency prices from Binance
- `GET /api/crypto/prices/:symbol` - Get specific cryptocurrency price
- `GET /api/crypto/stats/:symbol` - Get 24h statistics for a symbol

### Database Routes

- `GET /api/crypto/db/prices` - Get all latest prices from database
- `GET /api/crypto/db/prices/:symbol` - Get latest price for a symbol
- `GET /api/crypto/db/history/:symbol` - Get price history for a symbol
  - Query params: `limit` (default: 100), `startDate`, `endDate`
- `GET /api/crypto/db/statistics` - Get statistics
  - Query params: `symbol` (optional)

### Fetch and Save

- `POST /api/crypto/fetch` - Fetch prices from Binance and save to database

### Scheduler Routes

- `GET /api/crypto/scheduler/status` - Get scheduler status
- `POST /api/crypto/scheduler/start` - Start scheduler
  - Body: `{ "interval": "*/1 * * * *" }` (optional)
- `POST /api/crypto/scheduler/stop` - Stop scheduler

## ⏰ Otomatik Güncelleme

Server başladığında otomatik olarak scheduler çalışır ve belirli aralıklarla (varsayılan: 1 dakika) Binance API'den fiyatları çekip veritabanına kaydeder.

**Cron Expression Örnekleri:**
- `*/1 * * * *` - Her 1 dakika
- `*/5 * * * *` - Her 5 dakika
- `*/15 * * * *` - Her 15 dakika
- `0 * * * *` - Her saat başı
- `0 */6 * * *` - Her 6 saatte bir

## 🛠️ Tech Stack

- Node.js
- Express.js
- PostgreSQL (pg)
- Axios
- node-cron (Scheduler)
- Helmet (Security)
- CORS
- Morgan (Logging)
- Express Rate Limit
