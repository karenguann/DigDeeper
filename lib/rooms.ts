import "server-only";

import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { promptsForDayIndex } from "@/data/dailyPrompts";
import { dayIndexFromDate } from "@/lib/day";
import { GameError } from "@/lib/errors";
import { normalize, scoreGuess } from "@/lib/scoring";
import type { BankWord, Outcome, Role, RoomStatus, RoomView } from "@/lib/types";

const BANK_MS = 60_000;
const BANK_GRACE_MS = 2_000;
const DIG_MS = 25_000;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

type RoomRow = {
  code: string;
  day_index: number;
  status: RoomStatus;
  round_index: number;
  digger_token: string | null;
  geologist_token: string | null;
  bank_ends_at: number | null;
  dig_ends_at: number | null;
  created_at: number;
};

type RoundRow = {
  room_code: string;
  round_index: number;
  bank_json: string | null;
  reasoning: string | null;
  guess: string | null;
  outcome: Outcome | null;
  rarity: number | null;
  gem_type: string | null;
  gem_emoji: string | null;
  depth_gained: number | null;
  matched_bank_word: string | null;
  matched_tier: number | null;
  matched_canonical: string | null;
};

type RoundRecord = {
  roundIndex: number;
  bank: BankWord[] | null;
  reasoning: string | null;
  guess: string | null;
  outcome: Outcome | null;
  rarity: number | null;
  gemType: string | null;
  gemEmoji: string | null;
  depthGained: number | null;
  matchedBankWord: string | null;
  matchedCanonical: string | null;
};

type RoomRecord = {
  code: string;
  dayIndex: number;
  status: RoomStatus;
  roundIndex: number;
  diggerToken: string | null;
  geologistToken: string | null;
  bankEndsAt: number | null;
  digEndsAt: number | null;
  createdAt: number;
  rounds: RoundRecord[];
};

function dbPath() {
  const dir = path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, "rooms.db");
}

