import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { S } from '../../content/strings';
import { fmt } from '../../content/copy';
import { FOODS, foodName, slugFood } from '../../content/foods';
import { RECIPE_REVIEW, recipeById } from '../../content/recipes';
import { TEMPLATES } from '../../insights/templates';
import { SUPPORT } from '../../content/support';
import { BottomSheet } from '../../components/Sheet';
import { SlotPicker } from '../../components/Controls';
import { ContextCard, ListCard, ListRow, Section } from '../../components/Cards';
import { FilterChip, SubjectChip } from '../../components/Chip';
import { GhostButton, PrimaryButton, SecondaryButton, TextAction } from '../../components/Button';
import { EmptyState } from '../../components/States';
import { Field, fieldCls, FieldError } from '../../components/Form';
import { ReviewFlag, ReviewTag, useReviewMarkers } from '../../components/ReviewFlag';
import { capitalise, formatDayMonth, formatTimeCompact, parseDate, toISODate } from '../../domain/dates';
import { EMERGENCY_SYMPTOMS, logReaction, logSolids, reactionStatus, REACTION_SYMPTOMS, slotForTime, suggestMeal } from '../../domain/food';
import type { Child, DomainState, LogEntry, MealSlot, ReactionSeverity, ReactionStatus } from '../../domain/types';
import { useDomain, useWeave } from '../../state/store';
import { now as clockNow, useNow } from '../../state/clock';
import { atTime, hhmm } from '../../state/time';
import { abandonLog, commitLog, isLogging } from '../../metrics/timeToLog';
import { useToast } from '../../app/Toast';
import { useProviderSheet } from '../../app/ProviderSheet';
import { useBabyChild } from '../baby/Baby';
import { snoozeInsight } from '../../insights/engine';

/**
 * Food (9.9): solids sheet (S06), food journey (B12), meal suggestion and
 * recipe (B13), reaction flow with the emergency branch (B14), and the
 * first-food prompt on Today (R07).
 */

const STATUS: Record<ReactionStatus, string> = {
  none_yet: S.foodStatusNoneYet.text,
  none: S.foodStatusNone.text,
  mild: S.foodStatusMild.text,
  moderate: S.foodStatusModerate.text,
  severe: S.foodStatusSevere.text,
};
const SLOTS: { value: MealSlot; label: string; icon: 'breakfast' | 'lunch' | 'snack' | 'dinner' }[] = [
  { value: 'breakfast', label: S.breakfast.text, icon: 'breakfast' },
  { value: 'lunch', label: S.lunch.text, icon: 'lunch' },
  { value: 'snack', label: S.snack.text, icon: 'snack' },
  { value: 'dinner', label: S.dinner.text, icon: 'dinner' },
];

/* ------------------------------------------------------------ S06 sheet */

const Ctx = createContext<{ openSolids: (childId: string) => void }>({ openSolids: () => {} });
export const useSolidsFlow = () => useContext(Ctx);

export function SolidsFlowProvider({ children }: { children: ReactNode }) {
  const state = useDomain();
  const [childId, setChildId] = useState<string | null>(null);
  const openSolids = useCallback((id: string) => setChildId(id), []);
  const child = state.children.find((c) => c.id === childId);
  return (
    <Ctx.Provider value={{ openSolids }}>
      {children}
      {child ? <SolidsSheet child={child} onClose={() => setChildId(null)} /> : null}
    </Ctx.Provider>
  );
}

