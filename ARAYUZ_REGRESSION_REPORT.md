# Korunan Oyun Regresyon Raporu

Korunan dosyaların çalışma öncesi ve sonrası SHA-256 değerleri karşılaştırıldı ve birebir aynı kaldı:

- `src/pages/VampireGame.tsx`: `20d15fe7fd1826d16f198fd47cede8d2562a9e256b5233809ebdd2bd7fc25516`
- `src/pages/BilBakalimGame.tsx`: `fcbf423dce81f2f8003d6adf5ccae911af64347a9745c20e89fccf35f2e7e73f`
- `server/vampire-engine.mjs`: `0f225ae26310f6ebdac92b3104f54e6636a32a4124f4280c77930c9686eaf1a6`
- `server/vampire-store.mjs`: `846359c46c2182d8c91037d0befe359d33ce1ca942363fc05fabb9a25de09fa7`
- `server/bil-bakalim-engine.mjs`: `3bb48875696ea06edbb11286b673b7388f3c59a43a338a955245e754c2b48e77`

`npm test` içinde Bil Bakalım tablo/ödül/sıra testleri ve Vampir Köylü rol/gece/oylama/kazanma testleri çalıştırıldı ve geçti. Vampir Köylü `DAVET ET` API'sinin var olan davranışına, oyun kaynağını değiştirmeden yalnızca global lobiye davet kaydı yansıtan entegrasyon eklendi.
