import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { S } from '../content/strings';
import { TEMPLATES } from '../insights/templates';
import { render as renderInsight } from '../insights/engine';
import { PrimaryButton, SecondaryButton, GhostButton, TextAction } from '../components/Button';
import { SubjectChip, FilterChip, HeaderPill } from '../components/Chip';
import { ScreenHeader, BottomNav, StatusBar, RunningPill } from '../components/Shell';
import { InsightCard, InsightCarousel, type InsightHandlers } from '../components/Insight';
import { SubjectCard, KPIRow, ListCard, ListRow, AddRow, ChecklistRow, ReadingCard, ContextCard, Section } from '../components/Cards';
import { ActivityTimeline } from '../components/Timeline';
import { SheetFrame } from '../components/Sheet';
import { TileGrid, ChoiceTile, SlotPicker, MoodChips, SegmentedProgress, ProgressRing, TimerControls, ContractionDial, BarStrip } from '../components/Controls';
import { EmptyState, ErrorState, Toast, InlineUndo } from '../components/States';
import { ReviewFlag, ReviewTag } from '../components/ReviewFlag';
import { Copy } from '../components/Copy';
import { Icon, ICONS } from '../components/Icon';
import { Today } from '../features/today/Today';
import { quickLogTiles } from '../features/quicklog/QuickLogSheet';
import { DomainOverride } from '../state/store';
import { FrozenNow } from '../state/clock';
import { ANCHOR, buildPersona, type PersonaId } from '../state/personas';
import { contrast } from './contrastUtil';
import { DevNoticeProvider } from '../app/DevNotice';
import type { MoodValue } from '../domain/types';
import { READING } from '../content/reading';

/**
 * Component gallery (PRD 7.5, 16.4 Phase 0). Every component once, in its
 * states, at the Figma frame width (402). The Compare section puts live
 * screens next to Figma renders with an overlay slider for the 2px check.
 */

const noop: InsightHandlers = { onAction: () => {}, onNotNow: () => {}, onAcknowledge: () => {} };
const ins = (key: keyof typeof TEMPLATES, params: Record<string, string | number> = {}, acknowledged = false) => ({
  ...renderInsight({ id: key, template: key, scope: 'her', priority: 1, at: ANCHOR.toISOString(), params, effects: [] }, acknowledged ? { [key]: { acknowledgedAt: ANCHOR.toISOString() } } : {}),
});

function Phone({ children, label, pad = true, height }: { children: ReactNode; label?: string; pad?: boolean; height?: number }) {
  return (
    <figure className="flex flex-col gap-2">
      {label ? <figcaption className="font-sans text-[11px] font-semibold tracking-wide text-[#6b6460] uppercase">{label}</figcaption> : null}
      <div className={`relative w-[402px] overflow-hidden bg-bg ${pad ? 'px-5 py-5' : ''}`} style={height ? { height } : undefined}>
        {children}
      </div>
    </figure>
  );
}

