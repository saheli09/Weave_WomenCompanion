import type { ReactNode } from 'react';
import { SubjectChip } from './Chip';

/** ActivityTimeline (7.5): rows with subject chip, event text, time; "All" link in the section header. */

export interface TimelineItem {
  id: string;
  subject: { kind: 'child' | 'her'; label: string };
  text: string;
  time: string;
  onClick?: () => void;
  a11y?: string;
}

export function ActivityTimeline({ items, empty }: { items: TimelineItem[]; empty?: ReactNode }) {
  if (!items.length) return <>{empty}</>;
  return (
    <ol className="flex w-full flex-col rounded-list bg-surface px-2.5">
      {items.map((i) => {
        const row = (
          <>
            <span className="grid min-w-0 grid-cols-[64px_1fr] items-center gap-x-3">
              <span className="flex">
                <SubjectChip kind={i.subject.kind} label={i.subject.label} />
              </span>
              <span className="truncate font-sans text-[13px] font-medium leading-6 text-ink">{i.text}</span>
            </span>
            <time className="shrink-0 font-sans text-[11px] text-ink-2">{i.time}</time>
          </>
        );
        const cls = 'flex min-h-[48px] w-full items-center justify-between gap-2 py-3 text-left';
        return (
          <li key={i.id}>
            {i.onClick ? (
              <button type="button" onClick={i.onClick} className={cls} aria-label={i.a11y ?? `${i.subject.label}, ${i.text}, ${i.time}`}>
                {row}
              </button>
            ) : (
              <div className={cls}>{row}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