function SolidsSheet({ child, onClose }: { child: Child; onClose: () => void }) {
  const state = useDomain();
  const apply = useWeave((s) => s.apply);
  const toast = useToast();
  const [slot, setSlot] = useState<MealSlot>(slotForTime(clockNow()));
  const [time, setTime] = useState(hhmm(clockNow()));
  const [foods, setFoods] = useState<string[]>([]);
  const [custom, setCustom] = useState<Record<string, string>>({});
  const [query, setQuery] = useState('');
  const [note, setNote] = useState('');
  const [tried, setTried] = useState(false);
  const known = new Set(state.foodIntros.filter((f) => f.childId === child.id).map((f) => f.foodId));
  const catalogue = [...new Set([...known, ...Object.keys(FOODS)])];
  const q = query.trim().toLowerCase();
  const matches = catalogue.filter((id) => !foods.includes(id) && foodName(id, state.customFoods).includes(q)).sort((a, b) => Number(known.has(b)) - Number(known.has(a)));
  const shown = q ? matches.slice(0, 12) : matches.filter((id) => known.has(id)).slice(0, 12);
  const add = (id: string, name?: string) => {
    setFoods((xs) => [...xs, id]);
    if (name) setCustom((c) => ({ ...c, [id]: name }));
    setQuery('');
  };
  const save = () => {
    setTried(true);
    if (!foods.length) return;
    let added: string[] = [];
    let id = '';
    apply((s) => {
      const r = logSolids(s, child.id, { slot, foodIds: foods, note: note.trim() || undefined, customNames: custom }, atTime(time));
      added = r.newFoods;
      id = r.state.logs.at(-1)!.id;
      return r.state;
    });
    commitLog('feed_solids');
    onClose();
    const first = added[0];
    toast(first ? fmt(S.toastFirstFood, { food: capitalise(foodName(first, custom)), name: child.name }) : fmt(S.toastSolids, { name: child.name }), () =>
      apply((s) => ({ ...s, logs: s.logs.filter((l) => l.id !== id), foodIntros: s.foodIntros.filter((f) => !(f.childId === child.id && added.includes(f.foodId))) })),
    );
  };
  return (
    <BottomSheet
      open
      onOpenChange={(o) => {
        if (!o) {
          if (isLogging()) abandonLog('feed_solids');
          onClose();
        }
      }}
      title={S.solids.text}
      onSave={save}
      dirty={foods.length > 0}
    >
      <div className="flex flex-col gap-4 pb-2">
        <SlotPicker options={SLOTS} value={slot} onChange={setSlot} />
        <div className="h-px bg-line" />
        <label className="flex items-center justify-between gap-3">
          <span className="type-row text-ink">{S.startTime.text}</span>
          <input type="time" className={`${fieldCls} w-32`} value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
        <fieldset className="flex flex-col gap-2">
          <legend className="type-row mb-2 text-ink">{S.solidsFood.text}</legend>
          {foods.length ? (
            <div className="flex flex-wrap gap-2" aria-label={S.solidsFood.text}>
              {foods.map((id) => (
                <FilterChip key={id} selected onClick={() => setFoods((xs) => xs.filter((x) => x !== id))} aria-label={`Remove ${foodName(id, { ...state.customFoods, ...custom })}`}>
                  {capitalise(foodName(id, { ...state.customFoods, ...custom }))}
                  {!known.has(id) ? <span className="ml-1.5 rounded-[4px] bg-surface px-1 text-[10px] text-ink">{S.solidsNewTag.text}</span> : null}
                </FilterChip>
              ))}
            </div>
          ) : null}
          <input className={fieldCls} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={S.solidsFoodSearch.text} aria-label={S.solidsFoodSearch.text} />
          <div className="flex flex-wrap gap-2">
            {shown.map((id) => (
              <FilterChip key={id} selected={false} onClick={() => add(id)}>
                {capitalise(foodName(id, state.customFoods))}
                {FOODS[id]?.allergen ? <span className="sr-only">, allergen group {FOODS[id]!.allergen}</span> : null}
              </FilterChip>
            ))}
            {q && !matches.some((id) => foodName(id, state.customFoods) === q) ? (
              <FilterChip selected={false} onClick={() => add(slugFood(query), query.trim().toLowerCase())}>
                {fmt(S.solidsAddNew, { name: query.trim() })}
              </FilterChip>
            ) : null}
          </div>
          <FieldError>{tried && !foods.length ? S.solidsError.text : undefined}</FieldError>
        </fieldset>
        <Field label={S.notes.text}>
          <input className={fieldCls} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
    </BottomSheet>
  );
}

/* --------------------------------------------- Today: meal card and R07 */

