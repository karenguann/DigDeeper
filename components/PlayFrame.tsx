import type { ReactNode } from "react";

import { ShaftVisual } from "@/components/ShaftVisual";
import type { RoomView } from "@/lib/types";

export function PlayFrame({ view, children }: { view: RoomView; children: ReactNode }) {
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
