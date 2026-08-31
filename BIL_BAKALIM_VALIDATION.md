# Bil Bakalım doğrulama raporu
- Üç kullanıcı referansı `public/references/` altında korunuyor.
- 4/8 oyuncu arayüzü, kategori ve süre kontrolleri, hazır akışı, oyun ekranı ve sonuç ekranı eklendi.
- Sunucu oyun motoru tam 20 kelimeyi 16×16 tahtaya sekiz yönde yerleştiriyor; çözüm koordinatları ayrı sunucu verisidir.
- Türkçe locale normalizasyonu ve ÇĞİIÖŞÜ karakter seti uygulanıyor.
- Doğru seçim sırayı koruyor; yanlış seçim sırayı geçiriyor; tekrar istekleri idempotency setiyle bastırılıyor.
- Sıralama ve kesin elmas/XP tabloları sunucu motorunda hesaplanıyor.
- Ses/mikrofon/WebRTC eklenmedi.

## Ortam notu
- `npm test`: 20/20 geçti (Bil Bakalım + mevcut Vampir Köylü motor testleri).
- Temiz bağımlılık kurulumu bu çalışma ortamının 45 saniyelik komut sınırında tamamlanamadı. Bu nedenle TypeScript/lint/production build başarılıymış gibi raporlanmamaktadır; bağımlılıklar kurulduktan sonra README komutlarıyla yeniden çalıştırılmalıdır.
- Bu teslimatta gerçek çoklu tarayıcı/WebSocket E2E doğrulaması yapılmış olarak iddia edilmemektedir.
