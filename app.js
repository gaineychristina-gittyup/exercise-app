import { buildMuscleMap, targetToRegions } from "./muscle-map.js";

const STORAGE_KEY = "workout-runner.last-input.v1";
const HISTORY_KEY = "workout-buddy.history.v1";
const SESSIONS_KEY = "workout-buddy.sessions.v1";
const PLAN_KEY = "workout-buddy.weekly-plan.v1";
const GEMINI_KEY_KEY = "workout-buddy.gemini-key.v1";
const SORENESS_KEY = "workout-buddy.soreness.v1";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const screens = {
  home: document.querySelector('[data-screen="home"]'),
  active: document.querySelector('[data-screen="active"]'),
  done: document.querySelector('[data-screen="done"]'),
};

const panels = document.querySelectorAll(".tab-panel");
const tabs = document.querySelectorAll(".tab");

const els = {
  input: document.getElementById("workout-input"),
  preview: document.getElementById("preview-list"),
  summary: document.getElementById("summary"),
  equipment: document.getElementById("equipment"),
  todayPlan: document.getElementById("today-plan"),
  startBtn: document.getElementById("start-btn"),
  sampleBtn: document.getElementById("sample-btn"),
  exerciseName: document.getElementById("exercise-name"),
  setText: document.getElementById("set-text"),
  media: document.getElementById("exercise-media"),
  description: document.getElementById("exercise-desc"),
  timer: document.getElementById("timer"),
  nextUp: document.getElementById("next-up"),
  eta: document.getElementById("eta"),
  progress: document.getElementById("progress"),
  pauseBtn: document.getElementById("pause-btn"),
  skipBtn: document.getElementById("skip-btn"),
  prevBtn: document.getElementById("prev-btn"),
  endBtn: document.getElementById("end-btn"),
  holdBtn: document.getElementById("hold-btn"),
  newBtn: document.getElementById("new-btn"),
  clearBtn: document.getElementById("clear-btn"),
  ringFg: document.getElementById("ring-fg"),
  progressBar: document.getElementById("progressbar"),
  planEditor: document.getElementById("plan-editor"),
  planStatus: document.getElementById("plan-status"),
  calTitle: document.getElementById("cal-title"),
  calGrid: document.getElementById("cal-grid"),
  calStats: document.getElementById("cal-stats"),
  calPrev: document.getElementById("cal-prev"),
  calNext: document.getElementById("cal-next"),
  calMuscles: document.getElementById("cal-muscles"),
  geminiKey: document.getElementById("gemini-key"),
  genRequest: document.getElementById("gen-request"),
  genHistory: document.getElementById("gen-history"),
  genBtn: document.getElementById("gen-btn"),
  genStatus: document.getElementById("gen-status"),
  sorenessLocation: document.getElementById("soreness-location"),
  sorenessActivity: document.getElementById("soreness-activity"),
  sorenessNotes: document.getElementById("soreness-notes"),
  sorenessSaveBtn: document.getElementById("soreness-save-btn"),
  sorenessAiBtn: document.getElementById("soreness-ai-btn"),
  sorenessStatus: document.getElementById("soreness-status"),
  sorenessInsight: document.getElementById("soreness-insight"),
  sorenessLog: document.getElementById("soreness-log"),
  muscleMap: document.getElementById("muscle-map"),
  muscleMapSvg: document.getElementById("muscle-map-svg"),
  muscleMapCaption: document.getElementById("muscle-map-caption"),
};

const muscleMap = buildMuscleMap();
if (els.muscleMapSvg) els.muscleMapSvg.append(muscleMap.svg);

function updateMuscleMap(ex) {
  if (!els.muscleMap) return;
  const target = ex ? extractTargetLine(ex.description || "") : "";
  const regions = targetToRegions(target);
  if (!regions.length || /rest/i.test(ex?.name || "")) {
    els.muscleMap.hidden = true;
    muscleMap.highlight([]);
    return;
  }
  muscleMap.highlight(regions);
  els.muscleMapCaption.textContent = `Targets: ${target}`;
  els.muscleMap.hidden = false;
}

const REP_SET_ESTIMATE = 45; // seconds per set, used only for ETA estimation

