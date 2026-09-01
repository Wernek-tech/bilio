import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api, useAuth } from '../auth/auth';
import AuthModal from '../auth/AuthModal';
import AccountToolbar from '../components/AccountToolbar';
type Game = {
    title: string;
    to?: string;
    art: string;
};
const games: Game[] = [
    { title: 'ŞARKIYI BİL', to: '/oyun/sarkiyi-bil', art: '/assets/home/sarkiyi-bil.png' },
    { title: 'TAHMİN ET KİM?', to: '/oyun/tahmin-et-kim', art: '/assets/home/tahmin-et-kim.png' },
    { title: 'BİL BAKALIM', to: '/oyun/bil-bakalim', art: '/assets/home/bil-bakalim.png' },
    { title: 'ÇİZ & BİL', to: '/oyun/ciz-bil', art: '/assets/home/ciz-bil.png' },
    { title: 'ADAM ASMACA', to: '/oyun/adam-asmaca', art: '/assets/home/adam-asmaca.png' },
    { title: 'VAMPİR KÖYLÜ', to: '/oyun/vampir-koylu', art: '/assets/home/vampir-koylu.png' },
    { title: 'YAYINCI KİM?', to: '/oyun/yayinci-kim', art: '/assets/home/yayinci-kim.png' },
    { title: 'DİĞER SEKME ÇOK YAKINDA', art: '/assets/home/cok-yakinda.png' }
];
const navItems = [['OYUNLAR', '/oyunlar'], ['LOBİ', '/lobi'], ['LİDERLİK TABLOSU', '/liderlik'], ['MAĞAZA', '/magaza'], ['PROFİL', '/profil']] as const;
export default function Home() { const nav = useNavigate(), loc = useLocation(), auth = useAuth(); const state = loc.state as {
    authRequired?: boolean;
    returnTo?: string;
} | null; const [modal, setModal] = useState<'gate' | 'login' | 'register' | null>(state?.authRequired ? 'gate' : null), [pending, setPending] = useState<string | null>(state?.returnTo || null), [joinOpen, setJoinOpen] = useState(false), [roomCode, setRoomCode] = useState(''), [joinBusy, setJoinBusy] = useState(false), [joinError, setJoinError] = useState(''); const openGame = (g: Game) => { if (!g.to)
    return; if (!auth.user) {
    setPending(g.to);
    setModal('gate');
    return;
} nav(g.to); }; const joinByCode = async () => { if (!auth.user) { setJoinOpen(false); setPending('/oyunlar'); setModal('login'); return; } const code = roomCode.trim().toUpperCase(); if (!code || joinBusy) return; setJoinBusy(true); setJoinError(''); try { const result = await api<{ path: string; }>('/game/join-by-code', { method: 'POST', body: JSON.stringify({ code }) }); setJoinOpen(false); nav(result.path); } catch (reason) { setJoinError(reason instanceof Error ? reason.message : 'Odaya katılınamadı.'); } finally { setJoinBusy(false); } }; return <main className="games-home"><aside className="desktop-sidebar"><div className="brand-block"><img className="official-logo" src="/assets/bilio-logo.png" alt="Bilio"/><div className="slogans"><strong>BİL VE ARKADAŞLARINLA EĞLEN</strong><span>BİLİO DÜNYASINA HOŞ GELDİN</span></div></div><nav className="desktop-nav" aria-label="Ana menü">{navItems.map(([label, to], i) => <button key={to} className={i === 0 ? 'selected' : ''} onClick={() => nav(to)}>{i === 0 && <img src="/assets/nav-donut.png" alt=""/>}<span>{label}</span></button>)}<button className="join-code-nav" onClick={() => { setJoinError(''); setJoinOpen(true); }}><span>KOD İLE KATIL</span></button></nav><div className="sidebar-auth">{auth.user ? <button className="logout-btn" onClick={async () => { await auth.logout(); nav('/oyunlar'); }}>ÇIKIŞ YAP</button> : <><button onClick={() => setModal('register')}>KAYIT OL</button><button onClick={() => setModal('login')}>GİRİŞ YAP</button></>}</div></aside><section className="games-content"><AccountToolbar /><div className="games-grid">{games.map(g => <article key={g.title} className={'desktop-game-card ' + (!g.to ? 'disabled' : '')}><div className="game-art"><img src={g.art} alt=""/></div><div className="game-card-foot"><h2>{g.title}</h2>{g.to ? <button className="launch-button" onClick={() => openGame(g)} aria-label={`${g.title} oyununu aç`}>▶</button> : <button className="launch-button" disabled aria-label="Çok yakında">×</button>}</div></article>)}</div></section>{joinOpen && <div className="modal-back" onMouseDown={event => { if (event.target === event.currentTarget && !joinBusy) setJoinOpen(false); }}><form className="join-code-modal" onSubmit={event => { event.preventDefault(); void joinByCode(); }}><button type="button" className="modal-x" onClick={() => setJoinOpen(false)} aria-label="Pencereyi kapat">×</button><h2>KOD İLE KATIL</h2><p>Arkadaşının paylaştığı oda kodunu gir.</p><input autoFocus aria-label="Oda kodu" value={roomCode} maxLength={16} placeholder="ÖRN. SB-3801" onChange={event => setRoomCode(event.target.value.toUpperCase().replace(/\s/g, ''))}/>{joinError && <div className="inline-error" role="status">{joinError}</div>}<button className="primary-btn" disabled={joinBusy || !roomCode.trim()}>{joinBusy ? 'ODA ARANIYOR…' : 'ODAYA KATIL'}</button></form></div>}{modal === 'gate' && <div className="modal-back auth-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) {
    setModal(null);
    setPending(null);
} }}><section className="auth-gate" role="dialog" aria-modal="true" aria-labelledby="auth-gate-title"><button className="modal-x" onClick={() => { setModal(null); setPending(null); }} aria-label="Pencereyi kapat">×</button><h2 id="auth-gate-title">GİRİŞ GEREKLİ</h2><p>Bu oyunu oynayabilmek için kayıt olmanız veya giriş yapmanız gerekiyor.</p><div><button className="secondary-btn" onClick={() => setModal('register')}>KAYIT OL</button><button className="primary-btn" onClick={() => setModal('login')}>GİRİŞ YAP</button></div></section></div>}{modal && modal !== 'gate' && <AuthModal mode={modal} onClose={() => { setModal(null); setPending(null); }} onSuccess={mode => { if (mode === 'register') {
    setPending(null);
    nav('/profil');
}
else if (pending) {
    const to = pending;
    setPending(null);
    nav(to);
} }}/>}</main>; }
