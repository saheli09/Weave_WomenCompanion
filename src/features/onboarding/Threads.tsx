import { useEffect, useState, type CSSProperties } from 'react';
import { S } from '../../content/strings';
import type { Situation } from '../../domain/transitions';

/**
 * The thread motif (decision 2026-10-28): Weave's name drawn as coloured
 * threads, one per stage she moves through. Used by the splash, the welcome
 * screen, the situation choices and the progress thread. Drawn in code so it
 * stays sharp, takes the palette tokens and honours reduced motion.
 */

/** One colour per stage, from the palette. Pregnancy, birth and recovery, her cycle, her child. */
export const STAGE_COLOURS = {
  pregnancy: 'var(--color-coral-b)',
  recovery: 'var(--color-hydration)',
  cycle: 'var(--color-olive-500)',
  child: 'var(--color-sage-600)',
} as const;

const PALETTE = [STAGE_COLOURS.pregnancy, STAGE_COLOURS.recovery, STAGE_COLOURS.cycle, STAGE_COLOURS.child];

/** When the splash ends, so drawings behind it start after it instead of unseen. */
let splashEndsAt = 0;
const delayAfterSplash = (extra = 0): CSSProperties => ({ animationDelay: `${Math.max(0, splashEndsAt - Date.now()) + extra}ms` });

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** The mark: four threads crossing through one centre, like a knot. */
export function WeaveMark({ size = 96, animate = true, delay = 0 }: { size?: number; animate?: boolean; delay?: number }) {
  const paths = [
    'M14 44 C 42 12, 78 108, 106 76',
    'M14 76 C 42 108, 78 12, 106 44',
    'M44 14 C 12 42, 108 78, 76 106',
    'M76 14 C 108 42, 12 78, 44 106',
  ];
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 120 120" fill="none">
      {paths.map((d, i) => (
        <path
          key={d}
          d={d}
          pathLength={1}
          stroke={PALETTE[i]}
          strokeWidth={7}
          strokeLinecap="round"
          className={animate ? 'thread-draw' : undefined}
          style={animate ? { animationDelay: `${delay + i * 120}ms` } : undefined}
        />
      ))}
    </svg>
  );
}

/**
 * Splash on every cold start, as an installed app opens: the mark weaves
 * itself, the name rises, then the screen gives way to the app. Skipped for
 * reduced motion, where it would only be a pause.
 */
const SPLASH_MS = 1500;

export function Splash() {
  const [phase, setPhase] = useState<'on' | 'leaving' | 'gone'>(() => (reducedMotion() ? 'gone' : 'on'));
  useEffect(() => {
    if (phase === 'gone') return;
    splashEndsAt = Date.now() + SPLASH_MS + 200;
    const a = setTimeout(() => setPhase('leaving'), SPLASH_MS);
    const b = setTimeout(() => setPhase('gone'), SPLASH_MS + 350);
    return () => (clearTimeout(a), clearTimeout(b));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (phase === 'gone') return null;
  return (
    <div aria-hidden data-testid="splash" className={`absolute inset-0 z-[90] flex flex-col items-center justify-center gap-5 bg-bg ${phase === 'leaving' ? 'splash-out' : ''}`}>
      <WeaveMark size={112} />
      <div className="flex flex-col items-center gap-1">
        <span className="splash-rise font-serif text-[34px] text-ink" style={{ animationDelay: '550ms' }}>
          {S.onbBrand.text}
        </span>
        <span className="splash-rise font-sans text-[13px] text-ink-2" style={{ animationDelay: '750ms' }}>
          {S.onbTagline.text}
        </span>
      </div>
    </div>
  );
}

/**
 * Welcome hero: four threads, one per stage, crossing as they run across the
 * screen. The stage list under it uses the same colours, so the drawing reads
 * as her journey rather than decoration.
 */
export function StageThreads() {
  const paths = [
    'M-4 30 C 70 26, 110 128, 182 86 S 300 18, 364 52',
    'M-4 74 C 66 128, 134 18, 202 66 S 302 138, 364 104',
    'M-4 112 C 92 62, 146 142, 220 96 S 318 30, 364 30',
    'M-4 140 C 86 142, 128 44, 196 58 S 312 124, 364 138',
  ];
  return (
    <svg aria-hidden viewBox="0 0 360 170" className="h-auto w-full" fill="none" preserveAspectRatio="xMidYMid meet">
      {paths.map((d, i) => (
        <path key={d} d={d} pathLength={1} stroke={PALETTE[i]} strokeWidth={6} strokeLinecap="round" className="thread-draw" style={delayAfterSplash(i * 160)} />
      ))}
    </svg>
  );
}

/** Colour dot for a stage row under the hero. */
export function StageDot({ index }: { index: number }) {
  return <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: PALETTE[index] }} />;
}

/**
 * Glyph for each situation. Threads add up as life does: one for pregnancy,
 * two once there is a baby (her recovery joins), three when pregnant with a
 * child; her cycle is a ring.
 */
export function SituationGlyph({ kind }: { kind: Situation['kind'] }) {
  // Small versions of the welcome threads: waves that cross as they run left to right.
  const one = 'M6 15 C 16 7, 24 30, 36 22';
  const two = 'M6 27 C 16 35, 24 12, 36 20';
  const three = 'M6 21 C 12 14, 18 14, 21 21 S 30 28, 36 21';
  return (
    <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-tile bg-bg">
      <svg width="32" height="32" viewBox="0 0 42 42" fill="none">
        {kind === 'tracking_cycle' ? (
          <>
            <circle cx="21" cy="21" r="11" stroke={STAGE_COLOURS.cycle} strokeWidth={4} />
            <circle cx="21" cy="10" r="3.5" fill={STAGE_COLOURS.pregnancy} />
          </>
        ) : (
          <>
            <path d={kind === 'pregnant' ? three : one} stroke={STAGE_COLOURS.pregnancy} strokeWidth={3.5} strokeLinecap="round" />
            {kind !== 'pregnant' ? <path d={two} stroke={STAGE_COLOURS.recovery} strokeWidth={3.5} strokeLinecap="round" /> : null}
            {kind === 'pregnant_with_child' ? <path d={three} stroke={STAGE_COLOURS.child} strokeWidth={3.5} strokeLinecap="round" /> : null}
          </>
        )}
      </svg>
    </span>
  );
}

/** Progress as a thread that lengthens with each step; the rest waits in a faint line. */
export function ThreadProgress({ step, steps, label }: { step: number; steps: number; label: string }) {
  const d = 'M4 9 C 30 2, 52 16, 80 9 S 130 2, 160 9 S 212 16, 236 9';
  const done = step / steps;
  return (
    <div role="progressbar" aria-valuemin={1} aria-valuemax={steps} aria-valuenow={step} aria-label={label} className="min-w-0 flex-1">
      <svg aria-hidden viewBox="0 0 240 18" className="h-[18px] w-full" fill="none" preserveAspectRatio="none">
        <path d={d} pathLength={1} stroke="var(--color-line)" strokeWidth={3} strokeLinecap="round" />
        <path
          d={d}
          pathLength={1}
          stroke={STAGE_COLOURS.child}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={`${done} 1`}
          className="transition-[stroke-dasharray] duration-500 ease-out"
        />
      </svg>
    </div>
  );
}
