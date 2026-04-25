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

const SAMPLE = `Jumping Jacks - 30s
Rest - 15s
Squats - 40s
Rest - 15s
Push-ups - 40s
Rest - 15s
Plank - 45s
Rest - 15s
Lunges - 40s
Rest - 15s
High Knees - 30s
Rest - 30s
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

function normalizeExercise(raw) {
  if (!raw) return null;
  if (typeof raw === "string") return parseLine(raw);
  const name = String(raw.name ?? raw.exercise ?? "").trim();
  if (!name) return null;
  const duration =
    Number(raw.duration ?? raw.seconds ?? raw.time) ||
    parseDuration(String(raw.duration ?? "")) ||
    30;
  return { name, duration };
}

function parseLine(line) {
  const cleaned = line
    .replace(/^\s*(?:\d+[.)]\s*|[-*•]\s*)/, "")
    .trim();
  if (!cleaned) return null;
  const duration = parseDuration(cleaned) ?? 30;
  let name = cleaned
    .replace(/\(?\s*\d+:\d{2}\s*\)?/, "")
    .replace(/\(?\s*\d+(?:\.\d+)?\s*(?:min|mins|minutes?|m|s|sec|secs|seconds?)\b\s*\)?/i, "")
    .replace(/\s*[-–—:]\s*$/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (!name) name = cleaned;
  return { name, duration };
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

function renderPreview(exercises) {
  els.preview.innerHTML = "";
  if (!exercises.length) return;
  for (const ex of exercises) {
    const li = document.createElement("li");
    li.className = "preview__item";
    li.textContent = `${ex.name} · ${formatTime(ex.duration)}`;
    els.preview.append(li);
  }
}

function refreshPreview() {
  const exercises = parseWorkout(els.input.value);
  renderPreview(exercises);
  const total = totalDuration(exercises);
  els.summary.textContent = total > 0
    ? `Total ${formatDuration(total)} · done at ${formatEta(total)}`
    : "";
  els.startBtn.disabled = exercises.length === 0;
  localStorage.setItem(STORAGE_KEY, els.input.value);
}

const state = {
  exercises: [],
  index: 0,
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

function updateActiveUI() {
  const ex = state.exercises[state.index];
  if (!ex) return;
  els.exerciseName.textContent = ex.name;
  els.timer.textContent = formatTime(state.remaining);
  els.progress.textContent = `${state.index + 1} of ${state.exercises.length}`;
  const next = state.exercises[state.index + 1];
  els.nextUp.textContent = next ? `Next: ${next.name}` : "Last one";
  const futureTotal = state.exercises
    .slice(state.index + 1)
    .reduce((s, e) => s + (Number(e.duration) || 0), 0);
  const remainingTotal = state.remaining + futureTotal;
  els.eta.textContent = state.paused
    ? `${formatDuration(remainingTotal)} left · paused`
    : `${formatDuration(remainingTotal)} left · done at ${formatEta(remainingTotal)}`;
  els.pauseBtn.textContent = state.paused ? "Resume" : "Pause";
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
  state.remaining = ex.duration;
  updateActiveUI();
  clearInterval(state.intervalId);
  state.intervalId = setInterval(tick, 1000);
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
