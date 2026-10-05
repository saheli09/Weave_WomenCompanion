import { useState } from 'react';
import { BottomSheet } from '../../components/Sheet';
import { TileGrid, MoodChips, type Tile } from '../../components/Controls';
import { ListCard, ChecklistRow, AddRow } from '../../components/Cards';
import { MedicineSheet } from '../medicines/MedicineSheet';
import { useDoseActions } from '../medicines/useDoseActions';
import { useHerLogs } from './useHerLogs';
import { SymptomSheet, WeightSheet, NoteSheet } from './HerLogSheets';
import { formatTimeCompact } from '../../domain/dates';
import { doseSlotsToday } from '../../state/selectors';
import { S } from '../../content/strings';
import { t } from '../../components/Copy';
import { calendarDaysBetween } from '../../domain/dates';
import { primaryChild, usesFormula } from '../../domain/stage';
import type { DomainState, LogEntry } from '../../domain/types';
import { sinceLast } from '../../state/selectors';
import { useDomain } from '../../state/store';
import { useNow } from '../../state/clock';
import { useDevNotice } from '../../app/DevNotice';
import { abandonLog, isLogging } from '../../metrics/timeToLog';

/**
 * "What just happened?" (S04). State-aware tiles (5.2), each with time since
 * the last entry. Tiles route to the type sheets in Phase 1.
 */

export function quickLogTiles(state: DomainState, now: Date, go: (id: string) => void): Tile[] {
  const child = primaryChild(state);
  const her = (type: LogEntry['type']) => (l: LogEntry) => l.subject.kind === 'her' && l.type === type;
  const kid = (type: LogEntry['type']) => (l: LogEntry) => l.subject.kind === 'child' && l.type === type;
  const tile = (id: string, icon: Tile['icon'], label: string, since: string): Tile => ({ id, icon, label, since, onClick: () => go(id) });

  if (state.her.phase === 'pregnancy') {
    return [
      tile('water', 'hydration', S.tileWater.text, sinceLast(state, now, her('water'))),
      tile('mood', 'mood', S.tileMood.text, sinceLast(state, now, her('mood'))),
      tile('symptom', 'missing', S.tileSymptom.text, sinceLast(state, now, her('symptom'))),
      tile('medicine', 'missing', S.tileMedicine.text, sinceLast(state, now, her('dose'))),
      tile('weight', 'missing', S.tileWeight.text, sinceLast(state, now, her('weight'))),
      tile('note', 'missing', S.tileNote.text, sinceLast(state, now, her('note'))),
    ];
  }

  const tiles: Tile[] = [];
  if (child) {
    tiles.push(
      tile('feed', 'feed', S.tileFeed.text, sinceLast(state, now, kid('feed'))),
      tile('diaper', 'diaper', S.tileDiaper.text, sinceLast(state, now, kid('diaper'))),
      tile('sleep', 'sleep', S.tileSleep.text, sinceLast(state, now, kid('sleep'))),
      tile('pump', 'pump', S.tilePump.text, sinceLast(state, now, her('pump'))),
    );
    if (usesFormula(state, child.id)) {
      const newest = state.formulaPacks.filter((p) => p.childId === child.id && p.status === 'active').sort((a, b) => (a.openedOn < b.openedOn ? 1 : -1))[0];
      const days = newest ? calendarDaysBetween(newest.openedOn, now) : undefined;
      tiles.push(tile('formula', 'missing', S.tileFormulaOpened.text, days === undefined ? S.tileNever.text : days === 0 ? S.tileOpenedToday.text : t(S.tileOpenedAgo, { days })));
    }
  }
  tiles.push(
    tile('water', 'hydration', S.tileWater.text, sinceLast(state, now, her('water'))),
    tile('mood', 'mood', S.tileMood.text, sinceLast(state, now, her('mood'))),
  );
  if (state.her.phase === 'postpartum') tiles.push(tile('bleeding', 'missing', S.tileBleeding.text, sinceLast(state, now, her('bleeding'))));
  tiles.push(tile('medicine', 'missing', S.tileMedicine.text, sinceLast(state, now, her('dose'))));
  return tiles;
}

