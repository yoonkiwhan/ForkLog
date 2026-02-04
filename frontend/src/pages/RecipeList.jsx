import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

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
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
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
        <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50/50 p-12 text-center text-stone-500">
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
        <ul className="space-y-2">
          {recipes.map((r) => (
            <li key={r.id}>
              <Link
                to={`/recipes/${r.slug}`}
                className="block rounded-lg border border-stone-200 bg-white px-4 py-3 hover:border-amber-200 hover:shadow-sm transition-all"
              >
                <span className="font-medium text-stone-800">{r.name}</span>
                {r.latest_version && (
                  <span className="ml-2 text-sm text-stone-400">
                    v{r.latest_version.version_number}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
