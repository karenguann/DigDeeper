import type { ReactNode } from "react";

import { ShaftVisual } from "@/components/ShaftVisual";
import type { RoomView } from "@/lib/types";

export function PlayFrame({ view, children }: { view: RoomView; children: ReactNode }) {
  return (
    <div className="play">
      <ShaftVisual totalDepth={view.totalDepth} rounds={view.rounds} />
      <section className="panel">{children}</section>
    </div>
  );
}
