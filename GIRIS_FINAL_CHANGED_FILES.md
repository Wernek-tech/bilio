# Değiştirilen / eklenen dosyalar

- `src/pages/Home.tsx` — yeni masaüstü OYUNLAR ana ekranı, navigation, kart grid'i, auth kapısı.
- `src/styles.css` — zorunlu pixel ölçüleri için CSS değişkenleri ve final masaüstü stil katmanı.
- `src/auth/AuthContext.tsx` — bakiye ve okunmamış durumları içeren session kullanıcı modeli.
- `src/auth/AuthModal.tsx` — kompakt kayıt/giriş modalı, Türkçe doğrulama, loading, focus trap, Escape ve click-outside.
- `src/components/AccountToolbar.tsx` — altın/elmas, mesaj ve bildirim panelleri.
- `server/auth-server.mjs` — kayıt ödülü, profil başlangıcı, mesaj/bildirim kalıcılığı, read-state API, atomik JSON yazımı.
- `test/auth-registration.test.mjs` — kayıt ödülü, duplicate kullanıcı adı, güvenli login hatası regresyon testleri.
- `public/assets/bilio-logo.png` — kullanıcının verdiği resmî logo dosyasının değiştirilmemiş kopyası.
- `public/assets/nav-donut.png` — resmî logo varlığından navigation için çıkarılan donut.
- `public/assets/home/*.png` — mevcut Bilio oyun görsellerinden kart sanat alanları.
- `README.md` — Türkçe kurulum ve final auth/home ekranı dokümantasyonu.
- `GIRIS_FINAL_VALIDATION.md` — doğrulama sonuçları ve ortam sınırlamaları.
