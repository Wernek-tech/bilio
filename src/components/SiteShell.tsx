import {ReactNode,useState} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import {useAuth} from '../auth/auth';
import AuthModal from '../auth/AuthModal';
import AccountToolbar from './AccountToolbar';

const items=[['OYUNLAR','/oyunlar'],['LOBİ','/lobi'],['LİDERLİK TABLOSU','/liderlik'],['MAĞAZA','/magaza'],['PROFİL','/profil']] as const;
export default function SiteShell({children}:{children:ReactNode}){
 const nav=useNavigate(),loc=useLocation(),auth=useAuth(); const [modal,setModal]=useState<'login'|'register'|null>(null);
 return <div className="site-shell"><aside className="site-sidebar"><div className="brand-block"><img src="/assets/bilio-logo.png" className="official-logo" alt="Bilio"/><div className="slogans"><strong>BİL VE ARKADAŞLARINLA EĞLEN</strong><span>BİLİO DÜNYASINA HOŞ GELDİN</span></div></div><nav className="desktop-nav" aria-label="Ana navigasyon">{items.map(([label,to])=>{const selected=loc.pathname===to||(to==='/oyunlar'&&loc.pathname==='/');return <button key={to} className={selected?'selected':''} onClick={()=>nav(to)}>{selected&&<img src="/assets/nav-donut.png" alt=""/>}<span>{label}</span></button>})}</nav><div className="sidebar-auth">{auth.user?<button className="logout-btn" onClick={async()=>{await auth.logout();nav('/oyunlar')}}>ÇIKIŞ YAP</button>:<><button onClick={()=>setModal('register')}>KAYIT OL</button><button onClick={()=>setModal('login')}>GİRİŞ YAP</button></>}</div></aside><section className="site-main"><AccountToolbar/>{children}</section>{modal&&<AuthModal mode={modal} onClose={()=>setModal(null)}/>}</div>
}
