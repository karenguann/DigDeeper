import "server-only";

import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

import type { BankWord, Outcome, RoomStatus } from "@/lib/types";

export type RoundRecord = {
  roundIndex: number;
  bank: BankWord[] | null;
  reasoning: string | null;
  guess: string | null;
  attempts: string[];
  outcome: Outcome | null;
  rarity: number | null;
  gemType: string | null;
  gemEmoji: string | null;
  depthGained: number | null;
  matchedBankWord: string | null;
  matchedCanonical: string | null;
};

export type RoomRecord = {
  code: string;
  dayIndex: number;
  status: RoomStatus;
  roundIndex: number;
  diggerToken: string | null;
  geologistToken: string | null;
  bankEndsAt: number | null;
  digEndsAt: number | null;
  bankSeconds?: number;
  digSeconds?: number;
  createdAt: number;
  rounds: RoundRecord[];
};

type RoomStore = {
  get(code: string): Promise<RoomRecord | null>;
  create(room: RoomRecord): Promise<boolean>;
  mutate<T>(code: string, fn: (room: RoomRecord) => T): Promise<T>;
};

function redisCredentials() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

function roomKey(code: string) {
  return `digdeeper:room:${code}`;
}

async function redisCommand(command: (string | number)[]): Promise<unknown> {
  const creds = redisCredentials();
  if (!creds) throw new Error("Redis is not configured.");
  const response = await fetch(creds.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${creds.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  const data = (await response.json()) as { result?: unknown; error?: string };
  if (!response.ok || data.error) throw new Error(data.error || "Redis request failed.");
  return data.result;
}

function redisStore(): RoomStore {
  return {
    async get(code) {
      const raw = await redisCommand(["GET", roomKey(code)]);
      if (typeof raw !== "string" || !raw) return null;
      return JSON.parse(raw) as RoomRecord;
    },
    async create(room) {
      const result = await redisCommand(["SET", roomKey(room.code), JSON.stringify(room), "NX"]);
      return result === "OK";
    },
    async mutate(code, fn) {
      const lock = `digdeeper:lock:${code}`;
      const owner = `${Date.now()}-${Math.random()}`;
      let acquired = false;
      for (let attempt = 0; attempt < 25; attempt += 1) {
        const result = await redisCommand(["SET", lock, owner, "NX", "PX", 4000]);
        if (result === "OK") {
          acquired = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 40));
      }
      if (!acquired) throw new Error("The shaft is busy.");
      try {
        const raw = await redisCommand(["GET", roomKey(code)]);
        const room = typeof raw === "string" && raw ? (JSON.parse(raw) as RoomRecord) : null;
        if (!room) throw new Error("MISSING");
        const before = JSON.stringify(room);
        const result = fn(room);
        if (JSON.stringify(room) !== before) {
          await redisCommand(["SET", roomKey(code), JSON.stringify(room)]);
        }
        return result;
      } finally {
        const current = await redisCommand(["GET", lock]);
        if (current === owner) await redisCommand(["DEL", lock]);
      }
    },
  };
}

type SqliteDb = {
  exec(sql: string): void;
  prepare(sql: string): {
    get(...args: unknown[]): unknown;
    all(...args: unknown[]): unknown[];
    run(...args: unknown[]): unknown;
  };
};

function dbPath() {
  const dir = path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, "rooms.db");
}

