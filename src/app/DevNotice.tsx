import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

/**
 * Dev-only notice for controls whose behaviour lands in a later build phase.
 * Styled as an annotation (review colours), so it never reads as product UI.
 */

type Notify = (what: string, phase: number) => void;
const Ctx = createContext<Notify>(() => {});

export function DevNoticeProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const notify = useCallback<Notify>((what, phase) => {
    setMsg(`${what} is not built yet (planned: ${phase <= 4 ? `step or phase ${phase}` : `later`}).`);
    window.setTimeout(() => setMsg(null), 2200);
  }, []);
  return (
    <Ctx.Provider value={notify}>
      {children}
      {msg ? (
        <div role="status" className="pointer-events-none absolute top-14 left-1/2 z-[60] -translate-x-1/2 rounded-[6px] border border-dashed border-review-line bg-review-bg px-3 py-2 font-sans text-[12px] font-medium whitespace-nowrap text-review-fg shadow-sheet">
          {msg}
        </div>
      ) : null}
    </Ctx.Provider>
  );
}

export const useDevNotice = () => useContext(Ctx);
