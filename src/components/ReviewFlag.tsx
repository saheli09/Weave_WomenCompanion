import type { ReactNode } from 'react';
import type { Review } from '../content/copy';
import { S } from '../content/strings';
import { useWeave } from '../state/store';

/**
 * Dev-only marker for copy or content that needs review before real use
 * (PRD 0.4, 9.x "needs clinical review"). Shown by default; the demo panel can
 * hide it for clean screenshots. Styled as an annotation, not as product UI.
 */

const LABEL: Record<Review['kind'], string> = {
  clinical: S.reviewClinical.text,
  lactation: 'Needs lactation review',
  perinatal: 'Needs perinatal review',
  product: S.reviewOther.text,
  design: 'Design addition, needs review',
};

export function useReviewMarkers(): boolean {
  return useWeave((s) => s.demo.reviewMarkers);
}

export function ReviewTag({ review }: { review: Review }) {
  return (
    <span
      data-review={review.kind}
      title={review.note}
      className="inline-flex items-center gap-1 rounded-[4px] border border-dashed border-review-line bg-review-bg px-1.5 py-[1px] align-middle font-sans text-[9px] font-semibold uppercase leading-[14px] tracking-[0.04em] text-review-fg not-italic"
    >
      {LABEL[review.kind]} · PRD {review.ref}
    </span>
  );
}

/** Outlines a whole block (card, list) that needs review. */
export function ReviewFlag({ review, children, className = '' }: { review?: Review; children: ReactNode; className?: string }) {
  const on = useReviewMarkers();
  if (!review || !on) return <>{children}</>;
  return (
    <div className={`relative rounded-[inherit] outline-2 outline-offset-2 outline-dashed outline-review-line ${className}`}>
      <div className="absolute -top-2.5 right-2 z-10">
        <ReviewTag review={review} />
      </div>
      {children}
    </div>
  );
}
