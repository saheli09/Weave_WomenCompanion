import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { format } from 'date-fns';
import { S } from '../content/strings';
import { useNow } from '../state/clock';
import { useWeave } from '../state/store';
import { stageTab, type StageTab } from '../domain/stage';
import { Gear, Icon, type IconName } from './Icon';
import { HeaderPill } from './Chip';

/* ---------------------------------------------------------------------------
 * StatusBar: shows the demo clock so time travel is visible.
 * ------------------------------------------------------------------------- */

export function StatusBar({ right }: { right?: ReactNode }) {
  const now = useNow(15_000);
  return (
    <div className="absolute inset-x-0 top-0 z-30 flex h-11 items-center justify-between bg-[var(--app-top)] px-6" aria-hidden={!right}>
      <span className="font-sans text-[14px] font-semibold text-ink tabular-nums">{format(now, 'H:mm')}</span>
      <span aria-hidden className="absolute top-0 left-1/2 h-[30px] w-[110px] -translate-x-1/2 rounded-[15px] bg-black" />
      <span className="flex items-center gap-1.5">
        {right ?? (
          <svg aria-hidden width="45" height="12" viewBox="0 0 45 12" fill="var(--color-ink)">
            <rect x="0" y="7" width="2.5" height="4" rx=".5" />
            <rect x="3.8" y="5" width="2.5" height="6" rx=".5" />
            <rect x="7.6" y="3" width="2.5" height="8" rx=".5" />
            <rect x="11.4" y="1" width="2.5" height="10" rx=".5" />
            <path d="M20 4.2a6.6 6.6 0 0 1 8.4 0l-.9 1a5.2 5.2 0 0 0-6.6 0zM21.6 6.1a4.1 4.1 0 0 1 5.2 0l-.9 1a2.7 2.7 0 0 0-3.4 0zM23.3 8l.9-1 .9 1-.9 1z" />
            <rect x="32" y="1" width="11" height="10" rx="2.5" fill="none" stroke="var(--color-ink)" strokeOpacity=".4" />
            <rect x="33.5" y="2.5" width="8" height="7" rx="1.3" />
          </svg>
        )}
      </span>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * BottomNav + FAB (5.1): Today, Me, [+], her journey, Ask AI. The journey tab
 * is Baby, Pregnancy or Cycle (stageTab, decision 2026-10-28).
 * ------------------------------------------------------------------------- */

type TabDef = { to: string; label: string; icon: IconName };

const JOURNEY_TABS: Record<StageTab, TabDef> = {
  baby: { to: '/baby', label: S.navBaby.text, icon: 'navBaby' },
  pregnancy: { to: '/pregnancy', label: S.navPregnancy.text, icon: 'navPregnancy' },
  cycle: { to: '/cycle', label: S.navCycle.text, icon: 'navCycle' },
};

function Tab({ to, label, icon }: TabDef) {
  return (
    <NavLink to={to} className="flex min-h-[56px] w-16 flex-col items-center justify-center gap-1">
      {({ isActive }) => (
        <>
          <Icon name={icon} size={18} color={isActive ? 'var(--color-coral-icon)' : 'var(--color-ink-2)'} />
          <span className={`type-nav ${isActive ? 'font-semibold text-coral-ink' : 'text-ink-2'}`}>{label}</span>
        </>
      )}
    </NavLink>
  );
}

export function FAB({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={S.fabA11y.text}
      data-testid="fab"
      className="grid size-14 shrink-0 place-items-center rounded-[28px] font-sans text-[24px] font-semibold text-fab-ink shadow-fab active:scale-95"
      style={{ backgroundImage: 'var(--fab-gradient)' }}
    >
      <svg aria-hidden width="14" height="14" viewBox="0 0 14 14">
        <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    </button>
  );
}

export function BottomNav({ onFab, hidden }: { onFab: () => void; hidden?: boolean }) {
  const now = useNow(60_000);
  const journey = useWeave((s) => stageTab(s.domain, now));
  if (hidden) return null;
  return (
    <nav aria-label="Main" className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-between border-t border-line bg-surface px-4 pt-3 pb-[15px]">
      <Tab to="/today" label={S.navToday.text} icon="navToday" />
      <Tab {...JOURNEY_TABS[journey]} />
      <FAB onClick={onFab} />
      {/* Self care took Me's place (decision 2026-10-30): her body, records and suggestions; her daily logging is on Today. */}
      <Tab to="/me" label={S.navSelfCare.text} icon="navSelfCare" />
      <Tab to="/ask" label={S.navAsk.text} icon="navAsk" />
    </nav>
  );
}

/* ---------------------------------------------------------------------------
 * ScreenHeader (7.5): uppercase date or section label, optional right pill,
 * serif title, optional subtitle and settings gear.
 * ------------------------------------------------------------------------- */

export function ScreenHeader({ label, pill, title, subtitle, onSettings }: { label: string; pill?: string; title: string; subtitle?: ReactNode; onSettings?: () => void }) {
  // A title that only repeats the label ("Me" under "ME") is kept for screen readers but not shown twice.
  const repeats = label.toLowerCase() === title.toLowerCase() && !subtitle;
  return (
    <header className="flex w-full flex-col gap-5">
      <div className="flex min-h-[22px] items-center justify-between">
        <p className="type-micro text-ink-3">{label}</p>
        <span className="flex items-center gap-2">
          {pill ? <HeaderPill>{pill}</HeaderPill> : null}
          {onSettings ? (
            <button type="button" onClick={onSettings} aria-label={S.settingsA11y.text} className="-m-2.5 grid size-11 place-items-center text-ink-2">
              <Gear />
            </button>
          ) : null}
        </span>
      </div>
      <div className={repeats ? 'sr-only' : 'flex flex-col gap-[5px]'}>
        <h1 className="type-greeting text-ink">{title}</h1>
        {subtitle ? <p className="font-sans text-[13px] font-medium text-ink-2">{subtitle}</p> : null}
      </div>
    </header>
  );
}

/* ---------------------------------------------------------------------------
 * Running timer pill (9.4): above the nav on every screen while a sleep or
 * breastfeed timer runs. Tap to end.
 * ------------------------------------------------------------------------- */

export function RunningPill({ label, onClick, a11yLabel }: { label: string; onClick: () => void; a11yLabel?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={a11yLabel}
      className="flex min-h-[44px] items-center gap-2 rounded-pill bg-ink px-5 font-sans text-[14px] font-semibold whitespace-nowrap text-surface shadow-sheet"
    >
      <span aria-hidden className="size-2 animate-pulse rounded-full bg-hydration" />
      {label}
    </button>
  );
}
