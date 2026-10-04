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
      <div className="hero-row inline-header">
        <h1>DIG DEEPER</h1>
        <PixelSprite name="diamond" size={72} alt="Diamond Sprite" />
      </div>

      {error ? <p className="banner">{error}</p> : null}

      {picking ? (
        <div className="role-selection-container" key="roles">
          <div className="panels-container">
            <div className="role-panel">
              <p className="panel-text">
                Dig Deeper #{day}.<br />
                Five prompts. Twenty-five seconds each. Rarer answers get more
                points.
              </p>
              <button
                id="create-digger"
                className="pixel-btn"
                type="button"
                disabled={busy}
                onClick={() => onCreate("digger")}
              >
                I AM THE DIGGER
              </button>
            </div>

            <div className="role-panel">
              <p className="panel-text">
                The geologist buries 20 answers.
                <br />
                The digger tries to miss every one.
              </p>
              <button
                id="create-geologist"
                className="pixel-btn-ghost geologist-btn"
                type="button"
                disabled={busy}
                onClick={() => onCreate("geologist")}
              >
                I AM THE GEOLOGIST
              </button>
            </div>
          </div>

          <div className="bottom-actions">
            <p className="instruction-text">CHOOSE YOUR ROLE TO PROCEED</p>
            <button
              className="pixel-btn-ghost back-btn"
              type="button"
              onClick={() => setPicking(false)}
            >
              Back
            </button>
          </div>
        </div>
      ) : (
        <div className="main-menu-container" key="home">
          <div className="role-panel">
            <p className="panel-text" style={{ textAlign: "center" }}>
              Dig Deeper #{day}.<br />
              <br />
              Five prompts. Twenty-five seconds each. Rarer answers get more
              points.
            </p>
            <div className="title-actions flex-row">
              <button
                id="start-solo"
                className="pixel-btn"
                type="button"
                disabled={busy}
                onClick={onStart}
              >
                START
              </button>
              <button
                id="create-room"
                className="pixel-btn-ghost"
                type="button"
                disabled={busy}
                onClick={() => setPicking(true)}
              >
                CREATE ROOM
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
