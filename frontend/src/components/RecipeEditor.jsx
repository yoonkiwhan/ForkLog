import { useState, useCallback } from "react";

const emptyRecipe = () => ({
  name: "",
  title: "",
  metadata: {},
  ingredients: [],
  steps: [],
  equipment: [],
  notes: [],
  nutrition: null,
  tags: [],
});

function normalizeInitial(initial) {
  if (!initial) return emptyRecipe();
  return {
    name: initial.name ?? "",
    title: initial.title ?? (initial.metadata?.title ?? ""),
    metadata: { ...(initial.metadata || {}) },
    ingredients: Array.isArray(initial.ingredients) ? initial.ingredients.map((i) => ({ ...i })) : [],
    steps: Array.isArray(initial.steps) ? initial.steps.map((s) => ({ ...s })) : [],
    equipment: Array.isArray(initial.equipment) ? [...initial.equipment] : [],
    notes: Array.isArray(initial.notes) ? initial.notes.map((n) => (typeof n === "string" ? { type: "tip", content: n } : { ...n })) : [],
    nutrition: initial.nutrition && typeof initial.nutrition === "object" ? { ...initial.nutrition } : null,
    tags: Array.isArray(initial.tags) ? [...initial.tags] : [],
  };
}

function ensureId(item, prefix, index) {
  if (item.id) return item;
  return { ...item, id: `${prefix}_${String(index + 1).padStart(3, "0")}` };
}

