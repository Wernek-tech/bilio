# Bilio Arayüz Doğrulama Raporu

## Başarılı kontroller

- `node --check server/auth-server.mjs`: başarılı.
- `npm test`: **28/28 test başarılı**.
- Yeni testler: sahte mesaj içermeyen lobi başlangıcı, kalıcı lobi mesajı, mağaza satın alma/idempotency, kalıcı profil güncelleme, örnek oyuncu içermeyen haftalık sıralama.
- Mevcut auth kayıt/giriş testleri: başarılı.
- Bil Bakalım motor testleri: başarılı.
- Vampir Köylü motor testleri: başarılı.
- Korunan beş oyun kaynak dosyasında SHA-256 değişikliği yok.
- Sunucu migration betiği ve veri şeması dokümanı eklendi.

## Ortam nedeniyle tamamlanamayan kontroller

`npm install` bu ortamda registry DNS hatası (`EAI_AGAIN`) nedeniyle tamamlanamadı. Bu sebeple React/Vite bağımlılıkları mevcut olmadığından:

- `npm run lint` çalıştırılamadı.
- `npm run typecheck` bağımlılık modüllerini bulamadığı için sonuçlandırılamadı.
- `npm run build` çalıştırılamadı.
- Vite uygulaması başlatılamadığı için Chromium ile 1280×720, 1366×768, 1440×900, 1664×944 ve 1920×1080 görsel doğrulama yapılamadı.
- İki ayrı gerçek tarayıcı oturumuyla SSE/realtime manuel testi yapılamadı.

Bu maddeler başarılıymış gibi işaretlenmemiştir. Temiz ağ erişimli ortamda README'deki komutlarla tamamlanmalıdır.