/** Today's meal card (S02, R08): a white card, not sage, as designed. */
export function MealCard({ state, now, child }: { state: DomainState; now: Date; child: Child }) {
  const navigate = useNavigate();
  const { slot, recipe } = suggestMeal(state, child.id, now);
  if (!recipe)
    return (
      <ContextCard
        tag={fmt(S.mealCardTag, { slot })}
        title={S.mealNone.text}
        titleStyle="prompt"
        actions={<GhostButton onClick={() => navigate('/baby/food')}>{S.mealNoneLink.text}</GhostButton>}
      />
    );
  return (
    <ContextCard
      tag={fmt(S.mealCardTag, { slot })}
      title={recipe.name}
      body={S.mealSafeLine.text}
      review={RECIPE_REVIEW}
      actions={<GhostButton onClick={() => navigate(`/food/recipe/${recipe.id}?slot=${slot}`)}>{S.mealViewRecipe.text}</GhostButton>}
    />
  );
}

/** First-food prompt (R07, 9.9): stays 72 hours or until "Not now" (24 hours), then retires into the journal. */
export function FirstFoodPrompts({ state, now, child }: { state: DomainState; now: Date; child: Child }) {
  const navigate = useNavigate();
  const apply = useWeave((s) => s.apply);
  const toast = useToast();
  const fresh = state.foodIntros.filter((f) => {
    if (f.childId !== child.id || reactionStatus(f, now) !== 'none_yet') return false;
    const until = state.insightMemory[`R07:${child.id}:${f.foodId}`]?.snoozedUntil;
    return !(until && new Date(until) > now);
  });
  return (
    <>
      {fresh.map((f) => {
        const food = capitalise(foodName(f.foodId, state.customFoods));
        return (
          <ContextCard
            key={f.foodId}
            titleStyle="prompt"
            title={f.firstOn === toISODate(now) ? fmt(TEMPLATES.R07.headline, { Food: food }) : fmt(S.foodIntroducedOn, { Food: food, date: formatDayMonth(f.firstOn) })}
            body={S.noReactionYet.text}
            actions={
              <>
                <GhostButton onClick={() => navigate(`/food/reaction/${f.foodId}`)}>{S.logReaction.text}</GhostButton>
                <TextAction onClick={() => (apply((s, at) => snoozeInsight(s, `R07:${child.id}:${f.foodId}`, at)), toast(S.promptSnoozed.text))}>{S.notNow.text}</TextAction>
              </>
            }
          />
        );
      })}
    </>
  );
}

/* --------------------------------------------------------------- B13 */

export function RecipeScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const apply = useWeave((s) => s.apply);
  const toast = useToast();
  const markers = useReviewMarkers();
  const child = useBabyChild();
  const [params] = useSearchParams();
  const recipe = id ? recipeById(id) : undefined;
  if (!recipe || !child) return <Navigate to="/today" replace />;
  const slot = (params.get('slot') as MealSlot | null) ?? slotForTime(clockNow());
  return (
    <div className="flex flex-col gap-6" data-screen="recipe">
      <div className="flex flex-col gap-5">
        <button type="button" onClick={() => navigate(-1)} className="hit-44 self-start type-micro text-ink-3">
          ‹ {S.back.text}
        </button>
        <div className="flex flex-col gap-[5px]">
          <h1 className="type-greeting text-ink">{recipe.name}</h1>
          <p className="font-sans text-[13px] font-medium text-ink-2">{S.mealSafeLine.text}</p>
        </div>
        {markers ? (
          <span>
            <ReviewTag review={RECIPE_REVIEW} />
          </span>
        ) : null}
      </div>
      <Section label={S.recipeIngredients.text}>
        <ListCard>
          {recipe.ingredients.map((i) => (
            <ListRow key={i} label={capitalise(foodName(i))} value={FOODS[i]?.allergen ?? ''} />
          ))}
        </ListCard>
      </Section>
      <Section label={S.recipeSteps.text}>
        <ol className="flex flex-col gap-3 rounded-card bg-surface p-5">
          {recipe.steps.map((st, n) => (
            <li key={n} className="flex gap-3 type-body text-ink">
              <span className="w-4 shrink-0 font-semibold text-ink-2">{n + 1}</span>
              {st}
            </li>
          ))}
        </ol>
      </Section>
      <PrimaryButton
        size="lg"
        tone="sage"
        onClick={() => {
          apply((s, at) => logSolids(s, child.id, { slot, foodIds: recipe.ingredients, recipeId: recipe.id }, at).state);
          commitLog('feed_solids', 'recipe');
          toast(fmt(S.recipeFed, { recipe: recipe.name, slot }));
          navigate('/today');
        }}
      >
        {S.recipeMarkFed.text}
      </PrimaryButton>
    </div>
  );
}

