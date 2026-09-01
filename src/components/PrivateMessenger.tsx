import {FormEvent,useEffect,useRef,useState} from 'react';
import {api,useAuth} from '../auth/auth';

type Message={id:string;senderId:string;recipientId:string;content:string;createdAt:string;senderUsername?:string;senderAvatarUrl?:string};
type Recipient={userId:string;username:string;avatarUrl:string;online?:boolean};

export default function PrivateMessenger(){
 const auth=useAuth(),userId=auth.user?.id,[recipient,setRecipient]=useState<Recipient|null>(null),[items,setItems]=useState<Message[]>([]),[text,setText]=useState(''),[toast,setToast]=useState<Message|null>(null),lastSeen=useRef(''),historyEnd=useRef<HTMLDivElement>(null);
 const open=async(userId:string)=>{try{const result=await api<{items:Message[];recipient:Recipient}>(`/private-messages/${encodeURIComponent(userId)}`);setRecipient(result.recipient);setItems(result.items);setToast(null)}catch{/* Arkadaş olmayan veya engellenmiş hesaplarda pencere açılmaz. */}};
 useEffect(()=>{const handler=(event:Event)=>{const id=(event as CustomEvent<{userId:string}>).detail?.userId;if(id)void open(id)};window.addEventListener('bilio:message-user',handler);return()=>window.removeEventListener('bilio:message-user',handler)},[]);
 useEffect(()=>{if(!userId)return;const poll=async()=>{try{const result=await api<{items:Message[]}>('/private-messages/inbox'),latest=result.items.at(-1);if(latest&&latest.id!==lastSeen.current){if(lastSeen.current)setToast(latest);lastSeen.current=latest.id;if(recipient?.userId===latest.senderId)void open(latest.senderId)}}catch{/* oturum kapalıyken sessiz kal */}};void poll();const timer=window.setInterval(()=>void poll(),2500);return()=>window.clearInterval(timer)},[userId,recipient?.userId]);
 useEffect(()=>historyEnd.current?.scrollIntoView({behavior:'smooth'}),[items.length]);
 const send=async(event:FormEvent)=>{event.preventDefault();if(!recipient||!text.trim())return;const result=await api<{item:Message}>(`/private-messages/${encodeURIComponent(recipient.userId)}`,{method:'POST',body:JSON.stringify({content:text})});setItems(current=>[...current,result.item]);setText('')};
 if(!auth.user)return null;
 return <>{toast&&!recipient&&<button className="private-message-toast" onClick={()=>void open(toast.senderId)}><span>{toast.senderAvatarUrl?<img src={toast.senderAvatarUrl} alt=""/>:'✉'}</span><b>{toast.senderUsername||'Yeni mesaj'}</b><p>{toast.content}</p></button>}{recipient&&<section className="private-message-floating" aria-label={`${recipient.username} ile özel mesaj`}><header><b>{recipient.username}</b><small>{recipient.online?'Çevrim içi':'Özel mesaj'}</small><button onClick={()=>setRecipient(null)}>×</button></header><div>{items.map(item=><p className={item.senderId===auth.user?.id?'mine':''} key={item.id}><span>{item.content}</span><time>{new Date(item.createdAt).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}</time></p>)}<div ref={historyEnd}/></div><form onSubmit={send}><input maxLength={1000} value={text} onChange={event=>setText(event.target.value)} placeholder="Özel mesaj yaz…"/><button disabled={!text.trim()}>GÖNDER</button></form></section>}</>;
}
