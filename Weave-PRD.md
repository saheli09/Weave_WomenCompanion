# Weave: Product Requirements Document

**Version:** 0.1 (draft for build)
**Date:** 28 September 2026
**Owner:** Saheli Raharoy
**Purpose of this document:** Brief Claude Code to build the remaining Weave screens and interactions as a clickable, stateful, demo-able prototype, keeping the design system already established in Figma.

---

## 0. How to use this document (instructions for Claude Code)

1. **Source of truth order:** Figma frames first, then this PRD, then sensible defaults. If the PRD and Figma disagree, follow Figma for visuals and this PRD for behaviour, and log the conflict in section 17.
2. **Design tokens:** Values in section 7 are approximate, sampled visually from screenshots. Before building components, use the Figma MCP to extract the exact colours, type styles, spacing and radii from the Figma file, and replace the approximate values. Do not invent a new visual language.
3. **Build for demoing.** Weave is a portfolio case study. The prototype must let a viewer jump between life stages (pregnant, newborn, toddler, cycle return) and move time forward, so time-dependent insights can be shown. See section 16.
4. **Nothing here is medical advice.** Any copy that touches health must follow the insight rules in section 11, and copy flagged "needs clinical review" must not ship as final without it.
5. **Scope discipline.** Priorities are P0 (must build), P1 (build after P0), P2 (stub or skip). Twins and multiples, community, e-commerce and wearables are explicitly out of scope.

---

## 1. Product summary

### 1.1 What Weave is
Weave is one mobile app that follows a woman from pregnancy through postpartum recovery, the return of her cycle, and her child's care, without asking her to download a new app at each stage.

**Positioning:** Weave helps new mothers make confident decisions about her and her baby's care, without carrying the mental load of remembering, tracking and researching alone.

