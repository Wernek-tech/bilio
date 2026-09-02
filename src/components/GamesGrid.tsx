// ponytail: "Oyunlar" reverted to the old v15 look at the user's request — real game art cards +
// "KOD İLE KATIL" (join by code) modal, ported from the live Home.tsx. Sidebar/topbar dropped since
// Bolt's App already renders those; only the content grid is ported.
import { FormEvent, useState } from 'react';
import { api } from '@/lib/bilioApi';
import type { Page } from '@/App';

type Game = { title: string; to?: string; art: string };
const games: Game[] = [
  { title: 'ŞARKIYI BİL', art: '/assets/home/sarkiyi-bil.png' },
  { title: 'TAHMİN ET KİM?', art: '/assets/home/tahmin-et-kim.png' },
  { title: 'BİL BAKALIM', to: 'Bil Bakalım', art: '/assets/home/bil-bakalim.png' },
  { title: 'ÇİZ & BİL', art: '/assets/home/ciz-bil.png' },
  { title: 'ADAM ASMACA', to: 'Adam Asmaca', art: '/assets/home/adam-asmaca.png' },
  { title: 'VAMPİR KÖYLÜ', art: '/assets/home/vampir-koylu.png' },
  { title: 'YAYINCI KİM?', art: '/assets/home/yayinci-kim.png' },
  { title: 'DİĞER SEKME ÇOK YAKINDA', art: '/assets/home/cok-yakinda.png' },
];
const GAME_CREATE: Record<string, string> = { 'Bil Bakalım': '/game/bil-bakalim/create', 'Adam Asmaca': '/game/hangman/create' };

export function GamesGrid({ showToast, onEnterGame }: { showToast: (m: string) => void; onEnterGame: (p: Page) => void }) {
  const [joinOpen, setJoinOpen] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [joinBusy, setJoinBusy] = useState(false);
  const [joinError, setJoinError] = useState('');

  async function open(game: Game) {
    if (!game.to) { showToast('Bu oyun yakında.'); return; }
    try { await api(GAME_CREATE[game.to], { method: 'POST' }); onEnterGame(game.to as Page); }
    catch (reason) { showToast(reason instanceof Error ? reason.message : 'Oda oluşturulamadı.'); }
  }

  async function joinByCode(event: FormEvent) {
    event.preventDefault();
    const code = roomCode.trim().toUpperCase();
    if (!code || joinBusy) return;
    setJoinBusy(true); setJoinError('');
    try {
      const result = await api<{ path: string }>('/game/join-by-code', { method: 'POST', body: JSON.stringify({ code }) });
      setJoinOpen(false);
      if (result.path.includes('bil-bakalim')) onEnterGame('Bil Bakalım');
      else if (result.path.includes('adam-asmaca')) onEnterGame('Adam Asmaca');
      else showToast('Bu oyun türü henüz desteklenmiyor.');
    } catch (reason) { setJoinError(reason instanceof Error ? reason.message : 'Odaya katılınamadı.'); }
    finally { setJoinBusy(false); }
  }

  return <section className="games-content">
    <div className="games-grid">
      {games.map((g) => (
        <article key={g.title} className={`desktop-game-card ${!g.to ? 'disabled' : ''}`} onClick={() => void open(g)}>
          <div className="game-art"><img src={g.art} alt="" /></div>
          <div className="game-card-foot">
            <h2>{g.title}</h2>
            {g.to ? <button className="launch-button" onClick={(e) => { e.stopPropagation(); void open(g); }} aria-label={`${g.title} oyununu aç`}>▶</button> : <button className="launch-button" disabled aria-label="Çok yakında">×</button>}
          </div>
        </article>
      ))}
    </div>
    <button className="join-code-nav" style={{ position: 'fixed', bottom: 24, right: 28, zIndex: 5, height: 44, padding: '0 18px', borderRadius: 8 }} onClick={() => { setJoinError(''); setJoinOpen(true); }}># KOD İLE KATIL</button>
    {joinOpen && <div className="legacy-modal-back" onMouseDown={(event) => { if (event.target === event.currentTarget && !joinBusy) setJoinOpen(false); }}>
      <form className="join-code-modal" onSubmit={joinByCode}>
        <h2>KOD İLE KATIL</h2>
        <p>Arkadaşının paylaştığı oda kodunu gir.</p>
        <input autoFocus aria-label="Oda kodu" value={roomCode} maxLength={16} placeholder="ÖRN. SB-3801" onChange={(event) => setRoomCode(event.target.value.toUpperCase().replace(/\s/g, ''))} />
        {joinError && <div className="inline-error" role="status">{joinError}</div>}
        <button className="primary-btn" disabled={joinBusy || !roomCode.trim()}>{joinBusy ? 'ODA ARANIYOR…' : 'ODAYA KATIL'}</button>
      </form>
    </div>}
  </section>;
}
