# Bilio Giriş Ekranı Final Doğrulama Raporu

Tarih: 31.08.2026

## Tamamlanan kontroller

- Resmî `bilio logo.png` dosyası `public/assets/bilio-logo.png` olarak birebir kopyalandı.
- Kaynak ve proje logo SHA-256 değeri aynıdır: `b1eee5fd770aee69e62093767c12bd3b5138e1458c0fc35178f9dbe25a207f59`.
- Ana ekranın zorunlu masaüstü ölçüleri CSS değişkenleriyle tanımlandı: sidebar 300px, nav 238×48px, auth 112×42px, toolbar 38px, kart 260×292px.
- Sol navigasyonda genel ikon/chevron kullanılmıyor; seçili OYUNLAR düğmesinde resmî logodan çıkarılmış 22×22 donut kullanılıyor.
- Misafirde iki auth düğmesi aynı anda görünür; oturum açıldığında 146×42px ÇIKIŞ YAP ile değiştirilir.
- Misafir bakiyeleri 0 / 0 gösterilir.
- Kayıt akışı e-postasızdır ve kullanıcı adı + şifre + şifre tekrarı kullanır.
- Şifreler Node `crypto.scrypt` ile rastgele salt kullanılarak hashlenir.
- Session cookie `HttpOnly; SameSite=Lax` olarak oluşturulur; production ortamında `Secure` eklenir.
- Yeni kayıt için 5.000 altın ve 1.000 elmas sunucu verisine tek seferlik olarak yazılır.
- Yeni kayıtla birlikte Bilio hoş geldin mesajı ve kayıt ödülü bildirimi oluşturulur.
- Mesaj/bildirim okunma durumu sunucuda kalıcıdır.
- Misafir oyun API erişimi 401 ile reddedilir.
- Doğrudan oyun rotaları React route guard ile korunur.
- `BİL BAKALIM` ve `VAMPİR KÖYLÜ` oyun bileşenleri, motorları ve mevcut otomatik testleri kaynak ZIP ile SHA karşılaştırmasında değişmemiştir.
- `server/auth-server.mjs` Node sözdizimi kontrolünden geçti.
- `npm test`: 24/24 otomatik test başarılı.
- ZIP içinde `node_modules`, `.git`, gerçek `.env`, test verisi ve log bulunmaması kontrol edildi.

## Otomatik test kapsamı

24 test arasında şunlar bulunur:

- Kayıt ödülü, mesaj ve bildirim oluşturma.
- Duplicate kullanıcı adı kontrolü.
- Güvenli yanlış giriş hatası.
- Misafir oyun API engeli.
- BİL BAKALIM Türkçe normalizasyon, 20 kelime üretimi, 8 yön, sıra ve ödül testleri.
- VAMPİR KÖYLÜ 8–12 rol dağılımı, gece çözümü, oylama eşitliği ve kazanma koşulu testleri.

## Ortam nedeniyle tamamlanamayan kontroller

Bu çalışma ortamında `npm install --no-audit --no-fund` 120 saniye içinde tamamlanamadı. Bu nedenle React/Vite bağımlılıkları kurulamadığından aşağıdaki adımlar burada başarıyla tamamlanmış olarak raporlanmamaktadır:

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Vite production preview
- Gerçek tarayıcıda 1280×720, 1366×768, 1440×900, 1664×944 ve 1920×1080 ekran görüntüsü doğrulaması
- Tarayıcı konsolu ve network paneli doğrulaması

Global `tsc` ile yapılan deneme, React/Vite paketleri ortamda olmadığı için modül çözümleme hatası verdi; bu uygulama kaynak kodunun bir build sonucu değildir.

Bu nedenle proje, kaynak ve Node testleri bakımından doğrulanmıştır ancak kullanıcının tanımladığı nihai kabul kriterlerindeki bağımlılığa bağlı build ve gerçek tarayıcı doğrulaması bu ortamda tamamlanamamıştır.
