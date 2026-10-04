import "server-only";

import { randomBytes } from "node:crypto";

import { promptsForDayIndex } from "@/data/dailyPrompts";
import { dayIndexFromDate } from "@/lib/day";
import { GameError } from "@/lib/errors";
import { roomStore, type RoomRecord } from "@/lib/roomStore";
import { normalize, scoreGuess } from "@/lib/scoring";
import type { BankWord, Role, RoomView } from "@/lib/types";

const DEFAULT_BANK_SECONDS = 60;
const DEFAULT_DIG_SECONDS = 25;
const MIN_SECONDS = 5;
const MAX_SECONDS = 600;
const BANK_GRACE_MS = 2_000;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function bankSecondsOf(room: RoomRecord) {
  return room.bankSeconds ?? DEFAULT_BANK_SECONDS;
}

function digSecondsOf(room: RoomRecord) {
  return room.digSeconds ?? DEFAULT_DIG_SECONDS;
}

function parseSeconds(value: unknown) {
  const seconds = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(seconds) || seconds < MIN_SECONDS || seconds > MAX_SECONDS) {
    throw new GameError(400, `Time limits must be whole seconds from ${MIN_SECONDS} to ${MAX_SECONDS}.`);
  }
  return seconds;
}

function makeCode() {
  const bytes = randomBytes(4);
  let code = "";
  for (let i = 0; i < 4; i += 1) code += ALPHABET[bytes[i] % ALPHABET.length];
  return code;
}

function emptyRound(roundIndex: number) {
  return {
    roundIndex,
    bank: null,
    reasoning: null,
    guess: null,
    attempts: [] as string[],
    outcome: null,
    rarity: null,
    gemType: null,
    gemEmoji: null,
    depthGained: null,
    trapScore: null,
    matchedBankWord: null,
    matchedCanonical: null,
  };
}

async function loadRoom(code: string): Promise<RoomRecord> {
  const room = await roomStore().get(code.trim().toUpperCase());
  if (!room) throw new GameError(404, "No expedition with that code.");
  return room;
}

async function mutateRoom<T>(code: string, fn: (room: RoomRecord) => T): Promise<T> {
  try {
    return await roomStore().mutate(code.trim().toUpperCase(), fn);
  } catch (error) {
    if (error instanceof Error && error.message === "MISSING") {
      throw new GameError(404, "No expedition with that code.");
    }
    if (error instanceof GameError) throw error;
    throw error;
  }
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

function judgeGuess(room: RoomRecord, guess: string) {
  const round = room.rounds[room.roundIndex];
  if (!round?.bank) throw new GameError(500, "The bank is missing.");
  const prompt = promptsForDayIndex(room.dayIndex)[room.roundIndex];
  return scoreGuess(guess, round.bank, prompt.answers);
}

function resolveRound(room: RoomRecord, guess: string | null) {
  const result = judgeGuess(room, guess ?? "");
  const round = room.rounds[room.roundIndex];
  round.guess = guess;
  round.outcome = result.outcome;
  round.rarity = result.rarity;
  round.gemType = result.gemType;
  round.gemEmoji = result.gemEmoji;
  round.depthGained = result.depthGained;
  round.trapScore = result.trapScore;
  round.matchedBankWord = result.matchedBankWord;
  round.matchedCanonical = result.matchedCanonical;
  room.status = "reveal";
  room.digEndsAt = null;
}

function startDigging(room: RoomRecord, bank: BankWord[]) {
  const round = room.rounds[room.roundIndex];
  round.bank = bank;
  round.reasoning = null;
  room.status = "digging";
  room.bankEndsAt = null;
  room.digEndsAt = Date.now() + digSecondsOf(room) * 1000;
}

function expireIfNeeded(room: RoomRecord) {
  if (room.status === "bank" && room.bankEndsAt !== null && Date.now() > room.bankEndsAt + BANK_GRACE_MS) {
    const round = room.rounds[room.roundIndex];
    startDigging(room, round?.bank ?? []);
    return;
  }
  if (room.status === "digging" && room.digEndsAt !== null && Date.now() > room.digEndsAt) {
    resolveRound(room, null);
  }
}

function needsExpire(room: RoomRecord) {
  if (room.status === "bank" && room.bankEndsAt !== null && Date.now() > room.bankEndsAt + BANK_GRACE_MS) return true;
  if (room.status === "digging" && room.digEndsAt !== null && Date.now() > room.digEndsAt) return true;
  return false;
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
  const totalTrap = room.rounds.reduce((sum, round) => sum + (round.trapScore ?? 0), 0);
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
    bankSeconds: bankSecondsOf(room),
    digSeconds: digSecondsOf(room),
    serverNow: Date.now(),
    totalDepth,
    totalTrap,
    solo: Boolean(room.solo),
    rounds: room.rounds.map((round, index) => {
      const resolved = round.outcome !== null;
      const showBank = !room.solo && (resolved || (role === "geologist" && round.bank !== null));
      return {
        roundIndex: index,
        prompt: promptText(room, role, index),
        bank: showBank ? round.bank : null,
        reasoning: resolved || role === "geologist" ? round.reasoning : null,
        guess: resolved || role === "digger" ? round.guess : null,
        attempts: role === "geologist" ? round.attempts : null,
        outcome: round.outcome,
        rarity: resolved ? round.rarity : null,
        gemType: resolved ? round.gemType : null,
        gemEmoji: resolved ? round.gemEmoji : null,
        depthGained: resolved ? round.depthGained : null,
        trapScore: resolved ? (round.trapScore ?? 0) : null,
        matchedBankWord: resolved ? round.matchedBankWord : null,
        matchedCanonical: resolved ? round.matchedCanonical : null,
      };
    }),
  };
}

