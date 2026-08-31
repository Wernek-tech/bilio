import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const port = 8899;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bilio-bb-api-'));
const dbPath = path.join(tmp, 'data.json');
const base = `http://127.0.0.1:${port}`;
let proc;
const cookies = [];

const wait = async () => {
  for (let i = 0; i < 80; i += 1) {
    try { const response = await fetch(`${base}/api/me`); if (response.status === 401) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 40));
  }
  throw new Error('API başlamadı');
};
async function request(index, url, options = {}) {
  const headers = {...(options.headers || {})};
  if (cookies[index]) headers.cookie = cookies[index];
  if (options.body) headers['content-type'] = 'application/json';
  const response = await fetch(base + url, {...options, headers});
  const result = await response.json();
  return [response, result];
}

async function register(index) {
  const [response] = await request(index, '/api/register', {method: 'POST', body: JSON.stringify({username: `GercekOyuncu${index + 1}`, password: 'Guvenli123', passwordRepeat: 'Guvenli123'})});
  assert.equal(response.status, 201);
  cookies[index] = response.headers.get('set-cookie').split(';')[0];
}

function findWord(grid, words) {
  const dirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]];
  for (const word of words) {
    for (let y = 0; y < grid.length; y += 1) for (let x = 0; x < grid.length; x += 1) for (const [dx, dy] of dirs) {
      const ex = x + dx * (word.length - 1), ey = y + dy * (word.length - 1);
      if (ex < 0 || ey < 0 || ex >= grid.length || ey >= grid.length) continue;
      let value = '';
      for (let i = 0; i < word.length; i += 1) value += grid[y + dy * i][x + dx * i];
      if (value === word) return {word, start: [x, y], end: [ex, ey]};
    }
  }
  throw new Error('Tahtada hedef kelime bulunamadı');
}

test.before(async () => {
  proc = spawn(process.execPath, ['server/auth-server.mjs'], {cwd: process.cwd(), env: {...process.env, BILIO_API_PORT: String(port), BILIO_DB_PATH: dbPath}, stdio: 'ignore'});
  await wait();
  for (let i = 0; i < 8; i += 1) await register(i);
});
test.after(() => { proc?.kill(); fs.rmSync(tmp, {recursive: true, force: true}); });

test('Bil Bakalım lobisi yalnızca gerçek katılımcıları gösterir, sahte mesaj içermez ve gerçek oda kodu üretir', async () => {
  let [response, result] = await request(0, '/api/game/bil-bakalim/create', {method: 'POST'});
  assert.equal(response.status, 200);
  assert.match(result.room.code, /^BB-\d{4}$/);
  assert.equal(result.room.code === 'BB-2048', false);
  assert.equal(result.room.players.length, 1);
  assert.equal(result.room.players[0].username, 'GercekOyuncu1');
  assert.equal(result.room.hostUserId, result.room.players[0].userId);
  assert.equal(result.room.messages.length, 0);
  assert.equal(result.room.capacity, 8);

  const code = result.room.code;
  for (let i = 1; i < 8; i += 1) {
    [response, result] = await request(i, '/api/game/bil-bakalim/join', {method: 'POST', body: JSON.stringify({code})});
    assert.equal(response.status, 200);
    assert.equal(result.room.players.length, i + 1);
    assert.equal(result.room.players[i].username, `GercekOyuncu${i + 1}`);
  }
  [, result] = await request(0, '/api/game/bil-bakalim/active');
  assert.equal(result.room.players.length, 8);
  assert.deepEqual(result.room.players.map(player => player.username), Array.from({length: 8}, (_, i) => `GercekOyuncu${i + 1}`));
  assert.equal(result.room.messages.length, 0);
});

test('yalnızca kurucu ayarları değiştirebilir ve gerçek sohbet mesajı kalıcı oda durumuna girer', async () => {
  let [response] = await request(1, '/api/game/bil-bakalim/settings', {method: 'POST', body: JSON.stringify({category: 'HAYVANLAR'})});
  assert.equal(response.status, 403);
  [response] = await request(0, '/api/game/bil-bakalim/settings', {method: 'POST', body: JSON.stringify({category: 'HAYVANLAR', turnSeconds: 30})});
  assert.equal(response.status, 200);
  [response] = await request(2, '/api/game/bil-bakalim/chat', {method: 'POST', body: JSON.stringify({content: 'Gerçek oda mesajı'})});
  assert.equal(response.status, 201);
  const [, state] = await request(0, '/api/game/bil-bakalim/active');
  assert.equal(state.room.messages.length, 1);
  assert.equal(state.room.messages[0].username, 'GercekOyuncu3');
  assert.equal(state.room.messages[0].content, 'Gerçek oda mesajı');
});

test('sekiz gerçek oyuncu hazır olduğunda geri sayım başlar ve sunucu gerçek maç tahtası üretir', async () => {
  for (let i = 0; i < 8; i += 1) {
    const [response] = await request(i, '/api/game/bil-bakalim/ready', {method: 'POST'});
    assert.equal(response.status, 200);
  }
  let [, state] = await request(0, '/api/game/bil-bakalim/active');
  assert.ok(state.room.countdownEndsAt > Date.now());
  await new Promise(resolve => setTimeout(resolve, 5200));
  [, state] = await request(0, '/api/game/bil-bakalim/active');
  assert.equal(state.room.status, 'PLAYING');
  assert.equal(state.match.status, 'PLAYING');
  assert.equal(state.match.players.length, 8);
  assert.equal(state.match.words.length, 20);
  assert.equal(state.match.grid.length, 16);
  assert.equal('placements' in state.match, false, 'çözüm koordinatları istemciye sızmamalı');
});

test('doğru seçim gerçek tahta üzerinden doğrulanır ve aynı oyuncunun sırası devam eder', async () => {
  const [, state] = await request(0, '/api/game/bil-bakalim/active');
  const activeIndex = state.match.players.findIndex(player => player.userId === state.match.activeUserId);
  const found = findWord(state.match.grid, state.match.words);
  const [response, result] = await request(activeIndex, '/api/game/bil-bakalim/select', {method: 'POST', body: JSON.stringify({start: found.start, end: found.end, requestId: 'gercek-secim-1'})});
  assert.equal(response.status, 200);
  assert.equal(result.result.ok, true);
  assert.equal(result.result.word, found.word);
  assert.equal(result.match.activeUserId, state.match.activeUserId);
  assert.ok(result.match.found.includes(found.word));
});

test('Bil Bakalım istemcisinde sahte oyuncu, hardcoded oda, kelime-listesi hilesi ve debug kontrolü bulunmaz', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'src/pages/BilBakalimGame.tsx'), 'utf8');
  for (const banned of ['OyunCanavarı', 'BilgeAdam', 'NeşeliPenguen', 'MüzikKralı', 'ÇizgiKağan', 'TahminUstası', 'GeceKöylüsü', 'YayıncıPro', 'BB-2048', 'HATALI SEÇİMİ TEST ET']) assert.equal(source.includes(banned), false, `${banned} bulunmamalı`);
  assert.equal(/match\.words\.map\([^)]*<button/.test(source), false, 'kelime listesi buton olmamalı');
  assert.equal(source.includes("correct('KAPLAN')"), false, 'hardcoded KAPLAN hücresi olmamalı');
});
