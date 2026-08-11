# Luavex Discord Giriş Kurulumu

Bu rehber Luavex'in Discord OAuth2 girişini sıfırdan kurmak içindir. Uygulama yalnızca `identify` iznini ister; sunuculara katılma, e-posta veya mesaj okuma izni istemez.

## 1. Discord uygulaması oluşturma

1. [Discord Developer Portal](https://discord.com/developers/applications) adresine girin.
2. Discord hesabınızla oturum açın.
3. Sağ üstteki **New Application** düğmesine basın.
4. Uygulamaya bir ad verin ve oluşturun.

## 2. Client ID ve Client Secret

1. Sol menüden **OAuth2** bölümünü açın.
2. **Client ID**, uygulamanızın Application ID değeridir. Bunu `DISCORD_CLIENT_ID` olarak kullanın.
3. **Client Secret** bölümünde **Reset Secret** veya **View Secret** seçeneğini kullanın.
4. Secret değerini yalnızca VPS/backend ortam değişkenine ekleyin. Frontend dosyalarına, GitHub'a veya ekran görüntülerine koymayın.

## 3. Redirect URI ekleme

OAuth2 sayfasındaki **Redirects** alanına backend callback adresini eksiksiz ekleyin. Kodda kullanılan gerçek route:

```text
/auth/discord/callback
```

Yerel örnek:

```text
http://localhost:3000/auth/discord/callback
```

Production örneği:

```text
https://api.MYDOMAIN.com/auth/discord/callback
```

Portal'daki URI ile `DISCORD_REDIRECT_URI` birebir aynı olmalıdır. Protokol, domain, port, path ve sondaki slash farkları hata üretir.

## 4. Kullanılan OAuth scope

Yalnızca şu scope kullanılır:

```text
identify
```

Bu scope Discord kullanıcı ID'si, kullanıcı adı, görünen ad ve avatar bilgisini almak içindir.

## 5. Ortam değişkenleri

Backend için `.env.example` dosyasını örnek alın:

```env
DISCORD_CLIENT_ID=YOUR_DISCORD_APPLICATION_ID
DISCORD_CLIENT_SECRET=YOUR_DISCORD_CLIENT_SECRET
DISCORD_REDIRECT_URI=http://localhost:3000/auth/discord/callback
SESSION_SECRET=REPLACE_WITH_AT_LEAST_32_RANDOM_CHARACTERS
FRONTEND_ORIGIN=http://localhost:8080
```

`SESSION_SECRET` için tahmin edilemez, en az 32 karakterlik rastgele bir değer kullanın. Gerçek `.env` dosyası `.gitignore` kapsamındadır.

## 6. Yerel geliştirme

1. `NODE_ENV=development` ayarlayın.
2. Discord Portal'a `http://localhost:3000/auth/discord/callback` ekleyin.
3. `FRONTEND_ORIGIN=http://localhost:8080` kullanın.
4. Backend'i `Backend/local_server.js`, frontend'i kökteki `frontend-server.js` ile başlatın.
5. Workspace'teki **Connect Discord** düğmesine basın.

Hell erişimi Experimental olarak local ve production ortamında açıktır; OAuth yapılandırmasından bağımsızdır.

## 7. Production / VPS

1. Backend'i HTTPS arkasında çalıştırın.
2. `NODE_ENV=production` kullanın.
3. `FRONTEND_ORIGIN` değerini gerçek site origin'i olarak girin.
4. `DISCORD_REDIRECT_URI` değerini HTTPS API domain'inize ayarlayın.
5. Reverse proxy'nin HTTPS bağlantısını doğru ilettiğinden emin olun.

Production session cookie'si `HttpOnly`, `Secure` ve `SameSite=Lax` olarak oluşturulur. JavaScript session tokenını okuyamaz.

## 8. Giriş akışı

1. Kullanıcı `/auth/discord` adresine yönlendirilir.
2. Backend süreli ve imzalı OAuth state üretir.
3. Discord callback'te state ve HttpOnly state cookie birlikte doğrulanır.
4. Authorization code backend tarafından Discord'a gönderilir.
5. Kullanıcı bilgisi alındıktan sonra access token saklanmaz.
6. Backend rastgele session oluşturur ve HttpOnly cookie gönderir.

## 9. Çıkış

**Log out** işlemi `POST /auth/logout` çağrısı yapar, server sessionını siler ve cookie'yi geçersiz kılar. Build history kaynak veya çıktı içermeyen hesap metadata'sıdır.

## 10. Sık karşılaşılan hatalar

**Redirect URI mismatch**

Portal ve `DISCORD_REDIRECT_URI` değerlerini karakter karakter karşılaştırın. `localhost` ile `127.0.0.1` aynı kabul edilmez.

**Discord login is not configured**

Dört zorunlu değerden biri eksiktir: Client ID, Client Secret, Redirect URI veya Session Secret.

**Invalid or expired state**

Giriş sekmesi uzun süre açık kalmış, cookie engellenmiş veya callback farklı tarayıcıda açılmış olabilir. Workspace'e dönüp yeniden **Connect Discord** seçin.

**Production'da cookie oluşmuyor**

Site ve API HTTPS olmalıdır. Frontend origin CORS listesiyle eşleşmeli ve frontend çağrıları `credentials: include` kullanmalıdır.

**Callback çalışıyor fakat kullanıcı girişsiz görünüyor**

Frontend ve backend domainleri için cookie/CORS ayarlarını, `FRONTEND_ORIGIN` değerini ve reverse proxy HTTPS yapılandırmasını kontrol edin.
