import { gemForRarity, type GemType } from "@/lib/gems";
import type { Answer, BankWord, Outcome } from "@/lib/types";

export function normalize(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’.]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type ScoreResult = {
  outcome: Outcome;
  rarity: number | null;
  gemType: GemType | null;
  gemEmoji: string;
  depthGained: number;
  matchedBankWord: string | null;
  matchedCanonical: string | null;
};

function forms(answer: Answer): string[] {
  return [answer.canonical, ...(answer.aliases ?? [])].map(normalize).filter(Boolean);
}

const BEDROCK: ScoreResult = {
  outcome: "bedrock",
  rarity: null,
  gemType: null,
  gemEmoji: "🟫",
  depthGained: 0,
  matchedBankWord: null,
  matchedCanonical: null,
};

export function scoreGuess(guess: string | null, bank: BankWord[], answers: Answer[]): ScoreResult {
  const guessNorm = guess ? normalize(guess) : "";
  if (!guessNorm) return { ...BEDROCK };

  const direct = bank.find((entry) => normalize(entry.word) === guessNorm) ?? null;
  const answer = answers.find((candidate) => forms(candidate).includes(guessNorm)) ?? null;
  const aliasHit = answer
    ? bank.find((entry) => forms(answer).includes(normalize(entry.word))) ?? null
    : null;
  const bomb = direct ?? aliasHit;

  if (bomb) {
    return {
      outcome: "bomb",
      rarity: null,
      gemType: null,
      gemEmoji: "💣",
      depthGained: 0,
      matchedBankWord: bomb.word,
      matchedCanonical: answer?.canonical ?? null,
    };
  }

  if (!answer) return { ...BEDROCK };

  const gem = gemForRarity(answer.rarity);
  return {
    outcome: "gem",
    rarity: answer.rarity,
    gemType: gem.gemType,
    gemEmoji: gem.gemEmoji,
    depthGained: answer.rarity,
    matchedBankWord: null,
    matchedCanonical: answer.canonical,
  };
}
