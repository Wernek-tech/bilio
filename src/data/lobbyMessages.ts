export type LobbyMessage={id:string;username:string;title:string;titleColor:string;message:string;time:string;avatar:string;frame:string};
export const initialLobbyMessages:LobbyMessage[]=[
['1','OyunCanavarı','EFSANE','pink','Herkese selam! 👋','21:42','oyun-canavari','efsane'],
['2','MüzikKralı','USTA','purple','Şarkıyı Bil odasına kim gelir? 🎵','21:42','muzik-krali','usta'],
['3','BilgeAdam','UZMAN','blue','Ben gelirim! 🙋','21:42','bilge-adam','uzman'],
['4','NeşeliPenguen','PRO','cyan','Tahmin Et Kim? odası çok eğlenceli! 😀','21:42','neseli-penguen','pro'],
['5','GeceKöylüsü','EFSANE','pink','Vampir Köylü sevenler buraya! 🧛','21:42','gece-koylusu','efsane'],
['6','BilioBot','YÖNETİCİ','green','Kurallara uymayı unutmayın!\nKeyifli oyunlar! 🎉','21:42','bilio-bot','yonetici'],
['7','YayıncıPro','USTA','purple','Yayıncı Kim? odasında yayındayım!\nHerkesi beklerim! 📺','21:42','yayinci-pro','usta'],
['8','OyunCanavarı','EFSANE','pink','@YayıncıPro az sonra geliyorum!','21:42','oyun-canavari','efsane'],
].map(([id,username,title,titleColor,message,time,avatar,frame])=>({id,username,title,titleColor,message,time,avatar,frame}));
