import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { S } from '../../content/strings';
import { Copy } from '../../components/Copy';
import { PrimaryButton, SecondaryButton, TextAction } from '../../components/Button';
import { ListCard, ListRow } from '../../components/Cards';
import { endPregnancy } from '../../domain/transitions';
import { useDomain, useWeave } from '../../state/store';
import { useProviderSheet } from '../../app/ProviderSheet';
import { NoteSheet } from '../quicklog/HerLogSheets';

/**
 * "Something has changed with my pregnancy" (B31, 9.10). Small and careful:
 * nothing changes until she chooses; no insights, tips or celebratory UI on the
 * loss path. All copy and the flow need review by a clinician or perinatal
 * support professional before any real use (marked in strings).
 */
export function SomethingChanged() {
  const state = useDomain();
  const navigate = useNavigate();
  const openProvider = useProviderSheet();
  const [view, setView] = useState<'choose' | 'ended'>('choose');
  const [note, setNote] = useState(false);

  if (state.her.phase !== 'pregnancy') return <Navigate to="/today" replace />;
  if (view === 'ended') return <Ended onBack={() => setView('choose')} />;

  return (
    <div className="flex flex-col gap-8" data-screen="something-changed">
      <div className="flex flex-col gap-5">
        <button type="button" onClick={() => navigate('/today')} className="hit-44 self-start type-micro text-ink-3">
          ‹ {S.back.text}
        </button>
        <div className="flex flex-col gap-[5px]">
          <Copy as="h1" entry={S.changedTitle} className="type-greeting text-ink" />
          <p className="font-sans text-[13px] font-medium text-ink-2">{S.changedSubtitle.text}</p>
        </div>
      </div>
      <ListCard>
        <ListRow size="lg" label={S.changedArrived.text} chevron onClick={() => navigate('/birth')} />
        <ListRow size="lg" label={S.changedConcern.text} chevron onClick={openProvider} />
        <ListRow size="lg" label={S.changedEnded.text} chevron onClick={() => setView('ended')} />
        <ListRow size="lg" label={S.changedElse.text} chevron onClick={() => setNote(true)} />
      </ListCard>
      <p className="type-body text-ink-2">{S.changedElseHint.text}</p>
      <NoteSheet open={note} onOpenChange={setNote} entry="changed.note" />
    </div>
  );
}

function Ended({ onBack }: { onBack: () => void }) {
  const apply = useWeave((s) => s.apply);
  const navigate = useNavigate();
  const openProvider = useProviderSheet();
  const [keep, setKeep] = useState<boolean | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const finish = (keepData: boolean) => {
    apply((s, at) => endPregnancy(s, at, keepData));
    navigate('/today', { replace: true });
  };

  return (
    <div className="flex min-h-full flex-1 flex-col justify-between gap-10" data-screen="pregnancy-ended">
      <div className="flex flex-col gap-8">
        <button type="button" onClick={onBack} className="hit-44 self-start type-micro text-ink-3">
          ‹ {S.back.text}
        </button>
        <div className="flex flex-col gap-3">
          <Copy as="h1" entry={S.endedTitle} className="type-greeting text-ink" />
          <Copy as="p" entry={S.endedBody} className="type-body text-ink-2" />
        </div>
        <section className="flex flex-col gap-3" aria-label={S.endedDataQuestion.text}>
          <p className="font-sans text-[13px] font-semibold text-ink">{S.endedDataQuestion.text}</p>
          <div role="radiogroup" className="flex flex-col gap-2">
            {[
              { v: true, label: S.endedKeep.text },
              { v: false, label: S.endedRemove.text },
            ].map((o) => (
              <button
                key={String(o.v)}
                type="button"
                role="radio"
                aria-checked={keep === o.v}
                onClick={() => {
                  setKeep(o.v);
                  setConfirmRemove(false);
                }}
                className={`flex min-h-[52px] items-center rounded-list border px-4 text-left font-sans text-[15px] font-medium ${keep === o.v ? 'border-ink bg-surface text-ink' : 'border-line bg-surface text-ink-2'}`}
              >
                {o.label}
              </button>
            ))}
          </div>
          {confirmRemove ? <p role="alert" className="font-sans text-[13px] font-medium text-terracotta-ink">{S.endedRemoveConfirm.text}</p> : null}
        </section>
        <section className="flex flex-col gap-3">
          <Copy as="p" entry={S.endedSupport} className="type-body text-ink-2" />
          <SecondaryButton size="lg" onClick={openProvider}>
            {S.endedTalk.text}
          </SecondaryButton>
        </section>
      </div>
      <div className="flex flex-col items-center gap-3">
        {/* Neutral ink, not sage: nothing on this path is an affirmation. */}
        <PrimaryButton
          size="lg"
          disabled={keep === null}
          onClick={() => {
            if (keep === false && !confirmRemove) return setConfirmRemove(true);
            finish(keep !== false);
          }}
        >
          {keep === false && confirmRemove ? S.endedRemove.text : S.endedContinue.text}
        </PrimaryButton>
        {confirmRemove ? <TextAction onClick={() => setConfirmRemove(false)}>{S.labourStay.text}</TextAction> : null}
      </div>
    </div>
  );
}
