import { useState } from "react";

import { BankList } from "@/components/BankList";
import { PixelSprite } from "@/components/PixelSprite";
import { spriteForRound } from "@/lib/gems";
import { formatShare, roundEmoji } from "@/lib/share";
import type { RoomView } from "@/lib/types";

export function ExpeditionSummary({ view }: { view: RoomView }) {
  const [open, setOpen] = useState<number | null>(0);
  const [copied, setCopied] = useState(false);
  const [shareText, setShareText] = useState<string | null>(null);

  async function share() {
    const text = formatShare(
      view.dayIndex,
      view.totalDepth,
      view.rounds.map((round) => roundEmoji(round)),
      window.location.host,
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

  return (
    <>
      <div className="panel-head">
        <span>Expedition log</span>
        <span>Dig Deeper #{view.dayIndex}</span>
      </div>
      <p className="depth-total">Depth reached: {view.totalDepth}m</p>
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
                        ? `${round.gemType} +${round.depthGained}m`
                        : round.outcome === "bomb"
                          ? "Bomb +0m"
                          : "Bedrock +0m"}
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
