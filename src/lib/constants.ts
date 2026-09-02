import type { GameDef } from './types';

export const GAMES: GameDef[] = [
  { name: 'Bil Bakalım', description: 'Gizli kelimeleri bul, takımınla zirveye çık.', players: '2–8 oyuncu', color: 'gold', icon: '✦', mode: 'Çok oyunculu', maxPlayers: 8 },
  { name: 'Şarkıyı Bil', description: 'Nakaratı yakala, müzik hafızanı konuştur.', players: '2–8 oyuncu', color: 'pink', icon: '♫', mode: 'Çok oyunculu', maxPlayers: 8 },
  { name: 'Tahmin Et Kim', description: 'İpuçlarını takip et, ünlüyü ilk sen bul.', players: '2–8 oyuncu', color: 'peach', icon: '?', mode: 'Çok oyunculu', maxPlayers: 8 },
  { name: 'Yayıncı Kim', description: 'Ekrandaki yayıncıyı ne kadar iyi tanıyorsun?', players: '2–8 oyuncu', color: 'blue', icon: '◉', mode: 'Çok oyunculu', maxPlayers: 8 },
  { name: 'Adam Asmaca', description: 'Harfleri seç, kelimeyi tamamla, turu kazan.', players: '1–8 oyuncu', color: 'green', icon: '⌁', mode: 'Tek / Çok oyunculu', maxPlayers: 8 },
  { name: 'Vampir Köylü', description: 'Rolünü gizle, köyü koru veya geceyi yönet.', players: '8–12 oyuncu', color: 'red', icon: '◇', mode: 'Çok oyunculu', maxPlayers: 12 },
  { name: 'Çiz ve Bil', description: 'Çiz, tahmin et, en eğlenceli kelime oyunu.', players: '2–8 oyuncu', color: 'purple', icon: '✎', mode: 'Çok oyunculu', maxPlayers: 8 },
];

export const GAME_COLORS: Record<string, { primary: string; glow: string; bg: string; border: string; text: string }> = {
  gold: { primary: '#ffb86b', glow: '#ff9f4f', bg: '#382016', border: '#754133', text: '#ffd4ae' },
  pink: { primary: '#ff8fb9', glow: '#ff4f91', bg: '#38152b', border: '#7a2d50', text: '#ff9dbd' },
  peach: { primary: '#f5a378', glow: '#e8945a', bg: '#46201e', border: '#8a4a3c', text: '#f5c8b0' },
  blue: { primary: '#88f2e2', glow: '#167d91', bg: '#172b39', border: '#2a5a6e', text: '#88f2e2' },
  green: { primary: '#9bf59b', glow: '#317854', bg: '#172b22', border: '#2a5a44', text: '#9bf59b' },
  red: { primary: '#ff9099', glow: '#913f4e', bg: '#35141b', border: '#7a2d3a', text: '#ff9099' },
  purple: { primary: '#c8a8ff', glow: '#7d4fd0', bg: '#2a1a3a', border: '#5a3a7a', text: '#c8a8ff' },
};

export const BOT_NAMES = [
  'Milla<3', 'Hakan', 'Mertbabapro', 'MssSelin', 'Mr.Felaket',
  'MssFelaket', 'Masal', 'Netro', 'Abady', 'SultanSülüman',
];

export const TURKISH_ALPHABET = [
  'A','B','C','Ç','D','E','F','G','Ğ','H',
  'I','İ','J','K','L','M','N','O','Ö','P',
  'R','S','Ş','T','U','Ü','V','Y','Z',
];

export const EMOJIS = ['😀','😂','🥰','😎','🤔','😮','😢','😡','👍','👎','❤️','🔥','✨','🎉','🎯','🎲','🍩','☕','🎵','🎮','🏆','💎','🤝','👋','😅','🤣','😌','🥳','😱','🤯'];

export const TITLES = [
  { name: '', level: 1 },
  { name: 'Acemi', level: 1 },
  { name: 'Meraklı', level: 2 },
  { name: 'Çaylak', level: 3 },
  { name: 'Uzman', level: 5 },
  { name: 'Hünerli', level: 7 },
  { name: 'Şampiyon', level: 10 },
  { name: 'Kahraman', level: 13 },
  { name: 'Kral', level: 17 },
  { name: 'İmparator', level: 20 },
  { name: 'Efsane', level: 25 },
  { name: 'Bilio Yıldızı', level: 30 },
  { name: 'Donut Kralı', level: 35 },
  { name: 'Bilgi Üstadı', level: 40 },
  { name: 'Oyun İmparatoru', level: 45 },
  { name: 'Bilio Efsanesi', level: 50 },
  { name: 'Sınırsız', level: 55 },
  { name: 'Zirve', level: 60 },
  { name: 'Rüya', level: 65 },
  { name: 'Vizyon', level: 70 },
  { name: 'Sonsuzluk', level: 75 },
  { name: 'Evrensel', level: 80 },
  { name: 'Aşkın', level: 85 },
  { name: 'Yüce', level: 90 },
  { name: 'Mutlak', level: 95 },
  { name: 'Tanrısal', level: 100 },
];

export const formatNumber = (value: number): string => new Intl.NumberFormat('tr-TR').format(value);

export const formatTime = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
};

export const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });
};

export const xpForLevel = (level: number): number => level * 1000;
export const xpProgress = (xp: number): number => Math.min(100, Math.round((xp % 1000) / 10));

export const generateRoomCode = (): string => Math.random().toString(36).slice(2, 8).toUpperCase();

export const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

export const BB_CATEGORIES = ['Hayvanlar', 'Sanatçılar', 'Nesneler', 'Şarkı İsimleri', 'Yemekler', 'Karışık'];
export const BB_TURN_DURATIONS = [30, 45, 60, 90];
export const BB_WORD_COUNTS = [10, 15, 20, 25];
export const BB_CAPACITIES = [4, 8];
