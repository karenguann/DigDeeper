import { useEffect, useState } from "react";

import { Fuse } from "@/components/Fuse";
import { formatSeconds } from "@/lib/duration";
import type { RoomView } from "@/lib/types";

export function DigScreen({
  view,
  secondsLeft,
  fuseTotal,
  busy,
  rejection,
  onGuess,
}: {
  view: RoomView;
  secondsLeft: number | null;
  fuseTotal: number;
  busy: boolean;
  rejection: string | null;
  onGuess: (guess: string) => void;
}) {
  const round = view.rounds[view.roundIndex];
  const waiting = view.status !== "digging";
  const [guess, setGuess] = useState("");

  useEffect(() => {
    setGuess("");
  }, [view.roundIndex, view.status]);

  return (
    <>
      <div className="panel-head">
        <span>Digger</span>
        <span>Shaft {view.roundIndex + 1} / 5</span>
      </div>
      {waiting ? (
        <>
          <p className="prompt">The geologist is burying bombs.</p>
          <p className="hint">They have {formatSeconds(view.bankSeconds)}. The prompt stays hidden until the bank locks.</p>
          <Fuse secondsLeft={secondsLeft} total={fuseTotal} />
        </>
      ) : (
        <>
          <p className="prompt" id="prompt-text">{round?.prompt}</p>
          <Fuse secondsLeft={secondsLeft} total={fuseTotal} />
          <form
            className="guess-row"
            onSubmit={(event) => {
              event.preventDefault();
              if (!guess.trim() || busy) return;
              onGuess(guess.trim());
            }}
          >
            <label className="field">
              <span>Your guess</span>
              <input
                id="guess"
                className="pixel-input"
                value={guess}
                autoComplete="off"
                autoCapitalize="off"
                maxLength={40}
                onChange={(event) => setGuess(event.target.value)}
              />
            </label>
            <button className="pixel-btn" type="submit" disabled={busy || !guess.trim()}>
              Dig
            </button>
          </form>
          {rejection ? <p className="banner">{rejection}</p> : null}
        </>
      )}
    </>
  );
}
