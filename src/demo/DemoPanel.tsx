import { format } from 'date-fns';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useWeave, deleteEverything, exportEverything } from '../state/store';
import { useNow } from '../state/clock';
import { ANCHOR, PERSONAS } from '../state/personas';
import { endContraction, startContraction, startLabour } from '../domain/transitions';
import { fillLabourHour } from './labourScenarios';
import { summarise, toCSV, useMetrics } from '../metrics/timeToLog';

/**
 * Demo controls (PRD 16.3). Panel beside the device on desktop, sheet on
 * mobile. Dev UI: not part of the product, not copy-linted.
 */

const H = 3600_000;

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
}

const btn = 'min-h-[36px] rounded-md border border-[#d6d0ca] bg-white px-2.5 text-[12px] font-medium text-[#2c2523] hover:bg-[#f3efea] disabled:opacity-40';

export function DemoPanel() {
  const { personaId, loadPersona, resetPersona, advance, setClock, demo, setReviewMarkers, domain, apply } = useWeave();
  const now = useNow(1000);
  const navigate = useNavigate();
  const location = useLocation();
  const timings = useMetrics((s) => s.timings);
  const clearTimings = useMetrics((s) => s.clear);
  const rows = summarise(timings);

  const labour = domain.her.pregnancy?.labour;
  const labourOpen = Boolean(labour && !labour.endedAt);
  const pregnant = domain.her.phase === 'pregnancy';
  const running = labourOpen && labour!.contractions.at(-1) && !labour!.contractions.at(-1)!.end;

  return (
    <div className="flex flex-col gap-5 font-sans text-[13px] text-[#2c2523]" data-testid="demo-panel">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-bold tracking-[0.08em] text-[#6b6460] uppercase">Demo controls</h2>
        <nav className="flex gap-3 text-[12px] font-semibold">
          <Link to="/today" className="underline">App</Link>
          <Link to="/gallery" className="underline">Gallery</Link>
          <Link to="/onboarding" className="underline">Onboarding</Link>
        </nav>
      </div>

      <section className="flex flex-col gap-2">
        <h3 className="text-[12px] font-semibold">Persona</h3>
        <div className="grid grid-cols-2 gap-1.5">
          {PERSONAS.map((p) => (
            <button
              key={p.id}
              type="button"
              data-persona={p.id}
              onClick={() => {
                loadPersona(p.id);
                if (location.pathname === '/onboarding') navigate('/today', { replace: true });
              }}
              aria-pressed={personaId === p.id}
              className={`flex min-h-[44px] flex-col items-start rounded-md border px-2.5 py-1.5 text-left ${personaId === p.id ? 'border-[#2c2523] bg-[#2c2523] text-white' : 'border-[#d6d0ca] bg-white'}`}
            >
              <span className="text-[12px] font-semibold">
                {p.id} · {p.label}
                {p.priority === 'P1' ? <span className="ml-1 text-[10px] opacity-70">P1</span> : null}
              </span>
              <span className={`text-[10.5px] leading-tight ${personaId === p.id ? 'text-white/80' : 'text-[#6b6460]'}`}>{p.detail}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-[12px] font-semibold">Clock</h3>
        <p className="tabular-nums" data-testid="demo-clock">{format(now, "EEEE d MMMM yyyy, HH:mm:ss")}</p>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" className={btn} onClick={() => advance(-H)}>−1h</button>
          <button type="button" className={btn} onClick={() => advance(H)}>+1h</button>
          <button type="button" className={btn} onClick={() => advance(6 * H)}>+6h</button>
          <button type="button" className={btn} onClick={() => advance(24 * H)} data-testid="advance-day">+1 day</button>
          <button type="button" className={btn} onClick={() => advance(7 * 24 * H)}>+7 days</button>
          <button type="button" className={btn} onClick={() => setClock(ANCHOR)}>Anchor</button>
        </div>
        <label className="flex items-center gap-2 text-[12px]">
          Set
          <input
            type="datetime-local"
            className="min-h-[36px] rounded-md border border-[#d6d0ca] px-2"
            value={format(now, "yyyy-MM-dd'T'HH:mm")}
            onChange={(e) => e.target.value && setClock(new Date(e.target.value))}
          />
        </label>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-[12px] font-semibold">Labour</h3>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" className={btn} disabled={!pregnant || labourOpen} onClick={() => apply((s, at) => startLabour(s, at))}>Start Labour mode</button>
          <button type="button" className={btn} disabled={!pregnant} onClick={() => apply((s, at) => fillLabourHour(s, at, 'one_sign'))}>Fill last hour: 1 of 3 signs</button>
          <button type="button" className={btn} disabled={!pregnant} onClick={() => apply((s, at) => fillLabourHour(s, at, 'all_signs'))} data-testid="fill-all-signs">Fill last hour: all 3 signs</button>
        </div>
        <button
          type="button"
          className={btn}
          disabled={!labourOpen}
          onClick={() => apply((s, at) => (running ? endContraction(s, at) : startContraction(s, at)))}
          title={labourOpen ? '' : 'Start Labour mode first'}
        >
          {running ? 'End contraction' : 'Trigger next contraction'}
        </button>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-[12px] font-semibold">Review markers</h3>
        <label className="flex min-h-[36px] items-center gap-2">
          <input type="checkbox" checked={demo.reviewMarkers} onChange={(e) => setReviewMarkers(e.target.checked)} className="size-4" />
          Show “needs review” markers on health copy
        </label>
        {!demo.reviewMarkers ? <p className="text-[11px] text-[#8f3f1e]">Markers hidden. Health copy on screen is not clinically reviewed.</p> : null}
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-[12px] font-semibold">Time to log (16.6)</h3>
          <span className="flex gap-1.5">
            <button type="button" className={btn} disabled={!timings.length} onClick={() => download('weave-time-to-log.csv', toCSV(timings), 'text/csv')}>CSV</button>
            <button type="button" className={btn} disabled={!timings.length} onClick={clearTimings}>Clear</button>
          </span>
        </div>
        {rows.length ? (
          <table className="w-full text-left text-[11.5px] tabular-nums">
            <thead className="text-[#6b6460]">
              <tr><th className="font-medium">Action</th><th className="font-medium">n</th><th className="font-medium">Median</th><th className="font-medium">p90</th><th className="font-medium">Taps</th><th className="font-medium">≤10s</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.action}>
                  <td>{r.action}</td>
                  <td>{r.saved}{r.abandoned ? <span className="text-[#6b6460]"> +{r.abandoned}✕</span> : null}</td>
                  <td>{Number.isNaN(r.medianMs) ? '–' : `${(r.medianMs / 1000).toFixed(1)}s`}</td>
                  <td>{Number.isNaN(r.p90Ms) ? '–' : `${(r.p90Ms / 1000).toFixed(1)}s`}</td>
                  <td>{Number.isNaN(r.medianTaps) ? '–' : `${r.medianTaps} (max ${r.maxTaps})`}</td>
                  <td>{Number.isNaN(r.under10s) ? '–' : `${Math.round(r.under10s * 100)}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-[12px] text-[#6b6460]">No logs timed yet. Logging flows are wired in Phase 1.</p>
        )}
      </section>

      <section className="flex flex-wrap gap-1.5 border-t border-[#e4dfd9] pt-4">
        <button type="button" className={btn} onClick={resetPersona}>Reset persona</button>
        <button type="button" className={btn} onClick={() => download('weave-export.json', exportEverything(), 'application/json')}>Export data</button>
        <button type="button" className={`${btn} text-[#8f3f1e]`} onClick={() => window.confirm('Delete everything stored on this device?') && deleteEverything()}>Delete everything</button>
      </section>
    </div>
  );
}
