import { useEffect, useRef, useState } from "react";

import { AttemptList } from "@/components/AttemptList";
import { Fuse } from "@/components/Fuse";
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
  onLock: (words: string[], reasoning: string) => void;
  onDraft: (words: string[], reasoning: string) => void;
}) {
  const round = view.rounds[view.roundIndex];
  const [words, setWords] = useState<string[]>(() => slotsFrom(view));
  const [note, setNote] = useState(round?.reasoning ?? "");
  const sealed = useRef(false);

  useEffect(() => {
    sealed.current = false;
    setWords(slotsFrom(view));
    setNote(view.rounds[view.roundIndex]?.reasoning ?? "");
    // Reload the slots only when a new shaft opens. Draft polls must not clobber typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.roundIndex]);

  useEffect(() => {
    if (view.status !== "bank" || secondsLeft === 0) return;
    const id = window.setTimeout(() => onDraft(words, note), 400);
    return () => window.clearTimeout(id);
  }, [view.status, secondsLeft, words, note, onDraft]);

  useEffect(() => {
    if (view.status !== "bank" || secondsLeft !== 0 || sealed.current) return;
    sealed.current = true;
    onLock(words, note);
  }, [view.status, secondsLeft, words, note, onLock]);

  if (view.status === "digging") {
    return (
      <>
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
      </>
    );
  }

  const filled = words.filter((word) => word.trim()).length;
  const closed = secondsLeft === 0;

  return (
    <>
      <div className="panel-head">
        <span>Geologist</span>
        <span>Shaft {view.roundIndex + 1} / 5</span>
      </div>
      <p className="prompt" id="prompt-text">{round?.prompt}</p>
      <p className="hint">
        Twenty slots. Fill any of them, in any order. Blank slots are not bombs. Lock early, or the bank seals when the minute ends.
      </p>
      <Fuse secondsLeft={secondsLeft} total={fuseTotal} />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (busy || closed) return;
          onLock(words, note);
        }}
      >
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
        <label className="field tier">
          <span>Debrief note, optional</span>
          <textarea
            id="bank-note"
            name="bank-note"
            className="pixel-area"
            maxLength={280}
            value={note}
            disabled={closed || busy}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
        <div className="lock-row" style={{ marginTop: 12 }}>
          <span className="hint">{filled} / 20 buried</span>
          <button id="lock-bank" className="pixel-btn" type="submit" disabled={busy || closed}>
            Lock bank
          </button>
        </div>
      </form>
    </>
  );
}
