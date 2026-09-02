import type { Profile, Bot } from '@/lib/types';

type AvatarProps = {
  profile?: Profile | null;
  bot?: Bot | null;
  size?: number;
  showFrame?: boolean;
  showBotTag?: boolean;
  className?: string;
};

export function Avatar({ profile, bot, size = 40, showFrame = true, showBotTag = false, className = '' }: AvatarProps) {
  const initial = (bot?.username ?? profile?.username ?? '?').slice(0, 1).toUpperCase();
  const bgColor = bot?.avatar_color ?? profile?.avatar_color ?? '#ff7e57';
  const frame = profile?.frame ?? '';
  const isBot = !!bot;
  const fontSize = Math.max(12, Math.round(size * 0.42));

  return (
    <div className={`avatar-wrap ${className}`} style={{ width: size, height: size }}>
      <div
        className="avatar-circle"
        style={{
          width: size,
          height: size,
          background: `linear-gradient(135deg, ${bgColor}, ${shadeColor(bgColor, -25)})`,
          fontSize,
        }}
      >
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt={profile.username} className="avatar-img" />
        ) : (
          <span>{initial}</span>
        )}
      </div>
      {showFrame && frame === 'Melek Kanatları' && (
        <div className="frame-angel" style={{ width: size * 1.5, height: size * 1.5, top: -size * 0.25, left: -size * 0.25 }}>
          <svg viewBox="0 0 100 100" fill="none" style={{ width: '100%', height: '100%' }}>
            <path d="M50 15 Q20 25 15 50 Q25 35 50 40 Z" fill="rgba(255,255,255,0.7)" stroke="#ffd700" strokeWidth="1.5" />
            <path d="M50 15 Q80 25 85 50 Q75 35 50 40 Z" fill="rgba(255,255,255,0.7)" stroke="#ffd700" strokeWidth="1.5" />
          </svg>
        </div>
      )}
      {showFrame && frame === 'Altın Çerçeve' && (
        <div className="frame-gold" style={{ width: size + 6, height: size + 6, top: -3, left: -3, borderRadius: '50%', border: '3px solid #ffd700', position: 'absolute', boxShadow: '0 0 8px #ffd70080' }} />
      )}
      {showFrame && frame === 'Gümüş Çerçeve' && (
        <div className="frame-silver" style={{ width: size + 6, height: size + 6, top: -3, left: -3, borderRadius: '50%', border: '3px solid #c0c0c0', position: 'absolute' }} />
      )}
      {showFrame && frame === 'Neon Çerçeve' && (
        <div className="frame-neon" style={{ width: size + 6, height: size + 6, top: -3, left: -3, borderRadius: '50%', border: '3px solid #ff4f91', position: 'absolute', boxShadow: '0 0 12px #ff4f91, inset 0 0 8px #ff4f9150' }} />
      )}
      {showFrame && frame === 'Alev Çerçevesi' && (
        <div className="frame-fire" style={{ width: size + 6, height: size + 6, top: -3, left: -3, borderRadius: '50%', border: '3px solid #ff6b35', position: 'absolute', boxShadow: '0 0 10px #ff6b3580' }} />
      )}
      {showFrame && frame === 'Buz Çerçevesi' && (
        <div className="frame-ice" style={{ width: size + 6, height: size + 6, top: -3, left: -3, borderRadius: '50%', border: '3px solid #88e0ff', position: 'absolute', boxShadow: '0 0 10px #88e0ff80' }} />
      )}
      {showFrame && frame === 'Çiçek Çerçevesi' && (
        <div className="frame-flower" style={{ width: size + 6, height: size + 6, top: -3, left: -3, borderRadius: '50%', border: '3px solid #f0a0c0', position: 'absolute' }} />
      )}
      {showFrame && frame === 'Yıldız Çerçevesi' && (
        <div className="frame-star" style={{ width: size + 6, height: size + 6, top: -3, left: -3, borderRadius: '50%', border: '3px solid #ffe070', position: 'absolute', boxShadow: '0 0 8px #ffe07080' }} />
      )}
      {isBot && (
        <div className="bot-donut-frame" style={{ width: size + 8, height: size + 8, top: -4, left: -4, borderRadius: '50%', border: '3px dashed #ff82b0', position: 'absolute' }} />
      )}
      {showBotTag && isBot && (
        <span className="bot-tag" style={{ fontSize: Math.max(8, Math.round(size * 0.2)), bottom: -size * 0.05 }}>BOT</span>
      )}
    </div>
  );
}

function shadeColor(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, Math.min(255, (num >> 16) + amt));
  const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amt));
  const B = Math.max(0, Math.min(255, (num & 0x0000ff) + amt));
  return `#${((R << 16) | (G << 8) | B).toString(16).padStart(6, '0')}`;
}
