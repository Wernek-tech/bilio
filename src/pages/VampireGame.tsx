import {FormEvent, useCallback, useEffect, useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {useAuth} from '../auth/auth';
import {vampireSeatPosition} from '../vampire/seatLayout.js';
import PlayerAvatar from '../components/PlayerAvatar';

type ChatMessage = {id: string; username?: string; system?: boolean; content: string};
type RoomPlayer = {userId: string; username: string; ready: boolean; connected?: boolean; avatarUrl?: string; frameId?: string | null; bot?: boolean};
type MatchPlayer = {username: string; alive: boolean; connected: boolean; spectating: boolean; avatarUrl?: string; frameId?: string | null; bot?: boolean};
type Room = {code: string; hostUserId: string; players: RoomPlayer[]; messages: ChatMessage[]; countdownEndsAt?: number; nightDuration: number; discussionDuration: number; votingDuration: number};
type VoteState = {target?: string; abstain?: boolean} | null;
type Execution = {eliminatedId: string | null; username: string | null; role: string | null; tie: boolean} | null;
type Match = {
  phase: string; phaseEndsAt?: number | null; dayNumber: number; myAlive: boolean; myRole: string; mySpectating: boolean;
  players: Record<string, MatchPlayer>; vampireIds?: string[]; vampireMessages?: ChatMessage[]; villageMessages?: ChatMessage[];
  deadMessages?: ChatMessage[]; journal: string[]; winner?: string | null; votesCast: number; votesRequired: number;
  nightActionsComplete: number; nightActionsRequired: number; myNightActionAccepted: boolean; myVote: VoteState; execution: Execution;
};
type GameState = {room?: Room | null; match?: Match | null};
type ApiError = {error?: string};
type ChatProps = {title: string; messages?: ChatMessage[]; value: string; setValue: (value: string) => void; send: () => Promise<void>; disabled?: boolean};

async function gameApi<T = unknown>(path: string, method = 'GET', data?: unknown): Promise<T> {
  const response = await fetch(path, {method, headers: {'Content-Type': 'application/json'}, body: data ? JSON.stringify(data) : undefined});
  const body = await response.json() as T & ApiError;
  if (!response.ok) throw new Error(body.error || 'İşlem başarısız');
  return body;
}

const roleNames: Record<string, string> = {VAMPIRE: 'VAMPİR', SEER: 'KAHİN', DOCTOR: 'DOKTOR', VILLAGER: 'KÖYLÜ'};
const phaseNames: Record<string, string> = {
  ROLE_REVEAL: 'ROLÜNÜ ÖĞREN', NIGHT: 'GECE', DAY_ANNOUNCEMENT: 'SABAH', DAY_DISCUSSION: 'GÜNDÜZ — TARTIŞMA',
  DAY_VOTING: 'GÜNDÜZ — OYLAMA', EXECUTION: 'KÖY KARARI', GAME_OVER: 'OYUN BİTTİ',
};
const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'İşlem başarısız';
const roleName = (role: string) => roleNames[role] || role;
const phaseName = (phase: string) => phaseNames[phase] || phase;

function Avatar({player, dead = false}: {player: {username: string; avatarUrl?: string; frameId?: string | null}; dead?: boolean}) {
  return <PlayerAvatar className={`vk-avatar ${dead ? 'dead' : ''}`} username={player.username} avatarUrl={player.avatarUrl} frameId={player.frameId}/>;
}

export default function VampireGame() {
  const {user} = useAuth();
  const nav = useNavigate();
  const [state, setState] = useState<GameState>({});
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [target, setTarget] = useState('');
  const [seerResult, setSeerResult] = useState('');
  const [feedback, setFeedback] = useState('');
  const [pending, setPending] = useState(false);
  const [clock, setClock] = useState(Date.now());

  const load = useCallback(async () => {
    try { setState(await gameApi<GameState>('/api/game/vampire/active')); }
    catch (error) { setErr(errorMessage(error)); }
  }, []);

  useEffect(() => {
    void load();
    const polling = window.setInterval(() => void load(), 750);
    const ticking = window.setInterval(() => setClock(Date.now()), 250);
    return () => { window.clearInterval(polling); window.clearInterval(ticking); };
  }, [load]);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(''), 2600);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  useEffect(() => {
    setTarget('');
    setSeerResult('');
  }, [state.match?.phase, state.match?.dayNumber]);

  const room = state.room || undefined;
  const match = state.match || undefined;
  const seconds = Math.max(0, Math.ceil((((match?.phaseEndsAt || room?.countdownEndsAt) || 0) - clock) / 1000));
  const players = useMemo(() => match ? Object.entries(match.players) : [], [match]);
  const me = room?.players.find((player) => player.userId === user?.id);

  const post = useCallback(async <T,>(path: string, data?: unknown): Promise<T | undefined> => {
    if (pending) return undefined;
    try {
      setPending(true); setErr('');
      const result = await gameApi<T>(path, 'POST', data);
      await load();
      return result;
    } catch (error) {
      setErr(errorMessage(error));
      return undefined;
    } finally { setPending(false); }
  }, [load, pending]);

  const leave = useCallback(async () => {
    if (match?.myAlive && !window.confirm('Devam eden oyundan ayrılmak istediğine emin misin?')) return;
    const result = await post<{ok: boolean}>('/api/game/vampire/leave');
    if (result?.ok) nav('/oyunlar');
  }, [match?.myAlive, nav, post]);

  if (!room) return <div className="vk-shell vk-entry">
    <header className="vk-entry-top"><button className="vk-back" onClick={() => nav('/oyunlar')} aria-label="Geri">‹</button><h1>VAMPİR KÖYLÜ</h1></header>
    <div className="vk-entry-card"><h2>KARANLIK KÖYE GİR</h2><p>8–12 oyuncu · 2 Vampir · 1 Kahin · 1 Doktor</p>
      <button disabled={pending} onClick={() => void post('/api/game/vampire/create')}>ODA OLUŞTUR</button>
      <div><input value={code} onChange={(event) => setCode(event.target.value)} placeholder="VK-4821"/><button disabled={pending || !code.trim()} onClick={() => void post('/api/game/vampire/join', {code})}>ODA KODUYLA KATIL</button></div>
      {err && <small>{err}</small>}
    </div>
  </div>;

  if (!match) return <div className="vk-shell vk-lobby">
    <Top title="VAMPİR KÖYLÜ" onLeave={leave}/>
    <div className="vk-code">ODA KODU: <b>{room.code}</b> <button onClick={() => void navigator.clipboard?.writeText(room.code)}>KOPYALA</button><button disabled={pending || room.hostUserId !== user?.id} onClick={() => void post('/api/game/vampire/invite')}>OYUNCU DAVET ET</button><button disabled={pending || room.hostUserId !== user?.id || room.players.length>=12} onClick={() => void post('/api/game/vampire/invite-bots')}>BOT DAVET ET</button></div>
    <main>
      <section className="vk-panel players"><h2>OYUNCULAR {room.players.length}/12</h2><div className="vk-grid">{Array.from({length: 12}, (_, index) => {
        const player = room.players[index];
        return <div className="vk-seat" key={player?.userId || `empty-${index}`}>{player ? <><Avatar player={player}/><b title={player.username}>{player.username}</b>{player.bot&&<img className="vk-bot-title" src="/assets/bilio-logo.png" alt="Bilio botu"/>}{player.userId === room.hostUserId && <em>KURUCU</em>}<span className={player.ready ? 'ready' : 'wait'}>{player.ready ? 'HAZIR' : 'BEKLİYOR'}</span></> : <><i>＋</i><small>OYUNCU BEKLENİYOR</small></>}</div>;
      })}</div></section>
      <aside><div className="vk-panel"><h2>ODA AYARLARI</h2><p>BAŞLAMAK İÇİN EN AZ <b>8</b></p><p>OYUNCU <b>{room.players.length}/12</b></p><p>GECE <b>{room.nightDuration} SN</b></p><p>TARTIŞMA <b>{room.discussionDuration} SN</b></p><p>OYLAMA <b>{room.votingDuration} SN</b></p><h3>ROL DAĞILIMI</h3><p>VAMPİR ×2 · KAHİN ×1 · DOKTOR ×1</p><p>KÖYLÜ ×{Math.max(0, room.players.length - 4)}</p></div>
        <Chat title="ODA SOHBETİ" messages={room.messages} value={msg} setValue={setMsg} send={async () => {const content = msg.trim(); if (!content) return; const ok = await post('/api/game/vampire/chat', {content}); if (ok !== undefined) setMsg('');}}/>
      </aside>
    </main>
    <footer><button disabled={pending} onClick={() => void leave()}>ODADAN ÇIK</button><strong>{room.players.filter((player) => player.ready).length}/{room.players.length} OYUNCU <i>HAZIR</i></strong>{room.countdownEndsAt ? <b>OYUN {seconds} SANİYE SONRA BAŞLIYOR</b> : <button disabled={pending} className="primary" onClick={() => void post('/api/game/vampire/ready')}>{me?.ready ? 'HAZIRLIĞI İPTAL ET' : 'HAZIR'}</button>}</footer>
    {err && <div className="vk-error">{err}</div>}
  </div>;

  const alivePlayers = players.filter(([, player]) => player.alive);
  const canNightAct = match.phase === 'NIGHT' && match.myAlive && match.myRole !== 'VILLAGER';
  const voteSelected = match.myVote?.target || '';
  const actionText = match.phase === 'ROLE_REVEAL' ? 'Rolünü incele. Gece birazdan başlayacak.'
    : match.phase === 'NIGHT' && !match.myAlive ? 'Oyunu izliyorsun. Yaşayan oyuncuların gece seçimleri bekleniyor.'
    : match.phase === 'NIGHT' && match.myRole === 'VILLAGER' ? 'Gece devam ediyor. Özel rollerin seçimlerini tamamlaması bekleniyor.'
    : match.phase === 'NIGHT' && match.myNightActionAccepted ? 'Seçimin kaydedildi. Diğer oyuncular bekleniyor.'
    : match.phase === 'NIGHT' ? 'Rolüne uygun hedefini seç ve onayla.'
    : match.phase === 'DAY_ANNOUNCEMENT' ? 'Gece sonucu açıklanıyor. Birazdan tartışma başlayacak.'
    : match.phase === 'DAY_DISCUSSION' ? 'Şüphelerini köy sohbetinde paylaş ve oylamaya hazırlan.'
    : match.phase === 'DAY_VOTING' && match.myVote ? 'Oyun kaydedildi. Oylama bitene kadar oyunu değiştirebilirsin.'
    : match.phase === 'DAY_VOTING' ? 'Yaşayan bir oyuncuyu seç. Kendine oy veremezsin.'
    : match.phase === 'EXECUTION' ? 'Köy kararının sonucu açıklanıyor.'
    : match.phase === 'GAME_OVER' ? 'Maç tamamlandı.' : 'Diğer oyuncular bekleniyor.';

  return <div className={`vk-shell vk-game ${match.phase === 'EXECUTION' ? 'is-execution' : ''}`}>
    <Top title="VAMPİR KÖYLÜ" phase={phaseName(match.phase)} onLeave={leave}/>
    <div className="vk-timer"><b>{String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}</b><small>{match.dayNumber}. GÜN</small></div>
    <div className="vk-phase-status"><strong>{phaseName(match.phase)}</strong><span>{actionText}</span>{match.phase === 'NIGHT' && match.nightActionsRequired > 0 && <em>{match.nightActionsComplete}/{match.nightActionsRequired} gerekli seçim tamamlandı</em>}{match.phase === 'DAY_VOTING' && <em>{match.votesCast}/{match.votesRequired} yaşayan ve bağlı oyuncu oy kullandı</em>}</div>
    <main>
      <aside className="vk-role vk-panel"><h3>GİZLİ ROLÜN</h3><h1>{roleName(match.myRole)}</h1><div className="role-orb">{match.myRole === 'SEER' ? '◌' : match.myRole === 'DOCTOR' ? '+' : match.myRole === 'VAMPIRE' ? '🩸' : '♟'}</div>
        <p>{match.myRole === 'SEER' ? 'Her gece bir oyuncunun Vampir olup olmadığını öğren.' : match.myRole === 'DOCTOR' ? 'Her gece yaşayan bir oyuncuyu koru.' : match.myRole === 'VAMPIRE' ? 'Gece takım arkadaşınla aynı hedefi seç.' : 'Vampirleri tartışma ve oylamayla bul.'}</p>
        {canNightAct && <div className="vk-action"><select disabled={pending} value={target} onChange={(event) => setTarget(event.target.value)}><option value="">Hedef seç</option>{alivePlayers.filter(([id]) => id !== user?.id && (match.myRole !== 'VAMPIRE' || !match.vampireIds?.includes(id))).map(([id, player]) => <option key={id} value={id}>{player.username}</option>)}</select><button disabled={pending || !target} onClick={async () => {
          const result = await post<{result?: string}>('/api/game/vampire/action', {targetId: target});
          if (!result) return;
          if (match.myRole === 'SEER' && result.result) { setSeerResult(result.result); setFeedback('Araştırma tamamlandı'); }
          else if (match.myRole === 'DOCTOR') setFeedback('Koruma seçimin kaydedildi');
          else setFeedback('Hedefin kaydedildi');
        }}>{match.myRole === 'SEER' ? 'ARAŞTIR' : match.myRole === 'DOCTOR' ? 'KORU' : 'HEDEFİ ONAYLA'}</button>{seerResult && <b className="vk-seer-result">{seerResult}</b>}</div>}
        {!match.myAlive && <div className="vk-dead-actions"><button disabled={pending || match.mySpectating} onClick={async () => {const ok = await post('/api/game/vampire/spectate'); if (ok !== undefined) setFeedback('Oyunu izliyorsun');}}>OYUNU İZLE</button><button disabled={pending} onClick={() => void leave()}>ODADAN AYRIL</button></div>}
      </aside>
      <section className="vk-arena"><div className="vk-ring">{players.map(([id, player], index) => <button key={id} className={`vk-player ${!player.alive ? 'dead' : ''} ${!player.connected ? 'disconnected' : ''} ${target === id ? 'selected' : ''}`} style={vampireSeatPosition(index, players.length)} disabled={match.phase !== 'DAY_VOTING' || !match.myAlive || !player.alive || id === user?.id} onClick={() => setTarget(id)}><Avatar player={player} dead={!player.alive}/><span title={player.username}>{player.username}</span><em>{!player.alive ? (player.spectating ? 'İZLİYOR' : 'ELENDİ') : !player.connected ? 'BAĞLANTI KESİLDİ' : 'HAYATTA'}</em></button>)}
        <div className="vk-center"><h2>{match.phase === 'NIGHT' ? 'GECE' : match.phase === 'DAY_VOTING' ? 'ŞÜPHELİYİ SEÇ' : match.phase === 'GAME_OVER' ? (match.winner === 'VILLAGE' ? 'KÖY KAZANDI' : 'VAMPİRLER KAZANDI') : phaseName(match.phase)}</h2><p>{actionText}</p></div>
        {match.phase === 'EXECUTION' && <ExecutionScene execution={match.execution} player={match.execution?.eliminatedId ? match.players[match.execution.eliminatedId] : undefined}/>}</div>
        <div className="vk-chat-row">{!match.myAlive ? <Chat title="ÖLÜLER SOHBETİ" messages={match.deadMessages || []} value={msg} setValue={setMsg} send={async () => {const content = msg.trim(); if (!content) return; const ok = await post('/api/game/vampire/dead-chat', {content}); if (ok !== undefined) setMsg('');}}/> : match.phase === 'NIGHT' && match.myRole === 'VAMPIRE' ? <Chat title="VAMPİR SOHBETİ" messages={match.vampireMessages || []} value={msg} setValue={setMsg} send={async () => {const content = msg.trim(); if (!content) return; const ok = await post('/api/game/vampire/vampire-chat', {content}); if (ok !== undefined) setMsg('');}}/> : <Chat title="KÖY SOHBETİ" disabled={!['DAY_DISCUSSION', 'DAY_VOTING'].includes(match.phase)} messages={match.villageMessages || []} value={msg} setValue={setMsg} send={async () => {const content = msg.trim(); if (!content) return; const ok = await post('/api/game/vampire/village-chat', {content}); if (ok !== undefined) setMsg('');}}/>}</div>
      </section>
      <aside className="vk-side"><div className="vk-panel journal"><h2>KÖY GÜNLÜĞÜ</h2>{match.journal.map((entry, index) => <p key={`${index}-${entry}`}>{entry}</p>)}<strong>HAYATTA {alivePlayers.length} OYUNCU</strong></div>{match.phase === 'DAY_VOTING' && match.myAlive && <div className="vk-panel vote"><h2>OYLAMAYA {seconds} SN</h2><button disabled={pending || !target || target === user?.id} onClick={async () => {const result = await post<{replaced?: boolean}>('/api/game/vampire/vote', {targetId: target}); if (result) setFeedback(result.replaced || voteSelected ? 'Oyun değiştirildi' : 'Oyun kaydedildi');}}>OY VER</button><button disabled={pending} onClick={async () => {const result = await post<{replaced?: boolean}>('/api/game/vampire/vote', {abstain: true}); if (result) setFeedback(result.replaced || match.myVote ? 'Oyun değiştirildi' : 'Oyun kaydedildi');}}>ÇEKİMSER</button><small>{match.votesCast}/{match.votesRequired} kişi oy kullandı</small></div>}</aside>
    </main>
    {feedback && <div className="vk-feedback">{feedback}</div>}{err && <div className="vk-error">{err}</div>}
  </div>;
}

