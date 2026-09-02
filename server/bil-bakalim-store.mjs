import crypto from 'node:crypto';
import {advance, generateBoard, rankPlayers, validateSelection} from './bil-bakalim-engine.mjs';
import {availableBots} from './bots.mjs';

export const bilRooms = new Map();
export const bilMatches = new Map();

const now = () => Date.now();
const code = () => `BB-${crypto.randomInt(1000, 10000)}`;
const allowedCapacities = new Set([4, 8]);
const allowedCategories = new Set(['HAYVANLAR', 'SANATÇILAR', 'NESNELER', 'ŞARKI İSİMLERİ', 'YEMEKLER', 'KARIŞIK']);
const allowedDurations = new Set([30, 45, 60, 90]);

export function createBilRoom(user) {
  let roomCode;
  do roomCode = code(); while ([...bilRooms.values()].some(room => room.code === roomCode));
  const room = {
    id: crypto.randomUUID(),
    code: roomCode,
    hostUserId: user.id,
    status: 'LOBBY',
    capacity: 8,
    category: 'KARIŞIK',
    turnSeconds: 60,
    wordCount: 20,
    createdAt: now(),
    countdownEndsAt: null,
    lastInviteAt: 0,
    players: [{
      userId: user.id,
      username: user.username,
      avatarUrl: user.profile?.avatarUrl || '',
      titleId: user.selectedTitleId || 'title-1',
      frameId: user.profile?.selectedFrameId || null,
      ready: false,
      connected: true,
      joinedAt: now(),
      seat: 0,
    }],
    messages: [],
  };
  bilRooms.set(room.id, room);
  return room;
}

export const bilRoomByCode = value => [...bilRooms.values()].find(room => room.code === String(value || '').trim().toUpperCase());
export const bilRoomForUser = userId => [...bilRooms.values()].find(room => room.players.some(player => player.userId === userId) && room.status !== 'ENDED');

function nextSeat(room) {
  const used = new Set(room.players.map(player => player.seat));
  for (let seat = 0; seat < room.capacity; seat += 1) if (!used.has(seat)) return seat;
  return -1;
}

export function joinBilRoom(room, user) {
  if (room.status !== 'LOBBY') throw Error('Oyun zaten başladı.');
  if (room.players.some(player => player.userId === user.id)) return room;
  if (room.players.length >= room.capacity) throw Error('Oda dolu.');
  const seat = nextSeat(room);
  if (seat < 0) throw Error('Oda dolu.');
  room.players.push({
    userId: user.id,
    username: user.username,
    avatarUrl: user.profile?.avatarUrl || '',
    titleId: user.selectedTitleId || 'title-1',
    frameId: user.profile?.selectedFrameId || null,
    ready: false,
    connected: true,
    joinedAt: now(),
    seat,
  });
  room.players.sort((a, b) => a.seat - b.seat);
  cancelBilCountdown(room);
  return room;
}

export function addBilBots(room) {
  if (room.status !== 'LOBBY') throw Error('Oyun başladıktan sonra bot eklenemez.');
  const bots=availableBots(room.players.map(player=>player.userId),room.capacity-room.players.length);
  for(const bot of bots){const seat=nextSeat(room);room.players.push({userId:bot.id,username:bot.username,avatarUrl:bot.avatarUrl,titleId:bot.titleId,frameId:bot.frameId,bot:true,ready:true,connected:true,joinedAt:now(),seat});}
  evaluateBilCountdown(room);return bots.length;
}

export function leaveBilRoom(room, userId) {
  room.players = room.players.filter(player => player.userId !== userId);
  cancelBilCountdown(room);
  if (!room.players.length) {
    bilRooms.delete(room.id);
    return;
  }
  if (room.hostUserId === userId) room.hostUserId = [...room.players].sort((a, b) => a.joinedAt - b.joinedAt)[0].userId;
}

export function updateBilSettings(room, userId, changes = {}) {
  if (room.hostUserId !== userId) throw Error('Oda ayarlarını yalnızca kurucu değiştirebilir.');
  if (room.status !== 'LOBBY') throw Error('Oyun başladıktan sonra oda ayarları değiştirilemez.');
  const capacity = changes.capacity === undefined ? room.capacity : Number(changes.capacity);
  const category = changes.category === undefined ? room.category : String(changes.category);
  const turnSeconds = changes.turnSeconds === undefined ? room.turnSeconds : Number(changes.turnSeconds);
  if (!allowedCapacities.has(capacity)) throw Error('Oyuncu sayısı yalnızca 4 veya 8 olabilir.');
  if (capacity < room.players.length) throw Error('Mevcut oyuncu sayısından düşük kapasite seçilemez.');
  if (!allowedCategories.has(category)) throw Error('Geçersiz kelime kategorisi.');
  if (!allowedDurations.has(turnSeconds)) throw Error('Geçersiz tur süresi.');
  room.capacity = capacity;
  room.category = category;
  room.turnSeconds = turnSeconds;
  room.players.forEach(player => { player.ready = false; });
  cancelBilCountdown(room);
  return room;
}

export function toggleBilReady(room, userId) {
  if (room.status !== 'LOBBY') throw Error('Oyun zaten başladı.');
  const player = room.players.find(item => item.userId === userId);
  if (!player) throw Error('Bu odada değilsin.');
  player.ready = !player.ready;
  evaluateBilCountdown(room);
  return player.ready;
}