### 1.2 The problem
- Mothers use one app for cycle tracking, another for pregnancy, another for baby care, and ChatGPT for anything contextual. Most pregnancy apps stop being useful after birth. Postpartum churn is estimated at around 70% by week four.
- Competitors that log both mother and baby (Nara) show the two side by side but never connect them. Competitors with intelligence (Betteroo, Huckleberry) cover the baby only.
- No competitor follows a mother through her own cycle returning while she is still caring for a baby. Cycle return often happens within the postpartum window (the product owner's own cycle returned at about six weeks).

### 1.3 The core thesis
The deeper need is **reduced mental load and decision confidence**. App-switching and slow logging are symptoms. Every feature is judged by one question: does this return cognitive budget to a tired mother, or spend it?

### 1.4 Differentiators to make visible in the build
1. **Correlation, not co-display.** Insights combine a mother data point with a baby data point (for example, feeds logged and her water intake).
2. **The handoff.** Pregnancy to postpartum happens inside the same app, with no re-onboarding.
3. **Cycle return inside postpartum.** Cycle tracking activates within "Me" when she says her period is back.
4. **Stage-adaptive.** What matters changes as the child grows. Logging value decays as routines settle; deciding what to feed and occasional medicines take over.

---

## 2. Goals, non-goals and success criteria

### 2.1 Goals (prototype)
- Demonstrate the full journey across four demo states: pregnancy, newborn postpartum, cycle return, toddler with solids.
- Prove that the top logging actions are fast and low-friction.
- Show AI as quiet, observational support with visible safety boundaries.
- Match the Figma design system closely enough that new screens are indistinguishable from designed ones.

### 2.2 Non-goals
- No real backend, accounts, payments or push notifications (local-only state is enough).
- No diagnosis, triage or medical interpretation.
- No twins/multiples UI (data model must not prevent it later).
- No community, shopping, wearables or content library beyond the seed content in section 9.
- No cycle-based fertility or conception features in this round (trying to conceive is a later stage).

### 2.3 Success criteria
| Criterion | Target |
|---|---|
| Time to log a feed, diaper, water or mood from Today | 10 seconds or less; 2 taps or fewer for water, diaper and mood |
| Stage switching | Any demo state reachable in 2 taps from demo controls |
| Design fidelity | New screens within 2px of Figma spacing at 390px width; same components, no one-off styles |
| Insight copy | 100% of insight templates pass the copy lint (section 11.4) |
| Safety | Every red-flag scenario in section 11.3 routes to a provider-contact card, never reassurance |
| Accessibility | Tap targets 44px or larger; screen-reader labels on every control; contrast checked (section 15) |

---

## 3. Users and scenarios

### 3.1 Primary user
A mother, roughly from mid-pregnancy to about 24 months postpartum, using her phone one-handed, often holding a baby, on low sleep. She thinks in moments ("she just woke up", "I need to log a feed"), not in profiles.

### 3.2 Key scenarios
| Scenario | Job to be done | Entry |
|---|---|---|
| 2 AM feed | Log a feed in under 10 seconds, see her own hydration gently surfaced | Today, feed "+" |
| Recovery check | Log spotting, pelvic floor, pain, mood without it feeling clinical | Me |
| Labour | Time contractions, know when to call, then capture the birth | Today, Labour mode |
| Cycle returns | Say "my period is back" once; tracking appears | Me, Around now card |
| Solids | Know what to make today and what has already been introduced safely | Today, meal card |
| New food | Watch for reactions after a new food | Today, reaction prompt |
| Medicines | Check off her own doses; run a short medicine course for the child | Today, Medicines / Baby, Medicines |
| Opening a formula tin | Record the day a tin is opened once, and be reminded before its use-by-opening window ends so the remainder is discarded | FAB, "Formula opened" / Baby, Feeding, Formula stock |

### 3.3 Demo personas (seed data)
Seed data must use one consistent timeline per persona (see section 17 for the inconsistencies in the current Figma sample data).

| ID | State | Detail |
|---|---|---|
| D1 | Pregnant, week 22 | Two prenatal medicines, one appointment upcoming |
| D2 | Pregnant, week 40 | Practice contractions logged; Labour mode available |
| D3 | Postpartum week 3 | Newborn, breastfeeding plus some formula (one active formula tin, opened 10 days ago), spotting easing |
| D4 | Postpartum week 7, period returned | Cycle tracking active |
| D5 | Toddler, 14 months | Solids, meal suggestions, a newly introduced food, period tracking, one active child medicine course, one formula tin 5 days from its discard date |
| D6 | Pregnant again with a toddler | Combined state, P1 |

---

## 4. Product principles

1. **Baby-first, never baby-only.** Her wellbeing has the same visual weight as the child's.
2. **Reduce cognitive load.** Fewer decisions, fewer things to parse, one primary action per screen.
3. **One-handed.** Primary actions live in the bottom half of the screen.
4. **Logging in under 10 seconds.** Pre-fill the most likely value; confirm with one tap.
5. **Instant for counts, sheet for values.** Increments (water) are instant. Anything needing a value opens a small pre-filled bottom sheet.
6. **AI is quiet support, not authority.** It notices patterns and reduces logistics. It never diagnoses or prescribes.
7. **Observation, not verdict.** Copy reads like a noticing, not an instruction.
8. **Never compare siblings.** A child's data is compared only against that child's own history.
9. **Moments, not profiles.** She should never have to choose "mom mode" or "baby mode".
10. **Stage-adaptive.** Layouts and priorities follow her state and the child's stage.
11. **Every red flag gets an off-ramp to a human.** Health-adjacent patterns end in "contact your provider", never in reassurance.
12. **Calm visual tone.** Warm neutrals, one restrained accent, no emoji, no gamification, no streaks or guilt.

---

## 5. Information architecture

### 5.1 Navigation
Bottom bar, as designed: **Today**, **Me**, **[+ FAB]**, **Baby**, **Ask AI**. The FAB is the universal quick-log entry and opens the "What just happened?" sheet.

```
Today            state-aware home (section 8.1)
Me               her recovery, cycle, body, mood, medicines, history
  Hydration, Mood, Bleeding, Pelvic floor, Pain, Sleep (hers)
  Cycle (activates when period returns)
  Medicines, Appointments
  History (archived pregnancy)
  Trends (her data)
Baby             child switcher if more than one child
  Feeding (includes Formula stock), Sleep, Diaper, Food journey, Growth, Vaccinations, Medicines
  Trends (child data)
Ask AI           scoped assistant (section 12)
[+]              quick-log sheet
Settings         reached from Me header (gear)
```

### 5.2 The FAB sheet is state-aware
- Postpartum: Feed, Diaper, Sleep, Pump (baby) plus Water, Mood, Bleeding, Medicine (her). When the child uses formula, add a **Formula opened** tile (section 9.15); its "time since" line reads as the age of the newest open tin (for example "Opened 12 days ago").
- Pregnancy: Water, Mood, Symptom, Medicine, Weight, Note.
- Each tile shows the time since last entry (for example "Feed, 2h ago") as designed.

### 5.3 Trends
There is no Trends tab. Trends live inside Me and Baby modules, reached from "All" links and module headers. A combined "Both of you" view is reached from the insight explainer (section 11.5).

---

## 6. Domain model and state machine

### 6.1 Entities (TypeScript sketch)

```ts
type Subject = { kind: 'her' } | { kind: 'child'; childId: string };

interface HerProfile {
  name: string;
  phase: 'cycle_tracking' | 'pregnancy' | 'postpartum';
  pregnancy?: Pregnancy;          // exists while pregnant
  postpartum?: { birthId: string; startedAt: string };
  cycle: { active: boolean; lastPeriodStart?: string; periodDays?: string[] };
  hydrationGoalGlasses: number;   // default 8
  units: { volume: 'oz' | 'ml'; weight: 'kg' | 'lb' };
}

interface Pregnancy {
  dueDate: string;
  labour?: { startedAt: string; contractions: Contraction[]; endedAt?: string };
  birthId?: string;
}

interface BirthRecord {
  id: string; childId: string;
  name?: string;            // default "B/O <mother's name>"
  datetime: string; place?: string; weightG?: number;
}

interface Child {
  id: string; name: string; dob: string;
  feeding: ('breast' | 'bottle' | 'solids')[];
  // stage is derived, not stored (section 13)
}

type LogEntry = {
  id: string; subject: Subject; at: string;   // ISO timestamp
  source: 'quick' | 'timer' | 'sheet' | 'derived';
} & (
  | { type: 'feed'; mode: 'breast'; side: 'left' | 'right'; minutes: number }
  | { type: 'feed'; mode: 'bottle'; ml: number; content: 'formula' | 'expressed' }
  | { type: 'feed'; mode: 'solids'; slot: 'breakfast' | 'lunch' | 'snack' | 'dinner'; foodIds: string[] }
  | { type: 'diaper'; kind: 'wet' | 'dirty' | 'both' }
  | { type: 'sleep'; start: string; end?: string }
  | { type: 'pump'; side: 'left' | 'right' | 'both'; ml: number; minutes: number }
  | { type: 'growth'; weightG?: number; lengthCm?: number; headCm?: number }
  | { type: 'water'; glasses: number }
  | { type: 'mood'; value: 'low' | 'flat' | 'ok' | 'good' }
  | { type: 'bleeding'; level: 'spotting' | 'light' | 'medium' | 'heavy' }
  | { type: 'pelvic_floor'; sets: number }
  | { type: 'pain'; location: string; intensity: 1 | 2 | 3 | 4 | 5 }
  | { type: 'period'; flow: 'spotting' | 'light' | 'medium' | 'heavy'; event: 'start' | 'day' | 'end' }
  | { type: 'dose'; medicineId: string; takenAt: string }
  | { type: 'reaction'; foodId: string; symptoms: string[]; severity: 'mild' | 'moderate' | 'severe' }
  | { type: 'note'; text: string }
);

interface Medicine {
  id: string; subject: Subject; name: string; doseText: string;
  schedule: { times: string[] } | { anchors: ('breakfast' | 'lunch' | 'dinner' | 'bedtime')[] };
  course?: { days: number; startedAt: string };   // child courses use this
}

interface FormulaPack {
  id: string; childId: string;
  brand?: string; stage?: string;      // free text, for example "Stage 2"
  sizeText?: string;                   // free text, for example "400 g tin" or "sachet box"
  openedOn: string;                    // date the tin or packet was opened
  useWithinDays: number;               // default 45; editable per pack
  discardBy: string;                   // derived: openedOn + useWithinDays
  status: 'active' | 'finished' | 'discarded';
  closedOn?: string;                   // date marked finished or discarded
  note?: string;
}

interface FoodIntroduction {
  foodId: string; childId: string; firstOn: string;
  allergenGroup?: string; reaction: 'none_yet' | 'none' | 'mild' | 'moderate' | 'severe';
}

interface Insight {
  id: string; ruleId: string; scope: 'her' | 'child' | 'both';
  severity: 'info' | 'escalate';
  headline: string; body?: string;
  action?: { label: string; effect: string };
  dismissedUntil?: string;
}
```

### 6.2 State transitions
| From | Trigger | To | Side effects |
|---|---|---|---|
| Onboarding | She picks her situation | pregnancy, postpartum or cycle_tracking | Seeds the relevant Today |
| pregnancy | Starts Labour mode | pregnancy (labour session open) | Screen stays awake, Today reduces to timer |
| pregnancy | "Baby is here" then Save birth (or Skip for now) | postpartum | Creates Child and BirthRecord; archives pregnancy content to Me, History; shows the handoff moment |
| pregnancy | "Something has changed with my pregnancy" | Depends on choice (section 9.10) | Gentle, no automatic phase change |
| postpartum | Taps "Yes, it has" on the period card | postpartum with cycle.active = true | Me gains Cycle; Today's "Me" card gains Period, Flow |
| any | "I'm pregnant again" (Me, Cycle) | pregnancy with existing children | Cycle tracking pauses; child card stays visible on Today |
| any | Add child | children list grows | Child switcher appears in Baby |

### 6.3 Combination rules
- **Her state and Children are independent.** Any her-state can coexist with zero, one or more children.
- Cycle tracking can be active during postpartum. The "Week N postpartum" label persists while relevant; whether it expires (for example at 12 months) is an open question (section 17).
- Heavy bleeding during the postpartum window is never interpreted as a period. Period return is only ever set by her explicit answer.

---

## 7. Design system

**Reminder:** verify every value below against Figma via the Figma MCP.

### 7.1 Colour (approximate)
| Token | Approx. value | Use |
|---|---|---|
| `--bg` | #F6F4EF | App background (warm off-white) |
| `--surface` | #FFFFFF | Cards, sheets |
| `--surface-muted` | #EFEBE5 | Reading cards |
| `--ink` | #2B2622 | Primary text; dark primary buttons |
| `--ink-2` | #7D776E | Secondary text |
| `--ink-3` | #A8A29A | Muted labels, inactive nav |
| `--line` | #E9E5DE | Dividers |
| `--sage-100` | #E6F0E8 | AI "Noticing" cards |
| `--sage-600` | #3F6B57 | Primary green buttons, dot indicator |
| `--coral-a` to `--coral-b` | #F4918B to #E8716C | FAB gradient, active tab |
| `--chip-child-bg/fg` | #DDE9F8 / #3B6EA5 | Child chip |
| `--chip-her-bg/fg` | #FCE4E4 / #C4504A | Her chip |

**Rule:** the sage accent is reserved for AI-generated observations. Other cards stay neutral so the AI signal keeps its meaning.

**Addition needed (not in Figma):** an *escalation* card style for red-flag guidance: neutral surface, terracotta left accent bar, one clear "Contact your provider" action. Mark as a design addition to be reviewed.

### 7.2 Typography
- **Display serif** (Figma looks like a Newsreader or Lora style; confirm): greetings, insight headlines, section titles, large numerals (for example "1h 20m", "1 of 8").
- **UI sans** (Inter or equivalent): body, labels, buttons, lists.
- Micro labels: 11px, uppercase, tracked (for example "NOTICING", "TODAY SO FAR", "COMING UP").
- Approximate scale: greeting 32/36 serif; insight headline 22/28 serif; KPI numeral 32 serif; body 15; secondary 13; micro 11.
- Spell out numbers below ten in serif headlines ("Three feeds logged", "eleven minutes apart").

### 7.3 Shape and spacing
- Cards: about 20 to 24px radius. Buttons and chips: fully rounded. Bottom sheets: about 24px top radius with a drag handle.
- Screen padding about 16 to 20px; consistent 8px spacing rhythm. Cards stack with even vertical gaps.
- No heavy shadows; surfaces separated by tone and hairlines. Sheets get a soft shadow.

### 7.4 Iconography and imagery
- Line icons only (feed bottle, diaper, sleep, pump, breast, solids bowl, plate). **No emoji anywhere.** Avatars are photos or initials.

### 7.5 Component inventory
Build each once, document in a component gallery route.

| Component | Notes |
|---|---|
| AppShell, BottomNav, FAB | Nav as designed; FAB coral gradient, centred |
| ScreenHeader | Uppercase date or section label, optional right pill (child age, "Week 7"), serif title |
| InsightCarousel, InsightCard | Sage card; dot label "NOTICING"; serif headline; muted body; primary pill and text "Not now"; pagination dots for up to four cards |
| SubjectCard | Avatar and name; big serif KPI; small "+" affordance; two secondary rows |
| KPIRow | Label left, value right, optional "+" |
| ListCard / ListRow | Divided rows; chevron variants; "Add something you take +" footer row |
| ActivityTimeline | Rows with subject chip (child or Me/You), event text, time; "All" link |
| Chip | Child, Her, filter |
| BottomSheet | Handle, serif title, close (X), optional "Save" action top right |
| TileGrid | Two-column tiles with line icon, label, "time since last" (for the FAB sheet) |
| MoodChips | Low, Flat, Ok, Good (single-select) |
| SegmentedProgress | Eight-segment hydration bar |
| ProgressRing | For week ring and KPI rings (sage stroke) |
| TimerControls | Start Left, Start Right; "last side" tag; editable minutes with pencil |
| ContractionDial | Analogue dial with elapsed seconds in serif |
| BarStrip | Small bar chart of contractions in the last hour |
| ChecklistRow | Circle check, label, value; used for signs and medicines |
| ReadingCard | Muted beige, category micro label, serif headline, body |
| PrimaryButton | Dark ink (neutral actions) or sage (affirming actions) |
| SecondaryButton | Outlined pill |
| TextAction | "Not now", "Skip for now" |
| EmptyState | One serif line, one action, no illustration clutter |
| Toast/Undo | Inline, non-blocking (section 10.3) |

### 7.6 Motion
Short and calm: sheets ease up (200 to 250ms); numbers tick without bounce; a brief fill on hydration increment. Respect reduced-motion settings.

---

## 8. Screen inventory

### 8.1 Designed in Figma (reference; rebuild faithfully)
| ID | Screen | State | Notes |
|---|---|---|---|
| S01 | Today, newborn | Postpartum | Insight carousel; child and Me cards; Today so far |
| S02 | Today, toddler | Solids, period active | Today's lunch card; reaction prompt; period KPIs |
| S03 | Me, postpartum | Recovery | Week card; Hydration and Mood tiles; Body list; cycle-return card |
| S04 | What just happened? | Sheet | Tiles with time since last |
| S05 | Feed | Sheet | Breastfeed, Bottle Feed, Solids, Combo Feed |
| S06 | Solids | Sheet | Meal slot icons, start time, food, notes |
| S07 | Breastfeed | Sheet | Left and right timers, last side tag |
| S08 | Today, pregnancy week 22 | Pregnancy | Medicines, coming up, reading, this week |
| S09 | Today, week 40 | Pregnancy | Labour mode card |
| S10 | Labour mode, summary | Labour | Since last contraction, stats, bar strip, three signs |
| S11 | Labour mode, active | Labour | Dial timer, "It's easing" |
| S12 | Birth details | Birth | Inline-editable fields; Save birth |

### 8.2 To build
| ID | Screen | Priority |
|---|---|---|
| B01 | Onboarding (5 screens or fewer) | P1 |
| B02 | Handoff moment (after Save birth) | P0 |
| B03 | Diaper quick-log (inline chooser) | P0 |
| B04 | Bottle feed sheet | P0 |
| B05 | Combo feed sheet | P1 |
| B06 | Sleep sheet and running-sleep pill | P0 |
| B07 | Pump sheet | P1 |
| B08 | Baby tab home (stage-aware) | P0 |
| B09 | Feeding history and trends | P1 |
| B10 | Sleep history and trends | P1 |
| B11 | Diaper history | P1 |
| B12 | Food journey | P0 |
| B13 | Meal suggestion and recipe detail | P0 |
| B14 | Reaction logging flow (with emergency branch) | P0 |
| B15 | Growth (log and chart) | P1 |
| B16 | Vaccinations (schedule and mark done) | P1 |
| B17 | Child medicine course (add, run, close) | P0 |
| B18 | Me: Hydration detail | P1 |
| B19 | Me: Mood check-in and history | P1 |
| B20 | Me: Bleeding log and history | P0 |
| B21 | Me: Pelvic floor tracker | P1 |
| B22 | Me: Pain log | P1 |
| B23 | Me: Sleep (hers) | P2 |
| B24 | Cycle: activation flow | P0 |
| B25 | Cycle: calendar, period log, history | P0 |
| B26 | Today, cycle-only state | P1 |
| B27 | Today, pregnant again with a child (compact child strip) | P1 |
| B28 | Pregnancy: quick-log tiles (symptom, weight, note) | P1 |
| B29 | Pregnancy: medicines add and edit | P0 |
| B30 | Pregnancy: appointments add and edit | P1 |
| B31 | Pregnancy: "Something has changed" flow | P1 |
| B32 | Insight explainer sheet ("Why am I seeing this?") | P1 |
| B33 | Ask AI chat | P1 |
| B34 | Partner sharing sheet (UI only) | P2 |
| B35 | Settings (units, goals, notifications mock, data reset) | P1 |
| B36 | Me: History (archived pregnancy) | P2 |
| B37 | Provider-contact and emergency card (reused component) | P0 |
| B38 | Formula tin opened (quick-log sheet) | P0 |
| B39 | Formula stock (list of tins, countdown, mark finished or discarded) | P0 |

---

## 9. Screen specifications

### 9.1 Today (all states)
Common shell: uppercase date label, right pill (child age such as "Srinika's Age: 5m 5d" or a pregnancy week), serif greeting, insight carousel, then state-specific content.

| State | Composition (top to bottom) |
|---|---|
| Pregnancy | Title "Week N" and due-date line; insights; Medicines today (n out of m); Coming up; Week N reading (three cards: food, movement, body); This week checklist; link "Something has changed with my pregnancy" |
| Pregnancy, week 36 onward | As above, and the Labour mode card appears (start button) |
| Postpartum, newborn or infant | Greeting; insights; child card and Me card side by side; Today so far |
| Postpartum, solids stage | As above, plus Today's meal card and new-food prompt when relevant |
| Toddler | Greeting; insights; Today's meal card (compact: next meal with an inline "View recipe" link and the safety line; "All meals today" opens the day's other meals); child card and Me card side by side; new-food reaction prompt and active medicine course, only while active; Today so far |
| Cycle-only | Greeting; insights; cycle card (Period, Day N or "next period estimate"); Me card; Today so far |
| Pregnant again with child | Pregnancy composition plus a compact child strip below the insights |

