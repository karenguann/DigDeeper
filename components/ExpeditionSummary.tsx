import { useState } from "react";

import { BankList } from "@/components/BankList";
import { PixelSprite } from "@/components/PixelSprite";
import { spriteForRound } from "@/lib/gems";
import { formatShare, winnerOf } from "@/lib/share";
import type { RoomView } from "@/lib/types";

export function ExpeditionSummary({ view }: { view: RoomView }) {
  const [open, setOpen] = useState<number | null>(0);
  const [copied, setCopied] = useState(false);
  const [shareText, setShareText] = useState<string | null>(null);

  async function share() {
    const text = formatShare(
      view.role,
      view.dayIndex,
      view.totalDepth,
      view.totalTrap,
      view.rounds,
      window.location.host,
      view.solo,
    );
    setShareText(text);
    let wrote = false;
    try {
      wrote = await Promise.race([
        navigator.clipboard.writeText(text).then(() => true),
        new Promise<boolean>((resolve) => window.setTimeout(() => resolve(false), 400)),
      ]);
    } catch {
      wrote = false;
    }
    if (!wrote) {
      try {
        const area = document.createElement("textarea");
        area.value = text;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.left = "-9999px";
        document.body.appendChild(area);
        area.select();
        wrote = document.execCommand("copy");
        area.remove();
      } catch {
        wrote = false;
      }
    }
    setCopied(wrote);
  }

  const winner = winnerOf(view.totalDepth, view.totalTrap);
  const verdict = view.solo
    ? `${view.totalDepth}m`
    : winner === "Tie"
      ? "It's a tie"
      : `${winner} wins`;

  return (
    <>
      <div className="panel-head">
        <span>Expedition log</span>
        <span>Dig Deeper #{view.dayIndex}</span>
      </div>
      <p className="verdict" id="winner">{verdict}</p>
      <p className="score-line">
        {view.solo
          ? `You travelled ${view.totalDepth} meters.`
          : `Digger ${view.totalDepth} · Geologist ${view.totalTrap}`}
      </p>
      <div className="cards">
        {view.rounds.map((round) => {
          const expanded = open === round.roundIndex;
          return (
            <div key={round.roundIndex}>
              <button
                type="button"
                className={expanded ? "card open" : "card"}
                onClick={() => setOpen(expanded ? null : round.roundIndex)}
              >
                <span className="card-top">
                  <PixelSprite
                    name={spriteForRound(round.outcome, round.gemType)}
                    size={40}
                    alt={round.outcome ?? "round"}
                  />
                  <span>
                    Shaft {round.roundIndex + 1}
                    <br />
                    <span className="muted">
                      {round.outcome === "gem"
                        ? `${round.gemType} +${round.depthGained}`
                        : round.outcome === "bomb"
                          ? `Bomb +${round.trapScore}`
                          : "Bedrock +0"}
                    </span>
                  </span>
                </span>
                <p>{round.prompt}</p>
              </button>
              {expanded ? <BankList round={round} /> : null}
            </div>
          );
        })}
      </div>
      <div className="actions">
        <button id="share-expedition" className="pixel-btn" type="button" onClick={() => void share()}>
          {copied ? "Copied" : "Share expedition"}
        </button>
      </div>
      {shareText ? (
        <pre className="share-text" id="share-text">
          {shareText}
        </pre>
      ) : null}
    </>
  );
}
