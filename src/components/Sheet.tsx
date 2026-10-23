import { useState, type ReactNode } from 'react';
import { Drawer } from 'vaul';
import { S } from '../content/strings';
import { Icon } from './Icon';

/**
 * BottomSheet (7.5, 10.2): handle, serif title, close (X) or "Save" top right.
 * Drag to dismiss. Unsaved changes prompt once on dismiss. Sheets render
 * inside the device frame (portal target #sheet-root) so the demo stays 1:1.
 */

export function BottomSheet({
  open,
  onOpenChange,
  title,
  subtitle,
  onSave,
  saveLabel = S.save.text,
  saveDisabled,
  dirty = false,
  children,
  container,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  onSave?: () => void;
  saveLabel?: string;
  saveDisabled?: boolean;
  dirty?: boolean;
  children: ReactNode;
  container?: HTMLElement | null;
}) {
  const [confirming, setConfirming] = useState(false);
  const requestClose = (next: boolean) => {
    if (!next && dirty && !confirming) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    onOpenChange(next);
  };
  const portal = container ?? (typeof document !== 'undefined' ? document.getElementById('sheet-root') : null);
  return (
    <Drawer.Root open={open} onOpenChange={requestClose} container={portal ?? undefined}>
      <Drawer.Portal container={portal ?? undefined}>
        <Drawer.Overlay className="absolute inset-0 z-40 bg-ink/30" />
        <Drawer.Content
          aria-describedby={subtitle ? undefined : undefined}
          className="absolute inset-x-0 bottom-0 z-50 flex max-h-[92%] flex-col rounded-t-sheet bg-surface px-5 pb-8 shadow-sheet outline-none"
        >
          <div className="flex flex-col items-center pt-2 pb-4">
            <Drawer.Handle className="!mt-2 !mb-4 !h-1.5 !w-12 !rounded-[12px] !bg-handle !opacity-100" />
            <div className="flex w-full items-center justify-between">
              <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
                <Drawer.Title className="type-sheet-title text-ink">{title}</Drawer.Title>
                {subtitle ? <Drawer.Description className="font-sans text-[14px] text-ink-2">{subtitle}</Drawer.Description> : <Drawer.Description className="sr-only">{title}</Drawer.Description>}
              </div>
              {onSave ? (
                <button type="button" disabled={saveDisabled} onClick={onSave} className="grid size-11 place-items-center rounded-[12px] font-serif text-[12px] text-ink disabled:opacity-40">
                  {saveLabel}
                </button>
              ) : (
                <button type="button" onClick={() => requestClose(false)} aria-label={S.close.text} className="grid size-11 place-items-center rounded-[12px]">
                  <Icon name="close" size={14} color="var(--color-ink)" />
                </button>
              )}
            </div>
          </div>
          {confirming ? (
            <div role="alertdialog" aria-label="Discard changes?" className="mb-4 flex items-center justify-between gap-3 rounded-tile bg-surface-muted px-4 py-2">
              <span className="font-sans text-[13px] text-ink">Discard what you entered?</span>
              <span className="flex gap-2">
                <button type="button" className="min-h-[44px] px-3 font-sans text-[13px] font-semibold text-ink-2" onClick={() => setConfirming(false)}>
                  Keep editing
                </button>
                <button type="button" className="min-h-[44px] px-3 font-sans text-[13px] font-semibold text-ink" onClick={() => requestClose(false)}>
                  Discard
                </button>
              </span>
            </div>
          ) : null}
          <div className="min-h-0 overflow-y-auto">{children}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

/** Static (non-modal) rendering of the sheet chrome, for the component gallery. */
export function SheetFrame({ title, subtitle, onSave, children }: { title: string; subtitle?: string; onSave?: boolean; children: ReactNode }) {
  return (
    <div className="relative flex w-full flex-col rounded-t-sheet bg-surface px-5 pb-8 shadow-sheet">
      <div className="flex flex-col items-center pt-2 pb-4">
        <span aria-hidden className="mt-2 mb-4 h-1.5 w-12 rounded-[12px] bg-handle" />
        <div className="flex w-full items-center justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
            <h3 className="type-sheet-title text-ink">{title}</h3>
            {subtitle ? <p className="font-sans text-[14px] text-ink-2">{subtitle}</p> : null}
          </div>
          {onSave ? (
            <span className="grid size-11 place-items-center font-serif text-[12px] text-ink">{S.save.text}</span>
          ) : (
            <span className="grid size-11 place-items-center">
              <Icon name="close" size={14} color="var(--color-ink)" />
            </span>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}
