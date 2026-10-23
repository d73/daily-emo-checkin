export function ScorePicker({ onPick, disabled }: { onPick: (n: number) => void; disabled?: boolean }) {
  return (
    <div>
      <div className="scores" role="group" aria-label="Pick a number from 1 to 10">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button key={n} className="score" disabled={disabled} onClick={() => onPick(n)}>
            {n}
          </button>
        ))}
      </div>
      <div className="scale-labels muted small">
        <span>1 = very bad</span>
        <span>10 = great</span>
      </div>
    </div>
  );
}
