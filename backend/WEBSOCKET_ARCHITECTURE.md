# Hybrid Data Collection Engine Architecture

## 🏗️ Architecture Overview

This document describes the robust, rate-limit-proof data collection engine implemented for the Crypto Analysis App.

## 📊 Data Flow Architecture

### 1. **Real-Time Data (Hot Path) - Binance WebSocket**

```
Binance WebSocket Stream
    ↓
PriceService (priceService.js)
    ↓
PostgreSQL Database (tbl_binance2)
    ↓
Socket.io → Frontend (Real-time updates)
```

**Features:**
- Direct WebSocket connection to Binance (`wss://stream.binance.com:9443/ws/!ticker@arr`)
- Automatic reconnection with exponential backoff
- Heartbeat mechanism to keep connection alive
- In-memory price cache for fast access
- Real-time price updates emitted to frontend via Socket.io

### 2. **Metadata & Info (Cold Path) - CoinGecko API**

```
CoinGecko API Request
    ↓
MetadataService (metadataService.js)
    ↓
PostgreSQL Database (coin_metadata) - 24-hour cache
    ↓
Return to Client
```

**Features:**
- 24-hour caching in PostgreSQL
- Only fetches from CoinGecko if data is missing or stale
- Uses `ccxt` library for safe API requests with rate limiting
- Automatic fallback to stale data if API fails

## 📁 File Structure

```
backend/src/
├── services/
│   ├── priceService.js          # Binance WebSocket streaming
│   ├── metadataService.js       # CoinGecko metadata with caching
│   ├── databaseService.js       # Database operations (updated with metadata)
│   ├── binanceService.js        # Existing REST API service
│   └── coingeckoService.js      # Existing REST API service
├── controllers/
│   └── crypto.controller.js     # Updated with new endpoints
├── app.js                       # Updated with Socket.io
└── server.js                    # Updated to initialize services
```

## 🔌 WebSocket Service (priceService.js)

### Key Features:
- **Connection Management**: Automatic connection, reconnection, and heartbeat
- **Symbol Tracking**: Dynamic add/remove symbols from tracking
- **Price Updates**: Real-time price updates saved to database and emitted to frontend
- **Status Monitoring**: Get connection status and tracked symbols

### Usage:
```javascript
const PriceService = require('./services/priceService');

// Initialize with Socket.io instance
const priceService = new PriceService(io);

// Start tracking symbols
await priceService.initialize(['BTCUSDT', 'ETHUSDT', 'SOLUSDT']);

// Add new symbol
priceService.addSymbol('DOGEUSDT');

// Remove symbol
priceService.removeSymbol('DOGEUSDT');

// Get status
const status = priceService.getStatus();
```

## 📚 Metadata Service (metadataService.js)

### Key Features:
- **24-Hour Caching**: Metadata cached in PostgreSQL for 24 hours
- **Smart Fetching**: Only fetches from CoinGecko if cache is stale or missing
- **Rate Limit Protection**: Uses `ccxt` library with built-in rate limiting
- **Fallback Strategy**: Returns stale data if API fails

### Usage:
```javascript
const MetadataService = require('./services/metadataService');
const metadataService = new MetadataService();

// Get metadata (checks cache first)
const metadata = await metadataService.getMetadata('BTC', 'bitcoin');

// Batch fetch
const metadataList = await metadataService.getBatchMetadata(['BTC', 'ETH', 'SOL']);

// Invalidate cache
await metadataService.invalidateCache('BTC');
```

## 🗄️ Database Schema

### Price Table (existing)
```sql
CREATE TABLE tbl_binance2 (
  id SERIAL PRIMARY KEY,
  name VARCHAR(20),
  price NUMERIC,
  binancetime TIMESTAMP
);
```

