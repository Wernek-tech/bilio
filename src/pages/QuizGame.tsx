import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/auth';
type Kind='song'|'celebrity'|'streamer';
const celebrities=`Tarkan|Sezen Aksu|Kenan İmirzalıoğlu|Beren Saat|Kıvanç Tatlıtuğ|Serenay Sarıkaya|Ajda Pekkan|Barış Manço|Cem Yılmaz|Şener Şen|Türkan Şoray|Haluk Bilginer|Demet Evgar|Mabel Matiz|Hadise|Murat Boz|Sertab Erener|Hande Erçel|Burak Özçivit|Neslihan Atagül|Ariana Grande|Dua Lipa|Selena Gomez|Miley Cyrus|Taylor Swift|Beyoncé|Rihanna|Lady Gaga|Billie Eilish|Adele|Bruno Mars|Ed Sheeran|Justin Bieber|Jennifer Lopez|Shakira|The Weeknd|Tom Cruise|Leonardo DiCaprio|Brad Pitt|Angelina Jolie|Scarlett Johansson|Emma Stone|Zendaya|Jenna Ortega|Keanu Reeves|Will Smith|Robert Downey Jr.|Chris Hemsworth|Morgan Freeman|Natalie Portman|Anne Hathaway|Margot Robbie|Ryan Gosling|Johnny Depp|Dwayne Johnson|Gal Gadot|Pedro Pascal|Millie Bobby Brown|Daniel Radcliffe|Emma Watson`.split('|');
const streamers=`Elraenn|Pqueen|Jahrein|Kendine Müzisyen|PurpleBixi|wtcN|Mithrain|Unlost|Easter GamersTv|Pintipanda|Can Sungur|Mert Günhan|Elwind|Levo|Kaanflix|Miafitz|Lynx Çerezcioğlu|Enes Batur|Orkun Işıtmak|Berkcan Güven|Ninja|Pokimane|Shroud|xQc|Kai Cenat|IShowSpeed|HasanAbi|Ibai Llanos|Rubius|AuronPlay|Myth|Tfue|Dr Disrespect|Ludwig|Valkyrae|Sykkuno|Amouranth|Summit1g|Sodapoppin|Asmongold|TimTheTatman|Nickmercs|Clix|Bugha|Tarik|TenZ|Faker|Caedrel|Forsen|Lirik|Gaules|Alanzoka|Cellbit|Quackity|TommyInnit|Tubbo|Ranboo|Dream|GeorgeNotFound|Sapnap`.split('|');
const songs=`Şımarık—Tarkan|Gülümse—Sezen Aksu|Antidepresan—Mabel Matiz|Aşkın Olayım—Simge|Deli—Mor ve Ötesi|Bir Derdim Var—Mor ve Ötesi|Senden Daha Güzel—Duman|Her Şeyi Yak—Duman|Yolla—Tarkan|Everyway That I Can—Sertab Erener|Prenses—Hadise|Janti—Murat Boz|Bangır Bangır—Gülşen|Kuzu Kuzu—Tarkan|Firuze—Sezen Aksu|Islak Islak—Barış Akarsu|Resimdeki Gözyaşları—Cem Karaca|Gülpembe—Barış Manço|Sarı Laleler—MFÖ|Cambaz—Mor ve Ötesi|Blinding Lights—The Weeknd|Flowers—Miley Cyrus|Levitating—Dua Lipa|Bad Guy—Billie Eilish|Rolling in the Deep—Adele|Shape of You—Ed Sheeran|Uptown Funk—Bruno Mars|Halo—Beyoncé|Diamonds—Rihanna|Poker Face—Lady Gaga|Anti-Hero—Taylor Swift|Havana—Camila Cabello|Cheap Thrills—Sia|Roar—Katy Perry|Sorry—Justin Bieber|Counting Stars—OneRepublic|Believer—Imagine Dragons|Numb—Linkin Park|Yellow—Coldplay|Radioactive—Imagine Dragons|Lose Yourself—Eminem|God's Plan—Drake|Old Town Road—Lil Nas X|Industry Baby—Lil Nas X|Rockstar—Post Malone|Sunflower—Post Malone|Without Me—Eminem|HUMBLE.—Kendrick Lamar|SICKO MODE—Travis Scott|Gangsta's Paradise—Coolio|Smells Like Teen Spirit—Nirvana|Bohemian Rhapsody—Queen|Hotel California—Eagles|Back in Black—AC/DC|Sweet Child o' Mine—Guns N' Roses|Dream On—Aerosmith|Zombie—The Cranberries|Creep—Radiohead|The Final Countdown—Europe|Nothing Else Matters—Metallica`.split('|').map(x => { const [answer, artist] = x.split('—'); return { answer, artist }; });
const youtubeIds = ['', 'qgfLk8Uksxo', '', '', 'VeOtv894ls8', '', '', '', '', '', '', '', '', 'u9Nt6D9CQcw', '', '', '', '', '', '', '4NRXx6U8ABQ', 'G7KNmW9a75Y', 'TUVcZfQe-Kw', 'DyDfgMOUjCI', 'rYEDA3JcQqw', 'JGwWNGJdvx8', 'OPf0YbXqDm0', 'bnVUHWCynig', 'lWA2pjMjpBs', 'bESGLojNYSo', 'b1kbLwvqugk', 'BQ0mxQXmLsk', 'nYh-n7EOtMA', 'CevxZvSJLk8', 'fRh_vgS2dFE', 'hT_nvWreIhg', '7wtfhZwyrcc', 'kXYiU_JCYtU', 'yKNxeF4KMsY', 'ktvTqknDobU', '_Yhyp-_hX2s', 'xpVfcZ0ZcFM', 'r7qovpFAGrQ', '6swmTBVI83k', 'UceaB4D0jpo', 'ApXoWvfEYVU', 'YVkUvmDQ3HY', 'tvTRZJ-4EyI', '6ONRf7h3Mdk', 'fPO76Jlnz6c', 'hTWKbfoikeg', 'fJ9rUzIMcZQ', 'BciS5krYL80', 'pAgnJDJN4VA', '1w7OgIMMRc4', '89dGC8de0CA', '6Ejga4kJUts', 'XFkzRNyygfk', '9jK-NcRmVcw', 'tAGnKpE4NCI'];
function options(answer: string, pool: string[], index: number) { const values = [answer]; let cursor = index + 7; while (values.length < 4) {
    const candidate = pool[cursor % pool.length];
    if (!values.includes(candidate))
        values.push(candidate);
    cursor += 11;
} return values.sort((a, b) => ((a.length + index * 7) % 13) - ((b.length + index * 7) % 13)); }
function portraitFallback(name: string) { const initial = name.trim().slice(0, 1).toLocaleUpperCase('tr-TR'), svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640"><defs><radialGradient id="g"><stop stop-color="#45200f"/><stop offset="1" stop-color="#080503"/></radialGradient></defs><rect width="640" height="640" rx="48" fill="url(#g)"/><circle cx="320" cy="245" r="128" fill="#b87943"/><path d="M95 640c20-170 108-260 225-260s205 90 225 260" fill="#2a160c"/><text x="320" y="285" text-anchor="middle" font-family="Arial" font-size="155" font-weight="700" fill="#fff4df">${initial}</text></svg>`; return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`; }
function WikiPortrait({ name }: {
    name: string;
}) { const [src, setSrc] = useState(''), fallback = useMemo(() => portraitFallback(name), [name]); useEffect(() => { let active = true; setSrc(''); const usable = (url: string) => new Promise<boolean>(resolve => { const image = new Image(); image.onload = () => resolve(image.naturalWidth >= 160 && image.naturalHeight >= 160); image.onerror = () => resolve(false); image.src = url; }); const load = async () => { for (const language of ['tr', 'en']) {
    try {
        const response = await fetch(`https://${language}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`);
        if (!response.ok)
            continue;
        const data = await response.json() as {
            thumbnail?: {
                source?: string;
            };
            originalimage?: {
                source?: string;
            };
        };
        const image = data.thumbnail?.source || data.originalimage?.source;
        if (image && await usable(image)) {
            if (active)
                setSrc(image);
            return;
        }
    }
    catch { /* Try the next public Wikipedia endpoint. */ }
    try {
        const query = new URLSearchParams({ action: 'query', generator: 'search', gsrsearch: name, gsrnamespace: '0', gsrlimit: '5', prop: 'pageimages', piprop: 'thumbnail', pithumbsize: '900', format: 'json', origin: '*' });
        const response = await fetch(`https://${language}.wikipedia.org/w/api.php?${query}`);
        if (response.ok) {
            const data = await response.json() as { query?: { pages?: Record<string, { thumbnail?: { source?: string; }; }>; }; };
            for (const page of Object.values(data.query?.pages || {})) {
                const image = page.thumbnail?.source;
                if (image && await usable(image)) {
                    if (active) setSrc(image);
                    return;
                }
            }
        }
    }
    catch { /* Try the next language. */ }
} if (active)
    setSrc(fallback); }; void load(); return () => { active = false; }; }, [fallback, name]); return <div className="quiz-portrait-frame"><img src={src || fallback} onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = fallback; }} alt={`${name} görseli`}/></div>; }
