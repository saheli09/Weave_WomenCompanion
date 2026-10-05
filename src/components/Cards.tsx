import type { ReactNode } from 'react';
import type { Review } from '../content/copy';
import { Chevron, Plus } from './Icon';
import { ReviewFlag, ReviewTag, useReviewMarkers } from './ReviewFlag';

function RowReview({ review }: { review: Review }) {
  return useReviewMarkers() ? (
    <span>
      <ReviewTag review={review} />
    </span>
  ) : null;
}

/* ---------------------------------------------------------------------------
 * SubjectCard + KPIRow (7.5). Avatar and name; big serif KPI; "+" affordance;
 * two secondary rows. Rows are 44px tall (Figma 32px) to meet the tap target;
 * logged in docs/FIGMA-DEVIATIONS.md.
 * ------------------------------------------------------------------------- */

export function Avatar({ src, name, size = 22 }: { src?: string; name: string; size?: number }) {
  return src ? (
    <img src={src} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span aria-hidden className="grid shrink-0 place-items-center rounded-full bg-line font-sans text-[10px] font-semibold text-ink-2" style={{ width: size, height: size }}>
      {name.slice(0, 1)}
    </span>
  );
}

export interface KPI {
  value: string;
  caption: string;
  onAdd?: () => void;
  addLabel?: string;
}

export function SubjectCard({ name, avatar, kpi, rows, className = '' }: { name: string; avatar?: string; kpi: KPI; rows: ReactNode; className?: string }) {
  return (
    <section aria-label={name} className={`flex min-w-0 flex-1 flex-col rounded-card bg-surface p-4 ${className}`}>
      <div className="flex items-center gap-2">
        <Avatar src={avatar} name={name} />
        <h2 className="type-name truncate text-ink">{name}</h2>
      </div>
      <div className="flex flex-col gap-0.5 py-3">
        <div className="flex items-center justify-between">
          <p className="type-kpi whitespace-nowrap text-ink">{kpi.value}</p>
          {kpi.onAdd ? (
            <button type="button" onClick={kpi.onAdd} aria-label={kpi.addLabel} className="-mr-3 grid size-11 place-items-center text-ink-4">
              <Plus size={13} />
            </button>
          ) : null}
        </div>
        <p className="type-caption text-ink-2" style={{ fontSize: 11 }}>
          {kpi.caption}
        </p>
      </div>
      <div aria-hidden className="h-px w-full bg-line" />
      <div className="flex flex-col pt-1.5">{rows}</div>
    </section>
  );
}

export function KPIRow({ label, value, muted, onAdd, addLabel }: { label: string; value: string; muted?: boolean; onAdd?: () => void; addLabel?: string }) {
  const content = (
    <>
      <span className="type-secondary text-ink-2">{label}</span>
      <span className="flex items-center gap-1">
        <span className={`type-secondary font-semibold ${muted ? 'text-ink-3' : 'text-ink'}`}>{value}</span>
        {onAdd ? <Plus size={9} className="text-ink-4" /> : null}
      </span>
    </>
  );
  return onAdd ? (
    <button type="button" onClick={onAdd} aria-label={addLabel ? `${addLabel}. ${label}: ${value}` : undefined} className="flex min-h-[44px] w-full items-center justify-between text-left">
      {content}
    </button>
  ) : (
    <div className="flex min-h-[44px] w-full items-center justify-between">{content}</div>
  );
}

/* ---------------------------------------------------------------------------
 * ListCard / ListRow (7.5). Divided rows; chevron, dot and value variants;
 * "Add something you take +" footer row.
 * ------------------------------------------------------------------------- */

export function SectionLabel({ children, right, id }: { children: ReactNode; right?: ReactNode; id?: string }) {
  return (
    <div className="flex w-full items-center justify-between">
      <h2 id={id} className="type-micro text-ink-3">
        {children}
      </h2>
      {right}
    </div>
  );
}

