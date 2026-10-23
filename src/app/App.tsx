import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { BottomNav, StatusBar } from '../components/Shell';
import { ErrorBoundary } from '../components/States';
import { DemoPanel } from '../demo/DemoPanel';
import { Today } from '../features/today/Today';
import { QuickLogSheet } from '../features/quicklog/QuickLogSheet';
import { Gallery } from '../design/Gallery';
import { useWeave } from '../state/store';
import { DevNoticeProvider } from './DevNotice';
import { ToastProvider } from './Toast';
import { ProviderSheetProvider } from './ProviderSheet';
import { ExplainProvider } from '../insights/ExplainProvider';
import { AskScreen } from '../features/ask/Ask';
import { HistoryScreen, SettingsScreen, SharingProvider } from '../features/settings/Settings';
import { Onboarding } from '../features/onboarding/Onboarding';
import { FeedFlowProvider } from '../features/feeds/FeedSheets';
import { SleepFlowProvider } from '../features/sleep/SleepSheet';
import { ActivePills } from '../features/timers/ActivePills';
import { BirthDetails, Handoff } from '../features/birth/BirthDetails';
import { SomethingChanged } from '../features/pregnancy/SomethingChanged';
import { TimelineScreen } from '../features/timeline/Timeline';
import { FormulaFlowProvider, FormulaStock } from '../features/formula/Formula';
import { BabyTab, CoursesScreen, GrowthScreen, ModuleHistory, VaccinesScreen } from '../features/baby/Baby';
import { CycleScreen } from '../features/cycle/Cycle';
import { FoodDetail, FoodJourney, ReactionFlow, RecipeScreen, SolidsFlowProvider } from '../features/food/Food';
import { BleedingScreen, HerMedicinesScreen, HerSleepScreen, HydrationScreen, MeScreen, MoodScreen, PainScreen, PelvicScreen } from '../features/me/Me';
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
          <SharingProvider>
          <ExplainProvider>
          <FormulaFlowProvider>
          <SolidsFlowProvider>
          <FeedFlowProvider>
          <SleepFlowProvider>
          <StatusBar
            right={
              <button type="button" onClick={() => setPanelOpen(!panelOpen)} className="rounded-pill border border-dashed border-review-line bg-review-bg px-2.5 py-1 font-sans text-[11px] font-semibold text-review-fg lg:hidden" aria-label="Demo controls">
                Demo
              </button>
            }
          />
          <main className={`absolute inset-0 flex flex-col overflow-y-auto overflow-x-hidden px-5 pt-[var(--screen-top)] [scrollbar-width:none] ${labourOpen || location.pathname === '/welcome' || location.pathname === '/onboarding' ? 'pb-8' : 'pb-[calc(var(--nav-h)+32px)]'}`}>
            <ErrorBoundary>
              <Routes>
                <Route path="/today" element={<Today onFab={() => { beginLog('today.empty'); setFab(true); }} />} />
                <Route path="/me" element={<MeScreen />} />
                <Route path="/me/hydration" element={<HydrationScreen />} />
                <Route path="/me/mood" element={<MoodScreen />} />
                <Route path="/me/bleeding" element={<BleedingScreen />} />
                <Route path="/me/pelvic" element={<PelvicScreen />} />
                <Route path="/me/pain" element={<PainScreen />} />
                <Route path="/me/sleep" element={<HerSleepScreen />} />
                <Route path="/me/medicines" element={<HerMedicinesScreen />} />
                <Route path="/me/cycle" element={<CycleScreen />} />
                <Route path="/baby" element={<BabyTab />} />
                <Route path="/baby/feeding" element={<ModuleHistory kind="feeding" />} />
                <Route path="/baby/meals" element={<ModuleHistory kind="meals" />} />
                <Route path="/baby/sleep" element={<ModuleHistory kind="sleep" />} />
                <Route path="/baby/diaper" element={<ModuleHistory kind="diaper" />} />
                <Route path="/baby/growth" element={<GrowthScreen />} />
                <Route path="/baby/vaccines" element={<VaccinesScreen />} />
                <Route path="/baby/medicines" element={<CoursesScreen />} />
                <Route path="/baby/food" element={<FoodJourney />} />
                <Route path="/baby/food/:foodId" element={<FoodDetail />} />
                <Route path="/food/recipe/:id" element={<RecipeScreen />} />
                <Route path="/food/reaction/:foodId?" element={<ReactionFlow />} />
                <Route path="/ask" element={<AskScreen />} />
                <Route path="/settings" element={<SettingsScreen />} />
                <Route path="/me/history" element={<HistoryScreen />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/birth" element={<BirthDetails />} />
                <Route path="/welcome" element={<Handoff />} />
                <Route path="/changed" element={<SomethingChanged />} />
                <Route path="/timeline" element={<TimelineScreen />} />
                <Route path="/baby/formula" element={<FormulaStock />} />
                <Route path="*" element={<Navigate to="/today" replace />} />
              </Routes>
            </ErrorBoundary>
          </main>
          {/* Labour mode strips Weave back to the timer (9.6): no nav, no FAB. */}
          <BottomNav hidden={labourOpen || location.pathname === '/welcome' || location.pathname === '/onboarding'} onFab={() => { beginLog('fab'); setFab(true); }} />
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
          <ActivePills hidden={labourOpen || location.pathname === '/welcome' || location.pathname === '/onboarding'} />
          </SleepFlowProvider>
          </FeedFlowProvider>
          </SolidsFlowProvider>
          </FormulaFlowProvider>
          </ExplainProvider>
          </SharingProvider>
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

export function App() {
  return (
    <Routes>
      <Route path="/gallery/*" element={<Gallery />} />
      <Route path="/*" element={<DeviceLayout />} />
    </Routes>
  );
}
