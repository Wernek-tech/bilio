type Props={username:string;avatarUrl?:string;frameId?:string|null;className?:string;level?:number;alt?:string};

export default function PlayerAvatar({username,avatarUrl,frameId,className='',level,alt}:Props){
 return <div className={`player-avatar ${frameId?`has-frame ${frameId}`:''} ${className}`.trim()} data-frame={frameId||undefined}>
  <div className="player-avatar-photo">{avatarUrl?<img src={avatarUrl} alt={alt||`${username} profil resmi`}/>:<span>{username.slice(0,1).toLocaleUpperCase('tr-TR')}</span>}</div>
  {frameId==='frame-melek-kanatlari'&&<img className="player-avatar-ornament" src="/assets/frames/frame-melek-kanatlari.png" alt="" aria-hidden="true"/>}
  {typeof level==='number'&&<i className="player-avatar-level">{level}</i>}
 </div>;
}