export function Section({ label, right, children, review }: { label: string; right?: ReactNode; children: ReactNode; review?: Review }) {
  const id = `sec-${label.toLowerCase().replace(/\W+/g, '-')}`;
  return (
    <section aria-labelledby={id} className="flex w-full flex-col gap-4">
      <SectionLabel id={id} right={right}>
        {label}
      </SectionLabel>
      <ReviewFlag review={review}>{children}</ReviewFlag>
    </section>
  );
}

export function ListCard({ children, radius = 'card', className = '' }: { children: ReactNode; radius?: 'card' | 'list'; className?: string }) {
  return (
    <ul className={`flex w-full flex-col bg-surface px-4 ${radius === 'card' ? 'rounded-card' : 'rounded-list'} [&>li+li]:border-t [&>li+li]:border-line ${className}`}>
      {children}
    </ul>
  );
}

export function ListRow({
  label,
  sublabel,
  value,
  leading,
  dot,
  chevron,
  onClick,
  a11yLabel,
  size = 'md',
  muted,
  review,
}: {
  label: ReactNode;
  sublabel?: ReactNode;
  value?: ReactNode;
  leading?: ReactNode;
  dot?: 'coral' | 'grey';
  chevron?: boolean;
  onClick?: () => void;
  a11yLabel?: string;
  size?: 'md' | 'lg';
  muted?: boolean;
  review?: Review;
}) {
  const body = (
    <>
      <span className="flex min-w-0 items-center gap-2.5">
        {dot ? <span aria-hidden className={`size-2 shrink-0 rounded-full ${dot === 'coral' ? 'bg-coral-dot' : 'bg-line'}`} /> : null}
        {leading}
        <span className="flex min-w-0 flex-col gap-[5px]">
          <span className={size === 'lg' ? `type-row ${muted ? 'text-ink-3' : 'text-ink'}` : `type-secondary font-semibold ${muted ? 'font-medium text-ink-3' : 'text-ink'}`}>{label}</span>
          {sublabel ? <span className="font-sans text-[10px] font-medium text-ink-2">{sublabel}</span> : null}
          {review ? <RowReview review={review} /> : null}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {value !== undefined ? <span className={size === 'lg' ? 'type-body text-ink-2' : 'type-secondary text-ink-2'}>{value}</span> : null}
        {chevron ? <Chevron className="text-ink-4" /> : null}
      </span>
    </>
  );
  const cls = `flex w-full items-center justify-between gap-3 text-left ${size === 'lg' ? 'min-h-[52px]' : 'min-h-[44px] py-4'}`;
  return (
    <li>
      {onClick ? (
        <button type="button" onClick={onClick} aria-label={a11yLabel} className={cls}>
          {body}
        </button>
      ) : (
        <div className={cls}>{body}</div>
      )}
    </li>
  );
}

export function AddRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <li>
      <button type="button" onClick={onClick} className="flex min-h-[44px] w-full items-center justify-between py-4 text-left">
        <span className="font-sans text-[12px] font-medium text-ink-3">{label}</span>
        <Plus size={10} className="text-ink-4" />
      </button>
    </li>
  );
}

/* ---------------------------------------------------------------------------
 * ChecklistRow (7.5): circle check, label, value. Used for signs and medicines.
 * ------------------------------------------------------------------------- */

export function CheckCircle({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={`grid size-[15px] shrink-0 place-items-center rounded-full border ${checked ? 'border-olive-500 bg-olive-500' : 'border-ink-4 bg-transparent'}`}
    />
  );
}

