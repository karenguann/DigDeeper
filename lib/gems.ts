export type GemType = "Diamond" | "Ruby" | "Emerald" | "Amethyst" | "Quartz";

export function gemForRarity(rarity: number): { gemType: GemType; gemEmoji: string; sprite: string } {
  if (rarity >= 85) return { gemType: "Diamond", gemEmoji: "💎", sprite: "diamond" };
  if (rarity >= 65) return { gemType: "Ruby", gemEmoji: "🔴", sprite: "ruby" };
  if (rarity >= 45) return { gemType: "Emerald", gemEmoji: "🟢", sprite: "emerald" };
  if (rarity >= 20) return { gemType: "Amethyst", gemEmoji: "🟣", sprite: "amethyst" };
  return { gemType: "Quartz", gemEmoji: "⚪", sprite: "quartz" };
}

export function spriteForRound(outcome: string | null, gemType: string | null): string {
  if (outcome === "bomb") return "bomb";
  if (outcome === "gem") {
    if (gemType === "Diamond") return "diamond";
    if (gemType === "Ruby") return "ruby";
    if (gemType === "Emerald") return "emerald";
    if (gemType === "Amethyst") return "amethyst";
    if (gemType === "Quartz") return "quartz";
  }
  return "bedrock";
}
