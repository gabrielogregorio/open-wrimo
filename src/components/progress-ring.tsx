const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type ProgressRingProps = { value: number; max: number; valueText: string; maxText: string; caption: string };

export function ProgressRing({ value, max, valueText, maxText, caption }: ProgressRingProps) {
  const filled = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;

  return (
    <figure className="sheet flex flex-col items-center gap-3 rounded-sm p-6 text-center">
      <svg viewBox="0 0 120 120" className="h-36 w-36 -rotate-90" aria-hidden="true" focusable="false">
        <circle cx="60" cy="60" r={RADIUS} fill="none" stroke="var(--rule)" strokeWidth="8" />
        <circle
          className="ring-fill"
          cx="60"
          cy="60"
          r={RADIUS}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - filled)}
          style={{ '--ring-length': CIRCUMFERENCE } as React.CSSProperties}
        />
      </svg>
      <figcaption>
        <span className="font-display text-4xl font-semibold">{valueText}</span>
        <span className="text-lg text-ink-soft"> / {maxText}</span>
        <span className="block font-display text-lg text-ink-soft">{caption}</span>
      </figcaption>
    </figure>
  );
}
