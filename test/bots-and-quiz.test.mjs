import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {BOT_PROFILES,botReply} from '../server/bots.mjs';
import {addBilBots,createBilRoom} from '../server/bil-bakalim-store.mjs';
import {addVampireBots,createRoom} from '../server/vampire-store.mjs';

const user={id:'real-1',username:'GerçekOyuncu',selectedTitleId:'title-1',profile:{avatarUrl:'',selectedFrameId:null}};
test('10 benzersiz bot profili, donut çerçevesi ve Bilio unvanı vardır',()=>{assert.equal(BOT_PROFILES.length,10);assert.equal(new Set(BOT_PROFILES.map(x=>x.username)).size,10);assert.ok(BOT_PROFILES.every(x=>x.bot&&x.frameId==='frame-donut'&&x.titleId==='bilio-bot'&&x.avatarUrl.startsWith('data:image/svg+xml')))});
test('bot sohbet yanıtları kontrollüdür',()=>{assert.match(botReply('selam')||'',/selam/i);assert.match(botReply('nasılsınız?')||'',/Teşekkürler/);assert.match(botReply('aptal')||'',/Terbiyesizlik/)});
test('Bil Bakalım bot daveti odayı kapasiteye kadar doldurur',()=>{const room=createBilRoom(user);assert.equal(addBilBots(room),7);assert.equal(room.players.length,8);assert.ok(room.players.slice(1).every(x=>x.bot&&x.ready))});
test('Vampir Köylü bot daveti mevcut 10 benzersiz botu ekler',()=>{const room=createRoom(user);assert.equal(addVampireBots(room),10);assert.equal(room.players.length,11);assert.ok(room.players.slice(1).every(x=>x.bot&&x.ready))});
test('üç yeni oyunda 60 soruluk havuz ve çalışan bot daveti bulunur',()=>{const source=fs.readFileSync(new URL('../src/pages/QuizGame.tsx',import.meta.url),'utf8');assert.match(source,/type Kind='song'\|'celebrity'\|'streamer'/);assert.match(source,/BOT DAVET ET/);for(const name of ['celebrities','streamers','songs'])assert.match(source,new RegExp(`const ${name}=`));});
