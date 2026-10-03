import { PixelSprite } from "@/components/PixelSprite";
import { spriteForRound } from "@/lib/gems";
import type { RoundView } from "@/lib/types";

const MARKERS = [0, 100, 250, 500];
const SCALE = 500;

function depthTop(meters: number) {
  const pct = (Math.min(SCALE, Math.max(0, meters)) / SCALE) * 100;
  return `${Math.min(90, Math.max(12, pct))}%`;
}

export function ShaftVisual({ totalDepth, rounds }: { totalDepth: number; rounds: RoundView[] }) {
  const marks: { key: number; at: number; sprite: string; alt: string }[] = [];
  let depth = 0;
  rounds.forEach((round) => {
    if (!round.outcome || round.depthGained === null) return;
    const at = round.outcome === "gem" ? depth + round.depthGained : depth;
    marks.push({
      key: round.roundIndex,
      at,
      sprite: spriteForRound(round.outcome, round.gemType),
      alt: round.outcome === "gem" ? (round.gemType ?? "Gem") : round.outcome,
    });
    depth += round.depthGained;
  });

  const minerTop = depthTop(totalDepth);

  return (
    <aside className="shaft" aria-label={`Shaft, depth ${totalDepth} meters`}>
      <div className="shaft-depth">{totalDepth}m</div>
      {MARKERS.map((marker) => (
        <span key={marker} className="marker" style={{ top: depthTop(marker) }}>
          {marker}m
        </span>
      ))}
      {marks.map((mark, index) => (
        <span
          key={mark.key}
          className="shaft-icon"
          style={{ top: depthTop(mark.at), left: `${28 + (index % 3) * 14}%` }}
        >
          <PixelSprite name={mark.sprite} size={36} alt={mark.alt} />
        </span>
      ))}
      <span className="miner" style={{ top: minerTop }}>
        <PixelSprite name="miner" size={52} alt="Miner" />
      </span>
    </aside>
  );
}
