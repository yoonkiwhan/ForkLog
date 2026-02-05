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

export default function RecipeList() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.recipes
      .list()
      .then(setRecipes)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-pulse text-stone-400">Loading recipes…</div>
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
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <h1 className="font-display font-semibold text-2xl text-stone-800">
          My recipes
        </h1>
        <div className="flex gap-3">
          <Link
            to="/create"
            className="rounded-xl border border-amber-500 text-amber-600 font-medium px-4 py-2.5 hover:bg-amber-50 transition-colors"
          >
            Create recipe
          </Link>
          <Link
            to="/import"
            className="rounded-xl bg-amber-500 text-white font-medium px-4 py-2.5 hover:bg-amber-600 transition-colors"
          >
            Import from webpage
          </Link>
        </div>
      </div>

      {recipes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50/50 p-12 text-center text-stone-500">
          <p className="mb-4">You haven’t created any recipes yet.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              to="/create"
              className="rounded-xl border border-amber-500 text-amber-600 font-medium px-4 py-2.5 hover:bg-amber-50"
            >
              Create recipe
            </Link>
            <Link
              to="/import"
              className="rounded-xl bg-amber-500 text-white font-medium px-4 py-2.5 hover:bg-amber-600"
            >
              Import from webpage
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((r) => {
            const title = r.latest_version?.title || r.name;
            const versionLabel = r.latest_version?.version?.number || (r.latest_version ? `v${r.latest_version.version_number}` : null);
            return (
              <Link
                key={r.id}
                to={`/recipes/${r.slug}`}
                className="group block rounded-2xl border border-stone-200 bg-white p-5 shadow-sm hover:border-amber-200 hover:shadow-md transition-all"
              >
                <h2 className="font-semibold text-stone-800 group-hover:text-amber-700 transition-colors truncate">
                  {title}
                </h2>
                <div className="mt-2 flex items-center gap-2 text-sm text-stone-500">
                  {versionLabel && (
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 font-medium text-stone-600">
                      {versionLabel}
                    </span>
                  )}
                  {r.updated_at && (
                    <span>{formatDate(r.updated_at)}</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
