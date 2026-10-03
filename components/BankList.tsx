import type { RoundView } from "@/lib/types";

export function BankList({ round }: { round: RoundView }) {
  if (!round.bank) return null;
  return (
    <div>
      {round.bank.length === 0 ? (
        <p className="hint">The bank was empty.</p>
      ) : (
        <ul className="chips">
          {round.bank.map((entry) => (
            <li key={entry.word} className={entry.word === round.matchedBankWord ? "hit" : ""}>
              {entry.word}
            </li>
          ))}
        </ul>
      )}
      {round.reasoning ? <p className="debrief">Debrief: {round.reasoning}</p> : null}
    </div>
  );
}
