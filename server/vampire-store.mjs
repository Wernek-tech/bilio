import crypto from 'node:crypto';import {assignRoles,winner,resolveNight,resolveVote} from './vampire-engine.mjs';
export const rooms=new Map();export const matches=new Map();export const invites=[];
const code=()=>`VK-${crypto.randomInt(1000,10000)}`;const now=()=>Date.now();
export function createRoom(user){let c;do c=code();while([...rooms.values()].some(r=>r.code===c));const r={id:crypto.randomUUID(),code:c,hostUserId:user.id,status:'LOBBY',minPlayers:8,maxPlayers:12,nightDuration:30,discussionDuration:60,votingDuration:45,createdAt:now(),countdownEndsAt:null,players:[{userId:user.id,username:user.username,ready:false,connected:true,joinedAt:now()}],messages:[]};rooms.set(r.id,r);return r}
export const roomByCode=c=>[...rooms.values()].find(r=>r.code===String(c).toUpperCase());export const roomForUser=id=>[...rooms.values()].find(r=>r.players.some(p=>p.userId===id)&&r.status!=='ENDED');
export function joinRoom(r,u){if(r.status!=='LOBBY')throw Error('Oyun başlamış.');if(r.players.length>=12)throw Error('Oda dolu.');if(r.players.some(p=>p.userId===u.id))return r;r.players.push({userId:u.id,username:u.username,ready:false,connected:true,joinedAt:now()});cancelCountdown(r);sys(r,`${u.username} odaya katıldı.`);return r}
// ponytail: bots are just regular room players (isBot:true, auto-ready) — startMatch/evaluate need no changes to include them.
export function addBot(r,hostId){if(r.hostUserId!==hostId)throw Error('Yalnızca kurucu bot ekleyebilir.');if(r.status!=='LOBBY')throw Error('Oyun başlamış.');if(r.players.length>=12)throw Error('Oda dolu.');const n=r.players.filter(p=>p.isBot).length+1;const name=`Bot ${n}`;r.players.push({userId:`bot-${crypto.randomUUID()}`,username:name,ready:true,connected:true,isBot:true,joinedAt:now()});evaluate(r);sys(r,`${name} odaya katıldı.`);return r}
export function leaveRoom(r,uid){const p=r.players.find(x=>x.userId===uid);r.players=r.players.filter(x=>x.userId!==uid);cancelCountdown(r);if(p)sys(r,`${p.username} odadan ayrıldı.`);if(r.hostUserId===uid&&r.players.length)r.hostUserId=[...r.players].sort((a,b)=>a.joinedAt-b.joinedAt)[0].userId;if(!r.players.length)rooms.delete(r.id)}
export function toggleReady(r,uid){const p=r.players.find(x=>x.userId===uid);if(!p)throw Error('Odada değilsin.');p.ready=!p.ready;evaluate(r);return p.ready}
export function evaluate(r){const ok=r.players.length>=8&&r.players.length<=12&&r.players.every(p=>p.ready&&p.connected);if(ok&&!r.countdownEndsAt)r.countdownEndsAt=now()+5000;if(!ok)cancelCountdown(r)}export const cancelCountdown=r=>r.countdownEndsAt=null;
export function tickRoom(r){if(r.status==='LOBBY'&&r.countdownEndsAt&&now()>=r.countdownEndsAt){evaluate(r);if(r.countdownEndsAt&&now()>=r.countdownEndsAt)return startMatch(r)}return null}
export function startMatch(r){const roles=assignRoles(r.players.map(p=>p.userId)),m={id:crypto.randomUUID(),roomId:r.id,phase:'ROLE_REVEAL',dayNumber:1,phaseEndsAt:now()+5000,winner:null,players:{},votes:{},vampireMessages:[],villageMessages:[],journal:[]};for(const p of r.players)m.players[p.userId]={username:p.username,role:roles[p.userId],alive:true,nightTarget:null,isBot:!!p.isBot};matches.set(m.id,m);r.status='PLAYING';r.matchId=m.id;r.countdownEndsAt=null;return m}
// ponytail: dumb-random bot AI — picks a legal target so the match never stalls waiting on a bot. Not strategic.
const aliveIds=m=>Object.entries(m.players).filter(([,p])=>p.alive).map(([id])=>id);
const pick=arr=>arr[Math.floor(Math.random()*arr.length)];
export function botAct(m){
  if(m.phase==='NIGHT'){
    for(const [id,p] of Object.entries(m.players)){
      if(!p.isBot||!p.alive||p.nightTarget)continue;
      if(p.role==='VAMPIRE'){const t=aliveIds(m).filter(x=>m.players[x].role!=='VAMPIRE');if(t.length)p.nightTarget=pick(t)}
      else if(p.role==='DOCTOR'){const t=aliveIds(m);if(t.length)p.nightTarget=pick(t)}
      else if(p.role==='SEER'){const t=aliveIds(m).filter(x=>x!==id);if(t.length)p.nightTarget=pick(t)}
    }
  } else if(m.phase==='DAY_VOTING'){
    for(const [id,p] of Object.entries(m.players)){
      if(!p.isBot||!p.alive||m.votes[id])continue;
      const t=aliveIds(m).filter(x=>x!==id);
      m.votes[id]=t.length&&Math.random()<0.85?{target:pick(t)}:{abstain:true};
    }
  }
}
export function tickMatch(m){if(m.phase==='GAME_OVER'||now()<m.phaseEndsAt)return;const r=rooms.get(m.roomId);if(m.phase==='ROLE_REVEAL'){m.phase='NIGHT';m.phaseEndsAt=now()+r.nightDuration*1000;return}if(m.phase==='NIGHT'){m.phase='NIGHT_RESOLUTION';const out=resolveNight(m);m.journal.push(out.killed?`${m.players[out.killed].username} gece hayatını kaybetti. (${roleTR(m.players[out.killed].role)})`:'Kimse ölmedi.');clearNight(m);const w=winner(m);if(w)return end(m,w);m.phase='DAY_ANNOUNCEMENT';m.phaseEndsAt=now()+4000;return}if(m.phase==='DAY_ANNOUNCEMENT'){m.phase='DAY_DISCUSSION';m.phaseEndsAt=now()+r.discussionDuration*1000;return}if(m.phase==='DAY_DISCUSSION'){m.phase='DAY_VOTING';m.votes={};m.phaseEndsAt=now()+r.votingDuration*1000;return}if(m.phase==='DAY_VOTING'){finishVote(m);return}}
export function finishVote(m){const out=resolveVote(m);m.journal.push(out.eliminated?`${m.players[out.eliminated].username} oylamayla elendi. (${roleTR(m.players[out.eliminated].role)})`:'Oylama eşitlikle sonuçlandı; kimse elenmedi.');const w=winner(m);if(w)return end(m,w);m.dayNumber++;m.phase='NIGHT';m.phaseEndsAt=now()+rooms.get(m.roomId).nightDuration*1000;clearNight(m)}
const clearNight=m=>Object.values(m.players).forEach(p=>p.nightTarget=null);const end=(m,w)=>{m.winner=w;m.phase='GAME_OVER';m.phaseEndsAt=null;rooms.get(m.roomId).status='ENDED'};export const sys=(r,content)=>r.messages.push({id:crypto.randomUUID(),system:true,content,createdAt:now()});export const roleTR=r=>({VAMPIRE:'Vampir',SEER:'Kahin',DOCTOR:'Doktor',VILLAGER:'Köylü'})[r];
export function publicRoom(r){tickRoom(r);return {...r,players:r.players.map(p=>({...p})),messages:r.messages.slice(-60)}}
export function privateMatch(m,uid){botAct(m);tickMatch(m);const me=m.players[uid];if(!me)return null;const publicPlayers=Object.fromEntries(Object.entries(m.players).map(([id,p])=>[id,{username:p.username,alive:p.alive}]));const out={id:m.id,phase:m.phase,dayNumber:m.dayNumber,phaseEndsAt:m.phaseEndsAt,winner:m.winner,players:publicPlayers,journal:m.journal.slice(-20),villageMessages:m.villageMessages.slice(-80),myRole:me.role,myAlive:me.alive,votesCast:Object.keys(m.votes).length};if(me.role==='VAMPIRE'){out.vampireIds=Object.keys(m.players).filter(id=>m.players[id].role==='VAMPIRE');if(m.phase==='NIGHT')out.vampireMessages=m.vampireMessages.slice(-80)}if(m.phase==='GAME_OVER')out.roles=Object.fromEntries(Object.entries(m.players).map(([id,p])=>[id,p.role]));return out}
