const STORAGE_KEY = "exercise-tracker.entries.v1";

const form = document.getElementById("entry-form");
const list = document.getElementById("entries");
const emptyState = document.getElementById("empty-state");
const clearAllButton = document.getElementById("clear-all");

let editingId = null;

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function formatDate(timestamp) {
  const d = new Date(timestamp);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function renderViewEntry(entry) {
  const li = document.createElement("li");
  li.className = "entry";

  const main = document.createElement("div");
  main.className = "entry__main";

  const title = document.createElement("span");
  title.className = "entry__title";
  title.textContent = entry.exercise;

  const meta = document.createElement("span");
  meta.className = "entry__meta";
  const weightStr = entry.weight > 0 ? ` @ ${entry.weight} lb` : "";
  meta.textContent = `${entry.sets} × ${entry.reps}${weightStr} · ${formatDate(entry.createdAt)}`;

  main.append(title, meta);

  if (entry.notes) {
    const notes = document.createElement("span");
    notes.className = "entry__notes";
    notes.textContent = entry.notes;
    main.append(notes);
  }

  const actions = document.createElement("div");
  actions.className = "entry__actions";

  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.className = "entry__action";
  editBtn.setAttribute("aria-label", `Edit ${entry.exercise}`);
  editBtn.textContent = "Edit";
  editBtn.addEventListener("click", () => {
    editingId = entry.id;
    render(loadEntries());
  });

  const delBtn = document.createElement("button");
  delBtn.type = "button";
  delBtn.className = "entry__action entry__action--danger";
  delBtn.setAttribute("aria-label", `Delete ${entry.exercise}`);
  delBtn.textContent = "Delete";
  delBtn.addEventListener("click", () => removeEntry(entry.id));

  actions.append(editBtn, delBtn);

  li.append(main, actions);
  return li;
}

function renderEditEntry(entry) {
  const li = document.createElement("li");
  li.className = "entry entry--editing";

  const editForm = document.createElement("form");
  editForm.className = "entry-edit";
  editForm.noValidate = true;

  editForm.innerHTML = `
    <div class="entry-edit__row">
      <label>Exercise<input name="exercise" type="text" required /></label>
    </div>
    <div class="entry-edit__row entry-edit__row--split">
      <label>Sets<input name="sets" type="number" min="1" required /></label>
      <label>Reps<input name="reps" type="number" min="1" required /></label>
      <label>Weight<input name="weight" type="number" min="0" step="0.5" /></label>
    </div>
    <div class="entry-edit__row">
      <label>Notes<input name="notes" type="text" /></label>
    </div>
    <div class="entry-edit__actions">
      <button type="button" class="button button--ghost" data-action="cancel">Cancel</button>
      <button type="submit" class="button button--primary">Save</button>
    </div>
  `;

  editForm.elements.namedItem("exercise").value = entry.exercise;
  editForm.elements.namedItem("sets").value = entry.sets;
  editForm.elements.namedItem("reps").value = entry.reps;
  editForm.elements.namedItem("weight").value = entry.weight;
  editForm.elements.namedItem("notes").value = entry.notes ?? "";

  editForm.querySelector('[data-action="cancel"]').addEventListener("click", () => {
    editingId = null;
    render(loadEntries());
  });

  editForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const fd = new FormData(editForm);
    const exercise = String(fd.get("exercise") ?? "").trim();
    if (!exercise) return;
    updateEntry(entry.id, {
      exercise,
      sets: Number(fd.get("sets")) || 1,
      reps: Number(fd.get("reps")) || 1,
      weight: Number(fd.get("weight")) || 0,
      notes: String(fd.get("notes") ?? "").trim(),
    });
  });

  li.append(editForm);
  return li;
}

function render(entries) {
  list.innerHTML = "";
  if (entries.length === 0) {
    emptyState.classList.remove("hidden");
    return;
  }
  emptyState.classList.add("hidden");

  for (const entry of entries) {
    const node = entry.id === editingId ? renderEditEntry(entry) : renderViewEntry(entry);
    list.append(node);
  }
}

function addEntry(data) {
  const entries = loadEntries();
  entries.unshift({
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    ...data,
  });
  saveEntries(entries);
  render(entries);
}

function updateEntry(id, data) {
  const entries = loadEntries().map((e) => (e.id === id ? { ...e, ...data } : e));
  saveEntries(entries);
  editingId = null;
  render(entries);
}

function removeEntry(id) {
  const entries = loadEntries().filter((e) => e.id !== id);
  saveEntries(entries);
  if (editingId === id) editingId = null;
  render(entries);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const exercise = String(formData.get("exercise") ?? "").trim();
  if (!exercise) return;

  addEntry({
    exercise,
    sets: Number(formData.get("sets")) || 1,
    reps: Number(formData.get("reps")) || 1,
    weight: Number(formData.get("weight")) || 0,
    notes: String(formData.get("notes") ?? "").trim(),
  });

  form.reset();
  form.elements.namedItem("sets").value = 3;
  form.elements.namedItem("reps").value = 10;
  form.elements.namedItem("weight").value = 0;
  form.elements.namedItem("exercise").focus();
});

clearAllButton.addEventListener("click", () => {
  if (loadEntries().length === 0) return;
  if (confirm("Delete all logged workouts?")) {
    editingId = null;
    saveEntries([]);
    render([]);
  }
});

render(loadEntries());
