"use client";

import { useEffect, type ReactNode } from "react";

import { ShaftVisual } from "@/components/ShaftVisual";
import { soilColorForDepth } from "@/lib/soil";
import type { RoomView } from "@/lib/types";

export function PlayFrame({ view, children }: { view: RoomView; children: ReactNode }) {
  const ground = soilColorForDepth(view.totalDepth);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.ground = "1";
    root.style.setProperty("--ground", ground);
    return () => {
      delete root.dataset.ground;
      root.style.removeProperty("--ground");
    };
  }, [ground]);

  const racing = view.status === "bank" || view.status === "digging" || view.status === "reveal";
  return (
    <div className="play">
      <ShaftVisual totalDepth={view.totalDepth} rounds={view.rounds} />
      <section className="panel">
        {racing ? (
          <p className="scoreboard" id="scoreboard">
            <span>Digger {view.totalDepth}</span>
            <span>Geologist {view.totalTrap}</span>
          </p>
        ) : null}
        {children}
      </section>
    </div>
  );
}
