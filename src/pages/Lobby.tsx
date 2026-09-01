import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import SiteShell from '../components/SiteShell';
import { api, useAuth } from '../auth/auth';
import AuthModal from '../auth/AuthModal';
import { titles } from '../data/titles';
type DonutPack = {
    packId: string;
    totalDiamonds: number;
    claimedCount: number;
    maxClaims: number;
    remainingDiamonds: number;
    expiresAt: number;
};
// ponytail: cap live lobby history client-side.
const MAX_LOBBY_ITEMS = 45;
type Msg = {
    id: string;
    kind: 'message' | 'invite' | 'donut-pack';
    username: string;
    userId?: string;
    level?: number;
    content?: string;
    createdAt: string;
    titleId?: string;
    avatarUrl?: string;
    invite?: {
        game: string;
        roomCode: string;
        players: number;
        max: number;
        expiresAt: number;
    };
    donutPack?: DonutPack;
};
type Friend = {
    userId: string;
    mutualCount: number;
};
type PublicProfile = {
    userId: string;
    username: string;
    createdAt: string;
    level: number;
    about: string;
    avatarUrl: string;
    selectedTitleId: string;
    selectedFrameId: string | null;
    likeCount: number;
    likedByMe: boolean;
    isFriend: boolean;
    isSelf: boolean;
    badges: {
        id: string;
        name: string;
        assetPath: string;
        requirement: string;
        equipped: boolean;
    }[];
    gifts: {
        id: string;
        name: string;
        quantity: number;
    }[];
};
const emojis = ['🍩', '😀', '😂', '😍', '👍', '👏', '🎉', '❤️', '⭐', '🔥'];
export default function Lobby() {
    const auth = useAuth(), userId = auth.user?.id, [items, setItems] = useState<Msg[]>([]), [friends, setFriends] = useState<Friend[]>([]), [text, setText] = useState(''), [busy, setBusy] = useState(false), [err, setErr] = useState(''), [authOpen, setAuthOpen] = useState(false), [emojiOpen, setEmojiOpen] = useState(false), [activeMessage, setActiveMessage] = useState<string | null>(null), [profile, setProfile] = useState<PublicProfile | null>(null), [donutQuantity, setDonutQuantity] = useState(0), [reward, setReward] = useState<number | null>(null), bottom = useRef<HTMLDivElement>(null);
    const load = useCallback(async () => { try {
        const messages = await api<{
            items: Msg[];
        }>('/lobby/messages?limit=' + MAX_LOBBY_ITEMS);
        setItems(messages.items.filter(item => item && item.id).slice(-MAX_LOBBY_ITEMS));
        if (userId) {
            setFriends((await api<{
                items: Friend[];
            }>('/friends')).items);
            const products = await api<{
                items: {
                    id: string;
                    quantity?: number;
                }[];
            }>('/store/products?category=HEDİYELER');
            setDonutQuantity(products.items.find(item => item.id === 'gift-donut-pack')?.quantity || 0);
        }
        else {
            setFriends([]);
            setDonutQuantity(0);
        }
    }
    catch (e) {
        setErr(e instanceof Error ? e.message : 'Lobi mesajları yüklenemedi.');
    } }, [userId]);
    useEffect(() => { void load(); const es = new EventSource('/api/lobby/events'); es.onmessage = e => { try {
        const d = JSON.parse(e.data);
        if (d.type === 'lobby-item' && d.item?.id)
            setItems(v => { const found = v.findIndex(x => x.id === d.item.id); if (found < 0) {
                const next = [...v, d.item]; return next.length > MAX_LOBBY_ITEMS ? next.slice(next.length - MAX_LOBBY_ITEMS) : next;
            } const next = [...v]; next[found] = d.item; return next; });
    }
    catch {
        setErr('Lobi bağlantısı yenileniyor…');
    } }; es.onerror = () => setErr('Lobi bağlantısı yenileniyor…'); return () => es.close(); }, [load]);
    const STICK_TO_BOTTOM_PX = 120; // ponytail: only auto-follow if the reader was already near the bottom
    useEffect(() => {
        const scroller = bottom.current?.parentElement;
        const wasNearBottom = !scroller || scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < STICK_TO_BOTTOM_PX;
        if (wasNearBottom) bottom.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
    }, [items.length]);
    useEffect(() => { const close = () => setActiveMessage(null); document.addEventListener('click', close); return () => document.removeEventListener('click', close); }, []);
    const send = async (e?: FormEvent) => { e?.preventDefault(); if (!auth.user) {
        setAuthOpen(true);
        return;
    } const v = text.trim(); if (!v || busy)
        return; setBusy(true); setErr(''); try {
        await api('/lobby/messages', { method: 'POST', body: JSON.stringify({ content: v }) });
        setText('');
    }
    catch (x) {
        setErr(x instanceof Error ? x.message : 'Mesaj gönderilemedi. Lütfen tekrar deneyin.');
    }
    finally {
        setBusy(false);
    } };
    const addFriend = async (userId: string) => { if (!auth.user) {
        setAuthOpen(true);
        return;
    } setBusy(true); try {
        await api('/friends/add', { method: 'POST', body: JSON.stringify({ userId }) });
        setProfile(current => current?.userId === userId ? { ...current, isFriend: true } : current);
        await load();
    }
    catch (e) {
        setErr(e instanceof Error ? e.message : 'Arkadaş eklenemedi.');
    }
    finally {
        setBusy(false);
    } };
    const viewProfile = async (id: string) => { if (id.startsWith('bot-'))
        return; try {
        setProfile((await api<{
            profile: PublicProfile;
        }>(`/profiles/${encodeURIComponent(id)}`)).profile);
        setActiveMessage(null);
    }
    catch (e) {
        setErr(e instanceof Error ? e.message : 'Profil açılamadı.');
    } };
    const likeProfile = async () => { if (!profile)
        return; if (!auth.user) {
        setAuthOpen(true);
        return;
    } try {
        const result = await api<{
            likeCount: number;
            likedByMe: boolean;
        }>(`/profiles/${encodeURIComponent(profile.userId)}/like`, { method: 'POST' });
        setProfile({ ...profile, ...result });
    }
    catch (e) {
        setErr(e instanceof Error ? e.message : 'Beğeni verilemedi.');
    } };
    const shareDonut = async () => { if (!auth.user) {
        setAuthOpen(true);
        return;
    } setBusy(true); try {
        await api('/lobby/donut-packs/share', { method: 'POST' });
        setDonutQuantity(value => Math.max(0, value - 1));
    }
    catch (e) {
        setErr(e instanceof Error ? e.message : 'Donut paketi paylaşılamadı.');
    }
    finally {
        setBusy(false);
    } };
    const claimDonut = async (packId: string) => { if (!auth.user) {
        setAuthOpen(true);
        return;
    } setBusy(true); try {
        const result = await api<{
            amount: number;
            user: {
                diamonds: number;
            };
        }>(`/lobby/donut-packs/claim`, { method: 'POST', body: JSON.stringify({ packId }) });
        auth.patch({ diamonds: result.user.diamonds });
        setReward(result.amount);
        await load();
    }
    catch (e) {
        setErr(e instanceof Error ? e.message : 'Donut paketi açılamadı.');
    }
    finally {
        setBusy(false);
    } };
    return <SiteShell><div className="page-body lobby-page"><section className="lobby-panel" aria-label="Lobi sohbeti"><div className="lobby-scroll">{items.length === 0 ? <div className="empty-state"><b>Henüz mesaj bulunmuyor.</b><span>İlk mesajı sen gönderebilirsin.</span></div> : items.map(m => { const username = m.username || 'Oyuncu', isBot = m.titleId === 'bilio-bot' || m.userId?.startsWith('bot-'), friend = friends.find(item => item.userId === m.userId); if (m.kind === 'invite')
        return <article className="invite-card modern-invite" key={m.id}><div className="invite-player-icon"><span>♙</span><i>＋</i></div><div><b>{username}, {m.invite?.game} odasına oyuncu davet ediyor.</b><span>{m.invite?.players}/{m.invite?.max} oyuncu · Davete katıl ve birlikte oyna</span></div><button onClick={async () => { try {
            if (!auth.user) {
                setAuthOpen(true);
                return;
            }
            await api('/lobby/invitations/join', { method: 'POST', body: JSON.stringify({ inviteId: m.id }) });
            location.href = m.invite?.game === 'VAMPİR KÖYLÜ' ? '/oyun/vampir-koylu' : '/oyun/bil-bakalim';
        }
        catch (e) {
            setErr(e instanceof Error ? e.message : 'Odaya katılınamadı.');
        } }}>ODAYA KATIL</button></article>; if (m.kind === 'donut-pack' && m.donutPack)
        return <article className="donut-pack-card" key={m.id}><div className="donut-pack-art"><img src="/assets/nav-donut.png" alt="Donut elmas paketi"/><span>🎁</span></div><div><b>{username} bir Paylaşımlı Donut Paketi açtı!</b><span>20 farklı oyuncuya toplam 5.000 elmas dağıtılır.</span><small>{m.donutPack.claimedCount}/{m.donutPack.maxClaims} kişi açtı · {m.donutPack.remainingDiamonds.toLocaleString('tr-TR')} elmas kaldı</small><div className="pack-progress"><i style={{ width: `${m.donutPack.claimedCount / m.donutPack.maxClaims * 100}%` }}/></div></div><button disabled={busy || m.donutPack.claimedCount >= m.donutPack.maxClaims} onClick={() => void claimDonut(m.donutPack!.packId)}>PAKETİ AÇ</button></article>; return <article className={`chat-row${isBot ? ' bot-message' : ''}`} key={m.id}><div className="chat-person"><button className="chat-person-button" aria-label={`${username} oyuncu seçenekleri`} onClick={event => { event.stopPropagation(); if (m.userId && !isBot) setActiveMessage(activeMessage === m.id ? null : m.id); }}><div className="chat-avatar">{m.avatarUrl ? <img src={m.avatarUrl} alt=""/> : username.slice(0, 1).toLocaleUpperCase('tr-TR')}</div></button>{activeMessage === m.id && m.userId && !isBot && <div className="player-actions-popover" onClick={event => event.stopPropagation()}><button onClick={() => void viewProfile(m.userId!)}>PROFİLİ GÖR</button>{auth.user && m.userId !== auth.user.id && !friend && <button onClick={() => void addFriend(m.userId!)}>ARKADAŞ EKLE</button>}{friend && <small>ARKADAŞ · {friend.mutualCount} ORTAK</small>}</div>}</div><div className="chat-main"><div className="chat-meta"><button className="chat-name" onClick={event => { event.stopPropagation(); if (m.userId && !isBot) setActiveMessage(activeMessage === m.id ? null : m.id); }}>{username}</button><span className="level-chip">SV. {m.level || 1}</span>{isBot ? <img className="bot-title" src="/assets/bilio-logo.png" alt="Bilio botu"/> : m.titleId && <img className="lobby-title-art" src={(titles.find(t => t.id === m.titleId) || titles[0]).assetPath} alt="Kuşanılmış unvan"/>}<time>{new Date(m.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</time></div><p>{m.content || ''}</p></div></article>; })}<div ref={bottom}/></div><form className="lobby-composer" onSubmit={send}><div className="emoji-wrap"><button type="button" className="emoji-toggle" aria-label="Emoji seç" aria-expanded={emojiOpen} onClick={() => setEmojiOpen(value => !value)}>☺</button>{emojiOpen && <div className="emoji-picker">{emojis.map(emoji => <button type="button" key={emoji} onClick={() => { setText(value => `${value}${emoji}`); setEmojiOpen(false); }}>{emoji}</button>)}</div>}</div>{donutQuantity > 0 && <button type="button" className="share-donut" onClick={() => void shareDonut()} disabled={busy}><img src="/assets/nav-donut.png" alt=""/> PAKET PAYLAŞ <b>×{donutQuantity}</b></button>}<input aria-label="Mesajını yaz" maxLength={500} placeholder="Mesajını yaz..." value={text} onChange={e => setText(e.target.value)} disabled={busy}/><button className="donut-send" aria-label="Mesaj gönder" disabled={busy || !text.trim()}><img src="/assets/nav-donut.png" alt=""/></button></form>{err && <div className="inline-error" role="status">{err}</div>}</section>{!auth.user && <div className="guest-note">Lobi sohbetine katılmak için kayıt olmanız veya giriş yapmanız gerekiyor.</div>}</div>{profile && <div className="modal-back" onMouseDown={event => { if (event.target === event.currentTarget)
        setProfile(null); }}><section className="public-profile-modal" role="dialog" aria-modal="true"><button className="modal-x" onClick={() => setProfile(null)}>×</button><header><div className={`public-avatar ${profile.selectedFrameId || ''}`}>{profile.avatarUrl ? <img src={profile.avatarUrl} alt=""/> : profile.username.slice(0, 1).toLocaleUpperCase('tr-TR')}<i>{profile.level}</i></div><div><h2>{profile.username}</h2><img src={(titles.find(item => item.id === profile.selectedTitleId) || titles[0]).assetPath} alt="Unvan"/><p>{profile.about || 'Henüz hakkında bilgisi eklenmedi.'}</p></div></header><div className="public-profile-actions"><button className={`profile-like${profile.likedByMe ? ' liked' : ''}`} disabled={profile.isSelf || profile.likedByMe} onClick={() => void likeProfile()}>♡ <b>{profile.likeCount}</b><span>{profile.likedByMe ? 'BEĞENDİN' : 'BEĞEN'}</span></button>{!profile.isSelf && !profile.isFriend && <button onClick={() => void addFriend(profile.userId)}>＋ ARKADAŞ EKLE</button>}</div><div className="public-profile-sections"><section><h3>ROZET VİTRİNİ</h3><div>{profile.badges.filter(item => item.equipped).slice(0, 5).map(item => <img key={item.id} src={item.assetPath} title={`${item.name} — ${item.requirement}`} alt={item.name}/>) || null}{!profile.badges.some(item => item.equipped) && <small>Vitrinde rozet yok.</small>}</div></section><section><h3>HEDİYELER</h3><div>{profile.gifts.length ? profile.gifts.map(item => <span key={item.id}>🎁 {item.name} ×{item.quantity}</span>) : <small>Henüz hediye yok.</small>}</div></section></div></section></div>}{reward !== null && <div className="reward-toast"><img src="/assets/nav-donut.png" alt=""/><b>{reward.toLocaleString('tr-TR')} ELMAS KAZANDIN!</b><button onClick={() => setReward(null)}>TAMAM</button></div>}{authOpen && <AuthModal onClose={() => setAuthOpen(false)}/>}</SiteShell>;
}
