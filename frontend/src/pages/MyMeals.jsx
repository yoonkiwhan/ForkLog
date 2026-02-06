import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString();
}

export default function MyMeals() {
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.meals
      .listMine()
      .then(setMeals)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-pulse text-stone-400">Loading meals…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3">
        {error}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="font-display font-semibold text-2xl text-stone-800">
          My meals
        </h1>
      </div>

      {meals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50/50 p-8 text-center text-stone-500">
          No meals yet.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {meals.map((s) => {
            const title = s.recipe_name || s.recipe_version_detail?.title || "Recipe";
            const ver =
              s.recipe_version_detail?.version?.number ||
              s.recipe_version_detail?.version_number;
            const started = formatDate(s.started_at);
            const rating = s.rating != null ? s.rating : null;
            return (
              <Link
                key={s.id}
                to={`/meals/${s.id}`}
                className="group block rounded-2xl border border-stone-200 bg-white p-5 shadow-sm hover:border-amber-200 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-stone-800 group-hover:text-amber-700 transition-colors truncate">
                    {title}
                  </h3>
                  {ver && (
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
                      {ver}
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-3 text-sm text-stone-500">
                  {started && <span>{started}</span>}
                  {rating !== null && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">
                      ⭐ {rating}
                    </span>
                  )}
                </div>
                <div className="mt-2 text-xs text-stone-400">
                  Steps: {s.step_durations_seconds?.length || 0}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
