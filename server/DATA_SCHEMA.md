# Bilio Veri Şeması

Bilio geliştirme sunucusu kalıcı veriyi `BILIO_DB_PATH` ile belirlenen JSON veri dosyasında tutar. `npm run migrate` eski kayıtları yeni arayüz alanlarıyla geriye dönük uyumlu biçimde tamamlar.

Ana alanlar: `users`, `sessions`, `lobbyMessages`, `lobbyInvites`, `transactions`, `weeklyArchives`, `meta.weekKey`. Kullanıcı kaydında kimlik/auth alanlarına ek olarak `profile`, `inventory`, `stats`, `weekly`, `messages`, `notifications`, `gold` ve `diamonds` bulunur.

Kritik satın alma ve kayıt işlemleri sunucu tarafında tek kayıt adımıyla yapılır; satın almalarda `requestId` işlem geçmişinde idempotency anahtarıdır. Haftalık liderlik geçmişi `weeklyArchives` içinde arşivlenir.
