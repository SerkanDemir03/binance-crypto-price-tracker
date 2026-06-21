# Binance Crypto Price Tracker

Modern, full-stack web uygulaması ile Binance ve CoinGecko kripto para fiyatlarını takip edin. Grafiklerle fiyat geçmişini görselleştirin, veritabanı yönetimi yapın ve manuel güncellemeler alın.

## 🏗️ Proje Yapısı

```
binance-crypto-price-tracker/
├── backend/              # Node.js/Express.js API
│   ├── src/
│   │   ├── config/      # Yapılandırma dosyaları
│   │   ├── controllers/ # Request handler'lar
│   │   ├── middleware/  # Custom middleware'ler
│   │   ├── routes/      # API route tanımlamaları
│   │   ├── services/    # İş mantığı katmanı
│   │   │   ├── binanceService.js    # Binance API servisi
│   │   │   ├── coingeckoService.js  # CoinGecko API servisi
│   │   │   ├── databaseService.js   # Veritabanı servisi
│   │   │   └── schedulerService.js   # Scheduler servisi
│   │   ├── utils/       # Yardımcı fonksiyonlar
│   │   ├── app.js       # Express app konfigürasyonu
│   │   └── server.js    # Server başlatma
│   ├── .env.example
│   ├── .gitignore
│   ├── package.json
│   └── README.md
│
├── frontend/            # React Frontend
│   ├── src/
│   │   ├── components/  # Reusable bileşenler
│   │   │   ├── Common/  # Ortak bileşenler
│   │   │   └── Layout/  # Layout bileşenleri
│   │   ├── contexts/    # React Context'ler (Theme)
│   │   ├── pages/       # Sayfa bileşenleri
│   │   │   ├── Dashboard/           # Ana dashboard
│   │   │   ├── CryptoDetail/        # Kripto detay sayfası
│   │   │   └── Database/            # Veritabanı yönetim sayfası
│   │   ├── services/    # API servisleri
│   │   ├── App.jsx      # Ana uygulama
│   │   ├── main.jsx     # Entry point
│   │   └── index.css    # Global stiller
│   ├── .gitignore
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── README.md
│
├── binance.py           # Python script (manuel veri çekme)
├── psqltest.py          # PostgreSQL test script
├── README.md            # Ana README
└── VERITABANI_AKISI.md  # Veritabanı akış dokümantasyonu
```

## 🚀 Teknolojiler

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **PostgreSQL** - Database
- **pg** - PostgreSQL client
- **Axios** - HTTP client
- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing
- **Morgan** - HTTP request logger
- **Rate Limiting** - API protection
- **node-cron** - Scheduler (manuel güncelleme için hazır)
- **Compression** - Response compression

### Frontend
- **React 18** - UI library
- **Vite** - Build tool
- **React Router v6** - Routing
- **React Query** - Data fetching & caching
- **Recharts** - Chart library
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **Lucide React** - Icons
- **React Hot Toast** - Notifications
- **Zustand** - State management
- **Theme Context** - Dark/Light mode desteği

### Python Scripts
- **Python 3** - Script runtime
- **psycopg2** - PostgreSQL client
- **requests** - HTTP client
- **pytz** - Timezone handling

## 📦 Kurulum

### Gereksinimler

- Node.js v16 veya üzeri
- PostgreSQL v12 veya üzeri
- npm veya yarn
- Python 3 (opsiyonel - Python script için)

### Backend Kurulumu

```bash
# Backend klasörüne git
cd backend

# Dependencies yükle
npm install

# Environment değişkenlerini ayarla
cp .env.example .env
# .env dosyasını düzenle

# PostgreSQL'nin çalıştığından emin ol

# Development modunda başlat
npm run dev

# Production modunda başlat
npm start
```

Backend `http://localhost:5000` adresinde çalışacaktır.

### Frontend Kurulumu

```bash
# Frontend klasörüne git
cd frontend

# Dependencies yükle
npm install

# Environment değişkenlerini ayarla
# .env dosyası oluştur ve VITE_API_URL=http://localhost:5000/api ekle

# Development server başlat
npm run dev

# Production build
npm run build

# Production preview
npm run preview
```

Frontend `http://localhost:3000` adresinde çalışacaktır.

### Python Script Kurulumu (Opsiyonel)

```bash
# Python dependencies yükle
pip install psycopg2-binary requests pytz

# Script'i çalıştır
python binance.py
```

**Not:** Python script, Binance API'den veri çekip doğrudan PostgreSQL veritabanına kaydeder. Bu script, backend API'den bağımsız olarak çalışabilir.

## 🔌 Environment Variables

### Backend (.env)
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
TABLE_NAME=tbl_binance2