const SAMPLE = `Jumping Jacks - 30s
Squats - 3x10
Image: https://placehold.co/800x450/1b2540/2dd4bf?text=Squat+demo
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

// Image-link handling -------------------------------------------------------
// A picture can be supplied three ways:
//   1. markdown            ![alt](https://…)
//   2. a labelled line     "Image: https://…"  (no file extension required)
//   3. a bare URL ending in a known image extension
// Labelled lines matter because lots of real image URLs (CDNs, placeholder
// services, query-based endpoints) have no .png/.jpg suffix.

const MD_IMG_RE = /!\[([^\]]*)\]\((https?:\/\/[^\s)]+?)\)/gi;
const IMG_LABEL = "image|images|photo|photos|picture|pic|img|gif|illustration|demo|figure";
const LABELED_IMG_RE = new RegExp(
  `^[ \\t>*\\-]*(?:${IMG_LABEL})\\s*[:=\\-]\\s*(https?:\\/\\/\\S+?)\\s*$`,
  "gim"
);
const BARE_IMG_RE =
  /(https?:\/\/[^\s)]+?\.(?:png|jpe?g|gif|webp|svg|avif|bmp|apng|jfif)(?:\?[^\s)]*)?(?:#[^\s)]*)?)/gi;

// Avoid mixed-content blocking on the https-served app.
const upgradeUrl = (url) => url.trim().replace(/^http:\/\//i, "https://");

function isImageOnlyLine(text) {
  const t = (text || "").trim();
  if (!t) return false;
  return (
    /^!\[[^\]]*\]\(https?:\/\/[^\s)]+\)$/i.test(t) ||
    new RegExp(`^[ \\t>*\\-]*(?:${IMG_LABEL})\\s*[:=\\-]\\s*https?:\\/\\/\\S+$`, "i").test(t) ||
    /^https?:\/\/[^\s)]+?\.(?:png|jpe?g|gif|webp|svg|avif|bmp|apng|jfif)(?:\?[^\s)]*)?(?:#[^\s)]*)?$/i.test(t)
  );
}

// Pulls every image out of a description and returns the images plus the text
// with those links removed, so the words read cleanly next to the picture.
function extractImages(text) {
  const images = [];
  const seen = new Set();
  const add = (url, alt) => {
    const u = upgradeUrl(url);
    if (!seen.has(u)) {
      seen.add(u);
      images.push({ url: u, alt: (alt || "").trim() });
    }
    return "";
  };
  let rest = String(text || "");
  if (!rest) return { images, rest: "" };
  rest = rest.replace(MD_IMG_RE, (_, alt, url) => add(url, alt));
  rest = rest.replace(LABELED_IMG_RE, (_, url) => add(url, ""));
  rest = rest.replace(BARE_IMG_RE, (url) => add(url, ""));
  rest = rest.replace(/[ \t]+$/gm, "").replace(/\n{3,}/g, "\n\n").trim();
  return { images, rest };
}

function firstImageUrl(text) {
  return extractImages(text).images[0]?.url || "";
}

function makeImg(url, alt, className) {
  const img = document.createElement("img");
  img.className = className;
  img.src = url;
  img.alt = alt || "Exercise illustration";
  img.loading = "lazy";
  img.decoding = "async";
  // Drop the element if the link is dead so we never show a broken-image icon.
  img.addEventListener("error", () => img.remove());
  return img;
}

// Renders the picture(s) for the active exercise as a prominent hero.
function renderMedia(el, images, altFallback) {
  if (!el) return;
  el.replaceChildren();
  if (!images.length) {
    el.hidden = true;
    return;
  }
  el.hidden = false;
  for (const im of images.slice(0, 4)) {
    el.append(makeImg(im.url, im.alt || altFallback, "exercise-img"));
  }
}

const KNOWN_FIELDS =
  /^(what to do|how to|how|form|target|targets|feel|equipment|gear|no weights|substitute|tip|tips|cue|cues|focus|muscles?|reps?|sets?|rest|breathing)$/i;

// Renders a description as tidy "Label — value" rows when it follows the
// generator format, otherwise as clean paragraphs.
function renderDescriptionText(el, text) {
  if (!el) return;
  el.replaceChildren();
  const t = String(text || "").trim();
  if (!t) return;
  const frag = document.createDocumentFragment();
  let para = [];
  const flush = () => {
    if (!para.length) return;
    const p = document.createElement("p");
    p.className = "desc__para";
    p.textContent = para.join(" ");
    frag.append(p);
    para = [];
  };
  for (const rawLine of t.split(/\n+/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const m = line.match(/^([A-Za-z][A-Za-z /]{1,18}?)\s*:\s*(.+)$/);
    if (m && KNOWN_FIELDS.test(m[1].trim())) {
      flush();
      const row = document.createElement("div");
      row.className = "desc__row";
      const label = document.createElement("span");
      label.className = "desc__label";
      label.textContent = m[1].trim();
      const value = document.createElement("span");
      value.className = "desc__value";
      value.textContent = m[2].trim();
      row.append(label, value);
      frag.append(row);
    } else {
      para.push(line);
    }
  }
  flush();
  el.append(frag);
}

function stripMetaFromName(text) {
  return text
    .replace(/\*\*/g, "")
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
  const description = raw.description ? String(raw.description).trim() : "";
  if (raw.sets && raw.reps) {
    return { name, type: "reps", sets: Number(raw.sets), reps: Number(raw.reps), description };
  }
  if (raw.reps && !raw.sets) {
    return { name, type: "reps", sets: 1, reps: Number(raw.reps), description };
  }
  const duration =
    Number(raw.duration ?? raw.seconds ?? raw.time) ||
    parseDuration(String(raw.duration ?? "")) ||
    30;
  return { name, type: "time", duration, description };
}

function parseLine(line) {
  const cleaned = line
    .replace(/^\s*(?:\d+[.)]\s*|[-*•]\s+)/, "")
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

  const lines = trimmed.split(/\r?\n/);
  const hasBoldHeader = lines.some((l) => /\*\*[^*]+\*\*/.test(l));

  if (!hasBoldHeader) {
    const exercises = [];
    let pendingImg = [];
    for (const raw of lines) {
      const l = raw.trim();
      if (!l || /^[#=_-]{2,}$/.test(l)) continue;
      if (isImageOnlyLine(l)) {
        if (exercises.length) {
          const prev = exercises[exercises.length - 1];
          prev.description = prev.description ? `${prev.description}\n${l}` : l;
        } else {
          pendingImg.push(l);
        }
        continue;
      }
      const ex = parseLine(l);
      if (!ex) continue;
      if (pendingImg.length) {
        ex.description = [pendingImg.join("\n"), ex.description].filter(Boolean).join("\n");
        pendingImg = [];
      }
      exercises.push(ex);
    }
    return exercises;
  }

  const exercises = [];
  let descBuf = [];
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    const t = line.trim();
    if (!t) {
      descBuf.push("");
      continue;
    }
    if (/^[#=_-]{2,}$/.test(t)) continue;
    if (/\*\*[^*]+\*\*/.test(t)) {
      if (exercises.length && descBuf.length) {
        exercises[exercises.length - 1].description = descBuf.join("\n").trim();
      }
      descBuf = [];
      const ex = parseLine(t);
      if (ex) exercises.push(ex);
    } else {
      descBuf.push(line);
    }
  }
  if (exercises.length && descBuf.length) {
    exercises[exercises.length - 1].description = descBuf.join("\n").trim();
  }
  return exercises;
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

function extractEquipmentLine(description) {
  if (!description) return "";
  const m = description.match(/^\s*Equipment:\s*(.+?)\s*$/im);
  return m ? m[1].trim() : "";
}

function extractTargetLine(description) {
  if (!description) return "";
  const m = description.match(/^\s*Target:\s*(.+?)\s*$/im);
  return m ? m[1].trim() : "";
}

function splitMuscles(text) {
  if (!text) return [];
  return text
    .split(/\s*(?:,|\band\b|&|\+|\/)\s*/i)
    .map((s) => s.replace(/\.$/, "").trim().toLowerCase())
    .filter((s) => s && !/^(none|n\/a|cardio)$/i.test(s));
}

const MUSCLE_GROUP_LABELS = {
  abs: "Abs",
  adductors: "Adductors",
  biceps: "Biceps",
  calves: "Calves",
  calvesback: "Calves",
  chest: "Chest",
  forearms: "Forearms",
  glutes: "Glutes",
  hamstrings: "Hamstrings",
  hipflexors: "Hip flexors",
  lats: "Lats",
  lowerback: "Lower back",
  obliques: "Obliques",
  quads: "Quads",
  serratus: "Serratus anterior",
  shoulders: "Shoulders",
  traps: "Traps",
  triceps: "Triceps",
};

function muscleGroupsForTarget(target) {
  const regions = targetToRegions(target);
  if (regions.length) {
    return [...new Set(regions.map((r) => MUSCLE_GROUP_LABELS[r] || r))];
  }
  return splitMuscles(target).map((m) => m.replace(/\b\w/g, (c) => c.toUpperCase()));
}

function aggregateEquipment(exercises) {
  const seen = new Map(); // lowercase key -> original
  for (const ex of exercises) {
    const raw = extractEquipmentLine(ex.description);
    if (!raw) continue;
    if (/^(none|nothing|n\/a|bodyweight)\.?$/i.test(raw)) continue;
    for (const part of raw.split(/\s*(?:,|\band\b|&|\+)\s*/i)) {
      const item = part.replace(/\.$/, "").trim();
      if (!item) continue;
      const key = item.toLowerCase();
      if (/^(none|nothing|n\/a|bodyweight)$/i.test(key)) continue;
      if (!seen.has(key)) seen.set(key, item);
    }
  }
  return [...seen.values()];
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
    const imgUrl = firstImageUrl(ex.description || "");
    if (imgUrl) li.append(makeImg(imgUrl, ex.name, "preview__thumb"));
    const name = document.createElement("span");
    name.className = "preview__name";
    name.textContent = ex.name;
    const meta = document.createElement("span");
    meta.className = "preview__meta";
    meta.textContent = exerciseLabel(ex);
    li.append(name, meta);
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
  const equipment = aggregateEquipment(exercises);
  els.equipment.textContent = equipment.length
    ? `Equipment: ${equipment.join(", ")}`
    : exercises.length
    ? "Equipment: none (bodyweight)"
    : "";
  els.startBtn.disabled = exercises.length === 0;
  localStorage.setItem(STORAGE_KEY, els.input.value);
}

const state = {
  exercises: [],
  index: 0,
  setIndex: 0,
  remaining: 0,
  elapsed: 0,
  repCount: 0,
  paused: false,
  awaitingNext: false,
  intervalId: null,
  wakeLock: null,
  sessionStart: 0,
  sessionExercises: [],
};

function captureCurrent(action) {
  const ex = state.exercises[state.index];
  if (!ex) return;
  const base = {
    name: ex.name,
    type: ex.type,
    elapsed: state.elapsed,
    action,
    target: extractTargetLine(ex.description || ""),
  };
  if (ex.type === "time") {
    base.duration = ex.duration;
    base.completedDuration = Math.max(0, ex.duration - Math.max(0, state.remaining));
  } else {
    base.sets = ex.sets;
    base.reps = ex.reps;
    base.completedSets = state.setIndex + (state.awaitingNext ? 1 : 0);
  }
  state.sessionExercises[state.index] = base;
}

function loadSessions() {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveSession(session) {
  const sessions = loadSessions();
  sessions.push(session);
  while (sessions.length > 200) sessions.shift();
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

function persistSessionIfAny(completed) {
  const exercises = state.sessionExercises.filter(Boolean);
  if (exercises.length === 0) return;
  saveSession({
    date: todayKey(),
    completed,
    startedAt: state.sessionStart,
    endedAt: Date.now(),
    totalSeconds: Math.round((Date.now() - state.sessionStart) / 1000),
    exercises,
  });
}

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
  const { images, rest } = extractImages(ex.description || "");
  renderMedia(els.media, images, ex.name);
  renderDescriptionText(els.description, rest);
  els.progress.textContent = `${state.index + 1} of ${state.exercises.length}`;
  updateMuscleMap(ex);

  document.body.classList.toggle("mode-reps", ex.type === "reps");
  document.body.classList.toggle("mode-time", ex.type !== "reps");

  if (ex.type === "reps") {
    if (state.awaitingNext) {
      els.timer.textContent = "✓";
      els.setText.textContent = `${ex.sets} set${ex.sets === 1 ? "" : "s"} done · ${formatTime(state.elapsed)}`;
      const isLast = state.index + 1 >= state.exercises.length;
      els.pauseBtn.textContent = isLast ? "Finish" : "Next exercise";
      els.pauseBtn.disabled = false;
    } else {
      els.timer.textContent = `${state.repCount}/${ex.reps}`;
      const setLabel = ex.sets > 1 ? `Set ${state.setIndex + 1} of ${ex.sets}` : "Reps";
      const tapHint = state.paused ? "paused" : "tap timer to count";
      els.setText.textContent = `${setLabel} · ${tapHint} · ${formatTime(state.elapsed)}`;
      els.pauseBtn.textContent = "Done set";
      els.pauseBtn.disabled = state.paused;
    }
  } else {
    els.timer.textContent = formatTime(state.remaining);
    els.setText.textContent = "";
    els.pauseBtn.textContent = state.paused ? "Resume" : "Pause";
    const elapsed = ex.duration - state.remaining;
    const pct = ex.duration > 0 ? Math.min(100, Math.max(0, (elapsed / ex.duration) * 100)) : 0;
    els.ringFg.style.strokeDashoffset = pct;
  }

  const totalEst = estimatedTotal(state.exercises);
  const remainingEst = remainingEstimate();
  const overall = totalEst > 0 ? Math.min(100, ((totalEst - remainingEst) / totalEst) * 100) : 0;
  els.progressBar.style.width = `${overall}%`;

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
  if (els.holdBtn) {
    els.holdBtn.classList.toggle("is-paused", state.paused);
    els.holdBtn.setAttribute("aria-label", state.paused ? "Resume" : "Pause");
    els.holdBtn.innerHTML = state.paused
      ? '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M6 4l14 8-14 8V4z"/></svg>'
      : '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>';
  }
  document.body.classList.toggle("is-rest", /rest/i.test(ex.name));
}

function tick() {
  if (state.paused) return;
  state.elapsed += 1;
  const ex = state.exercises[state.index];
  if (ex && ex.type === "time") {
    state.remaining -= 1;
    if (state.remaining <= 0) {
      beep(880, 250);
      captureCurrent("completed");
      advance(1);
      return;
    }
    if (state.remaining <= 3 && state.remaining > 0) beep(660, 80);
  }
  updateActiveUI();
}

function beginCurrent() {
  const ex = state.exercises[state.index];
  if (!ex) return finishWorkout();
  state.setIndex = 0;
  state.paused = false;
  state.awaitingNext = false;
  state.elapsed = 0;
  state.repCount = 0;
  clearInterval(state.intervalId);
  resetRing();
  if (ex.type === "time") state.remaining = ex.duration;
  updateActiveUI();
  state.intervalId = setInterval(tick, 1000);
}

function resetRing() {
  els.ringFg.style.transition = "none";
  els.ringFg.style.strokeDashoffset = 0;
  // Force reflow so the next change re-enables the transition.
  void els.ringFg.getBoundingClientRect();
  els.ringFg.style.transition = "";
}

function completeSet() {
  const ex = state.exercises[state.index];
  if (!ex || ex.type !== "reps") return;
  if (state.awaitingNext) {
    state.awaitingNext = false;
    captureCurrent("completed");
    advance(1);
    return;
  }
  if (state.setIndex < ex.sets - 1) {
    state.setIndex += 1;
    state.repCount = 0;
    beep(660, 120);
    updateActiveUI();
  } else {
    state.awaitingNext = true;
    beep(880, 250);
    updateActiveUI();
  }
}

function countRep() {
  const ex = state.exercises[state.index];
  if (!ex || ex.type !== "reps" || state.awaitingNext || state.paused) return;
  state.repCount += 1;
  if (state.repCount >= ex.reps) {
    completeSet();
  } else {
    beep(520, 40);
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
  state.sessionStart = Date.now();
  state.sessionExercises = [];
  showScreen("active");
  requestWakeLock();
  beginCurrent();
}

function finishWorkout() {
  clearInterval(state.intervalId);
  state.intervalId = null;
  releaseWakeLock();
  document.body.classList.remove("is-rest");
  persistSessionIfAny(true);
  markTodayDone();
  renderCalendar();
  beep(660, 200);
  setTimeout(() => beep(880, 350), 220);
  showScreen("done");
}

function endWorkout() {
  if (state.exercises[state.index]) captureCurrent("abandoned");
  persistSessionIfAny(false);
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
els.clearBtn.addEventListener("click", () => {
  if (!els.input.value) return;
  els.input.value = "";
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
els.skipBtn.addEventListener("click", () => {
  captureCurrent("skipped");
  advance(1);
});
els.prevBtn.addEventListener("click", () => advance(-1));
els.endBtn.addEventListener("click", endWorkout);
els.holdBtn?.addEventListener("click", () => {
  state.paused = !state.paused;
  if (!state.paused) requestWakeLock();
  updateActiveUI();
});
const timerWrap = document.getElementById("timer-wrap");
timerWrap?.addEventListener("click", countRep);
timerWrap?.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    countRep();
  }
});
els.newBtn.addEventListener("click", () => showScreen("home"));

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && state.intervalId) requestWakeLock();
});

// ---------- History ----------

function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dateFromKey(key) {
  const m = String(key || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function weekStart(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function formatWeekRange(start) {
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = { month: "short", day: "numeric" };
  return `${start.toLocaleDateString(undefined, fmt)}-${end.toLocaleDateString(undefined, fmt)}`;
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function saveHistory(set) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify([...set].sort()));
}

function markTodayDone() {
  const set = loadHistory();
  set.add(todayKey());
  saveHistory(set);
}

const calState = { year: new Date().getFullYear(), month: new Date().getMonth() };

function exerciseMuscleSeconds(ex) {
  if (ex.type === "time") {
    return Number(ex.completedDuration ?? ex.duration ?? 0) || 0;
  }
  const elapsed = Number(ex.elapsed) || 0;
  if (elapsed > 0) return elapsed;
  const completedSets = Number(ex.completedSets ?? ex.sets ?? 0) || 0;
  return completedSets * REP_SET_ESTIMATE;
}

function renderWeeklyMuscleBreakdown(monthPrefix) {
  if (!els.calMuscles) return;
  const weeks = new Map();
  const sessions = loadSessions().filter((s) => s.date && s.date.startsWith(monthPrefix));

  for (const session of sessions) {
    const date = dateFromKey(session.date);
    if (!date) continue;
    const start = weekStart(date);
    const key = todayKey(start);
    if (!weeks.has(key)) {
      weeks.set(key, { start, workoutCount: 0, muscles: new Map() });
    }
    const week = weeks.get(key);
    week.workoutCount += 1;

    for (const ex of session.exercises || []) {
      const seconds = exerciseMuscleSeconds(ex);
      if (seconds <= 0) continue;
      for (const group of muscleGroupsForTarget(ex.target || "")) {
        week.muscles.set(group, (week.muscles.get(group) || 0) + seconds);
      }
    }
  }

  if (!weeks.size) {
    els.calMuscles.innerHTML = "";
    return;
  }

  const head = document.createElement("div");
  head.className = "muscles__head";
  head.textContent = "Muscles worked by week";

  const wrap = document.createElement("div");
  wrap.className = "muscle-weeks";

  for (const week of [...weeks.values()].sort((a, b) => a.start - b.start)) {
    const section = document.createElement("section");
    section.className = "muscle-week";

    const title = document.createElement("div");
    title.className = "muscle-week__title";
    const range = document.createElement("span");
    range.textContent = formatWeekRange(week.start);
    const count = document.createElement("span");
    count.textContent = `${week.workoutCount} workout${week.workoutCount === 1 ? "" : "s"}`;
    title.append(range, count);
    section.append(title);

    if (week.muscles.size === 0) {
      const empty = document.createElement("p");
      empty.className = "muscle-week__empty";
      empty.textContent = "No muscle groups logged.";
      section.append(empty);
    } else {
      const list = document.createElement("div");
      list.className = "muscles__list";
      const sorted = [...week.muscles.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
      for (const [name, seconds] of sorted) {
        const chip = document.createElement("span");
        chip.className = "muscle";
        const label = document.createElement("span");
        label.className = "muscle__name";
        label.textContent = name;
        const time = document.createElement("span");
        time.className = "muscle__count";
        time.textContent = formatDuration(seconds);
        chip.append(label, time);
        list.append(chip);
      }
      section.append(list);
    }

    wrap.append(section);
  }

  els.calMuscles.replaceChildren(head, wrap);
}

function renderCalendar() {
  const history = loadHistory();
  const { year, month } = calState;
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startDow = first.getDay();
  const daysInMonth = last.getDate();
  const today = todayKey();

  els.calTitle.textContent = first.toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });
  els.calGrid.innerHTML = "";

  for (let i = 0; i < startDow; i++) {
    const cell = document.createElement("div");
    cell.className = "cal__day cal__day--empty";
    els.calGrid.append(cell);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const key = todayKey(new Date(year, month, day));
    const cell = document.createElement("div");
    cell.className = "cal__day";
    if (history.has(key)) cell.classList.add("cal__day--done");
    if (key === today) cell.classList.add("cal__day--today");
    cell.innerHTML = history.has(key)
      ? `<span class="cal__num">${day}</span><span class="cal__x">✕</span>`
      : `<span class="cal__num">${day}</span>`;
    els.calGrid.append(cell);
  }

  const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthDone = [...history].filter((k) => k.startsWith(monthPrefix)).length;
  els.calStats.textContent =
    monthDone === 0
      ? "No workouts yet this month."
      : `${monthDone} workout${monthDone === 1 ? "" : "s"} this month · ${currentStreak(history)}-day streak`;

  renderWeeklyMuscleBreakdown(monthPrefix);
}

function currentStreak(history) {
  let streak = 0;
  const cursor = new Date();
  while (history.has(todayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

els.calPrev.addEventListener("click", () => {
  calState.month -= 1;
  if (calState.month < 0) {
    calState.month = 11;
    calState.year -= 1;
  }
  renderCalendar();
});
els.calNext.addEventListener("click", () => {
  calState.month += 1;
  if (calState.month > 11) {
    calState.month = 0;
    calState.year += 1;
  }
  renderCalendar();
});

// ---------- Weekly plan ----------

function loadPlan() {
  try {
    const raw = localStorage.getItem(PLAN_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function savePlan(plan) {
  localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
}

function todayPlanText() {
  return loadPlan()[DAYS[new Date().getDay()]] || "";
}

function renderPlanEditor() {
  if (els.planEditor.childElementCount > 0) return; // build once
  const plan = loadPlan();
  for (const day of DAYS) {
    const wrap = document.createElement("div");
    wrap.className = "plan__day";

    const head = document.createElement("div");
    head.className = "plan__head";
    const label = document.createElement("span");
    label.className = "plan__label";
    label.textContent = day;
    const clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.className = "link-btn";
    clearBtn.textContent = "Clear";
    head.append(label, clearBtn);

    const ta = document.createElement("textarea");
    ta.className = "textarea plan__textarea";
    ta.rows = 4;
    ta.spellcheck = false;
    ta.placeholder = "Rest day, or paste a workout…";
    ta.value = plan[day] || "";
    ta.addEventListener("input", () => {
      const cur = loadPlan();
      cur[day] = ta.value;
      savePlan(cur);
      els.planStatus.textContent = "Saved.";
      refreshTodayPlan();
    });

    clearBtn.addEventListener("click", () => {
      if (!ta.value) return;
      ta.value = "";
      const cur = loadPlan();
      delete cur[day];
      savePlan(cur);
      els.planStatus.textContent = `Cleared ${day}.`;
      refreshTodayPlan();
      ta.focus();
    });

    wrap.append(head, ta);
    els.planEditor.append(wrap);
  }
}

function refreshTodayPlan() {
  const text = todayPlanText().trim();
  const dayName = DAYS[new Date().getDay()];
  if (!text) {
    els.todayPlan.hidden = true;
    els.todayPlan.textContent = "";
    return;
  }
  els.todayPlan.hidden = false;
  els.todayPlan.innerHTML = "";
  const label = document.createElement("span");
  label.textContent = `Today (${dayName}) has a planned workout. `;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "link-btn link-btn--inline";
  btn.textContent = "Load it";
  btn.addEventListener("click", () => {
    els.input.value = text;
    refreshPreview();
    els.input.focus();
    els.todayPlan.hidden = true;
  });
  els.todayPlan.append(label, btn);
}

// ---------- Soreness ----------

function loadSorenessLogs() {
  try {
    const raw = localStorage.getItem(SORENESS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveSorenessLogs(logs) {
  localStorage.setItem(SORENESS_KEY, JSON.stringify(logs.slice(-60)));
}

function formatDateTime(ts) {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function summarizeRecentMuscleWork(maxDays = 21) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - maxDays);
  const cutoffKey = todayKey(cutoff);
  const sessions = loadSessions().filter((s) => s.date >= cutoffKey).slice(-20);
  if (!sessions.length) return { text: "", muscles: new Map(), exercises: [] };

  const muscles = new Map();
  const exercises = [];
  for (const session of sessions) {
    for (const ex of session.exercises || []) {
      const seconds = exerciseMuscleSeconds(ex);
      const groups = muscleGroupsForTarget(ex.target || "");
      for (const group of groups) {
        muscles.set(group, (muscles.get(group) || 0) + seconds);
      }
      exercises.push({
        date: session.date,
        name: ex.name,
        action: ex.action || "logged",
        groups,
        seconds,
      });
    }
  }

  const muscleLines = [...muscles.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 10)
    .map(([name, seconds]) => `${name}: ${formatDuration(seconds)}`);
  const exerciseLines = exercises
    .slice(-12)
    .map((ex) => `- ${ex.date}: ${ex.name}; muscles ${ex.groups.join(", ") || "unknown"}; ${formatDuration(ex.seconds)}`);

  return {
    text: [
      muscleLines.length ? `Recent muscle load: ${muscleLines.join("; ")}` : "",
      exerciseLines.length ? `Recent exercises:\n${exerciseLines.join("\n")}` : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
    muscles,
    exercises,
  };
}

function currentSorenessInput() {
  return {
    location: els.sorenessLocation.value.trim(),
    activity: els.sorenessActivity.value.trim(),
    notes: els.sorenessNotes.value.trim(),
  };
}

function sorenessMuscleGroupsForText(text) {
  const regions = new Set(targetToRegions(text));
  const lower = String(text || "").toLowerCase();
  const add = (...keys) => keys.forEach((k) => regions.add(k));
  if (/\b(squat|lunge|step[-\s]?up|wall sit)\b/.test(lower)) add("quads", "glutes", "hamstrings");
  if (/\b(run|jog|sprint|walk|hike|jump|calf raise)\b/.test(lower)) add("calves", "calvesback", "hamstrings", "quads");
  if (/\b(deadlift|hinge|good morning|romanian)\b/.test(lower)) add("hamstrings", "glutes", "lowerback");
  if (/\b(push[-\s]?up|bench|press|plank)\b/.test(lower)) add("chest", "shoulders", "triceps", "abs");
  if (/\b(row|pull[-\s]?up|chin[-\s]?up|lat pulldown)\b/.test(lower)) add("lats", "traps", "biceps");
  if (/\b(crunch|sit[-\s]?up|mountain climber|leg raise)\b/.test(lower)) add("abs", "obliques", "hipflexors");
  return [...new Set([...regions].map((r) => MUSCLE_GROUP_LABELS[r] || r))];
}

function sorenessEntryFromInput() {
  const input = currentSorenessInput();
  if (!input.location || !input.activity) return null;
  return { id: `${Date.now()}`, createdAt: Date.now(), ...input };
}

function sorenessSignature(entry) {
  return [entry.location, entry.activity, entry.notes]
    .map((v) => String(v || "").trim().toLowerCase())
    .join("|");
}

function saveCurrentSorenessEntry(statusText = "Saved to soreness history.") {
  const entry = sorenessEntryFromInput();
  if (!entry) {
    els.sorenessStatus.textContent = "Add a location and activity.";
    if (!els.sorenessLocation.value.trim()) els.sorenessLocation.focus();
    else els.sorenessActivity.focus();
    return null;
  }
  const logs = loadSorenessLogs();
  const newest = logs[logs.length - 1];
  const isRepeat =
    newest &&
    sorenessSignature(newest) === sorenessSignature(entry) &&
    Date.now() - Number(newest.createdAt || 0) < 10 * 60 * 1000;

  if (isRepeat) {
    entry.id = newest.id;
    entry.createdAt = newest.createdAt;
    entry.updatedAt = Date.now();
    logs[logs.length - 1] = { ...newest, ...entry };
  } else {
    logs.push(entry);
  }
  saveSorenessLogs(logs);
  renderSorenessLog();
  els.sorenessStatus.textContent = statusText;
  return entry;
}

function localSorenessMatches(input) {
  const suspectedGroups = sorenessMuscleGroupsForText(`${input.location} ${input.activity}`);
  const recent = summarizeRecentMuscleWork();
  const suspected = new Set(suspectedGroups);
  const matches = recent.exercises.filter((ex) => ex.groups.some((g) => suspected.has(g))).slice(-8);
  return { suspectedGroups, recent, matches };
}

function renderSorenessInsight(title, body, input = currentSorenessInput()) {
  const { suspectedGroups, matches } = localSorenessMatches(input);
  els.sorenessInsight.innerHTML = "";

  const heading = document.createElement("div");
  heading.className = "soreness__insight-title";
  heading.textContent = title;
  els.sorenessInsight.append(heading);

  if (suspectedGroups.length) {
    const chips = document.createElement("div");
    chips.className = "muscles__list soreness__chips";
    for (const group of suspectedGroups) {
      const chip = document.createElement("span");
      chip.className = "muscle";
      chip.textContent = group;
      chips.append(chip);
    }
    els.sorenessInsight.append(chips);
  }

  if (matches.length) {
    const list = document.createElement("ul");
    list.className = "soreness__matches";
    for (const ex of matches) {
      const item = document.createElement("li");
      item.textContent = `${ex.date}: ${ex.name} (${ex.groups.join(", ")})`;
      list.append(item);
    }
    els.sorenessInsight.append(list);
  }

  if (body) {
    const text = document.createElement("div");
    text.className = "soreness__ai-text";
    text.textContent = body;
    els.sorenessInsight.append(text);
  }
}

function renderSorenessLog() {
  if (!els.sorenessLog) return;
  const logs = loadSorenessLogs().slice(-8).reverse();
  els.sorenessLog.innerHTML = "";
  if (!logs.length) {
    const empty = document.createElement("p");
    empty.className = "soreness-log__empty";
    empty.textContent = "No soreness notes yet.";
    els.sorenessLog.append(empty);
    return;
  }
  for (const entry of logs) {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "soreness-log__item";
    row.innerHTML = `
      <span class="soreness-log__main"></span>
      <span class="soreness-log__meta"></span>
    `;
    row.querySelector(".soreness-log__main").textContent = `${entry.location} after ${entry.activity}`;
    row.querySelector(".soreness-log__meta").textContent = formatDateTime(entry.createdAt);
    row.addEventListener("click", () => {
      els.sorenessLocation.value = entry.location || "";
      els.sorenessActivity.value = entry.activity || "";
      els.sorenessNotes.value = entry.notes || "";
      renderSorenessInsight("Local connections", "", entry);
    });
    els.sorenessLog.append(row);
  }
}

// ---------- Tabs ----------

function activateTab(name) {
  for (const tab of tabs) {
    const active = tab.dataset.tab === name;
    tab.classList.toggle("tab--active", active);
    tab.setAttribute("aria-selected", active ? "true" : "false");
  }
  for (const panel of panels) {
    panel.classList.toggle("hidden", panel.dataset.panel !== name);
  }
  if (name === "history") renderCalendar();
  if (name === "plan") renderPlanEditor();
  if (name === "soreness") renderSorenessLog();
  if (name === "workout") refreshTodayPlan();
}

for (const tab of tabs) {
  tab.addEventListener("click", () => activateTab(tab.dataset.tab));
}

// ---------- Gemini ----------

const GEMINI_SYSTEM_PROMPT = `You generate workout plans for the "GaineyFit" app. The user pastes your output directly into the app, so respond with ONLY the workout — no preamble, no closing remarks, no headings, no numbering, no code fences.

