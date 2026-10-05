# Figma deviations log

Places where the build intentionally differs from the Figma file
(`FKBMLz8bDa0MlkDv1G582L`). Each entry has the agreed reason. PRD 0.1: Figma
wins for visuals, the PRD for behaviour, and conflicts are logged here.

## Tokens (decision 2026-10-01: consolidate drift, fix text to WCAG AA)

| Token | Figma | Build | Why |
|---|---|---|---|
| ink | #2C2523, #262220, #2A3531, #4C4546, #3C2A21, #1A1C1C | #2C2523 | Consolidated near-identical inks |
| ink-2 | #756B67, #7A7270, #7A746E, #7D7571, #6B7280 | #716763 | #756B67 was 4.40:1 on reading cards |
| ink-3 | #A89F9A, #9A9388, #B7B0AB, #A8A7A7, #847D75 | #7B706A | #A89F9A was 2.45:1 on the background |
| Active tab | #E37D80 label and icon | label #C4504A, icon #E17478 | 2.80:1; label needs 4.5, icon 3 |
| Child chip text | #3373BF | #306BB2 | 4.03:1 |
| Week ring | #7C9082 | olive #7B8F6A | Consolidated |
| Fonts | Lora, Newsreader, Inter, Figtree | Lora, Inter | Consolidated |

**Open, not changed:** the FAB's white "+" on the coral gradient is 2.1:1 to 2.8:1 (needs 3:1). It's the most visible brand element, so it's left for a design decision. A test records it as a known issue.

## Layout

- KPI rows on subject cards are 44px tall (Figma: 32px), for the tap target.
- Mood chips on the Me tile are 44px tall (Figma: 22px).
- Carousel dots are indicators only. 6px dots can't be 44px targets, so swiping does the navigating.
- Reference viewport is 402 x 874 (the Figma frame). The PRD said 390.
- **Pregnancy Today has a Mood row** below the insights (decision 2026-10-05). It isn't in the week-22 frame. Without it, mood took three taps through the FAB; the row makes it two.
- **Labour mode hides the bottom nav and FAB** (PRD 9.6: "strips the app to the timer and a note field"). The S10 and S11 frames still show the nav.
- Labour summary adds two rows under "Baby is here": a persistent "Call your provider" (a PRD design addition, marked) and "Add a note". Exit asks once before leaving.
- The S11 dial view keeps the date label from the frame. The summary uses the "Labour mode · elapsed" header.
- Birth details (S12): rows edit inline with an input and a "Done" action. Empty Where shows "Add a place". The same screen edits an existing birth (from "Finish your birth details"), titled "Birth details" with a plain Save.
- Handoff (B02), Something has changed (B31) and the pregnancy-ended screen aren't in Figma. They're built from existing patterns, and the loss path uses neutral ink buttons, not sage.
- Coming up gets an "Add an appointment" footer row, and the This-week rows toggle in one tap. Neither appears in Figma.

## Copy

- Me week card: "You are doing beautifully. Keep prioritizing rest and hydration today." This is praise plus an instruction. It's replaced with a neutral line marked for review.
- R01 body: the unsupported lactation claim is replaced (PRD 11.4).
- R04: "Week seven usually looks like this." is dropped because it reads as reassurance.
- Toddler insight "Staying hydrated helps ease menstrual cramping" is a health claim. It's softened and marked for review (R03).
- Labour summary third stat is labelled "Logged" in Figma; the build uses "average length".
- "2 out 4" in Figma reads "2 of 4", matching "1 of 8".

## Data in the frames

- "Monday 12 September" is a Saturday in 2026. The appointment is seeded on Monday 14 September.
- "Dr. Mohua" and "Mahua" both appear. The build uses Mahua.
- Pregnancy: "Week 22, due 5 September". The due date is now 31 December (17.1 #3).
- Newborn Today: "Three feeds, no water" next to "1 of 8 glasses". The D3 seed has no water, so R01 can fire.
- Cipcal 10:45am is after the 10:30 anchor, so the seed uses 9:45am.

## Missing in Figma

- Quick-log icons for Water (the Me hydration icon is reused), Bleeding, Medicine, Symptom, Weight, Note and Formula opened. These show a dashed placeholder.
- Escalation card style (PRD 7.1 design addition).
- Medicine add/edit sheet (B29), appointment sheet (B30), and the Symptom, Weight and Note sheets (B28), built from the existing sheet, chip and list patterns.
