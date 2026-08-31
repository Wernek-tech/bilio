import {FormEvent,useRef,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {initialLobbyMessages} from '../data/lobbyMessages';
import {useAuth} from '../auth/AuthContext';
import AuthModal from '../auth/AuthModal';
import {titles} from '../data/titles';
type Spot={label:string;to?:string;x:number;y:number;w:number;h:number;action?:'logout'};
const spots:Spot[]=[
{label:'Oyunlar',to:'/oyunlar',x:29,y:226,w:280,h:58},{label:'Lobi',to:'/lobi',x:29,y:300,w:280,h:59},{label:'Liderlik tablosu',to:'/liderlik',x:29,y:374,w:280,h:59},{label:'Mağaza',to:'/magaza',x:29,y:448,w:280,h:59},{label:'Profil',to:'/profil',x:29,y:522,w:280,h:59},{label:'Çıkış yap',x:29,y:845,w:280,h:52,action:'logout'},
{label:'Mesajlar',to:'/mesajlar',x:1491,y:28,w:52,h:52},{label:'Bildirimler',to:'/bildirimler',x:1558,y:28,w:53,h:52}];
const pct=(v:number,total:number)=>`${v/total*100}%`;
export default function Lobby(){
 const nav=useNavigate(); const auth=useAuth(); const [authOpen,setAuthOpen]=useState(false); const [text,setText]=useState(''); const [sent,setSent]=useState<string[]>([]); const input=useRef<HTMLTextAreaElement>(null);
 const click=(s:Spot)=>{if(s.action==='logout'){console.info('Çıkış işleyicisi: authentication entegrasyonu bekleniyor.');return;} if(s.to)nav(s.to)};
 const send=(e?:FormEvent)=>{e?.preventDefault();if(!auth.user){setAuthOpen(true);return}const value=text.trim();if(!value)return;setSent(v=>[...v,value]);setText('');requestAnimationFrame(()=>input.current?.focus())};
 return <main className="screen"><div className="stage">
  <img src="/assets/lobi-gorunumu.png" alt="Bilio lobi ekranı" draggable={false}/>
  <div className="hotspots">{spots.map(s=><button key={s.label} type="button" aria-label={s.label} onClick={()=>click(s)} style={{left:pct(s.x,1672),top:pct(s.y,940),width:pct(s.w,1672),height:pct(s.h,940)}}/>)}</div>
  <div className="lobby-interaction" aria-label="Lobi sohbeti">
   <div className="sr-only" aria-live="polite">{initialLobbyMessages.map(m=><span key={m.id}>{m.username}, {m.title}: {m.message}, {m.time}. </span>)}{sent.map((m,i)=><span key={i}>Sen: {m}. </span>)}</div>
   {sent.length>0&&<div className="sent-messages">{sent.slice(-3).map((m,i)=><div className="sent" key={i}><b>Sen</b><span>{m}</span><time>{new Date().toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}</time></div>)}</div>}
   <form onSubmit={send} className="composer"><textarea ref={input} aria-label="Mesajını yaz" placeholder="Mesajını yaz..." value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}}}/><button type="submit" aria-label="Gönder">GÖNDER <span>➤</span></button></form>
  </div>
  {auth.user&&<div className="lobby-current-title"><img src={(titles.find(t=>t.id===auth.user?.selectedTitleId)||titles[0]).assetPath} alt="Seçili unvan"/></div>}
 </div>{authOpen&&<AuthModal onClose={()=>setAuthOpen(false)}/>}</main>
}
