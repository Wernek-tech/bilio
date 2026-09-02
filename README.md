# Bilio

Bilio; React, TypeScript ve Vite tabanlı masaüstü oyun platformudur. Bu sürümde OYUNLAR ekranı korunarak LOBİ, LİDERLİK TABLOSU, MAĞAZA ve PROFİL bölümleri ortak siyah/çikolata/karamel tasarım dili ve mevcut kimlik doğrulama sistemiyle bütünleştirilmiştir.

## Gereksinimler

- Node.js 20 veya üstü
- npm

## Kurulum

```bash
npm install
npm run migrate
```

API ve web uygulamasını iki terminalde başlatın:

```bash
npm run api
npm run dev
```

Ana adres Vite tarafından terminalde gösterilir. API varsayılan olarak `http://localhost:8787` üzerinde çalışır. Vite geliştirme sunucusu `/api` isteklerini mevcut yapılandırmaya göre API'ye yönlendirir.

## Komutlar

```bash
npm run dev
npm run api
npm run migrate
npm test
npm run typecheck
npm run lint
npm run build
npm run preview
```

## Kimlik doğrulama ve hesap

Kayıt e-posta istemez. Kullanıcı adı, şifre ve şifre tekrarı kullanılır. Şifreler `crypto.scrypt` ve benzersiz salt ile hashlenir; oturum HTTP-only cookie üzerinden tutulur. Yeni kayıt tek seferlik 5.000 altın, 1.000 elmas, hoş geldin mesajı ve ödül bildirimi alır.

## Lobi

`/lobi` gerçek kalıcı mesaj geçmişini gösterir. Yeni veritabanında sahte başlangıç mesajı yoktur. Kimliği doğrulanmış kullanıcılar en fazla 500 karakter mesaj gönderebilir; gönderimler sunucuda yetki ve hız sınırı kontrolünden geçer. İstemci canlı güncellemeleri Server-Sent Events üzerinden alır. Vampir Köylü kurucusunun mevcut `DAVET ET` isteği global lobiye yapılandırılmış davet olarak yansıtılır.

## Liderlik

`/liderlik` haftalık gerçek kullanıcı verisinden oluşur. Büyük başlık, haftalık/global sekmeler ve yenilenme açıklaması kaldırılmıştır. İlk üç oyuncu 2–1–3 podyum düzeninde, devamı sıralama listesinde gösterilir. Haftalık dönem Türkiye saatiyle pazartesi başlangıcına göre takip edilir; önceki hafta arşivlenip sıfırlama idempotent yapılır.

## Mağaza

`/magaza` altı kategori içerir: EMOJİLER, UNVANLAR, ÇERÇEVELER, ROZETLER, HEDİYELER ve TAKVİYELER. Ürün kataloğu sunucu metadatasıdır; oyuncu sahipliği, adetler, altın/elmas bakiyesi ve işlemler kalıcı kullanıcı verisinden gelir. Satın alma `requestId` ile tekrarlı isteklere karşı korunur, bakiye/ürün/işlem/bildirim tek sunucu kaydında güncellenir. Unvan kategorisi mevcut 25 özgün unvan PNG'sini kullanır ve level 1–500 açılma mantığına uyar.

## Profil

`/profil` gerçek hesap verisini kullanır: kullanıcı adı, seviye, XP, kayıt tarihi, hakkında yazısı, avatar, seçili unvan, çerçeve, istatistik, rozetler, hediyeler ve başarımlar. Hakkımda alanı 240 karakterle sınırlandırılır ve HTML benzeri karakterler temizlenir. Avatar yükleme JPEG/PNG/WebP ve 5 MB ile sınırlıdır; istemci dairesel önizleme gösterir, sunucu MIME beyanına ek olarak dosya sihirli baytlarını doğrular. Seçilen unvan yalnızca kullanıcının level ile açtığı unvanlardan olabilir.

## Veri ve migration

Geliştirme sürümünün kalıcı veri dosyası `BILIO_DB_PATH` ile belirlenir. Varsayılan: `server/data.json`. `npm run migrate` mevcut kullanıcı kayıtlarını yeni `inventory`, `profile`, `stats`, `weekly`, lobi ve işlem alanlarıyla geriye dönük uyumlu hale getirir. Ayrıntılar `server/DATA_SCHEMA.md` dosyasındadır.

## Korunan oyunlar

`BİL BAKALIM` ve `VAMPİR KÖYLÜ` oyun kaynakları bu çalışmada değiştirilmemiştir. Kaynak hash doğrulaması `ARAYUZ_REGRESSION_REPORT.md` içinde yer alır. Oyun motoru otomatik testleri de genel test paketinde çalışır.

## Bilinen sınırlamalar

Bu çalışma ortamında npm registry DNS erişimi olmadığı için bağımlılıkların temiz kurulumu tamamlanamamıştır. Bu nedenle gerçek Chromium/Vite görsel çözünürlük testi, `lint`, bağımlılığa dayalı TypeScript kontrolü ve production build bu ortamda çalıştırılamamıştır. Node tabanlı sunucu ve oyun motoru testleri çalıştırılmıştır. Ayrıntılar `ARAYUZ_VALIDATION.md` dosyasındadır.
