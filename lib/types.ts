export type Role = "digger" | "geologist";

export type RoomStatus = "lobby" | "bank" | "digging" | "reveal" | "summary";

export type Outcome = "bomb" | "gem" | "bedrock";

export type Answer = {
  canonical: string;
  aliases?: string[];
  rarity: number;
};

export type BankWord = {
  word: string;
};

export type RoundView = {
  roundIndex: number;
  prompt: string;
  bank: BankWord[] | null;
  reasoning: string | null;
  guess: string | null;
  attempts: string[] | null;
  outcome: Outcome | null;
  rarity: number | null;
  gemType: string | null;
  gemEmoji: string | null;
  depthGained: number | null;
  matchedBankWord: string | null;
  matchedCanonical: string | null;
};

export type RoomView = {
  code: string;
  dayIndex: number;
  status: RoomStatus;
  roundIndex: number;
  role: Role | null;
  diggerJoined: boolean;
  geologistJoined: boolean;
  bankEndsAt: number | null;
  digEndsAt: number | null;
  bankSeconds: number;
  digSeconds: number;
  serverNow: number;
  totalDepth: number;
  rounds: RoundView[];
};

export type SessionPayload = RoomView & { token: string };
