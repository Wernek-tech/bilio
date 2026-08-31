import {ChangeEvent, useCallback, useEffect, useState} from 'react';
import SiteShell from '../components/SiteShell';
import {api, useAuth} from '../auth/auth';
import {titles} from '../data/titles';

type ProfileData = {
  username: string; createdAt: string; level: number; xp: number; nextLevelXp: number; about: string; avatarUrl: string;
  selectedTitleId: string; selectedFrameId: string | null;
  stats: {matches: number; wins: number; correct: number; score: number};
  badges: {id: string; name: string; owned: boolean; equipped: boolean}[];
  gifts: {id: string; name: string; quantity: number}[];
  achievements: {id: string; name: string; progress: number; target: number; unlocked: boolean}[];
  ownedTitleIds: string[]; ownedFrames: {id: string; name: string}[];
};

async function cropToSquare(file: File): Promise<string> {
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Profil resmi yüklenemedi.'));
    reader.readAsDataURL(file);
  });
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error('Profil resmi yüklenemedi.')); img.src = data;
  });
  const side = Math.min(image.naturalWidth, image.naturalHeight);
  const sx = Math.floor((image.naturalWidth - side) / 2), sy = Math.floor((image.naturalHeight - side) / 2);
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512;
  const context = canvas.getContext('2d'); if (!context) throw new Error('Profil resmi işlenemedi.');
  context.drawImage(image, sx, sy, side, side, 0, 0, 512, 512);
  return canvas.toDataURL(file.type === 'image/png' ? 'image/png' : file.type === 'image/webp' ? 'image/webp' : 'image/jpeg', .9);
}

function ProfileAvatar({profile, previewUrl, frameId}: {profile: ProfileData; previewUrl?: string; frameId?: string | null}) {
  const src = previewUrl || profile.avatarUrl;
  return <div className={`avatar-final ${frameId ? `frame-preview ${frameId}` : ''}`}>
    {src ? <img src={src} alt="Profil resmi"/> : <span>{profile.username.slice(0, 1).toLocaleUpperCase('tr-TR')}</span>}
    <i>{profile.level}</i>
  </div>;
}

