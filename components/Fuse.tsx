export function Fuse({ secondsLeft, total = 25 }: { secondsLeft: number | null; total?: number }) {
  const seconds = secondsLeft ?? 0;
  const width = `${Math.max(0, Math.min(100, (seconds / total) * 100))}%`;
  return (
    <div className="fuse-row" aria-live="polite">
      <div className="fuse-track" aria-hidden="true">
        <div className="fuse-burn" style={{ width }} />
      </div>
      <span className="fuse-label" id="timer">{seconds}s</span>
    </div>
  );
}
