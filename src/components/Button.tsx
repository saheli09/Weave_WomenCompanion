import type { ButtonHTMLAttributes, ReactNode } from 'react';

/**
 * Buttons (7.5). Visual sizes follow Figma; every button keeps a 44px hit area.
 *  - PrimaryButton: dark ink for neutral actions, sage for affirming ones.
 *    `size="lg"` is the 56px full-width action (Start Labour Mode, Save birth).
 *  - SecondaryButton: outlined pill (Start Left, Baby is here).
 *  - GhostButton: hairline pill (View recipe, Log a reaction).
 *  - TextAction: "Not now", "Skip for now".
 */

type Base = ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode };

export function PrimaryButton({
  tone = 'ink',
  size = 'md',
  hint,
  className = '',
  children,
  ...rest
}: Base & { tone?: 'ink' | 'sage'; size?: 'md' | 'lg'; hint?: ReactNode }) {
  const bg = tone === 'sage' ? 'bg-sage-600' : 'bg-ink';
  const sizing =
    size === 'lg'
      ? 'h-14 w-full text-[16px] font-semibold'
      : 'hit-44 min-h-[37px] px-4 py-2.5 text-[14px] font-semibold';
  return (
    <button
      type="button"
      className={`inline-flex flex-col items-center justify-center rounded-pill font-sans text-surface transition-opacity active:opacity-85 disabled:opacity-40 ${bg} ${sizing} ${className}`}
      {...rest}
    >
      <span className="leading-tight">{children}</span>
      {hint ? <span className={`text-[12px] font-medium leading-tight ${tone === 'ink' ? 'text-ink-faint' : 'text-surface'}`}>{hint}</span> : null}
    </button>
  );
}

export function SecondaryButton({ size = 'md', className = '', children, ...rest }: Base & { size?: 'md' | 'lg' }) {
  const sizing = size === 'lg' ? 'h-14 w-full text-[14px]' : 'min-h-[44px] px-5 text-[16px]';
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center rounded-pill border border-ink-faint font-sans font-medium text-ink active:bg-line/60 disabled:opacity-40 ${sizing} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function GhostButton({ className = '', children, ...rest }: Base) {
  return (
    <button
      type="button"
      className={`hit-44 inline-flex min-h-[37px] items-center rounded-pill border border-line px-4 py-2.5 font-sans text-[13px] font-semibold text-ink active:bg-line/60 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function TextAction({ className = '', children, ...rest }: Base) {
  return (
    <button
      type="button"
      className={`hit-44 inline-flex min-h-[37px] items-center justify-center px-2 py-2.5 font-sans text-[14px] font-medium text-ink-2 active:opacity-70 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
