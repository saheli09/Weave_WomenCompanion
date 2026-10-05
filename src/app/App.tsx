import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { BottomNav, ScreenHeader, StatusBar } from '../components/Shell';
import { ErrorBoundary } from '../components/States';
import { DemoPanel } from '../demo/DemoPanel';
import { Today, PhaseNote } from '../features/today/Today';
import { QuickLogSheet } from '../features/quicklog/QuickLogSheet';
import { Gallery } from '../design/Gallery';
import { S } from '../content/strings';
import { useWeave } from '../state/store';
import { useNow } from '../state/clock';
import { formatLongDate } from '../domain/dates';
import { postpartumLabel } from '../domain/stage';
import { t } from '../components/Copy';
import { DevNoticeProvider } from './DevNotice';
import { ToastProvider } from './Toast';
import { ProviderSheetProvider } from './ProviderSheet';
import { BirthDetails, Handoff } from '../features/birth/BirthDetails';
import { SomethingChanged } from '../features/pregnancy/SomethingChanged';
import { beginLog, setMetricsPersonaProvider } from '../metrics/timeToLog';

setMetricsPersonaProvider(() => useWeave.getState().personaId);

/** Device frame (402 x 874, the Figma frame) with the demo panel beside it on desktop (PRD 15). */
function DeviceLayout() {
  const [fab, setFab] = useState(false);
  const { panelOpen } = useWeave((s) => s.demo);
  const setPanelOpen = useWeave((s) => s.setPanelOpen);
  const location = useLocation();
  const labourOpen = useWeave((s) => Boolean(s.domain.her.pregnancy?.labour && !s.domain.her.pregnancy.labour.endedAt));
  useEffect(() => setFab(false), [location.pathname]);

  return (
    <div className="flex min-h-dvh items-start justify-center gap-10 bg-[#e9e5df] sm:py-10">
      <div
        id="device"
        className="relative h-dvh w-full overflow-hidden bg-bg sm:h-[var(--device-h)] sm:w-[var(--device-w)] sm:rounded-[44px] sm:shadow-[0_30px_80px_-20px_rgba(44,37,35,0.35)] sm:ring-8 sm:ring-[#1d1a19]"
      >
        <DevNoticeProvider>
          <ToastProvider>
          <ProviderSheetProvider>
          <StatusBar
            right={
              <button type="button" onClick={() => setPanelOpen(!panelOpen)} className="rounded-pill border border-dashed border-review-line bg-review-bg px-2.5 py-1 font-sans text-[11px] font-semibold text-review-fg lg:hidden" aria-label="Demo controls">
                Demo
              </button>
            }
          />
          <main className={`absolute inset-0 flex flex-col overflow-y-auto overflow-x-hidden px-5 pt-[var(--screen-top)] [scrollbar-width:none] ${labourOpen || location.pathname === '/welcome' ? 'pb-8' : 'pb-[calc(var(--nav-h)+32px)]'}`}>
            <ErrorBoundary>
              <Routes>
                <Route path="/today" element={<Today onFab={() => { beginLog('today.empty'); setFab(true); }} />} />
                <Route path="/me" element={<MePlaceholder />} />
                <Route path="/baby" element={<BabyPlaceholder />} />
                <Route path="/ask" element={<AskPlaceholder />} />
                <Route path="/birth" element={<BirthDetails />} />
                <Route path="/welcome" element={<Handoff />} />
                <Route path="/changed" element={<SomethingChanged />} />
                <Route path="*" element={<Navigate to="/today" replace />} />
              </Routes>
            </ErrorBoundary>
          </main>
          {/* Labour mode strips Weave back to the timer (9.6): no nav, no FAB. */}
          <BottomNav hidden={labourOpen || location.pathname === '/welcome'} onFab={() => { beginLog('fab'); setFab(true); }} />
          <div id="sheet-root" className="pointer-events-none absolute inset-0 z-40 [&>*]:pointer-events-auto" />
          <QuickLogSheet open={fab} onOpenChange={setFab} />
          {panelOpen ? (
            <div className="absolute inset-0 z-[70] overflow-y-auto bg-[#f7f4f0] p-5 pt-14 lg:hidden">
              <button type="button" onClick={() => setPanelOpen(false)} className="absolute top-3 right-4 min-h-[44px] px-3 font-sans text-[13px] font-semibold">
                Close
              </button>
              <DemoPanel />
            </div>
          ) : null}
          </ProviderSheetProvider>
          </ToastProvider>
        </DevNoticeProvider>
      </div>
      <aside className="sticky top-10 hidden max-h-[calc(100dvh-80px)] w-[360px] overflow-y-auto rounded-2xl bg-[#f7f4f0] p-5 shadow-sm lg:block">
        <DemoPanel />
      </aside>
    </div>
  );
}

function Placeholder({ label, title, pill, phase, what }: { label: string; title: string; pill?: string; phase: number; what: string }) {
  return (
    <div className="flex flex-col gap-5">
      <ScreenHeader label={label} pill={pill} title={title} />
      <PhaseNote phase={phase} what={what} />
    </div>
  );
}

function MePlaceholder() {
  const state = useWeave((s) => s.domain);
  const now = useNow();
  const wk = postpartumLabel(state, now);
  return <Placeholder label={S.meHeader.text} pill={wk ? t(S.weekPill, { n: wk }) : undefined} title={state.her.phase === 'postpartum' ? S.meTitlePostpartum.text : S.meHeader.text} phase={1} what="Me tab (S03), Bleeding (B20)" />;
}
function BabyPlaceholder() {
  const state = useWeave((s) => s.domain);
  const child = state.children[0];
  return <Placeholder label={S.navBaby.text} title={child?.name ?? S.navBaby.text} phase={1} what="Baby tab (B08), Formula stock (B39)" />;
}
function AskPlaceholder() {
  const now = useNow();
  return <Placeholder label={formatLongDate(now)} title={S.navAsk.text} phase={4} what="Ask AI (B33), canned state-aware answers" />;
}

export function App() {
  return (
    <Routes>
      <Route path="/gallery/*" element={<Gallery />} />
      <Route path="/*" element={<DeviceLayout />} />
    </Routes>
  );
}
