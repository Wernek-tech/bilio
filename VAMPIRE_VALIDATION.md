# Vampir Köylü doğrulama raporu

- Referans lobi ve oyun PNG dosyaları değiştirilmeden projeye kopyalandı.
- Ses/mikrofon/WebRTC kodu eklenmedi.
- Sunucu otoriteli oda, hazır, 5 saniye otomatik başlangıç, rol, gece, Kahin, Doktor, Vampir hedefi, özel Vampir sohbeti, gündüz sohbeti, oy/çekimser, eleme ve kazanma kuralları eklendi.
- 8/9/10/11/12 rol dağılımları otomatik test kapsamındadır.
- Gizli rol API görünümü kullanıcıya göre filtrelenir; oyun sonuna kadar toplu rol listesi gönderilmez.
- Not: gerçek zamanlı taşıma WebSocket yerine 1 saniyelik HTTP state senkronizasyonudur. Tek süreç belleği kullanıldığı için sunucu restartında aktif odalar korunmaz.
