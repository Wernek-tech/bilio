import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const port = 8898;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bilio-sections-'));
const dbPath = path.join(tmp, 'data.json');
let proc;
let cookie = '';
const base = `http://127.0.0.1:${port}`;
const wait = async () => { for (let i = 0; i < 80; i += 1) { try { const response = await fetch(base + '/api/me'); if (response.status === 401) return; } catch {} await new Promise(resolve => setTimeout(resolve, 40)); } throw Error('API başlamadı'); };
async function req(url, options = {}) { const headers = {...(options.headers || {})}; if (cookie) headers.cookie = cookie; if (options.body) headers['content-type'] = 'application/json'; const response = await fetch(base + url, {...options, headers}); const result = await response.json(); return [response, result]; }

async function login() {
  const [response] = await req('/api/login', {method: 'POST', body: JSON.stringify({username: 'ArayuzTest', password: 'Guvenli123'})});
  assert.equal(response.status, 200);
  cookie = response.headers.get('set-cookie').split(';')[0];
}

test.before(async () => {
  proc = spawn(process.execPath, ['server/auth-server.mjs'], {cwd: process.cwd(), env: {...process.env, BILIO_API_PORT: String(port), BILIO_DB_PATH: dbPath}, stdio: 'ignore'});
  await wait();
  const [response] = await req('/api/register', {method: 'POST', body: JSON.stringify({username: 'ArayuzTest', password: 'Guvenli123', passwordRepeat: 'Guvenli123'})});
  cookie = response.headers.get('set-cookie').split(';')[0];
});
test.after(() => { proc?.kill(); fs.rmSync(tmp, {recursive: true, force: true}); });

test('lobi başlangıçta sahte mesaj içermez ve gerçek mesaj kalıcıdır', async () => {
  let [response, result] = await req('/api/lobby/messages?limit=100');
  assert.equal(response.status, 200); assert.equal(result.items.length, 0);
  [response] = await req('/api/lobby/messages', {method: 'POST', body: JSON.stringify({content: 'Merhaba Bilio!'})});
  assert.equal(response.status, 201);
  [, result] = await req('/api/lobby/messages?limit=100');
  assert.equal(result.items.length, 1); assert.equal(result.items[0].content, 'Merhaba Bilio!'); assert.equal(result.items[0].username, 'ArayuzTest');
});

test('mağaza yeni özel ürünler eklenene kadar eski satış ürünlerini göstermez', async () => {
  for (const category of ['EMOJİLER', 'UNVANLAR', 'ÇERÇEVELER', 'ROZETLER', 'HEDİYELER', 'TAKVİYELER']) {
    const [response, result] = await req(`/api/store/products?category=${encodeURIComponent(category)}`);
    assert.equal(response.status, 200);
    assert.deepEqual(result.items, [], `${category} eski satış ürünü taşımamalı`);
  }
});

test('mağaza temizlenirken altın ve elmas bakiyesi korunur', async () => {
  const [purchaseResponse] = await req('/api/store/purchase', {method: 'POST', body: JSON.stringify({productId: 'emoji-kalp', requestId: 'eski-urun'})});
  assert.equal(purchaseResponse.status, 404);
  await req('/api/logout', {method: 'POST'}); cookie = ''; await login();
  const [, result] = await req('/api/me'); assert.equal(result.user.gold, 5000); assert.equal(result.user.diamonds, 1000);
});

test('profil gerçek hesap verisini döndürür ve düzenlemeler yeniden girişte kalıcıdır', async () => {
  let [response, result] = await req('/api/profile');
  assert.equal(response.status, 200); assert.equal(result.profile.username, 'ArayuzTest'); assert.equal(result.profile.stats.matches, 0);
  [response] = await req('/api/profile', {method: 'PUT', body: JSON.stringify({about: 'Bugün harikayım ✨', titleId: 'title-1', frameId: ''})});
  assert.equal(response.status, 200);
  await req('/api/logout', {method: 'POST'}); cookie = ''; await login();
  [, result] = await req('/api/profile');
  assert.equal(result.profile.about, 'Bugün harikayım ✨'); assert.equal(result.profile.selectedTitleId, 'title-1'); assert.equal(result.profile.username, 'ArayuzTest');
  assert.equal(result.profile.ownedTitleIds.length, 1); assert.equal(result.profile.badges.length, 36);
  assert.ok(result.profile.badges.every(item => item.assetPath && item.requirement));
  assert.ok(Array.isArray(result.profile.gifts)); assert.ok(Array.isArray(result.profile.achievements));
});

test('haftalık liderlik örnek oyuncu uydurmaz', async () => {
  const [response, result] = await req('/api/leaderboard?limit=100');
  assert.equal(response.status, 200); assert.deepEqual(result.rows, []); assert.equal(result.current, null);
});