# Scheduler Configuration (Cron expression)
# Şu anda otomatik güncelleme kapalı, sadece manuel güncelleme yapılıyor
# UPDATE_INTERVAL=*/5 * * * *  # Her 5 dakikada bir (varsayılan)
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000/api
```

## 📚 API Endpoints

### Binance API Routes
- `GET /api/crypto/prices` - Tüm kripto para fiyatlarını getir (Binance API)
- `GET /api/crypto/prices/:symbol` - Belirli bir kripto para fiyatını getir
- `GET /api/crypto/stats/:symbol` - 24 saatlik istatistikleri getir

### Database Routes
- `GET /api/crypto/db/prices` - Veritabanından tüm son fiyatları getir
- `GET /api/crypto/db/prices/:symbol` - Veritabanından belirli bir kripto para fiyatını getir
- `GET /api/crypto/db/history/:symbol` - Fiyat geçmişini getir
  - Query params: `limit` (default: 100), `startDate`, `endDate`
- `GET /api/crypto/db/histories` - Toplu fiyat geçmişi getir (batch endpoint)
- `GET /api/crypto/db/statistics` - İstatistikleri getir
  - Query params: `symbol` (optional)

### Fetch and Save
- `POST /api/crypto/fetch` - Binance veya CoinGecko API'den fiyatları çek ve veritabanına kaydet
  - Body: `{ provider: "binance" | "coingecko", customSymbols?: string[] }`
  - Rate limited: Dakikada 1 istek

### Coin Management Routes
- `GET /api/crypto/coins/search` - Coin arama (CoinGecko)
- `GET /api/crypto/coins/validate` - Coin doğrulama ve fiyat çekme
  - Query params: `symbol`, `saveToDb` (boolean)
- `POST /api/crypto/coins/price-by-id` - Coin ID ile fiyat çekme
  - Body: `{ coinId, symbol, saveToDb?: boolean }`
- `POST /api/crypto/coins/prices` - Özel symbol listesi ile fiyat çekme
- `DELETE /api/crypto/coins/delete` - Coin silme
  - Query params: `symbol`

### Health Check Routes
- `GET /api/crypto/health/db` - Veritabanı bağlantı kontrolü
- `GET /api/crypto/health/apis` - Binance ve CoinGecko API durumu
- `GET /api/crypto/health/database-status` - Veritabanı durum bilgisi
- `GET /api/crypto/database/details` - Detaylı veritabanı bilgileri

### Scheduler Routes
- `GET /api/crypto/scheduler/status` - Scheduler durumu
- `POST /api/crypto/scheduler/start` - Scheduler başlat
- `POST /api/crypto/scheduler/stop` - Scheduler durdur

**Not:** Şu anda otomatik scheduler kapalıdır. Fiyat güncellemeleri manuel olarak `/api/crypto/fetch` endpoint'i ile yapılmaktadır.

## 🎨 Frontend Sayfaları

- `/` - **Dashboard** - Tüm kripto paraların kartları, arama ve filtreleme
- `/crypto/:symbol` - **Kripto Detay Sayfası** - Grafikler, istatistikler ve fiyat geçmişi
- `/database` - **Veritabanı Yönetimi** - Veritabanı durumu, tablo bilgileri, coin ekleme/silme, manuel fiyat güncelleme

### Özellikler
- 🌓 **Dark/Light Mode** - Tema değiştirme desteği
- 📊 **Gerçek Zamanlı Grafikler** - Recharts ile interaktif grafikler
- 🔍 **Coin Arama ve Ekleme** - CoinGecko API ile coin arama ve ekleme
- 💾 **Veritabanı Yönetimi** - Veritabanı durumu, tablo yapısı ve veri yönetimi
- 🔄 **Manuel Güncelleme** - Binance veya CoinGecko'dan manuel fiyat güncelleme
- 📈 **Fiyat Geçmişi** - Tarihsel fiyat verilerini görüntüleme
- 📱 **Responsive Design** - Mobil uyumlu arayüz

## 🏃 Hızlı Başlangıç

### Tüm projeyi aynı anda başlatmak için:

```bash
# Terminal 1 - Backend
cd backend
npm install
npm run dev

# Terminal 2 - Frontend
cd frontend
npm install
npm run dev
```

Tarayıcınızda `http://localhost:3000` adresini açın.

## 📝 Notlar

### Önemli Bilgiler
- Proje development aşamasındadır
- **Otomatik fiyat güncelleme şu anda kapalıdır** - Sadece manuel güncelleme yapılmaktadır
- Production ortamına geçmeden önce environment değişkenlerini güncellemeyi unutmayın
- PostgreSQL connection string'ini production veritabanınıza güncelleyin
- Binance ve CoinGecko API rate limit'lerine dikkat edin
- `/api/crypto/fetch` endpoint'i rate limited'dir (dakikada 1 istek)

### Veri Kaynakları
- **Binance API** - Binance'de işlem gören kripto paralar için
- **CoinGecko API** - Daha geniş coin yelpazesi için alternatif kaynak
- **PostgreSQL** - Tüm fiyat verileri `tbl_binance2` tablosunda saklanır

### Veritabanı Yapısı
```sql
CREATE TABLE tbl_binance2 (
  id SERIAL PRIMARY KEY,
  name VARCHAR(20),        -- Coin symbol (örn: BTCUSDT, DOGEUSDT)
  price NUMERIC,            -- Coin fiyatı
  binancetime TIMESTAMP    -- Kayıt zamanı
);
```

### Python Script Kullanımı
`binance.py` script'i, backend API'den bağımsız olarak Binance API'den veri çekip doğrudan veritabanına kaydedebilir. Bu script, backend servisinin çalışmadığı durumlarda kullanılabilir.

Detaylı veritabanı akışı için `VERITABANI_AKISI.md` dosyasına bakabilirsiniz.

## 📄 License

MIT License

---

**Happy Coding! 🚀**
