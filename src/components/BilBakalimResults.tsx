import { useEffect, useState } from 'react';
import { ArrowLeft, Check, Crown, Play, Trophy, Zap, CircleDollarSign, Gem } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Avatar } from '@/components/Avatar';
import { formatNumber } from '@/lib/constants';
import type { BBMatchWinner, Profile, Room } from '@/lib/types';

type Props = {
  room: Room;
  profile: Profile;
  showToast: (m: string) => void;
  setPage: (p: any) => void;
  onProfileUpdate: () => void;
  onPlayAgain: () => void;
};

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bil-bakalim`;

export function BilBakalimResults({ room, profile, showToast, setPage, onProfileUpdate, onPlayAgain }: Props) {
  const [winners, setWinners] = useState<BBMatchWinner[]>([]);
  const [loading, setLoading] = useState(true);
  const [reward, setReward] = useState<{ xp: number; gold: number; diamonds: number } | null>(null);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    async function loadResults() {
      const { data: match } = await supabase.from('bb_matches')
        .select('winners').eq('room_id', room.id).order('finished_at', { ascending: false }).limit(1).maybeSingle();
      if (match?.winners) {
        const w = typeof match.winners === 'string' ? JSON.parse(match.winners) : match.winners;
        setWinners(w);
      }
      setLoading(false);
    }
    loadResults();
  }, [room.id]);

  async function claimReward() {
    setClaiming(true);
    const { data: match } = await supabase.from('bb_matches')
      .select('id').eq('room_id', room.id).order('finished_at', { ascending: false }).limit(1).maybeSingle();
    if (!match) { setClaiming(false); return; }

    const { data: sessionData } = await supabase.auth.getSession();
    const res = await fetch(FN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionData.session?.access_token ?? ''}` },
      body: JSON.stringify({ action: 'claim_reward', match_id: match.id }),
    });
    const data = await res.json();
    if (data.error) {
      showToast(data.error);
    } else {
      setReward({ xp: data.xp, gold: data.gold, diamonds: data.diamonds });
      showToast(`+${data.xp} XP, +${data.gold} altın kazandın!`);
      onProfileUpdate();
    }
    setClaiming(false);
  }

  if (loading) {
    return (
      <div className="game-lobby" style={{ '--c-primary': '#ffb86b', '--c-glow': '#ff9f4f', '--c-bg': '#382016', '--c-border': '#754133', '--c-text': '#ffd4ae' } as React.CSSProperties}>
        <div className="lobby-header">
          <button className="back-btn" onClick={() => setPage('Oyunlar')}><ArrowLeft size={18} /> Geri</button>
          <img src="/bilio_logo.png" alt="Bilio" className="lobby-logo" />
          <h2 className="lobby-title">BİL BAKALIM</h2>
        </div>
        <div style={{ display: 'grid', placeItems: 'center', minHeight: '50vh', color: '#ffd4ae' }}>Sonuçlar yükleniyor...</div>
      </div>
    );
  }

  if (winners.length === 0) {
    return (
      <div className="game-lobby" style={{ '--c-primary': '#ffb86b', '--c-glow': '#ff9f4f', '--c-bg': '#382016', '--c-border': '#754133', '--c-text': '#ffd4ae' } as React.CSSProperties}>
        <div className="lobby-header">
          <button className="back-btn" onClick={() => setPage('Oyunlar')}><ArrowLeft size={18} /> Geri</button>
          <img src="/bilio_logo.png" alt="Bilio" className="lobby-logo" />
          <h2 className="lobby-title">BİL BAKALIM</h2>
        </div>
        <div style={{ display: 'grid', placeItems: 'center', minHeight: '50vh', color: '#ffd4ae' }}>Sonuç bulunamadı.</div>
      </div>
    );
  }

  const top3 = winners.slice(0, 3);
  const rest = winners.slice(3);
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);
  const myEntry = winners.find((w) => w.user_id === profile.id);

  return (
    <div className="game-lobby bb-results" style={{ '--c-primary': '#ffb86b', '--c-glow': '#ff9f4f', '--c-bg': '#382016', '--c-border': '#754133', '--c-text': '#ffd4ae' } as React.CSSProperties}>
      <div className="lobby-header">
        <button className="back-btn" onClick={() => setPage('Oyunlar')}><ArrowLeft size={18} /> Geri</button>
        <img src="/bilio_logo.png" alt="Bilio" className="lobby-logo" />
        <h2 className="lobby-title">BİL BAKALIM SONUÇLARI</h2>
      </div>

      <div className="bb-results-body">
        <div className="section-heading">
          <div><p className="eyebrow">MAÇ ÖZETİ</p><h3>Oyun tamamlandı</h3></div>
        </div>

        {/* Podium */}
        <section className="podium">
          {podiumOrder.map((entry) => {
            const rank = entry === top3[0] ? 1 : entry === top3[1] ? 2 : 3;
            const isTop = rank === 1;
            const playerProfile = !entry.is_bot ? {
              id: entry.user_id, username: entry.username, avatar_color: '#ff7e57',
              avatar_url: null, level: 1, title: null, frame: null,
            } as unknown as Profile : undefined;
            const botData = entry.is_bot ? {
              id: entry.user_id, username: entry.username, avatar_color: '#ff7e57', gender: '', is_online: true,
            } as unknown as any : undefined;
            return (
              <div key={entry.user_id} className={`podium-card ${isTop ? 'first' : rank === 2 ? 'second' : 'third'}`}>
                {rank === 1 && <Crown size={24} className="crown" />}
                <div className="podium-rank">{rank}</div>
                <Avatar profile={playerProfile} bot={botData} size={isTop ? 72 : 56} showFrame showBotTag />
                <strong>{entry.username}</strong>
                {entry.is_bot && <img src="/bilio_logo.png" alt="Bilio" className="bot-bilio-logo" />}
                <div className="podium-score">{formatNumber(entry.score)}</div>
                <small>{entry.words_found} kelime · {entry.wrong_attempts} hata</small>
              </div>
            );
          })}
        </section>

        {/* Remaining players */}
        {rest.length > 0 && (
          <section className="leaderboard-list">
            {rest.map((entry, i) => (
              <div className="lb-row" key={entry.user_id}>
                <span className="lb-rank">{i + 4}</span>
                <Avatar
                  profile={!entry.is_bot ? { username: entry.username, avatar_color: '#ff7e57' } as unknown as Profile : undefined}
                  bot={entry.is_bot ? { username: entry.username, avatar_color: '#ff7e57', gender: '', is_online: true } as unknown as any : undefined}
                  size={36}
                />
                <div className="lb-info">
                  <strong>{entry.username}</strong>
                  {entry.is_bot && <img src="/bilio_logo.png" alt="Bilio" className="bot-bilio-logo" />}
                </div>
                <span className="lb-score">{formatNumber(entry.score)}</span>
              </div>
            ))}
          </section>
        )}

        {/* My stats */}
        {myEntry && !myEntry.is_bot && (
          <div className="bb-my-stats">
            <h4>Senin performansın</h4>
            <div className="profile-stats">
              <div><small>PUAN</small><strong>{formatNumber(myEntry.score)}</strong></div>
              <div><small>KELİME</small><strong>{myEntry.words_found}</strong></div>
              <div><small>HATA</small><strong>{myEntry.wrong_attempts}</strong></div>
            </div>
          </div>
        )}

        {/* Rewards */}
        {myEntry && !myEntry.is_bot && (
          <div className="bb-rewards">
            <h4>Ödüllerin</h4>
            {reward ? (
              <div className="bb-reward-summary">
                <div className="bb-reward-item"><Zap size={20} /> +{reward.xp} XP</div>
                <div className="bb-reward-item"><CircleDollarSign size={20} /> +{reward.gold} Altın</div>
                {reward.diamonds > 0 && <div className="bb-reward-item"><Gem size={20} /> +{reward.diamonds} Elmas</div>}
              </div>
            ) : (
              <button className="primary-button" onClick={claimReward} disabled={claiming}>
                {claiming ? 'Alınıyor...' : 'Ödülü Al'}
              </button>
            )}
          </div>
        )}

        <div className="bb-results-actions">
          <button className="primary-button" onClick={onPlayAgain}><Play size={16} /> Tekrar Oyna</button>
          <button className="soft-button" onClick={() => setPage('Oyunlar')}><ArrowLeft size={16} /> Oyunlara Dön</button>
        </div>
      </div>
    </div>
  );
}
