#import os
import requests                      
import psycopg2
from datetime import datetime
import pytz        

psql_password = "12345678"

db_config = {
    "host": "localhost",
    "port": 5432,
    "database": "postgres",
    "user":  "postgres",
    "password": "12345678"
}

symbols = [
    "BTCUSDT", "ETHUSDT", "BCCUSDT", "NEOUSDT", "LTCUSDT", "QTUMUSDT", "ADAUSDT",
    "XRPUSDT", "EOSUSDT", "TUSDUSDT", "IOTAUSDT", "XLMUSDT", "ONTUSDT", "TRXUSDT",
    "ETCUSDT", "ICXUSDT", "VENUSDT", "NULSUSDT", "VETUSDT", "PAXUSDT", "BCHABCUSDT",
    "BCHSVUSDT", "USDCUSDT", "LINKUSDT", "WAVESUSDT", "BTTUSDT", "USDSUSDT", "ONGUSDT",
    "HOTUSDT", "ZILUSDT", "ZRXUSDT", "FETUSDT", "BATUSDT", "XMRUSDT", "ZECUSDT",
    "IOSTUSDT", "CELRUSDT", "DASHUSDT", "NANOUSDT", "OMGUSDT", "THETAUSDT",
    "ENJUSDT", "MITHUSDT", "MATICUSDT", "ATOMUSDT", "TFUELUSDT", "ONEUSDT",
    "FTMUSDT", "ALGOUSDT"
]

binance_api_url = "https://api.binance.com/api/v3/ticker/price"


def create_table(cursor, table_name="tbl_binance2_staj"):
    """
    İstenilen tabloyu ve kolonları oluşturur.
    Varsayılan tablo: tbl_binance2_staj
    Kolonlar: id (primary key), name, price, binancetime
    """
    create_query = f"""
    CREATE TABLE IF NOT EXISTS {table_name} (
        id SERIAL PRIMARY KEY,
        name VARCHAR(20),
        price NUMERIC,
        binancetime TIMESTAMP
    );
    """
    cursor.execute(create_query)
    print(f"[OK] Tablo '{table_name}' oluşturuldu veya zaten mevcut.")


try:
    conn = psycopg2.connect(**db_config)
    cursor = conn.cursor()

    # Tabloyu oluştur
    create_table(cursor)

    # Binance API'den veri çek ve tabloya ekle
    for symbol in symbols:
        response = requests.get(binance_api_url, params={"symbol": symbol})

        if response.status_code == 200:
            data = response.json()
            name = data['symbol']
            price = float(data['price'])
            istanbul_tz = pytz.timezone("Europe/Istanbul")
            now = datetime.now(istanbul_tz)
            cursor.execute("""
                INSERT INTO tbl_binance2_staj (name, price, binancetime)
                VALUES (%s, %s, %s);
            """, (name, price, now))

            print(f"[OK] {name} verisi eklendi: {price}")
        elif response.status_code == 401:
            print(f"[!] {symbol}: Yetkisiz erişim (401). API kimlik doğrulaması gerekebilir.")
        elif response.status_code == 429:
            print(f"[!] {symbol}: Çok fazla istek atıldı (429). Rate limit'e takıldınız.")
        elif 500 <= response.status_code < 600:
            print(f"[!] {symbol}: Binance sunucusu hatası ({response.status_code}).")
        else:
            print(f"[!] {symbol}: Beklenmeyen durum kodu: {response.status_code}")

    conn.commit()
    print("Tüm Veriler İşleme Alındı.")

except Exception as e:
    print("Hata:", e)

finally:
    if 'cursor' in locals():
        cursor.close()
    if 'conn' in locals():
        conn.close()
