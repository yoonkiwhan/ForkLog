import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";

function IngredientList({ ingredients }) {
  if (!ingredients?.length) return null;
  return (
    <ul className="space-y-2">
      {ingredients.map((ing, i) => {
        if (typeof ing === "string") return <li key={i} className="text-stone-600">{ing}</li>;
        const qty = ing.quantity ?? ing.amount;
        const parts = [qty, ing.unit, ing.name].filter(Boolean);
        let line = parts.join(" ");
        if (ing.preparation) line += `, ${ing.preparation}`;
        if (ing.notes) line += ` (${ing.notes})`;
        if (ing.note) line += ` (${ing.note})`;
        const optional = ing.optional ? " (optional)" : "";
        return (
          <li key={ing.id ?? i} className="flex items-start gap-2 text-stone-600">
            <span className="text-stone-400 select-none">•</span>
            <span>{line}{optional}</span>
          </li>
        );
      })}
    </ul>
  );
}

function StepList({ steps }) {
  if (!steps?.length) return null;
  const sorted = [...steps].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return (
    <ol className="space-y-4">
      {sorted.map((s, i) => {
        const text = typeof s === "string" ? s : (s.instruction ?? s.text ?? "");
        const duration = typeof s === "object" && s.duration_minutes ? ` — ${s.duration_minutes} min` : "";
        const stepNotes = typeof s === "object" && s.notes ? ` (${s.notes})` : "";
        return (
          <li key={s.id ?? i} className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-100 text-amber-800 text-sm font-medium flex items-center justify-center">
              {(s.order ?? i + 1)}
            </span>
            <div className="text-stone-600">
              <span>{text}{duration}{stepNotes}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function MetadataBlock({ versionDetail }) {
  const meta = versionDetail?.metadata || {};
  const title = versionDetail?.title || meta?.title;
  const description = meta?.description;
  const servings = meta?.servings;
  const prep = meta?.prep_time_minutes;
  const cook = meta?.cook_time_minutes;
  const total = meta?.total_time_minutes;
  const difficulty = meta?.difficulty;
  const course = meta?.course;
  const cuisine = meta?.cuisine;
  const hasAny = title || description || servings != null || prep != null || cook != null || total != null || difficulty || course || cuisine;
  if (!hasAny) return null;
  return (
    <section className="mb-6 pb-6 border-b border-stone-100">
      {title && (
        <h2 className="font-display font-medium text-lg text-stone-800 mb-3">{title}</h2>
      )}
      {description && (
        <p className="text-stone-600 text-sm mb-4">{description}</p>
      )}
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-stone-500">
        {servings != null && <span>{servings} serving{servings !== 1 ? "s" : ""}</span>}
        {prep != null && <span>Prep: {prep} min</span>}
        {cook != null && <span>Cook: {cook} min</span>}
        {total != null && <span>Total: {total} min</span>}
        {difficulty && <span className="capitalize">{difficulty}</span>}
        {course && <span className="capitalize">{course}</span>}
        {cuisine && <span>{cuisine}</span>}
      </div>
    </section>
  );
}

function EquipmentList({ equipment }) {
  if (!equipment?.length) return null;
  return (
    <section className="mb-6">
      <h3 className="text-sm font-medium text-stone-500 mb-2">Equipment</h3>
      <ul className="flex flex-wrap gap-2">
        {equipment.map((item, i) => (
          <li
            key={i}
            className="rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-600"
          >
            {typeof item === "string" ? item : item}
          </li>
        ))}
      </ul>
    </section>
  );
}

function NotesList({ notes }) {
  if (!notes?.length) return null;
  const list = notes.every((n) => typeof n === "object" && n !== null && "content" in n)
    ? notes
    : notes.map((n) => (typeof n === "string" ? { type: "tip", content: n } : n));
  return (
    <section className="mb-6">
      <h3 className="text-sm font-medium text-stone-500 mb-2">Notes & tips</h3>
      <ul className="space-y-2">
        {list.map((n, i) => (
          <li key={i} className="flex gap-2 text-sm text-stone-600">
            {n.type && (
              <span className="capitalize text-stone-400 font-medium shrink-0">{n.type}:</span>
            )}
            <span>{n.content ?? n}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function NutritionBlock({ nutrition }) {
  if (!nutrition || typeof nutrition !== "object") return null;
  const entries = [
    ["Calories", nutrition.calories, "kcal"],
    ["Protein", nutrition.protein_g, "g"],
    ["Carbs", nutrition.carbs_g, "g"],
    ["Fat", nutrition.fat_g, "g"],
    ["Fiber", nutrition.fiber_g, "g"],
    ["Sodium", nutrition.sodium_mg, "mg"],
  ].filter(([, v]) => v != null && v !== "");
  if (!entries.length) return null;
  return (
    <section className="mb-6">
      <h3 className="text-sm font-medium text-stone-500 mb-2">Nutrition (per serving)</h3>
      <div className="flex flex-wrap gap-4 text-sm text-stone-600">
        {entries.map(([label, value, unit]) => (
          <span key={label}>{label}: {value}{unit}</span>
        ))}
      </div>
    </section>
  );
}

function TagsList({ tags }) {
  if (!tags?.length) return null;
  return (
    <section className="mb-6">
      <h3 className="text-sm font-medium text-stone-500 mb-2">Tags</h3>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag, i) => (
          <span
            key={i}
            className="rounded-full bg-amber-50 text-amber-800 px-3 py-1 text-sm font-medium"
          >
            {tag}
          </span>
        ))}
      </div>
    </section>
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
              <MetadataBlock versionDetail={versionDetail} />
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
              <EquipmentList equipment={versionDetail.equipment} />
              <NotesList notes={versionDetail.notes} />
              <NutritionBlock nutrition={versionDetail.nutrition} />
              <TagsList tags={versionDetail.tags} />
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
