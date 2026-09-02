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

test('mağaza yalnızca yeni paylaşımlı donut paketini gösterir', async () => {
  for (const category of ['EMOJİLER', 'UNVANLAR', 'ÇERÇEVELER', 'ROZETLER', 'HEDİYELER', 'TAKVİYELER']) {
    const [response, result] = await req(`/api/store/products?category=${encodeURIComponent(category)}`);
    assert.equal(response.status, 200);
    if(category==='HEDİYELER'){assert.equal(result.items.length,1);assert.equal(result.items[0].id,'gift-donut-pack');assert.equal(result.items[0].price,5000);assert.equal(result.items[0].currency,'gold')}
    else assert.deepEqual(result.items, [], `${category} eski satış ürünü taşımamalı`);
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

test('profil görüntüleme ve tekil beğeni sunucuda korunur', async () => {
  const ownerCookie=cookie;
  const [registerResponse, other]=await req('/api/register',{method:'POST',body:JSON.stringify({username:'BegeniTest',password:'Guvenli123',passwordRepeat:'Guvenli123'})});
  const otherCookie=registerResponse.headers.get('set-cookie').split(';')[0];
  cookie=ownerCookie;
  let [response,result]=await req(`/api/profiles/${other.user.id}`);assert.equal(response.status,200);assert.equal(result.profile.likeCount,0);assert.equal(result.profile.username,'BegeniTest');
  [response,result]=await req(`/api/profiles/${other.user.id}/like`,{method:'POST'});assert.equal(response.status,200);assert.equal(result.likeCount,1);
  [response]=await req(`/api/profiles/${other.user.id}/like`,{method:'POST'});assert.equal(response.status,409);
  cookie=otherCookie;[,result]=await req('/api/profile');assert.equal(result.profile.likeCount,1);
  cookie=ownerCookie;
});

test('donut paketi yalnızca farklı hesaplara birer kez ödül verir', async () => {
  const ownerCookie=cookie;
  let [response]=await req('/api/store/purchase',{method:'POST',body:JSON.stringify({productId:'gift-donut-pack',requestId:'donut-purchase-test'})});assert.equal(response.status,200);
  [response]=await req('/api/lobby/donut-packs/share',{method:'POST'});assert.equal(response.status,201);
  const [,messages]=await req('/api/lobby/messages?limit=100');const packItem=messages.items.find(item=>item.kind==='donut-pack');assert.ok(packItem);
  cookie='';const [registered]=await req('/api/register',{method:'POST',body:JSON.stringify({username:'PaketAcan',password:'Guvenli123',passwordRepeat:'Guvenli123'})});cookie=registered.headers.get('set-cookie').split(';')[0];const [claim,claimResult]=await req('/api/lobby/donut-packs/claim',{method:'POST',body:JSON.stringify({packId:packItem.donutPack.packId})});assert.equal(claim.status,200);assert.ok(claimResult.amount>=50);await new Promise(resolve=>setTimeout(resolve,510));const [duplicate]=await req('/api/lobby/donut-packs/claim',{method:'POST',body:JSON.stringify({packId:packItem.donutPack.packId})});assert.equal(duplicate.status,409);
  cookie=ownerCookie;const [selfClaim]=await req('/api/lobby/donut-packs/claim',{method:'POST',body:JSON.stringify({packId:packItem.donutPack.packId})});assert.equal(selfClaim.status,409);
});

test('lobide oyuncular gerçek hesapları arkadaş ekleyebilir ve durum profilde kalıcıdır', async () => {
  const firstCookie = cookie;
  const [registerResponse, second] = await req('/api/register', {method: 'POST', body: JSON.stringify({username: 'ArkadasTest', password: 'Guvenli123', passwordRepeat: 'Guvenli123'})});
  assert.equal(registerResponse.status, 201);
  const secondCookie = registerResponse.headers.get('set-cookie').split(';')[0];
  cookie = firstCookie;
  let [response] = await req('/api/friends/add', {method: 'POST', body: JSON.stringify({userId: second.user.id})});
  assert.equal(response.status, 200);
  let result;
  [response, result] = await req('/api/friends');
  assert.equal(response.status, 200); assert.equal(result.items[0].username, 'ArkadasTest'); assert.equal(result.items[0].online, true);
  cookie = secondCookie;
  [, result] = await req('/api/friends');
  assert.equal(result.items[0].username, 'ArayuzTest');
  cookie = firstCookie;
  let [messageResponse,messageResult]=await req(`/api/private-messages/${second.user.id}`,{method:'POST',body:JSON.stringify({content:'Özel merhaba'})});
  assert.equal(messageResponse.status,201);assert.equal(messageResult.item.content,'Özel merhaba');
  [messageResponse,messageResult]=await req(`/api/private-messages/${second.user.id}`);assert.equal(messageResponse.status,200);assert.equal(messageResult.items.length,1);
  [response]=await req('/api/friends/remove',{method:'POST',body:JSON.stringify({userId:second.user.id})});assert.equal(response.status,200);
  [response]=await req(`/api/private-messages/${second.user.id}`);assert.equal(response.status,403);
  [response]=await req('/api/friends/add',{method:'POST',body:JSON.stringify({userId:second.user.id})});assert.equal(response.status,200);
  [response]=await req(`/api/users/${second.user.id}/block`,{method:'POST'});assert.equal(response.status,200);
  [,result]=await req('/api/friends');assert.equal(result.items.some(item=>item.userId===second.user.id),false);
});

test('haftalık liderlik örnek oyuncu uydurmaz', async () => {
  const [response, result] = await req('/api/leaderboard?limit=100');
  assert.equal(response.status, 200); assert.deepEqual(result.rows, []); assert.equal(result.current, null);
});

test('çıkış yapan arkadaş çevrim dışı görünür', async () => {
  const ownerCookie=cookie;
  const [registered,friend]=await req('/api/register',{method:'POST',body:JSON.stringify({username:'CevrimDisiTest',password:'Guvenli123',passwordRepeat:'Guvenli123'})});
  const friendCookie=registered.headers.get('set-cookie').split(';')[0];
  cookie=ownerCookie;let [response]=await req('/api/friends/add',{method:'POST',body:JSON.stringify({userId:friend.user.id})});assert.equal(response.status,200);
  let [,result]=await req('/api/friends');assert.equal(result.items.find(item=>item.userId===friend.user.id).online,true);
  cookie=friendCookie;await req('/api/logout',{method:'POST'});
  cookie=ownerCookie;[,result]=await req('/api/friends');assert.equal(result.items.find(item=>item.userId===friend.user.id).online,false);
});
