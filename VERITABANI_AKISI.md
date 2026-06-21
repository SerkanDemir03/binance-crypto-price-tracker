# Veritabanı Akışı ve Coin Ekleme Süreci

## 📊 Veritabanı Yapısı

### Tablo: `tbl_binance2`
```sql
CREATE TABLE tbl_binance2 (
  id SERIAL PRIMARY KEY,   -- sequence: tbl_binance2_id_seq (nextval('tbl_binance2_id_seq'::regclass))
  name VARCHAR(20),        -- Coin symbol (örn: BTCUSDT, DOGEUSDT)
  price NUMERIC,            -- Coin fiyatı
  binancetime TIMESTAMP    -- Kayıt zamanı
);
```

## 🔄 Coin Ekleme Akışı

### 1. Kullanıcı Coin Ekler
- Frontend'de "Coin Ekle" butonuna tıklar
- Coin arama sonuçlarından seçer veya manuel symbol girer

### 2. Backend İşlemleri

#### Adım 1: Coin Validate ve Fiyat Çekme
```
Frontend → Backend: validateCoin(symbol, saveToDb=true)
                    veya
                    getPriceByCoinId(coinId, symbol, saveToDb=true)
```

#### Adım 2: Veritabanına Kaydetme
```javascript
// Backend'de otomatik olarak:
1. Tablo kontrolü (yoksa oluştur)
2. API'den fiyat çek (CoinGecko)
3. Veritabanına INSERT yap:
   INSERT INTO tbl_binance2 (name, price, binancetime)
   VALUES ('DOGEUSDT', 0.149963, '2025-11-26 13:42:22')
```

#### Adım 3: Tüm Custom Coin'ler İçin Fiyat Güncelleme
```
Frontend → Backend: fetchAndSavePrices(provider, customSymbols)
```

Backend'de:
- Tüm custom coin'ler için fiyatları çek
- Her birini veritabanına kaydet
- Veritabanından güncel verileri döndür

### 3. Veritabanı İşlemleri

#### `savePrice(symbol, price)` Fonksiyonu
```javascript
// Her coin ekleme işleminde:
1. createTable() - Tablo yoksa oluştur
2. INSERT query çalıştır
3. Kayıt ID'sini döndür
```

#### `saveAllPrices(prices)` Fonksiyonu
```javascript
// Toplu coin güncelleme için:
1. Transaction başlat (BEGIN)
2. Her coin için INSERT
3. Transaction commit (COMMIT)
```

## 🔍 Veritabanı Durumu Kontrolü

### Endpoint: `/api/crypto/health/database-status`
```json
{
  "status": "success",
  "data": {
    "connected": true,
    "timestamp": "2025-11-26T13:42:22.000Z",
    "version": "PostgreSQL 14.x",
    "tableExists": true,
    "coinCount": 5,
    "tableName": "tbl_binance2",
    "message": "Veritabanı aktif ve çalışıyor. 5 farklı coin takip ediliyor."
  }
}
```

## 📝 Coin Ekleme Örnek Akışı

### Senaryo: DOGE Coin'i Ekleme

1. **Kullanıcı "DOGE" yazar ve ekler**
   ```
   Frontend: handleAddCoin("DOGE")
   ```

2. **Backend: Coin Validate**
   ```
   validateCoin("DOGE", saveToDb=true)
   → CoinGecko API'den fiyat çek: $0.149963
   → Veritabanına kaydet: DOGEUSDT, 0.149963, timestamp
   → Response: { valid: true, savedToDb: true, price: 0.149963 }
   ```

3. **Frontend: Custom Listeye Ekle**
   ```
   customCoins = [...customCoins, "DOGE"]
   localStorage'a kaydet
   ```

4. **Backend: Tüm Custom Coin'ler İçin Fiyat Güncelle**
   ```
   fetchAndSavePrices("coingecko", ["DOGE"])
   → CoinGecko API'den DOGE fiyatını çek
   → Veritabanına kaydet (yeni kayıt)
   → Veritabanından güncel verileri döndür
   ```

5. **Frontend: Dashboard Güncelle**
   ```
   getLatestPricesFromDB(["DOGE"])
   → Veritabanından DOGEUSDT kaydını çek
   → Dashboard'da göster
   ```

## ✅ Veritabanı Aktif Çalışma Kontrolü

### Backend Başlangıcında
```javascript
// database.js
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection error');
  } else {
    console.log('✅ Database connected successfully');
  }
});
```

### Her Coin Ekleme İşleminde
```javascript
// databaseService.js - savePrice()
1. createTable() - Tablo kontrolü
2. INSERT query - Veritabanına kayıt
3. RETURNING * - Kayıt ID'si döndürülür
```

## 🎯 Özet

1. **Veritabanı Aktif**: Backend başladığında otomatik bağlanır
2. **Coin Ekleme**: Her coin ekleme işleminde otomatik veritabanına kaydedilir
3. **Fiyat Güncelleme**: Custom coin'ler için fiyatlar otomatik çekilip kaydedilir
4. **Dashboard**: Veritabanından veriler okunur ve gösterilir

## 🔧 Sorun Giderme

### Veritabanı Bağlantı Hatası
- PostgreSQL servisinin çalıştığından emin olun
- `.env` dosyasındaki DB bilgilerini kontrol edin
- `/api/crypto/health/database-status` endpoint'ini kontrol edin

### Coin Veritabanına Kaydedilmiyor
- Backend loglarını kontrol edin: `✅ DOGEUSDT coin'i veritabanına kaydedildi`
- `saveToDb` parametresinin `true` olduğundan emin olun
- Veritabanı bağlantısını kontrol edin