export async function createRoom(role: Role = "digger"): Promise<{ token: string; view: RoomView }> {
  const token = randomBytes(16).toString("hex");
  const now = Date.now();
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = makeCode();
    const room: RoomRecord = {
      code,
      dayIndex: dayIndexFromDate(),
      status: "lobby",
      roundIndex: 0,
      diggerToken: role === "digger" ? token : null,
      geologistToken: role === "geologist" ? token : null,
      solo: false,
      bankEndsAt: null,
      digEndsAt: null,
      bankSeconds: DEFAULT_BANK_SECONDS,
      digSeconds: DEFAULT_DIG_SECONDS,
      createdAt: now,
      rounds: [0, 1, 2, 3, 4].map(emptyRound),
    };
    const created = await roomStore().create(room);
    if (created) return { token, view: toView(room, token) };
  }
  throw new GameError(500, "Could not open a shaft.");
}

export async function createSoloRoom(): Promise<{ token: string; view: RoomView }> {
  const token = randomBytes(16).toString("hex");
  const now = Date.now();
  const dayIndex = dayIndexFromDate();
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = makeCode();
    const room: RoomRecord = {
      code,
      dayIndex,
      status: "digging",
      roundIndex: 0,
      diggerToken: token,
      geologistToken: null,
      solo: true,
      bankEndsAt: null,
      digEndsAt: now + DEFAULT_DIG_SECONDS * 1000,
      bankSeconds: DEFAULT_BANK_SECONDS,
      digSeconds: DEFAULT_DIG_SECONDS,
      createdAt: now,
      rounds: [0, 1, 2, 3, 4].map((index) => ({
        ...emptyRound(index),
        bank: [],
      })),
    };
    const created = await roomStore().create(room);
    if (created) return { token, view: toView(room, token) };
  }
  throw new GameError(500, "Could not open a shaft.");
}

export async function joinGeologist(code: string): Promise<{ token: string; view: RoomView }> {
  const token = randomBytes(16).toString("hex");
  const view = await mutateRoom(code, (room) => {
    if (room.solo) throw new GameError(400, "This shaft is a solo dig.");
    if (room.geologistToken) throw new GameError(409, "A geologist is already in this shaft.");
    room.geologistToken = token;
    return toView(room, token);
  });
  return { token, view };
}

