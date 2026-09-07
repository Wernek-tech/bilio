// ponytail: ported from the old Next.js bilio's curatedSongCatalog.ts — real, pre-verified public
// YouTube video IDs with a start offset + clip length. Playback stays on the official YouTube
// IFrame embed only (no audio file is downloaded/copied), same legal footing as the original.
export const SONGS = [
  { id: 'yt-tarkan-simarik', title: 'Şımarık', artist: 'Tarkan', videoId: 'cpp69ghR1IM', start: 38, duration: 15 },
  { id: 'yt-sezen-gulumse', title: 'Gülümse', artist: 'Sezen Aksu', videoId: 'qgfLk8Uksxo', start: 28, duration: 15 },
  { id: 'yt-hadise-dumtek', title: 'Düm Tek Tek', artist: 'Hadise', videoId: '-Nx6iVCaix0', start: 36, duration: 15 },
  { id: 'yt-sertab-everyway', title: 'Everyway That I Can', artist: 'Sertab Erener', videoId: 'j0_QrKnqd5E', start: 42, duration: 15 },
  { id: 'yt-aleyna-senolsan', title: 'Sen Olsan Bari', artist: 'Aleyna Tilki', videoId: 'yJpJCZYTL74', start: 35, duration: 15 },
  { id: 'yt-edis-martilar', title: 'Martılar', artist: 'Edis', videoId: 'NPUTdqYUa9A', start: 40, duration: 15 },
  { id: 'yt-murat-janti', title: 'Janti', artist: 'Murat Boz', videoId: 'QjRYopBRUIc', start: 34, duration: 15 },
  { id: 'yt-ezhel-geceler', title: 'Geceler', artist: 'Ezhel', videoId: 'XokJGO8ALVs', start: 31, duration: 15 },
  { id: 'yt-mvo-birderdim', title: 'Bir Derdim Var', artist: 'mor ve ötesi', videoId: '7RW8n4iXZbA', start: 43, duration: 15 },
  { id: 'yt-sfb-bikini', title: 'Bikinisinde Astronomi', artist: 'Son Feci Bisiklet', videoId: '4qo0rBaM4ZY', start: 31, duration: 15 },
];

function shuffle(items) { const a = [...items]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; }

// ponytail: correctIndex ships to the client along with the options (no server-side hiding) — this
// is a casual bot-filled party game, not ranked/competitive, so devtools-level cheating is an
// accepted ceiling. Add reveal-after-timeout hiding here if it ever needs to be cheat-proof.
export function buildSongQuestion(excludeIds = []) {
  const pool = SONGS.filter(s => !excludeIds.includes(s.id));
  const list = pool.length ? pool : SONGS;
  const song = list[Math.floor(Math.random() * list.length)];
  const kind = Math.random() < 0.5 ? 'ARTIST' : 'TITLE';
  const correct = kind === 'ARTIST' ? song.artist : song.title;
  const others = shuffle(SONGS.filter(s => s.id !== song.id));
  const wrong = [];
  for (const s of others) { const v = kind === 'ARTIST' ? s.artist : s.title; if (v !== correct && !wrong.includes(v)) wrong.push(v); if (wrong.length === 3) break; }
  const options = shuffle([correct, ...wrong]);
  return { songId: song.id, videoId: song.videoId, start: song.start, duration: song.duration, prompt: kind === 'ARTIST' ? 'Bu şarkıyı kim söylüyor?' : 'Bu şarkının adı nedir?', options, correctIndex: options.indexOf(correct) };
}
