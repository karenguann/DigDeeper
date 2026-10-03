export function AttemptList({ attempts, empty }: { attempts: string[] | null; empty?: string }) {
  if (!attempts) return null;
  if (attempts.length === 0 && !empty) return null;
  return (
    <section className="tier">
      <h2>Digger&apos;s guesses</h2>
      {attempts.length === 0 ? (
        <p className="hint">{empty}</p>
      ) : (
        <ol className="attempts">
          {attempts.map((attempt, index) => (
            <li key={`${index}-${attempt}`}>
              {index + 1}. {attempt}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
