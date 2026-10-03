import { useState } from "react";

import { PixelSprite } from "@/components/PixelSprite";
import { dayIndexFromDate } from "@/lib/day";

export function TitleScreen({
  busy,
  error,
  onCreate,
  onJoin,
}: {
  busy: boolean;
  error: string | null;
  onCreate: () => void;
  onJoin: (code: string) => void;
}) {
  const [picking, setPicking] = useState(false);
  const [code, setCode] = useState("");
  const day = dayIndexFromDate();

  return (
    <div className="title-screen">
      <div className="hero-row">
        <PixelSprite name="miner" size={96} alt="" />
        <h1>
          DIG
          <br />
          DEEPER
        </h1>
        <PixelSprite name="diamond" size={72} alt="" />
      </div>
      <p className="lede">Dig Deeper #{day}. Five shafts. Twenty-five seconds each.</p>
      <p className="hint">The geologist buries 20 bombs. The digger tries to miss every one.</p>
      {error ? <p className="banner">{error}</p> : null}
      {picking ? (
        <form
          className="stack"
          onSubmit={(event) => {
            event.preventDefault();
            onJoin(code);
          }}
        >
          <label className="field">
            <span>Expedition code</span>
            <input
              id="join-code"
              className="pixel-input"
              value={code}
              autoComplete="off"
              maxLength={6}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
            />
          </label>
          <button className="pixel-btn" type="submit" disabled={busy || code.trim().length < 4}>
            Join as geologist
          </button>
          <button className="pixel-btn-ghost" type="button" onClick={() => setPicking(false)}>
            Back
          </button>
        </form>
      ) : (
        <div className="role-row">
          <button className="pixel-btn" type="button" disabled={busy} onClick={onCreate}>
            I am the Digger
          </button>
          <button className="pixel-btn-ghost" type="button" disabled={busy} onClick={() => setPicking(true)}>
            I am the Geologist
          </button>
        </div>
      )}
    </div>
  );
}