Each exercise is a block of lines:

  **Exercise Name** - DURATION_OR_REPS
  What to do: <one or two sentences on form>.
  Target: <specific muscles>.
  Feel: <where you should feel it>.
  Equipment: <gear needed, or "None">.
  No weights: <substitution if equipment is needed, otherwise omit this line>.

Format rules (strict):
- The header line MUST wrap the exercise name in **double asterisks**.
- Header is followed by " - " then either a duration ("30s", "45s", "1 min", "1:30"), or sets x reps ("3x10", "3 sets of 10"), or just reps ("10 reps").
- Description lines follow the header. Always include Equipment. Include "No weights:" only when equipment is required (a specific bodyweight substitution).
- Target must name specific muscles, not vague categories. Good examples: "Pectoralis major, triceps brachii, anterior deltoids, serratus anterior"; "Quadriceps, gluteus maximus, hamstrings"; "Rectus abdominis, obliques, hip flexors". Avoid "upper body", "lower body", "full body", or "cardio" by themselves.
- The app uses the Target line to show anatomy reference images, so include every main muscle that should appear.
- Equipment values should be short and concrete: "One dumbbell", "Pull-up bar", "Resistance band", "None". Comma-separate multiple items.
- Separate exercises with a single blank line.
- Rest periods: "**Rest** - 15s" with no description below it. Only between hard timed intervals — not between rep-based exercises.
- Use plain hyphens, Title Case names.

