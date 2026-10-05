import {
  addLog,
  checkInvariants,
  closeFormulaPack,
  confirmPeriodReturn,
  editFormulaPack,
  endContraction,
  endPregnancy,
  onboard,
  openFormulaPack,
  pregnantAgain,
  saveBirth,
  snoozePeriodCard,
  startContraction,
  startLabour,
  TransitionError,
  addChild,
  addMedicine,
  updateMedicine,
  stopMedicine,
  addAppointment,
  updateAppointment,
  removeAppointment,
  setChecklist,
} from './transitions';
import { deriveTodayState, postpartumLabel, currentPeriodDay } from './stage';

const now = new Date('2026-08-27T10:30:00');
const later = (mins: number) => new Date(now.getTime() + mins * 60_000);
const pregnant = () => onboard('Saheli', { kind: 'pregnant', dueDate: '2026-08-25' }, now);

describe('6.2 transitions', () => {
  it('onboarding seeds each phase with valid state', () => {
    expect(checkInvariants(pregnant())).toEqual([]);
    const baby = onboard('Saheli', { kind: 'have_baby', child: { name: 'Srinika', dob: '2026-08-12', feeding: ['breast'] } }, now);
    expect(baby.her.phase).toBe('postpartum');
    expect(checkInvariants(baby)).toEqual([]);
    const cycle = onboard('Saheli', { kind: 'tracking_cycle', lastPeriodStart: '2026-08-20' }, now);
    expect(cycle.her.cycle.active).toBe(true);
    const both = onboard('Saheli', { kind: 'pregnant_with_child', dueDate: '2027-01-14', child: { name: 'Srinika', dob: '2025-06-07', feeding: ['solids'] } }, now);
    expect(both.her.phase).toBe('pregnancy');
    expect(both.children).toHaveLength(1);
    expect(checkInvariants(both)).toEqual([]);
  });

  it('labour mode opens a session and times contractions one at a time', () => {
    let s = startLabour(pregnant(), now);
    expect(deriveTodayState(s, now)).toBe('labour');
    s = startContraction(s, later(1));
    s = startContraction(s, later(1.2)); // ignored: one already running
    s = endContraction(s, later(2));
    const c = s.her.pregnancy!.labour!.contractions;
    expect(c).toHaveLength(1);
    expect(c[0]!.end).toBeDefined();
  });

  it('contractions cannot be logged outside labour mode', () => {
    expect(() => startContraction(pregnant(), now)).toThrow(TransitionError);
  });

  it('Save birth creates child and birth record, moves her to postpartum and archives pregnancy', () => {
    let s = startLabour(pregnant(), now);
    s = startContraction(s, later(10));
    s = endContraction(s, later(11));
    s = { ...s, medicines: [{ id: 'm1', subject: { kind: 'her' }, name: 'Cipcal XT', doseText: '1 tab', schedule: { anchors: ['breakfast'] } }], appointments: [{ id: 'a1', title: 'Appointment', source: 'user' }] };
    const r = saveBirth(s, { place: 'Fortis Hospital, Kolkata', weightG: 3100 }, later(60));
    expect(r.state.her.phase).toBe('postpartum');
    expect(r.state.her.pregnancy).toBeUndefined();
    expect(r.state.children[0]!.name).toBe('B/O Saheli');
    // Date and time prefill from the last thing logged in labour mode (9.7).
    expect(r.state.births[0]!.datetime).toBe(later(11).toISOString());
    // Birth weight becomes the first point on the child's growth chart.
    expect(r.state.logs.find((l) => l.type === 'growth')).toMatchObject({ weightG: 3100, subject: { kind: 'child', childId: r.childId } });
    // Pregnancy content archives to Me, History.
    expect(r.state.history[0]).toMatchObject({ outcome: 'birth', medicineIds: ['m1'] });
    expect(r.state.history[0]!.appointments).toHaveLength(1);
    expect(r.state.medicines[0]!.archived).toBe(true);
    expect(r.state.appointments).toEqual([]);
    expect(checkInvariants(r.state)).toEqual([]);
    expect(postpartumLabel(r.state, later(60))).toBe(1);
  });

  it('Skip for now saves minimum data and leaves a "Finish your birth details" prompt', () => {
    const r = saveBirth(pregnant(), {}, now, { skipped: true });
    expect(r.state.births[0]!.datetime).toBe(now.toISOString());
    expect(r.state.prompts.finishBirthDetails).toEqual({ birthId: r.birthId });
  });

  it('a pregnancy ending without birth changes nothing until she chooses it, then keeps or drops data', () => {
    const kept = endPregnancy(pregnant(), now, true);
    expect(kept.her.phase).toBe('cycle_tracking');
    expect(kept.history[0]!.outcome).toBe('ended');
    expect(endPregnancy(pregnant(), now, false).history).toEqual([]);
  });

  it('period return is only set by her explicit answer', () => {
    const baby = onboard('Saheli', { kind: 'have_baby', child: { name: 'Srinika', dob: '2026-07-13', feeding: ['breast'] } }, now);
    const s = confirmPeriodReturn(baby, '2026-08-25', now);
    expect(s.her.phase).toBe('postpartum'); // postpartum persists alongside cycle (6.3)
    expect(s.her.cycle).toMatchObject({ active: true, lastPeriodStart: '2026-08-25' });
    expect(currentPeriodDay(s, now)).toBe(3);
  });

  it('"Not yet" snoozes the period card for 14 days', () => {
    const s = snoozePeriodCard(pregnant(), now);
    expect(new Date(s.prompts.periodCardSnoozedUntil!).getTime() - now.getTime()).toBe(14 * 864e5);
  });

  it('pregnant again pauses cycle tracking and keeps children', () => {
    let s = onboard('Saheli', { kind: 'have_baby', child: { name: 'Srinika', dob: '2025-06-07', feeding: ['solids'] } }, now);
    s = confirmPeriodReturn(s, '2026-08-01', now);
    s = pregnantAgain(s, '2027-03-01');
    expect(s.her.phase).toBe('pregnancy');
    expect(s.her.cycle.active).toBe(false);
    expect(s.her.cycle.lastPeriodStart).toBe('2026-08-01');
    expect(s.children).toHaveLength(1);
    expect(deriveTodayState(s, now)).toBe('pregnancy_with_child');
    expect(checkInvariants(s)).toEqual([]);
  });

  it('adding a child grows the list without touching her state', () => {
    const r = addChild(pregnant(), { name: 'Srinika', dob: '2025-06-07', feeding: ['solids'] });
    expect(r.state.her.phase).toBe('pregnancy');
    expect(r.state.children).toHaveLength(1);
  });
});

