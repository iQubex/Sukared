# Luavex GitHub ve Deployment Rehberi

## Gerçek proje yapısı

```text
Obfuscator/
|-- index.html                 # Frontend giriş dosyası
|-- style.css                  # Frontend stilleri
|-- app/                       # Frontend JavaScript modülleri
|-- assets/                    # Logo ve production görselleri
|-- frontend-server.js         # Yerel frontend sunucusu
|-- Backend/
|   |-- server.js              # Production API giriş noktası
|   |-- local_server.js        # Yerel backend başlatıcı
|   |-- core/                  # Compiler, VM, auth ve servis katmanları
|   |-- utils/                 # Backend yardımcıları
|   |-- package.json
|   `-- package-lock.json
|-- tests-local/               # Yalnız yerel testler, GitHub'a yüklenmez
|-- .env.example               # Secretsiz yapılandırma şablonu
|-- .gitignore
|-- DISCORD_KURULUM_TR.md
`-- GITHUB_DEPLOYMENT_GUIDE_TR.md
```

## A. Website dosyaları

Statik site/deployment için gerekli dosyalar:

- `index.html`
- `style.css`
- `app/`
- `assets/`
- `_redirects` kullanılan hosting SPA fallback desteği istiyorsa

`frontend-server.js` yalnız yerel Node geliştirme sunucusudur; statik hosting bunu gerektirmez.

## B. Backend / VPS dosyaları

VPS'e gönderilecek ana backend içeriği:

- `Backend/server.js`
- `Backend/core/`
- `Backend/utils/`
- `Backend/package.json`
- `Backend/package-lock.json`
- Runtime için gerçekten kullanılan diğer `Backend/*.js` modülleri
- Native Luau binary kullanılıyorsa hedef işletim sistemine uygun `Backend/tools/luau/` içeriği

VPS'te `npm ci --omit=dev` çalıştırın ve ortam değişkenlerini servis yöneticisi üzerinden tanımlayın.

## C. Local test dosyaları

- `tests-local/`
- `Backend/test_*.js`
- `Backend/benchmark_*.js`
- `Backend/tests/`
- `screenshots/`

Bunlar production runtime için gerekli değildir ve `.gitignore` tarafından hariç tutulur. Mevcut kapsamlı backend testleri riskli toplu taşıma yapılmaması için konumlarında bırakılmış, fakat deployment kapsamından çıkarılmıştır.

## D. Kesinlikle yüklenmemesi gerekenler

- `.env` ve `.env.*` gerçek secret dosyaları
- Discord Client Secret
- Session secret
- OAuth access/refresh tokenları
- VPS anahtarları ve parolaları
- `node_modules/`
- Log dosyaları
- Generated test corpus ve failure dump'ları
- Geçici benchmark çıktıları

## Ortam ayrımı

Development:

- Frontend: `http://localhost:8080`
- Backend: `http://localhost:3000`
- Callback: `http://localhost:3000/auth/discord/callback`
- Hell local ve production ortamında Experimental; `SUKARED_HELL_ENABLED=0` acil kapatma anahtarıdır

Production:

- HTTPS frontend ve callback
- Secure session cookie
- Sansürlenmiş API hataları
- Hell Experimental açık (`SUKARED_HELL_ENABLED=1`)
- Debug-only UI ve test-auth bypass kapalı

Production'da `SUKARED_TEST_AUTH` kesinlikle tanımlanmaz.

## History gizliliği

Account history yalnız build ID, zaman, profil, durum, süre, input/output boyutu, VM uygulanma durumu ve kısa koruma özeti tutar. Source, protected output, constant, string, VM bytecode, seed ve OAuth token saklanmaz.