export function evaluateBilCountdown(room) {
  const canStart = room.status === 'LOBBY'
    && room.players.length === room.capacity
    && room.players.every(player => player.ready && player.connected);
  if (canStart && !room.countdownEndsAt) room.countdownEndsAt = now() + 5000;
  if (!canStart) cancelBilCountdown(room);
  return canStart;
}

export function cancelBilCountdown(room) {
  room.countdownEndsAt = null;
}

export function tickBilRoom(room) {
  if (room.status !== 'LOBBY' || !room.countdownEndsAt) return null;
  evaluateBilCountdown(room);
  if (room.countdownEndsAt && now() >= room.countdownEndsAt) return startBilMatch(room);
  return null;
}

export function startBilMatch(room, seed = crypto.randomInt(1, 2 ** 31 - 1)) {
  if (room.players.length !== room.capacity || !room.players.every(player => player.ready && player.connected)) throw Error('Bütün oyuncular hazır olmadan oyun başlayamaz.');
  const board = generateBoard(room.category, seed, 16);
  const players = Object.fromEntries(room.players.map(player => [player.userId, {
    userId: player.userId,
    username: player.username,
    avatarUrl: player.avatarUrl,
    titleId: player.titleId,
    frameId: player.frameId,
    seat: player.seat,
    connected: player.connected,
    score: 0,
    correct: 0,
    wrong: 0,
    timeouts: 0,
    selectionMs: 0,
  }]));
  const order = room.players.map(player => player.userId);
  const match = {
    id: crypto.randomUUID(),
    roomId: room.id,
    status: 'PLAYING',
    category: room.category,
    grid: board.grid,
    words: board.words,
    placements: board.placements,
    found: new Set(),
    processed: new Set(),
    players,
    order,
    activeUserId: order[0],
    turnSeconds: room.turnSeconds,
    turnEndsAt: now() + room.turnSeconds * 1000,
    turnStartedAt: now(),
    turnCount: 1,
    startedAt: now(),
    endedAt: null,
    rewardsApplied: false,
  };
  bilMatches.set(match.id, match);
  room.status = 'PLAYING';
  room.matchId = match.id;
  room.countdownEndsAt = null;
  return match;
}

export function tickBilMatch(match) {
  if (match.status !== 'PLAYING') return;
  const active=match.players[match.activeUserId];
  if(active?.bot){match.botNextAt??=now()+1200+Math.floor(Math.random()*1800);if(now()>=match.botNextAt){match.botNextAt=now()+1200+Math.floor(Math.random()*1800);const remaining=match.placements.filter(item=>!match.found.has(item.word));if(remaining.length&&Math.random()>.18){const choice=remaining[Math.floor(Math.random()*remaining.length)];makeBilSelection(match,match.activeUserId,choice.start,choice.end,crypto.randomUUID());}else advance(match);}return;}
  if (now() < match.turnEndsAt) return;
  const current = match.players[match.activeUserId];
  if (current) current.timeouts += 1;
  advance(match);
  match.turnStartedAt = now();
}

export function makeBilSelection(match, userId, start, end, requestId) {
  tickBilMatch(match);
  const beforeUser = match.activeUserId;
  const before = now();
  const result = validateSelection(match, userId, start, end, requestId, before);
  const player = match.players[userId];
  if (player && beforeUser === userId) player.selectionMs += Math.max(0, before - match.turnStartedAt);
  if (result.turnAdvanced) match.turnStartedAt = now();
  if (match.status === 'FINISHED' && !match.endedAt) match.endedAt = now();
  return result;
}

export function publicBilRoom(room) {
  tickBilRoom(room);
  return {
    id: room.id,
    code: room.code,
    hostUserId: room.hostUserId,
    status: room.status,
    capacity: room.capacity,
    category: room.category,
    turnSeconds: room.turnSeconds,
    wordCount: room.wordCount,
    countdownEndsAt: room.countdownEndsAt,
    matchId: room.matchId || null,
    players: room.players.map(player => ({...player})),
    messages: room.messages.slice(-80),
  };
}

export function publicBilMatch(match) {
  tickBilMatch(match);
  return {
    id: match.id,
    status: match.status,
    category: match.category,
    grid: match.grid,
    words: match.words,
    found: [...match.found],
    players: Object.values(match.players).map(player => ({...player})),
    order: match.order,
    activeUserId: match.activeUserId,
    turnEndsAt: match.turnEndsAt,
    turnSeconds: match.turnSeconds,
    turnCount: match.turnCount,
    startedAt: match.startedAt,
    endedAt: match.endedAt,
    results: match.status === 'FINISHED' ? rankPlayers(match.players) : null,
  };
}

export function addBilChat(room, userId, content) {
  const player = room.players.find(item => item.userId === userId);
  if (!player) throw Error('Bu odada değilsin.');
  const item = {
    id: crypto.randomUUID(),
    userId,
    username: player.username,
    avatarUrl: player.avatarUrl,
    titleId: player.titleId,
    content,
    createdAt: now(),
  };
  room.messages.push(item);
  room.messages = room.messages.slice(-100);
  return item;
}