async function openSqlite(): Promise<SqliteDb> {
  const globalDb = globalThis as unknown as { __digDb?: SqliteDb };
  if (!globalDb.__digDb) {
    const { DatabaseSync } = await import("node:sqlite");
    const database = new DatabaseSync(dbPath()) as unknown as SqliteDb;
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
        attempts_json TEXT,
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
  const database = globalDb.__digDb;
  const roomColumns = database.prepare("PRAGMA table_info(rooms)").all() as { name: string }[];
  if (!roomColumns.some((column) => column.name === "bank_ends_at")) {
    database.exec("ALTER TABLE rooms ADD COLUMN bank_ends_at INTEGER");
  }
  if (!roomColumns.some((column) => column.name === "bank_seconds")) {
    database.exec("ALTER TABLE rooms ADD COLUMN bank_seconds INTEGER");
  }
  if (!roomColumns.some((column) => column.name === "dig_seconds")) {
    database.exec("ALTER TABLE rooms ADD COLUMN dig_seconds INTEGER");
  }
  const roundColumns = database.prepare("PRAGMA table_info(rounds)").all() as { name: string }[];
  if (!roundColumns.some((column) => column.name === "attempts_json")) {
    database.exec("ALTER TABLE rounds ADD COLUMN attempts_json TEXT");
  }
  return database;
}

function readAttempts(json: string | null): string[] {
  if (!json) return [];
  const parsed: unknown = JSON.parse(json);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((entry): entry is string => typeof entry === "string");
}

type RoomRow = {
  code: string;
  day_index: number;
  status: RoomStatus;
  round_index: number;
  digger_token: string | null;
  geologist_token: string | null;
  bank_ends_at: number | null;
  dig_ends_at: number | null;
  bank_seconds: number | null;
  dig_seconds: number | null;
  created_at: number;
};

type RoundRow = {
  round_index: number;
  bank_json: string | null;
  reasoning: string | null;
  guess: string | null;
  attempts_json: string | null;
  outcome: Outcome | null;
  rarity: number | null;
  gem_type: string | null;
  gem_emoji: string | null;
  depth_gained: number | null;
  matched_bank_word: string | null;
  matched_canonical: string | null;
};

function rowToRoom(row: RoomRow, rounds: RoundRow[]): RoomRecord {
  return {
    code: row.code,
    dayIndex: row.day_index,
    status: row.status,
    roundIndex: row.round_index,
    diggerToken: row.digger_token,
    geologistToken: row.geologist_token,
    bankEndsAt: row.bank_ends_at,
    digEndsAt: row.dig_ends_at,
    bankSeconds: row.bank_seconds ?? 60,
    digSeconds: row.dig_seconds ?? 25,
    createdAt: row.created_at,
    rounds: rounds.map((round) => ({
      roundIndex: round.round_index,
      bank: round.bank_json ? (JSON.parse(round.bank_json) as BankWord[]) : null,
      reasoning: round.reasoning,
      guess: round.guess,
      attempts: readAttempts(round.attempts_json),
      outcome: round.outcome,
      rarity: round.rarity,
      gemType: round.gem_type,
      gemEmoji: round.gem_emoji,
      depthGained: round.depth_gained,
      matchedBankWord: round.matched_bank_word,
      matchedCanonical: round.matched_canonical,
    })),
  };
}

function sqliteStore(): RoomStore {
  return {
    async get(code) {
      const database = await openSqlite();
      const row = database.prepare("SELECT * FROM rooms WHERE code = ?").get(code) as RoomRow | undefined;
      if (!row) return null;
      const rounds = database
        .prepare("SELECT * FROM rounds WHERE room_code = ? ORDER BY round_index ASC")
        .all(code) as RoundRow[];
      return rowToRoom(row, rounds);
    },
    async create(room) {
      const database = await openSqlite();
      database.exec("BEGIN IMMEDIATE");
      try {
        const existing = database.prepare("SELECT code FROM rooms WHERE code = ?").get(room.code);
        if (existing) {
          database.exec("COMMIT");
          return false;
        }
        database
          .prepare(
            `INSERT INTO rooms (code, day_index, status, round_index, digger_token, geologist_token, bank_ends_at, dig_ends_at, bank_seconds, dig_seconds, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            room.code,
            room.dayIndex,
            room.status,
            room.roundIndex,
            room.diggerToken,
            room.geologistToken,
            room.bankEndsAt,
            room.digEndsAt,
            room.bankSeconds ?? 60,
            room.digSeconds ?? 25,
            room.createdAt,
          );
        const insertRound = database.prepare(
          `INSERT INTO rounds (
            room_code, round_index, bank_json, reasoning, guess, attempts_json, outcome, rarity, gem_type, gem_emoji, depth_gained, matched_bank_word, matched_canonical
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        );
        for (const round of room.rounds) {
          insertRound.run(
            room.code,
            round.roundIndex,
            round.bank ? JSON.stringify(round.bank) : null,
            round.reasoning,
            round.guess,
            JSON.stringify(round.attempts),
            round.outcome,
            round.rarity,
            round.gemType,
            round.gemEmoji,
            round.depthGained,
            round.matchedBankWord,
            round.matchedCanonical,
          );
        }
        database.exec("COMMIT");
        return true;
      } catch (error) {
        try {
          database.exec("ROLLBACK");
        } catch {
          /* already closed */
        }
        throw error;
      }
    },
    async mutate(code, fn) {
      const database = await openSqlite();
      database.exec("BEGIN IMMEDIATE");
      try {
        const row = database.prepare("SELECT * FROM rooms WHERE code = ?").get(code) as RoomRow | undefined;
        if (!row) throw new Error("MISSING");
        const rounds = database
          .prepare("SELECT * FROM rounds WHERE room_code = ? ORDER BY round_index ASC")
          .all(code) as RoundRow[];
        const room = rowToRoom(row, rounds);
        const before = JSON.stringify(room);
        const result = fn(room);
        if (JSON.stringify(room) !== before) {
          database
            .prepare(
              `UPDATE rooms SET status = ?, round_index = ?, digger_token = ?, geologist_token = ?, bank_ends_at = ?, dig_ends_at = ?, bank_seconds = ?, dig_seconds = ? WHERE code = ?`,
            )
            .run(
              room.status,
              room.roundIndex,
              room.diggerToken,
              room.geologistToken,
              room.bankEndsAt,
              room.digEndsAt,
              room.bankSeconds ?? 60,
              room.digSeconds ?? 25,
              room.code,
            );
          const updateRound = database.prepare(
            `UPDATE rounds SET bank_json = ?, reasoning = ?, guess = ?, attempts_json = ?, outcome = ?, rarity = ?, gem_type = ?, gem_emoji = ?, depth_gained = ?, matched_bank_word = ?, matched_canonical = ?
             WHERE room_code = ? AND round_index = ?`,
          );
          for (const round of room.rounds) {
            updateRound.run(
              round.bank ? JSON.stringify(round.bank) : null,
              round.reasoning,
              round.guess,
              JSON.stringify(round.attempts),
              round.outcome,
              round.rarity,
              round.gemType,
              round.gemEmoji,
              round.depthGained,
              round.matchedBankWord,
              round.matchedCanonical,
              room.code,
              round.roundIndex,
            );
          }
        }
        database.exec("COMMIT");
        return result;
      } catch (error) {
        try {
          database.exec("ROLLBACK");
        } catch {
          /* already closed */
        }
        throw error;
      }
    },
  };
}

function databaseUrl() {
  return process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || "";
}

function supabaseSql() {
  const globalSql = globalThis as unknown as { __digSql?: ReturnType<typeof postgres> };
  if (!globalSql.__digSql) {
    globalSql.__digSql = postgres(databaseUrl(), {
      prepare: false,
      ssl: "require",
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return globalSql.__digSql;
}

async function ensureRoomTable(sql: ReturnType<typeof postgres>) {
  const flagged = globalThis as unknown as { __digSqlReady?: boolean };
  if (flagged.__digSqlReady) return;
  await sql`
    create table if not exists dig_rooms (
      code text primary key,
      data jsonb not null
    )
  `;
  flagged.__digSqlReady = true;
}

function asRoom(data: unknown): RoomRecord | null {
  if (!data) return null;
  if (typeof data === "string") return JSON.parse(data) as RoomRecord;
  return data as RoomRecord;
}

function supabaseStore(): RoomStore {
  return {
    async get(code) {
      const sql = supabaseSql();
      await ensureRoomTable(sql);
      const rows = await sql<{ data: unknown }[]>`select data from dig_rooms where code = ${code}`;
      return asRoom(rows[0]?.data);
    },
    async create(room) {
      const sql = supabaseSql();
      await ensureRoomTable(sql);
      const rows = await sql<{ code: string }[]>`
        insert into dig_rooms (code, data)
        values (${room.code}, ${sql.json(room as unknown as postgres.JSONValue)})
        on conflict (code) do nothing
        returning code
      `;
      return rows.length > 0;
    },
    async mutate(code, fn) {
      const sql = supabaseSql();
      await ensureRoomTable(sql);
      const value = await sql.begin(async (tx) => {
        const rows = await tx<{ data: unknown }[]>`
          select data from dig_rooms where code = ${code} for update
        `;
        const room = asRoom(rows[0]?.data);
        if (!room) throw new Error("MISSING");
        const before = JSON.stringify(room);
        const result = fn(room);
        if (JSON.stringify(room) !== before) {
          await tx`
            update dig_rooms
            set data = ${tx.json(room as unknown as postgres.JSONValue)}
            where code = ${code}
          `;
        }
        return result;
      });
      return value as ReturnType<typeof fn>;
    },
  };
}

export function roomStore(): RoomStore {
  if (databaseUrl()) return supabaseStore();
  if (redisCredentials()) return redisStore();
  if (process.env.VERCEL) {
    throw new Error("Set SUPABASE_DB_URL so rooms can be shared.");
  }
  return sqliteStore();
}
