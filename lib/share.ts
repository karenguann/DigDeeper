export function roundEmoji(round: { outcome: string | null; gemEmoji: string | null }): string {
  if (round.outcome === "bomb") return "💣";
  if (round.outcome === "gem") return round.gemEmoji ?? "💎";
  return "🟫";
}

export function formatShare(dayIndex: number, totalDepth: number, emojis: string[], host: string): string {
  return `Dig Deeper #${dayIndex}\nDepth: ${totalDepth}m\n\n${emojis.join(" ")}\n\n${host}`;
}
