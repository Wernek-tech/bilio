import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, Check, Crown, Send, X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Avatar } from '@/components/Avatar';
import { formatTime } from '@/lib/constants';
import type { BBMatchPlayer, BBMatchState, BBWordEntry, Profile, Room } from '@/lib/types';

type Props = {
  room: Room;
  profile: Profile;
  showToast: (m: string) => void;
  setPage: (p: any) => void;
  onProfileUpdate: () => void;
  onMatchEnd: () => void;
};

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bil-bakalim`;

export function BilBakalimGame({ room, profile, showToast, setPage, onProfileUpdate, onMatchEnd }: Props) {
  const [matchId, setMatchId] = useState<string | null>(null);
  const [state, setState] = useState<BBMatchState | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [selStart, setSelStart] = useState<[number, number] | null>(null);
  const [selEnd, setSelEnd] = useState<[number, number] | null>(null);
  const [chat, setChat] = useState<{ id: string; body: string; sender_id: string; is_bot: boolean; created_at: string }[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(3);
  const [showCountdown, setShowCountdown] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const stateTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const findMatch = useCallback(async () => {
    const { data: match } = await supabase.from('bb_matches')
      .select('id').eq('room_id', room.id).eq('status', 'playing').order('started_at', { ascending: false }).limit(1).maybeSingle();
    if (match) {
      setMatchId(match.id);
      setShowCountdown(true);
      setCountdown(3);
    }
  }, [room.id]);

  useEffect(() => {
    findMatch();
  }, [findMatch]);

  useEffect(() => {
    if (!showCountdown) return;
    if (countdown <= 0) { setShowCountdown(false); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, showCountdown]);

  const loadState = useCallback(async () => {
    if (!matchId) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const res = await fetch(FN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionData.session?.access_token ?? ''}` },
      body: JSON.stringify({ action: 'get_state', match_id: matchId }),
    });
    const data = await res.json();
    if (data.error) return;
    setState(data as BBMatchState);

    const { data: chatData } = await supabase.from('room_chat')
      .select('id, body, sender_id, is_bot, created_at').eq('room_id', room.id).order('created_at', { ascending: false }).limit(20);
    setChat(((chatData ?? []) as typeof chat).reverse());
  }, [matchId, room.id]);

  useEffect(() => {
    if (!matchId) return;
    loadState();
    stateTimer.current = setInterval(loadState, 3000);
    return () => { if (stateTimer.current) clearInterval(stateTimer.current); };
  }, [matchId, loadState]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [chat]);

  useEffect(() => {
    if (state?.status === 'finished') {
      onMatchEnd();
    }
  }, [state?.status, onMatchEnd]);

  // Bot auto-move
  useEffect(() => {
    if (!matchId || !state || state.status !== 'playing' || showCountdown) return;
    const activePlayer = state.players[state.current_turn_index];
    if (activePlayer?.is_bot && !activePlayer?.eliminated) {
      const delay = 2000 + Math.random() * 3000;
      const t = setTimeout(async () => {
        const { data: sessionData } = await supabase.auth.getSession();
        await fetch(FN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionData.session?.access_token ?? ''}` },
          body: JSON.stringify({ action: 'bot_move', match_id: matchId, bot_user_id: activePlayer.user_id }),
        });
        loadState();
      }, delay);
      return () => clearTimeout(t);
    }
  }, [matchId, state?.current_turn_index, state?.status, showCountdown, loadState, state]);

  async function handleTimeoutCheck() {
    if (!matchId) return;
    const { data: sessionData } = await supabase.auth.getSession();
    await fetch(FN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionData.session?.access_token ?? ''}` },
      body: JSON.stringify({ action: 'check_timeout', match_id: matchId }),
    });
  }

  useEffect(() => {
    if (!matchId || !state || state.status !== 'playing') return;
    if (state.seconds_left <= 0) {
      handleTimeoutCheck();
      const t = setTimeout(() => loadState(), 500);
      return () => clearTimeout(t);
    }
  }, [state?.seconds_left, matchId, state?.status, loadState]);

  async function submitSelection(start: [number, number], end: [number, number]) {
    if (!matchId) return;
    setError('');
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const { data: sessionData } = await supabase.auth.getSession();
    const res = await fetch(FN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionData.session?.access_token ?? ''}` },
      body: JSON.stringify({ action: 'submit_selection', match_id: matchId, start, end, request_id: requestId }),
    });
    const data = await res.json();
    if (data.error) {
      setError(data.error);
      showToast(data.error);
    } else {
      showToast(`Doğru! +${data.score} puan`);
    }
    loadState();
  }

  function getCellFromEvent(e: React.PointerEvent | React.MouseEvent): [number, number] | null {
    const target = e.target as HTMLElement;
    const r = target.getAttribute('data-row');
    const c = target.getAttribute('data-col');
    if (r === null || c === null) return null;
    return [Number(r), Number(c)];
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!state || state.status !== 'playing') return;
    const activePlayer = state.players[state.current_turn_index];
    if (!activePlayer || activePlayer.user_id !== profile.id || activePlayer.eliminated) return;
    const cell = getCellFromEvent(e);
    if (!cell) return;
    e.preventDefault();
    setSelecting(true);
    setSelStart(cell);
    setSelEnd(cell);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!selecting) return;
    const cell = getCellFromEvent(e);
    if (!cell) return;
    if (selStart && isStraightLine(selStart[0], selStart[1], cell[0], cell[1])) {
      setSelEnd(cell);
    }
  }

  function onPointerUp() {
    if (!selecting || !selStart || !selEnd) { setSelecting(false); return; }
    setSelecting(false);
    if (selStart[0] === selEnd[0] && selStart[1] === selEnd[1]) { setSelStart(null); setSelEnd(null); return; }
    submitSelection(selStart, selEnd);
    setSelStart(null);
    setSelEnd(null);
  }

  function isStraightLine(r1: number, c1: number, r2: number, c2: number): boolean {
    const dr = r2 - r1;
    const dc = c2 - c1;
    return dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc);
  }

  function isInSelection(r: number, c: number): boolean {
    if (!selecting || !selStart || !selEnd) return false;
    const dr = selEnd[0] - selStart[0];
    const dc = selEnd[1] - selStart[1];
    const len = Math.max(Math.abs(dr), Math.abs(dc)) + 1;
    const stepR = dr === 0 ? 0 : Math.sign(dr);
    const stepC = dc === 0 ? 0 : Math.sign(dc);
    for (let i = 0; i < len; i++) {
      if (selStart[0] + stepR * i === r && selStart[1] + stepC * i === c) return true;
    }
    return false;
  }

  async function sendChat(event: FormEvent) {
    event.preventDefault();
    if (!message.trim()) return;
    const { error } = await supabase.from('room_chat').insert({ room_id: room.id, sender_id: profile.id, body: message.trim() });
    if (!error) { setMessage(''); loadState(); }
  }

  async function leaveMatch() {
    if (!matchId) { setPage('Oyunlar'); return; }
    setLeaving(true);
    const { data: sessionData } = await supabase.auth.getSession();
    await fetch(FN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionData.session?.access_token ?? ''}` },
      body: JSON.stringify({ action: 'leave_match', match_id: matchId }),
    });
    setPage('Oyunlar');
    setLeaving(false);
    setConfirmLeave(false);
  }

  if (!state) {
    return (
      <div className="game-lobby" style={{ '--c-primary': '#ffb86b', '--c-glow': '#ff9f4f', '--c-bg': '#382016', '--c-border': '#754133', '--c-text': '#ffd4ae' } as React.CSSProperties}>
        <div className="lobby-header">
          <button className="back-btn" onClick={() => setPage('Oyunlar')}><ArrowLeft size={18} /> Geri</button>
          <img src="/bilio_logo.png" alt="Bilio" className="lobby-logo" />
          <h2 className="lobby-title">BİL BAKALIM</h2>
        </div>
        <div style={{ display: 'grid', placeItems: 'center', minHeight: '50vh', color: '#ffd4ae' }}>Maç yükleniyor...</div>
      </div>
    );
  }

  const activePlayer = state.players[state.current_turn_index];
  const isMyTurn = activePlayer?.user_id === profile.id && !activePlayer?.eliminated && state.status === 'playing';

  // Player layout positions
  const playerPositions = getPlayerPositions(state.players.length);

  return (
    <div className="game-lobby bb-game" style={{ '--c-primary': '#ffb86b', '--c-glow': '#ff9f4f', '--c-bg': '#382016', '--c-border': '#754133', '--c-text': '#ffd4ae' } as React.CSSProperties}>
      <div className="lobby-header">
        <button className="back-btn" onClick={() => { if (state.status === 'playing') setConfirmLeave(true); else setPage('Oyunlar'); }}><ArrowLeft size={18} /> Geri</button>
        <img src="/bilio_logo.png" alt="Bilio" className="lobby-logo" />
        <h2 className="lobby-title">BİL BAKALIM</h2>
        <div className="bb-header-info">
          <span className="bb-active-player">
            Sıra: <b>{activePlayer?.username ?? '—'}</b>
          </span>
          <div className="timer-circle">{state.seconds_left}<small>sn</small></div>
        </div>
      </div>

      <div className="bb-instruction">Bir harften başlayıp sürükle. Yatay, dikey veya çapraz çizgi oluştur.</div>

      {showCountdown && (
        <div className="bb-countdown-overlay">
          <div className="bb-countdown">{countdown > 0 ? countdown : 'Başla!'}</div>
        </div>
      )}

      {confirmLeave && (
        <div className="modal-overlay" onClick={() => setConfirmLeave(false)}>
          <div className="bb-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Oyundan ayrıl?</h3>
            <p>Maç devam ediyor. Ayrılırsan oyunu kaybedebilirsin.</p>
            <div className="bb-confirm-actions">
              <button className="lobby-btn leave" onClick={leaveMatch} disabled={leaving}>{leaving ? 'Ayrılıyor...' : 'Evet, ayrıl'}</button>
              <button className="lobby-btn" onClick={() => setConfirmLeave(false)}>İptal</button>
            </div>
          </div>
        </div>
      )}

      <div className="bb-game-layout">
        {/* Surrounding players */}
        <div className="bb-players-area">
          {state.players.map((p, i) => {
            const pos = playerPositions[i];
            if (!pos) return null;
            const isActive = i === state.current_turn_index && state.status === 'playing';
            return (
              <div
                key={p.user_id}
                className={`bb-player-slot ${isActive ? 'active' : ''} ${p.eliminated ? 'eliminated' : ''}`}
                style={{ gridArea: pos.area }}
              >
                <Avatar
                  profile={!p.is_bot ? { id: p.user_id, username: p.username, avatar_color: p.avatar_color, avatar_url: p.avatar_url, level: p.level, title: p.title, frame: p.frame } as unknown as Profile : undefined}
                  bot={p.is_bot ? { id: p.user_id, username: p.username, avatar_color: p.avatar_color, gender: '', is_online: true } as unknown as any : undefined}
                  size={42}
                  showFrame
                  showBotTag
                />
                <div className="bb-player-info">
                  <div className="bb-player-name">
                    <strong>{p.username}</strong>
                    {room.owner_id === p.user_id && !p.is_bot && <Crown size={12} className="owner-icon" />}
                  </div>
                  {!p.is_bot && p.title && <span className="msg-title">{p.title}</span>}
                  {p.is_bot && <img src="/bilio_logo.png" alt="Bilio" className="bot-bilio-logo" />}
                  <div className="bb-player-score">{p.score} p</div>
                </div>
              </div>
            );
          })}

          {/* Center board */}
          <div className="bb-board-area" style={{ gridArea: 'board' }}>
            <div
              className={`bb-board ${isMyTurn ? 'my-turn' : 'locked'}`}
              ref={boardRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
            >
              {state.board.map((row, r) => (
                <div className="bb-row" key={r}>
                  {row.map((letter, c) => (
                    <div
                      key={c}
                      className={`bb-cell ${isInSelection(r, c) ? 'selected' : ''}`}
                      data-row={r}
                      data-col={c}
                    >
                      {letter}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: word list */}
        <div className="bb-word-list">
          <h3>Kelimeler ({state.words.filter((w: BBWordEntry) => w.found).length}/{state.words.length})</h3>
          <div className="bb-words">
            {state.words.map((w, i) => (
              <div key={i} className={`bb-word-item ${w.found ? 'found' : ''}`}>
                {w.found && <Check size={12} />}
                <span className={w.found ? 'strikethrough' : ''}>{w.word}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom: chat */}
      <div className="bb-game-chat">
        <div className="chat-messages" ref={chatRef}>
          {chat.length === 0 ? <p className="chat-empty">Henüz mesaj yok.</p> : chat.map((msg) => {
            const sender = state.players.find((p) => p.user_id === msg.sender_id);
            return (
              <div className="chat-message" key={msg.id}>
                <Avatar
                  profile={!msg.is_bot && sender ? { username: sender.username, avatar_color: sender.avatar_color, avatar_url: sender.avatar_url, level: sender.level, title: sender.title, frame: sender.frame } as unknown as Profile : undefined}
                  bot={msg.is_bot && sender ? { username: sender.username, avatar_color: sender.avatar_color, gender: '', is_online: true } as unknown as any : undefined}
                  size={24}
                />
                <div>
                  <strong>{sender?.username ?? 'Oyuncu'}</strong>
                  <p>{msg.body}</p>
                </div>
              </div>
            );
          })}
        </div>
        <form className="chat-form" onSubmit={sendChat}>
          <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Oyun sohbetine yaz..." maxLength={400} />
          <button className="send-donut" aria-label="Gönder"><Send size={17} /></button>
        </form>
      </div>

      {error && <div className="bb-error-toast">{error}</div>}
    </div>
  );
}

function getPlayerPositions(count: number): { area: string }[] {
  if (count <= 4) {
    return [
      { area: 'top-left' }, { area: 'bottom-right' },
      { area: 'top-right' }, { area: 'bottom-left' },
    ].slice(0, count);
  }
  const positions = [
    { area: 'top-left' }, { area: 'top-right' },
    { area: 'left-top' }, { area: 'right-top' },
    { area: 'left-bottom' }, { area: 'right-bottom' },
    { area: 'bottom-left' }, { area: 'bottom-right' },
  ];
  return positions.slice(0, count);
}
