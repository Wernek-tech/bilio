import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {weeklyLeaderboard} from '../data/leaderboard';
type Spot={label:string;to?:string;x:number;y:number;w:number;h:number;action?:'logout'|'weekly'|'global'};
const spots:Spot[]=[
{label:'Oyunlar',to:'/oyunlar',x:28,y:229,w:281,h:60},{label:'Lobi',to:'/lobi',x:28,y:305,w:281,h:60},{label:'Liderlik tablosu',to:'/liderlik',x:28,y:381,w:281,h:61},{label:'Mağaza',to:'/magaza',x:28,y:457,w:281,h:61},{label:'Profil',to:'/profil',x:28,y:533,w:281,h:61},{label:'Çıkış yap',x:28,y:846,w:281,h:52,action:'logout'},
{label:'Mesajlar',to:'/mesajlar',x:1488,y:34,w:54,h:54},{label:'Bildirimler',to:'/bildirimler',x:1557,y:34,w:53,h:54},
{label:'Haftalık sıralama',x:365,y:112,w:212,h:51,action:'weekly'},{label:'Global sıralama',x:577,y:112,w:224,h:51,action:'global'},
{label:'Ödülleri gör',to:'/oduller',x:804,y:856,w:272,h:42}
];
const pct=(v:number,total:number)=>`${v/total*100}%`;
export default function Leaderboard(){const nav=useNavigate();const [mode,setMode]=useState<'weekly'|'global'>('weekly');
 const click=(s:Spot)=>{if(s.action==='logout'){console.info('Çıkış işleyicisi: authentication entegrasyonu bekleniyor.');return}if(s.action==='weekly'){setMode('weekly');return}if(s.action==='global'){setMode('global');return}if(s.to)nav(s.to)};
 return <main className="screen"><div className="stage stage-leader"><img src="/assets/liderlik-tablosu.png" alt="Bilio liderlik tablosu" draggable={false}/><div className="hotspots">{spots.map(s=><button key={s.label} type="button" aria-label={s.label} aria-pressed={s.action==='weekly'||s.action==='global'?mode===s.action:undefined} onClick={()=>click(s)} style={{left:pct(s.x,1672),top:pct(s.y,941),width:pct(s.w,1672),height:pct(s.h,941)}}/>)}</div><div className="sr-only" aria-live="polite">{mode==='weekly'?`Haftalık sıralama. ${weeklyLeaderboard.map(p=>`${p.rank}. ${p.username}, ${p.title}, ${p.score} puan`).join('. ')}`:'Global sıralama verileri henüz sağlanmadı.'}</div></div></main>}
