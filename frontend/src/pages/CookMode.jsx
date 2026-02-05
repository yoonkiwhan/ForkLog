import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";

// ─── Helpers ─────────────────────────────────────────────────────────────
function sortSteps(steps) {
  if (!steps?.length) return [];
  return [...steps].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function stepText(step) {
  if (step == null) return "";
  return typeof step === "string" ? step : step.instruction ?? step.text ?? "";
}

function stepDurationMinutes(step) {
  if (step == null || typeof step !== "object") return null;
  return step.duration_minutes ?? null;
}

// ─── Timer (one per step) ─────────────────────────────────────────────────
function StepTimer({ defaultMinutes, onTimerEnd }) {
  const [minutes, setMinutes] = useState(defaultMinutes);
  const [secondsRemaining, setSecondsRemaining] = useState(defaultMinutes * 60);
  const [running, setRunning] = useState(false);
  const [ended, setEnded] = useState(false);
  const intervalRef = useRef(null);

  const totalSeconds = minutes * 60;
  const displayM = Math.floor(secondsRemaining / 60);
  const displayS = secondsRemaining % 60;

  useEffect(() => {
    if (!running || secondsRemaining <= 0) return;
    intervalRef.current = setInterval(() => {
      setSecondsRemaining((s) => {
        if (s <= 1) {
          setRunning(false);
          setEnded(true);
          onTimerEnd?.();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, onTimerEnd]);

  const start = () => setRunning(true);
  const pause = () => setRunning(false);
  const setNewTimer = () => {
    setSecondsRemaining(minutes * 60);
    setEnded(false);
    setRunning(false);
  };
  const applyMinutes = (m) => {
    const val = Math.max(0, Math.min(999, m));
    setMinutes(val);
    if (!running) setSecondsRemaining(val * 60);
  };

  return (
    <div className="rounded-xl border-2 border-amber-200 bg-amber-50/80 p-4 space-y-3">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-3xl font-mono font-semibold tabular-nums text-stone-800">
            {String(displayM).padStart(2, "0")}:{String(displayS).padStart(2, "0")}
          </span>
          {!ended && (
            <span className="text-sm text-stone-500">
              {running ? "running" : "paused"}
            </span>
          )}
        </div>
        {!ended && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={running ? pause : start}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
            >
              {running ? "Pause" : "Start"}
            </button>
          </div>
        )}
      </div>
      {ended ? (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-amber-800 font-medium">Timer ended.</span>
          <button
            type="button"
            onClick={setNewTimer}
            className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-50"
          >
            Set new timer
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm">
          <label className="text-stone-600">Duration (min):</label>
          <input
            type="number"
            min={0}
            max={999}
            value={minutes}
            onChange={(e) => applyMinutes(parseInt(e.target.value, 10) || 0)}
            className="w-20 rounded border border-stone-200 px-2 py-1 text-stone-800"
            disabled={running}
          />
        </div>
      )}
    </div>
  );
}

// ─── Slide content components ─────────────────────────────────────────────
function PrepSlide({ version, onNext }) {
  const meta = version?.metadata || {};
  const prep = meta.prep_time_minutes;
  const cook = meta.cook_time_minutes;
  const total = meta.total_time_minutes;
  const equipment = version?.equipment ?? [];
  const notesList = version?.notes ?? [];
  const notes = notesList.every(
    (n) => typeof n === "object" && n !== null && "content" in n,
  )
    ? notesList
    : notesList.map((n) =>
        typeof n === "string" ? { type: "tip", content: n } : n,
      );

  return (
    <div className="space-y-8 max-w-xl mx-auto text-left">
      <h2 className="text-xl font-semibold text-stone-800">Before you start</h2>

      {(prep != null || cook != null || total != null) && (
        <div>
          <h3 className="text-sm font-medium text-stone-500 mb-2">Cooking times</h3>
          <ul className="space-y-1 text-stone-700">
            {prep != null && <li>Prep: {prep} min</li>}
            {cook != null && <li>Cook: {cook} min</li>}
            {total != null && <li>Total: {total} min</li>}
          </ul>
        </div>
      )}

      {notes.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-stone-500 mb-2">Notes & tips</h3>
          <ul className="space-y-2 text-stone-700">
            {notes.map((n, i) => (
              <li key={i} className="flex gap-2">
                {n.type && (
                  <span className="capitalize text-stone-400 font-medium shrink-0">
                    {n.type}:
                  </span>
                )}
                <span>{n.content ?? n}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {equipment.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-stone-500 mb-2">Equipment</h3>
          <ul className="flex flex-wrap gap-2">
            {equipment.map((item, i) => (
              <li
                key={i}
                className="rounded-full bg-stone-200 px-3 py-1 text-sm text-stone-700"
              >
                {typeof item === "string" ? item : item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {onNext && (
        <div className="pt-4">
          <button
            type="button"
            onClick={onNext}
            className="rounded-xl bg-amber-500 px-6 py-3 text-base font-medium text-white hover:bg-amber-600"
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );
}

function IngredientsSlide({ version, onNext }) {
  const ingredients = version?.ingredients ?? [];
  return (
    <div className="space-y-6 max-w-xl mx-auto text-left">
      <h2 className="text-xl font-semibold text-stone-800">Ingredients</h2>
      <ul className="space-y-2 text-stone-700">
        {ingredients.map((ing, i) => {
          const line =
            typeof ing === "string"
              ? ing
              : [ing.quantity ?? ing.amount, ing.unit, ing.name]
                  .filter(Boolean)
                  .join(" ");
          return (
            <li key={i} className="flex items-start gap-2">
              <span className="text-stone-400 select-none">•</span>
              <span>{line}</span>
            </li>
          );
        })}
      </ul>
      {onNext && (
        <div className="pt-4">
          <button
            type="button"
            onClick={onNext}
            className="rounded-xl bg-amber-500 px-6 py-3 text-base font-medium text-white hover:bg-amber-600"
          >
            Start cooking
          </button>
        </div>
      )}
    </div>
  );
}

function StepSlide({
  step,
  stepNumber,
  totalSteps,
  stepStartTime,
  timerChoice,
  setTimerChoice,
  defaultTimerMinutes,
  onNext,
}) {
  const text = stepText(step);
  const duration = stepDurationMinutes(step);
  const defaultMin = duration ?? 10;

  return (
    <div className="space-y-6 max-w-xl mx-auto text-left">
      <div className="text-sm text-stone-500">
        Step {stepNumber} of {totalSteps}
        {stepStartTime && (
          <span className="ml-2">
            Started at {new Date(stepStartTime).toLocaleTimeString()}
          </span>
        )}
      </div>

      <p className="text-lg text-stone-800 leading-relaxed">{text}</p>

      {timerChoice === null && (
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
          <p className="text-sm font-medium text-stone-600 mb-3">
            Would you like a timer for this step?
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setTimerChoice("yes")}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => setTimerChoice("no")}
              className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100"
            >
              No
            </button>
          </div>
        </div>
      )}

      {timerChoice === "yes" && (
        <StepTimer
          key={stepNumber}
          defaultMinutes={defaultTimerMinutes ?? defaultMin}
          onTimerEnd={() => {}}
        />
      )}

      <div className="pt-4">
        <button
          type="button"
          onClick={onNext}
          className="rounded-xl bg-amber-500 px-6 py-3 text-base font-medium text-white hover:bg-amber-600"
        >
          Next step
        </button>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────
export default function CookMode() {
  const { slug } = useParams();
  const [recipe, setRecipe] = useState(null);
  const [version, setVersion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [slideIndex, setSlideIndex] = useState(0);
  const [stepStartTimes, setStepStartTimes] = useState({});
  const [timerChoice, setTimerChoice] = useState(null);
  const [defaultTimerMinutes, setDefaultTimerMinutes] = useState(10);

  const steps = version ? sortSteps(version.steps) : [];
  const totalSlides = 2 + steps.length; // prep + ingredients + steps
  const isStepSlide = slideIndex >= 2;
  const stepIndex = slideIndex - 2;
  const currentStep = steps[stepIndex];

  useEffect(() => {
    if (!slug) return;
    api.recipes
      .get(slug)
      .then((r) => {
        setRecipe(r);
        setVersion(r.latest_version ?? null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  // Record step start time when entering a step slide
  useEffect(() => {
    if (!isStepSlide || stepIndex < 0 || stepIndex >= steps.length) return;
    if (stepStartTimes[stepIndex]) return;
    setStepStartTimes((prev) => ({ ...prev, [stepIndex]: new Date().toISOString() }));
  }, [slideIndex, isStepSlide, stepIndex, steps.length, stepStartTimes]);

  // Reset timer choice when moving to a new step
  useEffect(() => {
    if (isStepSlide) {
      setTimerChoice(null);
      const d = currentStep ? stepDurationMinutes(currentStep) ?? 10 : 10;
      setDefaultTimerMinutes(d);
    }
  }, [slideIndex]);

  const goNext = useCallback(() => {
    setSlideIndex((i) => Math.min(i + 1, totalSlides - 1));
  }, [totalSlides]);

  const goPrev = useCallback(() => {
    setSlideIndex((i) => Math.max(0, i - 1));
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900">
        <div className="animate-pulse text-stone-400">Loading cook mode…</div>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3">
          {error || "Recipe not found"}
        </div>
      </div>
    );
  }

  if (!version) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3">
          No version to cook. Add a version first.
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-stone-900">
      {/* Exit */}
      <div className="absolute top-4 right-4 z-10">
        <Link
          to={`/recipes/${slug}`}
          className="rounded-lg bg-stone-700 px-4 py-2 text-sm font-medium text-stone-200 hover:bg-stone-600 hover:text-white"
        >
          Exit cooking
        </Link>
      </div>

      {/* Slide area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 overflow-auto">
        <div className="w-full max-w-2xl flex flex-col items-center min-h-[320px]">
          {slideIndex === 0 && (
            <PrepSlide version={version} onNext={goNext} />
          )}
          {slideIndex === 1 && (
            <IngredientsSlide version={version} onNext={goNext} />
          )}
          {isStepSlide && currentStep && (
            <StepSlide
              step={currentStep}
              stepNumber={stepIndex + 1}
              totalSteps={steps.length}
              stepStartTime={stepStartTimes[stepIndex]}
              timerChoice={timerChoice}
              setTimerChoice={setTimerChoice}
              defaultTimerMinutes={defaultTimerMinutes}
              onNext={goNext}
            />
          )}
        </div>
      </div>

      {/* Progress & nav */}
      <div className="shrink-0 flex items-center justify-center gap-4 pb-8">
        <button
          type="button"
          onClick={goPrev}
          disabled={slideIndex === 0}
          className="rounded-lg border border-stone-600 px-4 py-2 text-sm font-medium text-stone-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-700"
        >
          Previous
        </button>
        <span className="text-sm text-stone-500">
          {slideIndex + 1} / {totalSlides}
        </span>
        <button
          type="button"
          onClick={goNext}
          disabled={slideIndex >= totalSlides - 1}
          className="rounded-lg border border-stone-600 px-4 py-2 text-sm font-medium text-stone-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-700"
        >
          Next
        </button>
      </div>
    </div>
  );
}
