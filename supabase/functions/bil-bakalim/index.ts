import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const TURKISH_LETTERS = "ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ";

interface PlacedWord {
  word: string;
  row: number;
  col: number;
  direction: [number, number];
  found: boolean;
  foundBy: string | null;
}

interface MatchState {
  board: string[][];
  words: PlacedWord[];
  foundWords: string[];
  currentTurnIndex: number;
  turnEndsAt: string | null;
  status: string;
}

const DIRECTIONS: [number, number][] = [
  [0, 1], [0, -1], [1, 0], [-1, 0],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickWords(allWords: { word: string; category: string }[], category: string, count: number): string[] {
  let pool: string[];
  if (category === "Karışık") {
    const cats = ["Hayvanlar", "Sanatçılar", "Nesneler", "Şarkı İsimleri", "Yemekler"];
    const perCat = Math.ceil(count / cats.length);
    const picked: string[] = [];
    for (const cat of cats) {
      const catWords = shuffle(allWords.filter((w) => w.category === cat).map((w) => w.word)).slice(0, perCat);
      picked.push(...catWords);
    }
    return shuffle(picked).slice(0, count);
  }
  pool = shuffle(allWords.filter((w) => w.category === category).map((w) => w.word));
  return pool.slice(0, count);
}

function canPlaceWord(board: string[][], word: string, row: number, col: number, dr: number, dc: number, size: number): boolean {
  for (let i = 0; i < word.length; i++) {
    const r = row + dr * i;
    const c = col + dc * i;
    if (r < 0 || r >= size || c < 0 || c >= size) return false;
    const existing = board[r][c];
    if (existing !== "" && existing !== word[i]) return false;
  }
  return true;
}

function placeWordOnBoard(board: string[][], word: string, row: number, col: number, dr: number, dc: number): void {
  for (let i = 0; i < word.length; i++) {
    board[row + dr * i][col + dc * i] = word[i];
  }
}

function generateBoard(words: string[], size: number): { board: string[][]; placed: PlacedWord[] } {
  const board: string[][] = Array.from({ length: size }, () => Array(size).fill(""));
  const placed: PlacedWord[] = [];
  const sortedWords = [...words].sort((a, b) => b.length - a.length);

  for (const word of sortedWords) {
    let placedFlag = false;
    for (let attempt = 0; attempt < 200 && !placedFlag; attempt++) {
      const dir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
      const maxRow = dir[0] > 0 ? size - word.length : size - 1;
      const minRow = dir[0] < 0 ? word.length - 1 : 0;
      const maxCol = dir[1] > 0 ? size - word.length : size - 1;
      const minCol = dir[1] < 0 ? word.length - 1 : 0;
      const row = Math.floor(Math.random() * (maxRow - minRow + 1)) + minRow;
      const col = Math.floor(Math.random() * (maxCol - minCol + 1)) + minCol;
      if (canPlaceWord(board, word, row, col, dir[0], dir[1], size)) {
        placeWordOnBoard(board, word, row, col, dir[0], dir[1]);
        placed.push({ word, row, col, direction: dir, found: false, foundBy: null });
        placedFlag = true;
      }
    }
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c] === "") {
        board[r][c] = TURKISH_LETTERS[Math.floor(Math.random() * TURKISH_LETTERS.length)];
      }
    }
  }
  return { board, placed };
}

function isStraightLine(r1: number, c1: number, r2: number, c2: number): boolean {
  const dr = r2 - r1;
  const dc = c2 - c1;
  return dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc);
}

function extractWord(board: string[][], r1: number, c1: number, r2: number, c2: number): string {
  const dr = r2 - r1;
  const dc = c2 - c1;
  const len = Math.max(Math.abs(dr), Math.abs(dc)) + 1;
  const stepR = dr === 0 ? 0 : Math.sign(dr);
  const stepC = dc === 0 ? 0 : Math.sign(dc);
  let word = "";
  for (let i = 0; i < len; i++) {
    word += board[r1 + stepR * i][c1 + stepC * i];
  }
  return word;
}

function extractWordReversed(board: string[][], r1: number, c1: number, r2: number, c2: number): string {
  const dr = r2 - r1;
  const dc = c2 - c1;
  const len = Math.max(Math.abs(dr), Math.abs(dc)) + 1;
  const stepR = dr === 0 ? 0 : Math.sign(dr);
  const stepC = dc === 0 ? 0 : Math.sign(dc);
  let word = "";
  for (let i = len - 1; i >= 0; i--) {
    word += board[r1 + stepR * i][c1 + stepC * i];
  }
  return word;
}

