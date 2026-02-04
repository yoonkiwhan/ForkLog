import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

export default function CreateRecipe() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const recipe = await api.recipes.create({ name: name.trim() });
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
        Create recipe
      </h1>
      <p className="text-stone-500 text-sm mb-6">
        Add a new recipe. You can add ingredients and steps on the recipe page
        or import from a webpage.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-stone-600 mb-1"
          >
            Recipe name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Chocolate Chip Cookies"
            className="w-full rounded-lg border border-stone-200 px-3 py-2 text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
            required
          />
        </div>
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-3 py-2 text-sm">
            {error}
          </div>
        )}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="rounded-xl bg-amber-500 text-white font-medium py-2.5 px-5 hover:bg-amber-600 disabled:opacity-50"
          >
            {loading ? "Creating…" : "Create recipe"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="rounded-xl border border-stone-200 px-5 py-2.5 font-medium text-stone-600 hover:bg-stone-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
