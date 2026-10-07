import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { S } from '../../content/strings';
import { fmt } from '../../content/copy';
import { Copy } from '../../components/Copy';
import { ListCard, ListRow, Section } from '../../components/Cards';
import { FilterChip } from '../../components/Chip';
import { NumberStepper } from '../../components/Stepper';
import { Field, fieldCls } from '../../components/Form';
import { PrimaryButton, SecondaryButton, TextAction } from '../../components/Button';
import { BottomSheet } from '../../components/Sheet';
import { EmptyState } from '../../components/States';
import { DEFAULT_SETTINGS, updateSettings } from '../../domain/transitions';
import { formatDayMonth, formatDuration, formatLongDate, parseDate } from '../../domain/dates';
import { labourStats } from '../../domain/labour';
import { deleteEverything, exportEverything, useDomain, useWeave } from '../../state/store';
import { useToast } from '../../app/Toast';

/** Settings (B35): units, goals, notifications mock, observation frequency, people, data. */

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
}

function BackHeader({ title }: { title: string }) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col gap-5">
      <button type="button" onClick={() => navigate(-1)} className="hit-44 self-start type-micro text-ink-3">
        ‹ {S.back.text}
      </button>
      <h1 className="type-greeting text-ink">{title}</h1>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <li>
      <label className="flex min-h-[52px] items-center justify-between gap-3">
        <span className="type-row text-ink">{label}</span>
        <input type="checkbox" role="switch" aria-checked={checked} className="size-6 accent-[var(--color-ink)]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      </label>
    </li>
  );
}

