import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const port = 8897;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bilio-auth-'));
const dbPath = path.join(tmp, 'data.json');
let proc;
let cookie = '';
const base = `http://127.0.0.1:${port}`;

const wait = async () => {
  for (let i = 0; i < 80; i += 1) {
    try { const response = await fetch(`${base}/api/me`); if (response.status === 401) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 40));
  }
  throw new Error('API başlamadı');
};
async function json(url, options = {}) {
  const headers = {...(options.headers || {})};
  if (cookie) headers.cookie = cookie;
  if (options.body) headers['content-type'] = 'application/json';
  const response = await fetch(base + url, {...options, headers});
  return [response, await response.json()];
}

test.before(async () => {
  proc = spawn(process.execPath, ['server/auth-server.mjs'], {cwd: process.cwd(), env: {...process.env, BILIO_API_PORT: String(port), BILIO_DB_PATH: dbPath}, stdio: 'ignore'});
  await wait();
});
test.after(() => { proc?.kill(); fs.rmSync(tmp, {recursive: true, force: true}); });

test('misafir oyun API erişimi reddedilir', async () => {
  const [vampire] = await json('/api/game/vampire/active');
  const [bil] = await json('/api/game/bil-bakalim/active');
  assert.equal(vampire.status, 401);
  assert.equal(bil.status, 401);
});

test('kayıt ödülü, mesaj ve bildirim tek işlemde oluşturulur ve oturumlar arasında korunur', async () => {
  const [response, result] = await json('/api/register', {method: 'POST', body: JSON.stringify({username: 'TestOyuncu', password: 'Guvenli123', passwordRepeat: 'Guvenli123'})});
  assert.equal(response.status, 201);
  assert.equal(result.user.gold, 5000);
  assert.equal(result.user.diamonds, 1000);
  assert.equal(result.user.unreadMessages, 1);
  assert.equal(result.user.unreadNotifications, 1);
  assert.equal(result.user.level, 1);
  cookie = response.headers.get('set-cookie').split(';')[0];

  const [messagesResponse, messages] = await json('/api/messages');
  assert.equal(messagesResponse.status, 200);
  assert.equal(messages.items.length, 1);
  assert.equal(messages.items[0].body, 'Bilio’ya hoş geldin! Kayıt olduğun için teşekkür eder, iyi eğlenceler dileriz.');
  assert.equal(messages.items[0].details, 'Kayıt ödüllerin: 5.000 altın ve 1.000 elmas.');
  const [, notifications] = await json('/api/notifications');
  assert.equal(notifications.items.length, 1);

  const [readResponse] = await json(`/api/messages/${messages.items[0].id}/read`, {method: 'POST'});
  assert.equal(readResponse.status, 200);
  let [, me] = await json('/api/me');
  assert.equal(me.user.unreadMessages, 0);
  assert.equal(me.user.gold, 5000);
  assert.equal(me.user.diamonds, 1000);

  await json('/api/logout', {method: 'POST'});
  cookie = '';
  const [loginResponse, login] = await json('/api/login', {method: 'POST', body: JSON.stringify({username: 'TestOyuncu', password: 'Guvenli123'})});
  assert.equal(loginResponse.status, 200);
  cookie = loginResponse.headers.get('set-cookie').split(';')[0];
  [, me] = await json('/api/me');
  assert.equal(me.user.gold, 5000);
  assert.equal(me.user.diamonds, 1000);

  const disk = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  const player = disk.users.find(user => user.username === 'TestOyuncu');
  assert.equal(player.registrationRewardGranted, true);
  assert.equal(player.gold, 5000);
  assert.equal(player.diamonds, 1000);
  assert.equal(player.messages.length, 1);
  assert.equal(player.notifications.length, 1);
});

test('aynı kullanıcı adı büyük küçük harf farkıyla tekrar alınamaz', async () => {
  const [response] = await json('/api/register', {method: 'POST', body: JSON.stringify({username: 'testoyuncu', password: 'Guvenli123', passwordRepeat: 'Guvenli123'})});
  assert.equal(response.status, 409);
});

test('yanlış şifre güvenli hata döndürür', async () => {
  const [response, result] = await json('/api/login', {method: 'POST', body: JSON.stringify({username: 'TestOyuncu', password: 'yanlis123'})});
  assert.equal(response.status, 401);
  assert.equal(result.error, 'Kullanıcı adı veya şifre hatalı.');
});
