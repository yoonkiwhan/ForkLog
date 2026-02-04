import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import RecipeEditor, { emptyRecipe } from "../components/RecipeEditor";

export default function CreateRecipe() {
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCreate = async (payload) => {
    setLoading(true);
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
        Add a new recipe from scratch. Fill in the sections below; you can add
        ingredients, steps, and more.
      </p>
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm mb-4">
          {error}
        </div>
      )}
      <RecipeEditor
        initialData={emptyRecipe()}
        onSubmit={handleCreate}
        submitLabel="Create recipe"
        onCancel={() => navigate("/")}
        loading={loading}
      />
    </div>
  );
}
