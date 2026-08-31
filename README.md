# Bilio

React + TypeScript + Vite tabanlı Bilio web projesi. Node.js 20+ önerilir.

## Kurulum ve komutlar

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm run build
npm run preview
```

Ana rotalar: OYUNLAR `/` ve `/oyunlar`, LOBİ `/lobi`, LİDERLİK TABLOSU `/liderlik`, ödüller yer tutucusu `/oduller`.

## Görsel asset'ler

- `public/assets/giris-ekrani.png`: OYUNLAR ekranının değiştirilmemiş kaynak PNG'si.
- `public/assets/lobi-gorunumu.png`: LOBİ ekranının değiştirilmemiş kaynak PNG'si.
- `public/assets/liderlik-tablosu.png`: LİDERLİK TABLOSU ekranının değiştirilmemiş kaynak PNG'si.

Ekranlar 1672×940 doğal koordinat sisteminde `contain` mantığıyla ölçeklenir. Görünmez navigasyon/etkileşim hotspotları aynı stage üzerinde doğal piksel koordinatlarının yüzde karşılıklarıyla yerleştiği için letterbox boşluklarından etkilenmez.

## Lobi sohbeti

Başlangıç verileri `src/data/lobbyMessages.ts` içindedir. Enter/GÖNDER boş olmayan mesajı ekler, Shift+Enter satır sonu bırakır. Avatar/frame görünümü kaynak PNG içinde korunur; ayrı kaynak asset sağlanmadığından yeniden üretilmemiştir.

## Liderlik tablosu

Haftalık veri `src/data/leaderboard.ts` içindedir. Puanlar sayısal tutulur ve `Intl.NumberFormat('tr-TR')` ile Türkçe binlik biçimine dönüştürülebilir. Veri 1–10 sıralıdır; görsel podyum kaynak PNG'de `2 — 1 — 3` düzeninde korunur. İlk görünüm HAFTALIK'tır. GLOBAL verisi kullanıcı tarafından sağlanmadığı için yeni oyuncu/puan uydurulmaz; GLOBAL hotspotu erişilebilir durumda global moda geçer fakat görünür referans yüzeyi değiştirilmez. `ÖDÜLLERİ GÖR` `/oduller` yer tutucu rotasına gider.

## Sınırlamalar

Dinamik GLOBAL görünüm için ayrı referans/veri sağlanmamıştır. Görsel kimlikler PNG içinde korunmaktadır. Çıkış işlemi gerçek authentication entegrasyonunu bekler. Ayrıntılı doğrulama `VALIDATION.md` içindedir.

## Mağaza ekranı

- Rota: `/magaza`
- Değiştirilmemiş referans: `public/references/magaza-referans.png`
- Altı kategori `src/pages/Store.tsx` içinde tanımlıdır: Emojiler, Unvanlar, Çerçeveler, Rozetler, Hediyeler, Takviyeler.
- İlk aktif kategori Emojiler'dir. Kategori seçimi yerel state ile yapılır ve hiçbir kategoride ürün render edilmez.
- Referanstaki ürün grid'i, fiyatlar, `MEVCUT` durumu, yıldız bakiyesi, `12.450`, `+` ve para birimi açıklaması nihai mağaza görünümünden kaldırılmıştır.
- Mağaza ürün veri/satın alma sistemi şu anda aktif değildir; ileride ayrı bir veri katmanı eklenebilir.
- Yerleşim 1672×941 doğal koordinat sistemi ve `contain` mantığına eşdeğer ölçeklenen stage/hotspot yüzdeleriyle korunur.

## Profil ekranı
- Rota: `/profil`; ziyaretçi profili: `/profil/:username`.
- Referans: `public/references/profil-gorunumu-referans.png` (orijinal dosya hash'i korunur).
- Profil durumu, seçilen unvan/frame/rozet, vitrinler, arkadaşlar ve istekler geliştirme sürümünde `localStorage` tabanlı veri katmanında saklanır; gerçek çok-kullanıcılı yetkilendirme/backend daha sonra bağlanmalıdır.
- Durum yazısı en fazla 120 karakterdir. Avatar yükleme JPG/PNG/WEBP, en fazla 5 MB; sürükleme, zoom ve dairesel crop desteklenir; kırpılmış avatar WebP data URL olarak yerel kalıcı depoya kaydedilir.
- Hediye vitrini ve başarım vitrini beşer yuvalıdır. Demo hediye kayıtları yalnızca vitrin altyapısını göstermek için yerel seçeneklerdir; gerçek hediye gönderme sistemi/servisi yoktur.
- Arkadaş arama/istekleri yerel demo kullanıcı dizini üzerinde çalışır; gerçek iki taraflı güvenli arkadaşlık işlemleri için sunucu API'si gereklidir.
- Profil referansındaki para birimi kutuları mağaza kararına uygun olarak işlevsel katmana taşınmamıştır; referans PNG doğrulama amacıyla korunur.

## Auth ve Level 1–500 unvan sistemi
Kayıt e-posta istemez: Kullanıcı Adı, Şifre ve Şifre Tekrar alanları kullanılır. API `server/auth-server.mjs` içindedir; Node `crypto.scrypt` + benzersiz 16 bayt salt ile parola hash'i üretir. Session kimliği 32 rastgele bayttır ve HTTP-only, SameSite=Lax cookie ile tutulur; production'da Secure eklenir. Normalize kullanıcı adı benzersizdir; admin/administrator/system/biliobot ayrılmıştır. Basit IP tabanlı giriş rate-limit vardır.

Geliştirmede iki terminal kullanın: `npm run api` ve `npm run dev`. Vite `/api` isteklerini 8787 portuna proxy eder. Kayıt sonrası API Level 1, XP 0 ve `title-1` (ACEMİ) oluşturur; istemci otomatik girişle `/profil` akışına devam edebilir. Oyun route'ları `GameGuard` ile, örnek oyun API yolu da sunucu session kontrolüyle korunur. Gerçek socket oyun sunucusu bu prototipte mevcut olmadığından socket-auth entegrasyon noktası gerçek bir socket servisine bağlanmadan uçtan uca doğrulanamaz.

25 özgün unvan `public/titles/assets/` altında ayrı şeffaf PNG olarak bulunur; değiştirilmemiş kaynak `public/titles/source/unvanlar-kaynak.png` altındadır. Merkezi tanım `src/data/titles.ts` dosyasındadır. Her 20 level'da yeni unvan açılır: ACEMİ 1, ÇAYLAK 21, ... EFSANEVİ 461, LEGEND 481; maksimum level 500'dür. Profil ve lobi için seçili unvan asset entegrasyonu eklenmiştir. Gerçek oyun odaları henüz Placeholder olduğundan oyun-odası kimlik satırı entegrasyonu ancak oda UI'ları geliştirildiğinde tamamlanabilir.

## Vampir Köylü — 8–12 oyunculu sunucu otoriteli oyun

`/oyun/vampir-koylu` yalnızca oturum açmış kullanıcılara açıktır. Oyuncular oda oluşturabilir veya `VK-####` koduyla katılabilir. Oda 8–12 kişiyi destekler; kurucu dahil herkes hazır olduğunda sunucu 5 saniyelik geri sayımı başlatır. Manuel `OYUNU BAŞLAT` düğmesi yoktur. Hazırlık iptali/ayrılma geri sayımı iptal eder. Kurucu ayrılırsa en eski bağlı oyuncuya aktarılır. Kurucu daveti 15 saniye sunucu rate-limitlidir.