**Behaviours**
- Insight carousel: up to four cards, swipeable, dots below. "Not now" snoozes that card for 24 hours. Escalation cards cannot be dismissed permanently (section 11.3).
- Child card and Me card KPIs are tappable (section 10). Values update immediately.
- Toddler child card: the headline reads "Last meal, 2h ago", from the last solids or milk log, in place of a large "since last feed" figure. Diapers and Sleep stay on the card below it, each with its "+".
- Toddler first screen: at 390 x 844 the greeting, the top insight card, the compact meal card and the top of the child and Me cards are visible without scrolling.
- "Today so far": newest first, subject chip (child name or "You"/"Me"; pick one and use it everywhere), "All" opens the full timeline with filter chips (All, child name, Me).
- Empty state (nothing logged today): serif line "Nothing logged yet today." with one action, the FAB.
- Formula tin reminders (section 9.15) reach Today only as insight cards in the carousel, and only within the last 7 days of a tin's window or after its discard date. There is no permanent formula tile on Today.

### 9.2 Me tab
**Postpartum (S03).** Header "ME" with week pill; title varies by state ("Recovering, steadily"); insight carousel; week card (ring, "Week N Postpartum", one supportive line); Hydration and Mood tiles; BODY list (Bleeding, Pelvic floor, Pain) each tappable to its detail; AROUND NOW contextual card ("Has your period come back?").

