export const SHAFT_SCALE = 500;
export const LAYER_METERS = 50;

export const SOIL_LAYERS: { from: number; color: string }[] = [
  { from: 0, color: "#c4a06a" },
  { from: 50, color: "#b08a52" },
  { from: 100, color: "#967242" },
  { from: 150, color: "#7c5b34" },
  { from: 200, color: "#654628" },
  { from: 250, color: "#51381f" },
  { from: 300, color: "#3e2b18" },
  { from: 350, color: "#2e2012" },
  { from: 400, color: "#21170d" },
  { from: 450, color: "#140e09" },
];

export function depthFraction(meters: number): number {
  return Math.min(1, Math.max(0, meters / SHAFT_SCALE));
}
