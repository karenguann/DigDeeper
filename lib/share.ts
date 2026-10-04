export function roundEmoji(round: { outcome: string | null; gemEmoji: string | null }): string {
  if (round.outcome === "bomb") return "💣";
  if (round.outcome === "gem") return round.gemEmoji ?? "💎";
  return "🟫";
}

export function geologistEmoji(round: { outcome: string | null }): string {
  if (round.outcome === "bomb") return "💣";
  if (round.outcome === "gem") return "💨";
  return "🟫";
}

export function winnerOf(depth: number, trap: number): "Digger" | "Geologist" | "Tie" {
  if (depth > trap) return "Digger";
  if (trap > depth) return "Geologist";
  return "Tie";
}

export function formatShare(
  role: "digger" | "geologist" | null,
  dayIndex: number,
  totalDepth: number,
  totalTrap: number,
  rounds: { outcome: string | null; gemEmoji: string | null }[],
  host: string,
): string {
  const winner = winnerOf(totalDepth, totalTrap);
  const result = winner === "Tie" ? "Tie" : `${winner} wins`;
  if (role === "geologist") {
    const row = rounds.map((round) => geologistEmoji(round)).join(" ");
    return `Dig Deeper #${dayIndex}\n${result}\n\nScore: ${totalTrap}\nDigger: ${totalDepth}\n\n${row}\n\n${host}`;
  }
  const row = rounds.map((round) => roundEmoji(round)).join(" ");
  return `Dig Deeper #${dayIndex}\n${result}\n\nDepth: ${totalDepth}m\nGeologist: ${totalTrap}\n\n${row}\n\n${host}`;
}