/* --------------------------------------------------------------- B12 */

export function FoodJourney() {
  const state = useDomain();
  const now = useNow();
  const navigate = useNavigate();
  const { openSolids } = useSolidsFlow();
  const child = useBabyChild();
  if (!child) return <Navigate to="/baby" replace />;
  const intros = state.foodIntros.filter((f) => f.childId === child.id).sort((a, b) => (a.firstOn < b.firstOn ? 1 : -1));
  return (
    <div className="flex flex-col gap-6" data-screen="food-journey">
      <div className="flex flex-col gap-5">
        <button type="button" onClick={() => navigate(-1)} className="hit-44 self-start type-micro text-ink-3">
          ‹ {S.back.text}
        </button>
        <div className="flex flex-col gap-[5px]">
          <h1 className="type-greeting text-ink">{S.foodJourneyTitle.text}</h1>
          <p className="font-sans text-[13px] font-medium text-ink-2">{child.name}</p>
        </div>
      </div>
      <SecondaryButton size="lg" onClick={() => openSolids(child.id)}>
        {S.foodLogMeal.text}
      </SecondaryButton>
      {intros.length ? (
        <ListCard>
          {intros.map((f) => {
            const status = reactionStatus(f, now);
            const name = capitalise(foodName(f.foodId, state.customFoods));
            return (
              <li key={f.foodId}>
                <button
                  type="button"
                  onClick={() => navigate(`/baby/food/${f.foodId}`)}
                  aria-label={fmt(S.foodRowA11y, { food: name, date: formatDayMonth(f.firstOn), status: STATUS[status], allergen: f.allergenGroup ? fmt(S.foodAllergenA11y, { group: f.allergenGroup }) : '' })}
                  className="flex min-h-[56px] w-full items-center justify-between gap-3 py-3 text-left"
                >
                  <span className="flex flex-col gap-1">
                    <span className="flex items-center gap-2">
                      <span className="font-sans text-[14px] font-semibold text-ink">{name}</span>
                      {f.allergenGroup ? <span className="rounded-tag border border-line px-1.5 py-[1px] font-sans text-[10px] font-medium text-ink-2">{f.allergenGroup}</span> : null}
                    </span>
                    <span className="font-sans text-[11px] text-ink-2">{fmt(S.foodFirstOn, { date: formatDayMonth(f.firstOn) })}</span>
                  </span>
                  <span className={`font-sans text-[13px] font-semibold ${status === 'none' || status === 'none_yet' ? 'text-ink-2' : 'text-terracotta-ink'}`}>{STATUS[status]}</span>
                </button>
              </li>
            );
          })}
        </ListCard>
      ) : (
        <EmptyState line={S.foodJourneyEmpty.text} action={S.foodLogMeal.text} onAction={() => openSolids(child.id)} />
      )}
    </div>
  );
}

