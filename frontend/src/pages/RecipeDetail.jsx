import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";

function IngredientList({ ingredients }) {
  if (!ingredients?.length) return null;
  return (
    <ul className="list-disc list-inside space-y-1 text-stone-600">
      {ingredients.map((ing, i) => {
        const line =
          typeof ing === "string"
            ? ing
            : [ing.amount, ing.unit, ing.name].filter(Boolean).join(" ") +
              (ing.note ? ` (${ing.note})` : "");
        return <li key={i}>{line}</li>;
      })}
    </ul>
  );
}

function StepList({ steps }) {
  if (!steps?.length) return null;
  const sorted = [...steps].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return (
    <ol className="list-decimal list-inside space-y-2 text-stone-600">
      {sorted.map((s, i) => (
        <li key={i}>{typeof s === "string" ? s : s.text}</li>
      ))}
    </ol>
  );
}

export default function RecipeDetail() {
  const { slug } = useParams();
  const [recipe, setRecipe] = useState(null);
  const [versions, setVersions] = useState([]);
  const [selectedVersionId, setSelectedVersionId] = useState(null);
  const [versionDetail, setVersionDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!slug) return;
    Promise.all([api.recipes.get(slug), api.versions.list(slug)])
      .then(([r, v]) => {
        setRecipe(r);
        setVersions(v);
        const firstId = r.latest_version?.id ?? v[0]?.id ?? null;
        setSelectedVersionId(firstId);
        setVersionDetail(r.latest_version ?? null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!slug || !selectedVersionId) return;
    if (recipe?.latest_version?.id === selectedVersionId) {
      setVersionDetail(recipe.latest_version);
      return;
    }
    api.versions
      .get(slug, selectedVersionId)
      .then(setVersionDetail)
      .catch(() => setVersionDetail(null));
  }, [slug, selectedVersionId, recipe?.latest_version?.id]);

  const selectedVersion = selectedVersionId
    ? versions.find((v) => v.id === selectedVersionId) ?? recipe?.latest_version
    : null;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-pulse text-stone-400">Loading…</div>
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

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link to="/" className="text-stone-400 hover:text-stone-600 text-sm">
          ← Recipes
        </Link>
        <h1 className="font-display font-semibold text-2xl text-stone-800">
          {recipe.name}
        </h1>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr,280px]">
        <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
          {versions.length > 1 && (
            <div className="mb-6 pb-4 border-b border-stone-100">
              <h2 className="text-xs font-medium uppercase tracking-wide text-stone-400 mb-2">
                Version
              </h2>
              <div className="flex flex-wrap gap-2">
                {versions.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVersionId(v.id)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      selectedVersionId === v.id
                        ? "bg-amber-100 text-amber-800"
                        : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                    }`}
                  >
                    v{v.version_number}
                    {v.message && ` – ${v.message}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {versionDetail ? (
            <>
              {versionDetail.title && (
                <h2 className="font-display font-medium text-lg text-stone-800 mb-4">
                  {versionDetail.title}
                </h2>
              )}
              <section className="mb-6">
                <h3 className="text-sm font-medium text-stone-500 mb-2">
                  Ingredients
                </h3>
                <IngredientList ingredients={versionDetail.ingredients} />
              </section>
              <section className="mb-6">
                <h3 className="text-sm font-medium text-stone-500 mb-2">
                  Steps
                </h3>
                <StepList steps={versionDetail.steps} />
              </section>
              {versionDetail.notes && (
                <section>
                  <h3 className="text-sm font-medium text-stone-500 mb-2">
                    Notes
                  </h3>
                  <p className="text-stone-600 whitespace-pre-wrap">
                    {versionDetail.notes}
                  </p>
                </section>
              )}
            </>
          ) : (
            <div className="animate-pulse text-stone-400">Loading version…</div>
          )}
        </div>

        <div className="space-y-4">
          <Link
            to={`/recipes/${slug}/cook`}
            className="block w-full rounded-xl bg-amber-500 text-white font-medium text-center py-3 px-4 hover:bg-amber-600 transition-colors"
          >
            Start cooking (with AI)
          </Link>
          <p className="text-xs text-stone-400">
            Cook mode uses the latest version and Claude to guide you
            step-by-step.
          </p>
        </div>
      </div>
    </div>
  );
}
