import {FormEvent,useCallback,useEffect,useRef,useState} from 'react';
import {api,useAuth} from '../auth/auth';
import PlayerAvatar from './PlayerAvatar';

type Message={id:string;senderId:string;recipientId:string;content:string;createdAt:string;senderUsername?:string;senderAvatarUrl?:string;senderFrameId?:string|null};
type Recipient={userId:string;username:string;avatarUrl:string;frameId?:string|null;online?:boolean};

export default function PrivateMessenger(){
 const auth=useAuth(),userId=auth.user?.id;
 const [recipient,setRecipient]=useState<Recipient|null>(null),[items,setItems]=useState<Message[]>([]),[text,setText]=useState(''),[toast,setToast]=useState<Message|null>(null),[error,setError]=useState(''),[sending,setSending]=useState(false);
 const lastSeen=useRef(''),initialized=useRef(false),historyEnd=useRef<HTMLDivElement>(null);
 const open=useCallback(async(targetId:string)=>{try{const [result,publicResult]=await Promise.all([api<{items:Message[];recipient:Recipient}>(`/private-messages/${encodeURIComponent(targetId)}`),api<{profile:{selectedFrameId?:string|null}}>(`/profiles/${encodeURIComponent(targetId)}`).catch(()=>null)]);setRecipient({...result.recipient,frameId:publicResult?.profile.selectedFrameId||result.recipient.frameId||null});setItems(result.items);setToast(null);setError('')}catch(reason){setError(reason instanceof Error?reason.message:'Özel mesaj açılamadı.')}},[]);
 useEffect(()=>{const handler=(event:Event)=>{const id=(event as CustomEvent<{userId:string}>).detail?.userId;if(id)void open(id)};window.addEventListener('bilio:message-user',handler);return()=>window.removeEventListener('bilio:message-user',handler)},[open]);
 useEffect(()=>{initialized.current=false;lastSeen.current='';if(!userId)return;const poll=async()=>{try{const result=await api<{items:Message[]}>('/private-messages/inbox'),latest=result.items.at(-1);if(!initialized.current){lastSeen.current=latest?.id||'';initialized.current=true;return}if(latest&&latest.id!==lastSeen.current){lastSeen.current=latest.id;if(recipient?.userId===latest.senderId)void open(latest.senderId);else setToast(latest)}}catch{/* Oturum yokken sessiz kal. */}};void poll();const timer=window.setInterval(()=>void poll(),2000);return()=>window.clearInterval(timer)},[userId,recipient?.userId,open]);
 useEffect(()=>historyEnd.current?.scrollIntoView({behavior:'smooth'}),[items.length]);
 const send=async(event:FormEvent)=>{event.preventDefault();if(!recipient||!text.trim()||sending)return;setSending(true);try{const result=await api<{item:Message}>(`/private-messages/${encodeURIComponent(recipient.userId)}`,{method:'POST',body:JSON.stringify({content:text.trim()})});setItems(current=>[...current,result.item]);setText('');setError('')}catch(reason){setError(reason instanceof Error?reason.message:'Mesaj gönderilemedi.')}finally{setSending(false)}};
 if(!auth.user)return null;
 return <>
  {toast&&!recipient&&<button className="private-message-toast" onClick={()=>void open(toast.senderId)}><PlayerAvatar username={toast.senderUsername||'Oyuncu'} avatarUrl={toast.senderAvatarUrl} frameId={toast.senderFrameId}/><b>{toast.senderUsername||'Yeni mesaj'}</b><p>{toast.content}</p></button>}
  {recipient&&<section className="private-message-floating" aria-label={`${recipient.username} ile özel mesaj`}><header><PlayerAvatar username={recipient.username} avatarUrl={recipient.avatarUrl} frameId={recipient.frameId}/><div><b>{recipient.username}</b><small>{recipient.online?'Çevrim içi':'Çevrim dışı'}</small></div><button aria-label="Özel mesajı kapat" onClick={()=>setRecipient(null)}>×</button></header><div>{items.map(item=><p className={item.senderId===auth.user?.id?'mine':''} key={item.id}><span>{item.content}</span><time>{new Date(item.createdAt).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}</time></p>)}<div ref={historyEnd}/></div><form onSubmit={send}><input maxLength={1000} value={text} onChange={event=>setText(event.target.value)} placeholder="Özel mesaj yaz…"/><button disabled={sending||!text.trim()}>{sending?'…':'GÖNDER'}</button></form>{error&&<small className="private-message-error">{error}</small>}</section>}
  {error&&!recipient&&<button className="private-message-error-toast" onClick={()=>setError('')}>{error} ×</button>}
 </>;
}