export default function RecipeEditor({ initialData, onSubmit, submitLabel = "Save recipe", onCancel, loading = false }) {
  const [data, setData] = useState(() => normalizeInitial(initialData));

  const update = useCallback((path, value) => {
    setData((prev) => {
      const next = { ...prev };
      if (path === "metadata") next.metadata = { ...(next.metadata || {}), ...value };
      else next[path] = value;
      return next;
    });
  }, []);

  const updateMeta = useCallback((key, value) => {
    setData((prev) => ({
      ...prev,
      metadata: { ...(prev.metadata || {}), [key]: value === "" ? undefined : value },
    }));
  }, []);

  const addIngredient = useCallback(() => {
    setData((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, ensureId({ id: "", name: "", quantity: "", unit: "", preparation: "", notes: "", group: "", optional: false }, "ing", prev.ingredients.length)],
    }));
  }, []);

  const updateIngredient = useCallback((index, field, value) => {
    setData((prev) => {
      const list = [...prev.ingredients];
      list[index] = { ...list[index], [field]: value };
      return { ...prev, ingredients: list };
    });
  }, []);

  const removeIngredient = useCallback((index) => {
    setData((prev) => ({ ...prev, ingredients: prev.ingredients.filter((_, i) => i !== index) }));
  }, []);

  const addStep = useCallback(() => {
    setData((prev) => ({
      ...prev,
      steps: [...prev.steps, ensureId({ id: "", order: prev.steps.length + 1, instruction: "", duration_minutes: "", notes: "" }, "step", prev.steps.length)],
    }));
  }, []);

  const updateStep = useCallback((index, field, value) => {
    setData((prev) => {
      const list = [...prev.steps];
      list[index] = { ...list[index], [field]: value };
      if (field === "order") list[index].order = value === "" ? index + 1 : Number(value);
      return { ...prev, steps: list };
    });
  }, []);

  const removeStep = useCallback((index) => {
    setData((prev) => ({ ...prev, steps: prev.steps.filter((_, i) => i !== index) }));
  }, []);

  const setEquipment = useCallback((str) => {
    const list = str.split(",").map((s) => s.trim()).filter(Boolean);
    setData((prev) => ({ ...prev, equipment: list }));
  }, []);

  const addNote = useCallback(() => {
    setData((prev) => ({ ...prev, notes: [...prev.notes, { type: "tip", content: "" }] }));
  }, []);

  const updateNote = useCallback((index, field, value) => {
    setData((prev) => {
      const list = [...prev.notes];
      list[index] = { ...list[index], [field]: value };
      return { ...prev, notes: list };
    });
  }, []);

  const removeNote = useCallback((index) => {
    setData((prev) => ({ ...prev, notes: prev.notes.filter((_, i) => i !== index) }));
  }, []);

  const setTags = useCallback((str) => {
    const list = str.split(",").map((s) => s.trim()).filter(Boolean);
    setData((prev) => ({ ...prev, tags: list }));
  }, []);

  const setNutrition = useCallback((key, value) => {
    setData((prev) => {
      const n = prev.nutrition ? { ...prev.nutrition } : {};
      if (value === "" || value == null) delete n[key];
      else n[key] = Number(value);
      return { ...prev, nutrition: Object.keys(n).length ? n : null };
    });
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      name: (data.name || data.metadata?.title || data.title || "Untitled Recipe").trim() || "Untitled Recipe",
      title: (data.title || data.metadata?.title || data.name || "").trim() || (data.metadata?.title || data.name || "Untitled Recipe"),
      metadata: { ...data.metadata, title: data.metadata?.title || data.title || data.name || "Untitled Recipe" },
      ingredients: data.ingredients.map((ing, i) => ({
        ...ensureId(ing, "ing", i),
        quantity: ing.quantity === "" ? undefined : (typeof ing.quantity === "number" ? ing.quantity : parseFloat(ing.quantity)),
        optional: !!ing.optional,
      })),
      steps: data.steps.map((step, i) => ({
        ...ensureId(step, "step", i),
        order: typeof step.order === "number" ? step.order : i + 1,
        duration_minutes: step.duration_minutes === "" ? undefined : (typeof step.duration_minutes === "number" ? step.duration_minutes : parseInt(step.duration_minutes, 10)),
      })),
      equipment: data.equipment,
      notes: data.notes.filter((n) => (n.content || "").trim()),
      nutrition: data.nutrition && Object.keys(data.nutrition).length ? data.nutrition : null,
      tags: data.tags,
    };
    onSubmit(payload);
  };

  const meta = data.metadata || {};
  const inputCls = "w-full rounded-lg border border-stone-200 px-3 py-2 text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400";
  const labelCls = "block text-sm font-medium text-stone-600 mb-1";
  const sectionCls = "space-y-3";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basics */}
      <section className={sectionCls}>
        <h3 className="font-semibold text-stone-800">Basics</h3>
        <div>
          <label className={labelCls}>Recipe name</label>
          <input
            type="text"
            value={data.name || ""}
            onChange={(e) => update("name", e.target.value)}
            placeholder="e.g. Chocolate Chip Cookies"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Title (display)</label>
          <input
            type="text"
            value={data.title || meta.title || ""}
            onChange={(e) => { update("title", e.target.value); updateMeta("title", e.target.value); }}
            placeholder="Same as name or custom"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Description</label>
          <textarea
            value={meta.description || ""}
            onChange={(e) => updateMeta("description", e.target.value)}
            placeholder="Short description"
            className={inputCls}
            rows={2}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Servings</label>
            <input
              type="number"
              min={1}
              value={meta.servings ?? ""}
              onChange={(e) => updateMeta("servings", e.target.value ? parseInt(e.target.value, 10) : "")}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Difficulty</label>
            <select
              value={meta.difficulty || ""}
              onChange={(e) => updateMeta("difficulty", e.target.value)}
              className={inputCls}
            >
              <option value="">—</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Prep (min)</label>
            <input
              type="number"
              min={0}
              value={meta.prep_time_minutes ?? ""}
              onChange={(e) => updateMeta("prep_time_minutes", e.target.value ? parseInt(e.target.value, 10) : "")}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Cook (min)</label>
            <input
              type="number"
              min={0}
              value={meta.cook_time_minutes ?? ""}
              onChange={(e) => updateMeta("cook_time_minutes", e.target.value ? parseInt(e.target.value, 10) : "")}
              className={inputCls}
            />
          </div>
        </div>
      </section>

      {/* Ingredients */}
      <section className={sectionCls}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-stone-800">Ingredients</h3>
          <button type="button" onClick={addIngredient} className="text-sm text-amber-600 hover:underline">
            + Add
          </button>
        </div>
        <ul className="space-y-2">
          {data.ingredients.map((ing, i) => (
            <li key={i} className="flex flex-wrap items-start gap-2 rounded-lg border border-stone-100 bg-stone-50/50 p-2">
              <input
                type="text"
                value={ing.quantity ?? ""}
                onChange={(e) => updateIngredient(i, "quantity", e.target.value)}
                placeholder="Qty"
                className="w-16 rounded border border-stone-200 px-2 py-1 text-sm"
              />
              <input
                type="text"
                value={ing.unit ?? ""}
                onChange={(e) => updateIngredient(i, "unit", e.target.value)}
                placeholder="Unit"
                className="w-20 rounded border border-stone-200 px-2 py-1 text-sm"
              />
              <input
                type="text"
                value={ing.name ?? ""}
                onChange={(e) => updateIngredient(i, "name", e.target.value)}
                placeholder="Name"
                className="min-w-[140px] flex-1 rounded border border-stone-200 px-2 py-1 text-sm"
              />
              <input
                type="text"
                value={ing.preparation ?? ""}
                onChange={(e) => updateIngredient(i, "preparation", e.target.value)}
                placeholder="Prep"
                className="w-24 rounded border border-stone-200 px-2 py-1 text-sm"
              />
              <label className="flex items-center gap-1 text-sm text-stone-500">
                <input type="checkbox" checked={!!ing.optional} onChange={(e) => updateIngredient(i, "optional", e.target.checked)} />
                Optional
              </label>
              <button type="button" onClick={() => removeIngredient(i)} className="text-red-500 hover:underline text-sm">
                Remove
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Steps */}
      <section className={sectionCls}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-stone-800">Steps</h3>
          <button type="button" onClick={addStep} className="text-sm text-amber-600 hover:underline">
            + Add
          </button>
        </div>
        <ul className="space-y-3">
          {data.steps.map((step, i) => (
            <li key={i} className="rounded-lg border border-stone-100 bg-stone-50/50 p-3">
              <div className="flex justify-between gap-2 mb-2">
                <span className="text-sm font-medium text-stone-500">Step {i + 1}</span>
                <button type="button" onClick={() => removeStep(i)} className="text-red-500 hover:underline text-sm">
                  Remove
                </button>
              </div>
              <textarea
                value={step.instruction ?? ""}
                onChange={(e) => updateStep(i, "instruction", e.target.value)}
                placeholder="Instruction"
                className={`${inputCls} text-sm`}
                rows={2}
              />
              <input
                type="number"
                min={0}
                value={step.duration_minutes ?? ""}
                onChange={(e) => updateStep(i, "duration_minutes", e.target.value)}
                placeholder="Duration (min)"
                className="mt-2 w-24 rounded border border-stone-200 px-2 py-1 text-sm"
              />
            </li>
          ))}
        </ul>
      </section>

      {/* Equipment */}
      <section className={sectionCls}>
        <h3 className="font-semibold text-stone-800">Equipment</h3>
        <input
          type="text"
          value={(data.equipment || []).join(", ")}
          onChange={(e) => setEquipment(e.target.value)}
          placeholder="stand mixer, 9x13 pan, parchment paper"
          className={inputCls}
        />
      </section>

      {/* Notes */}
      <section className={sectionCls}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-stone-800">Notes & tips</h3>
          <button type="button" onClick={addNote} className="text-sm text-amber-600 hover:underline">
            + Add
          </button>
        </div>
        <ul className="space-y-2">
          {data.notes.map((note, i) => (
            <li key={i} className="flex gap-2">
              <select
                value={note.type || "tip"}
                onChange={(e) => updateNote(i, "type", e.target.value)}
                className="w-32 rounded border border-stone-200 px-2 py-1 text-sm"
              >
                <option value="tip">Tip</option>
                <option value="substitution">Substitution</option>
                <option value="storage">Storage</option>
                <option value="variation">Variation</option>
                <option value="warning">Warning</option>
              </select>
              <input
                type="text"
                value={note.content ?? ""}
                onChange={(e) => updateNote(i, "content", e.target.value)}
                placeholder="Content"
                className="flex-1 rounded border border-stone-200 px-2 py-1 text-sm"
              />
              <button type="button" onClick={() => removeNote(i)} className="text-red-500 hover:underline text-sm">
                Remove
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Tags */}
      <section className={sectionCls}>
        <h3 className="font-semibold text-stone-800">Tags</h3>
        <input
          type="text"
          value={(data.tags || []).join(", ")}
          onChange={(e) => setTags(e.target.value)}
          placeholder="family-favorite, quick-weeknight"
          className={inputCls}
        />
      </section>

      {/* Nutrition (optional) */}
      <section className={sectionCls}>
        <h3 className="font-semibold text-stone-800">Nutrition (per serving)</h3>
        <div className="grid grid-cols-2 gap-3">
          {["calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sodium_mg"].map((key) => (
            <div key={key}>
              <label className={labelCls}>{key.replace("_", " ")}</label>
              <input
                type="number"
                min={0}
                step={key.includes("_g") ? 0.1 : 1}
                value={data.nutrition?.[key] ?? ""}
                onChange={(e) => setNutrition(key, e.target.value)}
                className={inputCls}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-amber-500 text-white font-medium py-2.5 px-5 hover:bg-amber-600 disabled:opacity-50"
        >
          {loading ? "Saving…" : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-xl border border-stone-200 px-5 py-2.5 font-medium text-stone-600 hover:bg-stone-50">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export { normalizeInitial, emptyRecipe };