function ExecutionScene({execution, player}: {execution: Execution; player?: MatchPlayer}) {
  if (!execution) return null;
  if (execution.tie) return <div className="vk-execution tie"><h2>Köy kararını verdi…</h2><strong>Oylar eşit. Kimse elenmedi.</strong></div>;
  const executedPlayer = player || {username: execution.username || '?'};
  return <div className="vk-execution"><h2>Köy kararını verdi…</h2><div className="vk-executed-card"><Avatar player={executedPlayer} dead/><strong>{execution.username}</strong><b>Rolü: {execution.role ? roleName(execution.role) : ''}</b></div></div>;
}

function Top({title, phase, onLeave}: {title: string; phase?: string; onLeave: () => Promise<void>}) {
  return <header className="vk-top"><button className="vk-back" onClick={() => void onLeave()} aria-label="Oyundan ayrıl">‹</button><h1>{title}</h1>{phase && <strong>{phase}</strong>}</header>;
}

function Chat({title, messages = [], value, setValue, send, disabled = false}: ChatProps) {
  const submit = (event: FormEvent) => {event.preventDefault(); if (!disabled && value.trim()) void send();};
  return <div className="vk-panel vk-chat"><h2>{title}</h2><div>{messages.slice(-20).map((message) => <p key={message.id}><b>{message.system ? '' : message.username ? `${message.username}: ` : ''}</b>{message.content}</p>)}</div><form onSubmit={submit}><input maxLength={500} disabled={disabled} value={value} onChange={(event) => setValue(event.target.value)} placeholder={disabled ? 'Bu sohbet şu anda yalnızca okunabilir' : 'Mesajını yaz...'}/><button disabled={disabled || !value.trim()} aria-label="Gönder">➤</button></form></div>;
}