If the user's request is missing essentials, ask one short clarifying question — but only if truly necessary; default to making reasonable choices and outputting the workout.`;

const SORENESS_SYSTEM_PROMPT = `You help the GaineyFit app connect logged soreness to recent activities and muscle groups.
Respond with practical, non-diagnostic training insight only. Do not claim certainty, diagnose injuries, or give medical treatment.

Return concise text with these labels:
Likely connections:
Muscle groups:
Pattern to watch:
Next workout adjustment:

Keep it specific to the user's soreness location, related activity, and recent workout history. If soreness sounds severe, sharp, worsening, numb, swollen, or limiting normal movement, say to pause the provoking activity and consider a clinician.`;

async function callGemini(key, systemPrompt, userPrompt, temperature = 0.2) {
  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
    encodeURIComponent(key);
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: { temperature },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? "";
  if (!text) throw new Error("Empty response from Gemini.");
  return text.trim();
}

function summarizeRecentSessions(maxDays = 14) {
  const sessions = loadSessions();
  if (!sessions.length) return "";
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - maxDays);
  const cutoffKey = todayKey(cutoff);
  const recent = sessions.filter((s) => s.date >= cutoffKey).slice(-10);
  if (!recent.length) return "";
  const lines = recent.map((s) => {
    const exs = (s.exercises || [])
      .map((e) => {
        if (e.type === "reps") {
          const done = `${e.completedSets ?? 0}/${e.sets} sets of ${e.reps}`;
          return `${e.name} ${done}${e.action !== "completed" ? ` (${e.action})` : ""}`;
        }
        const dur = `${e.completedDuration ?? 0}/${e.duration}s`;
        return `${e.name} ${dur}${e.action !== "completed" ? ` (${e.action})` : ""}`;
      })
      .join("; ");
    const status = s.completed ? "" : " (ended early)";
    return `- ${s.date}${status}: ${exs}`;
  });
  return `Recent workouts (most recent last):\n${lines.join("\n")}`;
}

