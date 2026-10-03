import { useEffect, useRef } from "react";

import { PixelSprite } from "@/components/PixelSprite";
import { BankList } from "@/components/BankList";
import { spriteForRound } from "@/lib/gems";
import type { RoomView } from "@/lib/types";

export function RoundReveal({
  view,
  busy,
  onAdvance,
}: {
  view: RoomView;
  busy: boolean;
  onAdvance: () => void;
}) {
  const round = view.rounds[view.roundIndex];
  const last = view.roundIndex >= 4;
  const sprite = spriteForRound(round?.outcome ?? null, round?.gemType ?? null);
  const sent = useRef(false);

  useEffect(() => {
    if (!busy) sent.current = false;
  }, [busy]);

  function go() {
    if (busy || sent.current) return;
    sent.current = true;
    onAdvance();
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Enter" || event.repeat) return;
      event.preventDefault();
      go();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  const title =
    round?.outcome === "gem"
      ? `${round.gemType} unearthed`
      : round?.outcome === "bomb"
        ? "Bomb detonated"
        : round?.guess
          ? "Bedrock"
          : "Fuse burned out";
  const detail =
    round?.outcome === "gem"
      ? `${round.matchedCanonical} · +${round.depthGained}m`
      : round?.outcome === "bomb"
        ? `${round.matchedBankWord} was already in the bank`
        : round?.guess
          ? `"${round.guess}" did not cut the rock · +0m`
          : "No guess landed · +0m";

  return (
    <>
      <div className="panel-head">
        <span>{view.role === "geologist" ? "Geologist" : "Digger"}</span>
        <span>Shaft {view.roundIndex + 1} / 5</span>
      </div>
      <p className="prompt" id="prompt-text">{round?.prompt}</p>
      <div className="outcome">
        {round?.outcome === "bedrock" ? <PixelSprite name="pickaxe" size={64} alt="" /> : null}
        <PixelSprite name={sprite} size={96} alt={title} />
        <h2>{title}</h2>
        <p>{detail}</p>
      </div>
      {round ? <BankList round={round} /> : null}
      <div className="actions">
        <button id="advance" className="pixel-btn" type="button" disabled={busy} onClick={go}>
          {last ? "Expedition log" : "Next shaft"}
        </button>
      </div>
    </>
  );
}
