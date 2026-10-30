/**
 * Domain model, PRD section 6.1.
 *
 * Everything in the PRD sketch is reproduced as written. Where the PRD's own
 * screens need data the sketch does not hold, the addition is marked
 * `PRD-ADDITION` with the section that needs it. Nothing in the sketch was
 * renamed or removed.
 */

import type { DeviceId, VitalsDay } from './devices';

export type ISODateTime = string; // full ISO timestamp, e.g. 2026-08-27T10:15:00.000Z
export type ISODate = string; // calendar date, e.g. 2026-08-27

export type Subject = { kind: 'her' } | { kind: 'child'; childId: string };

export type HerPhase = 'cycle_tracking' | 'pregnancy' | 'postpartum';

export interface HerProfile {
  name: string;
  phase: HerPhase;
  pregnancy?: Pregnancy; // exists while pregnant
  postpartum?: { birthId: string; startedAt: ISODateTime };
  cycle: { active: boolean; lastPeriodStart?: ISODate; periodDays?: ISODate[] };
  hydrationGoalGlasses: number; // default 8
  units: { volume: 'oz' | 'ml'; weight: 'kg' | 'lb' };
  /** PRD-ADDITION (9.6, 11.3, S09 "Doctor · call"): every escalation offers a human to contact. */
  provider?: { name: string; phone?: string };
  /** PRD-ADDITION (9.5 "Shared with", B34): partner shown on checklist rows. UI only. */
  partnerName?: string;
}

/** PRD-ADDITION (9.6): the sketch references Contraction without defining it. */
export interface Contraction {
  start: ISODateTime;
  end?: ISODateTime;
}

export interface Pregnancy {
  dueDate: ISODate;
  labour?: { startedAt: ISODateTime; contractions: Contraction[]; endedAt?: ISODateTime };
  birthId?: string;
  /** PRD-ADDITION (9.5 This week checklist). */
  checklist?: {
    birthPlanShared: boolean;
    hospitalBag: 'not_started' | 'packed';
    /** PRD-ADDITION (decision 2026-10-30): which hospital bag items she has packed. Absent: all or none, from hospitalBag. */
    bagItems?: string[];
    /** PRD-ADDITION (decision 2026-10-30): her birth plan. Choices are stored as she saw them. */
    birthPlan?: BirthPlan;
  };
}

export interface BirthPlan {
  place?: string;
  companion?: string;
  painRelief?: string[];
  feeding?: string;
  afterBirth?: string[];
  notes?: string;
}

export interface BirthRecord {
  id: string;
  childId: string;
  name?: string; // default "B/O <mother's name>"
  datetime: ISODateTime;
  place?: string;
  weightG?: number;
}

export type FeedingMode = 'breast' | 'bottle' | 'solids';

export interface Child {
  id: string;
  name: string;
  dob: ISODate;
  feeding: FeedingMode[];
  /** PRD-ADDITION (7.4 "Avatars are photos or initials"): no photo means initials. */
  photo?: string;
  // stage is derived, not stored (section 13)
}

export type MealSlot = 'breakfast' | 'lunch' | 'snack' | 'dinner';
export type BleedingLevel = 'spotting' | 'light' | 'medium' | 'heavy';
export type MoodValue = 'low' | 'flat' | 'ok' | 'good';
export type ReactionSeverity = 'mild' | 'moderate' | 'severe';

/** 'device': brought in from a connected app (Settings, Connected apps). */
export type LogSource = 'quick' | 'timer' | 'sheet' | 'derived' | 'device';

interface LogBase {
  id: string;
  subject: Subject;
  at: ISODateTime;
  source: LogSource;
  /** PRD-ADDITION (9.4, 9.2 Mood): sheets carry a Notes field. */
  note?: string;
  /** PRD-ADDITION (9.4 Combo, S07 both sides): entries saved together share a group. */
  groupId?: string;
  /** PRD-ADDITION (connected apps): which app a 'device' entry came from. */
  device?: DeviceId;
}

export type LogPayload =
  | { type: 'feed'; mode: 'breast'; side: 'left' | 'right'; minutes: number }
  | { type: 'feed'; mode: 'bottle'; ml: number; content: 'formula' | 'expressed' }
  /** PRD-ADDITION (B13): recipeId when logged from "Mark as fed", to avoid repeats within three days. */
  | { type: 'feed'; mode: 'solids'; slot: MealSlot; foodIds: string[]; recipeId?: string }
  | { type: 'diaper'; kind: 'wet' | 'dirty' | 'both' }
  | { type: 'sleep'; start: ISODateTime; end?: ISODateTime }
  | { type: 'pump'; side: 'left' | 'right' | 'both'; ml: number; minutes: number }
  | { type: 'growth'; weightG?: number; lengthCm?: number; headCm?: number }
  | { type: 'water'; glasses: number }
  | { type: 'mood'; value: MoodValue }
  | { type: 'bleeding'; level: BleedingLevel }
  | { type: 'pelvic_floor'; sets: number }
  | { type: 'pain'; location: string; intensity: 1 | 2 | 3 | 4 | 5 }
  | {
      type: 'period';
      flow: BleedingLevel;
      event: 'start' | 'day' | 'end';
      /** PRD-ADDITION (9.8): day-detail sheet logs symptoms. */
      symptoms?: string[];
    }
  | {
      type: 'dose';
      medicineId: string;
      takenAt: ISODateTime;
      /** PRD-ADDITION (9.5): which scheduled dose this ticks (a time or an anchor). */
      slot?: string;
    }
  | { type: 'reaction'; foodId: string; symptoms: string[]; severity: ReactionSeverity }
  | { type: 'note'; text: string }
  /** PRD-ADDITION (5.2 pregnancy FAB, B28): Weight and Symptom tiles. */
  | { type: 'weight'; kg: number }
  | { type: 'symptom'; name: string }
  /** PRD-ADDITION (3.3 D2, R12): practice contractions logged outside Labour mode. */
  | { type: 'practice_contraction'; durationSec: number };