export function QuickLogSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const state = useDomain();
  const now = useNow();
  const dev = useDevNotice();
  const { logWater } = useHerLogs();
  const [sub, setSub] = useState<'mood' | 'meds' | 'symptom' | 'weight' | 'note' | null>(null);

  // Built so far: pregnancy tiles (water, mood, medicine, symptom, weight, note). Postpartum tiles land with that stage.
  const tiles = quickLogTiles(state, now, (id) => {
    if (id === 'water') {
      onOpenChange(false);
      logWater('fab');
    } else if (id === 'mood' || id === 'medicine' || id === 'symptom' || id === 'weight' || id === 'note') {
      onOpenChange(false);
      setSub(id === 'medicine' ? 'meds' : id);
    } else {
      onOpenChange(false);
      abandonLog();
      dev(`The ${id} sheet`, state.her.phase === 'pregnancy' ? 2 : 1);
    }
  });
  return (
    <>
      <BottomSheet
        open={open}
        onOpenChange={(o) => {
          if (!o) abandonLog();
          onOpenChange(o);
        }}
        title={S.quickLogTitle.text}
      >
        <TileGrid tiles={tiles} />
      </BottomSheet>
      <MoodSheet open={sub === 'mood'} onOpenChange={(o) => !o && setSub(null)} />
      <DosesSheet open={sub === 'meds'} onOpenChange={(o) => !o && setSub(null)} />
      <SymptomSheet open={sub === 'symptom'} onOpenChange={(o) => !o && setSub(null)} />
      <WeightSheet open={sub === 'weight'} onOpenChange={(o) => !o && setSub(null)} />
      <NoteSheet open={sub === 'note'} onOpenChange={(o) => !o && setSub(null)} />
    </>
  );
}

/** Mood (10.1): four chips, one tap logs and closes. */
export function MoodSheet({ open, onOpenChange, entry = 'fab' }: { open: boolean; onOpenChange: (o: boolean) => void; entry?: string }) {
  const { logMood } = useHerLogs();
  return (
    <BottomSheet
      open={open}
      onOpenChange={(o) => {
        if (!o) isLogging() && abandonLog('mood');
        onOpenChange(o);
      }}
      title={S.moodSheetTitle.text}
    >
      <div className="pb-2">
        <MoodChips
          onChange={(v) => {
            logMood(v, entry);
            onOpenChange(false);
          }}
        />
      </div>
    </BottomSheet>
  );
}

/** "I took a medicine": today's scheduled doses as a checklist. */
function DosesSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const state = useDomain();
  const now = useNow();
  const { take, untake } = useDoseActions();
  const [adding, setAdding] = useState(false);
  const slots = doseSlotsToday(state, now, { kind: 'her' });
  return (
    <>
      <BottomSheet
        open={open}
        onOpenChange={(o) => {
          if (!o) isLogging() && abandonLog('dose');
          onOpenChange(o);
        }}
        title={S.medsSheetTitle.text}
      >
        <ListCard className="!px-0">
          {slots.length === 0 ? (
            <li className="flex min-h-[44px] items-center py-4">
              <span className="font-sans text-[13px] text-ink-2">{S.medsNoneToday.text}</span>
            </li>
          ) : null}
          {slots.map((s) => (
            <ChecklistRow
              key={`${s.medicine.id}-${s.slot}`}
              checked={Boolean(s.takenAt)}
              label={s.medicine.name}
              sublabel={s.label}
              value={s.takenAt ? formatTimeCompact(s.takenAt) : S.doseNotTaken.text}
              onToggle={() => {
                if (s.takenAt) untake(s.medicine.id, s.slot);
                else {
                  take(s.medicine.id, s.slot, 'fab');
                  onOpenChange(false);
                }
              }}
              a11yLabel={t(S.doseTickA11y, { name: s.medicine.name, dose: s.label, state: s.takenAt ? 'Taken' : 'Not taken yet' })}
            />
          ))}
          <AddRow
            label={S.addSomethingYouTake.text}
            onClick={() => {
              onOpenChange(false);
              setAdding(true);
            }}
          />
        </ListCard>
      </BottomSheet>
      <MedicineSheet open={adding} onOpenChange={setAdding} />
    </>
  );
}
