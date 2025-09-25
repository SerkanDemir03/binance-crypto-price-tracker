#import os
import psycopg2
 
# Ortam değişkeninden parola alınıyor
#psql_password = os.getenv("PSQL_PASSWORD")
psql_password = 12345678
if not psql_password:
    raise ValueError("PSQL_PASSWORD ortam değişkeni ayarlanmadı!")
 
# Bağlantı bilgileri
db_config = {
    "host": "localhost",  #127.0.0.1
    "port": 5432,
    "database": "denemedb",
    "user": "postgres",
    "password": psql_password
}
 
# Bağlantıyı test et
try:
    conn = psycopg2.connect(**db_config)
    print("PostgreSQL bağlantısı başarılı!")
except Exception as e:
    print("Bağlantı hatası:", e)
finally:
    if 'conn' in locals():
        conn.close()
        print("Bağlantı kapatıldı.")