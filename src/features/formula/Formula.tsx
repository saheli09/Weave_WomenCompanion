import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomSheet } from '../../components/Sheet';
import { PrimaryButton, SecondaryButton, TextAction, GhostButton } from '../../components/Button';
import { Field, fieldCls } from '../../components/Form';
import { Section } from '../../components/Cards';
import { EmptyState } from '../../components/States';
import { Copy } from '../../components/Copy';
import { S } from '../../content/strings';
import { fmt } from '../../content/copy';
import { calendarDaysBetween, formatDayMonth, formulaDaysLeft, toISODate } from '../../domain/dates';
import { closeFormulaPack, DEFAULT_USE_WITHIN_DAYS, editFormulaPack, openFormulaPack } from '../../domain/transitions';
import type { FormulaPack } from '../../domain/types';
import { primaryChild } from '../../domain/stage';
import { useDomain, useWeave } from '../../state/store';
import { now as clockNow, useNow } from '../../state/clock';
import { commitLog } from '../../metrics/timeToLog';
import { useToast } from '../../app/Toast';

/**
 * Formula tins (B38, B39, 9.15).
 *  - FAB "Formula opened": one tap logs a tin opened today with the last tin's
 *    settings (2 taps from Today), then asks once about an earlier open tin.
 *  - Formula stock: full sheet (opened on, brand, stage, use-within), the list
 *    soonest-discard first, Finished / Discard / Edit, and history.
 * Weave never estimates what is left in a tin (9.15 non-goals).
 */

interface FormulaFlow {
  quickOpen: (childId: string, entry: string) => void;
  openSheet: (childId: string, editing?: FormulaPack) => void;
  closeTin: (id: string, status: 'finished' | 'discarded') => void;
}
const Ctx = createContext<FormulaFlow>({ quickOpen: () => {}, openSheet: () => {}, closeTin: () => {} });
export const useFormulaFlow = () => useContext(Ctx);

const lastTin = (packs: FormulaPack[], childId: string) => [...packs].filter((p) => p.childId === childId).sort((a, b) => (a.openedOn < b.openedOn ? 1 : -1))[0];

export function FormulaFlowProvider({ children }: { children: ReactNode }) {
  const apply = useWeave((s) => s.apply);
  const toast = useToast();
  const [sheet, setSheet] = useState<{ childId: string; editing?: FormulaPack } | null>(null);
  const [earlier, setEarlier] = useState<FormulaPack[] | null>(null);

  const closeTin = useCallback(
    (id: string, status: 'finished' | 'discarded') => {
      apply((s, at) => closeFormulaPack(s, id, status, at));
      toast(fmt(S.toastTinClosed, { status }), () => apply((s) => ({ ...s, formulaPacks: s.formulaPacks.map((p) => (p.id === id ? { ...p, status: 'active', closedOn: undefined } : p)) })));
    },
    [apply, toast],
  );

  const afterOpen = (newId: string) => {
    const others = useWeave.getState().domain.formulaPacks.filter((p) => p.status === 'active' && p.id !== newId);
    if (others.length) setEarlier(others);
  };

  const quickOpen = useCallback(
    (childId: string, entry: string) => {
      const state = useWeave.getState().domain;
      const prev = lastTin(state.formulaPacks, childId);
      let pack: FormulaPack | undefined;
      apply((s, at) => {
        const r = openFormulaPack(s, { childId, openedOn: toISODate(at), useWithinDays: prev?.useWithinDays, brand: prev?.brand, stage: prev?.stage, sizeText: prev?.sizeText });
        pack = r.pack;
        return r.state;
      });
      commitLog('formula_opened', entry);
      if (!pack) return;
      const id = pack.id;
      toast(fmt(S.toastTinOpened, { date: formatDayMonth(pack.discardBy) }), () => apply((s) => ({ ...s, formulaPacks: s.formulaPacks.filter((p) => p.id !== id) })));
      afterOpen(id);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apply, toast],
  );

  const openSheet = useCallback((childId: string, editing?: FormulaPack) => setSheet({ childId, editing }), []);

  return (
    <Ctx.Provider value={{ quickOpen, openSheet, closeTin }}>
      {children}
      <TinSheet target={sheet} onClose={() => setSheet(null)} onOpened={afterOpen} />
      <BottomSheet open={Boolean(earlier)} onOpenChange={(o) => !o && setEarlier(null)} title={S.formulaEarlierTitle.text}>
        <div className="flex flex-col gap-3 pb-2">
          {earlier?.map((p) => (
            <div key={p.id} className="flex flex-col gap-3">
              <p className="type-body text-ink-2">{fmt(S.formulaEarlierBody, { date: formatDayMonth(p.openedOn) })}</p>
              <div className="flex gap-2">
                <SecondaryButton className="flex-1" onClick={() => (closeTin(p.id, 'finished'), setEarlier((xs) => (xs && xs.length > 1 ? xs.filter((x) => x.id !== p.id) : null)))}>
                  {S.formulaFinished.text}
                </SecondaryButton>
                <SecondaryButton className="flex-1" onClick={() => (closeTin(p.id, 'discarded'), setEarlier((xs) => (xs && xs.length > 1 ? xs.filter((x) => x.id !== p.id) : null)))}>
                  {S.formulaDiscarded.text}
                </SecondaryButton>
              </div>
            </div>
          ))}
          <TextAction className="self-start !px-0" onClick={() => setEarlier(null)}>
            {S.formulaKeepBoth.text}
          </TextAction>
        </div>
      </BottomSheet>
    </Ctx.Provider>
  );
}