**Detail screens (B18 to B22).** Each has: serif title, today's status, a fast log control at the top (one tap where possible), a 7-day strip or list, and a "See trends" link. Body items show plain-language summaries ("Spotting, 3 days", "4 of 5 this week").

**Bleeding (B20, P0).** Levels: Spotting, Light, Medium, Heavy. Selecting **Heavy** triggers the escalation card (section 11.3) immediately after logging, in addition to saving the log. History list shows day and level.

**Mood (B19).** One-tap check-in (Low, Flat, Ok, Good) plus optional note. If Low is logged on three consecutive days in the postpartum window, show the low-mood support card (section 11.3).

**Pregnancy variant of Me (P1).** Symptoms, weight, hydration, mood, medicines, appointments. Same layout language; replaces the postpartum week card with a pregnancy week card.

### 9.3 Baby tab (B08)
- Header: child name, age, and (if more than one child) a switcher chip.
- Body adapts to stage (section 13). Module list: Feeding, Sleep, Diaper, Food journey, Growth, Vaccinations, Medicines.
- Each module: today's summary, latest entries, "See trends", and a primary log action.

### 9.4 Quick-log (S04 to S07, B03 to B07)
See section 10 for the interaction rules. Sheet contents:

| Sheet | Fields | Defaults |
|---|---|---|
| Breastfeed (S07) | Left timer, right timer, start time, total time, notes | "last side" tag shows which side was used last; start time is now |
| Bottle (B04) | Amount, content (formula or expressed), time | Last amount and content |
| Solids (S06) | Meal slot, start time, foods (multi-add), notes | Slot from time of day |
| Combo (B05) | Breast minutes plus bottle amount | Both prefilled from last |
| Diaper (B03) | Wet, Dirty, Both | None preselected; one tap logs |
| Sleep (B06) | Start now or log past sleep; end sleep | If a sleep is running, sheet shows "End sleep" |
| Pump (B07) | Side, amount, minutes | Last used |
| Formula tin opened (B38) | Opened on, brand (optional), use-within days | Opened on today; use-within 45 days or the last value used |

While a sleep or breastfeed timer is running, show a persistent pill above the nav on every screen ("Sleeping, 0:42", tap to end).