export function FoodDetail() {
  const { foodId } = useParams();
  const state = useDomain();
  const now = useNow();
  const navigate = useNavigate();
  const child = useBabyChild();
  const intro = state.foodIntros.find((f) => f.childId === child?.id && f.foodId === foodId);
  if (!child || !intro || !foodId) return <Navigate to="/baby/food" replace />;
  const name = capitalise(foodName(foodId, state.customFoods));
  const logs = state.logs.filter((l) => l.subject.kind === 'child' && l.subject.childId === child.id && parseDate(l.at) <= now);
  const meals = logs.filter((l): l is Extract<LogEntry, { type: 'feed'; mode: 'solids' }> => l.type === 'feed' && l.mode === 'solids' && l.foodIds.includes(foodId)).sort((a, b) => (a.at < b.at ? 1 : -1));
  const reactions = logs.filter((l): l is Extract<LogEntry, { type: 'reaction' }> => l.type === 'reaction' && l.foodId === foodId);
  return (
    <div className="flex flex-col gap-6" data-screen="food-detail">
      <div className="flex flex-col gap-5">
        <button type="button" onClick={() => navigate(-1)} className="hit-44 self-start type-micro text-ink-3">
          ‹ {S.back.text}
        </button>
        <div className="flex flex-col gap-[5px]">
          <h1 className="type-greeting text-ink">{name}</h1>
          <p className="font-sans text-[13px] font-medium text-ink-2">
            {fmt(S.foodFirstOn, { date: formatDayMonth(intro.firstOn) })} · {STATUS[reactionStatus(intro, now)]}
            {intro.allergenGroup ? ` · ${intro.allergenGroup}` : ''}
          </p>
        </div>
      </div>
      <GhostButton className="self-start" onClick={() => navigate(`/food/reaction/${foodId}`)}>
        {S.logReaction.text}
      </GhostButton>
      <Section label={S.foodReactions.text}>
        {reactions.length ? (
          <ListCard>
            {reactions.map((r) => (
              <ListRow key={r.id} label={`${formatDayMonth(r.at)}, ${formatTimeCompact(r.at)}`} sublabel={r.symptoms.join(', ') + (r.note ? ` · ${r.note}` : '')} value={capitalise(r.severity)} />
            ))}
          </ListCard>
        ) : (
          <p className="font-sans text-[13px] text-ink-2">{S.foodNoReactions.text}</p>
        )}
      </Section>
      <Section label={fmt(S.foodMeals, { food: name.toLowerCase() })}>
        <ListCard>
          {meals.slice(0, 10).map((m) => (
            <ListRow key={m.id} label={`${formatDayMonth(m.at)}, ${m.slot}`} value={m.foodIds.map((i) => foodName(i, state.customFoods)).join(', ')} />
          ))}
        </ListCard>
      </Section>
    </div>
  );
}

/* --------------------------------------------------------------- B14 */

/**
 * Reaction flow. Step 1: food and symptoms. Any emergency symptom shows the
 * emergency card immediately, before anything is saved (9.9 step 3).
 * Step 2: onset and severity. Save updates the food. No AI diagnosis, ever.
 */
