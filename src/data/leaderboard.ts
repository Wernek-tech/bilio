export type LeaderboardPlayer={rank:number;username:string;title:'EFSANE'|'USTA'|'UZMAN'|'PRO'|'YÖNETİCİ';score:number};
export const weeklyLeaderboard:LeaderboardPlayer[]=[
{rank:1,username:'OyunCanavarı',title:'EFSANE',score:28450},
{rank:2,username:'MüzikKralı',title:'USTA',score:22750},
{rank:3,username:'BilgeAdam',title:'UZMAN',score:18920},
{rank:4,username:'NeşeliPenguen',title:'PRO',score:17250},
{rank:5,username:'GeceKöylüsü',title:'EFSANE',score:16430},
{rank:6,username:'YayıncıPro',title:'USTA',score:15870},
{rank:7,username:'BilioBot',title:'YÖNETİCİ',score:14560},
{rank:8,username:'VampirKral',title:'UZMAN',score:13420},
{rank:9,username:'ÇizgiKağan',title:'PRO',score:12180},
{rank:10,username:'TahminUstası',title:'USTA',score:11340},
];
export const formatScore=(score:number)=>new Intl.NumberFormat('tr-TR').format(score);
