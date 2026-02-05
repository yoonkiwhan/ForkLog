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

function playTimerEndSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const playBeep = (startTime) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);
      osc.start(startTime);
      osc.stop(startTime + 0.15);
    };
    playBeep(0);
    playBeep(0.2);
    playBeep(0.4);
  } catch (_) {}
}

// ─── Timer ───────────────────────────────────────────────────────────────
function StepTimer({ defaultMinutes, onTimerEnd, children }) {
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
          playTimerEndSound();
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
              onClick={() => setRunning(!running)}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
            >
              {running ? (
                <PauseIcon className="h-4 w-4 shrink-0" />
              ) : (
                <PlayIcon className="h-4 w-4 shrink-0" />
              )}
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
        <div className="flex items-center justify-between gap-4 flex-wrap">
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
          {children}
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
function PlayIcon({ className }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z"
        clipRule="evenodd"
      />
    </svg>
  );
}
function PauseIcon({ className }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z"
        clipRule="evenodd"
      />
    </svg>
  );
}
function EyeSlashIcon({ className }) {
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
        d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3.108 3.108 0 00-4.38-4.38l-3.65 3.65"
      />
    </svg>
  );
}

// ─── Time block ───────────────────────────────────────────────────────────
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

// ─── Notes with scroll hint ───────────────────────────────────────────────
function NotesWithScrollHint({ notes }) {
  const containerRef = useRef(null);
  const [showScrollHint, setShowScrollHint] = useState(false);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const check = () => setShowScrollHint(el.scrollHeight > el.clientHeight);
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

// ─── Prep slide ───────────────────────────────────────────────────────────
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

// ─── Ingredients slide (list scrollable like Notes & tips) ─────────────────
function IngredientsSlide({ version }) {
  const ingredients = version?.ingredients ?? [];
  const listRef = useRef(null);
  const [showScrollHint, setShowScrollHint] = useState(false);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const check = () => setShowScrollHint(el.scrollHeight > el.clientHeight);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ingredients]);

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full max-w-6xl mx-auto text-left">
      <h2 className="text-xl font-semibold text-white shrink-0">Ingredients</h2>
      <div className="flex flex-col flex-1 min-h-0 mt-6">
        <h3 className="text-sm font-medium text-stone-300 mb-2 shrink-0">
          You&apos;ll need
        </h3>
        <div
          ref={listRef}
          className="flex-1 min-h-0 overflow-y-auto text-stone-100 pr-2"
        >
          <ul className="space-y-3">
            {ingredients.map((ing, i) => {
              if (typeof ing === "string")
                return (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-stone-400 select-none">•</span>
                    <span>{ing}</span>
                  </li>
                );
              const qty = ing.quantity ?? ing.amount;
              const unit = ing.unit;
              const name = ing.name;
              const hasMeasurement =
                (qty !== undefined && qty !== null && qty !== "") || unit;
              const optional = ing.optional ? " (optional)" : "";
              return (
                <li key={ing.id ?? i} className="flex items-start gap-2">
                  <span className="text-stone-400 select-none">•</span>
                  <span>
                    {hasMeasurement && (
                      <span className="font-bold text-stone-100">
                        {[qty, unit].filter(Boolean).join(" ")}
                      </span>
                    )}
                    {hasMeasurement && name && " "}
                    {name}
                    {ing.preparation && `, ${ing.preparation}`}
                    {(ing.notes || ing.note) && ` (${ing.notes || ing.note})`}
                    {optional}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
        {showScrollHint && (
          <p className="mt-2 text-xs text-stone-400 italic shrink-0">Scroll for more</p>
        )}
      </div>
    </div>
  );
}

// ─── Step slide ───────────────────────────────────────────────────────────
function StepSlideContent({
  step,
  stepNumber,
  totalSteps,
  stepStartTime,
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
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [timerHidden, setTimerHidden] = useState(false);

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
    setTimerHidden(false);
  }, [slideIndex]);

  const goNext = useCallback(
    () => setSlideIndex((i) => Math.min(i + 1, totalSlides - 1)),
    [totalSlides],
  );
  const goPrev = useCallback(
    () => setSlideIndex((i) => Math.max(0, i - 1)),
    [],
  );

  if (loading)
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900">
        <div className="animate-pulse text-stone-200">Loading cook mode…</div>
      </div>
    );
  if (error || !recipe)
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3">
          {error || "Recipe not found"}
        </div>
      </div>
    );
  if (!version)
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3">
          No version to cook. Add a version first.
        </div>
      </div>
    );

  const defaultStepMinutes = currentStep
    ? (stepDurationMinutes(currentStep) ?? 10)
    : 10;

  const slideTitle =
    slideIndex === 0
      ? "Before you start"
      : slideIndex === 1
        ? "Ingredients"
        : isStepSlide && steps.length
          ? `Step ${stepIndex + 1} of ${steps.length}`
          : "";

  const nextButtonLabel =
    slideIndex === 0
      ? "Check Ingredients"
      : slideIndex === 1
        ? "Start Cooking"
        : "Next";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-stone-900">
      <div className="absolute top-4 right-4 z-10">
        <button
          type="button"
          onClick={() => setShowExitConfirm(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
        >
          <XMarkIcon className="h-4 w-4 shrink-0" /> Stop cooking
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

      <div
        className={`flex-1 flex flex-col min-h-0 min-w-0 px-6 pt-16 pb-4 overflow-auto ${isStepSlide ? "" : "flex items-start justify-start"}`}
      >
        {!isStepSlide && (
          <div className="w-full max-w-6xl mx-auto flex flex-col items-start min-h-0 flex-1">
            {slideIndex === 0 && <PrepSlide version={version} />}
            {slideIndex === 1 && (
              <IngredientsSlide version={version} />
            )}
          </div>
        )}
        {isStepSlide && currentStep && (
          <StepSlideContent
            step={currentStep}
            stepNumber={stepIndex + 1}
            totalSteps={steps.length}
            stepStartTime={stepStartTimes[stepIndex]}
          />
        )}
      </div>

      {/* Timer strip (step slides only); Hide minimizes to bottom-right */}
      {isStepSlide && currentStep && !timerHidden && (
        <div className="shrink-0 px-6 pb-4">
          <div className="max-w-6xl mx-auto rounded-xl border-2 border-amber-200/80 bg-amber-50/10 p-4">
            <StepTimer
              key={`timer-${stepIndex}`}
              defaultMinutes={defaultStepMinutes}
              onTimerEnd={() => {}}
            >
              <button
                type="button"
                onClick={() => setTimerHidden(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-stone-400 px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-100"
              >
                <EyeSlashIcon className="h-4 w-4 shrink-0" />
                Hide
              </button>
            </StepTimer>
          </div>
        </div>
      )}

      {/* Minimized timer: Show Timer button aligned with bottom-right of timer window */}
      {isStepSlide && currentStep && timerHidden && (
        <div className="shrink-0 px-6 pb-4">
          <div className="max-w-6xl mx-auto flex justify-end">
            <button
              type="button"
              onClick={() => setTimerHidden(false)}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow-lg hover:bg-amber-600"
            >
              <ClockIcon className="h-4 w-4 shrink-0" />
              Show Timer
            </button>
          </div>
        </div>
      )}

      <div className="shrink-0 flex items-center justify-center gap-4 py-3">
        <button
          type="button"
          onClick={goPrev}
          disabled={slideIndex === 0}
          className="inline-flex items-center gap-2 rounded-lg border border-stone-500 px-4 py-2 text-sm font-medium text-stone-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-700"
        >
          <ChevronLeftIcon className="h-4 w-4 shrink-0" /> Previous
        </button>
        <span className="text-sm text-stone-300">
          {slideTitle}
        </span>
        <button
          type="button"
          onClick={goNext}
          disabled={slideIndex >= totalSlides - 1}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-amber-600 disabled:bg-stone-700 disabled:hover:bg-stone-700 disabled:text-stone-400"
        >
          {nextButtonLabel} <ChevronRightIcon className="h-4 w-4 shrink-0" />
        </button>
      </div>
    </div>
  );
}
