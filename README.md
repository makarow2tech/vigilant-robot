# KRYPT — bağımsız sürüm

Uçtan uca şifreli, anonim tartışma ağı. Arayüz tarayıcıda çalışır, içerik tarayıcıda şifrelenir;
sunucu yalnızca şifreli blokları ve anahtar zarflarını saklar. Base44 hesabı, harici servis veya
veritabanı sunucusu gerekmez.

## Çalıştırma

    npm install
    npm run build     # arayüzü dist/ içine derler
    npm start         # http://localhost:3000

Geliştirme sırasında iki terminal:

    npm start         # API + statik sunucu (port 3000)
    npm run dev       # Vite, port 5173 (API istekleri 3000'e yönlenir)

Ortam değişkenleri: PORT (varsayılan 3000), KRYPT_DB (varsayılan data/db.json).
Node.js 20 veya üzeri gerekir.

## Yapı

    server/index.mjs   HTTP sunucusu: /api/* uçları, dist/ ve uploads/ dosyaları
    server/api.mjs     İş mantığı: gönderi, yorum, oy, kayıt, kasa, topluluk
    server/store.mjs   data/db.json dosya deposu (atomik yazım, tek yazma kuyruğu)
    src/lib/crypto.js  AES-256-GCM + RSA-4096 + PBKDF2 kasa (tarayıcıda çalışır)
    src/lib/anon.js    Cihaza özel anonim kimlik ve silme anahtarı
    src/routes/        Akış, topluluklar, gönderi, yeni gönderi, ayarlar, protokol
    src/components/    Arayüz bileşenleri (site, forum, kasa, ayarlar)

## Güvenlik modeli

- Gönderi başlığı ve gövdesi AES-256-GCM ile tarayıcıda şifrelenir; içerik anahtarı topluluk
  anahtarıyla (herkese açık gönderi) veya yazarın RSA açık anahtarıyla (özel gönderi) sarılır.
- Silme yetkisi SHA-256 hash olarak gizli kayıtta tutulur ve istemciye hiçbir zaman döndürülmez;
  aynı cihazdaki anonim kimlik bu hash'i üretebilir.
- Kasa özel anahtarı PBKDF2 (310k iterasyon) ile türetilen anahtarla şifreli saklanır; düz metin
  anahtar sunucuya hiç gitmez.
- Ek dosyalar şifrelenmez; uploads/ altında herkese açık bağlantıyla saklanır.

## Notlar

- Veriler data/db.json içinde tutulur; yedeklemek için bu dosyayı kopyalayın.
- Tek süreçli kullanım için tasarlandı; çok örnekli dağıtımda ortak bir veritabanına geçin.
- Varsayılan topluluklar ilk açılışta otomatik oluşturulur.
