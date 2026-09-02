// ponytail: Phase 1 of the Bolt-UI migration — real bilio auth + shell (sidebar/topbar) wired up.
// Everything past the nav (Lobi, Liderlik, Mağaza, Profil, the games themselves) is a placeholder;
// each becomes real in its own phase per the migration plan, verified live before the next one starts.
import { FormEvent, useEffect, useState } from 'react';
import {
  Bell, ChevronRight, CircleDollarSign, Gem, LogOut, MessageCircle,
  Home, Users, Trophy, ShoppingBag, UserRound, Search,
} from 'lucide-react';
import { api } from '@/lib/bilioApi';
import { useAuth } from '@/lib/useAuth';
import { Avatar } from '@/components/Avatar';
import { LobbyPage } from '@/components/LobbyPage';
import { ProfilePage } from '@/components/ProfilePage';
import { BilBakalim } from '@/components/BilBakalim';
import { Hangman } from '@/components/Hangman';
import { Leaderboard } from '@/components/Leaderboard';
import { Store } from '@/components/Store';
import { GamesGrid } from '@/components/GamesGrid';
import { formatNumber } from '@/lib/constants';
import type { Profile } from '@/lib/types';

export type Page = 'Oyunlar' | 'Lobi' | 'Liderlik Tablosu' | 'Mağaza' | 'Profil' | 'Bil Bakalım' | 'Adam Asmaca';

function App() {
  const { session, profile, loading, refreshProfile } = useAuth();
  const [page, setPage] = useState<Page>('Oyunlar');
  const [viewProfileId, setViewProfileId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 4000); return () => clearTimeout(t); }, [toast]);
  const viewProfile = (id: string) => { setViewProfileId(id); setPage('Profil'); };
  const goToPage = (p: Page) => { setViewProfileId(null); setPage(p); }; // resets any "viewing someone else" state

  if (loading) return <div className="loading-screen"><img src="/bilio_logo.png" alt="Bilio" /></div>;
  if (!session) return <AuthScreen onToast={setToast} onSignedIn={refreshProfile} />;
  if (!profile) return <div className="loading-screen"><span>Profil hazırlanıyor...</span></div>;

  return (
    <div className="app-shell">
      <Sidebar page={page} setPage={goToPage} onLogout={async () => { await api('/logout', { method: 'POST' }); await refreshProfile(); }} />
      <main className="main-content">
        <Topbar profile={profile} setPage={goToPage} />
        {page === 'Oyunlar' && <GamesGrid showToast={setToast} onEnterGame={(p) => goToPage(p)} />}
        {page === 'Bil Bakalım' && (
          <BilBakalim myUserId={profile.id} showToast={setToast} onLeave={() => goToPage('Oyunlar')} onProfileUpdate={refreshProfile} />
        )}
        {page === 'Adam Asmaca' && (
          <Hangman myUserId={profile.id} showToast={setToast} onLeave={() => goToPage('Oyunlar')} onProfileUpdate={refreshProfile} />
        )}
        {page === 'Lobi' && (
          <LobbyPage
            profile={profile}
            showToast={setToast}
            viewProfile={viewProfile}
            openPM={() => setToast('Özel mesajlar yakında.')}
          />
        )}
        {page === 'Liderlik Tablosu' && <Leaderboard myUserId={profile.id} />}
        {page === 'Mağaza' && <Store onProfileUpdate={refreshProfile} />}
        {page === 'Profil' && (
          <ProfilePage
            session={{ user: { id: profile.id } }}
            showToast={setToast}
            openPM={() => setToast('Özel mesajlar yakında.')}
            viewProfileId={viewProfileId}
            onOwnProfileUpdate={refreshProfile}
          />
        )}
      </main>
      {toast && <div className="toast">{toast}<button onClick={() => setToast('')}>×</button></div>}
    </div>
  );
}

function ComingSoon({ title }: { title: string }) {
  return <div className="coming-soon"><h2>{title}</h2><p>Bu bölüm yeni arayüze taşınıyor — yakında.</p></div>;
}

