require('dotenv').config();
const app = require('./app');
const schedulerService = require('./services/schedulerService');
const { UPDATE_INTERVAL } = require('./config/constants');

const PORT = process.env.PORT || 5000;

// Server'ı başlat
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⏰ Auto-update interval: ${UPDATE_INTERVAL}`);
  
  // İlk açılışta bir kez fiyatları güncelle (scheduler başlatma, sadece manuel güncelleme)
  try {
    console.log(`🔄 İlk açılışta fiyatlar güncelleniyor...`);
    
    // Tabloyu oluştur ve ilk fiyatları çek
    setTimeout(async () => {
      try {
        const databaseService = require('./services/databaseService');
        await databaseService.createTable();
        await schedulerService.fetchAndSavePrices();
        console.log(`✅ fiyat güncellemesi tamamlandı`);
      } catch (error) {
        console.error('⚠️ İlk fiyat güncellemesi sırasında hata:', error.message);
      }
    }, 3000); // 3 saniye bekle, server'ın tamamen başlamasını bekle
    
    console.log(`ℹ️ Otomatik güncelleme kapalı - Sadece manuel güncelleme yapılacak`);
  } catch (error) {
    console.error('⚠️ İlk güncelleme başlatılırken hata oluştu:', error.message);
  }
});

// Unhandled error handling
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.error('⚠️ Server çalışmaya devam edecek...');
  // process.exit(1) yerine sadece log yap
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  console.error('⚠️ Server çalışmaya devam edecek...');
  // process.exit(1) yerine sadece log yap
});

