import { PixelSprite } from "@/components/PixelSprite";
import { spriteForRound } from "@/lib/gems";
import { depthFraction, SHAFT_SCALE, SOIL_LAYERS } from "@/lib/soil";
import type { RoundView } from "@/lib/types";

const MARKS = [0, 100, 200, 300, 400, 500];
const DIGGER_PX = 48;

function trackTop(meters: number) {
  return `calc(${depthFraction(meters)} * (100% - ${DIGGER_PX}px))`;
}

export function ShaftVisual({
  totalDepth,
  rounds,
}: {
  totalDepth: number;
  rounds: RoundView[];
}) {
  let depth = 0;
  const piled = new Map<number, number>();
  const finds: {
    key: number;
    meters: number;
    slot: number;
    name: string;
    alt: string;
  }[] = [];

  for (const round of rounds) {
    if (!round.outcome || round.depthGained === null) continue;
    const foundAt = depth;
    const slot = piled.get(foundAt) ?? 0;
    piled.set(foundAt, slot + 1);
    finds.push({
      key: round.roundIndex,
      meters: foundAt,
      slot,
      name: spriteForRound(round.outcome, round.gemType),
      alt: round.outcome === "gem" ? (round.gemType ?? "Gem") : round.outcome,
    });
    depth += round.depthGained;
  }

  return (
    <aside className="shaft" aria-label={`Shaft, depth ${totalDepth} meters`}>
      <div className="shaft-depth">{totalDepth}m</div>
      <div
        className="shaft-track"
        style={{ ["--digger" as string]: `${DIGGER_PX}px` }}
      >
        {SOIL_LAYERS.map((layer, index) => {
          const last = index === SOIL_LAYERS.length - 1;
          const span = `calc((100% - var(--digger)) / ${SOIL_LAYERS.length})`;
          return (
            <div
              key={layer.from}
              className="soil-layer"
              style={{
                top: `calc(${index} * ${span})`,
                height: last ? `calc(100% - ${index} * ${span})` : span,
                background: layer.color,
              }}
            />
          );
        })}
        {MARKS.map((mark) => (
          <span
            key={mark}
            className="depth-mark"
            style={{ top: trackTop(mark) }}
          >
            {mark}m
          </span>
        ))}
        {finds.map((find) => (
          <span
            key={find.key}
            className="timeline-find"
            style={{ top: trackTop(find.meters), left: 4 + find.slot * 18 }}
          >
            <PixelSprite name={find.name} size={28} alt={find.alt} />
          </span>
        ))}
        <span className="timeline-miner" style={{ top: trackTop(totalDepth) }}>
          <PixelSprite name="miner" size={DIGGER_PX} alt="Miner" />
        </span>
      </div>
      <span className="sr-only">Scale 0 to {SHAFT_SCALE} meters</span>
    </aside>
  );
}
