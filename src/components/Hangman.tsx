// ponytail: Phase 5 — Bolt's HangmanPage was single-player local state (one word from a Supabase
// table, no rooms). bilio's real Adam Asmaca is a turn-based multi-round ROOM game (host starts,
// players take turns guessing a letter, score across N rounds, auto-settled rewards on finish) —
// same lobby shape as Bil Bakalım, minus ready-toggle/player-invite (bilio doesn't expose those for
// this game) and plus turn-taking. Keeps Bolt's hangman drawing + keyboard, wires the game state real.
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Bot as BotIcon, Check, Copy, Crown, Gem, Play, Send, Settings as SettingsIcon, Users, X } from 'lucide-react';
import { api, avatarColorFor, titleNameFor } from '@/lib/bilioApi';
import { frameNameFor } from '@/lib/frames';
import { Avatar } from '@/components/Avatar';
import { TURKISH_ALPHABET, formatNumber } from '@/lib/constants';
import type { Profile } from '@/lib/types';

type Player = { userId: string; username: string; avatarUrl: string; titleId: string; frameId: string | null; level: number; bot: boolean; score: number };
type Game = { roundIndex: number; roundCount: number; clue: string; maskedWord: string; guessed: string[]; wrong: string[]; purchasedBy: string[]; wrongCount: number; maxWrong: number; activeUserId: string; turnEndsAt: number; finished: boolean; answer?: string };
type Room = { id: string; code: string; hostUserId: string; status: 'LOBBY' | 'PLAYING' | 'ENDED'; capacity: number; category: string; roundCount: number; turnSeconds: number; players: Player[]; messages: { id: string; userId: string; username: string; avatarUrl: string; content: string }[]; game: Game | null };

const CATEGORIES = ['KARIŞIK', 'HAYVANLAR', 'ŞEHİRLER', 'YİYECEKLER'];
const toAvatarProfile = (p: { username: string; avatarUrl?: string; titleId?: string; frameId?: string | null }): Profile => ({
  id: '', username: p.username, about: '', avatar_url: p.avatarUrl || null, avatar_color: avatarColorFor(p.username),
  level: 1, xp: 0, gold: 0, diamonds: 0, likes: 0, title: p.titleId ? titleNameFor(p.titleId) : '', frame: frameNameFor(p.frameId),
  total_matches: 0, total_wins: 0, total_correct: 0, total_score: 0, weekly_score: 0, reward_claimed: false, created_at: '',
});

