// ponytail: was Supabase-session-backed; now backed by bilio's cookie session (/api/me + /api/profile).
import { useCallback, useEffect, useState } from 'react';
import { api, avatarColorFor, titleNameFor } from './bilioApi';
import type { Profile } from './types';

export type Session = { user: { id: string } };

type BilioMe = {
  id: string; username: string; level: number; xp: number; selectedTitleId: string;
  gold: number; diamonds: number; unreadMessages: number; unreadNotifications: number;
};

type BilioProfile = {
  userId: string; username: string; createdAt: string; level: number; xp: number;
  about: string; avatarUrl: string; selectedTitleId: string; selectedFrameId: string | null;
  stats: { matches: number; wins: number; correct: number; score: number };
  likeCount: number;
};

function toProfile(me: BilioMe, p: BilioProfile): Profile {
  return {
    id: me.id,
    username: me.username,
    about: p.about || '',
    avatar_url: p.avatarUrl || null,
    avatar_color: avatarColorFor(me.username),
    level: me.level,
    xp: me.xp,
    gold: me.gold,
    diamonds: me.diamonds,
    likes: p.likeCount || 0,
    title: titleNameFor(me.selectedTitleId),
    frame: p.selectedFrameId || '',
    total_matches: p.stats?.matches || 0,
    total_wins: p.stats?.wins || 0,
    total_correct: p.stats?.correct || 0,
    total_score: p.stats?.score || 0,
    weekly_score: 0, // ponytail: bilio doesn't expose this per-profile yet — wire up when the leaderboard phase lands
    reward_claimed: true,
    created_at: p.createdAt,
  };
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    try {
      const [{ user }, { profile: p }] = await Promise.all([
        api<{ user: BilioMe }>('/me'),
        api<{ profile: BilioProfile }>('/profile'),
      ]);
      setSession({ user: { id: user.id } });
      setProfile(toProfile(user, p));
    } catch {
      setSession(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refreshProfile(); }, [refreshProfile]);

  return { session, profile, loading, refreshProfile, setProfile };
}
