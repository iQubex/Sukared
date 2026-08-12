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

## GitHub'a bağlama

Bu klasör yerel bir Git repository olarak `main` dalıyla hazırlanmıştır. Güvenlik için GitHub repository'sini **Private** oluşturmanız önerilir.

1. GitHub üzerinde boş bir private repository oluşturun. README, `.gitignore` veya lisans eklemeyin.
2. Repository adresini kopyalayın. Örnek: `https://github.com/KULLANICI/Luavex.git`.
3. Proje klasöründe aşağıdaki komutları çalıştırın:

```powershell
git add .
git status
git commit -m "Prepare Luavex 1.2"
git remote add origin https://github.com/KULLANICI/Luavex.git
git push -u origin main
```

Push sırasında giriş istenirse GitHub parolası yerine Personal Access Token, GitHub Desktop veya GitHub CLI kullanılmalıdır. GitHub CLI kurulduktan sonra alternatif giriş:

```powershell
gh auth login
gh repo create Luavex --private --source . --remote origin --push
```

`git status --ignored` çıktısında `.env` satırı `!! .env` olarak görünmelidir. Bu, dosyanın GitHub'a gönderilmeyeceğini gösterir.

## Render secret yerleşimi

`.env` frontend dosyası değildir ve GitHub'a yüklenmez. Render panelinde **backend servisi** için Environment bölümüne şu anahtarlar ayrı ayrı eklenir:

```text
NODE_ENV
FRONTEND_ORIGIN
DISCORD_CLIENT_ID
DISCORD_CLIENT_SECRET
DISCORD_REDIRECT_URI
SESSION_SECRET
SUKARED_HELL_ENABLED
```

Frontend Render servisine Discord Client Secret veya Session Secret eklenmez. Frontend yalnızca public backend adresini kullanır.
