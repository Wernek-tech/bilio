import {FormEvent, PointerEvent as ReactPointerEvent, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {api, useAuth} from '../auth/auth';
import {titles} from '../data/titles';
import {createRequestId} from '../utils/requestId';
import PlayerAvatar from '../components/PlayerAvatar';

type Player = {
  userId: string;
  username: string;
  avatarUrl?: string;
  titleId?: string;
  frameId?: string | null;
  ready?: boolean;
  connected?: boolean;
  seat: number;
  score?: number;
  correct?: number;
  wrong?: number;
  timeouts?: number;
  rank?: number;
  diamonds?: number;
  xp?: number;
};

type RoomMessage = {id: string; userId: string; username: string; avatarUrl?: string; titleId?: string; content: string; createdAt: number};
type Room = {
  id: string;
  code: string;
  hostUserId: string;
  status: 'LOBBY' | 'PLAYING' | 'ENDED';
  capacity: 4 | 8;
  category: string;
  turnSeconds: 30 | 45 | 60 | 90;
  wordCount: 20;
  countdownEndsAt: number | null;
  matchId: string | null;
  players: Player[];
  messages: RoomMessage[];
};

type Match = {
  id: string;
  status: 'PLAYING' | 'FINISHED';
  category: string;
  grid: string[][];
  words: string[];
  found: string[];
  players: Player[];
  order: string[];
  activeUserId: string;
  turnEndsAt: number;
  turnSeconds: number;
  turnCount: number;
  startedAt: number;
  endedAt: number | null;
  results: Player[] | null;
};

type StateResponse = {room: Room | null; match: Match | null};
const categories = ['HAYVANLAR', 'SANATÇILAR', 'NESNELER', 'ŞARKI İSİMLERİ', 'YEMEKLER', 'KARIŞIK'];
const durations = [30, 45, 60, 90] as const;
const resultNumber = (value: number | undefined) => new Intl.NumberFormat('tr-TR').format(value || 0);

function TitleArt({id}: {id?: string}) {
  if (!id) return null;
  if (id === 'bilio-bot') return <img className="bb-title-art bot-title" src="/assets/bilio-logo.png" alt="Bilio botu"/>;
  const title = titles.find(item => item.id === id);
  return title ? <img className="bb-title-art" src={title.assetPath} alt={`${title.name} unvanı`}/> : null;
}

function Avatar({player, large = false}: {player: Player; large?: boolean}) {
  return <PlayerAvatar className={`bb-avatar-frame${large ? ' large' : ''}`} username={player.username} avatarUrl={player.avatarUrl} frameId={player.frameId}/>;
}

function RoomChat({room, chat, busy, onChatChange, onSubmit, compact = false}: {room: Room; chat: string; busy: boolean; onChatChange: (value: string) => void; onSubmit: (event: FormEvent) => void; compact?: boolean}) {
  return <section className={`bb-room-chat${compact ? ' compact' : ''}`}><h2>ODA SOHBETİ</h2><div className="bb-room-chat-history">{room.messages.length === 0 ? <div className="bb-chat-empty">Henüz mesaj bulunmuyor.</div> : room.messages.map(message => {
    const player = room.players.find(item => item.userId === message.userId) || {userId: message.userId, username: message.username, avatarUrl: message.avatarUrl, titleId: message.titleId, seat: 0};
    return <article className="bb-room-message" key={message.id}><Avatar player={player}/><div><header><b>{message.username}</b><time>{new Date(message.createdAt).toLocaleTimeString('tr-TR', {hour: '2-digit', minute: '2-digit'})}</time></header><p>{message.content}</p></div></article>;
  })}</div><form onSubmit={onSubmit}><input aria-label="Oda mesajı" maxLength={500} placeholder="Mesajını yaz..." value={chat} onChange={event => onChatChange(event.target.value)} disabled={busy}/><button className="bb-donut-send" aria-label="Mesaj gönder" disabled={!chat.trim() || busy}><img src="/assets/nav-donut.png" alt=""/></button></form></section>;
}

export default function BilBakalimGame() {
  const nav = useNavigate();
  const auth = useAuth();
  const [room, setRoom] = useState<Room | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chat, setChat] = useState('');
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [selection, setSelection] = useState<{start: [number, number]; end: [number, number]} | null>(null);
  const [confirmedFound, setConfirmedFound] = useState<string[]>([]);
  const dragging = useRef(false);

  const fetchState = useCallback(async (createIfMissing = false) => {
    try {
      let state = await api<StateResponse>('/game/bil-bakalim/active');
      if (!state.room && createIfMissing) {
        await api('/game/bil-bakalim/create', {method: 'POST'});
        state = await api<StateResponse>('/game/bil-bakalim/active');
      }
      setRoom(state.room);
      setMatch(current => {
        if (!state.match) return null;
        if (!current || current.id !== state.match.id) return state.match;
        return {...state.match, found: [...new Set([...state.match.found, ...current.found])]} as Match;
      });
      if (state.match) setConfirmedFound(current => [...new Set([...current, ...state.match!.found])]);
      if (state.match?.status === 'FINISHED') await auth.refresh();
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Oyun durumu yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => { void fetchState(true); }, [fetchState]);
  useEffect(() => {
    const id = window.setInterval(() => { setNow(Date.now()); void fetchState(false); }, 1000);
    return () => window.clearInterval(id);
  }, [fetchState]);

  const me = useMemo(() => room?.players.find(player => player.userId === auth.user?.id) || null, [room, auth.user?.id]);
  const host = room?.hostUserId === auth.user?.id;
  const readyCount = room?.players.filter(player => player.ready).length || 0;
  const countdown = room?.countdownEndsAt ? Math.max(0, Math.ceil((room.countdownEndsAt - now) / 1000)) : 0;

  const changeSettings = async (changes: Record<string, unknown>) => {
    if (!host || busy) return;
    setBusy(true);
    try {
      const response = await api<{room: Room}>('/game/bil-bakalim/settings', {method: 'POST', body: JSON.stringify(changes)});
      setRoom(response.room);
    } catch (err) { setError(err instanceof Error ? err.message : 'Oda ayarları güncellenemedi.'); }
    finally { setBusy(false); }
  };

  const toggleReady = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const response = await api<{room: Room}>('/game/bil-bakalim/ready', {method: 'POST'});
      setRoom(response.room);
    } catch (err) { setError(err instanceof Error ? err.message : 'Hazır durumu güncellenemedi.'); }
    finally { setBusy(false); }
  };

  const sendChat = async (event: FormEvent) => {
    event.preventDefault();
    const content = chat.trim();
    if (!content || busy) return;
    setBusy(true);
    try {
      const response = await api<{room: Room}>('/game/bil-bakalim/chat', {method: 'POST', body: JSON.stringify({content})});
      setRoom(response.room);
      setChat('');
    } catch (err) { setError(err instanceof Error ? err.message : 'Mesaj gönderilemedi.'); }
    finally { setBusy(false); }
  };

  const invite = async () => {
    if (!host || busy) return;
    setBusy(true);
    try {
      await api('/game/bil-bakalim/invite', {method: 'POST'});
      setError('Davet genel lobiye gönderildi.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Davet gönderilemedi.'); }
    finally { setBusy(false); }
  };
  const inviteBots = async () => {if(!host||busy)return;setBusy(true);try{const response=await api<{room:Room;added:number}>('/game/bil-bakalim/invite-bots',{method:'POST'});setRoom(response.room);setError(response.added?`${response.added} bot odaya katıldı.`:'Boş koltuk bulunmuyor.');}catch(err){setError(err instanceof Error?err.message:'Botlar davet edilemedi.');}finally{setBusy(false);}};

  const copyCode = async () => {
    if (!room?.code) return;
    try { await navigator.clipboard.writeText(room.code); setError('Oda kodu kopyalandı.'); }
    catch { setError('Oda kodu kopyalanamadı.'); }
  };

  const leave = async () => {
    await api('/game/bil-bakalim/leave', {method: 'POST'}).catch(() => undefined);
    nav('/oyunlar');
  };

  const submitSelection = async () => {
    if (!selection || !match || match.activeUserId !== auth.user?.id || match.status !== 'PLAYING' || busy) return;
    const deltaX = Math.abs(selection.end[0] - selection.start[0]);
    const deltaY = Math.abs(selection.end[1] - selection.start[1]);
    const isStraightLine = deltaX === 0 || deltaY === 0 || deltaX === deltaY;
    const selectedLength = Math.max(deltaX, deltaY) + 1;
    if (!isStraightLine || selectedLength < 2) {
      setSelection(null);
      dragging.current = false;
      return;
    }
    setBusy(true);
    try {
      const response = await api<{match: Match; result: {ok?: boolean; error?: string; alreadyFound?: boolean}; user?: unknown}>('/game/bil-bakalim/select', {
        method: 'POST',
        body: JSON.stringify({start: selection.start, end: selection.end, requestId: createRequestId()}),
      });
      setMatch(response.match);
      setConfirmedFound(current => [...new Set([...current, ...response.match.found])]);
      if (response.result.alreadyFound) setError('Bu kelime daha önce bulundu.');
      else if (!response.result.ok) setError(response.result.error || 'Hatalı seçim — sıra geçiyor.');
      else setError('DOĞRU! DEVAM EDEBİLİRSİN');
      if (response.match.status === 'FINISHED') await auth.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : 'Seçim doğrulanamadı.'); }
    finally { setSelection(null); dragging.current = false; setBusy(false); }
  };

  const startCell = (x: number, y: number, event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!match || match.activeUserId !== auth.user?.id || match.status !== 'PLAYING') return;
    event.preventDefault();
    dragging.current = true;
    setSelection({start: [x, y], end: [x, y]});
  };
  const enterCell = (x: number, y: number) => {
    if (!dragging.current) return;
    setSelection(current => current ? {...current, end: [x, y]} : current);
  };

  if (loading) return <div className="bb-shell"><div className="bb-centered-status">Bil Bakalım yükleniyor...</div></div>;
  if (!room) return <div className="bb-shell"><div className="bb-centered-status">Oda oluşturulamadı.{error && <small>{error}</small>}</div></div>;

  if (match?.status === 'PLAYING') {
    const active = match.players.find(player => player.userId === match.activeUserId);
    const remaining = Math.max(0, Math.ceil((match.turnEndsAt - now) / 1000));
    const gridSize = match.grid.length;
    const selectedCells = new Set<string>();
    if (selection) {
      const dx = Math.sign(selection.end[0] - selection.start[0]);
      const dy = Math.sign(selection.end[1] - selection.start[1]);
      const ax = Math.abs(selection.end[0] - selection.start[0]);
      const ay = Math.abs(selection.end[1] - selection.start[1]);
      if (ax === 0 || ay === 0 || ax === ay) {
        const count = Math.max(ax, ay) + 1;
        for (let index = 0; index < count; index += 1) selectedCells.add(`${selection.start[0] + dx * index}-${selection.start[1] + dy * index}`);
      }
    }
    return <div className="bb-shell bb-game-screen">
      <header className="bb-game-header">
        <div className="bb-brand-side"><button className="bb-back" onClick={() => void leave()} aria-label="Oyundan çık">←</button><img src="/assets/bilio-logo.png" alt="Bilio"/></div>
        <div className="bb-game-title"><span>💡</span><h1>BİL BAKALIM</h1><strong>00:{String(remaining).padStart(2, '0')}</strong></div>
        <aside className="bb-game-instruction"><span>💡</span><p>Bir harften başlayıp sürükle. Düz, dikey veya çapraz çizgi oluştur.</p></aside>
      </header>
      <main className="bb-game-stage">
        <section className="bb-wordbar-real"><h2>ARANAN KELİMELER {new Set([...match.found, ...confirmedFound]).size}/20</h2><div>{match.words.map(word => {const found = match.found.includes(word) || confirmedFound.includes(word); return <span key={word} className={found ? 'found' : ''}>{word}{found ? ' ✓' : ''}</span>})}</div></section>
        <div className="bb-board-real" style={{gridTemplateColumns: `repeat(${gridSize}, 1fr)`}} onPointerUp={() => void submitSelection()} onPointerCancel={() => {dragging.current = false; setSelection(null);}}>
          {match.grid.flatMap((row, y) => row.map((letter, x) => <button
            key={`${x}-${y}`}
            className={selectedCells.has(`${x}-${y}`) ? 'selected' : ''}
            onPointerDown={event => startCell(x, y, event)}
            onPointerEnter={() => enterCell(x, y)}
            disabled={match.activeUserId !== auth.user?.id || busy}
            aria-label={`${x + 1}. sütun ${y + 1}. satır ${letter}`}
          >{letter}</button>))}
        </div>
        <div className="bb-player-ring">{match.players.map(player => {const visualSeat = match.players.length === 4 ? [0, 2, 4, 6][player.seat] : player.seat; return <article key={player.userId} className={`bb-ring-player bb-seat-${visualSeat}${player.userId === match.activeUserId ? ' active' : ''}`}>
          <Avatar player={player}/><b>{player.username}</b><TitleArt id={player.titleId}/><small>{player.userId === match.activeUserId ? 'SIRA SENDE' : `${resultNumber(player.score)} PUAN`}</small>
        </article>})}</div>
        <RoomChat room={room} chat={chat} busy={busy} onChatChange={setChat} onSubmit={sendChat} compact/>
        <div className="bb-active-player" aria-live="polite">{active ? `Sıradaki: ${active.username}` : ''}</div>
        {error && <div className="bb-toast" role="status">{error}</div>}
      </main>
    </div>;
  }

  if (match?.status === 'FINISHED' && match.results) {
    const results = match.results;
    const top = [results[1], results[0], results[2]].filter(Boolean);
    const mine = results.find(player => player.userId === auth.user?.id);
    return <div className="bb-shell bb-results-screen">
      <header className="bb-results-title"><img src="/assets/bilio-logo.png" alt="Bilio"/><div><h1>💡 OYUN TAMAMLANDI</h1><h2>BİL BAKALIM — SONUÇLAR</h2></div></header>
      <section className="bb-results-podium">{top.map(player => <article key={player.userId} className={`place-${player.rank}`}><span>{player.rank}.</span><Avatar player={player} large/><b>{player.username}</b><strong>{resultNumber(player.score)} PUAN</strong><small>{player.diamonds} ELMAS · +{player.xp} XP</small></article>)}</section>
      <section className="bb-results-table"><header><span>SIRA</span><span>OYUNCU</span><span>PUAN</span><span>ELMAS</span><span>KAZANILAN XP</span></header>{results.slice(3).map(player => <div key={player.userId}><span>{player.rank}</span><span>{player.username}</span><span>{resultNumber(player.score)}</span><span>{player.diamonds}</span><span>+{player.xp} XP</span></div>)}</section>
      <footer className="bb-results-footer"><div><b>MAÇ ÖZETİ</b><span>Bulunan kelime: {match.found.length}/20</span>{mine && <span>Doğru: {mine.correct || 0} · Hatalı: {mine.wrong || 0} · Süre dolması: {mine.timeouts || 0}</span>}</div><button onClick={() => nav('/oyunlar')}>ANA MENÜ</button><button className="gold" onClick={async () => {await api('/game/bil-bakalim/leave', {method: 'POST'}); await api('/game/bil-bakalim/create', {method: 'POST'}); setMatch(null); await fetchState(false);}}>TEKRAR OYNA</button></footer>
    </div>;
  }

  const slots = Array.from({length: room.capacity}, (_, seat) => room.players.find(player => player.seat === seat) || null);
  return <div className="bb-shell bb-lobby-screen">
    <header className="bb-lobby-header">
      <div className="bb-brand-side"><button className="bb-back" onClick={() => void leave()} aria-label="Oyunlara dön">←</button><img src="/assets/bilio-logo.png" alt="Bilio"/></div>
      <div className="bb-lobby-heading"><h1>💡 BİL BAKALIM</h1><div><span>ODA KODU: <b>{room.code}</b></span><button onClick={() => void copyCode()} aria-label="Oda kodunu kopyala">KOPYALA</button><button onClick={() => void invite()} disabled={!host || busy}>OYUNCU DAVET ET</button><button onClick={() => void inviteBots()} disabled={!host || busy || room.players.length>=room.capacity}>BOT DAVET ET</button></div></div>
      <div aria-hidden="true"/>
    </header>
    <main className="bb-lobby-main-real">
      <section className="bb-room-players-panel"><h2>OYUNCULAR <b>{room.players.length}/{room.capacity}</b></h2><div className={`bb-room-grid capacity-${room.capacity}`}>{slots.map((player, seat) => player ? <article key={player.userId} className="bb-room-player-card"><Avatar player={player} large/><b>{player.username}</b><TitleArt id={player.titleId}/><small className={room.hostUserId === player.userId ? 'host' : player.ready ? 'ready' : ''}>{room.hostUserId === player.userId ? 'KURUCU' : player.ready ? 'HAZIR' : 'BEKLİYOR'}</small></article> : <article key={`empty-${seat}`} className="bb-room-player-card empty"><div className="bb-empty-avatar">+</div><span>Oyuncu bekleniyor</span></article>)}</div></section>
      <aside className="bb-room-side">
        <section className="bb-settings-panel"><h2>ODA AYARLARI</h2><div className="bb-setting-row"><b>OYUNCU SAYISI</b><span>{[4, 8].map(value => <button key={value} disabled={!host || busy || value < room.players.length} className={room.capacity === value ? 'selected' : ''} onClick={() => void changeSettings({capacity: value})}>{value} KİŞİ</button>)}</span></div><div className="bb-setting-row categories"><b>KELİME KATEGORİSİ</b><span>{categories.map(value => <button key={value} disabled={!host || busy} className={room.category === value ? 'selected' : ''} onClick={() => void changeSettings({category: value})}>{value}</button>)}</span></div><div className="bb-setting-row"><b>TUR SÜRESİ</b><span>{durations.map(value => <button key={value} disabled={!host || busy} className={room.turnSeconds === value ? 'selected' : ''} onClick={() => void changeSettings({turnSeconds: value})}>{value} SN</button>)}</span></div><div className="bb-setting-row readonly"><b>KELİME SAYISI</b><strong>20 KELİME</strong></div></section>
        <RoomChat room={room} chat={chat} busy={busy} onChatChange={setChat} onSubmit={sendChat}/>
      </aside>
    </main>
    <footer className="bb-lobby-footer"><div/><div><strong>{room.players.length}/{room.capacity} OYUNCU ODADA</strong><span>{countdown > 0 ? `OYUN ${countdown} SANİYE SONRA BAŞLIYOR` : room.players.length < room.capacity ? 'OYUNUN BAŞLAMASI İÇİN OYUNCULAR BEKLENİYOR' : `${readyCount}/${room.capacity} OYUNCU HAZIR`}</span></div><button className="gold" onClick={() => void toggleReady()} disabled={busy}>{me?.ready ? 'HAZIRLIĞI İPTAL ET' : 'HAZIR'}</button></footer>
    {error && <div className="bb-toast" role="status">{error}</div>}
  </div>;
}
