const STORAGE_KEY = "workout-runner.last-input.v1";

const screens = {
  home: document.querySelector('[data-screen="home"]'),
  active: document.querySelector('[data-screen="active"]'),
  done: document.querySelector('[data-screen="done"]'),
};

const els = {
  input: document.getElementById("workout-input"),
  preview: document.getElementById("preview-list"),
  summary: document.getElementById("summary"),
  startBtn: document.getElementById("start-btn"),
  sampleBtn: document.getElementById("sample-btn"),
  exerciseName: document.getElementById("exercise-name"),
  setText: document.getElementById("set-text"),
  timer: document.getElementById("timer"),
  nextUp: document.getElementById("next-up"),
  eta: document.getElementById("eta"),
  progress: document.getElementById("progress"),
  pauseBtn: document.getElementById("pause-btn"),
  skipBtn: document.getElementById("skip-btn"),
  prevBtn: document.getElementById("prev-btn"),
  endBtn: document.getElementById("end-btn"),
  newBtn: document.getElementById("new-btn"),
};

const REP_SET_ESTIMATE = 45; // seconds per set, used only for ETA estimation

const SAMPLE = `Jumping Jacks - 30s
Squats - 3x10
Push-ups - 3x12
Plank - 45s
Lunges - 3 sets of 10
High Knees - 30s
Sit-ups - 2x15
Cool down stretch - 1 min`;

function showScreen(name) {
  for (const [key, el] of Object.entries(screens)) {
    el.classList.toggle("hidden", key !== name);
  }
}

function parseDuration(text) {
  let m = text.match(/(\d+):(\d{2})\b/);
  if (m) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  m = text.match(/(\d+(?:\.\d+)?)\s*(min|mins|minutes?|m)\b/i);
  if (m) return Math.round(parseFloat(m[1]) * 60);
  m = text.match(/(\d+)\s*(s|sec|secs|seconds?)\b/i);
  if (m) return parseInt(m[1], 10);
  return null;
}

function parseSetsReps(text) {
  let m = text.match(/(\d+)\s*[xX×]\s*(\d+)(?!\s*(?:s|sec|secs|seconds?|m|min|mins|minutes?|:)\b)/);
  if (m) return { sets: parseInt(m[1], 10), reps: parseInt(m[2], 10) };
  m = text.match(/(\d+)\s*sets?\s*(?:of|x|×)\s*(\d+)/i);
  if (m) return { sets: parseInt(m[1], 10), reps: parseInt(m[2], 10) };
  m = text.match(/(\d+)\s*(?:reps?|repetitions?)\b/i);
  if (m) return { sets: 1, reps: parseInt(m[1], 10) };
  return null;
}