### 9.5 Pregnancy: Medicines, Appointments, Reading (S08 and B29, B30)
- **Medicines today (S08):** circle checkbox per dose; tapping fills the circle and shows the taken time; unchecked shows "--:--" placeholder as designed. "Add something you take" opens the add form (B29): name, dose text, schedule (times or meal anchors), start date. Counter "2 OUT 4".
- **Coming up:** appointments and suggested milestone checks (for example a glucose test window). Suggested items come from a config file, not hard-coded, and need clinical review.
- **Reading:** three seed cards per week (food, movement, body). Content library of at least weeks 20 to 40 as static seed JSON. Needs clinical review.
- **This week checklist:** Birth plan (shared with partner), Hospital bag (Not started, Packed), Labour mode (Ready at week 36), Sharing.

### 9.6 Labour mode (S09 to S12)
- Entry from the Today card. "Start Labour Mode" starts a session timer ("LABOUR MODE, 6H 12M") and strips the app to the timer and a note field, as designed.
- Contraction tap: tapping "Contraction" starts a contraction and opens the dial (S11); "It's easing" ends it. Store start, duration and gap.
- Summary (S10): time since last contraction, count logged, average gap, average duration, bar strip for the last hour.
- **Three signs list (1 of 3 signs):** five minutes apart or less, lasting about a minute, holding for an hour. Each turns green when met, with the measured value shown.
- **Needs clinical review:** the three-signs guidance and the copy shown when all three are met. Add a persistent "Call your provider" action on the summary screen (a design addition) so the user is never one step from a human. When all three signs are met, show the escalation card (section 11.3).
- Keep the screen awake using the Wake Lock API where available. Work fully offline.
- **"Baby is here"** goes to Birth details (S12).

### 9.7 Birth details and the handoff (S12, B02)
- Birth details: Name (default "B/O <mother's name>"), Date, Time, Where, Weight (optional). Date and time prefill from the last thing logged in labour mode. Inline edit with pencil icon. Note: "Nothing here is required to keep using Weave."
- **Save birth** creates the Child and BirthRecord and moves her to postpartum. **Skip for now** does the same with the minimum data (time taken from the last labour entry, else now) and adds a Today card later: "Finish your birth details".
- **Handoff moment (B02):** one warm, brief screen. Suggested copy: "Welcome, little one." with a single sentence: "Your pregnancy notes are saved. Weave now follows both of you, starting with your recovery." One button: "Continue". No new account, no re-onboarding.
- **Data migration rules:** pregnancy content (week reading, appointments, pregnancy medicines that are no longer current) archives under Me, History. Pregnancy weight history stays with her. **Birth weight becomes the first point on the child's growth chart.** The kick counter and due-date countdown (if present) retire.

### 9.8 Cycle return and cycle tracking (B24 to B26)
- **Activation card (S03):** "Has your period come back?" with a short supporting line and two actions: "Yes, it has" (primary) and "Not yet" (text). "Not yet" snoozes the card for 14 days.
- "Yes, it has" asks one question: start date (default today), then opens the Cycle screen.
- **Cycle screen:** month calendar with period days marked; a day-detail sheet to log flow (Spotting, Light, Medium, Heavy) and symptoms (cramps, headache, low mood, tiredness, other); an "End period" action; history list.
- **Predictions:** none until at least two completed cycles are logged. Until then show "Too early to estimate. Postpartum cycles are often irregular." Breastfeeding status is shown as context only.
- Today and Me gain Period (Day N) and Flow rows as in S02.
- Optional entry point (P2): Me, Cycle, "I'm pregnant again" starts a new pregnancy (section 6.2).

### 9.9 Food journey, meal suggestions, reactions (B12 to B14)
**Food journey (B12).** A list or grid of foods introduced with first-introduced date, an allergen tag where applicable (egg, peanut, dairy, wheat, soy, fish, shellfish, tree nuts, sesame), and a reaction status (None yet, None, Mild, Moderate, Severe). Tapping a food shows its history and any reaction notes.

**First-food detection.** When a solids log includes a food never logged before, create a FoodIntroduction and show the prompt on Today: "Curd introduced today. No reaction yet." with actions "Log a reaction" and "Not now" (as designed in S02). The prompt stays for 72 hours, then quietly retires into the journal.

**Meal suggestion (B13).** Rule-based:
- Candidate recipes come from a seed library (at least 30; include Indian home-cooking such as khichdi, dal and rice, ragi porridge, vegetable stews, idli, egg dishes; mark each with ingredient ids).
- A recipe qualifies for "Ingredients already introduced safely" only if every ingredient has been introduced with no reaction above "None".
- Choose by meal slot from time of day and avoid repeating a recipe within three days.
- Card shows "TODAY'S LUNCH", serif recipe name, the safety line, and a "View recipe" ghost button. Recipe detail lists ingredients and steps, with a primary "Mark as fed" that logs a solids meal.
- If no recipe qualifies, show a single line and a link to the food journey.

**Reaction flow (B14).**
1. Choose the food (prefilled) and symptoms: rash or hives, vomiting, diarrhoea, swelling, cough or wheeze, unusual fussiness, other.
2. Onset time and severity (Mild, Moderate, Severe).
3. **Emergency branch:** if swelling of the face, lips or tongue, difficulty breathing, or repeated vomiting with unusual sleepiness is selected, show the emergency card immediately ("Seek urgent medical care now") before saving anything. Needs clinical review.
4. Save updates the FoodIntroduction and shows a neutral confirmation. No AI diagnosis, ever.

### 9.10 "Something has changed with my pregnancy" (B31)
A small, careful flow. Options: "My baby has arrived", "I have a concern about my pregnancy", "My pregnancy has ended", "Something else". Concern routes to the provider-contact card (B37). "My pregnancy has ended" shows a short, gentle acknowledgment, offers to keep or archive her data, and shows support resources. No insights, tips or celebratory UI appear on this path. **Copy and flow need review by a clinician or perinatal support professional before any real use.**

### 9.11 Medicines (her and child)
- Her medicines: as in 9.5, available in pregnancy and postpartum; appear on Today only while she has scheduled medicines.
- **Child medicine course (B17):** fields name, dose, time; optional multi-day course ("for 5 days") with an optional gentle reminder. It appears on Today only while a course is active; otherwise it is reachable from the FAB and Baby, Medicines. Ends automatically after the final day and moves to history.
- Never suggest doses. Users type what a clinician told them.

### 9.12 Growth and vaccinations (B15, B16, P1)
- Growth: log weight, length, head circumference; simple line chart; show the child's own trajectory and an optional reference band (WHO). No "good/bad" language.
- Vaccinations: a schedule list from a config file (India schedule as default, region-configurable; needs verification), marking each Done or Not yet with a date.

