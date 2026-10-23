import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isSameDay, subDays } from 'date-fns';
import { S } from '../../content/strings';
import { fmt } from '../../content/copy';
import { FilterChip } from '../../components/Chip';
import { ActivityTimeline } from '../../components/Timeline';
import { EmptyState } from '../../components/States';
import { formatLongDate } from '../../domain/dates';
import { useDomain } from '../../state/store';
import { useNow } from '../../state/clock';
import { timelineDays } from '../../state/selectors';
import { EditLogSheet } from './EditLogSheet';

/** Full timeline (9.1 "All"): last seven days, filter chips All / child / Me, tap a row to edit or delete. */
export function TimelineScreen() {
  const state = useDomain();
  const now = useNow();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'her' | string>('all');
  const [editing, setEditing] = useState<string | null>(null);
  const groups = timelineDays(state, now, 7, filter);
  const dayLabel = (d: Date) => (isSameDay(d, now) ? S.timelineToday.text : isSameDay(d, subDays(now, 1)) ? S.timelineYesterday.text : formatLongDate(d));
  return (
    <div className="flex flex-col gap-6" data-screen="timeline">
      <div className="flex flex-col gap-5">
        <button type="button" onClick={() => navigate(-1)} className="hit-44 self-start type-micro text-ink-3">
          ‹ {S.back.text}
        </button>
        <h1 className="type-greeting text-ink">{S.timelineTitle.text}</h1>
      </div>
      <div role="group" aria-label={S.timelineFilterA11y.text} className="-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none]">
        <FilterChip selected={filter === 'all'} onClick={() => setFilter('all')}>
          {S.all.text}
        </FilterChip>
        {state.children.map((c) => (
          <FilterChip key={c.id} selected={filter === c.id} onClick={() => setFilter(c.id)}>
            {c.name}
          </FilterChip>
        ))}
        <FilterChip selected={filter === 'her'} onClick={() => setFilter('her')}>
          {S.herChip.text}
        </FilterChip>
      </div>
      {groups.length ? (
        groups.map((g) => (
          <section key={g.day.toDateString()} className="flex flex-col gap-3" aria-label={dayLabel(g.day)}>
            <h2 className="type-micro text-ink-3">{dayLabel(g.day)}</h2>
            <ActivityTimeline items={g.items.map((i) => ({ ...i, onClick: () => setEditing(i.id), a11y: fmt(S.editEntryA11y, { what: i.text, time: i.time }) }))} />
          </section>
        ))
      ) : (
        <EmptyState line={S.timelineEmpty.text} />
      )}
      <EditLogSheet id={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