export async function joinDigger(code: string): Promise<{ token: string; view: RoomView }> {
  const token = randomBytes(16).toString("hex");
  const view = await mutateRoom(code, (room) => {
    if (room.solo) throw new GameError(400, "This shaft is a solo dig.");
    if (room.diggerToken) throw new GameError(409, "A digger is already in this shaft.");
    room.diggerToken = token;
    return toView(room, token);
  });
  return { token, view };
}

export async function startGame(code: string, token: string): Promise<RoomView> {
  return mutateRoom(code, (room) => {
    if (!roleFor(room, token)) throw new GameError(403, "This token does not belong to the expedition.");
    if (room.status !== "lobby") return toView(room, token);
    if (!room.diggerToken || !room.geologistToken) {
      throw new GameError(400, "Wait for both players before starting.");
    }
    room.status = "bank";
    room.bankEndsAt = Date.now() + bankSecondsOf(room) * 1000;
    return toView(room, token);
  });
}

export async function updateLimits(
  code: string,
  token: string,
  bankSeconds: unknown,
  digSeconds: unknown,
): Promise<RoomView> {
  return mutateRoom(code, (room) => {
    if (!roleFor(room, token)) throw new GameError(403, "This token does not belong to the expedition.");
    if (room.status !== "lobby") throw new GameError(400, "The clocks are already running.");
    room.bankSeconds = parseSeconds(bankSeconds);
    room.digSeconds = parseSeconds(digSeconds);
    return toView(room, token);
  });
}

export async function getRoom(code: string, token: string | null): Promise<RoomView> {
  const room = await loadRoom(code);
  if (!needsExpire(room)) return toView(room, token);
  return mutateRoom(code, (fresh) => {
    expireIfNeeded(fresh);
    return toView(fresh, token);
  });
}

export async function lockBank(
  code: string,
  token: string,
  words: unknown,
  commit: boolean,
): Promise<RoomView> {
  return mutateRoom(code, (room) => {
    assertRole(room, token, "geologist");
    if (room.status !== "bank") return toView(room, token);
    const bank = parseBank(words);
    if (commit) startDigging(room, bank);
    else {
      const round = room.rounds[room.roundIndex];
      round.bank = bank;
      round.reasoning = null;
    }
    return toView(room, token);
  });
}

export async function submitGuess(code: string, token: string, guess: unknown): Promise<RoomView> {
  let invalid = false;
  const view = await mutateRoom(code, (room) => {
    assertRole(room, token, "digger");
    expireIfNeeded(room);
    if (room.status !== "digging") {
      if (room.status === "reveal" || room.status === "summary") return toView(room, token);
      throw new GameError(400, "The digger is not in the shaft.");
    }
    if (typeof guess !== "string" || !guess.trim()) throw new GameError(400, "Type a guess.");
    const trimmed = guess.trim();
    if (room.digEndsAt !== null && Date.now() > room.digEndsAt) {
      resolveRound(room, null);
    } else if (judgeGuess(room, trimmed).outcome === "bedrock") {
      room.rounds[room.roundIndex].attempts.push(trimmed);
      invalid = true;
    } else {
      room.rounds[room.roundIndex].attempts.push(trimmed);
      resolveRound(room, trimmed);
    }
    return toView(room, token);
  });
  if (invalid) throw new GameError(400, "Invalid guess. Try again.");
  return view;
}

export async function advance(code: string, token: string): Promise<RoomView> {
  return mutateRoom(code, (room) => {
    if (!roleFor(room, token)) throw new GameError(403, "This token does not belong to the expedition.");
    if (room.status !== "reveal") return toView(room, token);
    if (room.roundIndex >= 4) {
      room.status = "summary";
      room.digEndsAt = null;
      room.bankEndsAt = null;
    } else if (room.solo) {
      room.roundIndex += 1;
      room.status = "digging";
      room.bankEndsAt = null;
      room.digEndsAt = Date.now() + digSecondsOf(room) * 1000;
    } else {
      room.status = "bank";
      room.roundIndex += 1;
      room.digEndsAt = null;
      room.bankEndsAt = Date.now() + bankSecondsOf(room) * 1000;
    }
    return toView(room, token);
  });
}
