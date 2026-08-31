import crypto from 'node:crypto';
import {assignRoles, DEFAULT_DURATIONS, winner, resolveNight, resolveVote} from './vampire-engine.mjs';
import {availableBots} from './bots.mjs';

export const rooms = new Map();
export const matches = new Map();
export const invites = [];

const roomCode = () => `VK-${crypto.randomInt(1000, 10000)}`;
const now = () => Date.now();
const connectedWindowMs = 12_000;

export const roleTR = (role) => ({
  VAMPIRE: 'Vampir', SEER: 'Kahin', DOCTOR: 'Doktor', VILLAGER: 'Köylü',
})[role];

const safeProfile = (user) => ({
  avatarUrl: user.profile?.avatarUrl || '',
  frameId: user.profile?.selectedFrameId || null,
});

const makeRoomPlayer = (user) => ({
  userId: user.id,
  username: user.username,
  ready: false,
  connected: true,
  lastSeenAt: now(),
  joinedAt: now(),
  ...safeProfile(user),
});

export function createRoom(user) {
  let code;
  do code = roomCode(); while ([...rooms.values()].some((room) => room.code === code));
  const room = {
    id: crypto.randomUUID(),
    code,
    hostUserId: user.id,
    status: 'LOBBY',
    minPlayers: 8,
    maxPlayers: 12,
    nightDuration: DEFAULT_DURATIONS.night,
    discussionDuration: DEFAULT_DURATIONS.discussion,
    votingDuration: DEFAULT_DURATIONS.voting,
    createdAt: now(),
    countdownEndsAt: null,
    players: [makeRoomPlayer(user)],
    messages: [],
  };
  rooms.set(room.id, room);
  return room;
}

export const roomByCode = (code) => [...rooms.values()]
  .find((room) => room.code === String(code).toUpperCase());

export const roomForUser = (id) => [...rooms.values()]
  .find((room) => room.players.some((player) => player.userId === id) && room.status !== 'ENDED');

export function joinRoom(room, user) {
  if (room.status !== 'LOBBY') throw Error('Oyun başlamış.');
  if (room.players.length >= 12) throw Error('Oda dolu.');
  const existing = room.players.find((player) => player.userId === user.id);
  if (existing) {
    Object.assign(existing, safeProfile(user), {connected: true, lastSeenAt: now()});
    return room;
  }
  room.players.push(makeRoomPlayer(user));
  cancelCountdown(room);
  sys(room, `${user.username} odaya katıldı.`);
  return room;
}

export function addVampireBots(room) {
  if(room.status!=='LOBBY')throw Error('Oyun başladıktan sonra bot eklenemez.');
  const bots=availableBots(room.players.map(player=>player.userId),room.maxPlayers-room.players.length);
  for(const bot of bots)room.players.push({...makeRoomPlayer(bot),bot:true,ready:true});
  evaluate(room);return bots.length;
}

export function touchPlayer(room, user) {
  const player = room?.players.find((item) => item.userId === user.id);
  if (!player) return;
  player.connected = true;
  player.lastSeenAt = now();
  Object.assign(player, safeProfile(user));
  const match = room.matchId ? matches.get(room.matchId) : null;
  const matchPlayer = match?.players[user.id];
  if (matchPlayer) {
    matchPlayer.connected = true;
    matchPlayer.lastSeenAt = now();
    Object.assign(matchPlayer, safeProfile(user));
  }
}

export function updateConnections(room, timestamp = now()) {
  for (const player of room.players) {
    player.connected = player.bot || timestamp - (player.lastSeenAt || 0) <= connectedWindowMs;
    const matchPlayer = room.matchId ? matches.get(room.matchId)?.players[player.userId] : null;
    if (matchPlayer) matchPlayer.connected = player.connected;
  }
}

