# Doğrulama

- `ünvanlar.png` kaynak SHA-256: `ad14a812fc4903c540a01f1ac655db8026f9577cc2723385609b6aac45e34f2d`.
- Projedeki değiştirilmemiş kaynak kopya aynı SHA-256 değerindedir.
- 25 ayrı title PNG üretildi; alpha kanalı ve görünür piksel içerikleri otomatik kontrol edildi.
- Kaynak görsel 1717×916 RGBA.
- Auth API: Node built-in HTTP + `crypto.scrypt`, random salt, HTTP-only session cookie, normalized unique username ve rate limit.
- Guest oyun kartı tıklaması auth paneli açar; oyun route guard guest erişimini reddeder; `/api/game/*` session ister.
- Gerçek socket/oyun motoru mevcut projede bulunmadığından socket ve gerçek oyun hamlesi güvenlik testi uygulanamaz; yalnızca entegrasyon gereksinimi belgelenmiştir.

- `npm install` iki ayrı 45 saniyelik denemede tamamlanmadı; bu nedenle lint/typecheck/production build bu çalışma ortamında çalıştırılamadı ve başarılı sayılmadı.
- `server/auth-server.mjs` Node sözdizimi kontrolünden geçti.
- 25 PNG asset RGBA/boyut/görünür-alpha otomatik kontrolünden geçti.
