import {useState} from 'react';
import {useNavigate} from 'react-router-dom';

type Box={x:number;y:number;w:number;h:number};
const nav:(readonly [string,string,Box])[]=[
 ['Oyunlar','/oyunlar',{x:22,y:312,w:380,h:82}],['Lobi','/lobi',{x:22,y:413,w:380,h:82}],
 ['Liderlik tablosu','/liderlik',{x:22,y:514,w:380,h:82}],['Mağaza','/magaza',{x:22,y:615,w:380,h:82}],
 ['Profil','/profil',{x:22,y:710,w:380,h:82}],['Çıkış yap','/',{x:22,y:846,w:380,h:60}],
 ['Mesajlar','/mesajlar',{x:1457,y:23,w:66,h:66}],['Bildirimler','/bildirimler',{x:1545,y:23,w:66,h:66}],
] as const;
const categories:(readonly [string,Box])[]=[
 ['Emojiler',{x:449,y:114,w:175,h:68}],['Unvanlar',{x:636,y:114,w:174,h:68}],['Çerçeveler',{x:824,y:114,w:182,h:68}],
 ['Rozetler',{x:1020,y:114,w:177,h:68}],['Hediyeler',{x:1210,y:114,w:190,h:68}],['Takviyeler',{x:1413,y:114,w:196,h:68}],
] as const;
const pct=(n:number,d:number)=>`${n/d*100}%`;
export default function Store(){
 const go=useNavigate(); const [active,setActive]=useState('Emojiler');
 return <main className="screen"><section className="stage stage-store" aria-label="Bilio mağaza ekranı">
   <img src="/references/magaza-referans.png" alt="" draggable={false}/>
   <div className="store-empty" aria-hidden="true"/>
   <div className="hotspots">
    {nav.map(([label,path,b])=><button key={label} aria-label={label} onClick={()=>go(path)} style={{left:pct(b.x,1672),top:pct(b.y,941),width:pct(b.w,1672),height:pct(b.h,941)}}/>)}
    {categories.map(([label,b])=><button key={label} aria-label={`${label} kategorisi`} aria-pressed={active===label} onClick={()=>setActive(label)} className={active===label?'category-hot active':''} style={{left:pct(b.x,1672),top:pct(b.y,941),width:pct(b.w,1672),height:pct(b.h,941)}}/>)}
   </div>
 </section></main>
}
