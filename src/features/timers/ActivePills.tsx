import { FeedPill, useFeedFlow } from '../feeds/FeedSheets';
import { SleepPill, useSleepFlow } from '../sleep/SleepSheet';

/** Running timers, stacked above the nav on every screen (9.4). Hidden while their own sheet is open. */
export function ActivePills({ hidden }: { hidden?: boolean }) {
  const { openBreast, breastOpen } = useFeedFlow();
  const { sleepOpen } = useSleepFlow();
  if (hidden) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[96px] z-20 flex flex-col items-center gap-2 [&>*]:pointer-events-auto">
      {!sleepOpen ? <SleepPill /> : null}
      {!breastOpen ? <FeedPill onOpen={openBreast} /> : null}
    </div>
  );
}