// ─── Auth Screen ─── bilio uses username+password (no email), unlike the original Supabase form.
function AuthScreen({ onToast, onSignedIn }: { onToast: (msg: string) => void; onSignedIn: () => void }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordRepeat, setPasswordRepeat] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (isSignUp) await api('/register', { method: 'POST', body: JSON.stringify({ username, password, passwordRepeat }) });
      else await api('/login', { method: 'POST', body: JSON.stringify({ username, password }) });
      onSignedIn();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'İşlem başarısız.');
      onToast('İşlem başarısız.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-glow" />
      <section className="auth-card">
        <img src="/bilio_logo.png" alt="Bilio" className="auth-logo" />
        <p className="eyebrow">OYUNUN YENİ BULUŞMA NOKTASI</p>
        <h1>{isSignUp ? 'Bilio\'ya katıl' : 'Tekrar hoş geldin'}</h1>
        <p className="auth-copy">Arkadaşlarınla oyna, odanı kur, bilgini göster.</p>
        <form onSubmit={submit} className="auth-form">
          <label>Kullanıcı adı
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Örn. DonutKralı" required minLength={3} />
          </label>
          <label>Şifre
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="En az 8 karakter" required minLength={8} />
          </label>
          {isSignUp && (
            <label>Şifre (tekrar)
              <input type="password" value={passwordRepeat} onChange={(e) => setPasswordRepeat(e.target.value)} required minLength={8} />
            </label>
          )}
          {error && <p className="form-message">{error}</p>}
          <button className="primary-button" disabled={busy}>
            {busy ? 'Hazırlanıyor...' : isSignUp ? 'Hesap oluştur' : 'Giriş yap'} <ChevronRight size={18} />
          </button>
        </form>
        <button className="text-button" onClick={() => { setIsSignUp(!isSignUp); setError(''); }}>
          {isSignUp ? 'Zaten hesabın var mı? Giriş yap' : 'Yeni misin? Hesap oluştur'}
        </button>
      </section>
    </main>
  );
}

// ─── Sidebar ───
function Sidebar({ page, setPage, onLogout }: { page: Page; setPage: (p: Page) => void; onLogout: () => void }) {
  const navItems: [typeof Home, Page][] = [
    [Home, 'Oyunlar'],
    [Users, 'Lobi'],
    [Trophy, 'Liderlik Tablosu'],
    [ShoppingBag, 'Mağaza'],
    [UserRound, 'Profil'],
  ];
  return (
    <aside className="sidebar">
      <div className="brand"><img src="/bilio_logo.png" alt="Bilio" /></div>
      <div className="side-label">MENÜ</div>
      <nav>
        {navItems.map(([Icon, label]) => (
          <button key={label} className={page === label ? 'nav-item active' : 'nav-item'} onClick={() => setPage(label)}>
            <Icon size={19} />{label}{page === label && <span className="nav-dot" />}
          </button>
        ))}
      </nav>
      <div className="side-bottom">
        <button className="join-link" disabled><Search size={17} /> Kod ile Katıl</button>
        <button className="nav-item logout" onClick={onLogout}><LogOut size={18} /> Çıkış Yap</button>
      </div>
    </aside>
  );
}

// ─── Topbar ───
function Topbar({ profile, setPage }: { profile: Profile; setPage: (p: Page) => void }) {
  return (
    <header className="topbar">
      <div>
        <p className="kicker">{new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()}</p>
        <h2>Bilio</h2>
      </div>
      <div className="top-actions">
        <div className="currency">
          <CircleDollarSign size={17} /><b>{formatNumber(profile.gold)}</b>
          <Gem size={16} /><b>{formatNumber(profile.diamonds)}</b>
        </div>
        <button className="icon-button" disabled><MessageCircle size={19} /></button>
        <button className="icon-button" disabled><Bell size={19} /></button>
        <button className="profile-mini" onClick={() => setPage('Profil')}>
          <Avatar profile={profile} size={36} />
          <div><strong>{profile.username}</strong><small>Seviye {profile.level}</small></div>
        </button>
      </div>
    </header>
  );
}

export default App;