export default function Profile() {
  const auth = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [edit, setEdit] = useState(false);
  const [panel, setPanel] = useState<'badges' | 'gifts' | null>(null);
  const [badgeDraft, setBadgeDraft] = useState<string[]>([]);
  const [draft, setDraft] = useState({about: '', titleId: '', frameId: ''});
  const [avatar, setAvatar] = useState('');
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const response = await api<{profile: ProfileData}>('/profile');
    setProfile(response.profile);
    setDraft({about: response.profile.about, titleId: response.profile.selectedTitleId, frameId: response.profile.selectedFrameId || ''});
  }, []);
  const userId = auth.user?.id;
  useEffect(() => { if (userId) void load(); }, [load, userId]);

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    setError('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError('Desteklenmeyen dosya türü.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Dosya boyutu en fazla 5 MB olabilir.'); return; }
    try { setFileName(file.name); setAvatar(await cropToSquare(file)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Profil resmi yüklenemedi.'); }
  };

  if (!auth.user) return <SiteShell><div className="page-body page-empty"><div className="empty-state"><b>Profilini görmek için giriş yapmalısın.</b></div></div></SiteShell>;
  if (!profile) return <SiteShell><div className="page-body page-loading">Profil yükleniyor...</div></SiteShell>;

  const winRate = profile.stats.matches ? profile.stats.wins / profile.stats.matches * 100 : 0;
  const title = titles.find(item => item.id === profile.selectedTitleId);
  const xpPercent = Math.min(100, Math.max(0, profile.nextLevelXp ? profile.xp / profile.nextLevelXp * 100 : 100));
  const equippedBadges = profile.badges.filter(item => item.equipped).slice(0, 5);
  const format = (value: number) => new Intl.NumberFormat('tr-TR').format(value);
  const achievementsSummary = {unlocked: profile.achievements.filter(item => item.unlocked).length, total: profile.achievements.length};

  const openEdit = () => { setError(''); setAvatar(''); setFileName(''); setDraft({about: profile.about, titleId: profile.selectedTitleId, frameId: profile.selectedFrameId || ''}); setEdit(true); };
  const saveProfile = async () => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      await api('/profile', {method: 'PUT', body: JSON.stringify({...draft, avatarDataUrl: avatar || undefined})});
      setEdit(false); setAvatar(''); setFileName(''); await load(); await auth.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : 'Profil kaydedilemedi.'); }
    finally { setBusy(false); }
  };

  return <SiteShell><div className="page-body profile-page-final">
    <section className="profile-header">
      <div className="avatar-region"><ProfileAvatar profile={profile} frameId={profile.selectedFrameId}/></div>
      <div className="identity-region"><div className="identity-name"><h1>{profile.username}</h1>{title && <img src={title.assetPath} alt={`${title.name} unvanı`}/>}</div><div className="level-line"><b>Seviye {profile.level}</b><span>{format(profile.xp)} / {format(profile.nextLevelXp)} XP</span></div><div className="xp-track"><i style={{width: `${xpPercent}%`}}/></div><p>Bilio'ya Katılma: {new Date(profile.createdAt).toLocaleDateString('tr-TR')}</p></div>
      <div className="about-region"><header><h2>HAKKIMDA</h2><button aria-label="Profili düzenle" onClick={openEdit}>✎</button></header><p>{profile.about || 'Henüz hakkında bilgisi eklenmedi.'}</p></div>
    </section>
    <section className="stats-row">{[['Toplam Maç', profile.stats.matches], ['Galibiyet', profile.stats.wins], ['Galibiyet Oranı', `${winRate.toFixed(1)}%`], ['Doğru Cevap', profile.stats.correct], ['Toplam Puan', profile.stats.score]].map(([label, value]) => <article key={String(label)}><strong>{typeof value === 'number' ? format(value) : value}</strong><span>{label}</span></article>)}</section>
    <div className="profile-bottom">
      <section className="profile-panel"><h2>ROZET VİTRİNİ <span>{equippedBadges.length}/5</span></h2><div className="badge-grid">{equippedBadges.length ? equippedBadges.map(item => <div key={item.id} className="badge-showcase-item"><span aria-hidden="true">✦</span><b>{item.name}</b></div>) : <p>Henüz vitrine rozet eklenmedi.</p>}</div><button onClick={() => {setBadgeDraft(equippedBadges.map(item => item.id)); setPanel('badges');}}>ROZETLERİ GÖR</button></section>
      <section className="profile-panel"><h2>HEDİYELERİM</h2>{profile.gifts.length ? <div className="gift-list">{profile.gifts.map(gift => <span key={gift.id}>{gift.name} × {gift.quantity}</span>)}</div> : <><p>Henüz bir hediyen bulunmuyor.</p><small>Oyun oynayarak veya etkinliklere katılarak hediyeler kazanabilirsin.</small></>}<button onClick={() => setPanel('gifts')}>HEDİYELERİ GÖR</button></section>
      <section className="profile-panel achievements"><h2>BAŞARIMLAR <span>{achievementsSummary.unlocked}/{achievementsSummary.total}</span></h2>{achievementsSummary.unlocked > 0 ? profile.achievements.map(achievement => <div key={achievement.id} className={achievement.unlocked ? 'unlocked' : ''}><b>{achievement.name}</b><span>{achievement.progress}/{achievement.target}</span></div>) : <div className="achievement-empty"><b>Henüz başarım kazanılmadı.</b><span>Oyun oynayarak başarımlar kazanabilirsin.</span></div>}</section>
    </div>
  </div>
  {panel && <div className="modal-back" onMouseDown={event => {if (event.target === event.currentTarget) setPanel(null);}}><div className="confirm-modal inventory-modal" role="dialog" aria-modal="true"><h2>{panel === 'badges' ? 'Rozetlerim' : 'Hediyelerim'}</h2>{panel === 'badges' ? (profile.badges.some(item => item.owned) ? <><div className="inventory-list">{profile.badges.map(item => <div key={item.id}><b>{item.name}</b><button disabled={!item.owned} onClick={() => setBadgeDraft(current => current.includes(item.id) ? current.filter(id => id !== item.id) : current.length < 5 ? [...current, item.id] : current)}>{!item.owned ? 'KİLİTLİ' : badgeDraft.includes(item.id) ? 'VİTRİNDE' : 'VİTRİNE EKLE'}</button></div>)}</div><button onClick={async () => {await api('/profile/badges', {method: 'POST', body: JSON.stringify({badgeIds: badgeDraft})}); setPanel(null); await load();}}>KAYDET</button></> : <p>Henüz bir rozetin bulunmuyor.</p>) : (profile.gifts.length ? <div className="inventory-list">{profile.gifts.map(item => <div key={item.id}><b>{item.name}</b><span>× {item.quantity}</span></div>)}</div> : <p>Henüz bir hediyen bulunmuyor.</p>)}<div><button onClick={() => setPanel(null)}>KAPAT</button></div></div></div>}
  {edit && <div className="modal-back" onMouseDown={event => {if (event.target === event.currentTarget && !busy) setEdit(false);}}><div className="profile-edit-modal" role="dialog" aria-modal="true" aria-labelledby="edit-profile-title"><h2 id="edit-profile-title">Profili düzenle</h2><div className="profile-edit-preview"><ProfileAvatar profile={profile} previewUrl={avatar} frameId={draft.frameId || null}/></div><label>Hakkımda<textarea maxLength={240} value={draft.about} onChange={event => setDraft(current => ({...current, about: event.target.value}))}/></label><label>Profil resmi<input id="avatar-file" className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => void onFile(event)}/><button type="button" onClick={() => document.getElementById('avatar-file')?.click()}>PROFİL RESMİ SEÇ</button><span>{fileName || 'Dosya seçilmedi.'}</span></label><fieldset className="title-picker"><legend>Unvan</legend><div>{profile.ownedTitleIds.map(id => {const item = titles.find(value => value.id === id); return item ? <button type="button" key={id} className={draft.titleId === id ? 'selected' : ''} onClick={() => setDraft(current => ({...current, titleId: id}))}><img src={item.assetPath} alt={`${item.name} unvanı`}/></button> : null;})}</div></fieldset><fieldset className="frame-picker"><legend>Çerçeve</legend><div><button type="button" className={!draft.frameId ? 'selected' : ''} onClick={() => setDraft(current => ({...current, frameId: ''}))}>ÇERÇEVESİZ</button>{profile.ownedFrames.map(frame => <button type="button" key={frame.id} className={draft.frameId === frame.id ? 'selected' : ''} onClick={() => setDraft(current => ({...current, frameId: frame.id}))}>{frame.name}</button>)}</div></fieldset>{error && <div className="inline-error">{error}</div>}<div className="modal-actions"><button onClick={() => setEdit(false)} disabled={busy}>İPTAL</button><button onClick={() => void saveProfile()} disabled={busy}>{busy ? 'BEKLEYİN…' : 'KAYDET'}</button></div></div></div>}
  </SiteShell>;
}
