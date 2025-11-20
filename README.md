# Binance Crypto Price Tracker

Modern, full-stack web uygulaması ile Binance kripto para fiyatlarını takip edin. Grafiklerle fiyat geçmişini görselleştirin ve gerçek zamanlı güncellemeler alın.

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
│   │   ├── utils/       # Yardımcı fonksiyonlar
│   │   ├── app.js       # Express app konfigürasyonu
│   │   └── server.js    # Server başlatma
│   ├── .env.example
│   ├── .gitignore
│   ├── package.json
│   └── README.md
│
└── frontend/            # React Frontend
    ├── src/
    │   ├── components/  # Reusable bileşenler
    │   ├── pages/       # Sayfa bileşenleri
    │   ├── services/    # API servisleri
    │   ├── App.jsx      # Ana uygulama
    │   ├── main.jsx     # Entry point
    │   └── index.css    # Global stiller
    ├── .gitignore
    ├── package.json
    ├── vite.config.js
    └── README.md
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

### Frontend
- **React 18** - UI library
- **Vite** - Build tool
- **React Router v6** - Routing
- **React Query** - Data fetching
- **Recharts** - Chart library
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **Lucide React** - Icons
- **React Hot Toast** - Notifications

## 📦 Kurulum

### Gereksinimler

- Node.js v16 veya üzeri
- PostgreSQL v12 veya üzeri
- npm veya yarn

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
TABLE_NAME=tbl_binance2_staj
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000/api
```

## 📚 API Endpoints

### Binance API Routes
- `GET /api/crypto/prices` - Tüm kripto para fiyatlarını getir
- `GET /api/crypto/prices/:symbol` - Belirli bir kripto para fiyatını getir
- `GET /api/crypto/stats/:symbol` - 24 saatlik istatistikleri getir

### Database Routes
- `GET /api/crypto/db/prices` - Veritabanından tüm son fiyatları getir
- `GET /api/crypto/db/prices/:symbol` - Veritabanından belirli bir kripto para fiyatını getir
- `GET /api/crypto/db/history/:symbol` - Fiyat geçmişini getir
- `GET /api/crypto/db/statistics` - İstatistikleri getir

### Fetch and Save
- `POST /api/crypto/fetch` - Binance API'den fiyatları çek ve veritabanına kaydet

## 🎨 Frontend Sayfaları

- `/` - Dashboard (Tüm kripto paraların kartları)
- `/crypto/:symbol` - Kripto para detay sayfası (Grafikler ve istatistikler)

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

- Proje development aşamasındadır
- Production ortamına geçmeden önce environment değişkenlerini güncellemeyi unutmayın
- PostgreSQL connection string'ini production veritabanınıza güncelleyin
- Binance API rate limit'lerine dikkat edin

## 📄 License

MIT License

---

**Happy Coding! 🚀**
