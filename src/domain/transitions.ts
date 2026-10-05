import { formulaDiscardBy, toISODate } from './dates';
import type {
  Appointment,
  BirthRecord,
  Child,
  DomainState,
  FormulaPack,
  FormulaStatus,
  HerProfile,
  ISODate,
  ISODateTime,
  LogEntry,
  LogPayload,
  Medicine,
  Subject,
} from './types';

/**
 * State machine, PRD 6.2. Every transition is a pure function
 * (state, input, now) -> state, so the store, the demo controls and the tests
 * all go through the same rules. Combination rules (6.3) are enforced by
 * `checkInvariants`.
 */

let counter = 0;
export const uid = (prefix: string): string =>
  `${prefix}_${Date.now().toString(36)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const iso = (d: Date): ISODateTime => d.toISOString();

export class TransitionError extends Error {}

const DEFAULT_HER: Omit<HerProfile, 'name' | 'phase'> = {
  cycle: { active: false },
  hydrationGoalGlasses: 8,
  units: { volume: 'ml', weight: 'kg' },
};

export function emptyState(name: string, phase: HerProfile['phase']): DomainState {
  return {
    her: { ...DEFAULT_HER, name, phase },
    children: [],
    births: [],
    logs: [],
    medicines: [],
    formulaPacks: [],
    foodIntros: [],
    appointments: [],
    history: [],
    timers: {},
    insightMemory: {},
    prompts: {},
  };
}

// ---------- Onboarding: she picks her situation ----------

export type Situation =
  | { kind: 'pregnant'; dueDate: ISODate }
  | { kind: 'have_baby'; child: { name: string; dob: ISODate; feeding: Child['feeding'] } }
  | { kind: 'tracking_cycle'; lastPeriodStart?: ISODate }
  | { kind: 'pregnant_with_child'; dueDate: ISODate; child: { name: string; dob: ISODate; feeding: Child['feeding'] } };

export function onboard(name: string, situation: Situation, now: Date): DomainState {
  switch (situation.kind) {
    case 'pregnant':
      return { ...emptyState(name, 'pregnancy'), her: { ...emptyState(name, 'pregnancy').her, pregnancy: { dueDate: situation.dueDate } } };
    case 'have_baby': {
      const base = emptyState(name, 'postpartum');
      const child: Child = { id: uid('child'), ...situation.child };
      const birth: BirthRecord = { id: uid('birth'), childId: child.id, datetime: iso(new Date(`${child.dob}T00:00:00`)) };
      return {
        ...base,
        children: [child],
        births: [birth],
        her: { ...base.her, postpartum: { birthId: birth.id, startedAt: iso(now) } },
      };
    }
    case 'tracking_cycle': {
      const base = emptyState(name, 'cycle_tracking');
      const start = situation.lastPeriodStart;
      return { ...base, her: { ...base.her, cycle: { active: true, lastPeriodStart: start, periodDays: start ? [start] : [] } } };
    }
    case 'pregnant_with_child': {
      const s = onboard(name, { kind: 'have_baby', child: situation.child }, now);
      return { ...s, her: { ...s.her, phase: 'pregnancy', postpartum: undefined, pregnancy: { dueDate: situation.dueDate } } };
    }
  }
}

// ---------- Logging ----------

export function addLog(state: DomainState, subject: Subject, payload: LogPayload, at: Date, source: LogEntry['source'], extra?: Partial<Pick<LogEntry, 'note' | 'groupId' | 'id'>>): { state: DomainState; entry: LogEntry } {
  if (subject.kind === 'child' && !state.children.some((c) => c.id === subject.childId)) {
    throw new TransitionError(`Unknown child ${subject.childId}`);
  }
  const entry = { id: extra?.id ?? uid('log'), subject, at: iso(at), source, note: extra?.note, groupId: extra?.groupId, ...payload } as LogEntry;
  // 6.3: heavy bleeding is never interpreted as a period. Logging never touches cycle state.
  return { state: { ...state, logs: [...state.logs, entry] }, entry };
}

export function removeLog(state: DomainState, id: string): DomainState {
  return { ...state, logs: state.logs.filter((l) => l.id !== id) };
}

// ---------- Labour (9.6) ----------

function requirePregnancy(state: DomainState) {
  if (state.her.phase !== 'pregnancy' || !state.her.pregnancy) throw new TransitionError('Not pregnant');
  return state.her.pregnancy;
}

export function startLabour(state: DomainState, now: Date): DomainState {
  const p = requirePregnancy(state);
  if (p.labour && !p.labour.endedAt) return state; // already open
  return { ...state, her: { ...state.her, pregnancy: { ...p, labour: { startedAt: iso(now), contractions: [] } } } };
}

export function exitLabour(state: DomainState, now: Date): DomainState {
  const p = requirePregnancy(state);
  if (!p.labour) return state;
  return { ...state, her: { ...state.her, pregnancy: { ...p, labour: { ...p.labour, endedAt: iso(now) } } } };
}

function openLabour(state: DomainState) {
  const p = requirePregnancy(state);
  if (!p.labour || p.labour.endedAt) throw new TransitionError('Labour mode is not running');
  return { p, labour: p.labour };
}

export function startContraction(state: DomainState, now: Date): DomainState {
  const { p, labour } = openLabour(state);
  const last = labour.contractions[labour.contractions.length - 1];
  if (last && !last.end) return state; // one at a time
  return { ...state, her: { ...state.her, pregnancy: { ...p, labour: { ...labour, contractions: [...labour.contractions, { start: iso(now) }] } } } };
}

export function endContraction(state: DomainState, now: Date): DomainState {
  const { p, labour } = openLabour(state);
  const last = labour.contractions[labour.contractions.length - 1];
  if (!last || last.end) return state;
  const contractions = [...labour.contractions.slice(0, -1), { ...last, end: iso(now) }];
  return { ...state, her: { ...state.her, pregnancy: { ...p, labour: { ...labour, contractions } } } };
}

// ---------- Birth and the handoff (9.7) ----------

export interface BirthInput {
  name?: string;
  datetime?: ISODateTime;
  place?: string;
  weightG?: number;
}

/** Time from the last thing logged in labour mode, else now (9.7). */
export function birthTimeDefault(state: DomainState, now: Date): ISODateTime {
  const c = state.her.pregnancy?.labour?.contractions ?? [];
  const last = c[c.length - 1];
  return last ? (last.end ?? last.start) : iso(now);
}

export function saveBirth(state: DomainState, input: BirthInput, now: Date, opts: { skipped?: boolean } = {}): { state: DomainState; childId: string; birthId: string } {
  const p = requirePregnancy(state);
  const datetime = input.datetime ?? birthTimeDefault(state, now);
  const childId = uid('child');
  const birthId = uid('birth');
  const name = input.name?.trim() || `B/O ${state.her.name}`;
  const child: Child = { id: childId, name, dob: toISODate(new Date(datetime)), feeding: [] };
  const birth: BirthRecord = { id: birthId, childId, name, datetime, place: input.place, weightG: input.weightG };

  // Pregnancy content archives to Me, History. Weight logs stay with her (they are her logs already).
  const pregnancyMeds = state.medicines.filter((m) => m.subject.kind === 'her' && !m.archived);
  const archived = {
    dueDate: p.dueDate,
    endedAt: iso(now),
    outcome: 'birth' as const,
    birthId,
    appointments: state.appointments,
    medicineIds: pregnancyMeds.map((m) => m.id),
    labour: p.labour ? { ...p.labour, endedAt: p.labour.endedAt ?? iso(now) } : undefined,
  };

  let logs = state.logs;
  if (input.weightG) {
    // Birth weight becomes the first point on the child's growth chart.
    logs = [...logs, { id: uid('log'), subject: { kind: 'child', childId }, at: datetime, source: 'derived', type: 'growth', weightG: input.weightG }];
  }

  const next: DomainState = {
    ...state,
    her: {
      ...state.her,
      phase: 'postpartum',
      pregnancy: undefined,
      postpartum: { birthId, startedAt: iso(now) },
      cycle: { ...state.her.cycle, active: false },
    },
    children: [...state.children, child],
    births: [...state.births, birth],
    logs,
    medicines: state.medicines.map((m) => (pregnancyMeds.includes(m) ? { ...m, archived: true } : m)),
    appointments: [],
    history: [...state.history, archived],
    prompts: { ...state.prompts, finishBirthDetails: opts.skipped ? { birthId } : undefined },
  };
  return { state: next, childId, birthId };
}

export function updateBirth(state: DomainState, birthId: string, input: BirthInput): DomainState {
  const births = state.births.map((b) => (b.id === birthId ? { ...b, ...input, name: input.name?.trim() || b.name } : b));
  const birth = births.find((b) => b.id === birthId);
  const children = birth
    ? state.children.map((c) => (c.id === birth.childId ? { ...c, name: birth.name ?? c.name, dob: birth.datetime.slice(0, 10) } : c))
    : state.children;
  const complete = birth && birth.place && birth.weightG;
  return {
    ...state,
    births,
    children,
    prompts: { ...state.prompts, finishBirthDetails: complete ? undefined : state.prompts.finishBirthDetails },
  };
}

// ---------- "Something has changed with my pregnancy" (9.10) ----------

/** Pregnancy ended without a birth. No automatic phase change happens until she chooses this. Needs review (9.10). */
export function endPregnancy(state: DomainState, now: Date, keepData: boolean): DomainState {
  const p = requirePregnancy(state);
  const history = keepData
    ? [...state.history, { dueDate: p.dueDate, endedAt: iso(now), outcome: 'ended' as const, appointments: state.appointments, medicineIds: [], labour: undefined }]
    : state.history;
  return {
    ...state,
    her: { ...state.her, phase: state.children.length ? 'postpartum' : 'cycle_tracking', pregnancy: undefined },
    appointments: [],
    history,
  };
}

// ---------- Cycle return (9.8) ----------

export const PERIOD_CARD_SNOOZE_DAYS = 14;

/** Period return is only ever set by her explicit answer (6.3). */
export function confirmPeriodReturn(state: DomainState, startDate: ISODate, now: Date): DomainState {
  const at = new Date(`${startDate}T09:00:00`);
  const withLog = addLog(state, { kind: 'her' }, { type: 'period', flow: 'medium', event: 'start' }, at > now ? now : at, 'sheet').state;
  return {
    ...withLog,
    her: { ...withLog.her, cycle: { active: true, lastPeriodStart: startDate, periodDays: [...(state.her.cycle.periodDays ?? []), startDate] } },
    prompts: { ...withLog.prompts, periodCardSnoozedUntil: undefined },
  };
}

export function snoozePeriodCard(state: DomainState, now: Date): DomainState {
  const until = new Date(now.getTime() + PERIOD_CARD_SNOOZE_DAYS * 864e5);
  return { ...state, prompts: { ...state.prompts, periodCardSnoozedUntil: iso(until) } };
}

// ---------- Pregnant again (6.2) ----------

export function pregnantAgain(state: DomainState, dueDate: ISODate): DomainState {
  if (state.her.phase === 'pregnancy') throw new TransitionError('Already pregnant');
  return {
    ...state,
    her: {
      ...state.her,
      phase: 'pregnancy',
      pregnancy: { dueDate },
      postpartum: undefined,
      // Cycle tracking pauses; history (lastPeriodStart, periodDays) is kept.
      cycle: { ...state.her.cycle, active: false },
    },
  };
}

// ---------- Children (6.2, 6.3) ----------

export function addChild(state: DomainState, child: Omit<Child, 'id'>): { state: DomainState; childId: string } {
  const id = uid('child');
  return { state: { ...state, children: [...state.children, { ...child, id }] }, childId: id };
}

// ---------- Formula tins (9.15) ----------

export const DEFAULT_USE_WITHIN_DAYS = 45;

export function openFormulaPack(
  state: DomainState,
  input: { childId: string; openedOn: ISODate; useWithinDays?: number; brand?: string; stage?: string; sizeText?: string; note?: string },
): { state: DomainState; pack: FormulaPack } {
  const useWithinDays = input.useWithinDays ?? DEFAULT_USE_WITHIN_DAYS;
  const pack: FormulaPack = {
    id: uid('tin'),
    childId: input.childId,
    brand: input.brand,
    stage: input.stage,
    sizeText: input.sizeText,
    note: input.note,
    openedOn: input.openedOn,
    useWithinDays,
    discardBy: formulaDiscardBy(input.openedOn, useWithinDays),
    status: 'active',
  };
  return { state: { ...state, formulaPacks: [...state.formulaPacks, pack] }, pack };
}

export function editFormulaPack(state: DomainState, id: string, edit: { openedOn?: ISODate; useWithinDays?: number; brand?: string }): DomainState {
  return {
    ...state,
    formulaPacks: state.formulaPacks.map((p) => {
      if (p.id !== id) return p;
      const next = { ...p, ...edit };
      return { ...next, discardBy: formulaDiscardBy(next.openedOn, next.useWithinDays) };
    }),
  };
}

export function closeFormulaPack(state: DomainState, id: string, status: Exclude<FormulaStatus, 'active'>, now: Date): DomainState {
  return {
    ...state,
    formulaPacks: state.formulaPacks.map((p) => (p.id === id ? { ...p, status, closedOn: toISODate(now) } : p)),
  };
}

// ---------- Medicines (9.5, 9.11, B29) ----------

export type MedicineInput = Pick<Medicine, 'name' | 'doseText' | 'schedule'> & { startedOn?: ISODate };

function validateMedicine(m: MedicineInput) {
  if (!m.name.trim()) throw new TransitionError('A medicine needs a name');
  const n = 'times' in m.schedule ? m.schedule.times.length : m.schedule.anchors.length;
  if (!n) throw new TransitionError('A medicine needs at least one time');
}

/** Weave never suggests doses (9.11): doseText is whatever she typed. */
export function addMedicine(state: DomainState, subject: Subject, input: MedicineInput): { state: DomainState; id: string } {
  validateMedicine(input);
  const id = uid('med');
  const med: Medicine = { id, subject, name: input.name.trim(), doseText: input.doseText.trim(), schedule: input.schedule, startedOn: input.startedOn };
  return { state: { ...state, medicines: [...state.medicines, med] }, id };
}

export function updateMedicine(state: DomainState, id: string, input: MedicineInput): DomainState {
  validateMedicine(input);
  return { ...state, medicines: state.medicines.map((m) => (m.id === id ? { ...m, name: input.name.trim(), doseText: input.doseText.trim(), schedule: input.schedule } : m)) };
}

/** "Stop taking this": the medicine leaves Today; past doses stay in history. */
export function stopMedicine(state: DomainState, id: string): DomainState {
  return { ...state, medicines: state.medicines.map((m) => (m.id === id ? { ...m, archived: true } : m)) };
}

// ---------- Appointments ----------

export type AppointmentInput = { title: string; at: ISODateTime; milestoneId?: string };

export function addAppointment(state: DomainState, a: AppointmentInput): { state: DomainState; id: string } {
  if (!a.title.trim()) throw new TransitionError('An appointment needs a title');
  const id = uid('appt');
  const appt: Appointment = { id, title: a.title.trim(), at: a.at, source: 'user', milestoneId: a.milestoneId };
  return { state: { ...state, appointments: [...state.appointments, appt] }, id };
}

export function updateAppointment(state: DomainState, id: string, a: Omit<AppointmentInput, 'milestoneId'>): DomainState {
  if (!a.title.trim()) throw new TransitionError('An appointment needs a title');
  return { ...state, appointments: state.appointments.map((x) => (x.id === id ? { ...x, title: a.title.trim(), at: a.at } : x)) };
}

export function removeAppointment(state: DomainState, id: string): DomainState {
  return { ...state, appointments: state.appointments.filter((x) => x.id !== id) };
}

// ---------- This week checklist (9.5) ----------

export function setChecklist(state: DomainState, patch: Partial<NonNullable<NonNullable<HerProfile['pregnancy']>['checklist']>>): DomainState {
  const p = requirePregnancy(state);
  const current = p.checklist ?? { birthPlanShared: false, hospitalBag: 'not_started' as const };
  return { ...state, her: { ...state.her, pregnancy: { ...p, checklist: { ...current, ...patch } } } };
}

// ---------- Invariants: the combination rules in 6.3 plus referential integrity ----------

export function checkInvariants(state: DomainState): string[] {
  const errors: string[] = [];
  const { her } = state;
  if (her.phase === 'pregnancy' && !her.pregnancy) errors.push('phase is pregnancy but no pregnancy record');
  if (her.phase !== 'pregnancy' && her.pregnancy) errors.push('pregnancy record outside pregnancy phase');
  if (her.postpartum && her.phase !== 'postpartum') errors.push('postpartum record outside postpartum phase');
  if (her.postpartum && !state.births.some((b) => b.id === her.postpartum!.birthId)) errors.push('postpartum points at a missing birth');
  if (her.phase === 'pregnancy' && her.cycle.active) errors.push('cycle tracking must pause during pregnancy');
  const childIds = new Set(state.children.map((c) => c.id));
  for (const b of state.births) if (!childIds.has(b.childId)) errors.push(`birth ${b.id} points at a missing child`);
  for (const l of state.logs) if (l.subject.kind === 'child' && !childIds.has(l.subject.childId)) errors.push(`log ${l.id} points at a missing child`);
  for (const m of state.medicines) if (m.subject.kind === 'child' && !childIds.has(m.subject.childId)) errors.push(`medicine ${m.id} points at a missing child`);
  for (const p of state.formulaPacks) {
    if (!childIds.has(p.childId)) errors.push(`tin ${p.id} points at a missing child`);
    if (p.discardBy !== formulaDiscardBy(p.openedOn, p.useWithinDays)) errors.push(`tin ${p.id} discardBy is stale`);
    if (p.status !== 'active' && !p.closedOn) errors.push(`tin ${p.id} closed without a date`);
  }
  for (const f of state.foodIntros) if (!childIds.has(f.childId)) errors.push(`food intro ${f.foodId} points at a missing child`);
  return errors;
}
