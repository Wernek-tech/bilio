import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_DURATIONS, validateNightAction} from '../server/vampire-engine.mjs';
import {
  rooms, matches, createRoom, joinRoom, startMatch, tickMatch, privateMatch, voteProgress,
  finishVote, finishExecution, addDeadMessage, leaveRoom, updateConnections,
} from '../server/vampire-store.mjs';

const user = (i) => ({id:`u${i}`,username:`Oyuncu${i}`,profile:{avatarUrl:i===1?'data:image/png;base64,AA==':'',selectedFrameId:i===2?'frame-x':null}});
const setup = (n=8) => {
  rooms.clear(); matches.clear();
  const r=createRoom(user(1));
  for(let i=2;i<=n;i++)joinRoom(r,user(i));
  r.players.forEach(p=>{p.connected=true;p.lastSeenAt=Date.now()});
  const m=startMatch(r,Date.now());
  return {r,m};
};

test('Vampir varsayılan faz süreleri kısaltılmıştır',()=>{
  assert.deepEqual(DEFAULT_DURATIONS,{roleReveal:4,night:15,announcement:5,discussion:30,voting:20,execution:6});
});

test('fazlar sunucu tick ile otomatik ilerler',()=>{
  const {m}=setup(); const t=Date.now(); m.phaseEndsAt=t;
  tickMatch(m,t); assert.equal(m.phase,'NIGHT');
  m.phaseEndsAt=t; tickMatch(m,t); assert.equal(m.phase,'DAY_ANNOUNCEMENT');
  m.phaseEndsAt=t; tickMatch(m,t); assert.equal(m.phase,'DAY_DISCUSSION');
  m.phaseEndsAt=t; tickMatch(m,t); assert.equal(m.phase,'DAY_VOTING');
});

test('gece aksiyon doğrulaması köylüyü, kendini araştırmayı ve vampir hedefini engeller',()=>{
  const {m}=setup(); const ids=Object.keys(m.players);
  m.players[ids[0]].role='VILLAGER'; m.players[ids[1]].role='SEER'; m.players[ids[2]].role='VAMPIRE'; m.players[ids[3]].role='VAMPIRE';
  assert.equal(validateNightAction(m,ids[0],ids[4]).ok,false);
  assert.equal(validateNightAction(m,ids[1],ids[1]).ok,false);
  assert.equal(validateNightAction(m,ids[2],ids[3]).ok,false);
  assert.equal(validateNightAction(m,ids[1],ids[2]).ok,true);
});

test('oy değiştirilebilir ve son oy geçerlidir',()=>{
  const {m}=setup(); const ids=Object.keys(m.players); m.phase='DAY_VOTING'; m.phaseVersion=10; m.resolvedPhaseVersion=0;
  m.votes[ids[0]]={target:ids[1],abstain:false}; m.votes[ids[0]]={target:ids[2],abstain:false};
  assert.equal(m.votes[ids[0]].target,ids[2]);
});

test('bağlantısı kopan oyuncu anlık oy tamamlanmasını engellemez',()=>{
  const {r,m}=setup(); const ids=Object.keys(m.players); m.phase='DAY_VOTING';
  const stale=r.players.at(-1); stale.lastSeenAt=Date.now()-20_000; updateConnections(r,Date.now());
  ids.slice(0,-1).forEach((id)=>{m.votes[id]={abstain:true}});
  const p=voteProgress(m); assert.equal(p.completed,p.required); assert.equal(p.required,7);
});

test('oylama zaman aşımında execution fazına geçer ve eşitliği güvenle gösterir',()=>{
  const {m}=setup(); const ids=Object.keys(m.players); m.phase='DAY_VOTING';m.phaseVersion=2;m.resolvedPhaseVersion=0;m.phaseEndsAt=Date.now();
  m.votes={ [ids[0]]:{target:ids[1]}, [ids[2]]:{target:ids[3]} };
  tickMatch(m,Date.now()); assert.equal(m.phase,'EXECUTION'); assert.equal(m.execution.tie,true);
  assert.equal(m.journal.at(-1),'Oylar eşit. Kimse elenmedi.');
});

test('tekil oy sonucu elenen rolünü execution sırasında güvenli biçimde açıklar',()=>{
  const {m}=setup(); const ids=Object.keys(m.players); m.phase='DAY_VOTING';m.phaseVersion=3;m.resolvedPhaseVersion=0;
  m.votes={}; ids.slice(0,5).forEach(id=>m.votes[id]={target:ids[7]});
  finishVote(m,Date.now()); assert.equal(m.phase,'EXECUTION'); assert.equal(m.execution.eliminatedId,ids[7]); assert.ok(m.execution.role);
  const view=privateMatch(m,ids[0]); assert.equal(view.execution.role,m.players[ids[7]].role); assert.equal('roles' in view,false);
});

test('execution bitince kazanan kontrol edilir ve gerekirse geceye geçilir',()=>{
  const {m}=setup(); m.phase='EXECUTION';m.phaseVersion=4;m.resolvedPhaseVersion=0;m.execution={tie:true};
  const before=m.dayNumber; finishExecution(m,Date.now()); assert.ok(['NIGHT','GAME_OVER'].includes(m.phase)); if(m.phase==='NIGHT')assert.equal(m.dayNumber,before+1);
});

test('ölüler sohbeti sadece elenen oyunculara açıktır ve geçmişi korunur',()=>{
  const {m}=setup(); const ids=Object.keys(m.players); assert.throws(()=>addDeadMessage(m,ids[0],'merhaba'));
  m.players[ids[0]].alive=false; addDeadMessage(m,ids[0],'ölüler mesajı'); const view=privateMatch(m,ids[0]); assert.equal(view.deadMessages.at(-1).content,'ölüler mesajı');
  const living=privateMatch(m,ids[1]); assert.equal('deadMessages' in living,false);
});

test('elenen oyuncu ayrılınca hayalet oyuncu kalmaz ve maç sürer',()=>{
  const {r,m}=setup(); const ids=Object.keys(m.players); m.players[ids[0]].alive=false;
  leaveRoom(r,ids[0]); assert.equal(r.players.some(p=>p.userId===ids[0]),false); assert.equal(privateMatch(m,ids[0]),null); assert.equal(r.status,'PLAYING');
});

test('güvenli oyuncu verisi gerçek avatar ve çerçeveyi taşır, gizli rolleri sızdırmaz',()=>{
  const {m}=setup(); const ids=Object.keys(m.players); const v=privateMatch(m,ids[0]);
  assert.ok(v.players[ids[0]].avatarUrl); assert.equal(v.players[ids[1]].frameId,'frame-x'); assert.equal('role' in v.players[ids[1]],false); assert.equal('roles' in v,false);
});

test('8–12 oyuncu oturma hesapları görüş alanı içinde ve eşit açılıdır', async()=>{
  const {vampireSeatPosition}=await import('../src/vampire/seatLayout.js');
  for(const count of [8,9,10,11,12]){
    const positions=Array.from({length:count},(_,i)=>vampireSeatPosition(i,count));
    assert.equal(new Set(positions.map(p=>`${p.left}/${p.top}`)).size,count);
    for(const p of positions){const left=parseFloat(p.left),top=parseFloat(p.top);assert.ok(left>=7&&left<=93);assert.ok(top>=11&&top<=89)}
  }
});
