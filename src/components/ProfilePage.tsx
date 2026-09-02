// ponytail: Phase 3 — ported from Bolt's ProfilePage (Supabase profiles/user_badges/friends/
// profile_likes tables) onto bilio's single-fetch REST profile endpoints. bilio bundles about,
// stats, badges, gifts, achievements, owned titles/frames and (for public views) like state into
// one response, so this needs far fewer round-trips than the original.
import { useEffect, useRef, useState } from 'react';
import { Award, Camera, Heart, Lock, MessageCircle, Settings, Sparkles, X, Zap } from 'lucide-react';
import { api, avatarColorFor, titleNameFor } from '@/lib/bilioApi';
import { frameNameFor } from '@/lib/frames';
import { Avatar } from '@/components/Avatar';
import { formatNumber, formatDate } from '@/lib/constants';
import type { Profile, Friend } from '@/lib/types';

type BadgeItem = { id: string; name: string; requirement: string; assetPath: string; owned: boolean; equipped: boolean };
type BilioProfile = {
  userId?: string; username: string; about: string; avatarUrl: string; level: number; xp: number; nextLevelXp: number;
  selectedTitleId: string; selectedFrameId: string | null; createdAt: string;
  stats: { matches: number; wins: number; correct: number; score: number };
  badges: BadgeItem[]; ownedTitleIds: string[];
  likeCount?: number; likedByMe?: boolean; isFriend?: boolean; isSelf?: boolean;
};
const ALL_TITLES = Array.from({ length: 26 }, (_, i) => ({ id: `title-${i + 1}`, name: titleNameFor(`title-${i + 1}`), unlockLevel: i === 0 ? 1 : i * 20 }));

function toAvatarProfile(p: BilioProfile): Profile {
  return {
    id: p.userId || '', username: p.username, about: p.about, avatar_url: p.avatarUrl || null,
    avatar_color: avatarColorFor(p.username), level: p.level, xp: p.xp, gold: 0, diamonds: 0,
    likes: p.likeCount || 0, title: titleNameFor(p.selectedTitleId), frame: frameNameFor(p.selectedFrameId),
    total_matches: p.stats.matches, total_wins: p.stats.wins, total_correct: p.stats.correct, total_score: p.stats.score,
    weekly_score: 0, reward_claimed: false, created_at: p.createdAt,
  };
}