Rol dağılımı her oyuncu sayısında sabittir: 2 Vampir, 1 Kahin, 1 Doktor, kalan Köylü. Roller yalnızca oyuncunun özel maç görünümünde döndürülür; oyun bitene kadar toplu rol listesi istemciye gönderilmez. Gece Vampirler aynı hedefi seçerse saldırı oluşur; tek Vampir kaldığında onun hedefi yeterlidir. Doktor koruması ölümü engeller. Kahin sonucu yalnızca isteğin cevabında Kahin'e verilir. Gündüz yaşayan oyuncular Köy Sohbeti'ni, gece yalnızca yaşayan Vampirler Vampir Sohbeti'ni kullanabilir. Ses, mikrofon, WebRTC veya oyun sesi uygulanmamıştır.

Aşamalar: `LOBBY → ROLE_REVEAL → NIGHT → NIGHT_RESOLUTION → DAY_ANNOUNCEMENT → DAY_DISCUSSION → DAY_VOTING → VOTE_RESOLUTION → GAME_OVER`. Süreler sunucudaki `phaseEndsAt` üzerinden hesaplanır. Oylamada oyuncu kendine/ölü oyuncuya oy veremez, oyunu değiştirebilir veya çekimser kalabilir; eşitlikte kimse elenmez. Tüm Vampirler ölürse Köy, yaşayan Vampir sayısı diğer yaşayanlara eşit veya fazlaysa Vampirler kazanır.

Gerçek zamanlı görünüm mevcut bağımlılık setini bozmamak için 1 saniyelik sunucu-state senkronizasyonu kullanır; oyun kararları istemcide hesaplanmaz. Bu sürümde kalıcı çok-sunuculu oda depolaması ve harici Redis/WebSocket ölçeklemesi yoktur; oda/maç state'i tek Node sürecinin belleğindedir. Üretimde yatay ölçekleme için ortak state/pub-sub katmanı gerekir.

Referanslar değiştirilmeden `public/references-vampir-lobi.png` ve `public/references-vampir-oyun.png` altında saklanır. Ana hedef 16:9 masaüstüdür; daha dar masaüstünde kontrollü minimum genişlik uygulanır.

