export type BadgeDef={id:string;name:string;requirement:string;assetPath:string};

const badgeInfo=[
 ['İlk Adım','İlk maçını tamamla'],['Oyun Yolcusu','5 maç tamamla'],['Kararlı Oyuncu','10 maç tamamla'],['Meydan Okuyan','25 maç tamamla'],['Deneyimli Yarışmacı','50 maç tamamla'],['Oyun Tutkunu','100 maç tamamla'],['Efsane Katılımcı','500 maç tamamla'],
 ['İlk Zafer','İlk galibiyetini kazan'],['Kazanan Ruh','5 galibiyet kazan'],['Zafer Serisi','10 galibiyet kazan'],['Kupa Avcısı','25 galibiyet kazan'],['Şampiyon Adayı','50 galibiyet kazan'],['Büyük Şampiyon','100 galibiyet kazan'],['Zafer Efsanesi','250 galibiyet kazan'],
 ['Keskin Zihin','10 doğru cevap ver'],['Bilgi Toplayıcısı','50 doğru cevap ver'],['Bilgi Avcısı','100 doğru cevap ver'],['Soru Ustası','250 doğru cevap ver'],['Ansiklopedi','500 doğru cevap ver'],['Bilgelik Kaynağı','1.000 doğru cevap ver'],['Üstün Zekâ','2.500 doğru cevap ver'],['Bilgi Efsanesi','5.000 doğru cevap ver'],
 ['Puan Başlangıcı','1.000 toplam puana ulaş'],['Puan Biriktirici','5.000 toplam puana ulaş'],['Puan Ustası','10.000 toplam puana ulaş'],['Yüksek Skor','25.000 toplam puana ulaş'],['Altın Skor','50.000 toplam puana ulaş'],['Skor Şampiyonu','100.000 toplam puana ulaş'],['Puan İmparatoru','250.000 toplam puana ulaş'],
 ['Yükselen Yıldız','Seviye 10’a ulaş'],['Parlayan Oyuncu','Seviye 25’e ulaş'],['Ustalık Yolu','Seviye 50’ye ulaş'],['Asırlık Bilge','Seviye 100’e ulaş'],['Seçkin Efsane','Seviye 200’e ulaş'],['Ölümsüz Yolcu','Seviye 350’ye ulaş'],['Bilio Zirvesi','Seviye 500’e ulaş'],
] as const;

export const badges:BadgeDef[]=badgeInfo.map(([name,requirement],index)=>({id:`badge-${String(index+1).padStart(2,'0')}`,name,requirement,assetPath:`/badges/assets/badge-${String(index+1).padStart(2,'0')}.png`}));
