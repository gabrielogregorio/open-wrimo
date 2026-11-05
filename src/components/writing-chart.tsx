import type { DailyPoint } from '@/lib/writing/stats';

const WIDTH = 640;
const HEIGHT = 220;
const PADDING = 8;

type WritingChartProps = {
  points: DailyPoint[];
  daysElapsed: number;
  title: string;
  labels: { day: string; written: string; total: string; par: string };
  formatDay: (date: string) => string;
  formatNumber: (value: number) => string;
};

const line = (values: number[], top: number, length = values.length): string =>
  values
    .map((value, index) => {
      const x = PADDING + (index * (WIDTH - 2 * PADDING)) / Math.max(1, length - 1);
      const y = HEIGHT - PADDING - (value / top) * (HEIGHT - 2 * PADDING);

      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

export function WritingChart({ points, daysElapsed, title, labels, formatDay, formatNumber }: WritingChartProps) {
  const top = Math.max(1, ...points.map((point) => Math.max(point.cumulative, point.par)));
  const topDaily = Math.max(1, ...points.map((point) => point.count));
  const barWidth = (WIDTH - 2 * PADDING) / Math.max(1, points.length);

  return (
    <figure className="sheet flex flex-col gap-3 rounded-sm p-5">
      <figcaption className="font-display text-lg">{title}</figcaption>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full" aria-hidden="true" focusable="false">
        {points.map((point, index) => (
          <rect
            key={point.date}
            className="bar-grow"
            x={PADDING + index * barWidth + barWidth * 0.15}
            width={barWidth * 0.7}
            y={HEIGHT - PADDING - (Math.max(0, point.count) / topDaily) * (HEIGHT / 3)}
            height={(Math.max(0, point.count) / topDaily) * (HEIGHT / 3)}
            fill="var(--rule)"
          />
        ))}
        <polyline
          points={line(
            points.map((point) => point.par),
            top,
          )}
          fill="none"
          stroke="var(--ink-soft)"
          strokeDasharray="6 6"
          strokeWidth="2"
        />
        <polyline
          className="line-draw"
          pathLength={1}
          points={line(
            points.slice(0, Math.max(1, daysElapsed)).map((point) => point.cumulative),
            top,
            points.length,
          )}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="3"
          strokeLinejoin="round"
        />
      </svg>
      <ul className="flex flex-wrap gap-4 text-xs text-ink-soft">
        <li className="flex items-center gap-1">
          <span className="inline-block h-0.5 w-5 bg-accent" aria-hidden="true" /> {labels.total}
        </li>
        <li className="flex items-center gap-1">
          <span className="inline-block w-5 border-t-2 border-dashed border-ink-soft" aria-hidden="true" /> {labels.par}
        </li>
        <li className="flex items-center gap-1">
          <span className="inline-block h-2 w-3 bg-rule" aria-hidden="true" /> {labels.written}
        </li>
      </ul>
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">{labels.day}</th>
            <th scope="col">{labels.written}</th>
            <th scope="col">{labels.total}</th>
            <th scope="col">{labels.par}</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.date}>
              <th scope="row">{formatDay(point.date)}</th>
              <td>{formatNumber(point.count)}</td>
              <td>{formatNumber(point.cumulative)}</td>
              <td>{formatNumber(point.par)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