export function leaveRoom(room, userId) {
  const player = room.players.find((item) => item.userId === userId);
  const match = room.matchId ? matches.get(room.matchId) : null;
  const matchPlayer = match?.players[userId];

  if (matchPlayer && room.status === 'PLAYING') {
    matchPlayer.left = true;
    matchPlayer.connected = false;
    matchPlayer.spectating = false;
    if (matchPlayer.alive) matchPlayer.alive = false;
    delete match.votes[userId];
    match.villageMessages = match.villageMessages.filter((message) => message.senderUserId !== userId || message.id);
    const win = winner(match);
    if (win && match.phase !== 'EXECUTION') endMatch(match, win);
  }

  room.players = room.players.filter((item) => item.userId !== userId);
  cancelCountdown(room);
  if (player && room.status === 'LOBBY') sys(room, `${player.username} odadan ayrıldı.`);
  if (room.hostUserId === userId && room.players.length) {
    room.hostUserId = [...room.players].sort((a, b) => a.joinedAt - b.joinedAt)[0].userId;
  }
  if (!room.players.length) {
    rooms.delete(room.id);
    if (match) matches.delete(match.id);
  }
}

export function setSpectating(room, userId) {
  const match = room.matchId ? matches.get(room.matchId) : null;
  const player = match?.players[userId];
  if (!player || player.alive || player.left) throw Error('Bu işlem yalnızca elenen oyuncular için kullanılabilir.');
  player.spectating = true;
  return true;
}

export function toggleReady(room, userId) {
  const player = room.players.find((item) => item.userId === userId);
  if (!player) throw Error('Odada değilsin.');
  player.ready = !player.ready;
  evaluate(room);
  return player.ready;
}

export function evaluate(room) {
  const eligible = room.players.length >= 8 && room.players.length <= 12;
  const ready = room.players.every((player) => player.ready && player.connected);
  if (eligible && ready && !room.countdownEndsAt) room.countdownEndsAt = now() + 5000;
  if (!eligible || !ready) cancelCountdown(room);
}

export const cancelCountdown = (room) => { room.countdownEndsAt = null; };

export function tickRoom(room, timestamp = now()) {
  updateConnections(room, timestamp);
  if (room.status === 'LOBBY' && room.countdownEndsAt && timestamp >= room.countdownEndsAt) {
    evaluate(room);
    if (room.countdownEndsAt && timestamp >= room.countdownEndsAt) return startMatch(room, timestamp);
  }
  return null;
}

export function startMatch(room, timestamp = now()) {
  const roles = assignRoles(room.players.map((player) => player.userId));
  const match = {
    id: crypto.randomUUID(),
    roomId: room.id,
    phase: 'ROLE_REVEAL',
    dayNumber: 1,
    phaseEndsAt: timestamp + DEFAULT_DURATIONS.roleReveal * 1000,
    winner: null,
    players: {},
    votes: {},
    vampireMessages: [],
    villageMessages: [],
    deadMessages: [],
    journal: [],
    phaseVersion: 1,
    resolvedPhaseVersion: 0,
    lastNightResult: null,
    execution: null,
  };
  for (const player of room.players) {
    match.players[player.userId] = {
      username: player.username,
      role: roles[player.userId],
      alive: true,
      connected: player.connected,
      lastSeenAt: player.lastSeenAt,
      nightTarget: null,
      spectating: false,
      left: false,
      avatarUrl: player.avatarUrl || '',
      frameId: player.frameId || null,
      bot: Boolean(player.bot),
    };
  }
  matches.set(match.id, match);
  room.status = 'PLAYING';
  room.matchId = match.id;
  room.countdownEndsAt = null;
  return match;
}

const enterPhase = (match, phase, durationSeconds, timestamp = now()) => {
  match.phase = phase;
  match.phaseVersion += 1;
  match.resolvedPhaseVersion = 0;
  match.phaseEndsAt = durationSeconds == null ? null : timestamp + durationSeconds * 1000;
};

const resolveOnce = (match, resolver) => {
  if (match.resolvedPhaseVersion === match.phaseVersion) return false;
  match.resolvedPhaseVersion = match.phaseVersion;
  resolver();
  return true;
};

const clearNight = (match) => Object.values(match.players).forEach((player) => { player.nightTarget = null; });

const endMatch = (match, result) => {
  match.winner = result;
  match.phase = 'GAME_OVER';
  match.phaseEndsAt = null;
  match.phaseVersion += 1;
  const room = rooms.get(match.roomId);
  if (room) room.status = 'PLAYING';
};

