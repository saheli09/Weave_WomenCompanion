import { createContext, useContext, useState, type ReactNode } from 'react';
import type { RenderedInsight } from './engine';
import { ExplainSheet } from './ExplainSheet';

const Ctx = createContext<(i: RenderedInsight) => void>(() => {});
export const useExplain = () => useContext(Ctx);

export function ExplainProvider({ children }: { children: ReactNode }) {
  const [insight, setInsight] = useState<RenderedInsight | null>(null);
  return (
    <Ctx.Provider value={setInsight}>
      {children}
      <ExplainSheet insight={insight} onClose={() => setInsight(null)} />
    </Ctx.Provider>
  );
}
