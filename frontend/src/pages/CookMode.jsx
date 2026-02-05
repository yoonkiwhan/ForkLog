import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";

// ─── Helpers ─────────────────────────────────────────────────────────────
function sortSteps(steps) {
  if (!steps?.length) return [];
  return [...steps].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function stepText(step) {
  if (step == null) return "";
  return typeof step === "string"
    ? step
    : (step.instruction ?? step.text ?? "");
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
            {String(displayM).padStart(2, "0")}:
            {String(displayS).padStart(2, "0")}
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

// ─── Icons ────────────────────────────────────────────────────────────────
function ClockIcon({ className }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function XMarkIcon({ className }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

function ChevronLeftIcon({ className }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 19.5L8.25 12l7.5-7.5"
      />
    </svg>
  );
}

function ChevronRightIcon({ className }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.25 4.5l7.5 7.5-7.5 7.5"
      />
    </svg>
  );
}

// ─── Time block (same design as RecipeDetail, dark styling) ─────────────────
function TimeBlock({ version }) {
  const meta = version?.metadata || {};
  const prep = meta.prep_time_minutes;
  const cook = meta.cook_time_minutes;
  const total = meta.total_time_minutes;
  if (prep == null && cook == null && total == null) return null;
  const lines = [];
  if (prep != null) lines.push({ label: "Prep", value: prep });
  if (cook != null) lines.push({ label: "Cook", value: cook });
  if (total != null) lines.push({ label: "Total", value: total });
  return (
    <div className="w-[220px] px-4 py-3">
      <table className="w-full text-sm font-medium">
        <tbody>
          {lines.map(({ label, value }, i) => (
            <tr key={label}>
              {i === 0 && (
                <td
                  rowSpan={lines.length}
                  className="w-9 align-middle pr-2 text-stone-400"
                >
                  <ClockIcon className="h-6 w-6 shrink-0" />
                </td>
              )}
              <td className="py-0.5 text-stone-300">{label}</td>
              <td className="py-0.5 text-right tabular-nums text-stone-100">
                {value} min
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Notes with scroll hint when content overflows ─────────────────────────
function NotesWithScrollHint({ notes }) {
  const containerRef = useRef(null);
  const [showScrollHint, setShowScrollHint] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const check = () => {
      setShowScrollHint(el.scrollHeight > el.clientHeight);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [notes]);

  return (
    <div>
      <h3 className="text-sm font-medium text-stone-300 mb-2">Notes & tips</h3>
      <div
        ref={containerRef}
        className="max-h-40 overflow-y-auto space-y-2 text-stone-100 pr-2"
      >
        <ul className="space-y-2">
          {notes.map((n, i) => (
            <li key={i} className="flex gap-2">
              {n.type && (
                <span className="capitalize text-stone-300 font-medium shrink-0">
                  {n.type}:
                </span>
              )}
              <span>{n.content ?? n}</span>
            </li>
          ))}
        </ul>
      </div>
      {showScrollHint && (
        <p className="mt-2 text-xs text-stone-400 italic">Scroll for more</p>
      )}
    </div>
  );
}

// ─── Slide content components ─────────────────────────────────────────────
function PrepSlide({ version }) {
  const meta = version?.metadata || {};
  const equipment = version?.equipment ?? [];
  const notesList = version?.notes ?? [];
  const notes = notesList.every(
    (n) => typeof n === "object" && n !== null && "content" in n,
  )
    ? notesList
    : notesList.map((n) =>
        typeof n === "string" ? { type: "tip", content: n } : n,
      );
  const hasTimes =
    meta.prep_time_minutes != null ||
    meta.cook_time_minutes != null ||
    meta.total_time_minutes != null;

  return (
    <div className="space-y-8 max-w-6xl mx-auto text-left w-full">
      <h2 className="text-xl font-semibold text-white">Before you start</h2>

      <div className="flex gap-6 items-start">
        <div className="w-[220px] shrink-0">
          {hasTimes && (
            <>
              <h3 className="text-sm font-medium text-stone-300 mb-2">
                Cook Times
              </h3>
              <TimeBlock version={version} />
            </>
          )}
        </div>
        <div className="min-w-0 flex-1">
          {equipment.length > 0 && (
            <>
              <h3 className="text-sm font-medium text-stone-300 mb-2">
                Equipment
              </h3>
              <ul className="flex flex-wrap gap-2">
                {equipment.map((item, i) => (
                  <li
                    key={i}
                    className="rounded-full bg-stone-700 px-3 py-1 text-sm text-stone-100"
                  >
                    {typeof item === "string" ? item : item}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      {notes.length > 0 && <NotesWithScrollHint notes={notes} />}
    </div>
  );
}

function IngredientsSlide({ version, onNext }) {
  const ingredients = version?.ingredients ?? [];
  return (
    <div className="space-y-6 max-w-6xl mx-auto text-left w-full">
      <h2 className="text-xl font-semibold text-white">Ingredients</h2>
      <ul className="space-y-2 text-stone-100">
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

function StepSlideContent({
  step,
  stepNumber,
  totalSteps,
  stepStartTime,
  timerChoice,
  setTimerChoice,
  onNext,
}) {
  const text = stepText(step);

  return (
    <div className="space-y-6 max-w-6xl mx-auto text-left px-2 w-full">
      <div className="text-sm text-stone-300">
        Step {stepNumber} of {totalSteps}
        {stepStartTime && (
          <span className="ml-2">
            Started at {new Date(stepStartTime).toLocaleTimeString()}
          </span>
        )}
      </div>

      <p className="text-lg font-light text-stone-100 leading-relaxed">
        {text}
      </p>

      {timerChoice === null && (
        <div className="rounded-xl border border-stone-600 bg-stone-800/50 p-4">
          <p className="text-sm font-medium text-stone-200 mb-3">
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
              className="rounded-lg border border-stone-400 px-4 py-2 text-sm font-medium text-stone-200 hover:bg-stone-700"
            >
              No
            </button>
          </div>
        </div>
      )}

      {/* <div className="pt-4">
        <button
          type="button"
          onClick={onNext}
          className="rounded-xl bg-amber-500 px-6 py-3 text-base font-medium text-white hover:bg-amber-600"
        >
          Next step
        </button>
      </div> */}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────
export default function CookMode() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState(null);
  const [version, setVersion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [slideIndex, setSlideIndex] = useState(0);
  const [stepStartTimes, setStepStartTimes] = useState({});
  const [timerChoice, setTimerChoice] = useState(null);
  const [defaultTimerMinutes, setDefaultTimerMinutes] = useState(10);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const steps = version ? sortSteps(version.steps) : [];
  const totalSlides = 2 + steps.length;
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

  useEffect(() => {
    if (!isStepSlide || stepIndex < 0 || stepIndex >= steps.length) return;
    if (stepStartTimes[stepIndex]) return;
    setStepStartTimes((prev) => ({
      ...prev,
      [stepIndex]: new Date().toISOString(),
    }));
  }, [slideIndex, isStepSlide, stepIndex, steps.length, stepStartTimes]);

  useEffect(() => {
    if (isStepSlide) {
      setTimerChoice(null);
      const d = currentStep ? (stepDurationMinutes(currentStep) ?? 10) : 10;
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
        <div className="animate-pulse text-stone-200">Loading cook mode…</div>
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

  const showTimerStrip = isStepSlide && currentStep && timerChoice === "yes";
  const defaultStepMinutes = currentStep
    ? (stepDurationMinutes(currentStep) ?? 10)
    : 10;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-stone-900">
      {/* Exit */}
      <div className="absolute top-4 right-4 z-10">
        <button
          type="button"
          onClick={() => setShowExitConfirm(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
        >
          <XMarkIcon className="h-4 w-4 shrink-0" />
          Stop cooking
        </button>
      </div>

      {showExitConfirm && (
        <div
          className="fixed inset-0 z-20 flex items-center justify-center bg-black/60"
          onClick={() => setShowExitConfirm(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="exit-dialog-title"
        >
          <div
            className="rounded-xl bg-stone-800 border border-stone-600 p-6 shadow-xl max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="exit-dialog-title"
              className="text-lg font-semibold text-white mb-3"
            >
              Are you sure you wish to stop cooking?
            </h2>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="rounded-lg border border-stone-500 px-4 py-2 text-sm font-medium text-stone-200 hover:bg-stone-700"
              >
                Keep cooking
              </button>
              <button
                type="button"
                onClick={() => navigate(`/recipes/${slug}`)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
              >
                Yes, stop
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slide area */}
      <div
        className={`flex-1 flex flex-col min-h-0 px-6 pt-16 pb-4 ${
          isStepSlide
            ? "overflow-auto"
            : "items-center justify-center overflow-auto"
        }`}
      >
        {!isStepSlide && (
          <div className="w-full max-w-6xl flex flex-col items-center min-h-[320px]">
            {slideIndex === 0 && <PrepSlide version={version} />}
            {slideIndex === 1 && (
              <IngredientsSlide version={version} onNext={goNext} />
            )}
          </div>
        )}
        {isStepSlide && currentStep && (
          <StepSlideContent
            step={currentStep}
            stepNumber={stepIndex + 1}
            totalSteps={steps.length}
            stepStartTime={stepStartTimes[stepIndex]}
            timerChoice={timerChoice}
            setTimerChoice={setTimerChoice}
            onNext={goNext}
          />
        )}
      </div>

      {showTimerStrip && (
        <div className="shrink-0 px-6 pb-4">
          <div className="max-w-6xl mx-auto rounded-xl border-2 border-amber-200/80 bg-amber-50/10 p-4">
            <StepTimer
              key={`timer-${stepIndex}`}
              defaultMinutes={defaultTimerMinutes ?? defaultStepMinutes}
              onTimerEnd={() => {}}
            />
          </div>
        </div>
      )}

      {/* Progress & nav */}
      <div className="shrink-0 flex items-center justify-center gap-4 py-3">
        <button
          type="button"
          onClick={goPrev}
          disabled={slideIndex === 0}
          className="inline-flex items-center gap-2 rounded-lg border border-stone-500 px-4 py-2 text-sm font-medium text-stone-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-700"
        >
          <ChevronLeftIcon className="h-4 w-4 shrink-0" />
          Previous
        </button>
        <span className="text-sm text-stone-300">
          {slideIndex + 1} / {totalSlides}
        </span>
        <button
          type="button"
          onClick={goNext}
          disabled={slideIndex >= totalSlides - 1}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-amber-600 disabled:bg-stone-700 disabled:hover:bg-stone-700 disabled:text-stone-400"
        >
          Next
          <ChevronRightIcon className="h-4 w-4 shrink-0" />
        </button>
      </div>
    </div>
  );
}