export type LogEntry = LogBase & LogPayload;
export type LogType = LogPayload['type'];

export type MedicineSchedule =
  | { times: string[] } // "08:00"
  | { anchors: ('breakfast' | 'lunch' | 'dinner' | 'bedtime')[] };

export interface Medicine {
  id: string;
  subject: Subject;
  name: string;
  doseText: string;
  schedule: MedicineSchedule;
  course?: { days: number; startedAt: ISODateTime }; // child courses use this
  /** PRD-ADDITION (B17 "optional gentle reminder"): a mock; no notifications in the prototype. */
  reminder?: boolean;
  /** PRD-ADDITION (B29 "start date"): doses are scheduled from this date. */
  startedOn?: ISODate;
  /** PRD-ADDITION (9.7): pregnancy medicines that are no longer current are archived. */
  archived?: boolean;
}

export type FormulaStatus = 'active' | 'finished' | 'discarded';

export interface FormulaPack {
  id: string;
  childId: string;
  brand?: string;
  stage?: string; // free text, for example "Stage 2"
  sizeText?: string; // free text, for example "400 g tin" or "sachet box"
  openedOn: ISODate;
  useWithinDays: number; // default 45; editable per pack
  discardBy: ISODate; // derived: openedOn + useWithinDays
  status: FormulaStatus;
  closedOn?: ISODate;
  note?: string;
}

export type ReactionStatus = 'none_yet' | 'none' | 'mild' | 'moderate' | 'severe';

export interface FoodIntroduction {
  foodId: string;
  childId: string;
  firstOn: ISODate;
  allergenGroup?: string;
  reaction: ReactionStatus;
}

export interface Insight {
  id: string;
  ruleId: string;
  scope: 'her' | 'child' | 'both';
  severity: 'info' | 'escalate';
  headline: string;
  body?: string;
  action?: { label: string; effect: string };
  dismissedUntil?: ISODateTime;
}

/** PRD-ADDITION (9.5 Coming up, B30): appointments are listed but not modelled in 6.1. */
export interface Appointment {
  id: string;
  title: string;
  at?: ISODateTime; // undefined = suggested, not booked
  suggestedWeek?: number; // e.g. glucose test window
  source: 'user' | 'suggested';
  /** PRD-ADDITION (9.5): the suggested check this booking fulfils, so it leaves the suggestions. */
  milestoneId?: string;
}

/** PRD-ADDITION (9.7): what the handoff archives under Me, History. */
export interface ArchivedPregnancy {
  dueDate: ISODate;
  endedAt: ISODateTime;
  outcome: 'birth' | 'ended';
  birthId?: string;
  appointments: Appointment[];
  medicineIds: string[];
  labour?: Pregnancy['labour'];
}

/** PRD-ADDITION (10.4): running timers persist as start timestamps. */
export interface RunningTimers {
  sleep?: { subject: Subject; start: ISODateTime };
  /** A breastfeed session (S07): seconds already counted per side, plus the side running now, if any. */
  breastfeed?: {
    childId: string;
    sessionStart: ISODateTime;
    leftSec: number;
    rightSec: number;
    running?: { side: 'left' | 'right'; start: ISODateTime };
  };
}

/** PRD-ADDITION (B16): a vaccine marked done. Absent means "Not yet". */
export interface VaccineRecord {
  childId: string;
  vaccineId: string;
  doneOn: ISODate;
}

export interface DomainState {
  her: HerProfile;
  children: Child[];
  births: BirthRecord[];
  logs: LogEntry[];
  medicines: Medicine[];
  formulaPacks: FormulaPack[];
  foodIntros: FoodIntroduction[];
  appointments: Appointment[];
  history: ArchivedPregnancy[];
  timers: RunningTimers;
  /** PRD-ADDITION (B35, B34): app settings. */
  settings?: {
    insightFrequency: 'fewer' | 'standard';
    notifications: { doses: boolean; tins: boolean; insights: boolean };
    sharing: { feeds: boolean; appointments: boolean; me: boolean };
  };
  /** PRD-ADDITION (connected apps, UI only): the one app she has connected. */
  devices?: { connected: DeviceId; connectedAt: ISODateTime };
  /** Daily summaries from that app: resting heart rate, skin temperature, steps. */
  vitals?: VitalsDay[];
  /** PRD-ADDITION (self care, decision 2026-10-30): days she has marked done in each exercise plan. */
  selfCare?: { plans: Record<string, number[]> };
  /** PRD-ADDITION (B12): foods she typed that are not in the catalogue, id to name. */
  customFoods?: Record<string, string>;
  /** PRD-ADDITION (B16). Optional so state saved before it existed still loads. */
  vaccinations?: VaccineRecord[];
  /** PRD-ADDITION (9.13): when she set Weave up. Absent for sample data. */
  startedAt?: ISODateTime;
  /** Snoozes and acknowledgements keyed by insight id (11.1, 11.3). */
  insightMemory: Record<string, { snoozedUntil?: ISODateTime; acknowledgedAt?: ISODateTime }>;
  /** Contextual cards that are snoozed or pending (9.7 "Finish your birth details", 9.8 "Not yet"). */
  prompts: {
    periodCardSnoozedUntil?: ISODateTime;
    finishBirthDetails?: { birthId: string };
    /** The one-time "Getting started" card on her first Today after onboarding (9.13). */
    welcome?: boolean;
  };
}
