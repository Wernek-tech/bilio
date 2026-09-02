// ponytail: Phase 4 — Bolt shipped BilBakalimLobby/Game/Results as three Supabase-backed files;
// bilio's real backend has no separate "match started" push event and no manual start/claim step
// (host readies up -> auto countdown -> auto match start; rewards auto-apply on finish), so this
// merges the three into one poller-driven component instead of forcing Bolt's three-page state
// machine onto a backend that doesn't have the events to drive it.
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Bot as BotIcon, Check, Copy, Crown, Send, Settings as SettingsIcon, UserPlus, Users } from 'lucide-react';
import { api, avatarColorFor, titleNameFor } from '@/lib/bilioApi';
import { frameNameFor } from '@/lib/frames';
import { Avatar } from '@/components/Avatar';
import { formatNumber } from '@/lib/constants';
import type { Profile } from '@/lib/types';

type RoomPlayer = { userId: string; username: string; avatarUrl: string; titleId: string; frameId: string | null; ready: boolean; connected: boolean; seat: number; bot?: boolean };
type BilRoom = { id: string; code: string; hostUserId: string; status: 'LOBBY' | 'PLAYING' | 'ENDED'; capacity: number; category: string; turnSeconds: number; wordCount: number; countdownEndsAt: number | null; matchId: string | null; players: RoomPlayer[]; messages: { id: string; userId: string; username: string; avatarUrl: string; content: string; createdAt: string }[] };
type MatchPlayer = { userId: string; username: string; avatarUrl: string; titleId: string; seat: number; score: number; correct: number; wrong: number };
type BilMatch = { id: string; status: 'PLAYING' | 'FINISHED'; grid: string[][]; words: (string | { word: string })[]; found: string[]; players: MatchPlayer[]; activeUserId: string; turnEndsAt: number; turnSeconds: number; results: (MatchPlayer & { rank: number; xp?: number; gold?: number; diamonds?: number })[] | null };
type Cell = [number, number];

const CATEGORIES = ['KARIŞIK', 'HAYVANLAR', 'SANATÇILAR', 'NESNELER', 'ŞARKI İSİMLERİ', 'YEMEKLER'];
const wordText = (w: string | { word: string }) => (typeof w === 'string' ? w : w.word);
const toAvatarProfile = (p: { username: string; avatarUrl?: string; titleId?: string; frameId?: string | null }): Profile => ({
  id: '', username: p.username, about: '', avatar_url: p.avatarUrl || null, avatar_color: avatarColorFor(p.username),
  level: 1, xp: 0, gold: 0, diamonds: 0, likes: 0, title: p.titleId ? titleNameFor(p.titleId) : '', frame: frameNameFor(p.frameId),
  total_matches: 0, total_wins: 0, total_correct: 0, total_score: 0, weekly_score: 0, reward_claimed: false, created_at: '',
});

