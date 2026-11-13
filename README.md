# KRYPT — bağımsız sürüm

Uçtan uca şifreli forumun platformdan bağımsız, kendi sunucusuyla çalışan kopyası.
İçinde **hiçbir gönderi, yorum, topluluk veya kullanıcı verisi yoktur** — boş bir
veritabanıyla açılır, içerik sizin tarafınızdan üretilir.

## Yapı

```
index.html            giriş HTML
vite.config.js        Vite + TanStack Router (dosya tabanlı rotalar)
tailwind.config.js    tema tokenları
src/
  main.jsx            uygulama girişi
  routes/             sayfalar (akış, gönderi, topluluk, gönderi yaz)
  components/         arayüz bileşenleri (forum, site, ui)
  lib/                AES-256-GCM + RSA-4096 çekirdeği, kasa, anonim kimlik
  lib/server-fns.js   API istemcisi (POST /api/fn/<ad>)
server/index.mjs      Node API + statik dosya sunucusu (bağımlılıksız)
data/                 çalışma zamanında oluşur (db.json, uploads/)
```

## Yerel çalıştırma

```bash
npm install
npm run api     # 1. terminal — API :8787
npm run dev     # 2. terminal — arayüz :5173
```

Üretim derlemesi (tek servis):

```bash
npm run build
npm start       # API + derlenmiş arayüz :8787
```

## Yayına alma

### Tek servis (Render, Railway, Fly.io, VPS, Docker)
Ortam: `PORT` (varsayılan 8787). Build: `npm install && npm run build`, başlat: `npm start`.
`data/` klasörünü kalıcı diske bağlayın, aksi halde içerik yeniden başlatmada silinir.

```bash
docker build -t krypt .
docker run -p 8787:8787 -v krypt-data:/app/data krypt
```

### Statik arayüz + ayrı API (Vercel, Netlify, Cloudflare Pages)
1. `server/` klasörünü Render/Railway/Fly gibi bir Node ortamına kurun (`npm start`).
2. Arayüzü `VITE_API_BASE=https://api-adresiniz` ile derleyip statik olarak yayınlayın.
3. SPA yönlendirmesi için `vercel.json` / `netlify.toml` dosyaları hazır.

## Şifreleme akışı

1. Her gönderi/yorum için rastgele 256 bit AES anahtarı üretilir.
2. Başlık ve gövde AES-256-GCM ile şifrelenir (her alan için ayrı IV).
3. AES anahtarı RSA-OAEP (SHA-256) ile sarılır:
   - public içerik → topluluk açık anahtarı
   - private içerik → yazarın RSA-4096 açık anahtarı
4. Sunucuya yalnızca `{iv, ct}` ve zarf(lar) gider; düz metin hiçbir zaman.
5. Çözme tarayıcıda yapılır; özel anahtar paroladan PBKDF2-SHA256 ile türetilen
   anahtarla şifreli saklanır ve kasa kilitlenince silinir.

## Notlar

- Hesap sistemi yoktur: her tarayıcı kendi anonim kimliğiyle yazar, oylar ve
  silme yetkisi bu kimliğe bağlıdır.
- Yönetim paneli bu pakete dahil değildir.
- `data/` klasörünü yedekleyin; kasa (private key) kayıtları da orada tutulur.