function StreamerPortrait({ name, index }: {
    name: string;
    index: number;
}) { const fallback = useMemo(() => portraitFallback(name), [name]); return <div className="quiz-portrait-frame streamer-photo"><img src={`/assets/streamers/streamer-${String(index + 1).padStart(2, '0')}.png`} onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = fallback; }} alt={`${name} yayıncı fotoğrafı`}/></div>; }
function SongPlayer({ song, index }: {
    song: {
        answer: string;
        artist: string;
    };
    index: number;
}) {
    const audio = useRef<HTMLAudioElement>(null), [preview, setPreview] = useState(''), [loading, setLoading] = useState(true), [playing, setPlaying] = useState(false), [current, setCurrent] = useState(0), [duration, setDuration] = useState(30), id = youtubeIds[index] || '';
    useEffect(() => { let active = true; setLoading(true); setPreview(''); setPlaying(false); setCurrent(0); fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(`${song.artist} ${song.answer}`)}&entity=song&limit=5`).then(response => response.json()).then((data: {
        results?: {
            previewUrl?: string;
            trackName?: string;
        }[];
    }) => { if (!active)
        return; const normalized = song.answer.toLocaleLowerCase('tr-TR'), match = data.results?.find(item => item.previewUrl && item.trackName?.toLocaleLowerCase('tr-TR').includes(normalized)) || data.results?.find(item => item.previewUrl); setPreview(match?.previewUrl || ''); setLoading(false); }).catch(() => { if (active)
        setLoading(false); }); return () => { active = false; }; }, [song.answer, song.artist]);
    if (loading)
        return <div className="song-loading"><span className="music-disc">♪</span><b>Müzik hazırlanıyor…</b></div>;
    if (preview)
        return <div className="bilio-audio-player"><audio ref={audio} autoPlay preload="auto" src={preview} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onTimeUpdate={event => setCurrent(event.currentTarget.currentTime)} onLoadedMetadata={event => setDuration(event.currentTarget.duration || 30)}/><div className={`music-disc${playing ? ' playing' : ''}`}>♫</div><div className="audio-main"><b>ŞARKI ÇALIYOR</b><input aria-label="Müzik ilerleme çubuğu" type="range" min="0" max={duration || 30} step="0.1" value={current} onChange={event => { if (audio.current) {
            audio.current.currentTime = Number(event.target.value);
            setCurrent(Number(event.target.value));
        } }}/><span>{Math.floor(current / 60)}:{String(Math.floor(current % 60)).padStart(2, '0')} / {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}</span></div><button aria-label={playing ? 'Müziği duraklat' : 'Müziği oynat'} onClick={() => { if (!audio.current)
            return; if (audio.current.paused)
            void audio.current.play();
        else
            audio.current.pause(); }}>{playing ? 'Ⅱ' : '▶'}</button></div>;
    if (id)
        return <a className="song-fallback" href={`https://www.youtube.com/watch?v=${id}`} target="_blank" rel="noreferrer">Müzik kaynağını aç</a>;
    return <div className="media-error">Bu soru için müzik kaynağına ulaşılamadı.</div>;
}
type QuizPlayer = {
    userId: string;
    username: string;
    avatarUrl?: string;
    frameId?: string | null;
    titleId?: string;
    level?: number;
    bot?: boolean;
    score: number;
};
type QuizMessage = {
    id: string;
    userId: string;
    username: string;
    avatarUrl?: string;
    bot?: boolean;
    content: string;
    createdAt: number;
};
type QuizRoom = {
    id: string;
    code: string;
    hostUserId: string;
    status: 'LOBBY' | 'PLAYING' | 'ENDED';
    category: string;
    questionCount: number;
    duration: number;
    players: QuizPlayer[];
    messages: QuizMessage[];
    match: null | {
        index: number;
        questionCount: number;
        duration: number;
        questionEndsAt: number;
        answeredUserIds: string[];
        finished: boolean;
    };
};
async function quizApi<T>(kind: Kind, action: string, method = 'GET', data?: unknown) { const response = await fetch(`/api/game/quiz/${kind}/${action}`, { method, headers: { 'Content-Type': 'application/json' }, body: data ? JSON.stringify(data) : undefined }); const payload = await response.json() as T & {
    error?: string;
}; if (!response.ok)
    throw Error(payload.error || 'İşlem başarısız.'); return payload; }
export default function QuizGame({ kind }: {
    kind: Kind;
}) {
    const nav = useNavigate(), auth = useAuth(), [room, setRoom] = useState<QuizRoom | null>(null), [joinCode, setJoinCode] = useState(''), [chat, setChat] = useState(''), [picked, setPicked] = useState(''), [error, setError] = useState(''), [clock, setClock] = useState(Date.now());
    const title = kind === 'song' ? 'ŞARKIYI BİL' : kind === 'celebrity' ? 'TAHMİN ET KİM' : 'YAYINCI KİM';
    const load = useCallback(async (create = false) => { try {
        let state = await quizApi<{
            room: QuizRoom | null;
        }>(kind, 'active');
        if (!state.room && create)
            state = await quizApi<{
                room: QuizRoom;
            }>(kind, 'create', 'POST');
        setRoom(state.room);
        setError('');
    }
    catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Oyun yüklenemedi.');
    } }, [kind]);
    useEffect(() => { void load(true); const polling = window.setInterval(() => void load(false), 750), ticking = window.setInterval(() => setClock(Date.now()), 250); return () => { window.clearInterval(polling); window.clearInterval(ticking); }; }, [load]);
    const index = room?.match?.index || 0, all = kind === 'celebrity' ? celebrities : kind === 'streamer' ? streamers : songs.map(item => item.answer), pool = room?.category === 'TÜRKÇE' ? all.slice(0, 20) : room?.category === 'YABANCI' ? all.slice(20) : all, answer = pool[index % pool.length], choices = useMemo(() => options(answer, pool, index), [answer, index, pool]), globalQuestionIndex = (room?.category === 'YABANCI' ? 20 : 0) + index % (room?.category === 'TÜRKÇE' ? 20 : room?.category === 'YABANCI' ? 40 : 60), song = songs[globalQuestionIndex], me = room?.players.find(player => player.userId === auth.user?.id), host = room?.hostUserId === auth.user?.id, answered = Boolean(auth.user && room?.match?.answeredUserIds.includes(auth.user.id)), seconds = room?.match ? Math.max(0, Math.ceil((room.match.questionEndsAt - clock) / 1000)) : room?.duration || 15, themeClass = `quiz-theme-${kind}`;
    useEffect(() => { setPicked(''); }, [index]);
    const update = async (data: unknown) => { try {
        const result = await quizApi<{
            room: QuizRoom;
        }>(kind, 'settings', 'POST', data);
        setRoom(result.room);
    }
    catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Ayar değiştirilemedi.');
    } };
    const invitePlayers = async (roomCode: string) => {
        const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(roomCode)}`;
        const shareData = { title: `${title} odasına katıl`, text: `Bilio ${title} odasına katıl. Oda kodu: ${roomCode}`, url: inviteUrl };
        try {
            if (navigator.share) {
                await navigator.share(shareData);
                setError('');
                return;
            }
            await navigator.clipboard.writeText(`${shareData.text}\n${inviteUrl}`);
            setError('Davet bağlantısı panoya kopyalandı.');
        }
        catch (reason) {
            if (reason instanceof DOMException && reason.name === 'AbortError') return;
            try {
                await navigator.clipboard.writeText(`${shareData.text}\n${inviteUrl}`);
                setError('Davet bağlantısı panoya kopyalandı.');
            }
            catch {
                setError('Davet bağlantısı kopyalanamadı. Oda kodunu paylaşabilirsin.');
            }
        }
    };
    const leave = async () => { await quizApi(kind, 'leave', 'POST').catch(() => undefined); nav('/oyunlar'); };
    const replay = async () => { await quizApi(kind, 'leave', 'POST').catch(() => undefined); setRoom(null); await load(true); };
    if (!room)
        return <main className={`quiz-shell ${themeClass}`}><div className="quiz-loading">{error || 'Oyun yükleniyor…'}</div></main>;
    if (room.status === 'LOBBY')
        return <main className={`quiz-shell ${themeClass}`}><header><button onClick={() => void leave()}>←</button><img src="/assets/bilio-logo.png" alt="Bilio"/><h1>{title}</h1><div className="quiz-room-code"><small>ODA KODU</small><strong>{room.code}</strong></div></header><section className="quiz-lobby unified"><div className="quiz-players"><h2>OYUNCULAR <b>{room.players.length}/8</b></h2><div className="quiz-player-grid">{Array.from({ length: 8 }, (_, seat) => { const player = room.players[seat]; return player ? <article className={`quiz-player${player.bot ? ' bot' : ''}`} key={player.userId}><div className={`quiz-avatar ${player.frameId === 'frame-donut' ? 'donut' : ''}`}><img src={player.avatarUrl || '/assets/nav-donut.png'} alt=""/></div><div className="quiz-player-name"><b>{player.username}</b>{player.bot ? <img src="/assets/bilio-logo.png" alt="Bilio botu"/> : <span>{player.userId === room.hostUserId ? 'KURUCU' : 'OYUNCU'}</span>}<small>SV. {player.level || 1}</small></div><strong>{player.bot ? 'BOT' : 'HAZIR'}</strong></article> : <article className="quiz-player empty" key={`empty-${seat}`}><div className="quiz-avatar"><span>+</span></div><div className="quiz-player-name"><b>OYUNCU BEKLENİYOR</b><small>BOŞ KOLTUK</small></div></article>; })}</div></div><aside><div className="quiz-settings"><h2>ODA AYARLARI</h2><label>ODA KODUYLA KATIL<div className="quiz-join"><input aria-label="Oda kodu" value={joinCode} onChange={event => setJoinCode(event.target.value.toUpperCase())}/><button onClick={async () => { try {
            const result = await quizApi<{
                room: QuizRoom;
            }>(kind, 'join', 'POST', { code: joinCode });
            setRoom(result.room);
        }
        catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Katılınamadı.');
        } }}>KATIL</button></div></label><label>KATEGORİ<select disabled={!host} value={room.category} onChange={event => void update({ category: event.target.value })}><option>KARIŞIK</option><option>TÜRKÇE</option><option>YABANCI</option></select></label><label>SORU SAYISI<select disabled={!host} value={room.questionCount} onChange={event => void update({ questionCount: Number(event.target.value) })}><option>10</option><option>20</option><option disabled={room.category === 'TÜRKÇE'}>30</option><option disabled={room.category !== 'KARIŞIK'}>60</option></select></label><label>SORU SÜRESİ<select disabled={!host} value={room.duration} onChange={event => void update({ duration: Number(event.target.value) })}><option>10</option><option>15</option><option>20</option><option>30</option></select></label></div><div className="quiz-chat"><h2>ODA SOHBETİ</h2><div>{room.messages.length ? room.messages.map(message => <p key={message.id}><img src={message.avatarUrl || '/assets/nav-donut.png'} alt=""/><span><b>{message.username}</b>{message.content}</span></p>) : <em>Henüz mesaj yok.</em>}</div><form onSubmit={async (event) => { event.preventDefault(); if (!chat.trim())
            return; try {
            const result = await quizApi<{
                room: QuizRoom;
            }>(kind, 'chat', 'POST', { content: chat });
            setRoom(result.room);
            setChat('');
        }
        catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Mesaj gönderilemedi.');
        } }}><input aria-label="Sohbet mesajı" placeholder="Mesajını yaz…" value={chat} onChange={event => setChat(event.target.value)}/><button aria-label="Mesaj gönder">➤</button></form></div></aside></section><footer className="quiz-lobby-footer"><div><strong>{room.players.length}/8 OYUNCU HAZIR</strong><small>{host ? 'Oyuncu veya bot davet edebilir, ardından oyunu başlatabilirsin.' : 'Kurucunun oyunu başlatması bekleniyor.'}</small></div><div className="quiz-actions"><button className="invite" onClick={() => void invitePlayers(room.code)}>OYUNCU DAVET ET</button><button disabled={!host || room.players.length >= 8} onClick={async () => { const result = await quizApi<{
            room: QuizRoom;
        }>(kind, 'invite-bots', 'POST'); setRoom(result.room); }}>BOT DAVET ET</button><button disabled={!host} className="gold" onClick={async () => { const result = await quizApi<{
            room: QuizRoom;
        }>(kind, 'start', 'POST'); setRoom(result.room); }}>OYUNU BAŞLAT</button></div>{error && <small>{error}</small>}</footer></main>;
    if (room.status === 'ENDED' || room.match?.finished) {
        const ranking = [...room.players].sort((a, b) => b.score - a.score);
        return <main className="quiz-shell quiz-results-page"><header><button onClick={() => void leave()}>←</button><img src="/assets/bilio-logo.png" alt="Bilio"/><h1>{title} SONUÇLARI</h1><span /></header><section className="quiz-results"><div className="quiz-results-summary"><span>{room.questionCount} SORU</span><span>{room.category}</span><span>{room.players.length} OYUNCU</span></div><div className="quiz-podium">{ranking.slice(0, 3).map((player, rank) => <article className={`place-${rank + 1}`} key={player.userId}><div className={`quiz-result-avatar ${player.frameId === 'frame-donut' ? 'donut' : ''}`}><img src={player.avatarUrl || '/assets/nav-donut.png'} alt=""/><b>{rank + 1}</b></div><div><strong>{player.username}</strong>{player.bot ? <img src="/assets/bilio-logo.png" alt="Bilio botu"/> : <small>{player.userId === auth.user?.id ? 'SEN' : 'OYUNCU'}</small>}</div><em>{player.score.toLocaleString('tr-TR')} PUAN</em></article>)}</div>{ranking.length > 3 && <div className="quiz-ranking-list">{ranking.slice(3).map((player, index) => <article key={player.userId}><b>{index + 4}</b><div className={`quiz-result-mini ${player.frameId === 'frame-donut' ? 'donut' : ''}`}><img src={player.avatarUrl || '/assets/nav-donut.png'} alt=""/></div><span>{player.username}</span>{player.bot && <img src="/assets/bilio-logo.png" alt="Bilio botu"/>}<strong>{player.score.toLocaleString('tr-TR')} PUAN</strong></article>)}</div>}<div className="quiz-result-actions"><button onClick={() => void replay()}>TEKRAR OYNA</button><button className="gold" onClick={() => void leave()}>OYUNLARA DÖN</button></div></section></main>;
    }
    return <main className={`quiz-shell ${themeClass}`}><header><button onClick={() => void leave()}>←</button><img src="/assets/bilio-logo.png" alt="Bilio"/><h1>{title}</h1><strong>{seconds} SN</strong></header><section className="quiz-game"><div className="quiz-top"><b>{index + 1} / {room.questionCount} SORU · {room.category}</b><span>PUAN {me?.score || 0}</span></div>{kind === 'song' ? <div className="quiz-media song"><h2>Bu şarkının adı nedir?</h2><SongPlayer song={song} index={songs.indexOf(song)}/></div> : <div className="quiz-media">{kind === 'streamer' ? <StreamerPortrait name={answer} index={globalQuestionIndex}/> : <WikiPortrait name={answer}/>}<h2>{kind === 'streamer' ? 'Bu yayıncı kimdir?' : 'Resimdeki ünlü kimdir?'}</h2></div>}<div className="quiz-answers">{choices.map(choice => <button key={choice} disabled={answered} className={picked ? (choice === answer ? 'correct' : choice === picked ? 'wrong' : '') : ''} onClick={async () => { setPicked(choice); try {
        const result = await quizApi<{
            room: QuizRoom;
        }>(kind, 'answer', 'POST', { questionIndex: index, choice });
        setRoom(result.room);
    }
    catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Cevap gönderilemedi.');
    } }}>{choice}</button>)}</div><div className="quiz-bot-score">{room.players.map(player => <span key={player.userId}>{player.bot ? '🍩' : '●'} {player.username}: {player.score}</span>)}</div>{error && <div className="media-error">{error}</div>}</section></main>;
}
