import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { BottomSheet } from '../components/Sheet';
import { Copy } from '../components/Copy';
import { ReviewTag, useReviewMarkers } from '../components/ReviewFlag';
import { S } from '../content/strings';
import { fmt } from '../content/copy';
import { SUPPORT } from '../content/support';
import { useDomain } from '../state/store';

/**
 * Provider-contact card (B37), reused by every escalation (11.3) and by
 * Labour mode's persistent "Call your provider". Always names a human.
 */

const Ctx = createContext<(kind?: 'provider' | 'support') => void>(() => {});

const callCls = 'flex h-14 w-full items-center justify-center rounded-pill font-sans text-[16px] font-semibold';

export function ProviderSheetProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [support, setSupport] = useState(false);
  const show = useCallback((kind: 'provider' | 'support' = 'provider') => {
    setSupport(kind === 'support');
    setOpen(true);
  }, []);
  const state = useDomain();
  const markers = useReviewMarkers();
  const provider = state.her.provider;
  return (
    <Ctx.Provider value={show}>
      {children}
      <BottomSheet open={open} onOpenChange={setOpen} title={S.providerTitle.text}>
        <div className="flex flex-col gap-4 pb-2">
          {provider?.phone ? (
            <>
              <a href={`tel:${provider.phone.replace(/\s/g, '')}`} className={`${callCls} bg-ink text-surface`}>
                {fmt(S.providerCall, { name: provider.name })}
              </a>
              <p className="font-sans text-[13px] text-ink-2 tabular-nums">
                {provider.phone} <Copy entry={S.providerPlaceholderNumber} className="block" />
              </p>
            </>
          ) : (
            <p className="type-body text-ink-2">{S.providerNoNumber.text}</p>
          )}
          <div className="h-px bg-line" />
          {support ? (
            <a href={`tel:${SUPPORT.mentalHealth.number}`} className={`${callCls} border border-ink-faint text-ink`}>
              {SUPPORT.mentalHealth.label} · {fmt(S.providerEmergencyCall, { number: SUPPORT.mentalHealth.number })}
            </a>
          ) : null}
          <a href={`tel:${SUPPORT.emergency.number}`} className={`${callCls} border border-ink-faint text-ink`}>
            {S.providerEmergency.text} · {fmt(S.providerEmergencyCall, { number: SUPPORT.emergency.number })}
          </a>
          {markers ? (
            <span>
              <ReviewTag review={SUPPORT.review} />
            </span>
          ) : null}
        </div>
      </BottomSheet>
    </Ctx.Provider>
  );
}

export const useProviderSheet = () => useContext(Ctx);