export function SettingsScreen() {
  const state = useDomain();
  const apply = useWeave((s) => s.apply);
  const setPanelOpen = useWeave((s) => s.setPanelOpen);
  const navigate = useNavigate();
  const toast = useToast();
  const { openSharing } = useSharing();
  const settings = { ...DEFAULT_SETTINGS, ...state.settings };
  const [providerName, setProviderName] = useState(state.her.provider?.name ?? '');
  const [providerPhone, setProviderPhone] = useState(state.her.provider?.phone ?? '');
  const [partner, setPartner] = useState(state.her.partnerName ?? '');
  const [confirm, setConfirm] = useState(false);
  const set = (patch: Parameters<typeof updateSettings>[1]) => apply((s) => updateSettings(s, patch));

  return (
    <div className="flex flex-col gap-6" data-screen="settings">
      <BackHeader title={S.settingsTitle.text} />

      <Section label={S.settingsUnits.text}>
        <div className="flex flex-col gap-3 rounded-card bg-surface p-5">
          <div className="flex items-center justify-between gap-3">
            <span className="type-row text-ink">{S.settingsVolume.text}</span>
            <div role="radiogroup" aria-label={S.settingsVolume.text} className="flex gap-2">
              {(['ml', 'oz'] as const).map((u) => (
                <FilterChip key={u} role="radio" aria-checked={state.her.units.volume === u} selected={state.her.units.volume === u} onClick={() => set({ units: { volume: u } })}>
                  {u}
                </FilterChip>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="type-row text-ink">{S.settingsWeight.text}</span>
            <div role="radiogroup" aria-label={S.settingsWeight.text} className="flex gap-2">
              {(['kg', 'lb'] as const).map((u) => (
                <FilterChip key={u} role="radio" aria-checked={state.her.units.weight === u} selected={state.her.units.weight === u} onClick={() => set({ units: { weight: u } })}>
                  {u}
                </FilterChip>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section label={S.settingsHydrationGoal.text}>
        <NumberStepper value={state.her.hydrationGoalGlasses} onChange={(n) => set({ hydrationGoalGlasses: n })} step={1} min={4} max={16} format={(n) => fmt(S.settingsGlasses, { n })} label={S.settingsHydrationGoal.text} />
      </Section>

      <Section label={S.settingsInsights.text}>
        <div className="flex flex-col gap-2">
          <div role="radiogroup" aria-label={S.settingsInsights.text} className="flex gap-2">
            {(['standard', 'fewer'] as const).map((f) => (
              <FilterChip key={f} role="radio" aria-checked={settings.insightFrequency === f} selected={settings.insightFrequency === f} onClick={() => set({ settings: { insightFrequency: f } })}>
                {f === 'fewer' ? S.settingsFewer.text : S.settingsStandard.text}
              </FilterChip>
            ))}
          </div>
          <p className="font-sans text-[12px] text-ink-2">{S.settingsInsightsHint.text}</p>
        </div>
      </Section>

      <Section label={S.settingsNotifications.text}>
        <ListCard>
          <Toggle label={S.settingsNotifyDoses.text} checked={settings.notifications.doses} onChange={(v) => set({ settings: { notifications: { ...settings.notifications, doses: v } } })} />
          <Toggle label={S.settingsNotifyTins.text} checked={settings.notifications.tins} onChange={(v) => set({ settings: { notifications: { ...settings.notifications, tins: v } } })} />
          <Toggle label={S.settingsNotifyInsights.text} checked={settings.notifications.insights} onChange={(v) => set({ settings: { notifications: { ...settings.notifications, insights: v } } })} />
        </ListCard>
        <p className="font-sans text-[12px] text-ink-2">{S.settingsNotificationsMock.text}</p>
      </Section>

      <Section label={S.settingsPeople.text}>
        <div className="flex flex-col gap-4 rounded-card bg-surface p-5">
          <Field label={S.settingsProviderName.text}>
            <input className={fieldCls} value={providerName} onChange={(e) => setProviderName(e.target.value)} />
          </Field>
          <Field label={S.settingsProviderPhone.text}>
            <input type="tel" className={fieldCls} value={providerPhone} onChange={(e) => setProviderPhone(e.target.value)} />
          </Field>
          <Field label={S.settingsPartner.text}>
            <input className={fieldCls} value={partner} onChange={(e) => setPartner(e.target.value)} />
          </Field>
          <PrimaryButton
            tone="ink"
            onClick={() => {
              set({ provider: providerName.trim() ? { name: providerName.trim(), phone: providerPhone.trim() || undefined } : undefined, partnerName: partner });
              toast(S.toastSettingsSaved.text);
            }}
          >
            {S.save.text}
          </PrimaryButton>
          <ListCard className="!px-0">
            <ListRow size="lg" label={S.settingsSharing.text} chevron onClick={openSharing} />
          </ListCard>
        </div>
      </Section>

      <Section label={S.settingsData.text}>
        <div className="flex flex-col gap-3 rounded-card bg-surface p-5">
          <p className="font-sans text-[13px] text-ink-2">{S.settingsDataNote.text}</p>
          <SecondaryButton onClick={() => download('weave-export.json', exportEverything())}>{S.settingsExport.text}</SecondaryButton>
          {confirm ? <p role="alert" className="font-sans text-[13px] font-medium text-terracotta-ink">{S.settingsDeleteConfirm.text}</p> : null}
          <TextAction className="self-start !px-0 text-terracotta-ink" onClick={() => (confirm ? deleteEverything() : setConfirm(true))}>
            {S.settingsDelete.text}
          </TextAction>
        </div>
      </Section>

      <Section label={S.settingsDemo.text}>
        <ListCard>
          <ListRow size="lg" label={S.settingsOpenDemo.text} chevron onClick={() => setPanelOpen(true)} />
          <ListRow size="lg" label={S.settingsOnboarding.text} chevron onClick={() => navigate('/onboarding')} />
        </ListCard>
      </Section>
    </div>
  );
}

/* ------------------------------------------------- B34: sharing, UI only */

const SharingCtx = createContext<{ openSharing: () => void }>({ openSharing: () => {} });
export const useSharing = () => useContext(SharingCtx);

export function SharingProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openSharing = useCallback(() => setOpen(true), []);
  return (
    <SharingCtx.Provider value={{ openSharing }}>
      {children}
      {open ? <SharingSheet onClose={() => setOpen(false)} /> : null}
    </SharingCtx.Provider>
  );
}

function SharingSheet({ onClose }: { onClose: () => void }) {
  const state = useDomain();
  const apply = useWeave((s) => s.apply);
  const sharing = { ...DEFAULT_SETTINGS.sharing, ...state.settings?.sharing };
  const set = (k: keyof typeof sharing, v: boolean) => apply((s) => updateSettings(s, { settings: { sharing: { ...sharing, [k]: v } } }));
  const name = state.her.partnerName;
  return (
    <BottomSheet open onOpenChange={(o) => !o && onClose()} title={name ? fmt(S.shareTitle, { name }) : S.shareTitleNoName.text}>
      <div className="flex flex-col gap-4 pb-2">
        <h3 className="type-micro text-ink-3">{S.shareWhat.text}</h3>
        <ListCard className="!px-0">
          <Toggle label={S.shareFeeds.text} checked={sharing.feeds} onChange={(v) => set('feeds', v)} />
          <Toggle label={S.shareAppointments.text} checked={sharing.appointments} onChange={(v) => set('appointments', v)} />
          <Toggle label={S.shareMe.text} checked={sharing.me} onChange={(v) => set('me', v)} />
        </ListCard>
        <p className="font-sans text-[12px] text-ink-2">{S.shareMeHint.text}</p>
        <PrimaryButton size="lg" tone="ink" disabled>
          {S.shareInvite.text}
        </PrimaryButton>
        <Copy as="p" entry={S.shareMock} className="font-sans text-[12px] text-ink-2" />
      </div>
    </BottomSheet>
  );
}

/* ------------------------------------------------------------- B36 */

export function HistoryScreen() {
  const state = useDomain();
  const items = [...state.history].reverse();
  return (
    <div className="flex flex-col gap-6" data-screen="history">
      <BackHeader title={S.historyTitle.text} />
      {!items.length ? <EmptyState line={S.historyEmpty.text} /> : null}
      {items.map((h) => {
        const birth = h.birthId ? state.births.find((b) => b.id === h.birthId) : undefined;
        const child = birth ? state.children.find((c) => c.id === birth.childId) : undefined;
        const meds = state.medicines.filter((m) => h.medicineIds.includes(m.id));
        const contractions = h.labour?.contractions ?? [];
        const st = contractions.length ? labourStats(contractions, new Date(h.labour?.endedAt ?? h.endedAt)) : undefined;
        const weights = state.logs.filter((l) => l.type === 'weight' && parseDate(l.at) <= parseDate(h.endedAt)).sort((a, b) => (a.at < b.at ? -1 : 1));
        return (
          <section key={h.endedAt} aria-label={fmt(S.historyPregnancy, { date: formatDayMonth(h.dueDate) })} className="flex flex-col gap-3 rounded-card bg-surface p-5">
            <h2 className="type-insight-sm text-ink">{fmt(S.historyPregnancy, { date: formatDayMonth(h.dueDate) })}</h2>
            <p className="font-sans text-[13px] text-ink-2">
              {h.outcome === 'birth' && child && birth ? fmt(S.historyBorn, { name: child.name, date: formatLongDate(birth.datetime) }) : fmt(S.historyEnded, { date: formatLongDate(h.endedAt) })}
            </p>
            {h.appointments.length ? (
              <ListCard className="!px-0">
                {h.appointments.map((a) => (
                  <ListRow key={a.id} label={a.title} value={a.at ? formatDayMonth(a.at) : ''} />
                ))}
              </ListCard>
            ) : null}
            {meds.length ? <p className="font-sans text-[13px] text-ink">{S.historyMedicines.text}: {meds.map((m) => m.name).join(', ')}</p> : null}
            {st && h.labour ? (
              <p className="font-sans text-[13px] text-ink">
                {S.historyLabour.text}: {fmt(S.historyLabourLine, { n: st.count, duration: formatDuration((new Date(h.labour.endedAt ?? h.endedAt).getTime() - new Date(h.labour.startedAt).getTime()) / 60_000) })}
              </p>
            ) : null}
            {weights.length ? (
              <p className="font-sans text-[13px] text-ink">
                {S.historyWeights.text}: {weights.map((w) => (w.type === 'weight' ? `${w.kg} kg (${formatDayMonth(w.at)})` : '')).join(', ')}
              </p>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
