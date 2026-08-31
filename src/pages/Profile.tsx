import {ChangeEvent, useCallback, useEffect, useState} from 'react';
import SiteShell from '../components/SiteShell';
import {api, useAuth} from '../auth/auth';
import {titles} from '../data/titles';

type ProfileData = {
  username: string; createdAt: string; level: number; xp: number; nextLevelXp: number; about: string; avatarUrl: string;
  selectedTitleId: string; selectedFrameId: string | null;
  stats: {matches: number; wins: number; correct: number; score: number};
  badges: {id: string; name: string; requirement: string; assetPath: string; owned: boolean; equipped: boolean}[];
  gifts: {id: string; name: string; quantity: number}[];
  achievements: {id: string; name: string; progress: number; target: number; unlocked: boolean}[];
  ownedTitleIds: string[]; ownedFrames: {id: string; name: string}[];
};
type Friend = {userId: string; username: string; avatarUrl: string; titleId?: string; online: boolean; mutualCount: number};

async function readImage(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Profil resmi yüklenemedi.'));
    reader.readAsDataURL(file);
  });
}

async function renderSquareCrop(data: string, scale: number, offsetX: number, offsetY: number): Promise<string> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error('Profil resmi yüklenemedi.')); img.src = data;
  });
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512;
  const context = canvas.getContext('2d'); if (!context) throw new Error('Profil resmi işlenemedi.');
  const coverScale = Math.max(512 / image.naturalWidth, 512 / image.naturalHeight) * scale;
  const width = image.naturalWidth * coverScale, height = image.naturalHeight * coverScale;
  context.drawImage(image, (512 - width) / 2 + offsetX * 2, (512 - height) / 2 + offsetY * 2, width, height);
  return canvas.toDataURL('image/jpeg', .92);
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
  const [panel, setPanel] = useState<'titles' | 'badges' | 'gifts' | 'frames' | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [badgeDraft, setBadgeDraft] = useState<string[]>([]);
  const [draft, setDraft] = useState({about: ''});
  const [avatar, setAvatar] = useState('');
  const [cropSource, setCropSource] = useState('');
  const [crop, setCrop] = useState({scale: 1, x: 0, y: 0});
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const response = await api<{profile: ProfileData}>('/profile');
    setProfile(response.profile);
    setDraft({about: response.profile.about});
    const friendResponse = await api<{items: Friend[]}>('/friends').catch(() => ({items: [] as Friend[]}));
    setFriends(friendResponse.items);
  }, []);
  const userId = auth.user?.id;
  useEffect(() => { if (userId) void load(); }, [load, userId]);

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    setError('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError('Desteklenmeyen dosya türü.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Dosya boyutu en fazla 5 MB olabilir.'); return; }
    try { setFileName(file.name); setCropSource(await readImage(file)); setAvatar(''); setCrop({scale: 1, x: 0, y: 0}); }
    catch (err) { setError(err instanceof Error ? err.message : 'Profil resmi yüklenemedi.'); }
  };

  if (!auth.user) return <SiteShell><div className="page-body page-empty"><div className="empty-state"><b>Profilini görmek için giriş yapmalısın.</b></div></div></SiteShell>;
  if (!profile) return <SiteShell><div className="page-body page-loading">Profil yükleniyor...</div></SiteShell>;

  const winRate = profile.stats.matches ? profile.stats.wins / profile.stats.matches * 100 : 0;
  const title = titles.find(item => item.id === profile.selectedTitleId);
  const xpPercent = Math.min(100, Math.max(0, profile.nextLevelXp ? profile.xp / profile.nextLevelXp * 100 : 100));
  const equippedBadges = profile.badges.filter(item => item.equipped).slice(0, 5);
  const format = (value: number) => new Intl.NumberFormat('tr-TR').format(value);

  const openEdit = () => { setError(''); setAvatar(''); setCropSource(''); setCrop({scale: 1, x: 0, y: 0}); setFileName(''); setDraft({about: profile.about}); setEdit(true); };
  const saveProfile = async () => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const avatarDataUrl = cropSource ? await renderSquareCrop(cropSource, crop.scale, crop.x, crop.y) : avatar || undefined;
      await api('/profile', {method: 'PUT', body: JSON.stringify({...draft, titleId: profile.selectedTitleId, frameId: profile.selectedFrameId || '', avatarDataUrl})});
      setEdit(false); setAvatar(''); setFileName(''); await load(); await auth.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : 'Profil kaydedilemedi.'); }
    finally { setBusy(false); }
  };
  const equipTitle = async (titleId: string) => {
    if (!profile.ownedTitleIds.includes(titleId) || busy) return;
    setBusy(true); setError('');
    try { await api('/profile', {method: 'PUT', body: JSON.stringify({about: profile.about, titleId, frameId: profile.selectedFrameId || ''})}); await load(); await auth.refresh(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unvan kullanıma alınamadı.'); }
    finally { setBusy(false); }
  };
  const equipFrame = async (frameId: string) => {
    if (busy) return;
    setBusy(true); setError('');
    try { await api('/profile', {method: 'PUT', body: JSON.stringify({about: profile.about, titleId: profile.selectedTitleId, frameId})}); setPanel(null); await load(); await auth.refresh(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Çerçeve kullanıma alınamadı.'); }
    finally { setBusy(false); }
  };

  return <SiteShell><div className="page-body profile-page-final">
    <section className="profile-header">
      <div className="avatar-region"><button className="avatar-frame-button" onClick={() => setPanel('frames')} title="Profil çerçevesini değiştir"><ProfileAvatar profile={profile} frameId={profile.selectedFrameId}/></button></div>
      <div className="identity-region"><div className="identity-name"><h1>{profile.username}</h1>{title && <button className="profile-title-button" onClick={() => setPanel('titles')} title="Tüm unvanları gör"><img src={title.assetPath} alt={`${title.name} unvanı`}/></button>}</div><div className="profile-about-inline"><div><b>HAKKIMDA</b><p>{profile.about || 'Henüz hakkında bilgisi eklenmedi.'}</p></div><button aria-label="Hakkımda ve profil resmini düzenle" onClick={openEdit}>✎</button></div><div className="level-line"><b>Seviye {profile.level}</b><span>{format(profile.xp)} / {format(profile.nextLevelXp)} XP</span></div><div className="xp-track"><i style={{width: `${xpPercent}%`}}/></div><p>Bilio'ya Katılma: {new Date(profile.createdAt).toLocaleDateString('tr-TR')}</p></div>
      <div className="friends-region"><header><h2>ARKADAŞLARIM</h2><span>{friends.filter(friend => friend.online).length} çevrim içi</span></header><div>{friends.length ? friends.slice(0, 6).map(friend => <article key={friend.userId}><div className="friend-avatar">{friend.avatarUrl ? <img src={friend.avatarUrl} alt=""/> : friend.username.slice(0, 1).toLocaleUpperCase('tr-TR')}</div><p><b>{friend.username}</b><small className={friend.online ? 'online' : ''}>{friend.online ? 'Çevrim içi' : 'Çevrim dışı'} · {friend.mutualCount} ortak arkadaş</small></p></article>) : <p className="friends-empty">Henüz arkadaşın bulunmuyor. Lobideki oyuncuları arkadaş olarak ekleyebilirsin.</p>}</div></div>
    </section>
    <section className="stats-row">{[['Toplam Maç', profile.stats.matches], ['Galibiyet', profile.stats.wins], ['Galibiyet Oranı', `${winRate.toFixed(1)}%`], ['Doğru Cevap', profile.stats.correct], ['Toplam Puan', profile.stats.score]].map(([label, value]) => <article key={String(label)}><strong>{typeof value === 'number' ? format(value) : value}</strong><span>{label}</span></article>)}</section>
    <div className="profile-bottom">
      <section className="profile-panel"><h2>ROZET VİTRİNİ <span>{equippedBadges.length}/5</span></h2><div className="badge-grid">{equippedBadges.length ? equippedBadges.map(item => <div key={item.id} className="badge-showcase-item" title={item.requirement}><img src={item.assetPath} alt={item.name}/><b>{item.name}</b></div>) : <p>Henüz vitrine rozet eklenmedi.</p>}</div><button onClick={() => {setBadgeDraft(equippedBadges.map(item => item.id)); setPanel('badges');}}>ROZETLERİ GÖR</button></section>
      <section className="profile-panel gifts-panel"><h2>HEDİYELERİM</h2><button onClick={() => setPanel('gifts')}>HEDİYELERİ GÖR</button>{profile.gifts.length ? <div className="gift-list">{profile.gifts.map(gift => <span key={gift.id}>{gift.name} × {gift.quantity}</span>)}</div> : <><p>Henüz bir hediyen bulunmuyor.</p><small>Oyun oynayarak veya etkinliklere katılarak hediyeler kazanabilirsin.</small></>}</section>
      <section className="profile-panel achievements"><h2>BAŞARIMLAR <span>{profile.badges.filter(item => item.owned).length}/{profile.badges.length}</span></h2><div className="achievement-badge-grid">{profile.badges.map(item => <button key={item.id} className={item.owned ? 'unlocked' : 'locked'} title={`${item.name} — ${item.requirement}`} onClick={() => {setBadgeDraft(equippedBadges.map(badge => badge.id)); setPanel('badges');}}><img src={item.assetPath} alt=""/><span>{item.name}</span></button>)}</div></section>
    </div>
  </div>
  {panel && <div className="modal-back" onMouseDown={event => {if (event.target === event.currentTarget) setPanel(null);}}><div className="confirm-modal inventory-modal collection-modal" role="dialog" aria-modal="true">
    <header><h2>{panel === 'titles' ? 'UNVANLAR' : panel === 'badges' ? 'ROZETLER VE BAŞARIMLAR' : panel === 'frames' ? 'PROFİL ÇERÇEVELERİ' : 'HEDİYELERİM'}</h2><button aria-label="Pencereyi kapat" onClick={() => setPanel(null)}>×</button></header>
    {panel === 'titles' && <div className="title-collection">{titles.map(item => {const owned=profile.ownedTitleIds.includes(item.id);return <button key={item.id} className={`${owned ? 'owned' : 'locked'}${profile.selectedTitleId === item.id ? ' selected' : ''}`} disabled={!owned || busy} title={owned ? `${item.name} — Seviye ${item.unlockLevel} — Kullanmak için tıkla` : `${item.name} — Seviye ${item.unlockLevel} seviyesinde açılır`} onClick={() => void equipTitle(item.id)}><img src={item.assetPath} alt={item.name}/><span>{owned ? profile.selectedTitleId === item.id ? 'KULLANILIYOR' : 'AÇIK' : `SEVİYE ${item.unlockLevel}`}</span></button>})}</div>}
    {panel === 'badges' && <><div className="badge-collection">{profile.badges.map(item => <button key={item.id} className={`${item.owned ? 'owned' : 'locked'}${badgeDraft.includes(item.id) ? ' selected' : ''}`} disabled={!item.owned} title={`${item.name} — ${item.requirement}`} onClick={() => setBadgeDraft(current => current.includes(item.id) ? current.filter(id => id !== item.id) : current.length < 5 ? [...current, item.id] : current)}><img src={item.assetPath} alt={item.name}/><b>{item.name}</b><span>{item.owned ? badgeDraft.includes(item.id) ? 'VİTRİNDE' : 'VİTRİNE EKLE' : item.requirement}</span></button>)}</div><button className="collection-save" disabled={busy} onClick={async () => {await api('/profile/badges', {method: 'POST', body: JSON.stringify({badgeIds: badgeDraft})}); setPanel(null); await load();}}>VİTRİNİ KAYDET</button></>}
    {panel === 'gifts' && (profile.gifts.length ? <div className="inventory-list">{profile.gifts.map(item => <div key={item.id}><b>{item.name}</b><span>× {item.quantity}</span></div>)}</div> : <p>Henüz bir hediyen bulunmuyor.</p>)}
    {panel === 'frames' && <div className="frame-collection"><button className={!profile.selectedFrameId ? 'selected' : ''} onClick={() => void equipFrame('')}><ProfileAvatar profile={profile}/><b>ÇERÇEVESİZ</b></button>{profile.ownedFrames.map(frame => <button key={frame.id} className={profile.selectedFrameId === frame.id ? 'selected' : ''} onClick={() => void equipFrame(frame.id)}><ProfileAvatar profile={profile} frameId={frame.id}/><b>{frame.name}</b></button>)}</div>}
  </div></div>}
  {edit && <div className="modal-back" onMouseDown={event => {if (event.target === event.currentTarget && !busy) setEdit(false);}}><div className="profile-edit-modal compact" role="dialog" aria-modal="true" aria-labelledby="edit-profile-title"><h2 id="edit-profile-title">Hakkımda ve profil resmi</h2>{cropSource ? <div className="avatar-crop-editor"><div className="avatar-crop-window"><img src={cropSource} alt="Profil resmi kırpma ön izlemesi" style={{transform: `translate(${crop.x}px, ${crop.y}px) scale(${crop.scale})`}}/></div><label>Yakınlaştır<input type="range" min="1" max="2.5" step="0.01" value={crop.scale} onChange={event => setCrop(current => ({...current, scale: Number(event.target.value)}))}/></label><div className="crop-position"><button type="button" aria-label="Resmi sola taşı" onClick={() => setCrop(current => ({...current, x: Math.max(-100, current.x - 8)}))}>←</button><button type="button" aria-label="Resmi yukarı taşı" onClick={() => setCrop(current => ({...current, y: Math.max(-100, current.y - 8)}))}>↑</button><button type="button" aria-label="Resmi aşağı taşı" onClick={() => setCrop(current => ({...current, y: Math.min(100, current.y + 8)}))}>↓</button><button type="button" aria-label="Resmi sağa taşı" onClick={() => setCrop(current => ({...current, x: Math.min(100, current.x + 8)}))}>→</button><button type="button" onClick={() => setCrop({scale: 1, x: 0, y: 0})}>SIFIRLA</button></div></div> : <div className="profile-edit-preview"><ProfileAvatar profile={profile} previewUrl={avatar} frameId={profile.selectedFrameId}/></div>}<label>Günün sözü / Hakkımda<textarea maxLength={240} value={draft.about} onChange={event => setDraft({about: event.target.value})} placeholder="Bugün ne hissediyorsun?"/></label><label>Profil resmi<input id="avatar-file" className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => void onFile(event)}/><button type="button" onClick={() => document.getElementById('avatar-file')?.click()}>PROFİL RESMİ SEÇ</button><span>{fileName || 'Yeni bir resim seçilmedi.'}</span></label>{error && <div className="inline-error">{error}</div>}<div className="modal-actions"><button onClick={() => setEdit(false)} disabled={busy}>İPTAL</button><button onClick={() => void saveProfile()} disabled={busy}>{busy ? 'BEKLEYİN…' : 'KAYDET'}</button></div></div></div>}
  </SiteShell>;
}