/** B38 full sheet: opened on (changeable), brand, stage or size, use-within days. Also edits a tin. */
function TinSheet({ target, onClose, onOpened }: { target: { childId: string; editing?: FormulaPack } | null; onClose: () => void; onOpened: (id: string) => void }) {
  const state = useDomain();
  const apply = useWeave((s) => s.apply);
  const toast = useToast();
  const [openedOn, setOpenedOn] = useState('');
  const [brand, setBrand] = useState('');
  const [stage, setStage] = useState('');
  const [days, setDays] = useState(String(DEFAULT_USE_WITHIN_DAYS));
  useEffect(() => {
    if (!target) return;
    const base = target.editing ?? lastTin(state.formulaPacks, target.childId);
    setOpenedOn(target.editing?.openedOn ?? toISODate(clockNow()));
    setBrand(base?.brand ?? '');
    setStage(base?.stage ?? base?.sizeText ?? '');
    setDays(String(base?.useWithinDays ?? DEFAULT_USE_WITHIN_DAYS));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  const n = Number(days);
  const daysBad = !Number.isInteger(n) || n < 1 || n > 120;
  const futureDate = openedOn > toISODate(clockNow());
  const discardBy = !daysBad && openedOn ? formatDayMonth(new Date(new Date(`${openedOn}T00:00:00`).getTime() + n * 864e5)) : '';

  const save = () => {
    if (!target || daysBad || futureDate || !openedOn) return;
    if (target.editing) {
      const id = target.editing.id;
      apply((s) => editFormulaPack(s, id, { openedOn, useWithinDays: n, brand: brand.trim() || undefined }));
      toast(fmt(S.formulaDiscardBy, { date: discardBy }));
    } else {
      let id = '';
      apply((s) => {
        const r = openFormulaPack(s, { childId: target.childId, openedOn, useWithinDays: n, brand: brand.trim() || undefined, stage: stage.trim() || undefined });
        id = r.pack.id;
        return r.state;
      });
      commitLog('formula_opened');
      toast(fmt(S.formulaDiscardBy, { date: discardBy }));
      onClose();
      onOpened(id);
      return;
    }
    onClose();
  };

  return (
    <BottomSheet open={Boolean(target)} onOpenChange={(o) => !o && onClose()} title={target?.editing ? S.formulaEdit.text : S.formulaOpenTitle.text} onSave={save} saveDisabled={daysBad || futureDate}>
      <form className="flex flex-col gap-5 pb-2" onSubmit={(e) => (e.preventDefault(), save())}>
        <Field label={S.formulaOpenedOn.text}>
          <input type="date" className={fieldCls} value={openedOn} max={toISODate(clockNow())} onChange={(e) => setOpenedOn(e.target.value)} />
        </Field>
        <Field label={S.formulaBrand.text}>
          <input className={fieldCls} value={brand} placeholder={S.formulaBrandPlaceholder.text} onChange={(e) => setBrand(e.target.value)} />
        </Field>
        {!target?.editing ? (
          <Field label={S.formulaStage.text}>
            <input className={fieldCls} value={stage} placeholder={S.formulaStagePlaceholder.text} onChange={(e) => setStage(e.target.value)} />
          </Field>
        ) : null}
        <Field label={S.formulaUseWithin.text} hint={<Copy entry={S.formulaUseWithinHint} />} error={daysBad ? S.formulaUseWithinError.text : undefined}>
          <input inputMode="numeric" className={fieldCls} value={days} onChange={(e) => setDays(e.target.value)} aria-invalid={daysBad} />
        </Field>
        {discardBy ? <p className="type-insight-sm text-ink">{fmt(S.formulaDiscardBy, { date: discardBy })}</p> : null}
        {!target?.editing && target ? (
          <PrimaryButton size="lg" onClick={save} disabled={daysBad || futureDate}>
            {openedOn === toISODate(clockNow()) ? S.formulaOpenedToday.text : S.save.text}
          </PrimaryButton>
        ) : null}
      </form>
    </BottomSheet>
  );
}

/** Formula stock (B39): neutral list, not an AI observation (no sage). */
export function FormulaStock() {
  const state = useDomain();
  const now = useNow();
  const navigate = useNavigate();
  const { openSheet, closeTin } = useFormulaFlow();
  const child = primaryChild(state);
  const active = state.formulaPacks.filter((p) => p.status === 'active').sort((a, b) => (a.discardBy < b.discardBy ? -1 : 1));
  const history = state.formulaPacks.filter((p) => p.status !== 'active').sort((a, b) => ((a.closedOn ?? '') < (b.closedOn ?? '') ? 1 : -1));

  const leftLabel = (p: FormulaPack) => {
    const left = formulaDaysLeft(p.discardBy, now);
    if (left < 0) return S.formulaPastDue.text;
    if (left === 0) return S.formulaDueToday.text;
    if (left === 1) return S.formulaOneDayLeft.text;
    return fmt(S.formulaDaysLeft, { n: left });
  };

  return (
    <div className="flex flex-col gap-6" data-screen="formula-stock">
      <div className="flex flex-col gap-5">
        <button type="button" onClick={() => navigate(-1)} className="hit-44 self-start type-micro text-ink-3">
          ‹ {S.back.text}
        </button>
        <h1 className="type-greeting text-ink">{S.formulaStockTitle.text}</h1>
      </div>
      {active.length ? (
        <ul className="flex flex-col gap-3">
          {active.map((p) => {
            const used = Math.max(0, Math.min(p.useWithinDays, calendarDaysBetween(p.openedOn, now)));
            const late = formulaDaysLeft(p.discardBy, now) < 0;
            return (
              <li key={p.id} className="flex flex-col gap-3 rounded-card bg-surface p-5" aria-label={`${p.brand ?? S.formulaGenericName.text}, ${leftLabel(p)}`}>
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="type-insight-sm text-ink">{p.brand ?? S.formulaGenericName.text}</h2>
                  <span className={`font-sans text-[13px] font-semibold ${late ? 'text-terracotta-ink' : 'text-ink'}`}>{leftLabel(p)}</span>
                </div>
                <p className="font-sans text-[13px] text-ink-2">
                  {fmt(S.formulaOpenedLine, { date: formatDayMonth(p.openedOn) })}
                  {p.stage ? ` · ${p.stage}` : ''} · {fmt(S.formulaDiscardBy, { date: formatDayMonth(p.discardBy) })}
                </p>
                <div role="progressbar" aria-valuemin={0} aria-valuemax={p.useWithinDays} aria-valuenow={used} aria-label={fmt(S.formulaProgressA11y, { used, total: p.useWithinDays })} className="h-1 w-full overflow-hidden rounded-pill bg-line">
                  <span className="block h-full bg-ink-3" style={{ width: `${(used / p.useWithinDays) * 100}%` }} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <GhostButton onClick={() => closeTin(p.id, 'finished')}>{S.formulaFinished.text}</GhostButton>
                  <GhostButton onClick={() => closeTin(p.id, 'discarded')}>{S.formulaDiscard.text}</GhostButton>
                  <TextAction onClick={() => openSheet(p.childId, p)}>{S.formulaEdit.text}</TextAction>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState line={S.formulaEmpty.text} action={S.formulaOpenNew.text} onAction={() => child && openSheet(child.id)} />
      )}
      {active.length && child ? (
        <SecondaryButton size="lg" onClick={() => openSheet(child.id)}>
          {S.formulaOpenNew.text}
        </SecondaryButton>
      ) : null}
      {history.length ? (
        <Section label={S.formulaHistory.text}>
          <ul className="flex flex-col rounded-list bg-surface px-4 [&>li+li]:border-t [&>li+li]:border-line">
            {history.map((p) => (
              <li key={p.id} className="flex min-h-[48px] items-center justify-between gap-3 py-3">
                <span className="flex flex-col">
                  <span className="font-sans text-[13px] font-semibold text-ink">{p.brand ?? S.formulaGenericName.text}</span>
                  <span className="font-sans text-[11px] text-ink-2">{fmt(S.formulaOpenedLine, { date: formatDayMonth(p.openedOn) })}</span>
                </span>
                <span className="font-sans text-[13px] text-ink-2">{fmt(S.formulaHistoryRow, { status: p.status === 'finished' ? 'Finished' : 'Discarded', date: formatDayMonth(p.closedOn!) })}</span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </div>
  );
}
