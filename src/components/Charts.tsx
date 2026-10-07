import { useId, useState } from 'react';
import { S } from '../content/strings';

/**
 * Small SVG charts (PRD 16.1: lightweight, no chart library). One series each,
 * so no legend: the section title names it. Following the dataviz method:
 * thin marks, 4px rounded data ends on the baseline, recessive axis, a single
 * selective label, a tooltip per mark (hover and keyboard focus), and a table
 * view so the numbers never depend on seeing the shape. The mark colour is
 * olive, not sage (sage is reserved for AI observations, 7.1).
 */

export interface Datum {
  label: string; // short axis label, e.g. "Th"
  full: string; // tooltip / table label, e.g. "Thursday 27 August"
  value: number;
}

function TableToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} className="hit-44 self-end font-sans text-[12px] font-semibold text-ink-2 underline underline-offset-2">
      {show ? S.chartShowChart.text : S.chartShowTable.text}
    </button>
  );
}

function DataTable({ data, unit, caption }: { data: Datum[]; unit: (v: number) => string; caption: string }) {
  return (
    <table className="w-full text-left font-sans text-[13px]">
      <caption className="sr-only">{caption}</caption>
      <tbody>
        {data.map((d) => (
          <tr key={d.full} className="border-b border-line last:border-0">
            <th scope="row" className="py-2 font-medium text-ink-2">
              {d.full}
            </th>
            <td className="py-2 text-right font-semibold text-ink tabular-nums">{unit(d.value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Seven-day bars. The latest bar carries the only direct label. */
export function DayBars({ data, unit, caption, height = 96 }: { data: Datum[]; unit: (v: number) => string; caption: string; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const max = Math.max(1, ...data.map((d) => d.value));
  const w = 322;
  const slot = w / data.length;
  const barW = Math.min(18, slot - 2); // >= 2px surface gap between bars
  const plotH = height - 18;
  const id = useId();
  return (
    <figure className="flex flex-col gap-2" aria-labelledby={`${id}-cap`}>
      <figcaption id={`${id}-cap`} className="sr-only">
        {caption}
      </figcaption>
      {table ? (
        <DataTable data={data} unit={unit} caption={caption} />
      ) : (
        <div className="relative">
          <svg width="100%" viewBox={`0 0 ${w} ${height}`} role="img" aria-label={caption}>
            <line x1={0} x2={w} y1={plotH + 0.5} y2={plotH + 0.5} stroke="var(--color-line)" />
            {data.map((d, i) => {
              const h = d.value ? Math.max(4, (d.value / max) * (plotH - 16)) : 0;
              const x = i * slot + (slot - barW) / 2;
              const last = i === data.length - 1;
              return (
                <g key={d.full}>
                  {h ? <path d={`M${x},${plotH} v${-(h - 4)} q0,-4 4,-4 h${barW - 8} q4,0 4,4 v${h - 4} z`} fill="var(--color-olive-500)" opacity={hover === null || hover === i ? 1 : 0.45} /> : null}
                  {last && d.value ? (
                    <text x={x + barW / 2} y={plotH - h - 4} textAnchor="middle" className="fill-ink font-sans text-[11px] font-semibold">
                      {unit(d.value)}
                    </text>
                  ) : null}
                  <text x={i * slot + slot / 2} y={height - 2} textAnchor="middle" className="fill-ink-2 font-sans text-[10px]">
                    {d.label}
                  </text>
                </g>
              );
            })}
          </svg>
          {/* Hit targets wider than the marks, keyboard reachable, each with its own tooltip. */}
          <div className="absolute inset-0 flex">
            {data.map((d, i) => (
              <button
                key={d.full}
                type="button"
                aria-label={`${d.full}: ${unit(d.value)}`}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                className="relative h-full flex-1"
              >
                {hover === i ? (
                  <span role="tooltip" className="pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 rounded-[6px] bg-ink px-2 py-1 font-sans text-[11px] whitespace-nowrap text-surface">
                    {d.full}: {unit(d.value)}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      )}
      <TableToggle show={table} onToggle={() => setTable((x) => !x)} />
    </figure>
  );
}

/** A child's own trajectory over time (B15). 2px line, 8px markers, tooltip per point, no reference band. */
export function TrendLine({ points, unit, caption }: { points: { t: number; full: string; value: number }[]; unit: (v: number) => string; caption: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const w = 322;
  const h = 150;
  const pad = { l: 8, r: 8, t: 22, b: 22 };
  if (points.length < 2) return null;
  const t0 = points[0]!.t;
  const t1 = points.at(-1)!.t;
  const vMin = Math.min(...points.map((p) => p.value));
  const vMax = Math.max(...points.map((p) => p.value));
  const x = (t: number) => pad.l + ((t - t0) / Math.max(1, t1 - t0)) * (w - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - vMin) / Math.max(1e-9, vMax - vMin)) * (h - pad.t - pad.b);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const last = points.at(-1)!;
  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="sr-only">{caption}</figcaption>
      {table ? (
        <DataTable data={points.map((p) => ({ label: '', full: p.full, value: p.value }))} unit={unit} caption={caption} />
      ) : (
        <div className="relative">
          <svg width="100%" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={caption}>
            <line x1={0} x2={w} y1={h - pad.b + 0.5} y2={h - pad.b + 0.5} stroke="var(--color-line)" />
            <path d={path} fill="none" stroke="var(--color-olive-500)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {points.map((p, i) => (
              <circle key={p.full} cx={x(p.t)} cy={y(p.value)} r={4} fill="var(--color-olive-500)" stroke="var(--color-surface)" strokeWidth={2} opacity={hover === null || hover === i ? 1 : 0.5} />
            ))}
            <text x={x(last.t)} y={y(last.value) - 10} textAnchor="end" className="fill-ink font-sans text-[11px] font-semibold">
              {unit(last.value)}
            </text>
            <text x={pad.l} y={h - 4} className="fill-ink-2 font-sans text-[10px]">
              {points[0]!.full}
            </text>
            <text x={w - pad.r} y={h - 4} textAnchor="end" className="fill-ink-2 font-sans text-[10px]">
              {last.full}
            </text>
          </svg>
          {points.map((p, i) => (
            <button
              key={p.full}
              type="button"
              aria-label={`${p.full}: ${unit(p.value)}`}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              className="absolute size-11 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ left: `${(x(p.t) / w) * 100}%`, top: `${(y(p.value) / h) * 100}%` }}
            >
              {hover === i ? (
                <span role="tooltip" className="pointer-events-none absolute -top-7 left-1/2 z-10 -translate-x-1/2 rounded-[6px] bg-ink px-2 py-1 font-sans text-[11px] whitespace-nowrap text-surface">
                  {p.full}: {unit(p.value)}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      )}
      <TableToggle show={table} onToggle={() => setTable((v) => !v)} />
    </figure>
  );
}
