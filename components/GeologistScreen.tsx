import { useEffect, useRef, useState } from "react";

import { AttemptList } from "@/components/AttemptList";
import { Fuse } from "@/components/Fuse";
import { formatSeconds } from "@/lib/duration";
import type { RoomView } from "@/lib/types";

const SLOTS = 20;

function slotsFrom(view: RoomView): string[] {
  const slots = Array<string>(SLOTS).fill("");
  const bank = view.rounds[view.roundIndex]?.bank ?? [];
  bank.forEach((entry, index) => {
    if (index < SLOTS) slots[index] = entry.word;
  });
  return slots;
}

export function GeologistScreen({
  view,
  secondsLeft,
  fuseTotal,
  busy,
  onLock,
  onDraft,
}: {
  view: RoomView;
  secondsLeft: number | null;
  fuseTotal: number;
  busy: boolean;
  onLock: (words: string[]) => void;
  onDraft: (words: string[]) => void;
}) {
  const round = view.rounds[view.roundIndex];
  const [words, setWords] = useState<string[]>(() => slotsFrom(view));
  const sealed = useRef(false);

  useEffect(() => {
    sealed.current = false;
    setWords(slotsFrom(view));
    // Reload the slots only when a new shaft opens. Draft polls must not clobber typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.roundIndex]);

  useEffect(() => {
    if (view.status !== "bank" || secondsLeft === 0) return;
    const id = window.setTimeout(() => onDraft(words), 400);
    return () => window.clearTimeout(id);
  }, [view.status, secondsLeft, words, onDraft]);

  useEffect(() => {
    if (view.status !== "bank" || secondsLeft !== 0 || sealed.current) return;
    sealed.current = true;
    onLock(words);
  }, [view.status, secondsLeft, words, onLock]);

  if (view.status === "digging") {
    return (
      <div className="stage">
        <div className="stage-body">
          <div className="panel-head">
            <span>Geologist</span>
            <span>Shaft {view.roundIndex + 1} / 5</span>
          </div>
          <p className="prompt" id="prompt-text">{round?.prompt}</p>
          <p className="hint">Guesses show up here as the digger tries them.</p>
          <Fuse secondsLeft={secondsLeft} total={fuseTotal} />
          <AttemptList attempts={round?.attempts ?? []} empty="No guesses yet." />
          <ul className="chips">
            {round?.bank?.map((entry) => (
              <li key={entry.word}>{entry.word}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  const filled = words.filter((word) => word.trim()).length;
  const closed = secondsLeft === 0;

  return (
    <form
      className="stage"
      onSubmit={(event) => {
        event.preventDefault();
        if (busy || closed) return;
        onLock(words);
      }}
    >
      <div className="stage-body">
        <div className="panel-head">
          <span>Geologist</span>
          <span>Shaft {view.roundIndex + 1} / 5</span>
        </div>
        <p className="prompt" id="prompt-text">{round?.prompt}</p>
        <p className="hint">Twenty slots. Fill any of them, in any order.</p>
        <p className="hint">Blank slots are not bombs.</p>
        <p className="hint">
          Lock early, or the bank seals after {formatSeconds(view.bankSeconds)}.
        </p>
        <Fuse secondsLeft={secondsLeft} total={fuseTotal} />
        <div className="bank-grid">
          {words.map((word, index) => {
            const id = `bank-${index + 1}`;
            return (
              <label className="field" key={id}>
                <span>Slot {index + 1}</span>
                <input
                  id={id}
                  name={id}
                  className="pixel-input"
                  value={word}
                  autoComplete="off"
                  maxLength={40}
                  disabled={closed || busy}
                  onChange={(event) => {
                    const value = event.target.value;
                    setWords((current) => {
                      const next = current.slice();
                      next[index] = value;
                      return next;
                    });
                  }}
                />
              </label>
            );
          })}
        </div>
      </div>
      <div className="dock lock-row">
        <span className="hint">{filled} / 20 buried</span>
        <button id="lock-bank" className="pixel-btn" type="submit" disabled={busy || closed}>
          Lock bank
        </button>
      </div>
    </form>
  );
}
