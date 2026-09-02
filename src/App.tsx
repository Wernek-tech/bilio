import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell, ChevronRight, ChevronLeft, CircleDollarSign, Copy, Crown, Gem,
  Gift, Heart, Home, LogOut, MessageCircle, Plus, Search, Send, Settings,
  ShoppingBag, Sparkles, Trophy, UserRound, Users, X, Zap, Lock, Check,
  Smile, UserPlus, UserMinus, Ban, Play, Star, Award, ArrowLeft, Bot as BotIcon, Camera,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import { Avatar } from '@/components/Avatar';
import {
  GAMES, GAME_COLORS, BOT_NAMES, TURKISH_ALPHABET, EMOJIS, TITLES,
  formatNumber, formatTime, formatDate, xpProgress, generateRoomCode,
} from '@/lib/constants';
import type {
  Profile, Room, LobbyMessage, PrivateMessage, ShopItem, InventoryItem,
  Badge, UserBadge, Notification, Friend, FriendRequest, GameQuestion, LeaderboardEntry,
  DonutPackage, Bot, RoomMember,
} from '@/lib/types';
import { BilBakalimLobby } from '@/components/BilBakalimLobby';
import { BilBakalimGame } from '@/components/BilBakalimGame';
import { BilBakalimResults } from '@/components/BilBakalimResults';

type Page = 'Oyunlar' | 'Lobi' | 'Liderlik Tablosu' | 'Mağaza' | 'Profil' | 'Kod ile Katıl' | 'Oda Lobisi' | 'Adam Asmaca' | 'Bil Bakalım Lobisi' | 'Bil Bakalım' | 'Bil Bakalım Sonuçları';

function App() {
  const { session, profile, loading, refreshProfile, setProfile } = useAuth();
  const [page, setPage] = useState<Page>('Oyunlar');
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [toast, setToast] = useState('');
  const [pmOpen, setPmOpen] = useState(false);
  const [pmTarget, setPmTarget] = useState<string | null>(null);
  const [pmNotification, setPmNotification] = useState<{ senderId: string; senderName: string; body: string } | null>(null);
  const [viewProfileId, setViewProfileId] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notifChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 4000);
  }, []);

  const openPM = useCallback((targetId: string) => {
    setPmTarget(targetId);
    setPmOpen(true);
  }, []);

  const viewProfile = useCallback((profileId: string) => {
    setViewProfileId(profileId);
    setPage('Profil');
  }, []);

  const loadNotifications = useCallback(async () => {
    if (!session) return;
    const [{ data: notifData }, { data: reqData }] = await Promise.all([
      supabase.from('notifications').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(20),
      supabase.from('friend_requests').select('*, sender:profiles!friend_requests_sender_id_fkey(*)').eq('receiver_id', session.user.id).eq('status', 'pending').order('created_at', { ascending: false }),
    ]);
    setNotifications((notifData ?? []) as Notification[]);
    setFriendRequests((reqData ?? []) as FriendRequest[]);
  }, [session]);

  useEffect(() => {
    if (!session) return;
    loadNotifications();
    const channel = supabase.channel(`notifications-${session.user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${session.user.id}` }, () => loadNotifications())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'friend_requests', filter: `receiver_id=eq.${session.user.id}` }, () => loadNotifications())
      .subscribe();
    notifChannelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [session, loadNotifications]);

  if (loading) return <div className="loading-screen"><img src="/bilio_logo.png" alt="Bilio" /></div>;
  if (!session) return <AuthScreen onToast={showToast} />;
  if (!profile) return <div className="loading-screen"><Sparkles size={28} /><span>Profil hazırlanıyor...</span></div>;

  return (
    <div className="app-shell">
      <Sidebar page={page} setPage={setPage} profile={profile} />
      <main className="main-content">
        <Topbar profile={profile} setPage={setPage} onOpenNotifications={() => { setShowNotifications(true); }} notifCount={notifications.filter(n => !n.read).length + friendRequests.length} />
        {page === 'Oyunlar' && <GamesPage profile={profile} showToast={showToast} setActiveRoom={setActiveRoom} setPage={setPage} />}
        {page === 'Lobi' && <LobbyPage profile={profile} showToast={showToast} setPage={setPage} openPM={openPM} viewProfile={viewProfile} />}
        {page === 'Kod ile Katıl' && <JoinPage profile={profile} showToast={showToast} setActiveRoom={setActiveRoom} setPage={setPage} />}
        {page === 'Liderlik Tablosu' && <LeaderboardPage />}
        {page === 'Mağaza' && <ShopPage profile={profile} showToast={showToast} onProfileUpdate={refreshProfile} />}
        {page === 'Profil' && <ProfilePage profile={viewProfileId && viewProfileId !== profile.id ? null : profile} session={session} onProfileUpdate={refreshProfile} showToast={showToast} openPM={openPM} viewProfileId={viewProfileId} onViewProfile={viewProfile} />}
        {page === 'Oda Lobisi' && activeRoom && <GameLobbyPage room={activeRoom} profile={profile} showToast={showToast} setPage={setPage} setActiveRoom={setActiveRoom} onProfileUpdate={refreshProfile} openPM={openPM} />}
        {page === 'Bil Bakalım Lobisi' && activeRoom && <BilBakalimLobby room={activeRoom} profile={profile} showToast={showToast} setPage={setPage} setActiveRoom={setActiveRoom} onProfileUpdate={refreshProfile} openPM={openPM} onStart={() => setPage('Bil Bakalım')} />}
        {page === 'Bil Bakalım' && activeRoom && <BilBakalimGame room={activeRoom} profile={profile} showToast={showToast} setPage={setPage} onProfileUpdate={refreshProfile} onMatchEnd={() => setPage('Bil Bakalım Sonuçları')} />}
        {page === 'Bil Bakalım Sonuçları' && activeRoom && <BilBakalimResults room={activeRoom} profile={profile} showToast={showToast} setPage={setPage} onProfileUpdate={refreshProfile} onPlayAgain={() => setPage('Bil Bakalım Lobisi')} />}
        {page === 'Adam Asmaca' && activeRoom && <HangmanPage room={activeRoom} profile={profile} showToast={showToast} setPage={setPage} onProfileUpdate={refreshProfile} />}
      </main>
      {pmOpen && pmTarget && (
        <PrivateMessageWindow
          currentUserId={profile.id}
          targetId={pmTarget}
          onClose={() => setPmOpen(false)}
          showToast={showToast}
        />
      )}
      {pmNotification && !pmOpen && (
        <PmNotification
          notification={pmNotification}
          onClick={() => { openPM(pmNotification.senderId); setPmNotification(null); }}
          onClose={() => setPmNotification(null)}
        />
      )}
      {showNotifications && (
        <NotificationPanel
          notifications={notifications}
          friendRequests={friendRequests}
          onClose={() => setShowNotifications(false)}
          onRespond={async (requestId, accept) => {
            const { error } = await supabase.rpc('respond_friend_request', { p_request_id: requestId, p_accept: accept });
            if (error) showToast('İstek yanıtlanamadı.');
            else { showToast(accept ? 'Arkadaşlık isteği kabul edildi.' : 'Arkadaşlık isteği reddedildi.'); loadNotifications(); refreshProfile(); }
          }}
          onMarkRead={async (notifId) => {
            await supabase.from('notifications').update({ read: true }).eq('id', notifId);
            loadNotifications();
          }}
          onViewProfile={(id) => { viewProfile(id); setShowNotifications(false); }}
          onOpenPM={(id) => { openPM(id); setShowNotifications(false); }}
        />
      )}
      {toast && (
        <div className="toast">{toast}<button onClick={() => setToast('')}><X size={15} /></button></div>
      )}
    </div>
  );
}