describe('6.3 combination rules', () => {
  it('her state and children are independent: every phase with zero, one or two children', () => {
    for (const phase of ['pregnancy', 'postpartum', 'cycle_tracking'] as const) {
      for (const n of [0, 1, 2]) {
        let s = onboard('Saheli', phase === 'pregnancy' ? { kind: 'pregnant', dueDate: '2026-12-31' } : { kind: 'tracking_cycle' }, now);
        if (phase === 'postpartum') s = { ...s, her: { ...s.her, phase: 'postpartum', cycle: { active: false } } };
        for (let i = 0; i < n; i++) s = addChild(s, { name: `C${i}`, dob: '2025-06-07', feeding: [] }).state;
        // Postpartum with no birth record is not a reachable state from the transitions, so only check the others strictly.
        if (phase !== 'postpartum') expect(checkInvariants(s)).toEqual([]);
        expect(() => deriveTodayState(s, now)).not.toThrow();
      }
    }
  });

  it('heavy bleeding in the postpartum window is never read as a period', () => {
    const baby = onboard('Saheli', { kind: 'have_baby', child: { name: 'Srinika', dob: '2026-08-12', feeding: ['breast'] } }, now);
    const s = addLog(baby, { kind: 'her' }, { type: 'bleeding', level: 'heavy' }, now, 'quick').state;
    expect(s.her.cycle.active).toBe(false);
    expect(currentPeriodDay(s, now)).toBeUndefined();
  });

  it('logs for a child that does not exist are rejected', () => {
    expect(() => addLog(pregnant(), { kind: 'child', childId: 'nope' }, { type: 'diaper', kind: 'wet' }, now, 'quick')).toThrow(TransitionError);
  });
});

