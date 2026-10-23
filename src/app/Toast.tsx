import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Toast } from '../components/States';

/** One toast at a time, above the nav, with an optional Undo (10.3). */
type Show = (message: string, onUndo?: () => void) => void;
const Ctx = createContext<Show>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ id: number; message: string; onUndo?: () => void } | null>(null);
  const show = useCallback<Show>((message, onUndo) => setToast({ id: Date.now(), message, onUndo }), []);
  const done = useCallback(() => setToast(null), []);
  return (
    <Ctx.Provider value={show}>
      {children}
      {toast ? (
        <div className="absolute inset-x-5 bottom-[100px] z-[35]" key={toast.id}>
          <Toast
            message={toast.message}
            onUndo={toast.onUndo ? () => { toast.onUndo!(); done(); } : undefined}
            onDone={done}
          />
        </div>
      ) : null}
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
