import { useEffect, useState } from "react";

import { PixelSprite } from "@/components/PixelSprite";
import { formatSeconds } from "@/lib/duration";
import type { Role } from "@/lib/types";

export function LobbyScreen({
  code,
  role,
  diggerJoined,
  geologistJoined,
  bankSeconds,
  digSeconds,
  busy,
  onStart,
  onSaveLimits,
}: {
  code: string;
  role: Role;
  diggerJoined: boolean;
  geologistJoined: boolean;
  bankSeconds: number;
  digSeconds: number;
  busy: boolean;
  onStart: () => void;
  onSaveLimits: (bankSeconds: number, digSeconds: number) => Promise<boolean>;
}) {
  const [copied, setCopied] = useState(false);
  const [panel, setPanel] = useState<"instructions" | "settings" | null>(
    "instructions",
  );
  const [bankInput, setBankInput] = useState(String(bankSeconds));
  const [digInput, setDigInput] = useState(String(digSeconds));
  const digger = role === "digger";
  const inviteRole = digger ? "geologist" : "digger";
  const otherReady = digger ? geologistJoined : diggerJoined;
  const bothReady = diggerJoined && geologistJoined;
  const link =
    typeof window === "undefined"
      ? ""
      : `${window.location.origin}/?room=${code}&role=${inviteRole}`;

  useEffect(() => {
    if (!panel) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setPanel(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panel]);

  function openSettings() {
    setBankInput(String(bankSeconds));
    setDigInput(String(digSeconds));
    setPanel("settings");
  }

  return (
    <div className="lobby">
      <div className="lobby-tools">
        <button
          id="open-instructions"
          className="icon-btn"
          type="button"
          aria-label="Instructions"
          onClick={() => setPanel("instructions")}
        >
          <InfoIcon />
        </button>
        <button
          id="open-settings"
          className="icon-btn"
          type="button"
          aria-label="Settings"
          onClick={openSettings}
        >
          <GearIcon />
        </button>
      </div>
      <div className="stage-body">
        <PixelSprite name={digger ? "pickaxe" : "miner"} size={72} alt="" />
        <p className="muted">
          {digger ? "You are the Digger" : "You are the Geologist"}
        </p>
        <p>
          Room{" "}
          <span className="code" id="room-code">
            {code}
          </span>
        </p>
        <p className="hint" id="time-limits">
          Geologist {formatSeconds(bankSeconds)} · Digger{" "}
          {formatSeconds(digSeconds)}
        </p>
        {bothReady ? (
          <>
            <p className="hint">Both of you are in the shaft.</p>
          </>
        ) : (
          <>
            <br />
            <p className="hint">Send the {inviteRole} this link.</p>
          </>
        )}
      </div>
      <div className="dock">
        {!otherReady ? (
          <>
            <button
              id={digger ? "copy-geologist-link" : "copy-digger-link"}
              className="pixel-btn"
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(link);
                setCopied(true);
              }}
            >
              {copied ? "Link copied" : `Copy ${inviteRole} link`}
            </button>
            <p className="muted" id={digger ? "geologist-link" : "digger-link"}>
              {link}
            </p>
          </>
        ) : null}
        {bothReady ? (
          <button
            id="start-game"
            className="pixel-btn"
            type="button"
            disabled={busy}
            onClick={onStart}
          >
            Start
          </button>
        ) : (
          <p className="muted">Waiting for the {inviteRole}...</p>
        )}
      </div>
      {panel === "instructions" ? (
        <div className="modal-back" onClick={() => setPanel(null)}>
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
                ? "Your goal: find rare answers the Geologist didn't predict."
                : "Your goal: predict what the Digger will say."}
            </p>
            {digger ? null : (
              <p className="hint">For each of the 5 prompts:</p>
            )}
            <ol className="rules">
              {digger ? (
                <>
                  <li>
                    For each of the 5 prompts, you have {formatSeconds(digSeconds)} to
                    enter as many answers as you can.
                  </li>
                  <li>
                    The Geologist sees the prompt first and secretly chooses up to
                    20 answers they think you'll say.
                  </li>
                  <li>
                    You then see the same prompt and have {formatSeconds(digSeconds)} to
                    make guesses.
                  </li>
                  <li>
                    If your answer is on the Geologist's list, it's a Bomb — the
                    Geologist gets the points.
                  </li>
                  <li>
                    If your answer is not on their list, it's a Gem — you get points
                    based on how rare your answer is.
                  </li>
                  <li>
                    You can keep guessing until time runs out. Invalid answers don't
                    count.
                  </li>
                  <li>After 5 prompts, the player with the most points wins.</li>
                </>
              ) : (
                <>
                  <li>
                    You'll see the prompt first and have {formatSeconds(bankSeconds)} to
                    enter up to 20 answers.
                  </li>
                  <li>Think of the answers you expect the Digger to guess.</li>
                  <li>You can lock your answer bank early if you're finished.</li>
                  <li>
                    The Digger then gets {formatSeconds(digSeconds)} to make guesses.
                  </li>
                  <li>
                    If the Digger guesses something on your list, it's a Bomb and you
                    score points.
                  </li>
                  <li>
                    If they guess something not on your list, it's a Gem and the
                    Digger scores instead.
                  </li>
                  <li>After 5 prompts, the player with the most points wins.</li>
                </>
              )}
            </ol>
            <button
              className="pixel-btn"
              type="button"
              onClick={() => setPanel(null)}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
      {panel === "settings" ? (
        <div className="modal-back" onClick={() => setPanel(null)}>
          <form
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              const nextBank = Number(bankInput);
              const nextDig = Number(digInput);
              if (!Number.isInteger(nextBank) || !Number.isInteger(nextDig))
                return;
              void onSaveLimits(nextBank, nextDig).then((saved) => {
                if (saved) setPanel(null);
              });
            }}
          >
            <h2 id="settings-title">Time limits</h2>
            <p className="hint">
              These clocks start when someone clicks Start. Both players share
              them.
            </p>
            <label className="field" htmlFor="bank-seconds">
              <span>Geologist, seconds</span>
              <input
                id="bank-seconds"
                className="pixel-input"
                type="number"
                min={5}
                max={600}
                step={1}
                value={bankInput}
                onChange={(event) => setBankInput(event.target.value)}
              />
            </label>
            <label className="field" htmlFor="dig-seconds">
              <span>Digger, seconds</span>
              <input
                id="dig-seconds"
                className="pixel-input"
                type="number"
                min={5}
                max={600}
                step={1}
                value={digInput}
                onChange={(event) => setDigInput(event.target.value)}
              />
            </label>
            <div className="lobby-actions">
              <button
                id="save-settings"
                className="pixel-btn"
                type="submit"
                disabled={busy}
              >
                Save
              </button>
              <button
                className="pixel-btn-ghost"
                type="button"
                onClick={() => setPanel(null)}
              >
                Close
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function InfoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <circle
        cx="9"
        cy="9"
        r="7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <rect x="8" y="4" width="2" height="2" fill="currentColor" />
      <rect x="8" y="8" width="2" height="6" fill="currentColor" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      aria-hidden="true"
      shapeRendering="crispEdges"
    >
      <path
        fill="currentColor"
        d="M2 3h14v2H2zM9 2h3v4H9zM2 8h14v2H2zM4 7h3v4H4zM2 13h14v2H2zM11 12h3v4h-3z"
      />
    </svg>
  );
}