export function ProfilePage({ session, showToast, openPM, viewProfileId, onOwnProfileUpdate }: {
  session: { user: { id: string } }; showToast: (m: string) => void; openPM: (id: string) => void;
  viewProfileId: string | null; onOwnProfileUpdate: () => void;
}) {
  const isOwnProfile = !viewProfileId || viewProfileId === session.user.id;
  const [data, setData] = useState<BilioProfile | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [editing, setEditing] = useState(false);
  const [about, setAbout] = useState('');
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [showTitleModal, setShowTitleModal] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setData(null);
    const req = isOwnProfile
      ? api<{ profile: BilioProfile }>('/profile')
      : api<{ profile: BilioProfile }>(`/profiles/${encodeURIComponent(viewProfileId!)}`);
    req.then(({ profile }) => { setData(profile); setAbout(profile.about); }).catch(() => showToast('Profil yüklenemedi.'));
    if (isOwnProfile) api<{ items: Friend[] }>('/friends').then(({ items }) => setFriends(items)).catch(() => undefined);
  };
  useEffect(load, [viewProfileId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function saveAbout() {
    try {
      await api('/profile', { method: 'PUT', body: JSON.stringify({ about: about.slice(0, 240) }) });
      showToast('Hakkımda güncellendi.'); setEditing(false); load();
    } catch (reason) { showToast(reason instanceof Error ? reason.message : 'Hakkımda kaydedilemedi.'); }
  }

  async function uploadAvatar(file: File) {
    if (!file.type.startsWith('image/')) { showToast('Lütfen bir resim dosyası seç.'); return; }
    if (file.size > 5 * 1024 * 1024) { showToast("Resim 5MB'den küçük olmalı."); return; }
    setUploadingAvatar(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      await api('/profile', { method: 'PUT', body: JSON.stringify({ avatarDataUrl: dataUrl }) });
      showToast('Profil resmi güncellendi!'); load(); onOwnProfileUpdate();
    } catch (reason) { showToast(reason instanceof Error ? reason.message : 'Resim yüklenemedi.'); }
    finally { setUploadingAvatar(false); }
  }

  async function toggleLike() {
    if (isOwnProfile || !data) { showToast('Kendi profilini beğenemezsin.'); return; }
    try {
      const result = await api<{ likeCount: number; likedByMe: boolean }>(`/profiles/${encodeURIComponent(viewProfileId!)}/like`, { method: 'POST' });
      setData({ ...data, ...result });
    } catch (reason) { showToast(reason instanceof Error ? reason.message : 'Beğeni işlemi başarısız.'); }
  }

  async function selectTitle(titleId: string) {
    try {
      await api('/profile', { method: 'PUT', body: JSON.stringify({ titleId }) });
      showToast('Unvan güncellendi.'); setShowTitleModal(false); load(); onOwnProfileUpdate();
    } catch (reason) { showToast(reason instanceof Error ? reason.message : 'Unvan seçilemedi.'); }
  }

  async function toggleShowcaseBadge(badgeId: string) {
    if (!data) return;
    const equippedIds = data.badges.filter((b) => b.equipped).map((b) => b.id);
    const has = equippedIds.includes(badgeId);
    if (!has && equippedIds.length >= 5) { showToast('Vitrinde 5 rozet zaten var. Birini çıkar.'); return; }
    const nextIds = has ? equippedIds.filter((id) => id !== badgeId) : [...equippedIds, badgeId];
    try {
      await api('/profile/badges', { method: 'POST', body: JSON.stringify({ badgeIds: nextIds }) });
      load();
    } catch (reason) { showToast(reason instanceof Error ? reason.message : 'Rozet vitrini güncellenemedi.'); }
  }

  if (!data) {
    return (
      <section className="profile-view">
        <div className="empty-panel-inline"><Sparkles size={28} /><h3>Profil yükleniyor...</h3></div>
      </section>
    );
  }

  const displayProfile = toAvatarProfile(data);
  const winRate = data.stats.matches > 0 ? Math.round((data.stats.wins / data.stats.matches) * 100) : 0;
  const xpPct = data.nextLevelXp > 0 ? Math.min(100, Math.round((data.xp / data.nextLevelXp) * 100)) : 0;
  const showcaseBadges = data.badges.filter((b) => b.equipped);
  const ownedTitles = ALL_TITLES.filter((t) => data.ownedTitleIds.includes(t.id));

  return (
    <section className="profile-view">
      <div className="profile-hero">
        <div className="big-avatar-wrap">
          <Avatar profile={displayProfile} size={84} showFrame />
          {isOwnProfile && (
            <button className="avatar-upload-btn" onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar}>
              <Camera size={16} />
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadAvatar(f); e.target.value = ''; }} />
        </div>
        <div className="profile-hero-info">
          <div className="profile-name-row">
            <h3>{data.username}</h3>
            {displayProfile.title && <span className="title-badge">{displayProfile.title}</span>}
          </div>
          <div className="like-display"><Heart size={16} fill="#ff4f91" /><span>{data.likeCount || 0} beğeni</span></div>
          <p className="muted">{editing ? (
            <textarea className="about-editor" value={about} onChange={(e) => setAbout(e.target.value)} maxLength={240} rows={3} />
          ) : (data.about || 'Henüz bir hakkında yazısı yok.')}</p>
          {editing ? (
            <div className="about-actions">
              <button className="soft-button" onClick={() => void saveAbout()}>Kaydet</button>
              <button className="text-button" onClick={() => { setAbout(data.about); setEditing(false); }}>İptal</button>
            </div>
          ) : isOwnProfile && (
            <button className="soft-button edit-btn" onClick={() => setEditing(true)}><Settings size={14} /> Düzenle</button>
          )}
        </div>
        {!isOwnProfile && (
          <button className={`like-btn ${data.likedByMe ? 'liked' : ''}`} disabled={data.likedByMe} onClick={() => void toggleLike()}>
            <Heart size={22} fill={data.likedByMe ? '#ff4f91' : 'none'} /><span>{data.likeCount || 0}</span>
          </button>
        )}
      </div>

      <div className="profile-stats">
        <div><small>SEVİYE</small><strong>{data.level}</strong></div>
        <div><small>TOPLAM MAÇ</small><strong>{formatNumber(data.stats.matches)}</strong></div>
        <div><small>GALİBİYET</small><strong>{formatNumber(data.stats.wins)}</strong></div>
        <div><small>GALİBİYET ORANI</small><strong>%{winRate}</strong></div>
        <div><small>DOĞRU CEVAP</small><strong>{formatNumber(data.stats.correct)}</strong></div>
        <div><small>TOPLAM PUAN</small><strong>{formatNumber(data.stats.score)}</strong></div>
      </div>

      <div className="xp-card">
        <div className="xp-title"><span><Zap size={17} /> Seviye ilerlemesi</span><b>{xpPct}%</b></div>
        <div className="progress"><i style={{ width: `${xpPct}%` }} /></div>
        <small>Bilio'ya katılım: {formatDate(data.createdAt)}</small>
      </div>

      <div className="profile-section">
        <div className="profile-section-header">
          <h4>Rozet Vitrini</h4>
          {isOwnProfile && <button className="soft-button" onClick={() => setShowBadgeModal(true)}>Vitrini Düzenle</button>}
        </div>
        <div className="badge-showcase">
          {showcaseBadges.length === 0 ? <p className="muted">Henüz vitrinde rozet yok.</p> : showcaseBadges.map((b) => (
            <div className="showcase-badge" key={b.id}>
              <div className="badge-img">{b.assetPath ? <img src={b.assetPath} alt={b.name} /> : <Award size={32} />}</div>
              <small>{b.name}</small>
            </div>
          ))}
        </div>
      </div>

      <div className="profile-section">
        <div className="profile-section-header">
          <h4>Başarımlar</h4>
          {isOwnProfile && <button className="soft-button" onClick={() => setShowTitleModal(true)}>Unvan Seç</button>}
        </div>
        <div className="achievements-grid">
          {data.badges.slice(0, 12).map((b) => (
            <div className={`achievement-card ${b.owned ? 'earned' : 'locked'}`} key={b.id}>
              <div className="badge-img">{b.owned ? (b.assetPath ? <img src={b.assetPath} alt={b.name} /> : <Award size={28} />) : <Lock size={20} />}</div>
              <small>{b.name}</small>
              {!b.owned && <span className="unlock-info">{b.requirement}</span>}
            </div>
          ))}
        </div>
      </div>

      {isOwnProfile && (
        <div className="profile-section">
          <div className="profile-section-header"><h4>Arkadaşlarım</h4></div>
          <div className="friends-list">
            {friends.length === 0 ? <p className="muted">Henüz arkadaşın yok. Lobiden arkadaş ekleyebilirsin.</p> : friends.map((f) => (
              <div className="friend-card" key={f.friend_id}>
                <Avatar profile={f.profile} size={40} />
                <div className="friend-info"><strong>{f.profile?.username}</strong><small>Seviye {f.profile?.level}</small></div>
                <button className="friend-msg" onClick={() => openPM(f.friend_id)}><MessageCircle size={16} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showBadgeModal && (
        <div className="modal-overlay" onClick={() => setShowBadgeModal(false)}>
          <div className="badge-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h3>Rozetlerim</h3><button onClick={() => setShowBadgeModal(false)}><X size={20} /></button></div>
            <div className="badge-grid">
              {data.badges.map((b) => (
                <button key={b.id} className={`badge-pick ${b.equipped ? 'selected' : ''} ${!b.owned ? 'locked' : ''}`} disabled={!b.owned} onClick={() => void toggleShowcaseBadge(b.id)}>
                  <div className="badge-img">{b.assetPath ? <img src={b.assetPath} alt={b.name} /> : <Award size={28} />}</div>
                  <small>{b.name}</small>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showTitleModal && (
        <div className="modal-overlay" onClick={() => setShowTitleModal(false)}>
          <div className="badge-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h3>Unvan Seç</h3><button onClick={() => setShowTitleModal(false)}><X size={20} /></button></div>
            <div className="badge-grid">
              {ownedTitles.map((t) => (
                <button key={t.id} className={`badge-pick ${data.selectedTitleId === t.id ? 'selected' : ''}`} onClick={() => void selectTitle(t.id)}>
                  <small>{t.name}</small>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