export function requiredNightActors(match) {
  return Object.entries(match.players)
    .filter(([, player]) => player.alive && !player.left && player.connected && player.role !== 'VILLAGER')
    .map(([id]) => id);
}

export function nightActionProgress(match) {
  const required = requiredNightActors(match);
  return {completed: required.filter((id) => match.players[id].nightTarget).length, required: required.length};
}

export function eligibleVoters(match) {
  return Object.entries(match.players)
    .filter(([, player]) => player.alive && !player.left && player.connected)
    .map(([id]) => id);
}

export function voteProgress(match) {
  const eligible = eligibleVoters(match);
  return {completed: eligible.filter((id) => match.votes[id]).length, required: eligible.length};
}

export function tickMatch(match, timestamp = now()) {
  if (!match || match.phase === 'GAME_OVER') return;
  const room = rooms.get(match.roomId);
  if (!room) return;
  updateConnections(room, timestamp);
  if(match.phase==='NIGHT')for(const [id,player] of Object.entries(match.players)){if(!player.bot||!player.alive||player.left||player.nightTarget||player.role==='VILLAGER')continue;const candidates=Object.entries(match.players).filter(([targetId,target])=>targetId!==id&&target.alive&&!target.left&&(player.role!=='VAMPIRE'||target.role!=='VAMPIRE')).map(([targetId])=>targetId);if(candidates.length)player.nightTarget=candidates[Math.floor(Math.random()*candidates.length)];}
  if(match.phase==='DAY_VOTING')for(const [id,player] of Object.entries(match.players)){if(!player.bot||!player.alive||player.left||match.votes[id])continue;const candidates=Object.entries(match.players).filter(([targetId,target])=>targetId!==id&&target.alive&&!target.left).map(([targetId])=>targetId);if(candidates.length)match.votes[id]={target:candidates[Math.floor(Math.random()*candidates.length)],abstain:false};}

  if (match.phase === 'DAY_VOTING') {
    const progress = voteProgress(match);
    if (progress.required > 0 && progress.completed >= progress.required) {
      finishVote(match, timestamp);
      return;
    }
  }

  if (!match.phaseEndsAt || timestamp < match.phaseEndsAt) return;

  if (match.phase === 'DAY_VOTING') { finishVote(match, timestamp); return; }
  if (match.phase === 'EXECUTION') { finishExecution(match, timestamp); return; }

  resolveOnce(match, () => {
    if (match.phase === 'ROLE_REVEAL') {
      enterPhase(match, 'NIGHT', room.nightDuration, timestamp);
      return;
    }
    if (match.phase === 'NIGHT') {
      const result = resolveNight(match);
      match.lastNightResult = result;
      match.journal.push(result.killed
        ? `${match.players[result.killed].username} gece hayatını kaybetti.`
        : 'Gece kimse hayatını kaybetmedi.');
      clearNight(match);
      const resultWinner = winner(match);
      if (resultWinner) { endMatch(match, resultWinner); return; }
      enterPhase(match, 'DAY_ANNOUNCEMENT', DEFAULT_DURATIONS.announcement, timestamp);
      return;
    }
    if (match.phase === 'DAY_ANNOUNCEMENT') {
      enterPhase(match, 'DAY_DISCUSSION', room.discussionDuration, timestamp);
      return;
    }
    if (match.phase === 'DAY_DISCUSSION') {
      match.votes = {};
      match.execution = null;
      enterPhase(match, 'DAY_VOTING', room.votingDuration, timestamp);
      return;
    }
  });
}

export function finishVote(match, timestamp = now()) {
  if (!match || match.phase !== 'DAY_VOTING') return null;
  let output = null;
  resolveOnce(match, () => {
    output = resolveVote(match);
    match.execution = output.eliminated
      ? {
          eliminatedId: output.eliminated,
          username: match.players[output.eliminated].username,
          role: match.players[output.eliminated].role,
          tie: false,
        }
      : {eliminatedId: null, username: null, role: null, tie: true};
    match.journal.push(output.eliminated
      ? `${match.players[output.eliminated].username} oylamayla elendi.`
      : 'Oylar eşit. Kimse elenmedi.');
    enterPhase(match, 'EXECUTION', DEFAULT_DURATIONS.execution, timestamp);
  });
  return output;
}

