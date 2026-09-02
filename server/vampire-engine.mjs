import crypto from 'node:crypto';

export const PHASES = [
  'LOBBY',
  'ROLE_REVEAL',
  'NIGHT',
  'DAY_ANNOUNCEMENT',
  'DAY_DISCUSSION',
  'DAY_VOTING',
  'EXECUTION',
  'GAME_OVER',
];

export const DEFAULT_DURATIONS = Object.freeze({
  roleReveal: 4,
  night: 15,
  announcement: 5,
  discussion: 30,
  voting: 20,
  execution: 6,
});

export const roleCounts = (count) => ({
  VAMPIRE: 2,
  SEER: 1,
  DOCTOR: 1,
  VILLAGER: count - 4,
});

export function assignRoles(ids, rng = crypto.randomInt) {
  if (ids.length < 8 || ids.length > 12) throw Error('8–12 oyuncu gerekli');
  const roles = ['VAMPIRE', 'VAMPIRE', 'SEER', 'DOCTOR', ...Array(ids.length - 4).fill('VILLAGER')];
  const pool = [...roles];
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const randomIndex = rng(index + 1);
    [pool[index], pool[randomIndex]] = [pool[randomIndex], pool[index]];
  }
  return Object.fromEntries(ids.map((id, index) => [id, pool[index]]));
}

export function winner(match) {
  const alive = Object.values(match.players).filter((player) => player.alive && !player.left);
  const vampires = alive.filter((player) => player.role === 'VAMPIRE').length;
  const village = alive.length - vampires;
  if (vampires === 0) return 'VILLAGE';
  if (vampires >= village) return 'VAMPIRES';
  return null;
}

export function resolveNight(match) {
  const aliveVampires = Object.entries(match.players)
    .filter(([, player]) => player.alive && !player.left && player.role === 'VAMPIRE');
  let target = null;
  if (aliveVampires.length === 1) target = aliveVampires[0][1].nightTarget || null;
  if (
    aliveVampires.length >= 2
    && aliveVampires.every(([, player]) => player.nightTarget)
    && aliveVampires.every(([, player]) => player.nightTarget === aliveVampires[0][1].nightTarget)
  ) target = aliveVampires[0][1].nightTarget;

  const doctor = Object.values(match.players)
    .find((player) => player.alive && !player.left && player.role === 'DOCTOR');
  const protectedId = doctor?.nightTarget || null;
  const killed = target && target !== protectedId && match.players[target]?.alive ? target : null;
  if (killed) match.players[killed].alive = false;
  return {killed, protected: Boolean(target && target === protectedId)};
}

export function resolveVote(match) {
  const tally = {};
  let abstain = 0;
  for (const vote of Object.values(match.votes || {})) {
    if (vote.abstain) abstain += 1;
    else if (vote.target) tally[vote.target] = (tally[vote.target] || 0) + 1;
  }
  const max = Math.max(0, ...Object.values(tally));
  const topIds = Object.keys(tally).filter((id) => tally[id] === max);
  const eliminated = max > 0 && topIds.length === 1 ? topIds[0] : null;
  if (eliminated && match.players[eliminated]?.alive) match.players[eliminated].alive = false;
  return {tally, abstain, eliminated, tie: !eliminated};
}

export function validateNightAction(match, userId, targetId) {
  const player = match.players[userId];
  const target = match.players[targetId];
  if (!player?.alive || player.left) return {ok: false, error: 'Bu işlem şu anda kullanılamaz.'};
  if (!target?.alive || target.left) return {ok: false, error: 'Geçersiz hedef.'};
  if (player.role === 'VILLAGER') return {ok: false, error: 'Gece yeteneğin yok.'};
  if (player.role === 'VAMPIRE' && target.role === 'VAMPIRE') return {ok: false, error: 'Vampir takım arkadaşını seçemezsin.'};
  if (player.role === 'SEER' && userId === targetId) return {ok: false, error: 'Kendini araştıramazsın.'};
  return {ok: true};
}