function stripMetaFromName(text) {
  return text
    .replace(/\b\d+\s*[xX×]\s*\d+\b\s*(?:reps?)?/g, "")
    .replace(/\b\d+\s*sets?\s*(?:of|x|×)\s*\d+\b\s*(?:reps?)?/gi, "")
    .replace(/\b\d+\s*(?:reps?|repetitions?)\b/gi, "")
    .replace(/\(?\s*\d+:\d{2}\s*\)?/g, "")
    .replace(/\(?\s*\d+(?:\.\d+)?\s*(?:min|mins|minutes?|m|s|sec|secs|seconds?)\b\s*\)?/gi, "")
    .replace(/\s*[-–—:,]\s*$/, "")
    .replace(/\s*\(\s*\)\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function normalizeExercise(raw) {
  if (!raw) return null;
  if (typeof raw === "string") return parseLine(raw);
  const name = String(raw.name ?? raw.exercise ?? "").trim();
  if (!name) return null;
  if (raw.sets && raw.reps) {
    return { name, type: "reps", sets: Number(raw.sets), reps: Number(raw.reps) };
  }
  if (raw.reps && !raw.sets) {
    return { name, type: "reps", sets: 1, reps: Number(raw.reps) };
  }
  const duration =
    Number(raw.duration ?? raw.seconds ?? raw.time) ||
    parseDuration(String(raw.duration ?? "")) ||
    30;
  return { name, type: "time", duration };
}

function parseLine(line) {
  const cleaned = line
    .replace(/^\s*(?:\d+[.)]\s*|[-*•]\s*)/, "")
    .trim();
  if (!cleaned) return null;
  const sr = parseSetsReps(cleaned);
  if (sr) {
    const name = stripMetaFromName(cleaned) || cleaned;
    return { name, type: "reps", sets: sr.sets, reps: sr.reps };
  }
  const duration = parseDuration(cleaned) ?? 30;
  const name = stripMetaFromName(cleaned) || cleaned;
  return { name, type: "time", duration };
}

function parseWorkout(text) {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return [];
  try {
    const json = JSON.parse(trimmed);
    const list = Array.isArray(json) ? json : Array.isArray(json?.exercises) ? json.exercises : null;
    if (list) return list.map(normalizeExercise).filter(Boolean);
  } catch {}
  return trimmed
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !/^[#=_-]{2,}$/.test(l))
    .map(parseLine)
    .filter(Boolean);
}

function formatTime(seconds) {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function formatDuration(seconds) {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m < 60) return r === 0 ? `${m} min` : `${m}:${r.toString().padStart(2, "0")}`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h}h ${mm}m`;
}

function formatEta(secondsFromNow) {
  const eta = new Date(Date.now() + secondsFromNow * 1000);
  return eta.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function totalDuration(exercises) {
  return exercises.reduce((s, e) => s + (Number(e.duration) || 0), 0);
}

function totalSets(exercises) {
  return exercises.reduce((s, e) => s + (e.type === "reps" ? Number(e.sets) || 0 : 0), 0);
}

function estimatedTotal(exercises) {
  return exercises.reduce(
    (s, e) =>
      s + (e.type === "reps" ? (Number(e.sets) || 0) * REP_SET_ESTIMATE : Number(e.duration) || 0),
    0
  );
}

function exerciseLabel(ex) {
  if (ex.type === "reps") {
    return ex.sets > 1 ? `${ex.sets} × ${ex.reps} reps` : `${ex.reps} reps`;
  }
  return formatTime(ex.duration);
}

function renderPreview(exercises) {
  els.preview.innerHTML = "";
  if (!exercises.length) return;
  for (const ex of exercises) {
    const li = document.createElement("li");
    li.className = "preview__item";
    li.textContent = `${ex.name} · ${exerciseLabel(ex)}`;
    els.preview.append(li);
  }
}

function refreshPreview() {
  const exercises = parseWorkout(els.input.value);
  renderPreview(exercises);
  const sets = totalSets(exercises);
  const time = totalDuration(exercises);
  if (!exercises.length) {
    els.summary.textContent = "";
  } else if (sets === 0) {
    els.summary.textContent = `Total ${formatDuration(time)} · done at ${formatEta(time)}`;
  } else if (time === 0) {
    els.summary.textContent = `${sets} sets · ~done at ${formatEta(estimatedTotal(exercises))}`;
  } else {
    els.summary.textContent = `${formatDuration(time)} timed + ${sets} sets · ~done at ${formatEta(estimatedTotal(exercises))}`;
  }
  els.startBtn.disabled = exercises.length === 0;
  localStorage.setItem(STORAGE_KEY, els.input.value);
}

const state = {
  exercises: [],
  index: 0,
  setIndex: 0,
  remaining: 0,
  paused: false,
  intervalId: null,
  wakeLock: null,
};

function beep(frequency = 880, durationMs = 150) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000);
    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000 + 0.05);
  } catch {}
}

async function requestWakeLock() {
  try {
    if ("wakeLock" in navigator) {
      state.wakeLock = await navigator.wakeLock.request("screen");
    }
  } catch {}
}

function releaseWakeLock() {
  try {
    state.wakeLock?.release?.();
  } catch {}
  state.wakeLock = null;
}

function remainingEstimate() {
  let total = 0;
  for (let i = state.index + 1; i < state.exercises.length; i++) {
    const ex = state.exercises[i];
    total += ex.type === "reps" ? (Number(ex.sets) || 0) * REP_SET_ESTIMATE : Number(ex.duration) || 0;
  }
  const cur = state.exercises[state.index];
  if (!cur) return total;
  if (cur.type === "reps") {
    const setsLeft = Math.max(0, (Number(cur.sets) || 0) - state.setIndex);
    return total + setsLeft * REP_SET_ESTIMATE;
  }
  return total + state.remaining;
}

function updateActiveUI() {
  const ex = state.exercises[state.index];
  if (!ex) return;
  els.exerciseName.textContent = ex.name;
  els.progress.textContent = `${state.index + 1} of ${state.exercises.length}`;

  document.body.classList.toggle("mode-reps", ex.type === "reps");
  document.body.classList.toggle("mode-time", ex.type !== "reps");

  if (ex.type === "reps") {
    els.timer.textContent = `${ex.reps}`;
    els.setText.textContent =
      ex.sets > 1 ? `Set ${state.setIndex + 1} of ${ex.sets} · reps` : "reps";
    els.pauseBtn.textContent = "Done set";
  } else {
    els.timer.textContent = formatTime(state.remaining);
    els.setText.textContent = "";
    els.pauseBtn.textContent = state.paused ? "Resume" : "Pause";
  }

  const next = state.exercises[state.index + 1];
  els.nextUp.textContent = next ? `Next: ${next.name}` : "Last one";

  const remainingTotal = remainingEstimate();
  const hasReps = state.exercises.slice(state.index).some((e) => e.type === "reps");
  if (state.paused) {
    els.eta.textContent = `${formatDuration(remainingTotal)} left · paused`;
  } else if (hasReps) {
    els.eta.textContent = `~${formatDuration(remainingTotal)} left · ~done at ${formatEta(remainingTotal)}`;
  } else {
    els.eta.textContent = `${formatDuration(remainingTotal)} left · done at ${formatEta(remainingTotal)}`;
  }

  els.prevBtn.disabled = state.index === 0;
  document.body.classList.toggle("is-rest", /rest/i.test(ex.name));
}

function tick() {
  if (state.paused) return;
  state.remaining -= 1;
  if (state.remaining <= 0) {
    beep(880, 250);
    advance(1);
    return;
  }
  if (state.remaining <= 3 && state.remaining > 0) beep(660, 80);
  updateActiveUI();
}

function beginCurrent() {
  const ex = state.exercises[state.index];
  if (!ex) return finishWorkout();
  state.setIndex = 0;
  state.paused = false;
  clearInterval(state.intervalId);
  state.intervalId = null;
  if (ex.type === "reps") {
    updateActiveUI();
  } else {
    state.remaining = ex.duration;
    updateActiveUI();
    state.intervalId = setInterval(tick, 1000);
  }
}

function completeSet() {
  const ex = state.exercises[state.index];
  if (!ex || ex.type !== "reps") return;
  state.setIndex += 1;
  if (state.setIndex >= ex.sets) {
    beep(880, 250);
    advance(1);
  } else {
    beep(660, 120);
    updateActiveUI();
  }
}

function advance(delta) {
  state.index += delta;
  if (state.index >= state.exercises.length) return finishWorkout();
  if (state.index < 0) state.index = 0;
  beginCurrent();
}

function startWorkout() {
  const exercises = parseWorkout(els.input.value);
  if (!exercises.length) return;
  state.exercises = exercises;
  state.index = 0;
  state.paused = false;
  showScreen("active");
  requestWakeLock();
  beginCurrent();
}

function finishWorkout() {
  clearInterval(state.intervalId);
  state.intervalId = null;
  releaseWakeLock();
  document.body.classList.remove("is-rest");
  beep(660, 200);
  setTimeout(() => beep(880, 350), 220);
  showScreen("done");
}

function endWorkout() {
  clearInterval(state.intervalId);
  state.intervalId = null;
  releaseWakeLock();
  document.body.classList.remove("is-rest");
  showScreen("home");
}

els.input.addEventListener("input", refreshPreview);
els.startBtn.addEventListener("click", startWorkout);
els.sampleBtn.addEventListener("click", () => {
  els.input.value = SAMPLE;
  refreshPreview();
  els.input.focus();
});
els.pauseBtn.addEventListener("click", () => {
  const ex = state.exercises[state.index];
  if (ex?.type === "reps") {
    completeSet();
    return;
  }
  state.paused = !state.paused;
  if (!state.paused) requestWakeLock();
  updateActiveUI();
});
els.skipBtn.addEventListener("click", () => advance(1));
els.prevBtn.addEventListener("click", () => advance(-1));
els.endBtn.addEventListener("click", endWorkout);
els.newBtn.addEventListener("click", () => showScreen("home"));

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && state.intervalId) requestWakeLock();
});

const saved = localStorage.getItem(STORAGE_KEY);
if (saved) els.input.value = saved;
refreshPreview();
