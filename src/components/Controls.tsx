import type { ReactNode } from 'react';
import type { MoodValue } from '../domain/types';
import { S } from '../content/strings';
import { Icon, type IconName } from './Icon';

/* ---------------------------------------------------------------------------
 * TileGrid (7.5): two-column tiles with line icon, label, "time since last".
 * ------------------------------------------------------------------------- */

export interface Tile {
  id: string;
  icon: IconName;
  label: string;
  since?: string;
  onClick: () => void;
}

export function TileGrid({ tiles }: { tiles: Tile[] }) {
  return (
    <div className="grid w-full grid-cols-2 gap-x-2.5 gap-y-5">
      {tiles.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={t.onClick}
          aria-label={t.since ? `${t.label}, ${t.since}` : t.label}
          className="flex min-h-[100px] items-center gap-5 rounded-tile border border-ink-faint px-3 py-[30px] text-left active:bg-bg"
        >
          <Icon name={t.icon} size={40} color="var(--color-ink)" />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="font-sans text-[16px] font-semibold leading-tight text-ink">{t.label}</span>
            {t.since ? <span className="font-sans text-[14px] leading-tight text-ink-2">{t.since}</span> : null}
          </span>
        </button>
      ))}
    </div>
  );
}

/** Type chooser tile without a since-line (Feed sheet: Breastfeed, Bottle, Solids, Combo). */
export function ChoiceTile({ icon, label, onClick, highlighted }: { icon: IconName; label: string; onClick: () => void; highlighted?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={highlighted ? 'true' : undefined}
      className={`flex min-h-[100px] items-center gap-[15px] rounded-tile border px-3 py-[30px] text-left active:bg-bg ${highlighted ? 'border-ink bg-bg' : 'border-ink-faint'}`}
    >
      <Icon name={icon} size={40} color="var(--color-ink)" />
      <span className="font-sans text-[16px] font-semibold whitespace-nowrap text-ink">{label}</span>
    </button>
  );
}

