import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api";

function formatDateTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString();
}

export default function MealDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [meal, setMeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.meals
      .getMine(id)
      .then(setMeal)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-pulse text-stone-400">Loading meal…</div>
      </div>
    );
  }

  if (error || !meal) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3">
        {error || "Meal not found"}
      </div>
    );
  }

  const recipeSlug = meal.recipe_slug || "";
  const title = meal.recipe_name || meal.recipe_version_detail?.title || "Recipe";
  const versionLabel =
    meal.recipe_version_detail?.version?.number ||
    meal.recipe_version_detail?.version_number;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-semibold text-2xl text-stone-800">
            Meal
          </h1>
          <div className="text-stone-500 mt-1">
            <Link
              to={`/recipes/${recipeSlug}`}
              className="text-amber-600 hover:text-amber-700 font-medium"
            >
              {title}
            </Link>
            {versionLabel && (
              <span className="ml-2 text-xs rounded-full bg-stone-100 px-2 py-0.5 font-medium text-stone-600">
                {versionLabel}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100"
        >
          Back
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-2">
          <div className="text-sm text-stone-500">Started</div>
          <div className="font-medium text-stone-800">{formatDateTime(meal.started_at)}</div>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-2">
          <div className="text-sm text-stone-500">Ended</div>
          <div className="font-medium text-stone-800">{formatDateTime(meal.ended_at)}</div>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-2">
          <div className="text-sm text-stone-500">Rating</div>
          <div className="font-medium text-stone-800">
            {meal.rating != null ? meal.rating : "—"}
          </div>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-2">
          <div className="text-sm text-stone-500">Steps logged</div>
          <div className="font-medium text-stone-800">
            {meal.step_durations_seconds?.length || 0}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-3">
        <div className="text-sm font-medium text-stone-700">Notes</div>
        <div className="text-sm text-stone-700 whitespace-pre-wrap">
          {meal.session_notes || "—"}
        </div>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-3">
        <div className="text-sm font-medium text-stone-700">Modifications</div>
        <div className="text-sm text-stone-700 whitespace-pre-wrap">
          {meal.modifications || "—"}
        </div>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-2">
        <div className="text-sm font-medium text-stone-700 mb-2">Time per step</div>
        {(meal.step_durations_seconds || []).length === 0 ? (
          <div className="text-sm text-stone-500">No step timings recorded.</div>
        ) : (
          <ul className="text-sm text-stone-700 space-y-1">
            {meal.step_durations_seconds.map((sec, i) => (
              <li key={i}>
                Step {i + 1}: {Math.floor(sec / 60)}m {sec % 60}s
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