### Metadata Table (new)
```sql
CREATE TABLE coin_metadata (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(20) UNIQUE NOT NULL,
  coin_id VARCHAR(100),
  name VARCHAR(200),
  logo_url TEXT,
  description TEXT,
  market_cap NUMERIC,
  market_cap_rank INTEGER,
  homepage TEXT,
  whitepaper TEXT,
  categories JSONB,
  current_price NUMERIC,
  price_change_24h NUMERIC,
  circulating_supply NUMERIC,
  total_supply NUMERIC,
  max_supply NUMERIC,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🔌 Socket.io Integration

### Server-Side Events:
- `price-update`: Batch price updates (all symbols)
- `price-update-single`: Single symbol price update
- `connected`: Connection confirmation

### Client-Side Events:
- `subscribe-symbols`: Subscribe to specific symbols
- `disconnect`: Handle disconnection

### Frontend Integration Example:
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:5000');

socket.on('connected', (data) => {
  console.log('Connected to price stream');
});

socket.on('price-update-single', (update) => {
  console.log('Price update:', update);
  // Update UI with new price
});

socket.emit('subscribe-symbols', ['BTCUSDT', 'ETHUSDT']);
```

## 📡 API Endpoints

### WebSocket/Price Service
- `GET /api/crypto/websocket/status` - Get WebSocket service status
- `POST /api/crypto/websocket/symbols/add` - Add symbol to tracking
- `POST /api/crypto/websocket/symbols/remove` - Remove symbol from tracking

### Metadata
- `GET /api/crypto/metadata/:symbol` - Get coin metadata (with caching)
- `POST /api/crypto/metadata/invalidate` - Invalidate metadata cache

## 🚀 Installation & Setup

### 1. Install Dependencies
```bash
npm install
```

New packages added:
- `ws`: WebSocket client for Node.js
- `socket.io`: Real-time bidirectional communication
- `ccxt`: Cryptocurrency exchange trading library

### 2. Environment Variables
No new environment variables required. Uses existing database configuration.

### 3. Start Server
```bash
npm run dev
```

The server will:
1. Initialize database tables (including metadata table)
2. Start Socket.io server
3. Connect to Binance WebSocket
4. Begin streaming real-time prices

## 🔄 Data Flow Example

### Real-Time Price Update:
1. Binance WebSocket receives price update for BTCUSDT
2. `priceService.js` processes the update
3. Price saved to `tbl_binance2` table
4. Price emitted to frontend via Socket.io (`price-update-single` event)
5. Frontend updates UI in real-time

### Metadata Request:
1. Client requests metadata for BTC
2. `metadataService.js` checks PostgreSQL cache
3. If cache exists and is < 24 hours old → return cached data
4. If cache is stale or missing → fetch from CoinGecko API
5. Save fresh data to PostgreSQL
6. Return metadata to client

## 🛡️ Rate Limit Protection

### Binance WebSocket:
- No rate limits (streaming connection)
- Automatic reconnection on disconnect
- Heartbeat to keep connection alive

### CoinGecko API:
- 24-hour caching reduces API calls by ~99%
- `ccxt` library handles rate limiting automatically
- Fallback to stale data if API fails

## 📊 Performance Benefits

1. **Real-Time Updates**: WebSocket provides instant price updates (no polling)
2. **Reduced API Calls**: 24-hour metadata caching minimizes CoinGecko requests
3. **Database Optimization**: Indexed tables for fast queries
4. **Scalability**: WebSocket handles multiple clients efficiently

## 🔧 Troubleshooting

### WebSocket Not Connecting:
- Check Binance WebSocket URL is accessible
- Verify firewall allows WebSocket connections
- Check server logs for connection errors

### Metadata Not Caching:
- Verify `coin_metadata` table exists
- Check database connection
- Review `metadataService.js` logs

### Socket.io Not Working:
- Verify CORS settings in `app.js`
- Check frontend Socket.io client configuration
- Review browser console for connection errors

## 📝 Notes

- WebSocket connection is established on server startup
- Metadata table is created automatically on first use
- All services handle errors gracefully and continue operation
- Price updates are saved to database AND emitted to frontend simultaneously
