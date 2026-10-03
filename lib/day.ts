const EPOCH_MS = Date.UTC(2026, 0, 1);

export function dayIndexFromDate(date = new Date()): number {
  const utcMidnight = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.floor((utcMidnight - EPOCH_MS) / 86_400_000) + 1;
}