export function ReactionFlow() {
  const { foodId: initial } = useParams();
  const state = useDomain();
  const navigate = useNavigate();
  const apply = useWeave((s) => s.apply);
  const toast = useToast();
  const openProvider = useProviderSheet();
  const child = useBabyChild();
  const [foodId, setFoodId] = useState(initial ?? '');
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [step, setStep] = useState<1 | 2>(1);
  const [onset, setOnset] = useState(hhmm(clockNow()));
  const [severity, setSeverity] = useState<ReactionSeverity>('mild');
  const [note, setNote] = useState('');
  const [tried, setTried] = useState(false);
  const emergency = symptoms.some((s) => EMERGENCY_SYMPTOMS.includes(s));
  useEffect(() => {
    document.querySelector('#device main')?.scrollTo({ top: 0 });
  }, [emergency]);
  if (!child) return <Navigate to="/today" replace />;
  const intros = state.foodIntros.filter((f) => f.childId === child.id);
  const toggle = (s: string) => setSymptoms((xs) => (xs.includes(s) ? xs.filter((x) => x !== s) : [...xs, s]));
  const food = capitalise(foodName(foodId, state.customFoods));

  if (emergency) {
    const tpl = TEMPLATES.ESC_reaction;
    return (
      <div className="flex flex-col gap-6" data-screen="reaction-emergency">
        <ReviewFlag review={tpl.headline.review} className="rounded-card">
          <article role="alert" className="relative flex flex-col gap-4 overflow-hidden rounded-card bg-surface p-5 pl-6">
            <span aria-hidden className="absolute inset-y-0 left-0 w-1.5 bg-terracotta" />
            <span className="type-micro text-terracotta-ink">{S.escalationLabel.text}</span>
            <h1 className="type-insight text-ink">{tpl.headline.text}</h1>
            <p className="type-body text-ink-2">{tpl.body?.text}</p>
            <a href={`tel:${SUPPORT.emergency.number}`} className="flex h-14 w-full items-center justify-center rounded-pill bg-ink font-sans text-[16px] font-semibold text-surface">
              {fmt(S.callEmergency, { number: SUPPORT.emergency.number })}
            </a>
            <SecondaryButton size="lg" onClick={() => openProvider()}>
              {S.contactProvider.text}
            </SecondaryButton>
          </article>
        </ReviewFlag>
        <TextAction className="self-start" onClick={() => setSymptoms((xs) => xs.filter((x) => !EMERGENCY_SYMPTOMS.includes(x)))}>
          {S.reactionEmergencyBack.text}
        </TextAction>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6" data-screen="reaction">
      <div className="flex flex-col gap-5">
        <button type="button" onClick={() => (step === 2 ? setStep(1) : navigate(-1))} className="hit-44 self-start type-micro text-ink-3">
          ‹ {S.back.text}
        </button>
        <h1 className="type-greeting text-ink">{S.reactionTitle.text}</h1>
        <div className="flex items-center gap-2">
          <SubjectChip kind="child" label={child.name} />
          <p className="font-sans text-[12px] text-ink-2">{S.reactionNoInterpret.text}</p>
        </div>
      </div>
      {step === 1 ? (
        <>
          <Field label={S.reactionWhichFood.text}>
            <select className={fieldCls} value={foodId} onChange={(e) => setFoodId(e.target.value)}>
              <option value="" disabled>
                --
              </option>
              {intros.map((f) => (
                <option key={f.foodId} value={f.foodId}>
                  {capitalise(foodName(f.foodId, state.customFoods))}
                </option>
              ))}
            </select>
          </Field>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 font-sans text-[13px] font-semibold text-ink">{S.reactionWhatSeen.text}</legend>
            <div className="flex flex-wrap gap-2">
              {REACTION_SYMPTOMS.map((s) => (
                <FilterChip key={s} selected={symptoms.includes(s)} onClick={() => toggle(s)}>
                  {s}
                </FilterChip>
              ))}
            </div>
          </fieldset>
          <fieldset className="flex flex-col gap-2 rounded-list border border-line p-4">
            <legend className="px-1 font-sans text-[13px] font-semibold text-ink">{S.reactionUrgent.text}</legend>
            <div className="flex flex-col gap-2">
              {EMERGENCY_SYMPTOMS.map((s) => (
                <FilterChip key={s} selected={false} onClick={() => toggle(s)} className="justify-start text-left">
                  {s}
                </FilterChip>
              ))}
            </div>
          </fieldset>
          <FieldError>{tried && (!symptoms.length || !foodId) ? S.reactionError.text : undefined}</FieldError>
          <PrimaryButton size="lg" tone="ink" onClick={() => (setTried(true), symptoms.length && foodId ? setStep(2) : null)}>
            {S.reactionNext.text}
          </PrimaryButton>
        </>
      ) : (
        <>
          <p className="type-insight-sm text-ink">
            {food}: {symptoms.join(', ').toLowerCase()}
          </p>
          <Field label={S.reactionWhen.text}>
            <input type="time" className={fieldCls} value={onset} onChange={(e) => setOnset(e.target.value)} />
          </Field>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 font-sans text-[13px] font-semibold text-ink">{S.reactionHowStrong.text}</legend>
            <div role="radiogroup" className="flex gap-2">
              {(['mild', 'moderate', 'severe'] as const).map((s) => (
                <FilterChip key={s} role="radio" aria-checked={severity === s} selected={severity === s} onClick={() => setSeverity(s)}>
                  {capitalise(s)}
                </FilterChip>
              ))}
            </div>
          </fieldset>
          <Field label={S.notes.text}>
            <input className={fieldCls} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <PrimaryButton
            size="lg"
            tone="ink"
            onClick={() => {
              apply((s) => logReaction(s, child.id, { foodId, symptoms, severity, note: note.trim() || undefined }, atTime(onset)).state);
              toast(fmt(S.reactionSaved, { food }));
              navigate(`/baby/food/${foodId}`, { replace: true });
            }}
          >
            {S.reactionSave.text}
          </PrimaryButton>
        </>
      )}
    </div>
  );
}