export function Hangman({ myUserId, showToast, onLeave, onProfileUpdate }: {
  myUserId: string; showToast: (m: string) => void; onLeave: () => void; onProfileUpdate: () => void;
}) {
  const [room, setRoom] = useState<Room | null>(null);
  const [chat, setChat] = useState('');
  const [wordGuess, setWordGuess] = useState('');
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [clock, setClock] = useState(Date.now());
  const chatRef = useRef<HTMLDivElement>(null);
  const rewardNoted = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await api<{ room: Room | null }>('/game/hangman/active');
      if (!res.room) { onLeave(); return; }
      setRoom(res.room);
    } catch { /* transient poll miss */ }
  }, [onLeave]);

  useEffect(() => { void load(); const t = setInterval(load, 1200); const c = setInterval(() => setClock(Date.now()), 250); return () => { clearInterval(t); clearInterval(c); }; }, [load]);
  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [room?.messages]);
  useEffect(() => { if (room?.status === 'ENDED' && !rewardNoted.current) { rewardNoted.current = true; onProfileUpdate(); } }, [room?.status, onProfileUpdate]);

  const isHost = room?.hostUserId === myUserId;
  const call = async (path: string, body?: unknown) => { try { await api(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }); void load(); } catch (reason) { showToast(reason instanceof Error ? reason.message : 'İşlem başarısız.'); } };
  const copyCode = async () => { if (!room) return; try { await navigator.clipboard.writeText(room.code); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked */ } };
  const inviteBot = () => void call('/game/hangman/invite-bots');
  const updateSetting = (patch: Partial<Pick<Room, 'category' | 'roundCount' | 'turnSeconds'>>) => void call('/game/hangman/settings', patch);
  const startGame = () => void call('/game/hangman/start');
  const leaveRoom = () => void call('/game/hangman/leave').then(onLeave);
  const guessLetter = (letter: string) => void call('/game/hangman/guess', { letter });
  const buyLetter = () => void call('/game/hangman/buy-letter');

  async function guessWord(event: FormEvent) {
    event.preventDefault();
    const w = wordGuess.trim();
    if (!w) return;
    setWordGuess('');
    await call('/game/hangman/guess-word', { word: w });
  }
  async function sendChat(event: FormEvent) {
    event.preventDefault();
    const body = chat.trim();
    if (!body) return;
    setChat('');
    try { await api('/game/hangman/chat', { method: 'POST', body: JSON.stringify({ content: body }) }); void load(); }
    catch (reason) { setChat(body); showToast(reason instanceof Error ? reason.message : 'Mesaj gönderilemedi.'); }
  }

  if (!room) return <div className="hangman-game"><div style={{ display: 'grid', placeItems: 'center', minHeight: '50vh', color: '#9bf59b' }}>Oda yükleniyor...</div></div>;
  const themeStyle = { '--c-primary': '#9bf59b', '--c-glow': '#317854', '--c-bg': '#172b22', '--c-border': '#2a5a44', '--c-text': '#9bf59b' } as React.CSSProperties;
  const header = (title: string, extra?: React.ReactNode) => (
    <div className="lobby-header">
      <button className="back-btn" onClick={onLeave}><ArrowLeft size={18} /> Geri</button>
      <img src="/bilio_logo.png" alt="Bilio" className="lobby-logo" />
      <h2 className="lobby-title">{title}</h2>
      {extra}
    </div>
  );

  // --- Results ---
  if (room.status === 'ENDED' && room.game) {
    const ranked = [...room.players].sort((a, b) => b.score - a.score);
    const mine = ranked.find((p) => p.userId === myUserId);
    return (
      <div className="hangman-game bb-results" style={themeStyle}>
        {header('ADAM ASMACA SONUÇLARI')}
        <div className="bb-results-body">
          <p className="hint-box"><strong>Son kelime:</strong> {room.game.answer}</p>
          <section className="leaderboard-list">
            {ranked.map((p, i) => (
              <div className="lb-row" key={p.userId}>
                <span className="lb-rank">{i + 1}</span>
                {i === 0 && <Crown size={16} className="owner-icon" />}
                <Avatar profile={toAvatarProfile(p)} size={36} showFrame />
                <div className="lb-info"><strong>{p.username}</strong></div>
                <span className="lb-score">{formatNumber(p.score)}</span>
              </div>
            ))}
          </section>
          {mine && <p className="muted" style={{ marginTop: 10 }}>Ödüller otomatik hesabına eklendi.</p>}
          <div className="bb-results-actions">
            <button className="soft-button" onClick={onLeave}><ArrowLeft size={16} /> Oyunlara Dön</button>
          </div>
        </div>
      </div>
    );
  }

  // --- Playing ---
  if (room.status === 'PLAYING' && room.game) {
    const g = room.game;
    const active = room.players.find((p) => p.userId === g.activeUserId);
    const isMyTurn = g.activeUserId === myUserId;
    const secondsLeft = Math.max(0, Math.ceil((g.turnEndsAt - clock) / 1000));
    const wrongLetters = g.wrong.filter((w) => !w.startsWith('TAHMİN:'));
    const iBought = g.purchasedBy.includes(myUserId);
    return (
      <div className="hangman-game" style={themeStyle}>
        {header('ADAM ASMACA', <div className="bb-header-info"><span className="bb-active-player">Sıra: <b>{active?.username ?? '—'}</b> · Tur {g.roundIndex + 1}/{g.roundCount}</span><div className="timer-circle">{secondsLeft}<small>sn</small></div></div>)}
        <div className="hangman-body">
          <div className="hangman-main">
            <div className="hangman-drawing">
              <svg viewBox="0 0 200 250" className="hangman-svg">
                <line x1="20" y1="240" x2="180" y2="240" stroke="var(--c-primary)" strokeWidth="4" />
                <line x1="50" y1="240" x2="50" y2="20" stroke="var(--c-primary)" strokeWidth="4" />
                <line x1="50" y1="20" x2="130" y2="20" stroke="var(--c-primary)" strokeWidth="4" />
                <line x1="130" y1="20" x2="130" y2="45" stroke="var(--c-primary)" strokeWidth="4" />
                {g.wrongCount >= 1 && <circle cx="130" cy="60" r="15" stroke="var(--c-primary)" strokeWidth="3" fill="none" />}
                {g.wrongCount >= 2 && <line x1="130" y1="75" x2="130" y2="130" stroke="var(--c-primary)" strokeWidth="3" />}
                {g.wrongCount >= 3 && <line x1="130" y1="90" x2="105" y2="115" stroke="var(--c-primary)" strokeWidth="3" />}
                {g.wrongCount >= 4 && <line x1="130" y1="90" x2="155" y2="115" stroke="var(--c-primary)" strokeWidth="3" />}
                {g.wrongCount >= 5 && <line x1="130" y1="130" x2="110" y2="170" stroke="var(--c-primary)" strokeWidth="3" />}
                {g.wrongCount >= 6 && <line x1="130" y1="130" x2="150" y2="170" stroke="var(--c-primary)" strokeWidth="3" />}
              </svg>
            </div>
            <div className="hangman-info">
              <div className="hint-box"><strong>İpucu:</strong> {g.clue}</div>
              <div className="word-display">{g.maskedWord}</div>
              <div className="wrong-count">Hata: {g.wrongCount}/{g.maxWrong}</div>
              <form onSubmit={(e) => void guessWord(e)} style={{ display: 'flex', gap: 8 }}>
                <input value={wordGuess} onChange={(e) => setWordGuess(e.target.value)} placeholder="Kelimeyi tahmin et..." disabled={!isMyTurn} />
                <button className="soft-button" disabled={!isMyTurn}>Tahmin Et</button>
              </form>
              <button className="buy-letter-btn" onClick={buyLetter} disabled={!isMyTurn || iBought}><Gem size={16} /> Harf Al (100 Altın)</button>
            </div>
          </div>
          <div className="hangman-keyboard">
            {TURKISH_ALPHABET.map((letter) => {
              const used = g.guessed.includes(letter) || wrongLetters.includes(letter);
              const isCorrect = g.guessed.includes(letter);
              const isWrong = wrongLetters.includes(letter);
              return (
                <button key={letter} className={`key ${isCorrect ? 'correct' : ''} ${isWrong ? 'wrong' : ''}`} disabled={!isMyTurn || used} onClick={() => guessLetter(letter)}>{letter}</button>
              );
            })}
          </div>
        </div>
        <div className="bb-game-chat">
          <div className="chat-messages" ref={chatRef}>
            {room.messages.length === 0 ? <p className="chat-empty">Henüz mesaj yok.</p> : room.messages.map((m) => (
              <div className="chat-message" key={m.id}><Avatar profile={toAvatarProfile(m)} size={24} /><div><strong>{m.username}</strong><p>{m.content}</p></div></div>
            ))}
          </div>
          <form className="chat-form" onSubmit={sendChat}>
            <input value={chat} onChange={(e) => setChat(e.target.value)} placeholder="Sohbete yaz..." maxLength={400} />
            <button className="send-donut" aria-label="Gönder"><Send size={17} /></button>
          </form>
        </div>
      </div>
    );
  }

  // --- Lobby ---
  return (
    <div className="game-lobby" style={themeStyle}>
      <div className="lobby-header">
        <button className="back-btn" onClick={leaveRoom}><ArrowLeft size={18} /> Geri</button>
        <img src="/bilio_logo.png" alt="Bilio" className="lobby-logo" />
        <h2 className="lobby-title">ADAM ASMACA</h2>
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
              <label>Kategori<select value={room.category} onChange={(e) => updateSetting({ category: e.target.value })}>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></label>
              <label>Tur Sayısı<select value={room.roundCount} onChange={(e) => updateSetting({ roundCount: Number(e.target.value) })}>{[5, 10, 15].map((r) => <option key={r} value={r}>{r}</option>)}</select></label>
              <label>Süre<select value={room.turnSeconds} onChange={(e) => updateSetting({ turnSeconds: Number(e.target.value) })}>{[15, 20, 30].map((t) => <option key={t} value={t}>{t} sn</option>)}</select></label>
            </div>
          ) : (
            <div className="bb-settings-info"><span>Kategori: <b>{room.category}</b></span><span>Tur: <b>{room.roundCount}</b></span><span>Süre: <b>{room.turnSeconds}sn</b></span></div>
          )}
          <div className="player-slots">
            {Array.from({ length: room.capacity }).map((_, i) => {
              const p = room.players[i];
              if (!p) return <div className="empty-slot" key={i}><Users size={20} /><span>Oyuncu bekleniyor</span><small>Boş Koltuk</small></div>;
              return (
                <div className="player-card" key={p.userId}>
                  <Avatar profile={toAvatarProfile(p)} size={48} showFrame showBotTag={p.bot} />
                  <div className="player-card-info">
                    <div className="player-name-row"><strong>{p.username}</strong>{room.hostUserId === p.userId && !p.bot && <Crown size={14} className="owner-icon" />}</div>
                    {p.bot && <small>Bot</small>}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="lobby-actions">
            {isHost && room.players.length < room.capacity && <button className="lobby-btn invite" onClick={inviteBot}><BotIcon size={16} /> Bot Davet Et</button>}
            {isHost && <button className="lobby-btn start" onClick={startGame} disabled={room.players.length < 1}><Play size={16} /> Oyunu Başlat</button>}
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
