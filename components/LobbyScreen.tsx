import { useEffect, useState } from "react";

import { PixelSprite } from "@/components/PixelSprite";
import type { Role } from "@/lib/types";

export function LobbyScreen({
  code,
  role,
  geologistJoined,
  busy,
  onStart,
}: {
  code: string;
  role: Role;
  geologistJoined: boolean;
  busy: boolean;
  onStart: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(true);
  const link = typeof window === "undefined" ? "" : `${window.location.origin}/?room=${code}&role=geologist`;
  const digger = role === "digger";

  useEffect(() => {
    if (!instructionsOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setInstructionsOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [instructionsOpen]);

  return (
    <div className="lobby">
      <PixelSprite name={digger ? "pickaxe" : "miner"} size={72} alt="" />
      <p className="muted">{digger ? "You are the Digger" : "You are the Geologist"}</p>
      <p>
        Room <span className="code" id="room-code">{code}</span>
      </p>
      {geologistJoined ? (
        <p className="hint">Both of you are in the shaft. The clock stays still until someone clicks Start.</p>
      ) : (
        <p className="hint">Send the geologist this link. Nothing starts until both of you are here and someone clicks Start.</p>
      )}
      {digger ? (
        <>
          <button
            id="copy-geologist-link"
            className="pixel-btn"
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(link);
              setCopied(true);
            }}
          >
            {copied ? "Link copied" : "Copy geologist link"}
          </button>
          <p className="muted" id="geologist-link">{link}</p>
        </>
      ) : null}
      {geologistJoined ? (
        <button id="start-game" className="pixel-btn" type="button" disabled={busy} onClick={onStart}>
          Start
        </button>
      ) : (
        <p className="muted">Waiting for the geologist</p>
      )}
      <button className="pixel-btn-ghost" type="button" onClick={() => setInstructionsOpen(true)}>
        Instructions
      </button>
      {instructionsOpen ? (
        <div className="modal-back" onClick={() => setInstructionsOpen(false)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="instructions-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="instructions-title">{digger ? "Digger" : "Geologist"}</h2>
            <p className="hint">
              {digger
                ? "You name something the Geologist did not bury. You never see their list until the shaft is revealed."
                : "You bury the answers a Digger is most likely to say. You see each guess as they try it."}
            </p>
            <ol className="rules">
              <li>Five shafts. Each one has its own prompt.</li>
              <li>After Start, the Geologist has one minute and 20 slots. Blank slots are not bombs. They can lock the bank early.</li>
              <li>Then the Digger has 25 seconds.</li>
              <li>A guess that matches the bank, including another spelling of the same answer, is a bomb. +0 m.</li>
              <li>A real answer that is not in the bank is a gem. The meters equal its rarity, from 1 to 100.</li>
              <li>A guess that is not a real answer is invalid. The Digger can try again while time is left.</li>
              <li>If a fuse runs out, that shaft scores 0 m.</li>
            </ol>
            <button className="pixel-btn" type="button" onClick={() => setInstructionsOpen(false)}>
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
