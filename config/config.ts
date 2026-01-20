import { PrismaClient } from '@prisma/client';

// MySQL Connection Pool Ayarları
// URL'i dinamik olarak oluştur (şifre encoding sorununu çözmek için)
const buildDatabaseUrl = (): string => {
  // Eğer DATABASE_URL direkt verilmişse ve DB_USER yoksa, onu kullan
  if (process.env.DATABASE_URL && !process.env.DB_USER) {
    return process.env.DATABASE_URL;
  }

  // Ayrı ayrı verilmişse, URL'i oluştur
  const user = process.env.DB_USER || '';
  const password = process.env.DB_PASSWORD || '';
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '3018';
  const database = process.env.DB_NAME || '';

  // Şifreyi encode et (özel karakterler için)
  const encodedPassword = encodeURIComponent(password);

  return `mysql://${user}:${encodedPassword}@${host}:${port}/${database}`;
};

// Log seviyeleri için tip tanımı (Prisma'nın beklediği format)
type LogLevel = 'query' | 'info' | 'warn' | 'error';

// Connection pool ayarları ile Prisma Client
export const prisma = new PrismaClient({
  log: (process.env.NODE_ENV === 'development'
    ? ['query', 'error', 'warn']
    : ['error']) as LogLevel[],
  datasources: {
    db: {
      url: buildDatabaseUrl(),
    },
  },
});

// Bağlantıyı test et
let connectionTested: boolean = false;

const testConnection = async (): Promise<void> => {
  if (connectionTested) return;

  try {
    await prisma.$connect();
    console.log('✅ MySQL veritabanına başarıyla bağlandı');
    console.log(
      `📊 Connection Pool: limit=${process.env.DB_CONNECTION_LIMIT || '10'}, timeout=${process.env.DB_POOL_TIMEOUT || '20'}s`
    );
    connectionTested = true;
  } catch (error) {
    // TypeScript'te error 'unknown' tipindedir, güvenli erişim için kontrol ediyoruz
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    
    console.error('❌ MySQL bağlantı hatası:', errorMessage);
    console.error('💡 Lütfen .env dosyanızda şu değişkenleri kontrol edin:');
    console.error('   - DATABASE_URL (mysql://kullanici:sifre@host:port/veritabani)');
    console.error('   - DB_CONNECTION_LIMIT (opsiyonel, varsayılan: 10)');
    console.error('   - DB_POOL_TIMEOUT (opsiyonel, varsayılan: 20)');
    throw error;
  }
};

// Uygulama başlarken bağlantıyı test et
testConnection().catch(() => {
  // Hata durumunda uygulama çalışmaya devam edebilir (isteğe bağlı)
  // Veya process.exit(1) ile çıkabilirsiniz
});

// Graceful shutdown
// Node.js process event listener'ları
process.on('beforeExit', async () => {
  await prisma.$disconnect();
  console.log('🔌 MySQL bağlantısı kapatıldı');
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});