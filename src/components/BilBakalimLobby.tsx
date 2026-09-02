import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, Bot as BotIcon, Check, ChevronRight, Copy, Crown, Play,
  Send, Settings as SettingsIcon, UserPlus, Users, X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Avatar } from '@/components/Avatar';
import {
  BB_CATEGORIES, BB_TURN_DURATIONS, BB_WORD_COUNTS, BB_CAPACITIES,
  formatTime,
} from '@/lib/constants';
import type { Bot, Profile, Room, RoomMember } from '@/lib/types';

type Props = {
  room: Room;
  profile: Profile;
  showToast: (m: string) => void;
  setPage: (p: any) => void;
  setActiveRoom: (r: Room | null) => void;
  onProfileUpdate: () => void;
  openPM: (id: string) => void;
  onStart: () => void;
};

export function BilBakalimLobby({ room, profile, showToast, setPage, setActiveRoom, onStart }: Props) {
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [bots, setBots] = useState<Bot[]>([]);
  const [chat, setChat] = useState<{ id: string; body: string; sender_id: string; is_bot: boolean; created_at: string }[]>([]);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [settings, setSettings] = useState({
    capacity: room.capacity,
    category: 'Karışık',
    turn_duration: 45,
    word_count: 20,
  });
  const [showSettings, setShowSettings] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  const isOwner = room.owner_id === profile.id;

  const loadMembers = useCallback(async () => {
    const [{ data: memberData, error: memberError }, { data: botData, error: botError }, { data: chatData, error: chatError }] = await Promise.all([
      supabase.from('room_members').select('*').eq('room_id', room.id),
      supabase.from('bots').select('*'),
      supabase.from('room_chat').select('id, body, sender_id, is_bot, created_at').eq('room_id', room.id).order('created_at', { ascending: false }).limit(30),
    ]);
    if (memberError) console.error('room_members load error:', memberError.message);
    if (botError) console.error('bots load error:', botError.message);
    if (chatError) console.error('room_chat load error:', chatError.message);
    const memberList = (memberData ?? []) as RoomMember[];
    const botList = (botData ?? []) as Bot[];
    setBots(botList);
    const humanIds = memberList.filter((m) => !m.is_bot).map((m) => m.user_id);
    const { data: profileData, error: profileError } = humanIds.length > 0
      ? await supabase.from('profiles').select('*').in('id', humanIds)
      : { data: [], error: null };
    if (profileError) console.error('profiles load error:', profileError.message);
    const profilesById = new Map((profileData ?? []).map((p) => [p.id, p]));
    for (const m of memberList) {
      if (m.is_bot) {
        m.bot = botList.find((b) => b.id === m.user_id) ?? null;
        m.profile = null;
      } else {
        m.profile = profilesById.get(m.user_id) ?? null;
        m.bot = null;
      }
    }
    setMembers(memberList);
    setChat(((chatData ?? []) as typeof chat).reverse());
  }, [room.id]);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  useEffect(() => {
    const channel = supabase.channel(`bb-lobby-${room.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_members', filter: `room_id=eq.${room.id}` }, () => loadMembers())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'room_chat', filter: `room_id=eq.${room.id}` }, () => loadMembers())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [room.id, loadMembers]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [chat]);

  async function copyCode() {
    try { await navigator.clipboard.writeText(room.code); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
  }

  async function leaveRoom() {
    const { error } = await supabase.from('room_members').delete().eq('room_id', room.id).eq('user_id', profile.id);
    if (error) {
      console.error('Odadan ayrılma hatası:', error.message);
      showToast('Odadan ayrılırken bir sorun oluştu.');
      return;
    }
    setActiveRoom(null);
    setPage('Oyunlar');
  }

  async function toggleReady() {
    const current = members.find((m) => m.user_id === profile.id);
    if (!current) { showToast('Oda üyeliğin bulunamadı.'); return; }
    const { error } = await supabase.from('room_members').update({ ready: !current.ready }).eq('room_id', room.id).eq('user_id', profile.id);
    if (error) {
      console.error('Hazır durumu güncelleme hatası:', error.message);
      showToast('Hazır durumu güncellenemedi.');
      return;
    }
    loadMembers();
  }

  async function inviteBot() {
    const filledIds = new Set(members.map((m) => m.user_id));
    const availableBot = bots.find((b) => !filledIds.has(b.id));
    if (!availableBot) { showToast('Tüm botlar odada.'); return; }
    if (members.length >= settings.capacity) { showToast('Oda dolu.'); return; }
    const { error } = await supabase.rpc('invite_bot_to_room', { p_room_id: room.id, p_bot_id: availableBot.id });
    if (error) {
      console.error('Bot davet hatası:', error.message);
      showToast(error.message || 'Bot davet edilemedi.');
      return;
    }
    showToast(`${availableBot.username} odaya eklendi.`);
    loadMembers();
  }

  async function invitePlayer() {
    const { data: lobbyMsg, error } = await supabase.from('lobby_messages').insert({
      sender_id: profile.id,
      body: `🎮 Bil Bakalım odasına oyuncu davet ediyor! Oda kodu: ${room.code} (${members.length}/${settings.capacity})`,
    }).select('id').maybeSingle();
    if (error) {
      console.error('Lobi davet hatası:', error.message);
      showToast('Davet gönderilemedi.');
      return;
    }
    if (lobbyMsg) showToast('Lobiye davet gönderildi!');
    else showToast('Davet gönderilemedi.');
  }

  async function sendChat(event: FormEvent) {
    event.preventDefault();
    if (!message.trim()) return;
    const body = message.trim();
    const { error } = await supabase.rpc('send_room_chat_message', { p_room_id: room.id, p_body: body });
    if (error) {
      console.error('Sohbet mesajı hatası:', error.message);
      showToast(error.message || 'Mesaj gönderilemedi.');
      return;
    }
    setMessage('');
    loadMembers();
  }

  async function updateSetting(key: string, value: number | string) {
    if (!isOwner) return;
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    const updatePayload = key === 'capacity'
      ? { capacity: value, settings: newSettings }
      : { settings: newSettings };
    const { error } = await supabase.from('rooms').update(updatePayload).eq('id', room.id);
    if (error) {
      console.error('Ayar güncelleme hatası:', error.message);
      showToast('Ayar güncellenemedi.');
    }
  }

  async function startGame() {
    if (!isOwner) { showToast('Sadece oda sahibi oyunu başlatabilir.'); return; }
    const realPlayers = members.filter((m) => !m.is_bot);
    if (!realPlayers.every((m) => m.ready)) { showToast('Tüm oyuncular hazır olmalı.'); return; }
    if (members.length < 1) { showToast('En az 1 oyuncu gerekli.'); return; }

    const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bil-bakalim`;
    const { data: sessionData } = await supabase.auth.getSession();
    try {
      const res = await fetch(fnUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionData.session?.access_token ?? ''}` },
        body: JSON.stringify({ action: 'start_match', room_id: room.id }),
      });
      if (!res.ok) { showToast('Oyun başlatılamadı. Sunucu hatası.'); return; }
      const data = await res.json();
      if (data.error) { showToast(data.error); return; }
      onStart();
    } catch (err) {
      console.error('Oyun başlatma hatası:', err);
      showToast('Oyun başlatılamadı. Lütfen tekrar deneyin.');
    }
  }

  const myMember = members.find((m) => m.user_id === profile.id);
  const allReady = members.filter((m) => !m.is_bot).every((m) => m.ready);

  return (
    <div className="game-lobby" style={{ '--c-primary': '#ffb86b', '--c-glow': '#ff9f4f', '--c-bg': '#382016', '--c-border': '#754133', '--c-text': '#ffd4ae' } as React.CSSProperties}>
      <div className="lobby-header">
        <button className="back-btn" onClick={leaveRoom}><ArrowLeft size={18} /> Geri</button>
        <img src="/bilio_logo.png" alt="Bilio" className="lobby-logo" />
        <h2 className="lobby-title">BİL BAKALIM</h2>
        <button className="code-btn" onClick={copyCode}>
          {copied ? <Check size={16} /> : <Copy size={16} />} {room.code}
        </button>
      </div>
      <div className="lobby-body">
        <div className="lobby-players">
          <div className="players-header">
            <h3>Oyuncular ({members.length}/{settings.capacity})</h3>
            {isOwner && (
              <button className="lobby-btn" style={{ padding: '6px 12px', fontSize: 11 }} onClick={() => setShowSettings(!showSettings)}>
                <SettingsIcon size={14} /> Ayarlar
              </button>
            )}
          </div>

          {showSettings && isOwner && (
            <div className="bb-settings-panel">
              <label>Kapasite
                <select value={settings.capacity} onChange={(e) => updateSetting('capacity', Number(e.target.value))}>
                  {BB_CAPACITIES.map((c) => <option key={c} value={c}>{c} oyuncu</option>)}
                </select>
              </label>
              <label>Kategori
                <select value={settings.category} onChange={(e) => updateSetting('category', e.target.value)}>
                  {BB_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label>Tur Süresi
                <select value={settings.turn_duration} onChange={(e) => updateSetting('turn_duration', Number(e.target.value))}>
                  {BB_TURN_DURATIONS.map((t) => <option key={t} value={t}>{t} sn</option>)}
                </select>
              </label>
              <label>Kelime Sayısı
                <select value={settings.word_count} onChange={(e) => updateSetting('word_count', Number(e.target.value))}>
                  {BB_WORD_COUNTS.map((w) => <option key={w} value={w}>{w}</option>)}
                </select>
              </label>
            </div>
          )}

          {!showSettings && (
            <div className="bb-settings-info">
              <span>Kategori: <b>{settings.category}</b></span>
              <span>Tur: <b>{settings.turn_duration}sn</b></span>
              <span>Kelime: <b>{settings.word_count}</b></span>
            </div>
          )}

          <div className="player-slots">
            {Array.from({ length: settings.capacity }).map((_, i) => {
              const m = members[i];
              if (!m) return (
                <div className="empty-slot" key={i}>
                  <Users size={20} />
                  <span>Oyuncu bekleniyor</span>
                  <small>Boş Koltuk</small>
                </div>
              );
              return (
                <div className="player-card" key={m.user_id}>
                  <Avatar profile={m.profile} bot={m.bot} size={48} showFrame showBotTag />
                  <div className="player-card-info">
                    <div className="player-name-row">
                      <strong>{m.profile?.username ?? m.bot?.username ?? 'Oyuncu'}</strong>
                      {room.owner_id === m.user_id && !m.is_bot && <Crown size={14} className="owner-icon" />}
                    </div>
                    {!m.is_bot && m.profile && <small>Sv {m.profile.level}</small>}
                    {!m.is_bot && m.profile?.title && <span className="msg-title">{m.profile.title}</span>}
                    {m.is_bot && <img src="/bilio_logo.png" alt="Bilio" className="bot-bilio-logo" />}
                    <span className={`ready-status ${m.ready ? 'ready' : 'waiting'}`}>{m.ready ? 'Hazır' : 'Bekliyor'}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="lobby-actions">
            {isOwner && <button className="lobby-btn invite" onClick={invitePlayer}><UserPlus size={16} /> Oyuncu Davet Et</button>}
            {isOwner && <button className="lobby-btn invite" onClick={inviteBot}><BotIcon size={16} /> Bot Davet Et</button>}
            <button className="lobby-btn ready" onClick={toggleReady}>
              {myMember?.ready ? 'Bekliyor' : 'Hazır'}
            </button>
            {isOwner && <button className="lobby-btn start" onClick={startGame} disabled={!allReady || members.length < 1}><Play size={16} /> Oyunu Başlat</button>}
            <button className="lobby-btn leave" onClick={leaveRoom}>Odadan Ayrıl</button>
          </div>
        </div>
        <div className="lobby-chat">
          <div className="chat-header"><h3>Oda Sohbeti</h3></div>
          <div className="chat-messages" ref={chatRef}>
            {chat.length === 0 ? <p className="chat-empty">Henüz mesaj yok.</p> : chat.map((msg) => {
              const sender = members.find((m) => m.user_id === msg.sender_id);
              return (
                <div className="chat-message" key={msg.id}>
                  <Avatar profile={sender?.profile} bot={sender?.bot} size={28} />
                  <div>
                    <strong>{sender?.profile?.username ?? sender?.bot?.username ?? 'Oyuncu'}</strong>
                    <p>{msg.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <form className="chat-form" onSubmit={sendChat}>
            <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Oda sohbetine yaz..." maxLength={400} />
            <button className="send-donut" aria-label="Gönder"><Send size={17} /></button>
          </form>
        </div>
      </div>
    </div>
  );
}
