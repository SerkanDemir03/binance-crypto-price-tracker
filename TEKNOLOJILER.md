# Binance Crypto Price Tracker – Kullanılan Teknolojiler (Detaylı)

Bu dokümanda projede kullanılan tüm teknolojiler, **ne oldukları**, **nasıl kuruldukları** ve **projede ne için kullanıldıkları** anlatılmaktadır. Son bölümde **Express, React Query, pg ve Vite** projedeki gerçek kod örnekleriyle daha derinlemesine açıklanmaktadır.

---

## 1. Ortam ve Runtime

### 1.1 Node.js
- **Ne?** JavaScript’i sunucu tarafında çalıştıran runtime (V8 motoru).
- **Kurulum:** [nodejs.org](https://nodejs.org) LTS. Proje için **Node.js v16+** önerilir. Kontrol: `node -v`, `npm -v`.
- **Projede kullanım:** Backend’in tamamı Node.js ile çalışır (Express, API, WebSocket, scheduler, DB).

### 1.2 npm
- **Ne?** Node.js paket yöneticisi.
- **Projede kullanım:** `npm install`, `npm run dev`, `npm start`. Backend ve frontend ayrı `package.json` ile kullanılır.

---

## 2. Backend Teknolojileri (`backend/`)

| Teknoloji | Açıklama | Projede kullanım |
|-----------|----------|------------------|
| **Express.js** | Web framework (REST API, routing, middleware) | Ana uygulama: `app.js` – route’lar, middleware zinciri. |
| **dotenv** | `.env` → `process.env` | `server.js` başında; PORT, DB_*, CORS_ORIGIN, UPDATE_INTERVAL vb. |
| **pg** | PostgreSQL istemcisi (pool, parametreli sorgular) | `config/database.js` (pool), `databaseService.js` (INSERT/SELECT). |
| **axios** | HTTP istemcisi (Promise tabanlı) | Binance & CoinGecko API çağrıları (`binanceService`, `coingeckoService`). |
| **cors** | CORS header’ları | `app.use(cors({ origin: CORS_ORIGIN }))` – frontend origin’e izin. |
| **helmet** | Güvenlik header’ları | `app.use(helmet())` – XSS, clickjacking vb. koruma. |
| **morgan** | HTTP istek logu | `morgan('dev')` / `morgan('combined')` – method, URL, status. |
| **express-rate-limit** | IP bazlı istek sınırı (429) | `/api` genel limit; `/api/crypto/fetch` için özel fetchLimiter. |
| **compression** | Response gzip | `app.use(compression())` – bant genişliği azaltma. |
| **node-cron** | Zamanlanmış görev (cron) | Scheduler: `UPDATE_INTERVAL` ile `fetchAndSavePrices()`; fiat kurları saatlik. |
| **socket.io** | Gerçek zamanlı iletişim | Backend’de `httpServer` üzerinde; frontend’e push. |
| **ws** | WebSocket istemci | Binance `wss://stream.binance.com:9443/ws/!ticker@arr` bağlantısı. |
| **https-proxy-agent** | Proxy üzerinden HTTPS | `.env` BINANCE_PROXY (engelli bölge). |

**Dev:** nodemon (auto-restart), eslint, jest, supertest.

---

## 3. Frontend Teknolojileri (`frontend/`)

| Teknoloji | Açıklama | Projede kullanım |
|-----------|----------|------------------|
| **React 18** | UI kütüphanesi (bileşenler, hooks) | Tüm sayfalar ve ortak bileşenler. |
| **Vite** | Dev server + production build | `npm run dev` (HMR), `npm run build`, `npm run preview`. |
| **React Router v6** | Client-side routing | `App.jsx`: `/`, `/crypto/:symbol`, `/database`, `/news`, `/notes`, `/calculator`. |
| **React Query** | Veri çekme, cache, refetch | `useQuery` / `useMutation` – API verisi, cache key, staleTime, refetch. |
| **Axios** | HTTP istemcisi | `services/api.js` – base URL, interceptors, `cryptoAPI` fonksiyonları. |
| **Recharts** | Grafik bileşenleri | Kripto detay sayfası – fiyat geçmişi grafikleri. |
| **lightweight-charts** | Finansal grafikler | İsteğe bağlı fiyat/volume grafikleri. |
| **Tailwind CSS** | Utility-first CSS | Layout, renk, responsive, dark mode. |
| **Lucide React** | İkon seti | Buton, menü, kart ikonları. |
| **React Hot Toast** | Toast bildirimleri | `toast.success()` / `toast.error()` – API sonuçları. |
| **Zustand** | Global state | Tema, kullanıcı tercihleri. |

---

## 4. Veritabanı: PostgreSQL

- **Ne?** İlişkisel veritabanı sunucusu.
- **Kurulum:** [postgresql.org](https://www.postgresql.org/download/) veya paket yöneticisi; veritabanı + kullanıcı oluşturulur.
- **Projede:** Tablolar `tbl_binance2`, `coin_metadata`, `fiat_exchange_rates`. Backend `pg` ile bağlanır; `.env`: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`. Tablolar uygulama ilk açılışta `createTable()` ile oluşturulur.

---

## 5. Ortam Değişkenleri (.env)

- **Backend:** `backend/.env` – PORT, NODE_ENV, DB_*, TABLE_NAME, CORS_ORIGIN, BINANCE_API_URL, COINGECKO_API_URL, UPDATE_INTERVAL, WebSocket ve proxy.
- **Frontend:** `frontend/.env` – `VITE_API_URL=http://localhost:5000/api`.
- Örnek: Proje kökündeki `.env.example` kopyalanıp `.env` yapılır ve düzenlenir.

---

## 6. Hızlı Kurulum

1. Node.js (v16+) ve PostgreSQL kur.
2. **Backend:** `cd backend` → `npm install` → `.env` oluştur → `npm run dev`.
3. **Frontend:** `cd frontend` → `npm install` → `.env` (VITE_API_URL) → `npm run dev`.
4. Backend: http://localhost:5000, Frontend: http://localhost:3000.

---

# Detaylı Açıklamalar (Projede Nasıl Kullanıldıkları)

Aşağıda **Express**, **React Query**, **pg** ve **Vite** projedeki dosya ve kod örnekleriyle açıklanmaktadır.

---

## A. Express.js – İstek Akışı ve Route Yapısı

**Express ne yapar?** Gelen HTTP isteğini URL ve method’a göre ilgili fonksiyona (controller) yönlendirir; önce middleware’ler (cors, body parser, rate limit vb.) çalışır.

**Projedeki akış:**

1. **Giriş noktası:** `app.js`
   - `express()` ile uygulama oluşturulur.
   - Sırayla: `helmet` → `cors` → `rateLimit` (/api) → `express.json()` → `compression` → `morgan` → `/health` → `app.use('/api', apiRoutes)` → `notFound` → `errorHandler`.
   - Tüm `/api` istekleri `routes/index.js` içindeki router’a gider.

2. **Route hiyerarşisi:**
   - `routes/index.js`: `/api` altında `router.get('/')` (API bilgisi) ve `router.use('/crypto', cryptoRoutes)`.
   - `routes/crypto.routes.js`: `/api/crypto` altında tanımlar:
     - `GET /health/db` – veritabanı bağlantı testi (pool.query('SELECT NOW()')).
     - `GET /db/prices`, `GET /db/prices/:symbol`, `GET /db/history/:symbol`, `GET /db/statistics` – veritabanı verileri.
     - `POST /fetch` – **fetchLimiter** (rate limit) ile korunur; controller’da `fetchAndSavePrices` çağrılır.
     - Coin arama, doğrulama, silme, notlar, haber, calculator, chatbot vb. route’lar.
   - Her route bir **controller** fonksiyonuna bağlanır (örn. `cryptoController.getStatistics`, `cryptoController.fetchAndSavePrices`).

3. **Rate limiting örneği:** `crypto.routes.js` içinde `fetchLimiter` 30 saniyede 2 istek (IP + provider); aşılınca 429 ve `Retry-After` header’ı döner.

**Özet:** İstek → Express → middleware’ler → `/api/crypto/...` → crypto.routes → controller → service (database, binance, coingecko) → cevap.

---

## B. React Query – Veri Çekme ve Önbellek

**React Query ne yapar?** Sunucu verisini (API) çeker, cache’ler, yeniler; loading/error state’lerini ve refetch mantığını yönetir.

**Projede kullanım:**

1. **API katmanı:** `frontend/src/services/api.js`
   - `axios.create({ baseURL: VITE_API_URL })` ile tek instance.
   - Response interceptor: hata mesajı, 429’da toast yok (cache kullanılır), diğer 4xx/5xx’te `toast.error`.
   - `cryptoAPI`: `getLatestPricesFromDB`, `getPriceHistory`, `fetchAndSavePrices`, `searchCoins`, `getDatabaseDetails`, `getNotes`, `getAllNews` vb. Hepsi bu axios instance’ını kullanır.

2. **useQuery örnekleri:**
   - **Dashboard** (`DashboardPage.jsx`):  
     `useQuery(['latestPrices', allDisplayCoins.join(',')], () => cryptoAPI.getLatestPricesFromDB(...), { staleTime: 30000, cacheTime: 300000, retry: ..., refetchOnWindowFocus: false })`.  
     Cache key coin listesine bağlı; coinler değişince yeni istek. 429’da retry yapılmaz.
   - **CryptoDetail** (`CryptoDetailPage.jsx`):  
     Ayrı query’ler: `['latestPrice', symbol]`, `['24hStats', symbol]`, `['priceHistory', symbol, limit, timeRange]`, `['klines', symbol, interval]`, `['coinMetadata', symbol]`. Her biri ilgili API fonksiyonunu çağırır; sembol veya zaman aralığı değişince otomatik yeniden fetch.
   - **Database sayfası:** `useQuery(['databaseDetails', refetchKey], () => cryptoAPI.getDatabaseDetails())` – veritabanı durumu ve tablo bilgisi.
   - **News, Calculator, Notes:** Benzer şekilde `['news', ...]`, `['coinsForConverter']`, `['notes', userId, searchTerm]` ile cache’lenir.

3. **useMutation örneği (Notes):**  
   `useMutation(cryptoAPI.createNote, { onSuccess: () => queryClient.invalidateQueries(['notes']) })`.  
   Not eklendikten sonra `['notes']` cache’i geçersiz sayılır, liste yeniden çekilir. Update ve delete mutation’ları da aynı mantıkla `invalidateQueries` kullanır.

**Özet:** Tüm API verisi React Query ile merkezi; cache key sayesinde gereksiz istek azalır, 429 ve hata durumları tek yerde (api.js + query seçenekleri) yönetilir.

---

## C. pg (node-postgres) – Veritabanı Bağlantısı ve Kullanım

**pg ne yapar?** Node.js’ten PostgreSQL’e bağlanır; connection pool ile eşzamanlı sorguları yönetir, parametreli sorgularla SQL injection riskini azaltır.

**Projede kullanım:**

1. **Pool yapılandırması:** `backend/src/config/database.js`
   - `const pool = new Pool(dbConfig)` – `dbConfig`: host, port, database, user, password (env’den), max: 20, idleTimeoutMillis, connectionTimeoutMillis.
   - `pool.on('error', ...)` – bağlantı hatasında log ve yeniden deneme.
   - `pool.on('connect')`, `pool.on('remove')` – loglama.
   - `checkConnection()` – health check için kullanılabilir.
   - Modül `pool` export eder; tüm sorgular bu pool üzerinden yapılır.

2. **Kullanım yeri:** `databaseService.js`
   - `pool.query(createQuery)` – tablo oluşturma (CREATE TABLE IF NOT EXISTS).
   - `pool.query('INSERT INTO ... VALUES ($1, $2, $3)', [name, price, binancetime])` – fiyat kaydı.
   - SELECT’ler: son fiyatlar (ORDER BY binancetime DESC LIMIT 1), geçmiş (WHERE name = $1 AND binancetime BETWEEN ...), istatistik (COUNT, MIN, MAX, AVG).
   - Metadata ve fiat kurları tabloları da aynı pool ile yönetilir.

3. **Route’ta doğrudan kullanım:** `crypto.routes.js` içinde `GET /health/db` için `await pool.query('SELECT NOW()')` – hızlı bağlantı testi.

**Özet:** Tek pool, tüm backend sorguları; .env’deki DB_* değişkenleriyle güvenli ve ortam bazlı yapılandırma.

---

## D. Vite – Geliştirme ve Production Build

**Vite ne yapar?** Geliştirme sunucusunda ES modülleri doğrudan kullanır (hızlı başlangıç), HMR ile anında güncelleme; production’da Rollup ile bundle üretir.

**Projede kullanım:**

1. **Script’ler:** `frontend/package.json`
   - `npm run dev` → `vite` – geliştirme sunucusu (varsayılan http://localhost:3000).
   - `npm run build` → `vite build` – `dist/` klasörüne optimize edilmiş çıktı.
   - `npm run preview` → `vite preview` – build’i yerelde sunar (production benzeri test).

2. **Ortam değişkenleri:** Frontend’de sadece `VITE_` ile başlayan değişkenler kullanılabilir. `import.meta.env.VITE_API_URL` → `api.js` içinde base URL.

3. **Yapı:** `vite.config.js` ile React eklentisi (@vitejs/plugin-react), gerekirse proxy (API’yi aynı origin’den gibi göstermek) veya alias tanımlanabilir. Projede API ayrı portta (5000) olduğu için CORS backend’de çözülür; Vite sadece dev sunucusu ve build’den sorumludur.

**Özet:** Geliştirmede hızlı ve HMR’lı çalışma; production’da tek komutla (`npm run build`) statik dosyalar üretilir, istenirse herhangi bir static host’a konulabilir.

---

Bu doküman projedeki teknolojilerin hem listesini hem de dört ana bileşen (Express, React Query, pg, Vite) için proje içi kullanım detaylarını içerir. Belirli bir paket veya dosya için daha fazla ayrıntı istersen söylemen yeterli.
