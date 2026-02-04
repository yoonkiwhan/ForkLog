import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";

export default function CookMode() {
  const { slug } = useParams();
  const [recipe, setRecipe] = useState(null);
  const [version, setVersion] = useState(null);
  const [session, setSession] = useState(null);
  const [log, setLog] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!slug) return;
    api.recipes
      .get(slug)
      .then((r) => {
        setRecipe(r);
        const v = r.latest_version;
        setVersion(v);
        if (v) {
          api.sessions
            .create(slug, {
              recipe_version: v.id,
              current_step_index: 0,
              log_entries: [],
            })
            .then(setSession)
            .catch(() =>
              setSession({ recipe_version_detail: v, log_entries: [] })
            );
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (session?.log_entries?.length) setLog(session.log_entries);
    if (session?.current_step_index != null)
      setCurrentStep(session.current_step_index);
  }, [session]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log]);

  const steps = version?.steps ?? [];
  const stepText = steps[currentStep]?.text ?? steps[currentStep] ?? "";

  const sendMessage = async () => {
    const msg = input.trim();
    if (!msg || sending) return;
    setInput("");
    setSending(true);
    const userEntry = {
      role: "user",
      content: msg,
      at: new Date().toISOString(),
    };
    setLog((prev) => [...prev, userEntry]);

    try {
      const { reply } = await api.ai.guide({
        message: msg,
        recipe_version: version?.id,
        current_step_index: currentStep,
        log_entries: [...log, userEntry],
      });
      const assistantEntry = {
        role: "assistant",
        content: reply,
        at: new Date().toISOString(),
      };
      setLog((prev) => [...prev, assistantEntry]);
    } catch (e) {
      setLog((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Error: ${e.message}`,
          at: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-pulse text-stone-400">Loading cook mode…</div>
      </div>
    );
  }
  if (error || !recipe) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3">
        {error || "Recipe not found"}
      </div>
    );
  }
  if (!version) {
    return (
      <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3">
        No version to cook. Add a version first.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link
          to={`/recipes/${slug}`}
          className="text-stone-400 hover:text-stone-600 text-sm"
        >
          ← Back to recipe
        </Link>
        <h1 className="font-display font-semibold text-2xl text-stone-800">
          Cook: {version.title || recipe.name}
        </h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr,340px]">
        <div className="rounded-xl border border-stone-200 bg-white overflow-hidden shadow-sm">
          <div className="p-4 border-b border-stone-100 bg-stone-50/50">
            <h2 className="text-sm font-medium text-stone-500 mb-2">
              Current step
            </h2>
            <p className="text-stone-800">
              {currentStep + 1}. {stepText || "—"}
            </p>
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                disabled={currentStep <= 0}
                onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
                className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm font-medium text-stone-600 disabled:opacity-40 hover:bg-stone-50"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={currentStep >= steps.length - 1}
                onClick={() =>
                  setCurrentStep((s) => Math.min(steps.length - 1, s + 1))
                }
                className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm font-medium text-stone-600 disabled:opacity-40 hover:bg-stone-50"
              >
                Next
              </button>
            </div>
          </div>

          <div className="p-4 space-y-4 max-h-[420px] overflow-y-auto">
            {log.length === 0 && (
              <p className="text-stone-400 text-sm">
                Ask anything: substitutions, timing, technique…
              </p>
            )}
            {log.map((entry, i) => (
              <div
                key={i}
                className={`rounded-lg p-3 ${
                  entry.role === "user"
                    ? "bg-amber-50 ml-6"
                    : "bg-stone-100 mr-6"
                }`}
              >
                <div className="text-xs font-medium text-stone-400 mb-1">
                  {entry.role === "user" ? "You" : "Assistant"}
                </div>
                <div className="text-stone-700 whitespace-pre-wrap">
                  {entry.content}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form
            className="p-4 border-t border-stone-200"
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask for help…"
                className="flex-1 rounded-lg border border-stone-200 px-3 py-2 text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                disabled={sending}
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="rounded-lg bg-amber-500 px-4 py-2 font-medium text-white disabled:opacity-50 hover:bg-amber-600"
              >
                {sending ? "…" : "Send"}
              </button>
            </div>
          </form>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-medium text-stone-500 mb-2">
            Ingredients
          </h3>
          <ul className="list-disc list-inside text-stone-600 text-sm space-y-1">
            {(version.ingredients ?? []).map((ing, i) => {
              const line =
                typeof ing === "string"
                  ? ing
                  : [ing.amount, ing.unit, ing.name].filter(Boolean).join(" ");
              return <li key={i}>{line}</li>;
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