export function ChecklistRow({
  checked,
  label,
  sublabel,
  value,
  onToggle,
  onOpen,
  openLabel,
  a11yLabel,
  dense,
}: {
  checked: boolean;
  label: ReactNode;
  sublabel?: ReactNode;
  value: ReactNode;
  onToggle?: () => void;
  /** Tapping the text opens details (edit); the circle stays the toggle. */
  onOpen?: () => void;
  openLabel?: string;
  a11yLabel?: string;
  dense?: boolean;
}) {
  if (onToggle && onOpen) {
    return (
      <li className="flex min-h-[44px] items-center gap-0 py-1.5">
        <button type="button" role="checkbox" aria-checked={checked} aria-label={a11yLabel} onClick={onToggle} className="-ml-3 grid size-11 shrink-0 place-items-center">
          <CheckCircle checked={checked} />
        </button>
        <button type="button" onClick={onOpen} aria-label={openLabel} className="flex min-h-[44px] min-w-0 flex-1 items-center justify-between gap-3 py-2 pl-0.5 text-left">
          <span className="flex min-w-0 flex-col gap-[5px]">
            <span className="font-sans text-[13px] font-semibold text-ink">{label}</span>
            {sublabel ? <span className="font-sans text-[10px] font-medium text-ink-2">{sublabel}</span> : null}
          </span>
          <span className="type-secondary shrink-0 text-ink-2">{value}</span>
        </button>
      </li>
    );
  }
  const body = (
    <>
      <span className="flex min-w-0 items-center gap-2.5">
        <CheckCircle checked={checked} />
        <span className="flex min-w-0 flex-col gap-[5px]">
          <span className={`font-sans ${dense ? 'text-[12px]' : 'text-[13px]'} ${checked ? 'font-semibold text-ink' : dense ? 'text-ink-2' : 'font-semibold text-ink'}`}>{label}</span>
          {sublabel ? <span className="font-sans text-[10px] font-medium text-ink-2">{sublabel}</span> : null}
        </span>
      </span>
      <span className="type-secondary shrink-0 text-ink-2">{value}</span>
    </>
  );
  const cls = `flex w-full items-center justify-between gap-3 text-left ${dense ? 'min-h-[44px] py-1' : 'min-h-[44px] py-4'}`;
  return (
    <li>
      {onToggle ? (
        <button type="button" role="checkbox" aria-checked={checked} aria-label={a11yLabel} onClick={onToggle} className={cls}>
          {body}
        </button>
      ) : (
        <div className={cls} aria-label={a11yLabel}>
          {body}
        </div>
      )}
    </li>
  );
}

/* ---------------------------------------------------------------------------
 * ReadingCard (7.5): muted beige, category micro label, serif headline, body.
 * ------------------------------------------------------------------------- */

export function ReadingCard({ category, headline, body, review }: { category: string; headline: string; body: string; review?: Review }) {
  return (
    <ReviewFlag review={review} className="rounded-card">
      <article className="flex w-full flex-col gap-4 rounded-card bg-surface-muted p-5">
        <span className="type-micro text-ink-2">{category}</span>
        <div className="flex flex-col gap-2">
          <h3 className="type-insight-sm text-ink">{headline}</h3>
          <p className="type-body text-ink-2">{body}</p>
        </div>
      </article>
    </ReviewFlag>
  );
}

/* ---------------------------------------------------------------------------
 * ContextCard: white card with optional tag row, serif title, muted line and
 * actions. Today's meal, new-food prompt, Labour mode card, Around now.
 * ------------------------------------------------------------------------- */

export function ContextCard({
  tag,
  title,
  body,
  actions,
  titleStyle = 'insight',
  review,
}: {
  tag?: string;
  title: ReactNode;
  body?: ReactNode;
  actions?: ReactNode;
  titleStyle?: 'insight' | 'card' | 'prompt' | 'question';
  review?: Review;
}) {
  const titleCls = { insight: 'type-insight', card: 'type-card-title', prompt: 'type-prompt', question: 'type-insight text-[22px]' }[titleStyle];
  return (
    <ReviewFlag review={review} className="rounded-card">
      <article className="flex w-full flex-col gap-4 rounded-card bg-surface p-5">
        {tag ? (
          <div className="flex items-center gap-1.5">
            <span aria-hidden className="size-1.5 rounded-full bg-ink-3" />
            <span className="type-micro text-ink-2">{tag}</span>
          </div>
        ) : null}
        <div className="flex flex-col gap-1">
          <h3 className={`${titleCls} text-ink`}>{title}</h3>
          {body ? <div className="type-secondary text-ink-3">{body}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-4">{actions}</div> : null}
      </article>
    </ReviewFlag>
  );
}
