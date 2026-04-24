const STORAGE_KEY = "exercise-tracker.entries.v1";

const form = document.getElementById("entry-form");
const list = document.getElementById("entries");
const emptyState = document.getElementById("empty-state");
const clearAllButton = document.getElementById("clear-all");

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

function render(entries) {
  list.innerHTML = "";
  if (entries.length === 0) {
    emptyState.classList.remove("hidden");
    return;
  }
  emptyState.classList.add("hidden");

  for (const entry of entries) {
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

    const del = document.createElement("button");
    del.type = "button";
    del.className = "entry__delete";
    del.setAttribute("aria-label", `Delete ${entry.exercise}`);
    del.textContent = "×";
    del.addEventListener("click", () => removeEntry(entry.id));

    li.append(main, del);
    list.append(li);
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

function removeEntry(id) {
  const entries = loadEntries().filter((e) => e.id !== id);
  saveEntries(entries);
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
    saveEntries([]);
    render([]);
  }
});

render(loadEntries());
