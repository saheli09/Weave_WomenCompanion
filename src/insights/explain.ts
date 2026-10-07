import { differenceInMinutes, isSameDay, subDays } from 'date-fns';
import { copy, type CopyEntry } from '../content/copy';
import { formatDayMonth, formatDuration, formatLongDate, formatTime, formulaDaysLeft, parseDate } from '../domain/dates';
import { labourStats, practiceGapsByDay, formatSeconds } from '../domain/labour';
import type { DomainState, LogEntry } from '../domain/types';
import { dailyBleeding, pelvicSetsThisWeek, PELVIC_WEEKLY_TARGET } from './rules';
import { doseSlotsToday, timelineText } from '../state/selectors';

/**
 * "Why am I seeing this?" (B32, 11.5): the rule in plain words and the data
 * behind it. Plain-word rules are copy and pass the lint.
 */
export const RULE_WORDS: Record<string, CopyEntry> = {
  R01: copy('Shown when three or more feeds are logged since 5am and no water is logged today.', 'body'),
  R02: copy('Shown after 3pm when fewer than half of your daily glasses are logged.', 'body'),
  R03: copy('Shown on the first three days of a period you logged, with today’s water count.', 'body'),
  R04: copy('Shown when each of the last three days has lighter bleeding than the day before them.', 'body'),
  R05: copy('Shown when your own sleep logs are under six hours on each of the last four nights.', 'body'),
  R06: copy('Shown when today differs by a quarter or more from this child’s own last seven days. Never compared with anyone else.', 'body'),
  R09: copy('Shown ninety minutes after a scheduled dose time if that dose is not ticked.', 'body'),
  R10: copy('Shown from Thursday when pelvic floor sets this week are below five.', 'body'),
  R12: copy('Shown from week thirty-seven when the average gap between practice contractions shrinks by two minutes or more over recent days.', 'body'),
  R13: copy('Shown in Labour mode when all three signs have been met.', 'body'),
  R14: copy('Shown after Heavy bleeding is logged in the weeks after birth.', 'body'),
  R15: copy('Shown when Low mood is the last check-in on three days in a row.', 'body'),
  R16: copy('Shown in the last seven days before an open tin’s discard date.', 'body'),
  R17: copy('Shown after an open tin passes its discard date, until you mark it finished or discarded.', 'body'),
};

export interface ExplainRow {
  label: string;
  value: string;
}

const herOrChild = (l: LogEntry) => l.subject.kind;

export function explainData(ruleId: string, state: DomainState, now: Date): ExplainRow[] {
  const logs = state.logs.filter((l) => parseDate(l.at) <= now);
  const today = logs.filter((l) => isSameDay(parseDate(l.at), now));
  const rows = (ls: LogEntry[]) => ls.sort((a, b) => (a.at < b.at ? 1 : -1)).map((l) => ({ label: formatTime(l.at), value: timelineText(l, state) }));
  switch (ruleId) {
    case 'R01': {
      const from = new Date(now);
      from.setHours(5, 0, 0, 0);
      return [...rows(logs.filter((l) => l.type === 'feed' && herOrChild(l) === 'child' && parseDate(l.at) >= from)), { label: 'Water today', value: String(today.filter((l) => l.type === 'water').length) }];
    }
    case 'R02':
    case 'R03':
      return rows(today.filter((l) => l.type === 'water' || l.type === 'period'));
    case 'R04':
      return dailyBleeding(state, now, 4).map((lvl, i) => ({ label: i ? formatLongDate(subDays(now, i)) : 'Today', value: lvl ?? 'None logged' }));
    case 'R05':
      return [0, 1, 2, 3].map((i) => {
        const d = subDays(now, i);
        const mins = logs.reduce((m, l) => (l.type === 'sleep' && l.subject.kind === 'her' && l.end && isSameDay(parseDate(l.end), d) ? m + differenceInMinutes(parseDate(l.end), parseDate(l.start)) : m), 0);
        return { label: formatLongDate(d), value: mins ? formatDuration(mins) : 'None logged' };
      });
    case 'R06':
      return [0, 1, 2, 3, 4, 5, 6].map((i) => {
        const d = subDays(now, i);
        return { label: i ? formatLongDate(d) : 'Today', value: `${logs.filter((l) => l.type === 'feed' && herOrChild(l) === 'child' && isSameDay(parseDate(l.at), d)).length} feeds` };
      });
    case 'R09':
      return doseSlotsToday(state, now, { kind: 'her' }).map((s) => ({ label: `${s.medicine.name}, ${s.label}`, value: s.takenAt ? formatTime(s.takenAt) : 'Not ticked' }));
    case 'R10':
      return [{ label: 'Sets this week', value: `${pelvicSetsThisWeek(state, now)} of ${PELVIC_WEEKLY_TARGET}` }];
    case 'R12':
      return practiceGapsByDay(state.logs, now).map((d) => ({ label: d.day, value: `${Math.round(d.avgGapMin)} minutes apart on average` }));
    case 'R13': {
      const st = labourStats(state.her.pregnancy?.labour?.contractions ?? [], now);
      return [
        { label: 'Average gap', value: st.avgGapSec ? formatSeconds(st.avgGapSec) : '--' },
        { label: 'Average length', value: st.avgDurationSec ? formatSeconds(st.avgDurationSec) : '--' },
        { label: 'Holding for', value: `${Math.round(st.holdingMin)}m` },
      ];
    }
    case 'R14':
      return rows(logs.filter((l) => l.type === 'bleeding' && now.getTime() - parseDate(l.at).getTime() < 864e5));
    case 'R15':
      return rows(logs.filter((l) => l.type === 'mood' && now.getTime() - parseDate(l.at).getTime() < 3 * 864e5));
    case 'R16':
    case 'R17':
      return state.formulaPacks
        .filter((p) => p.status === 'active')
        .map((p) => ({ label: `Tin opened ${formatDayMonth(p.openedOn)}`, value: `discard by ${formatDayMonth(p.discardBy)}, ${formulaDaysLeft(p.discardBy, now)} days left` }));
    default:
      return [];
  }
}
