import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

export default function ImportRecipe() {
  const navigate = useNavigate();
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!source.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.ai.import(source.trim());
      const recipe = await api.recipes.create({
        name: data.name,
        title: data.title,
        ingredients: data.ingredients ?? [],
        steps: data.steps ?? [],
        notes: data.notes ?? "",
      });
      navigate(`/recipes/${recipe.slug}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="font-display font-semibold text-2xl text-stone-800 mb-2">
        Import recipe
      </h1>
      <p className="text-stone-500 text-sm mb-6">
        Paste recipe text or a URL. Claude will parse it into a versioned
        recipe.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="Paste recipe or URL here…"
          rows={8}
          className="w-full rounded-xl border border-stone-200 px-4 py-3 text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-y"
          disabled={loading}
        />
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={loading || !source.trim()}
          className="rounded-xl bg-amber-500 text-white font-medium py-2.5 px-5 hover:bg-amber-600 disabled:opacity-50"
        >
          {loading ? "Importing…" : "Import with AI"}
        </button>
      </form>
    </div>
  );
}
