import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react';

/** Form primitives shared by sheets. 44px fields, visible labels, inline errors (no modals). */
export const fieldCls =
  'min-h-[44px] w-full rounded-tile border border-line bg-surface px-3 font-sans text-[15px] text-ink placeholder:text-ink-3 focus:border-ink focus:outline-none aria-[invalid=true]:border-terracotta';
export const labelCls = 'font-sans text-[13px] font-semibold text-ink';

export function FieldError({ id, children }: { id?: string; children?: ReactNode }) {
  if (!children) return null;
  return (
    <span id={id} role="alert" className="font-sans text-[12px] font-medium text-terracotta-ink">
      {children}
    </span>
  );
}

/**
 * The label names the control; hint and error are linked as descriptions, so a
 * screen reader hears "What, edit text. Add what the appointment is for." and
 * the field's name stays stable.
 */
export function Field({ label, hint, error, children }: { label: string; hint?: ReactNode; error?: ReactNode; children: ReactElement<Record<string, unknown>> }) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const control = isValidElement(children)
    ? cloneElement(children, { id, 'aria-describedby': [hintId, errorId].filter(Boolean).join(' ') || undefined })
    : children;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className={labelCls}>
        {label}
      </label>
      {control}
      {hint ? (
        <span id={hintId} className="font-sans text-[12px] text-ink-2">
          {hint}
        </span>
      ) : null}
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  );
}