### 9.13 Onboarding (B01, P1)
Five screens or fewer: (1) welcome; (2) "Where are you right now?" (pregnant, have a baby, tracking my cycle, pregnant with a child already); (3) the few facts needed (name, due date or child's date of birth and name); (4) feeding and units; (5) privacy note in plain words. Then straight to the correct Today.

### 9.14 Settings (B35)
Units, hydration goal, notification mock, insight frequency (fewer, standard), data export and reset, demo controls link.

### 9.15 Formula tin tracking (B38, B39, P0)

**Why this matters.** Once a formula tin or packet is opened, it has a limited window in which it should be used. After that, the remainder is to be discarded. In a sleep-deprived household, nobody remembers the date they opened a tin. This is a small memory job that Weave can take off her, and it fits the mental-load thesis directly.

**The rule Weave applies.** An opened tin is to be used within **45 days** of opening, and whatever is left after that is discarded. The window is stored per tin and editable, because the manufacturer's label is the authority and different products state different windows. Default: 45 days.

**Who sees it.** Only households where the child uses formula (the child's feeding includes formula, or she adds a tin). Never shown for children who are exclusively breastfed. It stays relevant into toddlerhood while formula is still in use.

**Logging a tin as opened (B38).**
- Entry points: FAB, "Formula opened" tile; Baby, Feeding, Formula stock, "Opened a new tin".
- Sheet fields: Opened on (default today, changeable in case she opens it a day late), Brand (optional, free text, remembered from last time), Stage or size (optional), Use within (default 45 days, editable).
- One-tap path: for the common case, a single "Opened today" confirm with everything prefilled from the last tin.
- Save shows the computed discard date in one line ("Use or discard by 17 October"). Nothing else.
- If a tin is already active, ask once: "Mark the earlier tin as finished or discarded?" with three options: Finished, Discarded, Keep both open. Multiple active tins are allowed.

**Formula stock screen (B39).**
- List of active tins, soonest discard date first. Each row: brand or "Formula tin", opened date, days left, and a thin progress bar (neutral colour; this is an information screen, not an AI observation).
- Row actions: "Finished" and "Discard" (both move the tin to history with today's date), and Edit (fix the opened date or the window).
- History section: finished and discarded tins with dates.
- Empty state: "No open tins. Log one when you open a new tin." with one action, "Opened a new tin".
- Weave does not estimate how much formula is left in a tin and does not deduct from it when bottles are logged (see non-goals below).

**Date maths.** Discard date = opened date plus the use-within days (the opening day counts as day 0). Store dates, not counters. Days left is derived from the demo-controllable clock so time travel works. Handle month ends and leap years with a tested date helper.

**Reminders.** Delivered as insights (rules R16 and R17 in section 11.2) and, in a real build, as notifications. In the prototype, mock the notification as a card in the carousel.
- 7 days before the discard date: an information card.
- 3 days before, and on the discard date: the same card with the day count updated.
- After the discard date: a card until she marks the tin discarded or finished. It can be snoozed for 24 hours but reappears until acted on.
- "Not now" snoozes for 24 hours as with other insights.

**Copy.** Factual and calm. No "you must" language, no alarm, no guilt.
- "The open formula tin is due to be discarded by 17 October." Muted body: "Opened 2 September. Five days left."
- On the day: "The open formula tin is due to be discarded today." Muted body: "Opened 2 September."
- After: "The open formula tin has passed its discard date." Muted body: "Opened 2 September. Due to be discarded by 17 October."
- Dates and the day count come from the tin and the clock, never fixed text.
- Actions, on one line: "Finished", "Discarded", "Not now".

**Non-goals for this feature.**
- No estimate of the quantity remaining, and no linking of individual bottles to a tin.
- No advice about preparing or storing made-up bottles. Rules for prepared bottles are different and short (hours, not days); leave them to the packaging and her provider. If added later, treat as a separate feature with clinical review.
- No barcode or label scanning in this round (P2 idea: photograph the label to capture the use-within period).

**Needs review.** The use-within window varies by brand and is often stated on the tin as a number of weeks; confirm the default and the helper text against the labels of the products she actually uses before showing the value as a recommendation. In the UI, always describe the period as taken from the tin, and let her edit it.

---

## 10. Interaction specifications

### 10.1 Tap-to-log rules
| Target | Interaction | Result |
|---|---|---|
| Hydration "+" | Instant increment | Count updates; brief fill; inline undo |
| Diaper "+" | Inline chooser (Wet, Dirty, Both) | One tap logs; chooser closes |
| Mood "Add +" (Today) | Small sheet with four chips | One tap logs and closes |
| Mood chips (Me) | Inline single-select | One tap logs |
| Feed "+" | Feed sheet (type chooser, last-used type highlighted) then the type sheet | Save |
| Bleeding "+" | Small sheet with four levels, last-used preselected | One tap logs; Heavy triggers escalation |
| Sleep | Start or end timer | Pill while running |
| FAB | "What just happened?" sheet | Routes to type sheets |

**Measure and refine.** Instrument time-to-log per action in the prototype. If the feed type chooser costs measurable time, test opening the last-used sheet directly with a "change" link.

### 10.2 Sheets
Bottom sheets: drag to dismiss, X to close, Save in the header where there is form content. Pre-fill everything likely. Timers start on demand, never automatically without an action. Unsaved changes on dismiss prompt once.

### 10.3 Undo and confirmation
No modals for routine logging. After an instant log, the changed value shows a quiet inline "Undo" for about four seconds. Deleting or editing older entries is via the timeline row (swipe or tap to edit).

### 10.4 Timers
Timers persist across screens and app restarts (store start timestamps, not counters). Editable after the fact (pencil).

### 10.5 States to handle on every screen
Empty, populated, long content, first-use, offline (everything is local), and reduced motion.

---

## 11. Insight engine

### 11.1 Architecture
- Deterministic rules run over local state (logs, medicines, food introductions, phase) and return candidate insights with a priority. The prototype does not need an LLM.
- Rank by urgency: escalations first, then time-limited cards (something she can miss: a formula tin within seven days of its discard date or past it, an open reaction window), then everything else. Within a group, newest first, where "newest" is when the situation the card describes last changed: the current moment for conditions that hold now ("no water yet today", "dose not logged yet"), the last log behind it for trends ("spotting has eased"), and the start of the reminder window for formula tins. Ties go to the rule's priority. Show at most four in the carousel. A per-rule frequency cap prevents repeats (default once per 24 hours per rule).
- Optional later: an LLM may paraphrase within the copy rules, but never invents claims. Rules stay the source of what is said.

### 11.2 Starter rule catalogue
| ID | Scope | Trigger (summary) | Copy pattern | Action |
|---|---|---|---|---|
| R01 | both | Three or more feeds since early morning and no water logged | "Three feeds logged since 5am, and no water yet today." | Log a glass |
| R02 | her | Below half of water goal by mid-afternoon | Observation of the count | Log a glass |
| R03 | her | Period active, day 1 to 3 | Hydration note tied to period | Log a glass |
| R04 | her | Bleeding trending down over three days | "Spotting has eased for three days." (observation only; no line about what a week "usually" looks like) | none |
| R05 | her | Under six hours sleep four nights in a row | "You've slept under six hours four nights running." plus "Nothing to do with this. Just worth knowing." | none |
| R06 | child | Nap length or feed gap differs from the child's own recent average | Compare to her own history only | none |
| R07 | child | First-time food logged | "X introduced today. No reaction yet." | Log a reaction / Not now |
| R08 | child | Meal slot approaching and qualifying recipe exists | Today's meal card | View recipe |
| R09 | both | Medicine dose not logged well after its time | "Evening dose not logged yet." | Log dose |
| R10 | her | Pelvic floor sets below the weekly target | "Four of five this week." | Log a set |
| R11 | her | Postpartum week 6 or later, cycle not active | Cycle-return card (in Me) | Yes it has / Not yet |
| R12 | her | Practice contractions logged with shortening gaps (pregnancy, week 37 or later) | Observation plus "Timing them properly is one tap away." | Start Labour mode |
| R13 | her | Labour: all three signs met | Escalation | Call your provider |
| R14 | her | Bleeding logged Heavy | Escalation | Contact provider |
| R15 | her | Low mood three days in a row (postpartum) | Support card | See support options |
| R16 | child | An active formula tin is 7 days or fewer from its discard date (time-limited) | "The open formula tin is due to be discarded by 17 October." Muted body: "Opened 2 September. Three days left." ("One day left."; on the day the headline reads "…due to be discarded today.") | Finished / Discarded / Not now |
| R17 | child | An active formula tin has passed its discard date (time-limited) | "The open formula tin has passed its discard date." Muted body: "Opened 2 September. Due to be discarded by 17 October." Reappears until acted on (24 hour snooze allowed) | Discarded / Finished / Not now |

### 11.3 Escalation rules (must be provider-first, never reassurance)
These must show the escalation card style, cannot be dismissed with "Not now" alone (they can be acknowledged), and always include a way to contact a provider. **All copy here needs clinical review.**

- Heavy bleeding logged in the postpartum window.
- Labour: three signs met.
- A reaction with any emergency symptom (section 9.9).
- Low mood for three consecutive days, or any mention of harming herself or her baby in Ask AI: show a region-configurable support resource (for example, in India, a national mental health helpline; verify the number before shipping) and encourage contacting her provider.
- Signs of possible dehydration in a young baby (for example markedly fewer wet diapers than usual): provider-contact card. Rule wording needs clinical input before inclusion.

### 11.4 Copy rules and lint
- Observation, not verdict. Avoid: should, must, need to, normal, abnormal, fine, worrying, dangerous, "you are dehydrated".
- No emoji. No streaks, scores or praise ("great job").
- No comparison between children or with other mothers.
- Headline at most two short sentences; one optional muted body line; always an off-ramp.
- Every escalation names a human (provider or emergency services), not the app.
- Spell out numbers below ten in headlines.
- **Automated check:** a unit test scans every insight template and fails on banned words and emoji.
- **Needs review:** the body line in R01 in the current designs ("Your supply tends to follow your own intake more than anything else") asserts a lactation claim that is not well supported. Replace with a softer, defensible line, for example "Nursing can make you thirstier. Worth a glass while you're sitting down." Have a lactation consultant check the final wording.

### 11.5 Explainability (B32, P1)
Tapping the insight card's headline opens a sheet "Why am I seeing this?" showing the underlying data (a small chart or list of the logs behind it), the rule in plain words, and a "Show fewer like this" control.

---

## 12. Ask AI (B33, P1)

The tab exists in the Figma. Its role must stay consistent with "AI as quiet support, not authority".

- **In scope:** questions grounded in her own logs ("When was her last feed?", "How much water did I have yesterday?", "Which foods has she had this week?"); logistics; and general, cautious information with a clear off-ramp.
- **Out of scope:** diagnosing, interpreting symptoms as conditions, dosing, or reassuring about anything health-related.
- **Behaviour:** health-adjacent answers end with "Worth raising with your provider" and a one-tap "Add to my note for the doctor". Red-flag phrases route to the provider-contact card and the resources in section 11.3.
- **Empty state:** three context-aware suggestion chips (they change by state).
- **Prototype implementation:** start with canned, state-aware responses using the local data; a live model call is optional and must be sandboxed behind the same scope rules and a system prompt encoding these principles.

---

## 13. Age-adaptive Baby layouts

Stage is derived from the child's age and refined by usage.

| Stage | Age (default) | Primary on Today and Baby | Secondary |
|---|---|---|---|
| Newborn | 0 to 3 months | Feed, Sleep, Diaper logging | Growth, Vaccinations |
| Infant | 3 to 6 months | Same as newborn; sleep patterns surface | Solids readiness prompt |
| Starting solids | 6 to 12 months | Solids log, Food journey, meal card | Milk feeds |
| Toddler | 12 months and over | Meal suggestion (compact meal card above the child and Me cards), reaction prompt and medicines when active; child card leads with "Last meal, 2h ago" | Diaper and sleep rows stay on the child card, below "Last meal"; milk feeds count towards "Last meal" |

**Taper, not switch.** Do not flip layouts at a hard age. If routine logging (feeds, diapers) drops sharply for two weeks, or she stops logging milk, demote those rows gradually. She can pin any module back to the top in Settings. Whether this is age-driven, usage-driven or manual is an open question; build age-driven with the usage override.

---

## 14. Content, locale and units
- Default English; dates like "Thursday 27 August"; times 12-hour as designed.
- The current designs mix ounces and litres and use Indian medicine and food examples. Provide a units setting (oz or ml, kg or lb); default to whatever Figma shows for the given screen until decided.
- Hydration is expressed as glasses against a goal (default eight), editable in Settings; show millilitres as a secondary value.
- All copy in one strings file to make review and lint easy.

---

## 15. Non-functional requirements
- **Privacy:** health data is sensitive. The prototype stores everything locally; no third-party analytics or trackers; include an "export" and "delete everything" control. Do not send any personal data to external services. If a live model is used for Ask AI, send only the minimum needed and disclose it.
- **Performance:** first interaction under two seconds on a mid-range phone; sheets open instantly.
- **Accessibility:** WCAG 2.1 AA. The sage card's muted body text and the muted grey labels must be checked for contrast and adjusted if below 4.5:1. Tap targets 44px or larger. Screen-reader labels for the "+" affordances (for example "Add a glass of water"). Do not rely on colour alone (chips carry text). Support dynamic type without breaking layouts. Honour reduced-motion.
- **Offline:** fully functional; Labour mode must never depend on a network.
- **Responsive:** design for 390 x 844. On desktop, centre a device frame with the demo controls beside it. Support at least 360px width.

---

## 16. Technical approach and build plan

### 16.1 Recommended stack (defaults; change only with reason)
- React 18, Vite, TypeScript, Tailwind CSS with design tokens as CSS variables.
- Zustand for state with persistence to IndexedDB or localStorage; a single `now()` clock function that demo controls can override.
- A router for tabs and detail screens; a bottom-sheet library (for example Vaul) or Radix-based sheets.
- Charts in lightweight SVG components (no heavy chart library needed).
- Fonts self-hosted.
- Vitest for insight-rule tests; Playwright for flow tests and screenshots at 390 x 844.

### 16.2 Suggested structure
```
src/
  design/        tokens, typography, component gallery route
  components/    shell, cards, sheets, chips, timers, dial
  state/         store, selectors, clock, seed personas
  domain/        types, stage derivation, transitions
  insights/      rules, ranking, templates, copy-lint tests
  features/      today, me, baby, cycle, pregnancy, labour, food, medicines, ask
  content/       strings, reading cards, recipes, vaccine schedule
  demo/          persona switcher, time travel, reset
```

### 16.3 Demo controls (P0)
A panel (desktop) or hidden sheet (mobile) with: persona switcher (D1 to D6), a clock control (set current time, advance by hours or days), "trigger next contraction", and reset. Insights must recompute when time changes.

### 16.4 Phases and acceptance criteria

**Phase 0: Foundation.** Tokens from Figma, fonts, all components in section 7.5, app shell and nav, store, clock, seed personas, demo controls, component gallery.
*Accept when:* the gallery matches Figma frames within 2px; switching personas rebuilds Today correctly.

**Phase 1: Postpartum core.** S01, S03, S04 to S07, B03, B04, B06, B08, B20, B38, B39, insight engine v1 (R01, R02, R04, R05, R06, R10, R16, R17) with tests and copy lint.
*Accept when:* water, diaper and mood are logged in 2 taps or fewer; a feed in 10 seconds or less; a formula tin is logged as opened in 2 taps or fewer; insights update after logging; timers survive a reload; advancing the demo clock makes the tin reminders appear at 7 days before, on, and after the discard date, and marking the tin finished or discarded clears them.

**Phase 2: Pregnancy to postpartum handoff.** S08 to S12, B02, B29, B37, R12 to R14, "Something has changed" (B31).
*Accept when:* a full run from week 22 through Labour mode, Birth details and Handoff lands on the postpartum Today with the child created and pregnancy content archived.

**Phase 3: Cycle return and toddler stage.** B24 to B26, S02, B12 to B14, B17, stage-adaptive layouts, R03, R07, R08, R11.
*Accept when:* D4 shows cycle return end to end; D5 shows meal suggestion with the safe-ingredient rule, first-food prompt and reaction flow including the emergency branch.

**Phase 4: Depth and polish.** B09 to B11, B15, B16, B18 to B23, B27, B28, B30, B32, B33, B01, B35, B34 (UI only), B36; accessibility pass.
*Accept when:* the accessibility checklist passes and every screen has empty, populated and error states.

### 16.5 Definition of done (per screen)
Matches Figma; uses only shared components; all states covered; strings in the strings file; screen-reader labels present; no emoji; Playwright screenshot committed; any health copy passes lint and is marked if it needs clinical review.

### 16.6 Instrumentation for the case study
Record (locally, no external analytics) time-to-log per action and number of taps. This turns the "under 10 seconds" principle into a measured result for the portfolio.

---

## 17. Known inconsistencies and open questions

### 17.1 Inconsistencies in the current Figma frames (resolve before or during Phase 0)
1. **Week counts disagree** on the Me screen: header pill says "Week 7" while the week card says "Wk 3" and "Week 3 Postpartum".
2. **Child ages disagree** across frames on the same date (for example 5 months 5 days on the newborn Today versus a newborn-stage layout elsewhere). Newborn and postpartum-week states need one consistent timeline per persona.
3. **Pregnancy dates disagree:** "Thursday 27 August, Week 22, Due 5 September, eighteen weeks to go" does not add up (a 5 September due date is about a week away).
4. **Subject label:** the child chip is the child's name but the mother is "Me" in some places and "You" in others. Pick one.
5. **Toddler Today still leads with "since last feed"** on the child card. Under the age-adaptive decision, meal planning should be the primary element at this stage, with feed rows secondary.
6. **Hydration units** differ between an earlier concept (litres) and the current frames (glasses of eight).

### 17.2 Decisions still open
1. **Ask AI as a tab vs. ambient-only AI.** The Figma keeps the tab. Confirm the scoped role in section 12, or remove the tab.
2. Where does **Settings** live? Proposed: gear in the Me header.
3. Does "**Week N postpartum**" expire, and when does Me return to a plain cycle-tracking state?
4. Age-driven, usage-driven or manual **stage adaptation** (default in section 13).
5. **Partner sharing scope** ("Shared with" appears in the pregnancy checklist): read-only view, shared logging, or UI mock only.
6. Feed "+" flow: keep the type chooser, or open the last-used sheet directly?
7. Escalation card visual style (needs a Figma design).
8. **Clinical review** of: escalation copy, the three-signs guidance, week reading content, milestone check schedule, vaccination schedule and the lactation line in R01.
9. **Formula tin window:** the default is 45 days as specified by the product owner. Confirm it against the labels of the products she uses, since many products state a different period after opening. Decide whether the default should follow the brand when a brand is entered (a small config table) or stay a single editable default.
10. Should a discarded tin ever prompt a "restock" nudge? Proposed: no, to avoid shopping-adjacent behaviour.

---

## Appendix A: Copy bank (seed examples that pass the rules)
- "Three feeds logged since 5am, and no water yet today."
- "You've slept under six hours four nights running. Nothing to do with this. Just worth knowing."
- "Spotting has eased for three days."
- "Your practice contractions moved from eleven minutes apart to seven over the last two days. Not a signal on its own. Timing them properly is one tap away."
- "Curd introduced today. No reaction yet."
- "Ingredients already introduced safely."
- "Has your period come back? Most first periods land between two and twelve months. When yours does, cycle tracking opens up here."
- "Nothing here is required to keep using Weave."
- "Too early to estimate. Postpartum cycles are often irregular."
- "The open formula tin is due to be discarded by 17 October." / "Opened 2 September. Five days left."
- "The open formula tin is due to be discarded today."
- "Use or discard by 17 October."

## Appendix B: Out of scope, recorded for later
Twins and multiples (side-by-side same-stage view and the sibling-comparison guardrail), trying-to-conceive stage, community, shopping, wearables, multi-caregiver live sync.