function Block({ id, title, notes, children }: { id: string; title: string; notes?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6 border-t border-[#e0dad3] py-10">
      <h2 className="font-serif text-[24px] text-ink">{title}</h2>
      {notes ? <div className="mt-1 max-w-[760px] font-sans text-[13px] leading-relaxed text-[#5f5854]">{notes}</div> : null}
      <div className="mt-6 flex flex-wrap items-start gap-8">{children}</div>
    </section>
  );
}

const COLOR_TOKENS = ['bg', 'surface', 'surface-muted', 'ink', 'ink-2', 'ink-3', 'ink-4', 'ink-faint', 'line', 'handle', 'sage-100', 'sage-600', 'olive-500', 'hydration', 'coral-a', 'coral-b', 'coral-icon', 'coral-ink', 'coral-dot', 'chip-child-bg', 'chip-child-fg', 'chip-her-bg', 'chip-her-fg', 'terracotta', 'terracotta-ink'];

function Swatch({ name }: { name: string }) {
  const [hex, setHex] = useState('');
  useEffect(() => setHex(getComputedStyle(document.documentElement).getPropertyValue(`--color-${name}`).trim()), [name]);
  const onWhite = hex ? contrast(hex, '#ffffff') : 0;
  const onBg = hex ? contrast(hex, '#faf8f5') : 0;
  return (
    <div className="flex w-[150px] flex-col gap-1.5 font-sans text-[11px]">
      <span className="h-14 rounded-lg ring-1 ring-black/5" style={{ background: `var(--color-${name})` }} />
      <span className="font-semibold text-ink">--color-{name}</span>
      <span className="text-[#5f5854] tabular-nums">
        {hex} · {onWhite.toFixed(2)} on white · {onBg.toFixed(2)} on bg
      </span>
    </div>
  );
}

const TYPE = [
  ['type-greeting', 'Good morning, Saheli', 'Lora 28 · greeting, screen titles'],
  ['type-sheet-title', 'What just happened?', 'Lora 24/1.3 · sheet titles'],
  ['type-insight', 'Three feeds logged since 5am, and no water yet today.', 'Lora 20/1.3 · insight headline'],
  ['type-insight-sm', 'Iron absorbs better with something sour', 'Lora 18/1.3 · reading, compact insight'],
  ['type-card-title', 'Labour mode', 'Lora Medium 20/1.3 · card title'],
  ['type-kpi', '1h 20m', 'Lora 28 · KPI numeral'],
  ['type-hero', '3:04', 'Lora 48/1.4 · labour hero'],
  ['type-name', 'Srinika', 'Lora Bold 14 · subject name'],
  ['type-row', 'Bleeding', 'Inter Medium 15 · list row'],
  ['type-body', 'Nothing to do with this. Just worth knowing.', 'Inter 14/1.4 · body'],
  ['type-secondary', 'Diapers', 'Inter 13 · secondary'],
  ['type-caption', 'average gap', 'Inter 12 · caption'],
  ['type-micro', 'Today so far', 'Inter Bold 11 uppercase · micro label'],
  ['type-chip', 'Srinika', 'Inter Medium 10 · chip'],
] as const;

const COMPARE: { id: string; label: string; persona?: PersonaId; ref: string; note?: string }[] = [
  { id: 'newborn', label: 'S01 Today, newborn (D3)', persona: 'D3', ref: '/figma-ref/today-newborn.png', note: 'Reference is a 0.955x render (rate limit stopped the 1:1 export). Seed data differs on purpose: three feeds since 5am and no water (R01 seed), age from the D3 timeline.' },
  { id: 'toddler', label: 'S02 Today, toddler (D5)', persona: 'D5', ref: '/figma-ref/today-toddler.png', note: 'Meal card and insight arrive in Phases 1 and 3. Card leads with meals (17.1 #5).' },
  { id: 'preg22', label: 'S08 Today, week 22 (D1)', persona: 'D1', ref: '/figma-ref/today-pregnancy-w22.png', note: 'Due date fixed to 31 December (17.1 #3). Insight arrives in Phase 1.' },
  { id: 'preg40', label: 'S09 Today, week 40 (D2)', persona: 'D2', ref: '/figma-ref/today-pregnancy-w40.png' },
  { id: 'me', label: 'S03 Me (Phase 1)', ref: '/figma-ref/me-postpartum.png' },
  { id: 'quicklog', label: 'S04 What just happened?', ref: '/figma-ref/sheet-quicklog.png' },
];

function Compare({ item }: { item: (typeof COMPARE)[number] }) {
  const [mode, setMode] = useState<'side' | 'overlay'>('side');
  const [opacity, setOpacity] = useState(0.5);
  const state = item.persona ? buildPersona(item.persona) : null;
  const live = state ? (
    <DomainOverride.Provider value={state}>
      <FrozenNow.Provider value={ANCHOR}>
        <DevNoticeProvider>
          <div className="relative w-[402px] bg-bg">
            <StatusBar />
            <div className="px-5 pt-[var(--screen-top)] pb-8">
              <Today onFab={() => {}} />
            </div>
          </div>
        </DevNoticeProvider>
      </FrozenNow.Provider>
    </DomainOverride.Provider>
  ) : null;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4 font-sans text-[12px]">
        <strong className="text-[13px]">{item.label}</strong>
        {live ? (
          <>
            <FilterChip selected={mode === 'side'} onClick={() => setMode('side')} className="!min-h-[32px] !px-3 !text-[12px]">Side by side</FilterChip>
            <FilterChip selected={mode === 'overlay'} onClick={() => setMode('overlay')} className="!min-h-[32px] !px-3 !text-[12px]">Overlay</FilterChip>
            {mode === 'overlay' ? (
              <label className="flex items-center gap-2">
                Figma opacity <input type="range" min={0} max={1} step={0.05} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} />
              </label>
            ) : null}
          </>
        ) : null}
      </div>
      {item.note ? <p className="max-w-[820px] font-sans text-[12px] text-[#5f5854]">{item.note}</p> : null}
      {mode === 'side' || !live ? (
        <div className="flex flex-wrap items-start gap-8">
          {live ? <figure className="flex flex-col gap-2"><figcaption className="font-sans text-[11px] font-semibold uppercase text-[#6b6460]">Build</figcaption><div className="ring-1 ring-black/10">{live}</div></figure> : null}
          <figure className="flex flex-col gap-2">
            <figcaption className="font-sans text-[11px] font-semibold uppercase text-[#6b6460]">Figma</figcaption>
            <img src={item.ref} alt={`Figma reference: ${item.label}`} className="w-[402px] ring-1 ring-black/10" />
          </figure>
        </div>
      ) : (
        <div className="relative w-[402px] ring-1 ring-black/10">
          {live}
          <img src={item.ref} alt="" className="pointer-events-none absolute top-0 left-0 w-[402px]" style={{ opacity }} />
        </div>
      )}
    </div>
  );
}