export function BilBakalim({ myUserId, showToast, onLeave, onProfileUpdate }: {
  myUserId: string; showToast: (m: string) => void; onLeave: () => void; onProfileUpdate: () => void;
}) {
  const [room, setRoom] = useState<BilRoom | null>(null);
  const [match, setMatch] = useState<BilMatch | null>(null);
  const [chat, setChat] = useState('');
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selStart, setSelStart] = useState<Cell | null>(null);
  const [selEnd, setSelEnd] = useState<Cell | null>(null);
  const [clock, setClock] = useState(Date.now());
  const chatRef = useRef<HTMLDivElement>(null);
  const rewardNoted = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await api<{ room: BilRoom | null; match: BilMatch | null }>('/game/bil-bakalim/active');
      if (!res.room) { onLeave(); return; }
      setRoom(res.room); setMatch(res.match);
    } catch { /* transient poll miss, keep last known state */ }
  }, [onLeave]);

  useEffect(() => { void load(); const t = setInterval(load, 1500); const c = setInterval(() => setClock(Date.now()), 250); return () => { clearInterval(t); clearInterval(c); }; }, [load]);
  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [room?.messages]);
  useEffect(() => { if (match?.status === 'FINISHED' && !rewardNoted.current) { rewardNoted.current = true; onProfileUpdate(); } }, [match?.status, onProfileUpdate]);

  const isHost = room?.hostUserId === myUserId;
  const me = room?.players.find((p) => p.userId === myUserId);

  const copyCode = async () => { if (!room) return; try { await navigator.clipboard.writeText(room.code); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked */ } };
  const call = async (path: string, body?: unknown) => { try { await api(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }); void load(); } catch (reason) { showToast(reason instanceof Error ? reason.message : 'İşlem başarısız.'); } };
  const toggleReady = () => void call('/game/bil-bakalim/ready');
  const inviteBot = () => void call('/game/bil-bakalim/invite-bots');
  const invitePlayer = () => void call('/game/bil-bakalim/invite').then(() => showToast('Lobiye davet gönderildi!'));
  const updateSetting = (patch: Partial<Pick<BilRoom, 'capacity' | 'category' | 'turnSeconds' | 'wordCount'>>) => void call('/game/bil-bakalim/settings', patch);
  const leaveRoom = () => void call('/game/bil-bakalim/leave').then(onLeave);

  async function sendChat(event: FormEvent) {
    event.preventDefault();
    const body = chat.trim();
    if (!body) return;
    setChat('');
    try { await api('/game/bil-bakalim/chat', { method: 'POST', body: JSON.stringify({ content: body }) }); void load(); }
    catch (reason) { setChat(body); showToast(reason instanceof Error ? reason.message : 'Mesaj gönderilemedi.'); }
  }

  function getCell(e: React.PointerEvent): Cell | null {
    const el = e.target as HTMLElement;
    const r = el.getAttribute('data-row'), c = el.getAttribute('data-col');
    return r === null || c === null ? null : [Number(r), Number(c)];
  }
  const isStraight = (r1: number, c1: number, r2: number, c2: number) => r1 === r2 || c1 === c2 || Math.abs(r2 - r1) === Math.abs(c2 - c1);
  function isInSelection(r: number, c: number): boolean {
    if (!selecting || !selStart || !selEnd) return false;
    const dr = selEnd[0] - selStart[0], dc = selEnd[1] - selStart[1];
    const len = Math.max(Math.abs(dr), Math.abs(dc)) + 1;
    const stepR = Math.sign(dr), stepC = Math.sign(dc);
    for (let i = 0; i < len; i++) if (selStart[0] + stepR * i === r && selStart[1] + stepC * i === c) return true;
    return false;
  }
  function onPointerDown(e: React.PointerEvent) {
    if (!match || match.activeUserId !== myUserId) return;
    const cell = getCell(e); if (!cell) return;
    e.preventDefault(); setSelecting(true); setSelStart(cell); setSelEnd(cell);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!selecting || !selStart) return;
    const cell = getCell(e); if (!cell) return;
    if (isStraight(selStart[0], selStart[1], cell[0], cell[1])) setSelEnd(cell);
  }
  async function onPointerUp() {
    if (!selecting || !selStart || !selEnd) { setSelecting(false); return; }
    setSelecting(false);
    const [start, end] = [selStart, selEnd];
    setSelStart(null); setSelEnd(null);
    if (start[0] === end[0] && start[1] === end[1]) return;
    try { await api('/game/bil-bakalim/select', { method: 'POST', body: JSON.stringify({ start, end, requestId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` }) }); void load(); }
    catch (reason) { showToast(reason instanceof Error ? reason.message : 'Seçim gönderilemedi.'); }
  }

  if (!room) return <div className="game-lobby"><div style={{ display: 'grid', placeItems: 'center', minHeight: '50vh', color: '#ffd4ae' }}>Oda yükleniyor...</div></div>;

  const header = (title: string) => (
    <div className="lobby-header">
      <button className="back-btn" onClick={onLeave}><ArrowLeft size={18} /> Geri</button>
      <img src="/bilio_logo.png" alt="Bilio" className="lobby-logo" />
      <h2 className="lobby-title">{title}</h2>
    </div>
  );
  const themeStyle = { '--c-primary': '#ffb86b', '--c-glow': '#ff9f4f', '--c-bg': '#382016', '--c-border': '#754133', '--c-text': '#ffd4ae' } as React.CSSProperties;

  // --- Results ---
  if (match?.status === 'FINISHED' && match.results) {
    const ranked = match.results;
    const top3 = ranked.slice(0, 3);
    const rest = ranked.slice(3);
    const podium = [top3[1], top3[0], top3[2]].filter(Boolean);
    const mine = ranked.find((p) => p.userId === myUserId);
    return (
      <div className="game-lobby bb-results" style={themeStyle}>
        {header('BİL BAKALIM SONUÇLARI')}
        <div className="bb-results-body">
          <section className="podium">
            {podium.map((entry) => {
              const rank = entry === top3[0] ? 1 : entry === top3[1] ? 2 : 3;
              return (
                <div key={entry.userId} className={`podium-card ${rank === 1 ? 'first' : rank === 2 ? 'second' : 'third'}`}>
                  {rank === 1 && <Crown size={24} className="crown" />}
                  <div className="podium-rank">{rank}</div>
                  <Avatar profile={toAvatarProfile(entry)} size={rank === 1 ? 72 : 56} showFrame />
                  <strong>{entry.username}</strong>
                  <div className="podium-score">{formatNumber(entry.score)}</div>
                  <small>{entry.correct} doğru · {entry.wrong} hata</small>
                </div>
              );
            })}
          </section>
          {rest.length > 0 && (
            <section className="leaderboard-list">
              {rest.map((entry, i) => (
                <div className="lb-row" key={entry.userId}>
                  <span className="lb-rank">{i + 4}</span>
                  <Avatar profile={toAvatarProfile(entry)} size={36} />
                  <div className="lb-info"><strong>{entry.username}</strong></div>
                  <span className="lb-score">{formatNumber(entry.score)}</span>
                </div>
              ))}
            </section>
          )}
          {mine && (
            <div className="bb-my-stats">
              <h4>Senin performansın</h4>
              <div className="profile-stats">
                <div><small>PUAN</small><strong>{formatNumber(mine.score)}</strong></div>
                <div><small>DOĞRU</small><strong>{mine.correct}</strong></div>
                <div><small>HATA</small><strong>{mine.wrong}</strong></div>
              </div>
              <p className="muted" style={{ marginTop: 10 }}>Ödüller otomatik hesabına eklendi.</p>
            </div>
          )}
          <div className="bb-results-actions">
            <button className="soft-button" onClick={onLeave}><ArrowLeft size={16} /> Oyunlara Dön</button>
          </div>
        </div>
      </div>
    );
  }

  // --- Game ---
  if (match?.status === 'PLAYING') {
    const active = match.players.find((p) => p.userId === match.activeUserId);
    const isMyTurn = match.activeUserId === myUserId;
    const secondsLeft = Math.max(0, Math.ceil((match.turnEndsAt - clock) / 1000));
    return (
      <div className="game-lobby bb-game" style={themeStyle}>
        <div className="lobby-header">
          <button className="back-btn" onClick={onLeave}><ArrowLeft size={18} /> Geri</button>
          <img src="/bilio_logo.png" alt="Bilio" className="lobby-logo" />
          <h2 className="lobby-title">BİL BAKALIM</h2>
          <div className="bb-header-info">
            <span className="bb-active-player">Sıra: <b>{active?.username ?? '—'}</b></span>
            <div className="timer-circle">{secondsLeft}<small>sn</small></div>
          </div>
        </div>
        <div className="bb-instruction">Bir harften başlayıp sürükle. Yatay, dikey veya çapraz çizgi oluştur.</div>
        <div className="bb-game-layout">
          <div className="bb-players-area">
            {match.players.map((p) => (
              <div key={p.userId} className={`bb-player-slot ${p.userId === match.activeUserId ? 'active' : ''}`}>
                <Avatar profile={toAvatarProfile(p)} size={42} showFrame />
                <div className="bb-player-info">
                  <div className="bb-player-name"><strong>{p.username}</strong>{room.hostUserId === p.userId && <Crown size={12} className="owner-icon" />}</div>
                  <div className="bb-player-score">{p.score} p</div>
                </div>
              </div>
            ))}
            <div className="bb-board-area">
              <div className={`bb-board ${isMyTurn ? 'my-turn' : 'locked'}`} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={() => void onPointerUp()} onPointerLeave={() => void onPointerUp()}>
                {match.grid.map((row, r) => (
                  <div className="bb-row" key={r}>
                    {row.map((letter, c) => (
                      <div key={c} className={`bb-cell ${isInSelection(r, c) ? 'selected' : ''}`} data-row={r} data-col={c}>{letter}</div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="bb-word-list">
            <h3>Kelimeler ({match.found.length}/{match.words.length})</h3>
            <div className="bb-words">
              {match.words.map((w, i) => {
                const word = wordText(w); const found = match.found.includes(word);
                return <div key={i} className={`bb-word-item ${found ? 'found' : ''}`}>{found && <Check size={12} />}<span className={found ? 'strikethrough' : ''}>{word}</span></div>;
              })}
            </div>
          </div>
        </div>
        <div className="bb-game-chat">
          <div className="chat-messages" ref={chatRef}>
            {room.messages.length === 0 ? <p className="chat-empty">Henüz mesaj yok.</p> : room.messages.map((m) => (
              <div className="chat-message" key={m.id}><Avatar profile={toAvatarProfile(m)} size={24} /><div><strong>{m.username}</strong><p>{m.content}</p></div></div>
            ))}
          </div>
          <form className="chat-form" onSubmit={sendChat}>
            <input value={chat} onChange={(e) => setChat(e.target.value)} placeholder="Oyun sohbetine yaz..." maxLength={400} />
            <button className="send-donut" aria-label="Gönder"><Send size={17} /></button>
          </form>
        </div>
      </div>
    );
  }

  // --- Lobby ---
  const secondsToStart = room.countdownEndsAt ? Math.max(0, Math.ceil((room.countdownEndsAt - clock) / 1000)) : null;
  return (
    <div className="game-lobby" style={themeStyle}>
      <div className="lobby-header">
        <button className="back-btn" onClick={leaveRoom}><ArrowLeft size={18} /> Geri</button>
        <img src="/bilio_logo.png" alt="Bilio" className="lobby-logo" />
        <h2 className="lobby-title">BİL BAKALIM</h2>
        <button className="code-btn" onClick={() => void copyCode()}>{copied ? <Check size={16} /> : <Copy size={16} />} {room.code}</button>
      </div>
      <div className="lobby-body">
        <div className="lobby-players">
          <div className="players-header">
            <h3>Oyuncular ({room.players.length}/{room.capacity})</h3>
            {isHost && <button className="lobby-btn" style={{ padding: '6px 12px', fontSize: 11 }} onClick={() => setShowSettings((v) => !v)}><SettingsIcon size={14} /> Ayarlar</button>}
          </div>
          {showSettings && isHost ? (
            <div className="bb-settings-panel">
              <label>Kapasite<select value={room.capacity} onChange={(e) => updateSetting({ capacity: Number(e.target.value) })}><option value={4}>4 oyuncu</option><option value={8}>8 oyuncu</option></select></label>
              <label>Kategori<select value={room.category} onChange={(e) => updateSetting({ category: e.target.value })}>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></label>
              <label>Tur Süresi<select value={room.turnSeconds} onChange={(e) => updateSetting({ turnSeconds: Number(e.target.value) })}>{[30, 45, 60, 90].map((t) => <option key={t} value={t}>{t} sn</option>)}</select></label>
            </div>
          ) : (
            <div className="bb-settings-info"><span>Kategori: <b>{room.category}</b></span><span>Tur: <b>{room.turnSeconds}sn</b></span></div>
          )}
          {secondsToStart !== null && <div className="bb-countdown-overlay" style={{ position: 'static', margin: '8px 0' }}><div className="bb-countdown" style={{ fontSize: 22 }}>Oyun {secondsToStart}sn içinde başlıyor...</div></div>}
          <div className="player-slots">
            {Array.from({ length: room.capacity }).map((_, i) => {
              const p = room.players[i];
              if (!p) return <div className="empty-slot" key={i}><Users size={20} /><span>Oyuncu bekleniyor</span><small>Boş Koltuk</small></div>;
              return (
                <div className="player-card" key={p.userId}>
                  <Avatar profile={toAvatarProfile(p)} size={48} showFrame showBotTag={p.bot} />
                  <div className="player-card-info">
                    <div className="player-name-row"><strong>{p.username}</strong>{room.hostUserId === p.userId && !p.bot && <Crown size={14} className="owner-icon" />}</div>
                    <span className={`ready-status ${p.ready ? 'ready' : 'waiting'}`}>{p.bot ? 'Bot' : p.ready ? 'Hazır' : 'Bekliyor'}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="lobby-actions">
            {isHost && <button className="lobby-btn invite" onClick={invitePlayer}><UserPlus size={16} /> Oyuncu Davet Et</button>}
            {isHost && room.players.length < room.capacity && <button className="lobby-btn invite" onClick={inviteBot}><BotIcon size={16} /> Bot Davet Et</button>}
            <button className="lobby-btn ready" onClick={toggleReady}>{me?.ready ? 'Bekliyor' : 'Hazır'}</button>
            <button className="lobby-btn leave" onClick={leaveRoom}>Odadan Ayrıl</button>
          </div>
        </div>
        <div className="lobby-chat">
          <div className="chat-header"><h3>Oda Sohbeti</h3></div>
          <div className="chat-messages" ref={chatRef}>
            {room.messages.length === 0 ? <p className="chat-empty">Henüz mesaj yok.</p> : room.messages.map((m) => (
              <div className="chat-message" key={m.id}><Avatar profile={toAvatarProfile(m)} size={28} /><div><strong>{m.username}</strong><p>{m.content}</p></div></div>
            ))}
          </div>
          <form className="chat-form" onSubmit={sendChat}>
            <input value={chat} onChange={(e) => setChat(e.target.value)} placeholder="Oda sohbetine yaz..." maxLength={400} />
            <button className="send-donut" aria-label="Gönder"><Send size={17} /></button>
          </form>
        </div>
      </div>
    </div>
  );
}
