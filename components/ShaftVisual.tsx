import { PixelSprite } from "@/components/PixelSprite";
import { spriteForRound } from "@/lib/gems";
import type { RoundView } from "@/lib/types";

const MARKERS = [0, 100, 250, 500];
const SCALE = 500;
const SLOT_TOP = ["22%", "38%", "54%", "70%", "86%"];

function depthTop(meters: number) {
  const pct = (Math.min(SCALE, Math.max(0, meters)) / SCALE) * 100;
  return `${Math.min(90, Math.max(12, pct))}%`;
}

export function ShaftVisual({ totalDepth, rounds }: { totalDepth: number; rounds: RoundView[] }) {
  return (
    <aside className="shaft" aria-label={`Shaft, depth ${totalDepth} meters`}>
      <div className="shaft-depth">{totalDepth}m</div>
      {MARKERS.map((marker) => (
        <span key={marker} className="marker" style={{ top: depthTop(marker) }}>
          {marker}m
        </span>
      ))}
      {rounds.map((round) => {
        if (!round.outcome || round.depthGained === null) return null;
        return (
          <span key={round.roundIndex} className="shaft-icon" style={{ top: SLOT_TOP[round.roundIndex] }}>
            <PixelSprite
              name={spriteForRound(round.outcome, round.gemType)}
              size={36}
              alt={round.outcome === "gem" ? (round.gemType ?? "Gem") : round.outcome}
            />
          </span>
        );
      })}
      <span className="miner">
        <PixelSprite name="miner" size={52} alt="Miner" />
      </span>
    </aside>
  );
}