function getDb() {
  const globalDb = globalThis as unknown as { __digDb?: DatabaseSync };
  if (!globalDb.__digDb) {
    const database = new DatabaseSync(dbPath());
    database.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS rooms (
        code TEXT PRIMARY KEY,
        day_index INTEGER NOT NULL,
        status TEXT NOT NULL,
        round_index INTEGER NOT NULL,
        digger_token TEXT,
        geologist_token TEXT,
        bank_ends_at INTEGER,
        dig_ends_at INTEGER,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS rounds (
        room_code TEXT NOT NULL,
        round_index INTEGER NOT NULL,
        bank_json TEXT,
        reasoning TEXT,
        guess TEXT,
        outcome TEXT,
        rarity INTEGER,
        gem_type TEXT,
        gem_emoji TEXT,
        depth_gained INTEGER,
        matched_bank_word TEXT,
        matched_tier INTEGER,
        matched_canonical TEXT,
        PRIMARY KEY (room_code, round_index)
      );
    `);
    globalDb.__digDb = database;
  }
  const flagged = globalThis as unknown as { __digBankClock?: boolean };
  if (!flagged.__digBankClock) {
    const columns = globalDb.__digDb.prepare("PRAGMA table_info(rooms)").all() as { name: string }[];
    if (!columns.some((column) => column.name === "bank_ends_at")) {
      globalDb.__digDb.exec("ALTER TABLE rooms ADD COLUMN bank_ends_at INTEGER");
    }
    flagged.__digBankClock = true;
  }
  return globalDb.__digDb;
}

function transaction<T>(fn: () => T): T {
  const database = getDb();
  database.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    database.exec("COMMIT");
    return result;
  } catch (error) {
    try {
      database.exec("ROLLBACK");
    } catch {
      /* connection already left the transaction */
    }
    throw error;
  }
}

function makeCode() {
  const bytes = randomBytes(4);
  let code = "";
  for (let i = 0; i < 4; i += 1) code += ALPHABET[bytes[i] % ALPHABET.length];
  return code;
}

function mapRound(row: RoundRow): RoundRecord {
  return {
    roundIndex: row.round_index,
    bank: row.bank_json ? (JSON.parse(row.bank_json) as BankWord[]) : null,
    reasoning: row.reasoning,
    guess: row.guess,
    outcome: row.outcome,
    rarity: row.rarity,
    gemType: row.gem_type,
    gemEmoji: row.gem_emoji,
    depthGained: row.depth_gained,
    matchedBankWord: row.matched_bank_word,
    matchedCanonical: row.matched_canonical,
  };
}

function readRoom(code: string): RoomRecord | null {
  const database = getDb();
  const row = database.prepare("SELECT * FROM rooms WHERE code = ?").get(code) as RoomRow | undefined;
  if (!row) return null;
  const rounds = database
    .prepare("SELECT * FROM rounds WHERE room_code = ? ORDER BY round_index ASC")
    .all(code) as RoundRow[];
  return {
    code: row.code,
    dayIndex: row.day_index,
    status: row.status,
    roundIndex: row.round_index,
    diggerToken: row.digger_token,
    geologistToken: row.geologist_token,
    bankEndsAt: row.bank_ends_at,
    digEndsAt: row.dig_ends_at,
    createdAt: row.created_at,
    rounds: rounds.map(mapRound),
  };
}

function requireRoom(code: string): RoomRecord {
  const room = readRoom(code.trim().toUpperCase());
  if (!room) throw new GameError(404, "No expedition with that code.");
  return room;
}

function roleFor(room: RoomRecord, token: string | null): Role | null {
  if (!token) return null;
  if (token === room.diggerToken) return "digger";
  if (token === room.geologistToken) return "geologist";
  return null;
}

function assertRole(room: RoomRecord, token: string, role: Role) {
  if (roleFor(room, token) !== role) {
    throw new GameError(403, "That tool belongs to the other role.");
  }
}

function parseBank(words: unknown): BankWord[] {
  if (!Array.isArray(words) || words.length > 20) {
    throw new GameError(400, "The bank holds at most 20 words.");
  }
  const cleaned: string[] = [];
  for (const word of words) {
    if (typeof word !== "string") throw new GameError(400, "Each trap must be text.");
    const trimmed = word.trim();
    if (!trimmed) continue;
    if (trimmed.length > 40) throw new GameError(400, "Each trap needs 1 to 40 characters.");
    cleaned.push(trimmed);
  }
  const norms = cleaned.map((word) => normalize(word));
  if (norms.some((word) => !word)) {
    throw new GameError(400, "Each trap needs letters or numbers.");
  }
  if (new Set(norms).size !== cleaned.length) {
    throw new GameError(400, "Each trap must be a different answer.");
  }
  return cleaned.map((word) => ({ word }));
}

function parseReasoning(reasoning: unknown): string | null {
  if (reasoning == null || reasoning === "") return null;
  if (typeof reasoning !== "string") throw new GameError(400, "The debrief must be text.");
  const trimmed = reasoning.trim();
  if (!trimmed) return null;
  if (trimmed.length > 280) throw new GameError(400, "Keep the debrief to 280 characters.");
  return trimmed;
}

function resolveRound(room: RoomRecord, guess: string | null) {
  const round = room.rounds[room.roundIndex];
  if (!round?.bank) throw new GameError(500, "The bank is missing.");
  const prompt = promptsForDayIndex(room.dayIndex)[room.roundIndex];
  const result = scoreGuess(guess, round.bank, prompt.answers);
  getDb()
    .prepare(
      `UPDATE rounds SET
        guess = ?,
        outcome = ?,
        rarity = ?,
        gem_type = ?,
        gem_emoji = ?,
        depth_gained = ?,
        matched_bank_word = ?,
        matched_tier = ?,
        matched_canonical = ?
      WHERE room_code = ? AND round_index = ?`,
    )
    .run(
      guess,
      result.outcome,
      result.rarity,
      result.gemType,
      result.gemEmoji,
      result.depthGained,
      result.matchedBankWord,
      null,
      result.matchedCanonical,
      room.code,
      room.roundIndex,
    );
  getDb().prepare("UPDATE rooms SET status = 'reveal', dig_ends_at = NULL WHERE code = ?").run(room.code);
}

function startDigging(code: string, roundIndex: number, bank: BankWord[], note: string | null) {
  getDb()
    .prepare("UPDATE rounds SET bank_json = ?, reasoning = ? WHERE room_code = ? AND round_index = ?")
    .run(JSON.stringify(bank), note, code, roundIndex);
  getDb()
    .prepare("UPDATE rooms SET status = 'digging', bank_ends_at = NULL, dig_ends_at = ? WHERE code = ?")
    .run(Date.now() + DIG_MS, code);
}

function expireIfNeeded(room: RoomRecord) {
  if (room.status === "bank" && room.bankEndsAt !== null && Date.now() > room.bankEndsAt + BANK_GRACE_MS) {
    const round = room.rounds[room.roundIndex];
    startDigging(room.code, room.roundIndex, round?.bank ?? [], round?.reasoning ?? null);
    return;
  }
  if (room.status === "digging" && room.digEndsAt !== null && Date.now() > room.digEndsAt) {
    resolveRound(room, null);
  }
}

function promptText(room: RoomRecord, role: Role | null, index: number): string {
  const text = promptsForDayIndex(room.dayIndex)[index]?.text ?? "";
  if (room.status === "summary" || index < room.roundIndex) return text;
  if (index > room.roundIndex) return "";
  if (role === "geologist") return text;
  if (role === "digger" && (room.status === "digging" || room.status === "reveal")) return text;
  return "";
}

function toView(room: RoomRecord, token: string | null): RoomView {
  const role = roleFor(room, token);
  const totalDepth = room.rounds.reduce((sum, round) => sum + (round.depthGained ?? 0), 0);
  return {
    code: room.code,
    dayIndex: room.dayIndex,
    status: room.status,
    roundIndex: room.roundIndex,
    role,
    diggerJoined: Boolean(room.diggerToken),
    geologistJoined: Boolean(room.geologistToken),
    bankEndsAt: room.status === "bank" ? room.bankEndsAt : null,
    digEndsAt: room.status === "digging" ? room.digEndsAt : null,
    serverNow: Date.now(),
    totalDepth,
    rounds: room.rounds.map((round, index) => {
      const resolved = round.outcome !== null;
      const showBank = resolved || (role === "geologist" && round.bank !== null);
      return {
        roundIndex: index,
        prompt: promptText(room, role, index),
        bank: showBank ? round.bank : null,
        reasoning: resolved || role === "geologist" ? round.reasoning : null,
        guess: resolved || role === "digger" ? round.guess : null,
        outcome: round.outcome,
        rarity: resolved ? round.rarity : null,
        gemType: resolved ? round.gemType : null,
        gemEmoji: resolved ? round.gemEmoji : null,
        depthGained: resolved ? round.depthGained : null,
        matchedBankWord: resolved ? round.matchedBankWord : null,
        matchedCanonical: resolved ? round.matchedCanonical : null,
      };
    }),
  };
}

export function createRoom(): { token: string; view: RoomView } {
  return transaction(() => {
    const database = getDb();
    let code = "";
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const next = makeCode();
      const existing = database.prepare("SELECT code FROM rooms WHERE code = ?").get(next);
      if (!existing) {
        code = next;
        break;
      }
    }
    if (!code) throw new GameError(500, "Could not open a shaft.");
    const token = randomBytes(16).toString("hex");
    const now = Date.now();
    database
      .prepare(
        `INSERT INTO rooms (code, day_index, status, round_index, digger_token, geologist_token, dig_ends_at, created_at)
         VALUES (?, ?, 'lobby', 0, ?, NULL, NULL, ?)`,
      )
      .run(code, dayIndexFromDate(), token, now);
    const insertRound = database.prepare("INSERT INTO rounds (room_code, round_index) VALUES (?, ?)");
    for (let i = 0; i < 5; i += 1) insertRound.run(code, i);
    return { token, view: toView(readRoom(code)!, token) };
  });
}

export function joinGeologist(code: string): { token: string; view: RoomView } {
  return transaction(() => {
    const room = requireRoom(code);
    if (room.geologistToken) throw new GameError(409, "A geologist is already in this shaft.");
    const token = randomBytes(16).toString("hex");
    getDb()
      .prepare("UPDATE rooms SET geologist_token = ?, status = 'bank', bank_ends_at = ? WHERE code = ?")
      .run(token, Date.now() + BANK_MS, room.code);
    return { token, view: toView(readRoom(room.code)!, token) };
  });
}

export function getRoom(code: string, token: string | null): RoomView {
  return transaction(() => {
    const room = requireRoom(code);
    expireIfNeeded(room);
    return toView(readRoom(room.code)!, token);
  });
}

export function lockBank(
  code: string,
  token: string,
  words: unknown,
  reasoning: unknown,
  commit: boolean,
): RoomView {
  return transaction(() => {
    const room = requireRoom(code);
    assertRole(room, token, "geologist");
    const fresh = readRoom(room.code)!;
    if (fresh.status !== "bank") return toView(fresh, token);
    const bank = parseBank(words);
    const note = parseReasoning(reasoning);
    if (commit) startDigging(fresh.code, fresh.roundIndex, bank, note);
    else {
      getDb()
        .prepare("UPDATE rounds SET bank_json = ?, reasoning = ? WHERE room_code = ? AND round_index = ?")
        .run(JSON.stringify(bank), note, fresh.code, fresh.roundIndex);
    }
    return toView(readRoom(fresh.code)!, token);
  });
}

export function submitGuess(code: string, token: string, guess: unknown): RoomView {
  return transaction(() => {
    const room = requireRoom(code);
    assertRole(room, token, "digger");
    expireIfNeeded(room);
    const fresh = readRoom(room.code)!;
    if (fresh.status !== "digging") {
      if (fresh.status === "reveal" || fresh.status === "summary") return toView(fresh, token);
      throw new GameError(400, "The digger is not in the shaft.");
    }
    if (typeof guess !== "string" || !guess.trim()) throw new GameError(400, "Type a guess.");
    if (fresh.digEndsAt !== null && Date.now() > fresh.digEndsAt) resolveRound(fresh, null);
    else resolveRound(fresh, guess.trim());
    return toView(readRoom(fresh.code)!, token);
  });
}

export function advance(code: string, token: string): RoomView {
  return transaction(() => {
    const room = requireRoom(code);
    if (!roleFor(room, token)) throw new GameError(403, "This token does not belong to the expedition.");
    if (room.status !== "reveal") throw new GameError(400, "Nothing to advance.");
    if (room.roundIndex >= 4) {
      getDb().prepare("UPDATE rooms SET status = 'summary', dig_ends_at = NULL WHERE code = ?").run(room.code);
    } else {
      getDb()
        .prepare(
          "UPDATE rooms SET status = 'bank', round_index = ?, dig_ends_at = NULL, bank_ends_at = ? WHERE code = ?",
        )
        .run(room.roundIndex + 1, Date.now() + BANK_MS, room.code);
    }
    return toView(readRoom(room.code)!, token);
  });
}