async function generateWorkout() {
  const key = els.geminiKey.value.trim();
  if (key) localStorage.setItem(GEMINI_KEY_KEY, key);
  const req = els.genRequest.value.trim();
  if (!key) {
    els.genStatus.textContent = "Need an API key.";
    els.geminiKey.focus();
    return;
  }
  if (!req) {
    els.genStatus.textContent = "Tell me what you want.";
    els.genRequest.focus();
    return;
  }

  const prompt = els.genHistory.checked
    ? `${req}\n\n${summarizeRecentSessions() || "(no recent history yet)"}`
    : req;

  els.genBtn.disabled = true;
  els.genStatus.textContent = "Thinking…";

  try {
    const text = await callGemini(key, GEMINI_SYSTEM_PROMPT, prompt);
    els.input.value = text;
    refreshPreview();
    els.genStatus.textContent = "Done.";
  } catch (e) {
    console.error(e);
    els.genStatus.textContent = String(e.message || e);
  } finally {
    els.genBtn.disabled = false;
  }
}

els.genBtn.addEventListener("click", generateWorkout);

async function generateSorenessInsight() {
  const key = els.geminiKey.value.trim();
  if (key) localStorage.setItem(GEMINI_KEY_KEY, key);
  const input = currentSorenessInput();
  if (!input.location || !input.activity) {
    els.sorenessStatus.textContent = "Add a location and activity.";
    if (!input.location) els.sorenessLocation.focus();
    else els.sorenessActivity.focus();
    return;
  }

  const entry = saveCurrentSorenessEntry("Saved. Need an API key for AI insights.");
  if (!entry) return;

  if (!key) {
    openSettings();
    els.geminiKey.focus();
    return;
  }

  const recent = summarizeRecentMuscleWork();
  const logs = loadSorenessLogs()
    .slice(-8)
    .map((l) => `- ${formatDateTime(l.createdAt)}: ${l.location} after ${l.activity}${l.notes ? `; notes: ${l.notes}` : ""}`)
    .join("\n");
  const { suspectedGroups, matches } = localSorenessMatches(input);
  const prompt = `Current soreness:
- Location: ${input.location}
- Related activity: ${input.activity}
- Notes: ${input.notes || "none"}

Local muscle-group guess: ${suspectedGroups.join(", ") || "unknown"}
Matching recent exercises: ${
    matches.length
      ? matches.map((ex) => `${ex.date} ${ex.name} (${ex.groups.join(", ")})`).join("; ")
      : "none found"
  }

${recent.text || "No recent workout history logged."}

Recent soreness notes:
${logs || "None"}`;

  els.sorenessAiBtn.disabled = true;
  els.sorenessStatus.textContent = "Thinking…";
  renderSorenessInsight("Local connections", "", input);

  try {
    const text = await callGemini(key, SORENESS_SYSTEM_PROMPT, prompt, 0.1);
    renderSorenessInsight("AI insights", text, input);
    els.sorenessStatus.textContent = "Done.";
  } catch (e) {
    console.error(e);
    els.sorenessStatus.textContent = String(e.message || e);
  } finally {
    els.sorenessAiBtn.disabled = false;
  }
}

