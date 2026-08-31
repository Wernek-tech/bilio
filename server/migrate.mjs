import fs from 'node:fs';import path from 'node:path';
const file=path.resolve(process.env.BILIO_DB_PATH||'server/data.json');let db={users:[],sessions:{}};try{db=JSON.parse(fs.readFileSync(file,'utf8'))}catch{}
db.users ||= [];db.sessions ||= {};db.lobbyMessages ||= [];db.lobbyInvites ||= [];db.transactions ||= [];db.weeklyArchives ||= [];db.meta ||= {};
for(const u of db.users){u.inventory ||= [];u.profile ||= {};u.profile.about ??='';u.profile.avatarUrl ??='';u.profile.selectedFrameId ??=null;u.profile.selectedBadgeIds ||= [];u.profile.badges ||= [];u.profile.gifts ||= [];u.profile.achievements ||= [];u.stats ||= {matches:0,wins:0,correct:0,score:0};u.weekly ||= {score:0,victories:0,updatedAt:null};}
fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(db,null,2));console.log('Bilio veri şeması güncel.');
