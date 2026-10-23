import type { ButtonHTMLAttributes } from 'react';

/** Subject chip (7.5): child name or "Me". Carries text, so colour is never the only signal (15). */
export function SubjectChip({ kind, label }: { kind: 'child' | 'her'; label: string }) {
  const tone = kind === 'child' ? 'bg-chip-child-bg text-chip-child-fg' : 'bg-chip-her-bg text-chip-her-fg';
  return <span className={`type-chip inline-flex shrink-0 items-start overflow-hidden rounded-tag px-2 py-[2px] ${tone}`}>{label}</span>;
}

/** Filter chip for timelines and lists (All, child name, Me). */
export function FilterChip({ selected, children, className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { selected: boolean }) {
  // As a radio option the state is aria-checked; as a toggle it is aria-pressed. Never both.
  const isRadio = rest.role === 'radio';
  return (
    <button
      type="button"
      aria-pressed={isRadio ? undefined : selected}
      aria-checked={isRadio ? selected : undefined}
      className={`inline-flex min-h-[44px] items-center rounded-pill border px-4 font-sans text-[13px] font-semibold transition-colors ${
        selected ? 'border-ink bg-ink text-surface' : 'border-line bg-surface text-ink'
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Small outlined pill used in headers ("Week 7", "Srinika’s Age: 5m 5d"). */
export function HeaderPill({ children }: { children: string }) {
  return <span className="inline-flex items-start rounded-pill border border-line px-2.5 py-1 font-sans text-[11px] font-semibold text-ink-2">{children}</span>;
}
