# Binance Kripto Fiyat Takipçisi

Bu Python scripti, Binance API kullanarak seçili kripto para birimlerinin fiyatlarını çeker ve PostgreSQL veritabanına kaydeder. Veriler İstanbul saat dilimi ile timestamp’lenir. Grafana ile görselleştirilebilir ve eklenen fonksiyonlar sayesinde alış, kar/zarar gibi değerler hesaplanabilir.

## Özellikler
- Popüler kripto paraların fiyatlarını takip eder (BTC, ETH, ADA, XRP, LINK, MATIC vb.)
- PostgreSQL veritabanına veri kaydı
- Tablo oluşturma fonksiyonu ile tablo otomatik hazırlanır
- Rate limit, yetkisiz erişim ve sunucu hataları için hata yönetimi
- Zaman damgası ile kaydetme (Europe/Istanbul)
- Grafana entegrasyonu ile canlı veri görselleştirme
- Alış ve kar/zarar hesaplamaları

## Gereksinimler
- Python 3.9+
- Gerekli kütüphaneler:
  ```bash
  pip install requests psycopg2-binary zoneinfo
