import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

function isValidUrl(text) {
  const trimmed = (text || "").trim();
  if (!trimmed) return false;
  try {
    const u = new URL(trimmed);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export default function ImportRecipe() {
  const navigate = useNavigate();
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = source.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    try {
      let data;
      if (isValidUrl(trimmed)) {
        data = await api.ai.importFromWebpage(trimmed, "", "en");
      } else {
        data = await api.ai.import(trimmed);
      }
      const recipe = await api.recipes.create({
        name: data.name,
        title: data.title,
        metadata: data.metadata,
        ingredients: data.ingredients ?? [],
        steps: data.steps ?? [],
        equipment: data.equipment ?? [],
        notes: Array.isArray(data.notes) ? data.notes : data.notes ?? "",
        nutrition: data.nutrition,
        tags: data.tags ?? [],
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