const NAV = [
  ['tokens', 'Tokens'],
  ['type', 'Type'],
  ['icons', 'Icons'],
  ['shell', 'AppShell, BottomNav, FAB'],
  ['header', 'ScreenHeader'],
  ['insight', 'InsightCard, Carousel'],
  ['subject', 'SubjectCard, KPIRow'],
  ['list', 'ListCard, ListRow'],
  ['timeline', 'ActivityTimeline'],
  ['chips', 'Chip'],
  ['sheet', 'BottomSheet'],
  ['tiles', 'TileGrid'],
  ['mood', 'MoodChips'],
  ['progress', 'SegmentedProgress, ProgressRing'],
  ['timer', 'TimerControls'],
  ['dial', 'ContractionDial, BarStrip'],
  ['checklist', 'ChecklistRow'],
  ['reading', 'ReadingCard, ContextCard'],
  ['buttons', 'Buttons, TextAction'],
  ['states', 'EmptyState, Error, Toast/Undo'],
  ['review', 'Review marker'],
  ['compare', 'Compare with Figma'],
] as const;

export function Gallery() {
  const [mood, setMood] = useState<MoodValue | undefined>('ok');
  const [water, setWater] = useState(3);
  const [undoVisible, setUndoVisible] = useState(true);
  const [toast, setToast] = useState(true);
  const [secs, setSecs] = useState(16);
  useEffect(() => {
    const id = window.setInterval(() => setSecs((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, []);
  const d3 = buildPersona('D3');
  const tiles = quickLogTiles(d3, ANCHOR, () => {});
  const nowMs = ANCHOR.getTime();
  const bars = [52, 47, 40, 34, 28, 22, 16].map((m, i) => ({ start: nowMs - m * 60_000, end: nowMs - m * 60_000 + (30 + i * 4) * 1000 }));

  return (
    <div className="min-h-dvh bg-[#f3f0ec] text-ink">
      <div className="mx-auto flex max-w-[1400px] gap-10 px-8">
        <nav className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col gap-1 overflow-y-auto py-8 font-sans text-[13px] lg:flex">
          <Link to="/today" className="mb-4 font-semibold underline">Back to the app</Link>
          {NAV.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="rounded px-2 py-1 text-[#4b4542] hover:bg-white">
              {label}
            </a>
          ))}
        </nav>
        <main className="min-w-0 flex-1 py-8">
          <h1 className="font-serif text-[36px]">Weave component gallery</h1>
          <p className="mt-2 max-w-[760px] font-sans text-[14px] leading-relaxed text-[#5f5854]">
            Phase 0. Every component from PRD 7.5, built once, shown at the Figma frame width of 402px. Tokens come from the Figma file (no Variables exist, so values were
            read from frames). Drift was consolidated and text colours raised to WCAG AA; each change is listed in <code>docs/FIGMA-DEVIATIONS.md</code>. Dashed amber marks are
            dev-only review markers.
          </p>

          <Block id="tokens" title="Colour tokens" notes="Contrast ratios are computed live. Text pairs are tested in src/design/contrast.test.ts and fail the build below 4.5:1 (3:1 for icons).">
            {COLOR_TOKENS.map((n) => (
              <Swatch key={n} name={n} />
            ))}
          </Block>

          <Block id="type" title="Type scale" notes="Lora and Inter, self-hosted. Figma also used Newsreader and Figtree on the Me frame; consolidated to Lora and Inter.">
            <div className="flex flex-col gap-4">
              {TYPE.map(([cls, sample, note]) => (
                <div key={cls} className="flex items-baseline gap-6">
                  <span className="w-[300px] shrink-0 font-sans text-[11px] text-[#6b6460]">
                    <code>{cls}</code> · {note}
                  </span>
                  <span className={`${cls} text-ink`}>{sample}</span>
                </div>
              ))}
            </div>
          </Block>

          <Block id="icons" title="Icons" notes="Exported from Figma, tinted through a CSS mask. The dashed tile is a placeholder: Water, Bleeding, Medicine, Symptom, Weight, Note and Formula opened have no icon in Figma yet.">
            {(Object.keys(ICONS) as (keyof typeof ICONS)[]).map((k) => (
              <span key={k} className="flex w-20 flex-col items-center gap-2 font-sans text-[10px] text-[#6b6460]">
                <Icon name={k} size={32} color="var(--color-ink)" />
                {k}
              </span>
            ))}
            <span className="flex w-20 flex-col items-center gap-2 font-sans text-[10px] text-[#6b6460]">
              <Icon name="missing" size={32} />
              missing
            </span>
          </Block>

          <Block id="shell" title="AppShell, BottomNav, FAB, running pill" notes="Active tab label uses coral-ink (4.5:1) and the icon coral-icon (3:1); Figma used #E37D80 for both. The FAB keeps the Figma gradient; its white glyph is below 3:1 and is listed as an open item.">
            <Phone pad={false} height={200} label="Bottom of a screen with a running timer">
              <RunningPill label="Sleeping, 0:42" onClick={() => {}} />
              <BottomNav onFab={() => {}} />
            </Phone>
            <Phone pad={false} height={60} label="Status bar (shows the demo clock)">
              <StatusBar />
            </Phone>
          </Block>

          <Block id="header" title="ScreenHeader">
            <Phone label="Today, with child age pill">
              <ScreenHeader label="Thursday 27 August" pill="Srinika’s Age: 5m 5d" title="Good morning, Saheli" />
            </Phone>
            <Phone label="Me, with week pill and settings">
              <ScreenHeader label="Me" pill="Week 7" title="Recovering, steadily" onSettings={() => {}} />
            </Phone>
            <Phone label="Pregnancy, with subtitle">
              <ScreenHeader label="Thursday 27 August" title="Week 22" subtitle="Due 31 December. Eighteen weeks to go." />
            </Phone>
          </Block>

          <Block id="insight" title="InsightCard, InsightCarousel" notes="Sage is reserved for AI observations. Escalation style (terracotta bar, provider action, no Not now) is a design addition from PRD 7.1, marked for review. Acknowledged escalations collapse to a provider row.">
            <Phone label="Info, with action and body (R01)">
              <InsightCard insight={ins('R01', { Count: 'Three', time: '5am' })} {...noop} />
            </Phone>
            <Phone label="Info, no action (R05)">
              <InsightCard insight={ins('R05')} {...noop} />
            </Phone>
            <Phone label="Formula tin, three actions (R16)">
              <InsightCard insight={ins('R16', { opened: '18 July', discardBy: '1 September', DaysLeft: 'Five' })} {...noop} />
            </Phone>
            <Phone label="Escalation (R14)">
              <InsightCard insight={ins('R14')} {...noop} />
            </Phone>
            <Phone label="Escalation, acknowledged">
              <InsightCard insight={{ ...ins('R14', {}, true), topic: 'heavy bleeding' }} {...noop} />
            </Phone>
            <Phone label="Carousel, three cards">
              <InsightCarousel insights={[ins('R01', { Count: 'Three', time: '5am' }), ins('R05'), ins('R10', { done: 'Two', target: 'five' })]} {...noop} />
            </Phone>
          </Block>

          <Block id="subject" title="SubjectCard, KPIRow" notes="KPI rows are 44px tall for the tap target (Figma 32px).">
            <Phone label="Child and Me, side by side">
              <div className="flex gap-3">
                <SubjectCard
                  name="Srinika"
                  avatar="/avatars/child.png"
                  kpi={{ value: '1h 20m', caption: 'since last feed · left', onAdd: () => {}, addLabel: 'Log a feed' }}
                  rows={
                    <>
                      <KPIRow label="Diapers" value="4" onAdd={() => {}} addLabel="Log a diaper" />
                      <KPIRow label="Slept" value="2h 10m" />
                    </>
                  }
                />
                <SubjectCard
                  name="Me"
                  avatar="/avatars/her.png"
                  kpi={{ value: '1 of 8', caption: 'glasses today', onAdd: () => {}, addLabel: S.addGlassA11y.text }}
                  rows={
                    <>
                      <KPIRow label="Bleeding" value="Light" onAdd={() => {}} addLabel="Log bleeding" />
                      <KPIRow label="Mood" value="Add" muted onAdd={() => {}} addLabel="Log mood" />
                    </>
                  }
                />
              </div>
            </Phone>
            <Phone label="Period active">
              <div className="flex w-[178px]">
                <SubjectCard
                  name="Me"
                  avatar="/avatars/her.png"
                  kpi={{ value: '1 of 8', caption: 'glasses today', onAdd: () => {} }}
                  rows={
                    <>
                      <KPIRow label="Period" value="Day 3" onAdd={() => {}} />
                      <KPIRow label="Flow" value="Medium" />
                    </>
                  }
                />
              </div>
            </Phone>
          </Block>

          <Block id="list" title="ListCard, ListRow">
            <Phone label="Body list with dots (Me)">
              <Section label={S.body.text}>
                <ListCard>
                  <ListRow size="lg" dot="coral" label="Bleeding" value="Spotting, 3 days" onClick={() => {}} />
                  <ListRow size="lg" dot="grey" label="Pelvic floor" value="4 of 5 this week" onClick={() => {}} />
                  <ListRow size="lg" dot="grey" label="Pain" value="None logged" onClick={() => {}} />
                </ListCard>
              </Section>
            </Phone>
            <Phone label="Value and chevron rows, add footer">
              <ListCard>
                <ListRow label="Appointment with Dr. Mahua" sublabel="Monday 14 September, 10:00" value="Edit" onClick={() => {}} />
                <ListRow label="Glucose test" sublabel="Week 26, not booked" value="Book" onClick={() => {}} />
                <ListRow label="Formula stock" value="1 open" chevron onClick={() => {}} />
                <AddRow label={S.addSomethingYouTake.text} onClick={() => {}} />
              </ListCard>
            </Phone>
          </Block>

          <Block id="timeline" title="ActivityTimeline">
            <Phone label="Populated">
              <Section label={S.todaySoFar.text} right={<span className="type-micro normal-case font-semibold text-ink-3">All</span>}>
                <ActivityTimeline
                  items={[
                    { id: '1', subject: { kind: 'child', label: 'Srinika' }, text: 'Feed · left · 10 m', time: '10:15 AM' },
                    { id: '2', subject: { kind: 'child', label: 'Srinika' }, text: 'Diaper · wet', time: '9:40 AM' },
                    { id: '3', subject: { kind: 'her', label: 'Me' }, text: 'Bleeding · light', time: '9:34 AM' },
                    { id: '4', subject: { kind: 'child', label: 'Srinika' }, text: 'Woke · 5h 10m slept', time: '6:45 AM' },
                  ]}
                />
              </Section>
            </Phone>
            <Phone label="Empty">
              <Section label={S.todaySoFar.text}>
                <ActivityTimeline items={[]} empty={<EmptyState line={S.nothingLoggedYet.text} action={S.nothingLoggedAction.text} onAction={() => {}} />} />
              </Section>
            </Phone>
          </Block>

          <Block id="chips" title="Chip">
            <Phone label="Subject, filter, header pill">
              <div className="flex flex-col gap-4">
                <div className="flex gap-3">
                  <SubjectChip kind="child" label="Srinika" />
                  <SubjectChip kind="her" label="Me" />
                </div>
                <div className="flex gap-2">
                  <FilterChip selected>All</FilterChip>
                  <FilterChip selected={false}>Srinika</FilterChip>
                  <FilterChip selected={false}>Me</FilterChip>
                </div>
                <div className="flex gap-2">
                  <HeaderPill>Week 7</HeaderPill>
                  <HeaderPill>Srinika’s Age: 1y 2m 20d</HeaderPill>
                </div>
              </div>
            </Phone>
          </Block>

          <Block id="sheet" title="BottomSheet" notes="Shown as static frames. Live sheets (Vaul) open from the FAB in the app: drag to dismiss, X to close, Save where there is form content, one prompt on unsaved changes.">
            <Phone pad={false} label="Quick log (S04), D3 tiles with time since last">
              <div className="pt-6">
                <SheetFrame title={S.quickLogTitle.text}>
                  <TileGrid tiles={tiles} />
                </SheetFrame>
              </div>
            </Phone>
            <Phone pad={false} label="Feed type chooser (S05)">
              <div className="pt-6">
                <SheetFrame title={S.feedSheetTitle.text} subtitle={'Last was left, 1h 20m ago.'}>
                  <div className="grid grid-cols-2 gap-x-2.5 gap-y-5">
                    <ChoiceTile icon="breastfeed" label={S.breastfeed.text} onClick={() => {}} highlighted />
                    <ChoiceTile icon="bottle" label={S.bottleFeed.text} onClick={() => {}} />
                    <ChoiceTile icon="solids" label={S.solids.text} onClick={() => {}} />
                    <ChoiceTile icon="combo" label={S.comboFeed.text} onClick={() => {}} />
                  </div>
                </SheetFrame>
              </div>
            </Phone>
            <Phone pad={false} label="Solids (S06), with Save">
              <div className="pt-6">
                <SheetFrame title={S.solids.text} onSave>
                  <SlotPicker
                    value="lunch"
                    onChange={() => {}}
                    options={[
                      { value: 'breakfast', label: S.breakfast.text, icon: 'breakfast' },
                      { value: 'lunch', label: S.lunch.text, icon: 'lunch' },
                      { value: 'snack', label: S.snack.text, icon: 'snack' },
                      { value: 'dinner', label: S.dinner.text, icon: 'dinner' },
                    ]}
                  />
                  <ListCard className="mt-2.5 !px-4">
                    <ListRow size="lg" label={S.startTime.text} value="Today 5:05pm" />
                    <ListRow size="lg" label="Food" value="Add" chevron />
                    <ListRow size="lg" label={S.notes.text} />
                  </ListCard>
                </SheetFrame>
              </div>
            </Phone>
          </Block>

          <Block id="tiles" title="TileGrid">
            <Phone label="Pregnancy tiles (D1)">
              <TileGrid tiles={quickLogTiles(buildPersona('D1'), ANCHOR, () => {})} />
            </Phone>
          </Block>

          <Block id="mood" title="MoodChips" notes="Single select. The Figma Me tile draws 22px chips; built at 44px to meet the tap target.">
            <Phone label="Sheet size">
              <MoodChips value={mood} onChange={setMood} />
            </Phone>
            <Phone label="Tile size">
              <div className="w-[160px]">
                <MoodChips value={mood} onChange={setMood} size="tile" />
              </div>
            </Phone>
          </Block>

          <Block id="progress" title="SegmentedProgress, ProgressRing">
            <Phone label="Hydration, eight segments (tap to add)">
              <button type="button" onClick={() => setWater((w) => (w >= 8 ? 0 : w + 1))} className="w-[160px]">
                <SegmentedProgress value={water} label={`${water} of 8 glasses`} />
              </button>
            </Phone>
            <Phone label="Week ring">
              <div className="flex flex-col items-center gap-2 rounded-list border border-ink/8 bg-surface p-6 shadow-card">
                <ProgressRing value={3 / 6} label="Week 3 of recovery">
                  <span className="type-insight text-ink">Wk 3</span>
                </ProgressRing>
                <h3 className="type-insight mt-2 text-ink">Week 3 Postpartum</h3>
                <Copy as="p" entry={S.weekSupportLine} className="text-center font-serif text-[14px] text-ink-2 italic" />
              </div>
            </Phone>
          </Block>

          <Block id="timer" title="TimerControls">
            <Phone label="Breastfeed (S07): left running, right was last">
              <TimerControls left={{ side: 'left', minutes: 4, running: true }} right={{ side: 'right', minutes: 0, running: false }} lastSide="right" onToggle={() => {}} onEdit={() => {}} />
            </Phone>
          </Block>

          <Block id="dial" title="ContractionDial, BarStrip">
            <Phone label="Dial (S11), live">
              <div className="flex flex-col items-center gap-10">
                <ContractionDial seconds={secs % 90} />
              </div>
            </Phone>
            <Phone label="Bar strip, last hour (S10)">
              <div className="rounded-card bg-surface p-5">
                <BarStrip bars={bars} now={nowMs} startLabel={S.anHourAgo.text} endLabel={S.now.text} label="Seven contractions in the last hour" />
              </div>
            </Phone>
          </Block>

          <Block id="checklist" title="ChecklistRow" notes="Signs and medicines. Labour signs carry clinical-review markers.">
            <Phone label="Medicines today">
              <ListCard>
                <ChecklistRow checked label="Cipcal XT" sublabel="1 tab after Breakfast" value="10:45am" onToggle={() => {}} />
                <ChecklistRow checked={false} label="Cipcal XT" sublabel="1 tab after Dinner" value="--:--" onToggle={() => {}} />
              </ListCard>
            </Phone>
            <Phone label="Three signs (S10)">
              <Section label={`1 of 3 signs`} review={S.signsCount.review}>
                <ListCard radius="list">
                  <ChecklistRow dense checked label={S.signApart.text} value="4m 16s" />
                  <ChecklistRow dense checked={false} label={S.signLasting.text} value="39s" />
                  <ChecklistRow dense checked={false} label={S.signHolding.text} value="44m" />
                </ListCard>
              </Section>
            </Phone>
          </Block>

          <Block id="reading" title="ReadingCard, ContextCard">
            <Phone label="Reading (week 22)">
              <ReadingCard category={READING[0]!.category} headline={READING[0]!.headline.text} body={READING[0]!.body.text} review={READING[0]!.review} />
            </Phone>
            <Phone label="Meal card, new-food prompt">
              <div className="flex flex-col gap-5">
                <ContextCard tag="Today's lunch" title="Rice + chicken stew" body="Ingredients already introduced safely" actions={<GhostButton>View recipe</GhostButton>} />
                <ContextCard titleStyle="prompt" title="Curd introduced today." body="No reaction yet" actions={<><GhostButton>Log a reaction</GhostButton><TextAction>Not now</TextAction></>} />
              </div>
            </Phone>
            <Phone label="Labour mode, Around now">
              <div className="flex flex-col gap-5">
                <ContextCard titleStyle="card" title={S.labourCardTitle.text} body={S.labourCardBody.text} actions={<PrimaryButton size="lg">{S.labourCardAction.text}</PrimaryButton>} />
                <ContextCard
                  titleStyle="question"
                  title={S.periodCardTitle.text}
                  body={<span className="type-body text-ink-2">{S.periodCardBody.text}</span>}
                  review={S.periodCardBody.review}
                  actions={<><PrimaryButton tone="sage" className="w-[175px]">{S.periodCardYes.text}</PrimaryButton><TextAction className="w-[137px]">{S.periodCardNo.text}</TextAction></>}
                />
              </div>
            </Phone>
          </Block>

          <Block id="buttons" title="Buttons, TextAction" notes="Every button keeps a 44px hit area; visual sizes follow Figma (37px pills use an invisible extension).">
            <Phone label="All variants">
              <div className="flex flex-col items-start gap-4">
                <div className="flex gap-4">
                  <PrimaryButton tone="sage">Log a glass</PrimaryButton>
                  <PrimaryButton tone="ink">Call your provider</PrimaryButton>
                  <TextAction>Not now</TextAction>
                </div>
                <PrimaryButton size="lg" hint={S.contractionHint.text}>{S.contraction.text}</PrimaryButton>
                <PrimaryButton size="lg" tone="sage" hint={S.easingHint.text}>{S.easing.text}</PrimaryButton>
                <SecondaryButton size="lg">{S.babyIsHere.text}</SecondaryButton>
                <div className="flex gap-4">
                  <SecondaryButton>{S.startLeft.text}</SecondaryButton>
                  <GhostButton>View recipe</GhostButton>
                </div>
                <PrimaryButton size="lg" tone="sage">Save birth</PrimaryButton>
                <TextAction className="self-center">{S.skipForNow.text}</TextAction>
                <PrimaryButton disabled>Disabled</PrimaryButton>
              </div>
            </Phone>
          </Block>

          <Block id="states" title="EmptyState, ErrorState, Toast, InlineUndo">
            <Phone label="Empty">
              <EmptyState line="No open tins. Log one when you open a new tin." action="Opened a new tin" onAction={() => {}} />
            </Phone>
            <Phone label="Error">
              <ErrorState onRetry={() => {}} />
            </Phone>
            <Phone label="Inline undo (4 s) and toast">
              <div className="flex flex-col gap-6">
                <div className="flex items-center gap-3">
                  <span className="type-kpi">2 of 8</span>
                  <InlineUndo visible={undoVisible} onUndo={() => setUndoVisible(false)} />
                  {!undoVisible ? <TextAction onClick={() => setUndoVisible(true)}>Show again</TextAction> : null}
                </div>
                {toast ? <Toast message="Diaper logged for Srinika" onUndo={() => setToast(false)} onDone={() => {}} /> : <TextAction onClick={() => setToast(true)}>Show toast</TextAction>}
              </div>
            </Phone>
          </Block>

          <Block id="review" title="Review marker (dev only)" notes="Applied automatically from the strings file and content config. The demo panel can hide markers for screenshots.">
            <Phone label="Inline tag and block outline">
              <div className="flex flex-col gap-5">
                <div className="flex flex-wrap gap-2">
                  <ReviewTag review={{ kind: 'clinical', ref: '9.6' }} />
                  <ReviewTag review={{ kind: 'lactation', ref: '11.4' }} />
                  <ReviewTag review={{ kind: 'product', ref: '9.15' }} />
                  <ReviewTag review={{ kind: 'design', ref: '7.1' }} />
                </div>
                <ReviewFlag review={{ kind: 'clinical', ref: '9.9' }}>
                  <InsightCard insight={ins('ESC_reaction')} {...noop} />
                </ReviewFlag>
              </div>
            </Phone>
          </Block>

          <Block id="compare" title="Compare with Figma" notes="Live screens rendered from seed personas at the anchor time, next to the Figma frames. Use Overlay to check spacing (target: within 2px). Differences that come from agreed decisions are noted per frame.">
            <div className="flex w-full flex-col gap-14">
              {COMPARE.map((c) => (
                <Compare key={c.id} item={c} />
              ))}
            </div>
          </Block>
        </main>
      </div>
    </div>
  );
}