els.sorenessSaveBtn?.addEventListener("click", () => {
  const entry = saveCurrentSorenessEntry();
  if (entry) renderSorenessInsight("Local connections", "", entry);
});
els.sorenessAiBtn?.addEventListener("click", generateSorenessInsight);
els.geminiKey.value = localStorage.getItem(GEMINI_KEY_KEY) || "";
els.geminiKey.addEventListener("input", () => {
  const v = els.geminiKey.value.trim();
  if (v) localStorage.setItem(GEMINI_KEY_KEY, v);
  const status = document.getElementById("settings-status");
  if (status) status.textContent = v ? "Saved." : "";
});

// ---------- Settings modal ----------

const settingsModal = document.getElementById("settings-modal");
const settingsBtn = document.getElementById("settings-btn");
const openSettingsLink = document.getElementById("gen-open-settings");

function openSettings() {
  if (!settingsModal) return;
  settingsModal.hidden = false;
  document.body.classList.add("modal-open");
}

function closeSettings() {
  if (!settingsModal) return;
  settingsModal.hidden = true;
  document.body.classList.remove("modal-open");
}

settingsBtn?.addEventListener("click", openSettings);
openSettingsLink?.addEventListener("click", openSettings);
settingsModal?.querySelectorAll("[data-close-modal]").forEach((el) => {
  el.addEventListener("click", closeSettings);
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && settingsModal && !settingsModal.hidden) closeSettings();
});

// ---------- Init ----------

const saved = localStorage.getItem(STORAGE_KEY);
if (saved) els.input.value = saved;
refreshPreview();
refreshTodayPlan();
renderSorenessLog();
