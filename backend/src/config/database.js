const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '12345678',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('⚠️ Unexpected error on idle client:', err.message);
  // Process.exit yerine sadece log yap, server çalışmaya devam etsin
  // process.exit(-1);
});

// Test connection (async, non-blocking)
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection error:', err.message);
    console.error('⚠️ Backend çalışmaya devam edecek, ancak veritabanı işlemleri başarısız olabilir.');
    console.error('💡 PostgreSQL servisinin çalıştığından ve bağlantı bilgilerinin doğru olduğundan emin olun.');
  } else {
    console.log('✅ Database connected successfully');
  }
});

module.exports = pool;