// ─── Auth Screen ───
function AuthScreen({ onToast }: { onToast: (msg: string) => void }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setBusy(true);
    if (isSignUp && username.trim().length < 3) {
      setError('Kullanıcı adı en az 3 karakter olmalı.');
      setBusy(false);
      return;
    }
    const result = isSignUp
      ? await supabase.auth.signUp({ email, password, options: { data: { username: username.trim() } } })
      : await supabase.auth.signInWithPassword({ email, password });
    if (result.error) {
      const msg = result.error.message;
      if (msg.includes('already registered')) setError('Bu e-posta zaten kayıtlı.');
      else if (msg.includes('Invalid credentials')) setError('E-posta veya şifre hatalı.');
      else setError('İşlem başarısız. Lütfen tekrar deneyin.');
    } else {
      if (isSignUp) {
        setError('Hesabın oluşturuldu. Giriş yapabilirsin.');
        setIsSignUp(false);
      }
    }
    setBusy(false);
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
          {isSignUp && (
            <label>Kullanıcı adı
              <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Örn. DonutKralı" required minLength={3} />
            </label>
          )}
          <label>E-posta
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="sen@ornek.com" required />
          </label>
          <label>Şifre
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="En az 6 karakter" required minLength={6} />
          </label>
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
function Sidebar({ page, setPage, profile }: { page: Page; setPage: (p: Page) => void; profile: Profile }) {
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
        <button className="join-link" onClick={() => setPage('Kod ile Katıl')}>
          <Search size={17} /> Kod ile Katıl
        </button>
        <button className="nav-item logout" onClick={() => supabase.auth.signOut()}>
          <LogOut size={18} /> Çıkış Yap
        </button>
      </div>
    </aside>
  );
}

// ─── Topbar ───
function Topbar({ profile, setPage, onOpenNotifications, notifCount }: { profile: Profile; setPage: (p: Page) => void; onOpenNotifications: () => void; notifCount: number }) {
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
        <button className="icon-button" onClick={onOpenNotifications}><MessageCircle size={19} />{notifCount > 0 && <i />}</button>
        <button className="icon-button" onClick={onOpenNotifications}><Bell size={19} />{notifCount > 0 && <i />}</button>
        <button className="profile-mini" onClick={() => setPage('Profil')}>
          <Avatar profile={profile} size={36} />
          <div><strong>{profile.username}</strong><small>Seviye {profile.level}</small></div>
        </button>
      </div>
    </header>
  );
}

