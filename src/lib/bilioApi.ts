// ponytail: replaces src/lib/supabase.ts as the backend client — talks to the real bilio VDS
// REST API (auth-server.mjs) instead of Supabase. Session is a plain HttpOnly cookie, not a JWT.
export type ApiError = { error?: string };

export async function api<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch('/api' + path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    credentials: 'include',
  });
  const body = (await response.json().catch((): ApiError => ({}))) as ApiError;
  if (!response.ok) throw new Error(body.error || 'İşlem başarısız.');
  return body as T;
}

// Display name for a title id (bilio has no separate title-name table — it's derived by index).
// Kept as a flat list matching src/data/titles.ts on the bilio side; update both together.
const TITLE_NAMES = [
  'ACEMİ', 'ÇAYLAK', 'YOLCU', 'KAŞİF', 'OYUNCU', 'YETENEKLİ', 'USTA', 'UZMAN', 'STRATEJİST', 'BİLGE',
  'ELİT', 'SEÇKİN', 'ŞAMPİYON', 'KAHRAMAN', 'YILDIZ', 'EFSANE ADAYI', 'BÜYÜK USTA', 'ZİRVE', 'KOZMİK', 'KOZMİK II',
  'TAHT VARİSİ', 'YÜCE', 'ÖLÜMSÜZ', 'MİTİK', 'EFSANEVİ', 'LEGEND',
];

export function titleNameFor(titleId: string | undefined | null): string {
  const n = Number((titleId || '').replace('title-', ''));
  return TITLE_NAMES[n - 1] || TITLE_NAMES[0];
}

// Bolt's Avatar component expects a stable hex/tailwind color per user; bilio has no such field,
// so derive one deterministically from the username (same user always gets the same color).
const AVATAR_COLORS = ['#f97316', '#ef4444', '#ec4899', '#a855f7', '#6366f1', '#3b82f6', '#14b8a6', '#22c55e', '#eab308'];
export function avatarColorFor(username: string): string {
  let hash = 0;
  for (let i = 0; i < username.length; i++) hash = (hash * 31 + username.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}