describe('formula tins (9.15)', () => {
  const baby = () => onboard('Saheli', { kind: 'have_baby', child: { name: 'Srinika', dob: '2026-08-12', feeding: ['breast', 'bottle'] } }, now);

  it('derives the discard date and keeps it in step with edits', () => {
    const b = baby();
    const r = openFormulaPack(b, { childId: b.children[0]!.id, openedOn: '2026-09-02' });
    expect(r.pack).toMatchObject({ useWithinDays: 45, discardBy: '2026-10-17', status: 'active' });
    const e = editFormulaPack(r.state, r.pack.id, { useWithinDays: 28 });
    expect(e.formulaPacks[0]!.discardBy).toBe('2026-09-30');
    expect(checkInvariants(e)).toEqual([]);
  });

  it('allows several active tins and closes them with a date', () => {
    const b = baby();
    const cid = b.children[0]!.id;
    let s = openFormulaPack(b, { childId: cid, openedOn: '2026-08-01' }).state;
    s = openFormulaPack(s, { childId: cid, openedOn: '2026-08-27' }).state;
    expect(s.formulaPacks.filter((p) => p.status === 'active')).toHaveLength(2);
    s = closeFormulaPack(s, s.formulaPacks[0]!.id, 'discarded', now);
    expect(s.formulaPacks[0]).toMatchObject({ status: 'discarded', closedOn: '2026-08-27' });
    expect(checkInvariants(s)).toEqual([]);
  });
});

describe('medicines (B29)', () => {
  const s0 = () => onboard('Saheli', { kind: 'pregnant', dueDate: '2026-12-31' }, now);
  it('adds, edits and stops a medicine; never invents a dose', () => {
    const r = addMedicine(s0(), { kind: 'her' }, { name: ' Cipcal XT ', doseText: '1 tab', schedule: { anchors: ['breakfast', 'dinner'] } });
    expect(r.state.medicines[0]).toMatchObject({ name: 'Cipcal XT', doseText: '1 tab' });
    const e = updateMedicine(r.state, r.id, { name: 'Cipcal XT', doseText: '', schedule: { times: ['08:00'] } });
    expect(e.medicines[0]!.doseText).toBe('');
    expect(e.medicines[0]!.schedule).toEqual({ times: ['08:00'] });
    expect(stopMedicine(e, r.id).medicines[0]!.archived).toBe(true);
  });
  it('rejects a medicine with no name or no time', () => {
    expect(() => addMedicine(s0(), { kind: 'her' }, { name: '  ', doseText: '', schedule: { anchors: ['breakfast'] } })).toThrow(TransitionError);
    expect(() => addMedicine(s0(), { kind: 'her' }, { name: 'Iron', doseText: '', schedule: { times: [] } })).toThrow(TransitionError);
  });
});

describe('appointments and checklist (B30, 9.5)', () => {
  const s0 = () => onboard('Saheli', { kind: 'pregnant', dueDate: '2026-12-31' }, now);
  it('adds a booking for a suggested check, edits and removes it', () => {
    const r = addAppointment(s0(), { title: 'Glucose test', at: '2026-09-24T09:00:00.000Z', milestoneId: 'glucose-test' });
    expect(r.state.appointments[0]).toMatchObject({ source: 'user', milestoneId: 'glucose-test' });
    const e = updateAppointment(r.state, r.id, { title: 'Glucose test, fasting', at: '2026-09-25T09:00:00.000Z' });
    expect(e.appointments[0]!.title).toBe('Glucose test, fasting');
    expect(removeAppointment(e, r.id).appointments).toEqual([]);
    expect(() => addAppointment(s0(), { title: ' ', at: '2026-09-24T09:00:00.000Z' })).toThrow(TransitionError);
  });
  it('updates the checklist only while pregnant', () => {
    expect(setChecklist(s0(), { hospitalBag: 'packed' }).her.pregnancy!.checklist).toEqual({ birthPlanShared: false, hospitalBag: 'packed' });
    const cycle = onboard('Saheli', { kind: 'tracking_cycle' }, now);
    expect(() => setChecklist(cycle, { hospitalBag: 'packed' })).toThrow(TransitionError);
  });
});
