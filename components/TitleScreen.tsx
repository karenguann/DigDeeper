import { useState } from "react";

import { PixelSprite } from "@/components/PixelSprite";
import { dayIndexFromDate } from "@/lib/day";
import type { Role } from "@/lib/types";

export function TitleScreen({
  busy,
  error,
  onStart,
  onCreate,
}: {
  busy: boolean;
  error: string | null;
  onStart: () => void;
  onCreate: (role: Role) => void;
}) {
  const [picking, setPicking] = useState(false);
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
      <p className="lede">
        Dig Deeper #{day}. Five prompts. Twenty-five seconds each. Rarer answers
        get more points.
      </p>
      {error ? <p className="banner">{error}</p> : null}
      {picking ? (
        <div className="role-row" key="roles">
          <button
            id="create-digger"
            className="pixel-btn"
            type="button"
            disabled={busy}
            onClick={() => onCreate("digger")}
          >
            I am the Digger
          </button>
          <button
            id="create-geologist"
            className="pixel-btn-ghost"
            type="button"
            disabled={busy}
            onClick={() => onCreate("geologist")}
          >
            I am the Geologist
          </button>
          <button
            className="pixel-btn-ghost"
            type="button"
            onClick={() => setPicking(false)}
          >
            Back
          </button>
        </div>
      ) : (
        <div className="title-actions" key="home">
          <button
            id="start-solo"
            className="pixel-btn"
            type="button"
            disabled={busy}
            onClick={onStart}
          >
            Start
          </button>
          <button
            id="create-room"
            className="pixel-btn-ghost"
            type="button"
            disabled={busy}
            onClick={() => setPicking(true)}
          >
            Create room
          </button>
        </div>
      )}
    </div>
  );
}