// ─── Games Page ───
function GamesPage({ profile, showToast, setActiveRoom, setPage }: {
  profile: Profile; showToast: (m: string) => void; setActiveRoom: (r: Room | null) => void; setPage: (p: Page) => void;
}) {
  const [creating, setCreating] = useState(false);

  async function createRoom(game: typeof GAMES[0]) {
    setCreating(true);
    const defaultSettings = game.name === 'Bil Bakalım'
      ? { category: 'Karışık', turn_duration: 45, word_count: 20 }
      : {};
    const { data, error } = await supabase.rpc('create_bilio_room', {
      p_game_type: game.name,
      p_code: generateRoomCode(),
      p_capacity: game.maxPlayers,
      p_settings: defaultSettings,
    });
    if (error || !data) {
      console.error('Oda oluşturma hatası:', error?.message, error?.code);
      const message = error?.message?.includes('zaten')
        ? 'Bu oda kodu zaten kullanılıyor. Tekrar dene.'
        : error?.message?.includes('Profil')
          ? 'Profil bulunamadı. Çıkış yapıp tekrar giriş yap.'
          : 'Oda oluşturulamadı. Lütfen tekrar deneyin.';
      showToast(message);
      setCreating(false);
      return;
    }

    showToast(`${game.name} odası oluşturuldu.`);
    setActiveRoom(data as Room);
    setPage(game.name === 'Bil Bakalım' ? 'Bil Bakalım Lobisi' : 'Oda Lobisi');
    setCreating(false);
  }

  return (
    <>
      <section className="hero-banner">
        <div>
          <p className="eyebrow">BİLİO'DA BUGÜN</p>
          <h1>Bilginle parlamaya<br /><em>hazır mısın?</em></h1>
          <p>En sevdiğin oyunu seç, arkadaşlarını davet et ve skor tablosunda yüksel.</p>
          <button className="hero-button" onClick={() => createRoom(GAMES[0])} disabled={creating}>
            Hemen oda kur <ChevronRight size={18} />
          </button>
        </div>
        <div className="hero-donut">◌<span>✦</span></div>
      </section>
      <div className="section-heading">
        <div><p className="eyebrow">OYUN KÜTÜPHANESİ</p><h3>Bir oyun seç</h3></div>
      </div>
      <section className="game-grid">
        {GAMES.map((game) => (
          <article className={`game-card ${game.color}`} key={game.name}>
            <div className="game-art"><span>{game.icon}</span><small>{game.mode}</small></div>
            <div className="game-info">
              <h4>{game.name}</h4>
              <p>{game.description}</p>
              <div className="game-meta">
                <span><Users size={14} /> {game.players}</span>
                <button onClick={() => createRoom(game)} disabled={creating}>Oda kur <ChevronRight size={15} /></button>
              </div>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}

// ─── Lobby Page ───
function LobbyPage({ profile, showToast, setPage, openPM, viewProfile }: {
  profile: Profile; showToast: (m: string) => void; setPage: (p: Page) => void; openPM: (id: string) => void; viewProfile: (id: string) => void;
}) {
  const [messages, setMessages] = useState<LobbyMessage[]>([]);
  const [message, setMessage] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [menuUser, setMenuUser] = useState<string | null>(null);
  const [allBots, setAllBots] = useState<Bot[]>([]);
  const chatRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const loadData = useCallback(async () => {
    const [{ data: msgData, error: messageError }, { data: botData }] = await Promise.all([
      supabase.from('lobby_messages').select('id, body, created_at, sender_id').order('created_at', { ascending: false }).limit(40),
      supabase.from('bots').select('*'),
    ]);
    if (messageError) {
      console.error('Genel lobi mesajları yüklenemedi:', messageError.message);
      return;
    }
    const rawMessages = (msgData ?? []) as Omit<LobbyMessage, 'sender'>[];
    const senderIds = [...new Set(rawMessages.map((msg) => msg.sender_id))];
    const { data: senderProfiles } = senderIds.length > 0
      ? await supabase.from('profiles').select('id, username, avatar_color, level, title, frame').in('id', senderIds)
      : { data: [] };
    const profilesById = new Map((senderProfiles ?? []).map((sender) => [sender.id, sender]));
    const completeMessages = rawMessages.map((msg) => ({
      ...msg,
      sender: profilesById.has(msg.sender_id) ? [profilesById.get(msg.sender_id)] : null,
    })) as LobbyMessage[];
    setMessages(completeMessages.reverse());
    setAllBots((botData ?? []) as Bot[]);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const channel = supabase.channel('lobby')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'lobby_messages' }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadData]);

  useEffect(() => {
    if (autoScroll && chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, autoScroll]);

  function onScroll() {
    if (!chatRef.current) return;
    const atBottom = chatRef.current.scrollHeight - chatRef.current.scrollTop - chatRef.current.clientHeight < 60;
    setAutoScroll(atBottom);
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!message.trim()) return;
    const body = message.trim();
    setMessage('');
    setShowEmoji(false);
    const { data, error } = await supabase.from('lobby_messages').insert({ sender_id: profile.id, body }).select('id, body, created_at, sender_id').single();
    if (error || !data) {
      setMessage(body);
      showToast(error?.message ?? 'Mesaj gönderilemedi.');
      return;
    }
    const newMessage: LobbyMessage = {
      ...data,
      sender: [{ username: profile.username, avatar_color: profile.avatar_color, level: profile.level, title: profile.title, frame: profile.frame }],
    } as LobbyMessage;
    setMessages((current) => [...current, newMessage].slice(-40));
  }

  function getSenderProfile(msg: LobbyMessage): Profile | Bot | null {
    if (!msg.sender || !Array.isArray(msg.sender) || msg.sender.length === 0) return null;
    const s = msg.sender[0];
    const bot = allBots.find((b) => b.username === s.username);
    if (bot) return bot;
    return { id: msg.sender_id, username: s.username, avatar_color: s.avatar_color, level: s.level, title: s.title, frame: s.frame } as unknown as Profile;
  }

  return (
    <div className="lobby-layout lobby-chat-only">
      <section className="chat-card">
        <div className="chat-header">
          <div><p className="eyebrow">GENEL LOBİ</p><h3>Topluluk sohbeti</h3></div>
          <span className="online"><i /> canlı</span>
        </div>
        <div className="chat-messages" ref={chatRef} onScroll={onScroll}>
          {messages.length === 0 ? (
            <p className="chat-empty">İlk mesajı sen gönder.</p>
          ) : (
            messages.map((msg) => {
              const sender = getSenderProfile(msg);
              return (
                <div className="chat-message" key={msg.id}>
                  <div onClick={(e) => { e.stopPropagation(); setMenuUser(menuUser === msg.id ? null : msg.id); }}>
                    <Avatar profile={sender && 'avatar_color' in sender && !('gender' in sender) ? sender as Profile : undefined} bot={sender && 'gender' in sender ? sender as Bot : undefined} size={30} />
                  </div>
                  <div className="chat-msg-body">
                    <div className="chat-msg-header">
                      <strong>{Array.isArray(msg.sender) ? msg.sender[0]?.username : 'Oyuncu'}</strong>
                      {Array.isArray(msg.sender) && msg.sender[0]?.level !== undefined && (
                        <span className="msg-level">Sv {msg.sender[0].level}</span>
                      )}
                      {Array.isArray(msg.sender) && msg.sender[0]?.title && (
                        <span className="msg-title">{msg.sender[0].title}</span>
                      )}
                      <span className="msg-time">{formatTime(msg.created_at)}</span>
                    </div>
                    <p>{msg.body}</p>
                  </div>
                  {menuUser === msg.id && (
                    <div className="msg-menu" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => { viewProfile(msg.sender_id); setMenuUser(null); }}>Profili Gör</button>
                      <button onClick={async () => {
                        const { error } = await supabase.rpc('add_friend', { p_friend_id: msg.sender_id });
                        showToast(error ? 'İstek gönderilemedi.' : 'Arkadaşlık isteği gönderildi!');
                        setMenuUser(null);
                      }}><UserPlus size={14} /> Arkadaş Ekle</button>
                      <button onClick={() => { openPM(msg.sender_id); setMenuUser(null); }}><MessageCircle size={14} /> Mesaj Gönder</button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        <form className="chat-form" onSubmit={sendMessage}>
          {showEmoji && (
            <div className="emoji-picker">
              {EMOJIS.map((e) => (
                <button key={e} type="button" onClick={() => { setMessage(message + e); setShowEmoji(false); }}>{e}</button>
              ))}
            </div>
          )}
          <button type="button" className="emoji-toggle" onClick={() => setShowEmoji(!showEmoji)}><Smile size={20} /></button>
          <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Lobiye bir mesaj bırak..." maxLength={400} />
          <button className="send-donut" aria-label="Gönder"><Send size={17} /></button>
        </form>
      </section>
    </div>
  );
}

// ─── Join Room Page ───
function JoinPage({ profile, showToast, setActiveRoom, setPage }: {
  profile: Profile; showToast: (m: string) => void; setActiveRoom: (r: Room | null) => void; setPage: (p: Page) => void;
}) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  async function join(event: FormEvent) {
    event.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    const { data: room } = await supabase.from('rooms').select('*').eq('code', code.trim().toUpperCase()).maybeSingle();
    if (!room) { showToast('Bu kodla bekleyen bir oda bulunamadı.'); setBusy(false); return; }
    if (room.status !== 'waiting') { showToast('Bu oda artık beklemiyor. Oyun başlamış olabilir.'); setBusy(false); return; }
    const { count } = await supabase.from('room_members').select('*', { count: 'exact', head: true }).eq('room_id', room.id);
    if ((count ?? 0) >= room.capacity) { showToast('Oda dolu.'); setBusy(false); return; }
    const { error } = await supabase.from('room_members').insert({ room_id: room.id, user_id: profile.id });
    if (error) {
      if (error.code === '23505') showToast('Bu odaya zaten katıldın.');
      else showToast('Katılım başarısız.');
      setBusy(false);
      return;
    }
    showToast(`${room.game_type} lobisine katıldın.`);
    setActiveRoom(room as Room);
    setPage(room.game_type === 'Bil Bakalım' ? 'Bil Bakalım Lobisi' : 'Oda Lobisi');
    setBusy(false);
  }

  return (
    <section className="join-panel">
      <div className="join-art"><Zap size={34} /><p>Arkadaşının paylaştığı<br />oda kodunu gir.</p></div>
      <div className="join-content">
        <p className="eyebrow">ODA KODU İLE KATIL</p>
        <h3>Oyuna direkt bağlan</h3>
        <p>Oda kodu büyük/küçük harfe duyarlı değildir. Kodlar yalnızca bekleyen odalarda çalışır.</p>
        <form onSubmit={join}>
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ÖRN. A7K9Q2" maxLength={6} />
          <button className="primary-button" disabled={busy}>Lobiye katıl <ChevronRight size={18} /></button>
        </form>
      </div>
    </section>
  );
}

// ─── Leaderboard Page ───
function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.rpc('get_weekly_leaderboard').then(({ data }) => {
      setEntries((data ?? []) as LeaderboardEntry[]);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="loading-screen"><Trophy size={28} /><span>Liderlik tablosu yükleniyor...</span></div>;

  if (entries.length === 0) {
    return (
      <section className="empty-panel">
        <Trophy size={30} />
        <h3>Henüz bu hafta skor yok</h3>
        <p>Bu hafta oynadıkça gerçek skorun burada görünecek.</p>
      </section>
    );
  }

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);

  return (
    <>
      <div className="section-heading"><div><p className="eyebrow">HAFTALIK SIRALAMA</p><h3>Liderlik Tablosu</h3></div></div>
      <section className="podium">
        {podiumOrder.map((entry, i) => {
          const rank = entry === top3[0] ? 1 : entry === top3[1] ? 2 : 3;
          const isTop = rank === 1;
          return (
            <div key={entry.user_id} className={`podium-card ${isTop ? 'first' : rank === 2 ? 'second' : 'third'}`}>
              {rank === 1 && <Crown size={24} className="crown" />}
              <div className="podium-rank">{rank}</div>
              <Avatar profile={entry as unknown as Profile} size={isTop ? 72 : 56} />
              <strong>{entry.username}</strong>
              {entry.title && <span className="msg-title">{entry.title}</span>}
              <div className="podium-score">{formatNumber(entry.weekly_score)}</div>
              <small>Seviye {entry.level} · {entry.total_wins} galibiyet</small>
            </div>
          );
        })}
      </section>
      <section className="leaderboard-list">
        {rest.map((entry, i) => (
          <div className="lb-row" key={entry.user_id}>
            <span className="lb-rank">{i + 4}</span>
            <Avatar profile={entry as unknown as Profile} size={36} />
            <div className="lb-info">
              <strong>{entry.username}</strong>
              {entry.title && <span className="msg-title">{entry.title}</span>}
            </div>
            <span className="lb-score">{formatNumber(entry.weekly_score)}</span>
          </div>
        ))}
      </section>
    </>
  );
}

// ─── Shop Page ───
function ShopPage({ profile, showToast, onProfileUpdate }: {
  profile: Profile; showToast: (m: string) => void; onProfileUpdate: () => void;
}) {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  useEffect(() => {
    supabase.from('shop_items').select('*').order('price').then(({ data }) => setItems((data ?? []) as ShopItem[]));
    supabase.from('inventory').select('*, item:shop_items(*)').then(({ data }) => setInventory((data ?? []) as InventoryItem[]));
  }, []);

  async function buy(item: ShopItem) {
    const { error } = await supabase.rpc('purchase_item', { p_item_id: item.id });
    if (error) {
      showToast(error.message.includes('Yetersiz') ? 'Yetersiz bakiye.' : 'Satın alma başarısız.');
    } else {
      showToast(`${item.name} satın alındı!`);
      const [{ data: invData }] = await Promise.all([
        supabase.from('inventory').select('*, item:shop_items(*)'),
        onProfileUpdate(),
      ]);
      setInventory((invData ?? []) as InventoryItem[]);
    }
  }

  async function equip(item: ShopItem) {
    const { error } = await supabase.rpc('equip_item', { p_item_id: item.id });
    if (error) showToast(error.message);
    else {
      showToast(`${item.name} kuşanıldı!`);
      onProfileUpdate();
      const { data } = await supabase.from('inventory').select('*, item:shop_items(*)');
      setInventory((data ?? []) as InventoryItem[]);
    }
  }

  const ownedIds = new Set(inventory.map((i) => i.item_id));
  const equippedIds = new Set(inventory.filter((i) => i.equipped).map((i) => i.item_id));

  return (
    <>
      <div className="section-heading">
        <div><p className="eyebrow">BİLİO MAĞAZASI</p><h3>Çerçeveler, Unvanlar ve Hediyeler</h3></div>
      </div>
      <section className="shop-grid">
        {items.map((item) => {
          const owned = ownedIds.has(item.id);
          const equipped = equippedIds.has(item.id);
          return (
            <div className={`shop-card rarity-${item.rarity}`} key={item.id}>
              <div className="shop-item-art">
                {item.type === 'frame' ? <Sparkles size={32} /> : item.type === 'title' ? <Award size={32} /> : item.type === 'gift' ? <Gift size={32} /> : <Star size={32} />}
              </div>
              <div className="shop-item-info">
                <h4>{item.name}</h4>
                <small>{item.type === 'frame' ? 'Çerçeve' : item.type === 'title' ? 'Unvan' : item.type === 'gift' ? 'Hediye' : 'Donut Paketi'}</small>
                <div className="shop-price">
                  {item.currency === 'gold' ? <CircleDollarSign size={15} /> : <Gem size={15} />}
                  {formatNumber(item.price)}
                </div>
                {owned ? (
                  <button className={equipped ? 'equipped-btn' : 'equip-btn'} onClick={() => equip(item)} disabled={equipped}>
                    {equipped ? <><Check size={15} /> Kuşanıldı</> : 'Kuşan'}
                  </button>
                ) : (
                  <button className="buy-btn" onClick={() => buy(item)}>Satın Al</button>
                )}
              </div>
            </div>
          );
        })}
      </section>
    </>
  );
}

// ─── Profile Page ───
function ProfilePage({ profile, session, onProfileUpdate, showToast, openPM, viewProfileId, onViewProfile }: {
  profile: Profile | null; session: { user: { id: string } }; onProfileUpdate: () => void; showToast: (m: string) => void; openPM: (id: string) => void; viewProfileId: string | null; onViewProfile: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [about, setAbout] = useState('');
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [showTitleModal, setShowTitleModal] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [viewedProfile, setViewedProfile] = useState<Profile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isOwnProfile = !viewProfileId || viewProfileId === session.user.id;
  const displayProfile = isOwnProfile ? profile : viewedProfile;

  useEffect(() => {
    if (viewProfileId && viewProfileId !== session.user.id) {
      setLoadingProfile(true);
      supabase.from('profiles').select('*').eq('id', viewProfileId).maybeSingle().then(({ data }) => {
        setViewedProfile(data as Profile | null);
        setLoadingProfile(false);
      });
    } else {
      setViewedProfile(null);
    }
  }, [viewProfileId, session.user.id]);

  useEffect(() => {
    const target = isOwnProfile ? profile : viewedProfile;
    if (!target) return;
    setAbout(target.about);
    setLikeCount(target.likes);
    supabase.from('user_badges').select('*, badge:badges(*)').eq('user_id', target.id).then(({ data }) => setBadges((data ?? []) as UserBadge[]));
    supabase.from('badges').select('*').order('unlock_level').then(({ data }) => setAllBadges((data ?? []) as Badge[]));
    supabase.from('friends').select('*, profile:profiles!friends_friend_id_fkey(*)').eq('user_id', target.id).then(({ data }) => setFriends((data ?? []) as Friend[]));
    if (!isOwnProfile) {
      supabase.from('profile_likes').select('1').eq('liker_id', session.user.id).eq('target_id', target.id).maybeSingle().then(({ data }) => setLiked(!!data));
    }
  }, [isOwnProfile, profile, viewedProfile, session.user.id]);

  async function saveAbout() {
    if (!displayProfile) return;
    const { error } = await supabase.from('profiles').update({ about: about.slice(0, 240) }).eq('id', displayProfile.id);
    if (error) showToast('Hakkımda kaydedilemedi.');
    else { showToast('Hakkımda güncellendi.'); setEditing(false); onProfileUpdate(); }
  }

  async function uploadAvatar(file: File) {
    if (!file.type.startsWith('image/')) { showToast('Lütfen bir resim dosyası seç.'); return; }
    if (file.size > 2 * 1024 * 1024) { showToast('Resim 2MB\'den küçük olmalı.'); return; }
    if (!profile) return;
    setUploadingAvatar(true);
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png';
    const path = `${profile.id}/avatar.${ext}`;
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (upErr) { showToast('Resim yüklenemedi.'); setUploadingAvatar(false); return; }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    const cacheBustUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    const { error: dbErr } = await supabase.from('profiles').update({ avatar_url: cacheBustUrl }).eq('id', profile.id);
    if (dbErr) { showToast('Profil güncellenemedi.'); setUploadingAvatar(false); return; }
    showToast('Profil resmi güncellendi!');
    onProfileUpdate();
    setUploadingAvatar(false);
  }

  async function toggleLike() {
    if (isOwnProfile || !displayProfile) { showToast('Kendi profilini beğenemezsin.'); return; }
    const { data, error } = await supabase.rpc('toggle_like', { p_target_id: displayProfile.id });
    if (error) { showToast('Beğeni işlemi başarısız.'); return; }
    const result = data as { liked: boolean } | null;
    setLiked(!!result?.liked);
    setLikeCount((c) => c + (result?.liked ? 1 : -1));
  }

  async function selectTitle(titleName: string) {
    if (!displayProfile) return;
    const { error } = await supabase.from('profiles').update({ title: titleName }).eq('id', displayProfile.id);
    if (error) showToast('Unvan seçilemedi.');
    else { showToast('Unvan güncellendi.'); setShowTitleModal(false); onProfileUpdate(); }
  }

  async function toggleShowcaseBadge(badgeId: string) {
    if (!displayProfile) return;
    const existing = badges.filter((b) => b.in_showcase);
    const has = badges.find((b) => b.badge_id === badgeId);
    if (!has) return;
    if (has.in_showcase) {
      await supabase.from('user_badges').update({ in_showcase: false }).eq('user_id', displayProfile.id).eq('badge_id', badgeId);
    } else if (existing.length < 5) {
      await supabase.from('user_badges').update({ in_showcase: true, showcase_order: existing.length }).eq('user_id', displayProfile.id).eq('badge_id', badgeId);
    } else {
      showToast('Vitrinde 5 rozet zaten var. Birini çıkar.');
      return;
    }
    const { data } = await supabase.from('user_badges').select('*, badge:badges(*)').eq('user_id', displayProfile.id);
    setBadges((data ?? []) as UserBadge[]);
  }

  async function saveShowcase() {
    setShowBadgeModal(false);
    showToast('Vitrin kaydedildi.');
  }

  const showcaseBadges = badges.filter((b) => b.in_showcase).sort((a, b) => a.showcase_order - b.showcase_order);
  const earnedBadgeIds = new Set(badges.map((b) => b.badge_id));
  const winRate = displayProfile && displayProfile.total_matches > 0 ? Math.round((displayProfile.total_wins / displayProfile.total_matches) * 100) : 0;
  const xpPct = displayProfile ? xpProgress(displayProfile.xp) : 0;

  if (!displayProfile) {
    return (
      <section className="profile-view">
        <div className="empty-panel-inline">
          <Sparkles size={28} />
          <h3>Profil yükleniyor...</h3>
        </div>
      </section>
    );
  }

  return (
    <section className="profile-view">
      <div className="profile-hero">
        <div className="big-avatar-wrap">
          <Avatar profile={displayProfile} size={84} showFrame showBotTag={false} />
          {isOwnProfile && (
            <button className="avatar-upload-btn" onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar}>
              <Camera size={16} />
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); e.target.value = ''; }} />
        </div>
        <div className="profile-hero-info">
          <div className="profile-name-row">
            <h3>{displayProfile.username}</h3>
            {displayProfile.title && <span className="title-badge">{displayProfile.title}</span>}
          </div>
          <div className="like-display">
            <Heart size={16} fill="#ff4f91" />
            <span>{likeCount} beğeni</span>
          </div>
          <p className="muted">{editing ? (
            <textarea className="about-editor" value={about} onChange={(e) => setAbout(e.target.value)} maxLength={240} rows={3} />
          ) : (displayProfile.about || 'Henüz bir hakkında yazısı yok.')}</p>
          {editing ? (
            <div className="about-actions">
              <button className="soft-button" onClick={saveAbout}>Kaydet</button>
              <button className="text-button" onClick={() => { setAbout(displayProfile.about); setEditing(false); }}>İptal</button>
            </div>
          ) : isOwnProfile && (
            <button className="soft-button edit-btn" onClick={() => setEditing(true)}><Settings size={14} /> Düzenle</button>
          )}
        </div>
        {!isOwnProfile && (
          <button className={`like-btn ${liked ? 'liked' : ''}`} onClick={toggleLike}>
            <Heart size={22} fill={liked ? '#ff4f91' : 'none'} />
            <span>{likeCount}</span>
          </button>
        )}
      </div>

      <div className="profile-stats">
        <div><small>SEVİYE</small><strong>{displayProfile.level}</strong></div>
        <div><small>TOPLAM MAÇ</small><strong>{formatNumber(displayProfile.total_matches)}</strong></div>
        <div><small>GALİBİYET</small><strong>{formatNumber(displayProfile.total_wins)}</strong></div>
        <div><small>GALİBİYET ORANI</small><strong>%{winRate}</strong></div>
        <div><small>DOĞRU CEVAP</small><strong>{formatNumber(displayProfile.total_correct)}</strong></div>
        <div><small>TOPLAM PUAN</small><strong>{formatNumber(displayProfile.total_score)}</strong></div>
      </div>

      <div className="xp-card">
        <div className="xp-title">
          <span><Zap size={17} /> Seviye ilerlemesi</span>
          <b>{xpPct}%</b>
        </div>
        <div className="progress"><i style={{ width: `${xpPct}%` }} /></div>
        <small>Bilio'ya katılım: {formatDate(displayProfile.created_at)}</small>
      </div>

      <div className="profile-section">
        <div className="profile-section-header">
          <h4>Rozet Vitrini</h4>
          {isOwnProfile && <button className="soft-button" onClick={() => setShowBadgeModal(true)}>Vitrini Düzenle</button>}
        </div>
        <div className="badge-showcase">
          {showcaseBadges.length === 0 ? (
            <p className="muted">Henüz vitrinde rozet yok.</p>
          ) : (
            showcaseBadges.map((ub) => (
              <div className="showcase-badge" key={ub.badge_id}>
                <div className="badge-img">{ub.badge?.image_url ? <img src={ub.badge.image_url} alt={ub.badge.name} /> : <Award size={32} />}</div>
                <small>{ub.badge?.name}</small>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="profile-section">
        <div className="profile-section-header">
          <h4>Başırmalar</h4>
          <button className="soft-button" onClick={() => setShowTitleModal(true)}>Unvan Seç</button>
        </div>
        <div className="achievements-grid">
          {allBadges.slice(0, 12).map((badge) => {
            const earned = earnedBadgeIds.has(badge.id);
            return (
              <div className={`achievement-card ${earned ? 'earned' : 'locked'}`} key={badge.id}>
                <div className="badge-img">{earned ? <Award size={28} /> : <Lock size={20} />}</div>
                <small>{badge.name}</small>
                {!earned && <span className="unlock-info">Sv {badge.unlock_level}</span>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="profile-section">
        <div className="profile-section-header">
          <h4>Arkadaşlarım</h4>
        </div>
        <div className="friends-list">
          {friends.length === 0 ? (
            <p className="muted">Henüz arkadaşın yok. Lobiden arkadaş ekleyebilirsin.</p>
          ) : (
            friends.map((f) => (
              <div className="friend-card" key={f.friend_id}>
                <Avatar profile={f.profile} size={40} />
                <div className="friend-info">
                  <strong>{f.profile?.username}</strong>
                  <small>Seviye {f.profile?.level}</small>
                </div>
                <button className="friend-msg" onClick={() => openPM(f.friend_id)}><MessageCircle size={16} /></button>
              </div>
            ))
          )}
        </div>
      </div>

      {showBadgeModal && (
        <div className="modal-overlay" onClick={() => setShowBadgeModal(false)}>
          <div className="badge-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Rozetlerim</h3>
              <button onClick={() => setShowBadgeModal(false)}><X size={20} /></button>
            </div>
            <div className="badge-grid">
              {allBadges.map((badge) => {
                const earned = earnedBadgeIds.has(badge.id);
                const inShowcase = badges.find((b) => b.badge_id === badge.id)?.in_showcase;
                return (
                  <div className={`badge-card ${earned ? 'earned' : 'locked'} ${inShowcase ? 'in-showcase' : ''}`} key={badge.id} onClick={() => earned && toggleShowcaseBadge(badge.id)}>
                    <div className="badge-img">{earned ? (badge.image_url ? <img src={badge.image_url} alt={badge.name} /> : <Award size={32} />) : <Lock size={24} />}</div>
                    <small>{badge.name}</small>
                    <span className="badge-task">{badge.unlock_condition}</span>
                    {!earned && <span className="unlock-info">Sv {badge.unlock_level}'de açılır</span>}
                    {inShowcase && <Check size={16} className="showcase-check" />}
                  </div>
                );
              })}
            </div>
            <div className="modal-footer">
              <button className="primary-button" onClick={saveShowcase}>Vitrini Kaydet</button>
            </div>
          </div>
        </div>
      )}

      {showTitleModal && (
        <div className="modal-overlay" onClick={() => setShowTitleModal(false)}>
          <div className="title-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Unvan Seç</h3>
              <button onClick={() => setShowTitleModal(false)}><X size={20} /></button>
            </div>
            <div className="title-grid">
              {TITLES.map((title) => {
                const unlocked = (displayProfile?.level ?? 0) >= title.level;
                const selected = displayProfile?.title === title.name;
                return (
                  <div className={`title-card ${unlocked ? 'unlocked' : 'locked'} ${selected ? 'selected' : ''}`} key={title.name || 'none'} onClick={() => unlocked && selectTitle(title.name)}>
                    {title.name || '(Unvan yok)'}
                    {!unlocked && <Lock size={14} />}
                    {selected && <Check size={14} />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// ─── Game Lobby Page ───
function GameLobbyPage({ room, profile, showToast, setPage, setActiveRoom, onProfileUpdate, openPM }: {
  room: Room; profile: Profile; showToast: (m: string) => void; setPage: (p: Page) => void;
  setActiveRoom: (r: Room | null) => void; onProfileUpdate: () => void; openPM: (id: string) => void;
}) {
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [bots, setBots] = useState<Bot[]>([]);
  const [chat, setChat] = useState<{ id: string; body: string; sender_id: string; is_bot: boolean; created_at: string }[]>([]);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const game = GAMES.find((g) => g.name === room.game_type);
  const colors = game ? GAME_COLORS[game.color] : GAME_COLORS.gold;

  const loadMembers = useCallback(async () => {
    const [{ data: memberData, error: memberError }, { data: botData, error: botError }, { data: chatData, error: chatError }] = await Promise.all([
      supabase.from('room_members').select('*').eq('room_id', room.id),
      supabase.from('bots').select('*'),
      supabase.from('room_chat').select('id, body, sender_id, is_bot, created_at').eq('room_id', room.id).order('created_at', { ascending: false }).limit(30),
    ]);
    if (memberError) console.error('room_members load error:', memberError.message);
    if (botError) console.error('bots load error:', botError.message);
    if (chatError) console.error('room_chat load error:', chatError.message);
    const memberList = (memberData ?? []) as RoomMember[];
    const botList = (botData ?? []) as Bot[];
    setBots(botList);
    const humanIds = memberList.filter((m) => !m.is_bot).map((m) => m.user_id);
    const { data: profileData, error: profileError } = humanIds.length > 0
      ? await supabase.from('profiles').select('*').in('id', humanIds)
      : { data: [], error: null };
    if (profileError) console.error('profiles load error:', profileError.message);
    const profilesById = new Map((profileData ?? []).map((p) => [p.id, p]));
    for (const m of memberList) {
      if (m.is_bot) {
        m.bot = botList.find((b) => b.id === m.user_id) ?? null;
        m.profile = null;
      } else {
        m.profile = profilesById.get(m.user_id) ?? null;
        m.bot = null;
      }
    }
    setMembers(memberList);
    setChat(((chatData ?? []) as typeof chat).reverse());
  }, [room.id]);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  useEffect(() => {
    const channel = supabase.channel(`room-${room.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_members', filter: `room_id=eq.${room.id}` }, () => loadMembers())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'room_chat', filter: `room_id=eq.${room.id}` }, () => loadMembers())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [room.id, loadMembers]);

  async function copyCode() {
    try { await navigator.clipboard.writeText(room.code); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
  }

  async function leaveRoom() {
    const { error } = await supabase.from('room_members').delete().eq('room_id', room.id).eq('user_id', profile.id);
    if (error) {
      console.error('Odadan ayrılma hatası:', error.message);
      showToast('Odadan ayrılırken bir sorun oluştu.');
      return;
    }
    setActiveRoom(null);
    setPage('Oyunlar');
  }

  async function toggleReady() {
    const current = members.find((m) => m.user_id === profile.id);
    if (!current) { showToast('Oda üyeliğin bulunamadı.'); return; }
    const { error } = await supabase.from('room_members').update({ ready: !current.ready }).eq('room_id', room.id).eq('user_id', profile.id);
    if (error) {
      console.error('Hazır durumu güncelleme hatası:', error.message);
      showToast('Hazır durumu güncellenemedi.');
      return;
    }
    loadMembers();
  }

  async function inviteBot() {
    const filledIds = new Set(members.map((m) => m.user_id));
    const availableBot = bots.find((b) => !filledIds.has(b.id));
    if (!availableBot) { showToast('Tüm botlar odada.'); return; }
    if (members.length >= room.capacity) { showToast('Oda dolu.'); return; }
    const { error } = await supabase.rpc('invite_bot_to_room', { p_room_id: room.id, p_bot_id: availableBot.id });
    if (error) {
      console.error('Bot davet hatası:', error.message);
      showToast(error.message || 'Bot davet edilemedi.');
      return;
    }
    showToast(`${availableBot.username} odaya eklendi.`);
    loadMembers();
  }

  async function sendChat(event: FormEvent) {
    event.preventDefault();
    if (!message.trim()) return;
    const body = message.trim();
    const { error } = await supabase.rpc('send_room_chat_message', { p_room_id: room.id, p_body: body });
    if (error) {
      console.error('Sohbet mesajı hatası:', error.message);
      showToast(error.message || 'Mesaj gönderilemedi.');
      return;
    }
    setMessage('');
    loadMembers();
  }

  async function startGame() {
    if (room.owner_id !== profile.id) { showToast('Sadece oda sahibi oyunu başlatabilir.'); return; }
    if (room.game_type === 'Adam Asmaca') {
      const { error } = await supabase.from('rooms').update({ status: 'playing' }).eq('id', room.id);
      if (error) { showToast('Oyun başlatılamadı.'); return; }
      setPage('Adam Asmaca');
    } else if (room.game_type === 'Bil Bakalım') {
      setPage('Bil Bakalım Lobisi');
    } else {
      showToast('Bu oyun yakında hazır. Bil Bakalım veya Adam Asmaca\'yı deneyebilirsin!');
    }
  }

  const isOwner = room.owner_id === profile.id;
  const myMember = members.find((m) => m.user_id === profile.id);
  const allReady = members.filter((m) => !m.is_bot).every((m) => m.ready);

  return (
    <div className="game-lobby" style={{ '--c-primary': colors.primary, '--c-glow': colors.glow, '--c-bg': colors.bg, '--c-border': colors.border, '--c-text': colors.text } as React.CSSProperties}>
      <div className="lobby-header">
        <button className="back-btn" onClick={leaveRoom}><ArrowLeft size={18} /> Geri</button>
        <img src="/bilio_logo.png" alt="Bilio" className="lobby-logo" />
        <h2 className="lobby-title">{room.game_type}</h2>
        <button className="code-btn" onClick={copyCode}>
          {copied ? <Check size={16} /> : <Copy size={16} />} {room.code}
        </button>
      </div>
      <div className="lobby-body">
        <div className="lobby-players">
          <div className="players-header">
            <h3>Oyuncular ({members.length}/{room.capacity})</h3>
          </div>
          <div className="player-slots">
            {Array.from({ length: room.capacity }).map((_, i) => {
              const m = members[i];
              if (!m) return <div className="empty-slot" key={i}>Boş Koltuk</div>;
              return (
                <div className="player-card" key={m.user_id}>
                  <Avatar profile={m.profile} bot={m.bot} size={48} showFrame showBotTag />
                  <div className="player-card-info">
                    <div className="player-name-row">
                      <strong>{m.profile?.username ?? m.bot?.username ?? 'Oyuncu'}</strong>
                      {room.owner_id === m.user_id && !m.is_bot && <Crown size={14} className="owner-icon" />}
                    </div>
                    {!m.is_bot && m.profile && <small>Sv {m.profile.level}</small>}
                    {!m.is_bot && m.profile?.title && <span className="msg-title">{m.profile.title}</span>}
                    {m.is_bot && <img src="/bilio_logo.png" alt="Bilio" className="bot-bilio-logo" />}
                    <span className={`ready-status ${m.ready ? 'ready' : 'waiting'}`}>{m.ready ? 'Hazır' : 'Bekliyor'}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="lobby-actions">
            {isOwner && <button className="lobby-btn invite" onClick={inviteBot}><BotIcon size={16} /> Bot Davet Et</button>}
            <button className="lobby-btn ready" onClick={toggleReady}>
              {myMember?.ready ? 'Bekliyor' : 'Hazır'}
            </button>
            {isOwner && <button className="lobby-btn start" onClick={startGame} disabled={!allReady || members.length < 1}><Play size={16} /> Oyunu Başlat</button>}
            <button className="lobby-btn leave" onClick={leaveRoom}>Odadan Ayrıl</button>
          </div>
        </div>
        <div className="lobby-chat">
          <div className="chat-header"><h3>Oda Sohbeti</h3></div>
          <div className="chat-messages">
            {chat.length === 0 ? <p className="chat-empty">Henüz mesaj yok.</p> : chat.map((msg) => {
              const sender = members.find((m) => m.user_id === msg.sender_id);
              return (
                <div className="chat-message" key={msg.id}>
                  <Avatar profile={sender?.profile} bot={sender?.bot} size={28} />
                  <div>
                    <strong>{sender?.profile?.username ?? sender?.bot?.username ?? 'Oyuncu'}</strong>
                    <p>{msg.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <form className="chat-form" onSubmit={sendChat}>
            <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Oda sohbetine yaz..." maxLength={400} />
            <button className="send-donut" aria-label="Gönder"><Send size={17} /></button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Hangman Game Page ───
function HangmanPage({ room, profile, showToast, setPage, onProfileUpdate }: {
  room: Room; profile: Profile; showToast: (m: string) => void; setPage: (p: Page) => void; onProfileUpdate: () => void;
}) {
  const [word, setWord] = useState('');
  const [hint, setHint] = useState('');
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState<Set<string>>(new Set());
  const [used, setUsed] = useState<Set<string>>(new Set());
  const [wrongCount, setWrongCount] = useState(0);
  const [won, setWon] = useState(false);
  const [lost, setLost] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    supabase.from('hangman_words').select('*').then(({ data }) => {
      const words = data ?? [];
      if (words.length === 0) return;
      const picked = words[Math.floor(Math.random() * words.length)];
      setWord(picked.word.toUpperCase());
      setHint(picked.hint);
    });
  }, []);

  useEffect(() => {
    if (won || lost) return;
    if (timeLeft <= 0) { setLost(true); return; }
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, won, lost]);

  useEffect(() => {
    if (!word) return;
    const allRevealed = word.split('').every((ch) => revealed.has(ch) || ch === ' ');
    if (allRevealed && revealed.size > 0 && !won) {
      setWon(true);
      supabase.rpc('record_game_result', {
        p_game_type: 'Adam Asmaca', p_won: true, p_correct: revealed.size, p_score: 100, p_xp: 50,
      }).then(() => onProfileUpdate());
    }
  }, [revealed, word, won, onProfileUpdate]);

  useEffect(() => {
    if (wrongCount >= 6 && !lost) {
      setLost(true);
      supabase.rpc('record_game_result', {
        p_game_type: 'Adam Asmaca', p_won: false, p_correct: revealed.size, p_score: 10, p_xp: 10,
      }).then(() => onProfileUpdate());
    }
  }, [wrongCount, lost, revealed.size, onProfileUpdate]);

  function guess(letter: string) {
    if (used.has(letter) || won || lost) return;
    const newUsed = new Set(used);
    newUsed.add(letter);
    setUsed(newUsed);
    if (word.includes(letter)) {
      const newRevealed = new Set(revealed);
      newRevealed.add(letter);
      setRevealed(newRevealed);
    } else {
      const newWrong = new Set(wrong);
      newWrong.add(letter);
      setWrong(newWrong);
      setWrongCount((c) => c + 1);
    }
  }

  async function buyLetter() {
    if (buying || won || lost) return;
    setBuying(true);
    const { error } = await supabase.rpc('buy_hangman_letter', { p_room_id: room.id });
    if (error) {
      showToast(error.message.includes('altın') ? 'Harf almak için 100 altın gerekli.' : 'Harf alınamadı.');
      setBuying(false);
      return;
    }
    const unrevealed = word.split('').filter((ch) => !revealed.has(ch) && ch !== ' ');
    if (unrevealed.length === 0) { setBuying(false); return; }
    const letterToReveal = unrevealed[Math.floor(Math.random() * unrevealed.length)];
    const newRevealed = new Set(revealed);
    newRevealed.add(letterToReveal);
    setRevealed(newRevealed);
    const newUsed = new Set(used);
    newUsed.add(letterToReveal);
    setUsed(newUsed);
    onProfileUpdate();
    showToast(`${letterToReveal} harfi açıldı!`);
    setBuying(false);
  }

  function playAgain() {
    setRevealed(new Set()); setWrong(new Set()); setUsed(new Set());
    setWrongCount(0); setWon(false); setLost(false); setTimeLeft(60);
    supabase.from('hangman_words').select('*').then(({ data }) => {
      const words = data ?? [];
      if (words.length === 0) return;
      const picked = words[Math.floor(Math.random() * words.length)];
      setWord(picked.word.toUpperCase());
      setHint(picked.hint);
    });
  }

  const display = word ? word.split('').map((ch) => (revealed.has(ch) || ch === ' ' ? ch : '_')).join(' ') : '';
  const colors = GAME_COLORS.green;

  return (
    <div className="hangman-game" style={{ '--c-primary': colors.primary, '--c-glow': colors.glow, '--c-bg': colors.bg, '--c-border': colors.border, '--c-text': colors.text } as React.CSSProperties}>
      <div className="lobby-header">
        <button className="back-btn" onClick={() => setPage('Oyunlar')}><ArrowLeft size={18} /> Geri</button>
        <img src="/bilio_logo.png" alt="Bilio" className="lobby-logo" />
        <h2 className="lobby-title">ADAM ASMACA</h2>
        <div className="timer-circle">{timeLeft}<small>sn</small></div>
      </div>
      <div className="hangman-body">
        <div className="hangman-main">
          <div className="hangman-drawing">
            <svg viewBox="0 0 200 250" className="hangman-svg">
              <line x1="20" y1="240" x2="180" y2="240" stroke="var(--c-primary)" strokeWidth="4" />
              <line x1="50" y1="240" x2="50" y2="20" stroke="var(--c-primary)" strokeWidth="4" />
              <line x1="50" y1="20" x2="130" y2="20" stroke="var(--c-primary)" strokeWidth="4" />
              <line x1="130" y1="20" x2="130" y2="45" stroke="var(--c-primary)" strokeWidth="4" />
              {wrongCount >= 1 && <circle cx="130" cy="60" r="15" stroke="var(--c-primary)" strokeWidth="3" fill="none" />}
              {wrongCount >= 2 && <line x1="130" y1="75" x2="130" y2="130" stroke="var(--c-primary)" strokeWidth="3" />}
              {wrongCount >= 3 && <line x1="130" y1="90" x2="105" y2="115" stroke="var(--c-primary)" strokeWidth="3" />}
              {wrongCount >= 4 && <line x1="130" y1="90" x2="155" y2="115" stroke="var(--c-primary)" strokeWidth="3" />}
              {wrongCount >= 5 && <line x1="130" y1="130" x2="110" y2="170" stroke="var(--c-primary)" strokeWidth="3" />}
              {wrongCount >= 6 && <line x1="130" y1="130" x2="150" y2="170" stroke="var(--c-primary)" strokeWidth="3" />}
            </svg>
          </div>
          <div className="hangman-info">
            <div className="hint-box"><strong>İpucu:</strong> {hint}</div>
            <div className="word-display">{display}</div>
            <div className="wrong-count">Hata: {wrongCount}/6</div>
            {won && <div className="game-result win"><Check size={24} /> Kelimeyi bildin! +100 puan, +50 XP</div>}
            {lost && <div className="game-result lose"><X size={24} /> Doğru cevap: {word}</div>}
            <button className="buy-letter-btn" onClick={buyLetter} disabled={buying || won || lost}>
              <Gem size={16} /> Harf Al (100 Altın)
            </button>
            {(won || lost) && <button className="primary-button" onClick={playAgain}><Play size={16} /> Tekrar Oyna</button>}
          </div>
        </div>
        <div className="hangman-keyboard">
          {TURKISH_ALPHABET.map((letter) => {
            const isUsed = used.has(letter);
            const isCorrect = isUsed && word.includes(letter);
            const isWrong = isUsed && !word.includes(letter);
            return (
              <button
                key={letter}
                className={`key ${isCorrect ? 'correct' : ''} ${isWrong ? 'wrong' : ''}`}
                onClick={() => guess(letter)}
                disabled={isUsed || won || lost}
              >
                {letter}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Private Message Window ───
function PrivateMessageWindow({ currentUserId, targetId, onClose, showToast }: {
  currentUserId: string; targetId: string; onClose: () => void; showToast: (m: string) => void;
}) {
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [message, setMessage] = useState('');
  const [targetProfile, setTargetProfile] = useState<Profile | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    const [{ data: msgs }, { data: profile }] = await Promise.all([
      supabase.from('private_messages').select('*').or(`and(sender_id.eq.${currentUserId},recipient_id.eq.${targetId}),and(sender_id.eq.${targetId},recipient_id.eq.${currentUserId})`).order('created_at', { ascending: true }).limit(50),
      supabase.from('profiles').select('*').eq('id', targetId).maybeSingle(),
    ]);
    setMessages((msgs ?? []) as PrivateMessage[]);
    setTargetProfile(profile as Profile | null);
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
    await supabase.from('private_messages').update({ read_at: new Date().toISOString() }).eq('recipient_id', currentUserId).eq('sender_id', targetId).is('read_at', null);
  }, [currentUserId, targetId]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  useEffect(() => {
    const channel = supabase.channel(`pm-${currentUserId}-${targetId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'private_messages' }, () => loadMessages())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadMessages, currentUserId, targetId]);

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!message.trim()) return;
    const body = message.trim();
    setMessage('');
    const { error } = await supabase.rpc('send_private_message', { p_recipient_id: targetId, p_body: body });
    if (error) showToast(error.message || 'Mesaj gönderilemedi.');
    else loadMessages();
  }

  return (
    <div className="pm-window">
      <div className="pm-header">
        <Avatar profile={targetProfile} size={36} />
        <div>
          <strong>{targetProfile?.username ?? 'Oyuncu'}</strong>
          <small>{targetProfile ? 'Çevrim içi' : 'Çevrim dışı'}</small>
        </div>
        <button onClick={onClose}><X size={20} /></button>
      </div>
      <div className="pm-messages" ref={chatRef}>
        {messages.length === 0 ? <p className="chat-empty">Henüz mesaj yok. İlk mesajı gönder!</p> :
          messages.map((msg) => (
            <div key={msg.id} className={`pm-bubble ${msg.sender_id === currentUserId ? 'sent' : 'received'}`}>
              <p>{msg.body}</p>
              <small>{formatTime(msg.created_at)}</small>
            </div>
          ))
        }
      </div>
      <form className="pm-form" onSubmit={send}>
        <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Mesaj yaz..." maxLength={500} />
        <button className="send-donut" aria-label="Gönder"><Send size={17} /></button>
      </form>
    </div>
  );
}

// ─── Notification Panel ───
function NotificationPanel({ notifications, friendRequests, onClose, onRespond, onMarkRead, onViewProfile, onOpenPM }: {
  notifications: Notification[]; friendRequests: FriendRequest[]; onClose: () => void;
  onRespond: (requestId: string, accept: boolean) => void; onMarkRead: (notifId: string) => void;
  onViewProfile: (id: string) => void; onOpenPM: (id: string) => void;
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <h3>Bildirimler</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {friendRequests.length > 0 && (
            <>
              <p className="eyebrow" style={{ marginTop: '4px' }}>ARKADAŞLIK İSTEKLERİ</p>
              {friendRequests.map((req) => (
                <div key={req.id} className="friend-card" style={{ alignItems: 'center' }}>
                  <Avatar profile={req.sender} size={40} />
                  <div className="friend-info">
                    <strong>{req.sender?.username ?? 'Oyuncu'}</strong>
                    <small>Sana arkadaşlık isteği gönderdi</small>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button className="lobby-btn ready" style={{ padding: '8px 12px', fontSize: 11 }} onClick={() => onRespond(req.id, true)}>
                      <Check size={14} /> Kabul
                    </button>
                    <button className="lobby-btn leave" style={{ padding: '8px 12px', fontSize: 11 }} onClick={() => onRespond(req.id, false)}>
                      <X size={14} /> Reddet
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
          {notifications.length === 0 && friendRequests.length === 0 ? (
            <p className="muted" style={{ textAlign: 'center', padding: '30px' }}>Henüz bildirimin yok.</p>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className="friend-card" style={{ alignItems: 'center', opacity: n.read ? 0.6 : 1 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', display: 'grid', placeItems: 'center', background: n.type === 'like' ? '#ff4f9120' : n.type === 'pm' ? '#ff8aaf20' : '#32191b', color: n.type === 'like' ? '#ff4f91' : n.type === 'pm' ? '#ff8aaf' : '#ffd4ae', flexShrink: 0 }}>
                  {n.type === 'like' ? <Heart size={18} /> : n.type === 'pm' ? <MessageCircle size={18} /> : <Bell size={18} />}
                </div>
                <div className="friend-info">
                  <strong>{n.title}</strong>
                  <small>{n.body}</small>
                </div>
                {!n.read && <button className="lobby-btn" style={{ padding: '6px 10px', fontSize: 10 }} onClick={() => onMarkRead(n.id)}>Okundu</button>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── PM Notification ───
function PmNotification({ notification, onClick, onClose }: {
  notification: { senderId: string; senderName: string; body: string }; onClick: () => void; onClose: () => void;
}) {
  return (
    <div className="pm-notification" onClick={onClick}>
      <div className="pm-notif-content">
        <strong>{notification.senderName}</strong>
        <p>{notification.body}</p>
      </div>
      <button onClick={(e) => { e.stopPropagation(); onClose(); }}><X size={16} /></button>
    </div>
  );
}

export default App;