function calculateScore(word: string, secondsLeft: number): number {
  return word.length * 20 + secondsLeft * 2;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Yetkilendirme gerekli." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Geçersiz oturum." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const action = body.action;

    // ─── START MATCH ───
    if (action === "start_match") {
      const { room_id } = body;
      if (!room_id) return errorResponse("Oda kimliği gerekli.");

      const { data: room } = await supabase.from("rooms").select("*").eq("id", room_id).maybeSingle();
      if (!room) return errorResponse("Oda bulunamadı.");
      if (room.owner_id !== user.id) return errorResponse("Sadece oda sahibi oyunu başlatabilir.");

      const { data: members, error: membersError } = await supabase.from("room_members")
        .select("*").eq("room_id", room_id);
      if (membersError) return errorResponse("Oyuncular yüklenemedi.");
      if (!members || members.length < 1) return errorResponse("Oynamak için en az 1 oyuncu gerekli.");

      const humanIds = members.filter((m: any) => !m.is_bot).map((m: any) => m.user_id);
      const { data: profiles, error: profilesError } = humanIds.length > 0
        ? await supabase.from("profiles").select("id, username, avatar_color, avatar_url, level, title, frame").in("id", humanIds)
        : { data: [], error: null };
      if (profilesError) return errorResponse("Oyuncu profilleri yüklenemedi.");
      const profilesById = new Map((profiles ?? []).map((p: any) => [p.id, p]));
      for (const member of members) {
        member.profile = member.is_bot ? null : profilesById.get(member.user_id) ?? null;
      }

      const realPlayers = members.filter((m: any) => !m.is_bot);
      if (!realPlayers.every((m: any) => m.ready)) return errorResponse("Tüm oyuncular hazır olmalı.");

      const settings = room.settings || {};
      const category = settings.category || "Karışık";
      const turnDuration = settings.turn_duration || 45;
      const wordCount = settings.word_count || 20;
      const capacity = settings.capacity || room.capacity || 4;

      const { data: allWords } = await supabase.from("bb_word_pool").select("word, category");
      if (!allWords || allWords.length === 0) return errorResponse("Kelime havuzu boş.");

      const selectedWords = pickWords(allWords, category, wordCount);
      const gridSize = 15;
      const { board, placed } = generateBoard(selectedWords, gridSize);

      const { data: match } = await supabase.from("bb_matches").insert({
        room_id,
        board: JSON.stringify(board),
        words: JSON.stringify(placed.map(p => ({ word: p.word, row: p.row, col: p.col, direction: p.direction, found: false, foundBy: null }))),
        category,
        grid_size: gridSize,
        turn_duration: turnDuration,
        total_words: placed.length,
        current_turn_index: 0,
        turn_ends_at: new Date(Date.now() + turnDuration * 1000).toISOString(),
        status: "playing",
      }).select().maybeSingle();

      if (!match) return errorResponse("Maç oluşturulamadı.");

      const { data: bots } = await supabase.from("bots").select("*");
      const botMap = new Map((bots ?? []).map((b: any) => [b.id, b]));

      const playersData = members.map((m: any, idx: number) => ({
        match_id: match.id,
        user_id: m.user_id,
        is_bot: m.is_bot,
        username: m.is_bot ? (botMap.get(m.user_id)?.username ?? "Bot") : (m.profile?.username ?? "Oyuncu"),
        avatar_color: m.is_bot ? (botMap.get(m.user_id)?.avatar_color ?? "#ff7e57") : (m.profile?.avatar_color ?? "#ff7e57"),
        avatar_url: m.is_bot ? null : (m.profile?.avatar_url ?? null),
        level: m.is_bot ? 1 : (m.profile?.level ?? 1),
        title: m.is_bot ? null : (m.profile?.title ?? null),
        frame: m.is_bot ? null : (m.profile?.frame ?? null),
        score: 0,
        words_found: 0,
        wrong_attempts: 0,
        turn_order: idx,
        eliminated: false,
        reward_claimed: false,
      }));

      await supabase.from("bb_match_players").insert(playersData);
      await supabase.from("rooms").update({ status: "playing" }).eq("id", room_id);

      return jsonResponse({ match_id: match.id });
    }

    // ─── GET STATE ───
    if (action === "get_state") {
      const { match_id } = body;
      if (!match_id) return errorResponse("Maç kimliği gerekli.");

      const { data: match } = await supabase.from("bb_matches").select("*").eq("id", match_id).maybeSingle();
      if (!match) return errorResponse("Maç bulunamadı.");

      const { data: players } = await supabase.from("bb_match_players").select("*").eq("match_id", match_id).order("turn_order");

      const board = typeof match.board === "string" ? JSON.parse(match.board) : match.board;
      const words = typeof match.words === "string" ? JSON.parse(match.words) : match.words;

      const safeWords = words.map((w: any) => ({
        word: w.word,
        found: w.found,
        foundBy: w.foundBy,
      }));

      let secondsLeft = 0;
      if (match.turn_ends_at && match.status === "playing") {
        secondsLeft = Math.max(0, Math.round((new Date(match.turn_ends_at).getTime() - Date.now()) / 1000));
      }

      return jsonResponse({
        board,
        words: safeWords,
        players: players ?? [],
        current_turn_index: match.current_turn_index,
        turn_ends_at: match.turn_ends_at,
        seconds_left: secondsLeft,
        status: match.status,
        winners: match.winners,
      });
    }

    // ─── SUBMIT SELECTION ───
    if (action === "submit_selection") {
      const { match_id, start, end, request_id } = body;
      if (!match_id || !start || !end || !request_id) return errorResponse("Eksik parametre.");

      const { data: existing } = await supabase.from("bb_selection_log")
        .select("id").eq("match_id", match_id).eq("request_id", request_id).maybeSingle();
      if (existing) return errorResponse("Bu istek zaten işlendi.");

      await supabase.from("bb_selection_log").insert({
        match_id, request_id, user_id: user.id,
      });

      const { data: match } = await supabase.from("bb_matches").select("*").eq("id", match_id).maybeSingle();
      if (!match) return errorResponse("Maç bulunamadı.");
      if (match.status !== "playing") return errorResponse("Maç sona erdi.");

      const { data: players } = await supabase.from("bb_match_players")
        .select("*").eq("match_id", match_id).order("turn_order");
      if (!players) return errorResponse("Oyuncular bulunamadı.");

      const activePlayer = players[match.current_turn_index];
      if (!activePlayer) return errorResponse("Aktif oyuncu bulunamadı.");
      if (activePlayer.user_id !== user.id) return errorResponse("Sıra sende değil.");
      if (activePlayer.eliminated) return errorResponse("Oyundan elendin.");

      if (match.turn_ends_at && new Date(match.turn_ends_at).getTime() < Date.now()) {
        return errorResponse("Süre doldu.");
      }

      const board = typeof match.board === "string" ? JSON.parse(match.board) : match.board;
      const words = typeof match.words === "string" ? JSON.parse(match.words) : match.words;

      const [r1, c1] = start;
      const [r2, c2] = end;
      if (!isStraightLine(r1, c1, r2, c2)) return errorResponse("Geçersiz seçim — yatay, dikey veya çapraz olmalı.");
      if (r1 === r2 && c1 === c2) return errorResponse("En az iki harf seçmelisin.");

      const selectedWord = extractWord(board, r1, c1, r2, c2);
      const reversedWord = extractWordReversed(board, r1, c1, r2, c2);

      let foundWordEntry: any = null;
      for (const w of words) {
        if (w.found) continue;
        if (w.word === selectedWord || w.word === reversedWord) {
          foundWordEntry = w;
          break;
        }
      }

      if (!foundWordEntry) {
        await supabase.from("bb_match_players").update({
          wrong_attempts: activePlayer.wrong_attempts + 1,
        }).eq("match_id", match_id).eq("user_id", user.id);

        await advanceTurn(supabase, match_id, match, players);
        return errorResponse("Hatalı seçim — sıra diğer oyuncuya geçti.");
      }

      foundWordEntry.found = true;
      foundWordEntry.foundBy = user.id;

      const secondsLeft = match.turn_ends_at
        ? Math.max(0, Math.round((new Date(match.turn_ends_at).getTime() - Date.now()) / 1000))
        : 0;
      const score = calculateScore(foundWordEntry.word, secondsLeft);

      await supabase.from("bb_match_players").update({
        score: activePlayer.score + score,
        words_found: activePlayer.words_found + 1,
      }).eq("match_id", match_id).eq("user_id", user.id);

      await supabase.from("bb_matches").update({
        words: JSON.stringify(words),
      }).eq("id", match_id);

      const allFound = words.every((w: any) => w.found);
      if (allFound) {
        await finishMatch(supabase, match_id, players);
      } else {
        await advanceTurn(supabase, match_id, match, players);
      }

      return jsonResponse({ correct: true, score, word: foundWordEntry.word });
    }

    // ─── TIMEOUT CHECK ───
    if (action === "check_timeout") {
      const { match_id } = body;
      if (!match_id) return errorResponse("Maç kimliği gerekli.");

      const { data: match } = await supabase.from("bb_matches").select("*").eq("id", match_id).maybeSingle();
      if (!match || match.status !== "playing") return jsonResponse({ ok: true });

      if (match.turn_ends_at && new Date(match.turn_ends_at).getTime() < Date.now()) {
        const { data: players } = await supabase.from("bb_match_players")
          .select("*").eq("match_id", match_id).order("turn_order");
        if (players) await advanceTurn(supabase, match_id, match, players);
      }
      return jsonResponse({ ok: true });
    }

    // ─── LEAVE MATCH ───
    if (action === "leave_match") {
      const { match_id } = body;
      if (!match_id) return errorResponse("Maç kimliği gerekli.");

      const { data: players } = await supabase.from("bb_match_players")
        .select("*").eq("match_id", match_id).order("turn_order");
      if (!players) return errorResponse("Oyuncular bulunamadı.");

      const leavingPlayer = players.find((p: any) => p.user_id === user.id);
      if (!leavingPlayer) return errorResponse("Bu maçta değilsin.");

      await supabase.from("bb_match_players").update({
        eliminated: true,
      }).eq("match_id", match_id).eq("user_id", user.id);

      const activePlayers = players.filter((p: any) => p.user_id !== user.id && !p.eliminated);
      if (activePlayers.length === 0) {
        await supabase.from("bb_matches").update({
          status: "finished",
          finished_at: new Date().toISOString(),
        }).eq("id", match_id);
      } else {
        const match = await supabase.from("bb_matches").select("*").eq("id", match_id).maybeSingle();
        if (match.data) await advanceTurn(supabase, match_id, match.data, players);
      }

      return jsonResponse({ ok: true });
    }

    // ─── CLAIM REWARD ───
    if (action === "claim_reward") {
      const { match_id } = body;
      if (!match_id) return errorResponse("Maç kimliği gerekli.");

      const { data: match } = await supabase.from("bb_matches").select("*").eq("id", match_id).maybeSingle();
      if (!match) return errorResponse("Maç bulunamadı.");
      if (match.status !== "finished") return errorResponse("Maç henüz bitmedi.");

      const { data: player } = await supabase.from("bb_match_players")
        .select("*").eq("match_id", match_id).eq("user_id", user.id).maybeSingle();
      if (!player) return errorResponse("Bu maçta değilsin.");
      if (player.reward_claimed) return errorResponse("Ödül zaten alındı.");
      if (player.is_bot) return errorResponse("Botlar ödül alamaz.");

      const xpGain = 30 + player.words_found * 10 + Math.max(0, 50 - player.wrong_attempts * 5);
      const goldGain = player.words_found * 5;
      const diamondGain = player.words_found > 5 ? 2 : 0;

      await supabase.from("bb_match_players").update({
        reward_claimed: true,
      }).eq("match_id", match_id).eq("user_id", user.id);

      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (profile) {
        const newXp = profile.xp + xpGain;
        const newLevel = Math.floor(newXp / 1000) + 1;
        await supabase.from("profiles").update({
          xp: newXp,
          level: Math.max(profile.level, newLevel),
          gold: profile.gold + goldGain,
          diamonds: profile.diamonds + diamondGain,
          total_matches: profile.total_matches + 1,
          total_correct: profile.total_correct + player.words_found,
          total_score: profile.total_score + player.score,
          weekly_score: profile.weekly_score + player.score,
        }).eq("id", user.id);

        if (player.words_found > 0 && player.score > 0) {
          const isWinner = match.winners && Array.isArray(match.winners) && match.winners[0]?.user_id === user.id;
          if (isWinner) {
            await supabase.from("profiles").update({
              total_wins: profile.total_wins + 1,
            }).eq("id", user.id);
          }
        }
      }

      return jsonResponse({ xp: xpGain, gold: goldGain, diamonds: diamondGain });
    }

    // ─── BOT MOVE ───
    if (action === "bot_move") {
      const { match_id, bot_user_id } = body;
      if (!match_id || !bot_user_id) return errorResponse("Eksik parametre.");

      const { data: match } = await supabase.from("bb_matches").select("*").eq("id", match_id).maybeSingle();
      if (!match || match.status !== "playing") return jsonResponse({ ok: true });

      const { data: players } = await supabase.from("bb_match_players")
        .select("*").eq("match_id", match_id).order("turn_order");
      if (!players) return jsonResponse({ ok: true });

      const activePlayer = players[match.current_turn_index];
      if (!activePlayer || activePlayer.user_id !== bot_user_id || !activePlayer.is_bot) {
        return jsonResponse({ ok: true });
      }

      const board = typeof match.board === "string" ? JSON.parse(match.board) : match.board;
      const words = typeof match.words === "string" ? JSON.parse(match.words) : match.words;

      const unfoundWords = words.filter((w: any) => !w.found);

      if (unfoundWords.length === 0 || Math.random() < 0.2) {
        await supabase.from("bb_match_players").update({
          wrong_attempts: activePlayer.wrong_attempts + 1,
        }).eq("match_id", match_id).eq("user_id", bot_user_id);
        await advanceTurn(supabase, match_id, match, players);
        return jsonResponse({ bot_action: "miss" });
      }

      const target = unfoundWords[Math.floor(Math.random() * Math.min(3, unfoundWords.length))];
      const start = [target.row, target.col];
      const end = [target.row + target.direction[0] * (target.word.length - 1), target.col + target.direction[1] * (target.word.length - 1)];

      target.found = true;
      target.foundBy = bot_user_id;

      const secondsLeft = match.turn_ends_at
        ? Math.max(0, Math.round((new Date(match.turn_ends_at).getTime() - Date.now()) / 1000))
        : 0;
      const score = Math.round(calculateScore(target.word, secondsLeft) * 0.7);

      await supabase.from("bb_match_players").update({
        score: activePlayer.score + score,
        words_found: activePlayer.words_found + 1,
      }).eq("match_id", match_id).eq("user_id", bot_user_id);

      await supabase.from("bb_matches").update({
        words: JSON.stringify(words),
      }).eq("id", match_id);

      const allFound = words.every((w: any) => w.found);
      if (allFound) {
        await finishMatch(supabase, match_id, players);
      } else {
        await advanceTurn(supabase, match_id, match, players);
      }

      return jsonResponse({ bot_action: "found", word: target.word, score });
    }

    return errorResponse("Bilinmeyen eylem.");
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || "Sunucu hatası." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function errorResponse(msg: string): Response {
  return new Response(JSON.stringify({ error: msg }), {
    status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function jsonResponse(data: any): Response {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function advanceTurn(supabase: any, matchId: string, match: any, players: any[]): Promise<void> {
  const activePlayers = players.filter((p: any) => !p.eliminated);
  if (activePlayers.length === 0) {
    await supabase.from("bb_matches").update({ status: "finished", finished_at: new Date().toISOString() }).eq("id", matchId);
    return;
  }

  let nextIndex = (match.current_turn_index + 1) % players.length;
  let safety = 0;
  while (players[nextIndex]?.eliminated && safety < players.length) {
    nextIndex = (nextIndex + 1) % players.length;
    safety++;
  }

  await supabase.from("bb_matches").update({
    current_turn_index: nextIndex,
    turn_ends_at: new Date(Date.now() + match.turn_duration * 1000).toISOString(),
  }).eq("id", matchId);
}

async function finishMatch(supabase: any, matchId: string, players: any[]): Promise<void> {
  const sorted = [...players].sort((a: any, b: any) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.words_found !== a.words_found) return b.words_found - a.words_found;
    return a.wrong_attempts - b.wrong_attempts;
  });

  await supabase.from("bb_matches").update({
    status: "finished",
    finished_at: new Date().toISOString(),
    winners: JSON.stringify(sorted.map((p: any) => ({
      user_id: p.user_id,
      username: p.username,
      score: p.score,
      words_found: p.words_found,
      wrong_attempts: p.wrong_attempts,
      is_bot: p.is_bot,
    }))),
  }).eq("id", matchId);
}
