import type { ElementType } from 'react';
import { fmt, type CopyEntry } from '../content/copy';
import { ReviewTag, useReviewMarkers } from './ReviewFlag';

/** Renders a CopyEntry and, when it carries a review flag, the dev marker after it. */
export function Copy({
  entry,
  params,
  as: Tag = 'span',
  className,
}: {
  entry: CopyEntry;
  params?: Record<string, string | number>;
  as?: ElementType;
  className?: string;
}) {
  const markers = useReviewMarkers();
  return (
    <Tag className={className}>
      {fmt(entry, params)}
      {entry.review && markers ? (
        <>
          {' '}
          <ReviewTag review={entry.review} />
        </>
      ) : null}
    </Tag>
  );
}

export const t = (entry: CopyEntry, params?: Record<string, string | number>) => fmt(entry, params);
