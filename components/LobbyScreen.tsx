import { useState } from "react";

import { PixelSprite } from "@/components/PixelSprite";

export function LobbyScreen({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const link = typeof window === "undefined" ? "" : `${window.location.origin}/?room=${code}&role=geologist`;

  return (
    <div className="lobby">
      <PixelSprite name="pickaxe" size={72} alt="" />
      <p className="muted">Waiting for the geologist</p>
      <p>
        Room <span className="code" id="room-code">{code}</span>
      </p>
      <p className="hint">Send this link. The timer starts after they lock 20 words.</p>
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
    </div>
  );
}
