import {useEffect, useState} from 'react';
import SiteShell from '../components/SiteShell';
import {api, useAuth} from '../auth/auth';
import {titles} from '../data/titles';

type Row = {rank: number; userId: string; username: string; score: number; victories: number; level: number; titleId?: string; frameId?: string|null; avatarUrl?: string};
const format = (value: number) => new Intl.NumberFormat('tr-TR').format(value);

function PlayerIdentity({row}: {row: Row}) {
  const title = row.titleId ? titles.find(item => item.id === row.titleId) : null;
  return <div className="rank-player">
    <div className="mini-avatar">{row.avatarUrl ? <img src={row.avatarUrl} alt={`${row.username} profil resmi`}/> : row.username.slice(0, 1).toLocaleUpperCase('tr-TR')}</div>
    <b title={row.username}>{row.username}</b>
    {title && <img src={title.assetPath} alt={`${title.name} unvanı`}/>} 
  </div>;
}

export default function Leaderboard() {
  const auth = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [mine, setMine] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    setLoading(true);
    api<{rows: Row[]; current: Row | null}>('/leaderboard?limit=100')
      .then(data => { setRows(data.rows); setMine(data.current); setError(''); })
      .catch(err => setError(err instanceof Error ? err.message : 'Sıralama yüklenemedi.'))
      .finally(() => setLoading(false));
  }, [auth.user?.id]);

  const top = rows.slice(0, 3);
  const rest = rows.slice(3);
  const podium = [top[1], top[0], top[2]].filter((row): row is Row => Boolean(row));

  return <SiteShell><div className="page-body leaderboard-page">
    {loading ? <div className="page-loading">Sıralama yükleniyor...</div> : error ? <div className="leaderboard-empty"><span className="small-trophy">♜</span><b>Sıralama yüklenemedi.</b><small>{error}</small></div> : rows.length === 0 ? <section className="rank-table leaderboard-empty-table" aria-label="Haftalık liderlik tablosu">
      <header><span>SIRA</span><span>OYUNCU</span><span>PUAN</span></header>
      <div className="leaderboard-empty"><span className="small-trophy" aria-hidden="true">♜</span><b>Bu hafta henüz sıralama oluşmadı.</b><small>Oyun oynayarak haftalık sıralamada yerini alabilirsin.</small></div>
    </section> : <>
      <div className={`leaderboard-podium entries-${podium.length}`}>{podium.map(row => <article key={row.userId} className={`podium-card p${row.rank}`}>
        <span className="rank-no">{row.rank}</span>
        <div className="pod-avatar">{row.avatarUrl ? <img src={row.avatarUrl} alt={`${row.username} profil resmi`}/> : row.username.slice(0, 1).toLocaleUpperCase('tr-TR')}</div>
        <b>{row.username}</b>
        {row.titleId && <img className="title-art" src={(titles.find(t => t.id === row.titleId) || titles[0]).assetPath} alt="Kuşanılmış unvan"/>}
        <strong>{format(row.score)} PUAN</strong><small>SEVİYE {row.level} · {row.victories} GALİBİYET</small>
      </article>)}</div>
      <section className="rank-table" aria-label="Haftalık liderlik tablosu">
        <header><span>SIRA</span><span>OYUNCU</span><span>PUAN</span></header>
        {rest.map(row => <div className="rank-row" key={row.userId}><span>{row.rank}</span><PlayerIdentity row={row}/><strong>{format(row.score)}</strong></div>)}
        {auth.user && mine && !rows.some(row => row.userId === mine.userId) && <div className="rank-row pinned"><span>{mine.rank}</span><PlayerIdentity row={mine}/><strong>{format(mine.score)}</strong></div>}
        {auth.user && !mine && <div className="no-rank">Bu hafta henüz sıralama puanın bulunmuyor.</div>}
      </section>
    </>}
  </div></SiteShell>;
}
