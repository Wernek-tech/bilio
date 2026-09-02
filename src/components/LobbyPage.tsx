// ponytail: Phase 2 — was Supabase realtime (postgres_changes on lobby_messages); now bilio's
// REST + SSE (/api/lobby/messages, /api/lobby/events). Private-message/add-friend menu items call
// real endpoints; "Mesaj Gönder" just toasts for now — the PM window itself lands in a later phase.
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Gift, MessageCircle, Send, Smile, UserPlus } from 'lucide-react';
import { api, avatarColorFor, titleNameFor } from '@/lib/bilioApi';
import { Avatar } from '@/components/Avatar';
import { EMOJIS, formatTime } from '@/lib/constants';
import type { Profile } from '@/lib/types';

type DonutPack = { packId: string; totalDiamonds: number; claimedCount: number; maxClaims: number; remainingDiamonds: number; expiresAt: number };
type LobbyItem = {
  id: string;
  kind: 'message' | 'invite' | 'donut-pack';
  userId?: string;
  username: string;
  level?: number;
  titleId?: string;
  avatarUrl?: string;
  content?: string;
  createdAt: string;
  donutPack?: DonutPack;
};

export function LobbyPage({ profile, showToast, viewProfile, openPM }: {
  profile: Profile; showToast: (m: string) => void; viewProfile: (id: string) => void; openPM: (id: string) => void;
}) {
  const [items, setItems] = useState<LobbyItem[]>([]);
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [donutQuantity, setDonutQuantity] = useState(0);
  const [sharingDonut, setSharingDonut] = useState(false);

  const load = useCallback(async () => {
    try {
      const { items: msgs } = await api<{ items: LobbyItem[] }>('/lobby/messages?limit=40');
      setItems(msgs.filter((m) => m.kind === 'message' || m.kind === 'donut-pack'));
    } catch {
      showToast('Lobi mesajları yüklenemedi.');
    }
  }, [showToast]);

  const loadDonutQuantity = useCallback(async () => {
    try {
      const { items: products } = await api<{ items: { id: string; quantity?: number }[] }>('/store/products?category=HEDİYELER');
      setDonutQuantity(products.find((p) => p.id === 'gift-donut-pack')?.quantity || 0);
    } catch { setDonutQuantity(0); }
  }, []);

  useEffect(() => { void load(); void loadDonutQuantity(); }, [load, loadDonutQuantity]);

  useEffect(() => {
    const es = new EventSource('/api/lobby/events');
    es.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data);
        if (d.type === 'lobby-item' && (d.item?.kind === 'message' || d.item?.kind === 'donut-pack')) {
          setItems((v) => {
            const found = v.findIndex((x) => x.id === d.item.id);
            if (found < 0) return [...v, d.item].slice(-40);
            const next = [...v]; next[found] = d.item; return next; // donut-pack claim-count updates land as an update to the same id
          });
        }
      } catch { /* ignore malformed frames */ }
    };
    return () => es.close();
  }, []);

  useEffect(() => {
    if (autoScroll && chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [items, autoScroll]);

  function onScroll() {
    if (!chatRef.current) return;
    const atBottom = chatRef.current.scrollHeight - chatRef.current.scrollTop - chatRef.current.clientHeight < 60;
    setAutoScroll(atBottom);
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText('');
    setShowEmoji(false);
    try {
      await api('/lobby/messages', { method: 'POST', body: JSON.stringify({ content: body }) });
      // ponytail: no optimistic append — the SSE echo (own message included) lands in ~100ms and de-dupes by id.
    } catch (reason) {
      setText(body);
      showToast(reason instanceof Error ? reason.message : 'Mesaj gönderilemedi.');
    }
  }

  async function addFriend(userId: string) {
    try {
      await api('/friends/add', { method: 'POST', body: JSON.stringify({ userId }) });
      showToast('Arkadaşlık isteği gönderildi!');
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : 'İstek gönderilemedi.');
    }
    setMenuFor(null);
  }

  async function shareDonut() {
    if (sharingDonut || donutQuantity <= 0) return;
    setSharingDonut(true);
    try {
      await api('/lobby/donut-packs/share', { method: 'POST' });
      setDonutQuantity((v) => Math.max(0, v - 1));
    } catch (reason) { showToast(reason instanceof Error ? reason.message : 'Donut paketi paylaşılamadı.'); }
    finally { setSharingDonut(false); }
  }

  async function claimDonut(packId: string) {
    try {
      const result = await api<{ amount: number }>('/lobby/donut-packs/claim', { method: 'POST', body: JSON.stringify({ packId }) });
      showToast(`${result.amount.toLocaleString('tr-TR')} elmas kazandın!`);
    } catch (reason) { showToast(reason instanceof Error ? reason.message : 'Donut paketi açılamadı.'); }
  }

  return (
    <div className="lobby-layout lobby-chat-only">
      <section className="chat-card">
        <div className="chat-header">
          <div><p className="eyebrow">GENEL LOBİ</p><h3>Topluluk sohbeti</h3></div>
          <span className="online"><i /> canlı</span>
        </div>
        <div className="chat-messages" ref={chatRef} onScroll={onScroll}>
          {items.length === 0 ? (
            <p className="chat-empty">İlk mesajı sen gönder.</p>
          ) : (
            items.map((msg) => {
              const senderProfile = { username: msg.username, avatar_color: avatarColorFor(msg.username), avatar_url: msg.avatarUrl || null } as Profile;
              if (msg.kind === 'donut-pack' && msg.donutPack) {
                const pct = Math.round((msg.donutPack.claimedCount / msg.donutPack.maxClaims) * 100);
                const full = msg.donutPack.claimedCount >= msg.donutPack.maxClaims;
                return (
                  <div className="chat-message" key={msg.id} style={{ background: 'linear-gradient(90deg,#2a1030,#1a0b1f)', borderRadius: 10, padding: 10 }}>
                    <Avatar profile={senderProfile} size={30} showFrame={false} />
                    <div className="chat-msg-body" style={{ flex: 1 }}>
                      <strong>{msg.username} bir Paylaşımlı Donut Paketi açtı! 🎁</strong>
                      <p style={{ margin: '4px 0' }}>20 farklı oyuncuya toplam 5.000 elmas dağıtılır.</p>
                      <small>{msg.donutPack.claimedCount}/{msg.donutPack.maxClaims} kişi açtı · {msg.donutPack.remainingDiamonds.toLocaleString('tr-TR')} elmas kaldı</small>
                      <div style={{ height: 5, borderRadius: 3, background: '#3a2040', marginTop: 6, overflow: 'hidden' }}><div style={{ width: `${pct}%`, height: '100%', background: '#f4459b' }} /></div>
                    </div>
                    <button className="soft-button" disabled={full} onClick={() => void claimDonut(msg.donutPack!.packId)}>{full ? 'BİTTİ' : 'PAKETİ AÇ'}</button>
                  </div>
                );
              }
              return (
                <div className="chat-message" key={msg.id}>
                  <div onClick={(e) => { e.stopPropagation(); if (msg.userId) setMenuFor(menuFor === msg.id ? null : msg.id); }}>
                    <Avatar profile={senderProfile} size={30} showFrame={false} />
                  </div>
                  <div className="chat-msg-body">
                    <div className="chat-msg-header">
                      <strong>{msg.username}</strong>
                      {msg.level !== undefined && <span className="msg-level">Sv {msg.level}</span>}
                      {msg.titleId && <span className="msg-title">{titleNameFor(msg.titleId)}</span>}
                      <span className="msg-time">{formatTime(msg.createdAt)}</span>
                    </div>
                    <p>{msg.content}</p>
                  </div>
                  {menuFor === msg.id && msg.userId && (
                    <div className="msg-menu" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => { viewProfile(msg.userId!); setMenuFor(null); }}>Profili Gör</button>
                      {msg.userId !== profile.id && <button onClick={() => void addFriend(msg.userId!)}><UserPlus size={14} /> Arkadaş Ekle</button>}
                      <button onClick={() => { openPM(msg.userId!); setMenuFor(null); }}><MessageCircle size={14} /> Mesaj Gönder</button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        <form className="chat-form" onSubmit={sendMessage}>
          {showEmoji && (
            <div className="emoji-picker">
              {EMOJIS.map((e) => (
                <button key={e} type="button" onClick={() => { setText(text + e); setShowEmoji(false); }}>{e}</button>
              ))}
            </div>
          )}
          <button type="button" className="emoji-toggle" onClick={() => setShowEmoji(!showEmoji)}><Smile size={20} /></button>
          {donutQuantity > 0 && <button type="button" className="soft-button" disabled={sharingDonut} onClick={() => void shareDonut()}><Gift size={16} /> PAKET PAYLAŞ ×{donutQuantity}</button>}
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Lobiye bir mesaj bırak..." maxLength={400} />
          <button type="submit" className="send-donut" aria-label="Gönder"><Send size={17} /></button>
        </form>
      </section>
    </div>
  );
}
