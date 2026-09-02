export type Profile = {
  id: string;
  username: string;
  about: string;
  avatar_url: string | null;
  avatar_color: string;
  level: number;
  xp: number;
  gold: number;
  diamonds: number;
  likes: number;
  title: string;
  frame: string;
  total_matches: number;
  total_wins: number;
  total_correct: number;
  total_score: number;
  weekly_score: number;
  reward_claimed: boolean;
  created_at: string;
};

export type Bot = {
  id: string;
  username: string;
  avatar_color: string;
  gender: string;
  is_online: boolean;
};

export type Room = {
  id: string;
  owner_id: string;
  game_type: string;
  code: string;
  capacity: number;
  status: string;
  settings: Record<string, unknown>;
  created_at: string;
};

export type RoomMember = {
  room_id: string;
  user_id: string;
  is_bot: boolean;
  ready: boolean;
  joined_at: string;
  profile?: Profile | null;
  bot?: Bot | null;
};

export type LobbyMessage = {
  id: string;
  body: string;
  created_at: string;
  sender_id: string;
  sender: { username: string; avatar_color: string; level: number; title: string; frame: string }[] | null;
};

export type PrivateMessage = {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

export type ShopItem = {
  id: string;
  name: string;
  type: string;
  price: number;
  currency: string;
  image_url: string | null;
  rarity: string;
};

export type InventoryItem = {
  id: string;
  user_id: string;
  item_id: string;
  equipped: boolean;
  purchased_at: string;
  item: ShopItem | null;
};

export type Badge = {
  id: string;
  name: string;
  description: string;
  image_url: string;
  unlock_level: number;
  unlock_condition: string;
};

export type UserBadge = {
  user_id: string;
  badge_id: string;
  in_showcase: boolean;
  showcase_order: number;
  earned_at: string;
  badge: Badge | null;
};

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
};

export type Friend = {
  user_id: string;
  friend_id: string;
  created_at: string;
  profile: Profile | null;
};

export type FriendRequest = {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  created_at: string;
  responded_at: string | null;
  sender: Profile | null;
};

export type GameQuestion = {
  id: string;
  game_type: string;
  category: string;
  question: string;
  correct_answer: string;
  options: string[];
  image_url: string | null;
  audio_url: string | null;
};

export type LeaderboardEntry = {
  user_id: string;
  username: string;
  title: string;
  frame: string;
  avatar_color: string;
  avatar_url: string | null;
  weekly_score: number;
  level: number;
  total_wins: number;
};

export type DonutPackage = {
  id: string;
  owner_id: string;
  total_diamonds: number;
  remaining_diamonds: number;
  max_openers: number;
  opened_count: number;
  is_active: boolean;
  created_at: string;
};

export type GameDef = {
  name: string;
  description: string;
  players: string;
  color: string;
  icon: string;
  mode: string;
  maxPlayers: number;
};

export type BBMatchPlayer = {
  match_id: string;
  user_id: string;
  is_bot: boolean;
  username: string;
  avatar_color: string;
  avatar_url: string | null;
  level: number;
  title: string | null;
  frame: string | null;
  score: number;
  words_found: number;
  wrong_attempts: number;
  turn_order: number;
  eliminated: boolean;
  reward_claimed: boolean;
};

export type BBWordEntry = {
  word: string;
  found: boolean;
  foundBy: string | null;
};

export type BBMatchState = {
  board: string[][];
  words: BBWordEntry[];
  players: BBMatchPlayer[];
  current_turn_index: number;
  turn_ends_at: string | null;
  seconds_left: number;
  status: string;
  winners: BBMatchWinner[] | null;
};

export type BBMatchWinner = {
  user_id: string;
  username: string;
  score: number;
  words_found: number;
  wrong_attempts: number;
  is_bot: boolean;
};
