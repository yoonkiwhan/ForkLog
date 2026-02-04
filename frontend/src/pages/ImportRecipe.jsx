import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import RecipeEditor from "../components/RecipeEditor";

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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [importResult, setImportResult] = useState(null);

  const handleImport = async (e) => {
    e.preventDefault();
    const trimmed = source.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setImportResult(null);
    try {
      const data = isValidUrl(trimmed)
        ? await api.ai.importFromWebpage(trimmed, "", "en")
        : await api.ai.import(trimmed);
      setImportResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRecipe = async (payload) => {
    setSaving(true);
    setError(null);
    try {
      const recipe = await api.recipes.create({
        name: payload.name,
        title: payload.title,
        metadata: payload.metadata,
        ingredients: payload.ingredients ?? [],
        steps: payload.steps ?? [],
        equipment: payload.equipment ?? [],
        notes: Array.isArray(payload.notes) ? payload.notes : payload.notes ?? "",
        nutrition: payload.nutrition,
        tags: payload.tags ?? [],
      });
      setImportResult(null);
      navigate(`/recipes/${recipe.slug}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const closeModal = () => {
    setImportResult(null);
    setError(null);
  };

  return (
    <div>
      <h1 className="font-display font-semibold text-2xl text-stone-800 mb-2">
        Import recipe
      </h1>
      <p className="text-stone-500 text-sm mb-6">
        Paste recipe text or a URL. Claude will parse it; you can review and
        edit the result before creating the recipe.
      </p>

      {!importResult ? (
        <form onSubmit={handleImport} className="space-y-4">
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
      ) : null}

      {/* Modal: review and edit import result */}
      {importResult && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="import-review-title"
        >
          <div
            className="relative w-full max-w-2xl rounded-2xl bg-white shadow-xl my-8 max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-stone-200 flex-shrink-0">
              <h2 id="import-review-title" className="font-display font-semibold text-xl text-stone-800">
                Review & edit recipe
              </h2>
              <p className="text-stone-500 text-sm mt-1">
                Edit any part below, then click Create new recipe to save.
              </p>
            </div>
            <div className="px-6 py-4 overflow-y-auto flex-1">
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm mb-4">
                  {error}
                </div>
              )}
              <RecipeEditor
                initialData={importResult}
                onSubmit={handleCreateRecipe}
                submitLabel="Create new recipe"
                onCancel={closeModal}
                loading={saving}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