## Bil Bakalım
Bil Bakalım 4 veya 8 oyunculuk, sunucu otoriteli kelime bulma modudur. Oda kapasitesi 4/8, kategoriler Hayvanlar, Sanatçılar, Nesneler, Şarkı İsimleri, Yemekler ve Karışık; tur süreleri 30/45/60/90 saniyedir. Her tahta tam 20 benzersiz Türkçe kelime içerir. `server/bil-bakalim-engine.mjs` Türkçe locale normalizasyonu, sekiz yönlü yerleştirme, koordinat doğrulama, sıra, puan, sıralama ve ödül kurallarını içerir. Doğru seçim oyuncunun sırasını korur; yanlış seçim veya süre dolması sırayı geçirir. 8 kişide elmaslar 100/90/80/70/60/50/40/30 ve XP 500/450/400/350/300/250/200/150; 4 kişide ilk dört değer kullanılır. İstemci puan veya ödül belirlemez; idempotency anahtarları yinelenen seçimleri engeller. Referanslar `public/references/bil-bakalim-*.png` altında değiştirilmeden saklanır. Ses, mikrofon, WebRTC veya müzik yoktur.

### Bil Bakalım testleri
`npm test` tahta üretimi, 20 kelime, Türkçe karakterler, sekiz yön, doğru/yanlış seçim, sıra ve ödülleri doğrular. `npm run typecheck`, `npm run lint`, `npm run build` teslim öncesi kalite kontrolleridir.

## Oyunlar Ana Ekranı — final giriş/kayıt entegrasyonu

Ana OYUNLAR ekranı masaüstü için sabit piksel ölçülerine göre yeniden uygulanmıştır. `1664×944` referansında sol panel `300px`, navigasyon düğmeleri `238×48px`, misafir kimlik doğrulama düğmeleri `112×42px`, sağ üst araç çubuğu `38px` yüksekliğinde ve oyun kartları `260×292px` olacak şekilde CSS değişkenleri `src/styles.css` içinde tanımlıdır. 1280–1663px aralığında yalnızca küçülmeye izin verilir; büyük ekranlarda arayüz topluca ölçeklenmez.

Resmî logo `public/assets/bilio-logo.png` dosyasındadır ve en fazla `230×105px` alanında `object-fit: contain` ile kullanılır. Seçili OYUNLAR düğmesindeki donut, aynı resmî logodan kayıpsız kırpılarak `public/assets/nav-donut.png` olarak hazırlanmıştır. Ana kart görselleri mevcut onaylı Bilio giriş ekranı varlıklarından alınan oyun çizimlerini kullanır; BİL BAKALIM ve VAMPİR KÖYLÜ oyunlarının route ve oyun motoru kaynakları değiştirilmemiştir.

### Kayıt ve giriş

Kayıt formu yalnızca `Kullanıcı adı`, `Şifre` ve `Şifre tekrarı` alanlarını içerir; e-posta kullanılmaz. Kullanıcı adı sunucuda Türkçe locale ile normalize edilir, büyük/küçük harf farkıyla tekrar kayıt engellenir ve parola en az 8 karakter olmalıdır. Parolalar `crypto.scrypt` ile rastgele salt kullanılarak hashlenir. Oturum `HttpOnly`, `SameSite=Lax` cookie ile tutulur; production ortamında `Secure` niteliği eklenir.

Yeni kayıt tek sunucu işlemi içinde Level 1 / ACEMİ profili, `5.000` altın, `1.000` elmas, bir Bilio hoş geldin mesajı ve bir kayıt ödülü bildirimi oluşturur. Ödül alanları hesap kaydına yazıldığı için yeniden giriş veya sayfa yenileme ödülü tekrar vermez. Başarılı kayıttan sonra oturum açılır ve kullanıcı `/profil` rotasına gönderilir.

Mesajlar ve bildirimler ana ekranın sağ üstündeki kompakt panellerden açılır. Okunmamış durumları sunucuda saklanır; öğe açıldığında okundu durumu kalıcı hale gelir. Misafir araç çubuğu bakiyeleri her zaman `0` / `0` gösterir.

### Korunan oyun erişimi

Misafir bir oyun kartına bastığında oyun route'u açılmaz ve giriş/kayıt penceresi gösterilir. Doğrudan korunan oyun URL'sine gidildiğinde React route guard kullanıcıyı OYUNLAR ekranına döndürür. `/api/game/*` istekleri ayrıca sunucu session doğrulamasından geçer. BİL BAKALIM ve VAMPİR KÖYLÜ mevcut oyun bileşenleri ve motorları korunmuştur.

### Çalıştırma

```bash
npm install
npm run api
# ayrı terminal
npm run dev
```

Testler:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Bu çalışma ortamında paket kayıt sunucusuna erişim yeterli sürede tamamlanamadığı için temiz `npm install` ve dolayısıyla bağımlılığa bağlı `typecheck/lint/build` adımları burada tamamlanamamıştır. Node tabanlı otomatik motor ve auth testleri çalıştırılmıştır; ayrıntı `GIRIS_FINAL_VALIDATION.md` dosyasındadır.