export function finishExecution(match, timestamp = now()) {
  if (!match || match.phase !== 'EXECUTION') return;
  resolveOnce(match, () => {
    const resultWinner = winner(match);
    if (resultWinner) { endMatch(match, resultWinner); return; }
    match.dayNumber += 1;
    match.execution = null;
    clearNight(match);
    enterPhase(match, 'NIGHT', rooms.get(match.roomId)?.nightDuration || DEFAULT_DURATIONS.night, timestamp);
  });
}

export const sys = (room, content) => room.messages.push({
  id: crypto.randomUUID(), system: true, content, createdAt: now(),
});

export function addDeadMessage(match, userId, content) {
  const player = match.players[userId];
  if (!player || player.alive || player.left) throw Error('Ölüler sohbetine erişemezsin.');
  const message = {id: crypto.randomUUID(), senderUserId: userId, username: player.username, content, createdAt: now()};
  match.deadMessages.push(message);
  return message;
}

export function publicRoom(room) {
  tickRoom(room);
  return {
    id: room.id,
    code: room.code,
    hostUserId: room.hostUserId,
    status: room.status,
    minPlayers: room.minPlayers,
    maxPlayers: room.maxPlayers,
    nightDuration: room.nightDuration,
    discussionDuration: room.discussionDuration,
    votingDuration: room.votingDuration,
    countdownEndsAt: room.countdownEndsAt,
    players: room.players.map((player) => ({...player})),
    messages: room.messages.slice(-60),
  };
}

export function privateMatch(match, userId) {
  tickMatch(match);
  const me = match.players[userId];
  if (!me || me.left) return null;
  const publicPlayers = Object.fromEntries(
    Object.entries(match.players)
      .filter(([, player]) => !player.left)
      .map(([id, player]) => [id, {
        username: player.username,
        alive: player.alive,
        connected: player.connected,
        spectating: player.spectating,
        avatarUrl: player.avatarUrl || '',
      frameId: player.frameId || null,
      bot: Boolean(player.bot),
      }]),
  );
  const nightProgress = nightActionProgress(match);
  const votingProgress = voteProgress(match);
  const output = {
    id: match.id,
    phase: match.phase,
    phaseVersion: match.phaseVersion,
    dayNumber: match.dayNumber,
    phaseEndsAt: match.phaseEndsAt,
    winner: match.winner,
    players: publicPlayers,
    journal: match.journal.slice(-20),
    villageMessages: match.villageMessages.slice(-80),
    myRole: me.role,
    myAlive: me.alive,
    mySpectating: me.spectating,
    myNightActionAccepted: Boolean(me.nightTarget),
    myVote: match.votes[userId] || null,
    votesCast: votingProgress.completed,
    votesRequired: votingProgress.required,
    nightActionsComplete: nightProgress.completed,
    nightActionsRequired: nightProgress.required,
    execution: match.execution ? {
      eliminatedId: match.execution.eliminatedId,
      username: match.execution.username,
      role: match.execution.role,
      tie: match.execution.tie,
    } : null,
  };
  if (!me.alive) output.deadMessages = match.deadMessages.slice(-80);
  if (me.role === 'VAMPIRE' && me.alive) {
    output.vampireIds = Object.keys(match.players)
      .filter((id) => match.players[id].role === 'VAMPIRE' && !match.players[id].left);
    if (match.phase === 'NIGHT') output.vampireMessages = match.vampireMessages.slice(-80);
  }
  if (match.phase === 'GAME_OVER') {
    output.roles = Object.fromEntries(
      Object.entries(match.players)
        .filter(([, player]) => !player.left)
        .map(([id, player]) => [id, player.role]),
    );
  }
  return output;
}

const authorityTimer = setInterval(() => {
  const timestamp = now();
  for (const room of rooms.values()) tickRoom(room, timestamp);
  for (const match of matches.values()) tickMatch(match, timestamp);
}, 250);
authorityTimer.unref?.();
