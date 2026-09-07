// ponytail: real assets already existed on the server (dist/assets/streamers/streamer-01..60.png)
// but nothing ever wired them to the "streamer" name pool already in quiz-answers.mjs — the order
// matches 1:1 (streamer-01.png = index 0 = "Elraenn", etc; first 20 = TÜRKÇE, rest = YABANCI, same
// split categoryPool() already uses). This just teaches the quiz engine that mapping.
import { quizPools } from './quiz-answers.mjs';

const NAMES = quizPools.streamer;
const photoUrl = (index) => `/assets/streamers/streamer-${String(index + 1).padStart(2, '0')}.png`;

function shuffle(items) { const a = [...items]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; }

export function buildStreamerQuestion(category, excludeIndexes = []) {
  const rangeStart = category === 'YABANCI' ? 20 : 0;
  const rangeEnd = category === 'TÜRKÇE' ? 20 : NAMES.length;
  const pool = Array.from({ length: rangeEnd - rangeStart }, (_, i) => rangeStart + i).filter((i) => !excludeIndexes.includes(i));
  const candidates = pool.length ? pool : Array.from({ length: rangeEnd - rangeStart }, (_, i) => rangeStart + i);
  const index = candidates[Math.floor(Math.random() * candidates.length)];
  const correct = NAMES[index];
  const others = shuffle(Array.from({ length: NAMES.length }, (_, i) => i).filter((i) => i !== index));
  const wrong = others.slice(0, 3).map((i) => NAMES[i]);
  const options = shuffle([correct, ...wrong]);
  return { photoIndex: index, photoUrl: photoUrl(index), prompt: 'Bu yayıncı kim?', options, correctIndex: options.indexOf(correct) };
}
