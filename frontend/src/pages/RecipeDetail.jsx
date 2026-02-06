import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";

function IngredientList({ ingredients }) {
  if (!ingredients?.length) return null;
  return (
    <ul className="space-y-2">
      {ingredients.map((ing, i) => {
        if (typeof ing === "string")
          return (
            <li key={i} className="text-stone-600">
              {ing}
            </li>
          );
        const qty = ing.quantity ?? ing.amount;
        const unit = ing.unit;
        const name = ing.name;
        const hasMeasurement =
          (qty !== undefined && qty !== null && qty !== "") || unit;
        const optional = ing.optional ? " (optional)" : "";
        return (
          <li
            key={ing.id ?? i}
            className="flex items-start gap-2 text-stone-600"
          >
            <span className="text-stone-400 select-none">•</span>
            <span>
              {hasMeasurement && (
                <span className="font-bold text-stone-800">
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
  );
}

function StepList({ steps }) {
  if (!steps?.length) return null;
  const sorted = [...steps].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return (
    <ol className="space-y-4">
      {sorted.map((s, i) => {
        const title = typeof s === "object" ? (s.title ?? null) : null;
        const text =
          typeof s === "string" ? s : (s.instruction ?? s.instructions ?? s.text ?? "");
        const duration =
          typeof s === "object" && s.duration_minutes
            ? ` — ${s.duration_minutes} min`
            : "";
        const stepNotes =
          typeof s === "object" && s.notes ? ` (${s.notes})` : "";
        const pictures = typeof s === "object" ? (s.media ?? s.pictures ?? []) : [];
        const urls = Array.isArray(pictures) ? pictures : [];
        return (
          <li key={s.id ?? i} className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-100 text-amber-800 text-sm font-medium flex items-center justify-center">
              {s.order ?? i + 1}
            </span>
            <div className="text-stone-600 min-w-0">
              {title && (
                <div className="font-medium text-stone-800 mb-0.5">{title}</div>
              )}
              <span>
                {text}
                {duration}
                {stepNotes}
              </span>
              {urls.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {urls.map((url, j) => (
                    <img
                      key={j}
                      src={url}
                      alt={title || `Step ${s.order ?? i + 1}`}
                      className="rounded-lg max-h-32 object-cover"
                    />
                  ))}
                </div>
              )}
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
  const prep = meta?.prep_time_minutes;
  const cook = meta?.cook_time_minutes;
  const total = meta?.total_time_minutes;
  const difficulty = meta?.difficulty;
  const course = meta?.course;
  const cuisine = meta?.cuisine;
  const hasAny = title || description;
  if (!hasAny) return null;
  return (
    <section className="mb-6 pb-6 border-b border-stone-100">
      {title && (
        <h2 className="font-display font-semibold text-2xl text-stone-800 mb-3">
          {title}
        </h2>
      )}
      {description && (
        <p className="text-stone-600 text-sm mb-4">{description}</p>
      )}
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
  const list = notes.every(
    (n) => typeof n === "object" && n !== null && "content" in n,
  )
    ? notes
    : notes.map((n) =>
        typeof n === "string" ? { type: "tip", content: n } : n,
      );
  return (
    <section className="mb-6">
      <h3 className="text-sm font-medium text-stone-500 mb-2">Notes & tips</h3>
      <ul className="space-y-2">
        {list.map((n, i) => (
          <li key={i} className="flex gap-2 text-sm text-stone-600">
            {n.type && (
              <span className="capitalize text-stone-400 font-medium shrink-0">
                {n.type}:
              </span>
            )}
            <span>{n.content ?? n}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

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

function PersonIcon({ className }) {
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
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
      />
    </svg>
  );
}

function MetaPills({ versionDetail }) {
  const meta = versionDetail?.metadata || {};
  const difficulty = meta?.difficulty;
  const course = meta?.course;
  const cuisine = meta?.cuisine;
  const items = [];
  if (difficulty)
    items.push({
      label: difficulty,
      key: "difficulty",
      className:
        "bg-violet-100 text-violet-800 border-violet-200 hover:bg-violet-200",
    });
  if (course)
    items.push({
      label: course,
      key: "course",
      className:
        "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200",
    });
  if (cuisine)
    items.push({
      label: cuisine,
      key: "cuisine",
      className:
        "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200",
    });
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5 w-[220px]">
      {items.map(({ label, key, className }) => (
        <span
          key={key}
          className={`inline-block rounded-md border px-2 py-1 text-xs font-medium capitalize transition-colors ${className}`}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

function TimeBlock({ versionDetail }) {
  const meta = versionDetail?.metadata || {};
  const prep = meta?.prep_time_minutes;
  const cook = meta?.cook_time_minutes;
  const total = meta?.total_time_minutes;
  if (prep == null && cook == null && total == null) return null;
  const lines = [];
  if (prep != null) lines.push({ label: "Prep", value: prep });
  if (cook != null) lines.push({ label: "Cook", value: cook });
  if (total != null) lines.push({ label: "Total", value: total });
  return (
    <div className="w-[220px] rounded-xl border-2 border-stone-200 bg-stone-50 px-4 py-3 text-stone-700 shadow-sm hover:border-stone-300 hover:bg-stone-100/80 transition-colors">
      <table className="w-full text-sm font-medium">
        <tbody>
          {lines.map(({ label, value }, i) => (
            <tr key={label}>
              {i === 0 && (
                <td
                  rowSpan={lines.length}
                  className="w-9 align-middle pr-2 text-stone-500"
                >
                  <ClockIcon className="h-6 w-6 shrink-0" />
                </td>
              )}
              <td className="py-0.5 text-stone-600">{label}</td>
              <td className="py-0.5 text-right tabular-nums">{value} min</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NutritionLabel({ nutrition }) {
  if (!nutrition || typeof nutrition !== "object") return null;
  const rows = [
    ["Calories", nutrition.calories, "kcal"],
    ["Protein", nutrition.protein_g, "g"],
    ["Carbs", nutrition.carbs_g, "g"],
    ["Fat", nutrition.fat_g, "g"],
    ["Fiber", nutrition.fiber_g, "g"],
    ["Sodium", nutrition.sodium_mg, "mg"],
  ].filter(([, v]) => v != null && v !== "");
  if (!rows.length) return null;
  return (
    <div className="rounded border-2 border-stone-800 p-3 w-[220px] bg-white shadow-sm">
      <div className="border-b-2 border-stone-800 pb-1 mb-2">
        <p className="text-xl font-bold tracking-tight leading-none">
          Nutrition Facts
        </p>
      </div>
      <p className="text-xs font-semibold text-stone-600 mb-2">Per serving</p>
      <table className="w-full text-sm">
        <tbody>
          {rows.map(([label, value, unit]) => (
            <tr key={label} className="border-b border-stone-200 last:border-0">
              <td className="py-0.5 pr-2 text-stone-600">{label}</td>
              <td className="py-0.5 text-right font-bold text-stone-800 tabular-nums">
                {value}
                {unit}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
    ? (versions.find((v) => v.id === selectedVersionId) ??
      recipe?.latest_version)
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
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link to="/" className="text-stone-400 hover:text-stone-600 text-sm">
          ← Recipes
        </Link>
        {/* <h1 className="font-display font-semibold text-2xl text-stone-800">
          {recipe.name}
        </h1> */}
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
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h3 className="text-sm font-medium text-stone-500">
                    Ingredients
                  </h3>
                  {versionDetail.metadata?.servings != null && (
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-stone-100 px-2 py-1 text-xs font-medium text-stone-700">
                      <PersonIcon className="h-3.5 w-3.5 shrink-0" />
                      {versionDetail.metadata.servings} serving
                      {versionDetail.metadata.servings !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <IngredientList ingredients={versionDetail.ingredients} />
              </section>
              <section className="mb-6">
                <h3 className="text-sm font-medium text-stone-500 mb-2">
                  Steps
                </h3>
                <StepList steps={versionDetail.steps} />
              </section>
              <NotesList notes={versionDetail.notes} />
              <EquipmentList equipment={versionDetail.equipment} />
              <TagsList tags={versionDetail.tags} />
            </>
          ) : (
            <div className="animate-pulse text-stone-400">Loading version…</div>
          )}
        </div>

        <div className="space-y-6 flex flex-col items-center">
          {versionDetail &&
            (versionDetail.metadata?.difficulty ||
              versionDetail.metadata?.course ||
              versionDetail.metadata?.cuisine) && (
              <MetaPills versionDetail={versionDetail} />
            )}
          {versionDetail &&
            (versionDetail.metadata?.prep_time_minutes != null ||
              versionDetail.metadata?.cook_time_minutes != null ||
              versionDetail.metadata?.total_time_minutes != null) && (
              <div className="flex justify-center">
                <TimeBlock versionDetail={versionDetail} />
              </div>
            )}
          {versionDetail?.nutrition &&
            Object.keys(versionDetail.nutrition).length > 0 && (
              <div className="flex justify-center">
                <NutritionLabel nutrition={versionDetail.nutrition} />
              </div>
            )}
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
    </div>
  );
}