/** Meal slot picker (S06): icon over label, single select. */
export function SlotPicker<T extends string>({ options, value, onChange }: { options: { value: T; label: string; icon: IconName }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" className="flex w-full justify-between">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`flex min-h-[44px] flex-col items-center gap-[5px] rounded-tile px-3 py-1 ${value === o.value ? 'bg-bg' : ''}`}
        >
          <Icon name={o.icon} size={40} color={value === o.value ? 'var(--color-ink)' : 'var(--color-ink-2)'} />
          <span className={`font-sans text-[14px] font-semibold ${value === o.value ? 'text-ink' : 'text-ink-2'}`}>{o.label}</span>
        </button>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * MoodChips (7.5): Low, Flat, Ok, Good (single-select). 44px targets; the
 * Figma Me tile draws them at 22px, see FIGMA-DEVIATIONS.md.
 * ------------------------------------------------------------------------- */

const MOODS: { value: MoodValue; label: string }[] = [
  { value: 'low', label: S.moodLow.text },
  { value: 'flat', label: S.moodFlat.text },
  { value: 'ok', label: S.moodOk.text },
  { value: 'good', label: S.moodGood.text },
];

export function MoodChips({ value, onChange, size = 'sheet' }: { value?: MoodValue; onChange: (v: MoodValue) => void; size?: 'sheet' | 'tile' }) {
  return (
    <div role="radiogroup" aria-label={S.mood.text} className={`flex w-full ${size === 'sheet' ? 'gap-2' : 'gap-1'}`}>
      {MOODS.map((m) => (
        <button
          key={m.value}
          type="button"
          role="radio"
          aria-checked={value === m.value}
          onClick={() => onChange(m.value)}
          className={`flex min-h-[44px] flex-1 items-center justify-center border font-sans font-medium transition-colors ${
            size === 'sheet' ? 'rounded-pill text-[15px]' : 'rounded-chip text-[11px]'
          } ${value === m.value ? 'border-ink bg-ink text-surface' : 'border-line bg-surface text-ink'}`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * SegmentedProgress (7.5): eight-segment hydration bar.
 * ------------------------------------------------------------------------- */

export function SegmentedProgress({ value, total = 8, label }: { value: number; total?: number; label: string }) {
  return (
    <div role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={Math.min(value, total)} aria-label={label} className="flex w-full gap-1">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className="relative h-4 flex-1 overflow-hidden rounded-segment bg-line">
          {i < value ? <span key={`f${value > i}`} className={`absolute inset-0 bg-hydration ${i === value - 1 ? 'animate-segment-fill' : ''}`} /> : null}
        </span>
      ))}
    </div>
  );
}

/**
 * Glasses of water against the goal (decision 2026-10-29): one small glass per
 * glass, four to a row, filled as she drinks. For tiles with room to spare.
 */
export function GlassesProgress({ value, total = 8, label }: { value: number; total?: number; label: string }) {
  return (
    <div role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={Math.min(value, total)} aria-label={label} className="grid w-full grid-cols-4 justify-items-center gap-x-1 gap-y-2">
      {Array.from({ length: total }, (_, i) => (
        <Glass key={i} full={i < value} fresh={i === value - 1} />
      ))}
    </div>
  );
}

function Glass({ full, fresh }: { full: boolean; fresh: boolean }) {
  // A tumbler, wider at the rim; the water sits below it.
  const outline = 'M3 3 H21 L18.6 27.2 A2 2 0 0 1 16.6 29 H7.4 A2 2 0 0 1 5.4 27.2 Z';
  const water = 'M4.6 10 H19.4 L18.6 27.2 A2 2 0 0 1 16.6 29 H7.4 A2 2 0 0 1 5.4 27.2 Z';
  return (
    <svg aria-hidden width={22} height={30} viewBox="0 0 24 32" fill="none">
      <path d={outline} fill="var(--color-line)" fillOpacity={full ? 0 : 0.6} stroke={full ? 'var(--color-hydration)' : 'var(--color-ink-faint)'} strokeOpacity={full ? 1 : 0.6} strokeWidth={1.5} strokeLinejoin="round" />
      {full ? <path d={water} fill="var(--color-hydration)" className={fresh ? 'animate-glass-fill' : undefined} /> : null}
    </svg>
  );
}

/* ---------------------------------------------------------------------------
 * ProgressRing (7.5): week ring and KPI rings.
 * ------------------------------------------------------------------------- */

export function ProgressRing({ value, size = 128, stroke = 5.12, children, label }: { value: number; size?: number; stroke?: number; children?: ReactNode; label?: string }) {
  const r = (size - stroke) / 2 - 0.5;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }} role={label ? 'img' : undefined} aria-label={label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-ink)" strokeOpacity={0.08} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-olive-500)" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${c * v} ${c}`} />
      </svg>
      <div className="relative">{children}</div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * TimerControls (7.5): Start Left, Start Right; "last side" tag; editable
 * minutes with pencil. Timers store start timestamps (10.4).
 * ------------------------------------------------------------------------- */

export interface SideTimer {
  side: 'left' | 'right';
  minutes: number;
  running: boolean;
}

export function TimerControls({
  left,
  right,
  lastSide,
  onToggle,
  onEdit,
}: {
  left: SideTimer;
  right: SideTimer;
  lastSide?: 'left' | 'right';
  onToggle: (side: 'left' | 'right') => void;
  onEdit: (side: 'left' | 'right') => void;
}) {
  const col = (t: SideTimer) => (
    <div className="flex flex-col items-center gap-[5px] px-3">
      {lastSide === t.side ? (
        <span className="mb-[5px] rounded-[5px] bg-olive-500/22 px-5 py-2.5 font-sans text-[14px] font-medium text-ink">{S.lastSide.text}</span>
      ) : (
        <span aria-hidden className="mb-[5px] h-[37px]" />
      )}
      <div className="flex items-center gap-[15px]">
        <p className="font-serif text-ink" aria-live={t.running ? 'off' : undefined}>
          <span className="text-[36px]">{t.minutes}</span>
          <span className="text-[14px]">M</span>
        </p>
        <button type="button" onClick={() => onEdit(t.side)} aria-label={`Edit ${t.side} minutes`} className="-m-3 grid size-11 place-items-center">
          <Icon name="pencil" size={20} color="var(--color-ink)" />
        </button>
      </div>
      <button
        type="button"
        onClick={() => onToggle(t.side)}
        aria-pressed={t.running}
        className={`min-h-[44px] rounded-[20px] border px-5 py-2.5 font-sans text-[16px] font-medium ${t.running ? 'border-sage-600 bg-sage-600 text-surface' : 'border-ink-faint text-ink'}`}
      >
        {t.running ? S.stop.text : t.side === 'left' ? S.startLeft.text : S.startRight.text}
      </button>
    </div>
  );
  return (
    <div className="flex w-full items-end justify-center gap-5 px-5">
      {col(left)}
      {col(right)}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * ContractionDial (7.5): analogue dial with elapsed seconds in serif.
 * ------------------------------------------------------------------------- */

export function ContractionDial({ seconds, size = 250 }: { seconds: number; size?: number }) {
  const c = size / 2;
  const r = c - 2;
  const frac = (seconds % 60) / 60;
  const angle = frac * 2 * Math.PI - Math.PI / 2;
  const sweep = frac > 0.5 ? 1 : 0;
  const end = { x: c + r * Math.cos(angle), y: c + r * Math.sin(angle) };
  const handLen = r * 0.62;
  const hand = { x: c + handLen * Math.cos(angle), y: c + handLen * Math.sin(angle) };
  const mm = Math.floor(seconds / 60);
  const ss = String(Math.floor(seconds % 60)).padStart(2, '0');
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className="absolute inset-0">
        {frac > 0 ? <path d={`M${c},${c} L${c},${c - r} A${r},${r} 0 ${sweep} 1 ${end.x},${end.y} Z`} fill="var(--color-olive-500)" fillOpacity={0.22} /> : null}
        <circle cx={c} cy={c} r={r} fill="none" stroke="var(--color-ink-2)" strokeWidth={2} />
        {Array.from({ length: 16 }, (_, i) => {
          const a = (i / 16) * 2 * Math.PI;
          const major = i % 4 === 0;
          const r1 = r - (major ? 25 : 17);
          return (
            <line
              key={i}
              x1={c + r1 * Math.sin(a)}
              y1={c - r1 * Math.cos(a)}
              x2={c + (r - 4) * Math.sin(a)}
              y2={c - (r - 4) * Math.cos(a)}
              stroke={major ? 'var(--color-ink-2)' : 'var(--color-ink-faint)'}
              strokeWidth={major ? 2 : 1}
            />
          );
        })}
        <line x1={c} y1={c} x2={hand.x} y2={hand.y} stroke="var(--color-sage-600)" strokeWidth={2} strokeLinecap="round" />
        <circle cx={c} cy={c} r={4.5} fill="var(--color-sage-600)" />
      </svg>
      <p className="type-dial relative mt-[76px] text-ink" role="timer" aria-label={`${mm} minutes ${ss} seconds`}>
        {mm}:{ss}
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * BarStrip (7.5): contractions in the last hour. Bar x = start, width = length.
 * ------------------------------------------------------------------------- */

export function BarStrip({ bars, windowMs = 3600_000, now, startLabel, endLabel, label }: { bars: { start: number; end: number }[]; windowMs?: number; now: number; startLabel: string; endLabel: string; label: string }) {
  const from = now - windowMs;
  return (
    <figure className="flex w-full flex-col gap-1" aria-label={label}>
      <div className="relative h-[41px] w-full border-b border-ink-3">
        {bars
          .filter((b) => b.end > from)
          .map((b, i) => {
            const left = ((Math.max(b.start, from) - from) / windowMs) * 100;
            const width = Math.max(0.3, ((b.end - Math.max(b.start, from)) / windowMs) * 100);
            return <span key={i} className="absolute bottom-0 h-full rounded-t-pill bg-olive-500" style={{ left: `${left}%`, width: `max(1px, ${width}%)` }} />;
          })}
      </div>
      <figcaption className="flex justify-between font-sans text-[12px] text-ink-3" aria-hidden>
        <span>{startLabel}</span>
        <span>{endLabel}</span>
      </figcaption>
    </figure>
  );
}
