// Renders a stylized front/back body diagram and highlights the muscles
// targeted by an exercise. Works fully offline — no external images or APIs —
// so it covers the "show a picture of the highlighted muscle" case for any
// Gemini-generated workout (which always includes a "Target:" line).

const SVGNS = "http://www.w3.org/2000/svg";

// Muscle regions as simple primitives positioned over each silhouette.
// Front figure is centered near x=58, back figure near x=162.
// spec forms: ["ellipse", cx, cy, rx, ry] | ["rect", x, y, w, h, radius]
const REGIONS = {
  chest: [["ellipse", 51, 50, 7, 5], ["ellipse", 65, 50, 7, 5]],
  shoulders: [["ellipse", 45, 42, 7, 6], ["ellipse", 71, 42, 7, 6]],
  biceps: [["ellipse", 40, 60, 4, 8], ["ellipse", 76, 60, 4, 8]],
  forearms: [["ellipse", 37, 77, 4, 9], ["ellipse", 79, 77, 4, 9]],
  abs: [["rect", 53, 56, 10, 18, 3]],
  obliques: [["ellipse", 49, 67, 3, 7], ["ellipse", 67, 67, 3, 7]],
  quads: [["ellipse", 51, 101, 5, 16], ["ellipse", 65, 101, 5, 16]],
  calves: [["ellipse", 51, 129, 4, 12], ["ellipse", 65, 129, 4, 12]],
  // back figure
  traps: [["ellipse", 162, 40, 9, 6]],
  lats: [["ellipse", 152, 57, 6, 9], ["ellipse", 172, 57, 6, 9]],
  triceps: [["ellipse", 141, 61, 4, 8], ["ellipse", 183, 61, 4, 8]],
  lowerback: [["rect", 157, 66, 10, 11, 3]],
  glutes: [["ellipse", 156, 87, 6, 7], ["ellipse", 168, 87, 6, 7]],
  hamstrings: [["ellipse", 156, 109, 5, 15], ["ellipse", 168, 109, 5, 15]],
  calvesback: [["ellipse", 156, 135, 4, 12], ["ellipse", 168, 135, 4, 12]],
};

// Map words from a "Target:" line to canonical region keys.
const ALIASES = [
  [/\b(chest|pec(toral)?s?)\b/, ["chest"]],
  [/\b(shoulders?|delts?|deltoids?)\b/, ["shoulders"]],
  [/\bbiceps?\b/, ["biceps"]],
  [/\btriceps?\b/, ["triceps"]],
  [/\bforearms?\b/, ["forearms"]],
  [/\b(abs?|abdominals?|core|stomach)\b/, ["abs"]],
  [/\bobliques?\b/, ["obliques"]],
  [/\b(quad(ricep)?s?|thighs?)\b/, ["quads"]],
  [/\b(hamstrings?|hams)\b/, ["hamstrings"]],
  [/\b(glut(e|es|eus)?|butt|booty)\b/, ["glutes"]],
  [/\b(calf|calves|soleus|gastrocnemius)\b/, ["calves", "calvesback"]],
  [/\b(lats?|latissimus)\b/, ["lats"]],
  [/\b(upper\s*back|rhomboids?|mid[-\s]?back)\b/, ["lats", "traps"]],
  [/\b(lower\s*back|erectors?|spinal)\b/, ["lowerback"]],
  [/\b(traps?|trapezius)\b/, ["traps"]],
  [/\bback\b/, ["lats", "traps", "lowerback"]],
  [/\blegs?\b/, ["quads", "hamstrings", "glutes", "calves", "calvesback"]],
  [/\barms?\b/, ["biceps", "triceps", "forearms"]],
  [/\b(full|total|whole)\s*body\b/, Object.keys(REGIONS)],
];

export function targetToRegions(targetText) {
  const text = (targetText || "").toLowerCase();
  if (!text) return [];
  const out = new Set();
  for (const [re, keys] of ALIASES) {
    if (re.test(text)) keys.forEach((k) => out.add(k));
  }
  return [...out];
}

function makeShape(spec) {
  const [kind, a, b, c, d, r] = spec;
  if (kind === "rect") {
    const el = document.createElementNS(SVGNS, "rect");
    el.setAttribute("x", a);
    el.setAttribute("y", b);
    el.setAttribute("width", c);
    el.setAttribute("height", d);
    el.setAttribute("rx", r ?? 2);
    return el;
  }
  const el = document.createElementNS(SVGNS, "ellipse");
  el.setAttribute("cx", a);
  el.setAttribute("cy", b);
  el.setAttribute("rx", c);
  el.setAttribute("ry", d);
  return el;
}

function silhouette(cx) {
  // Stylized humanoid built from primitives, mirrored by passing a center x.
  const g = document.createElementNS(SVGNS, "g");
  g.setAttribute("class", "mm-body");
  const parts = [
    ["ellipse", cx, 16, 9, 10], // head
    ["rect", cx - 3, 24, 6, 6, 2], // neck
    ["rect", cx - 13, 30, 26, 46, 9], // torso
    ["rect", cx - 24, 34, 9, 46, 4], // left arm
    ["rect", cx + 15, 34, 9, 46, 4], // right arm
    ["rect", cx - 12, 72, 24, 14, 6], // hips
    ["rect", cx - 11, 82, 10, 62, 5], // left leg
    ["rect", cx + 1, 82, 10, 62, 5], // right leg
  ];
  for (const p of parts) g.append(makeShape(p));
  return g;
}

// Builds the SVG and returns { svg, highlight(regions) }.
export function buildMuscleMap() {
  const svg = document.createElementNS(SVGNS, "svg");
  svg.setAttribute("viewBox", "0 0 216 152");
  svg.setAttribute("class", "mm-svg");
  svg.setAttribute("aria-hidden", "true");

  svg.append(silhouette(58));
  svg.append(silhouette(162));

  // labels
  for (const [label, x] of [["Front", 58], ["Back", 162]]) {
    const t = document.createElementNS(SVGNS, "text");
    t.setAttribute("x", x);
    t.setAttribute("y", 151);
    t.setAttribute("class", "mm-label");
    t.setAttribute("text-anchor", "middle");
    t.textContent = label;
    svg.append(t);
  }

  const byKey = new Map();
  for (const [key, specs] of Object.entries(REGIONS)) {
    const els = [];
    for (const spec of specs) {
      const el = makeShape(spec);
      el.setAttribute("class", "mm-muscle");
      svg.append(el);
      els.push(el);
    }
    byKey.set(key, els);
  }

  function highlight(regions) {
    const active = new Set(regions);
    for (const [key, els] of byKey) {
      const on = active.has(key);
      for (const el of els) el.classList.toggle("is-active", on);
    }
  }

  return { svg, highlight };
}
