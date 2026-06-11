// Renders a stylized front/back body diagram and highlights the muscles
// targeted by an exercise. Works fully offline — no external images or APIs —
// so it covers the "show a picture of the highlighted muscle" case for any
// Gemini-generated workout (which always includes a "Target:" line).

const SVGNS = "http://www.w3.org/2000/svg";

// Muscle regions as layered primitives positioned over each silhouette.
// Front figure is centered near x=58, back figure near x=162.
// spec forms: ["ellipse", cx, cy, rx, ry] | ["rect", x, y, w, h, radius] | ["path", d]
const REGIONS = {
  chest: [["path", "M47 45 C50 40 57 41 58 48 C56 54 49 55 45 51 Z"], ["path", "M69 45 C66 40 59 41 58 48 C60 54 67 55 71 51 Z"]],
  shoulders: [["ellipse", 43, 42, 7, 6], ["ellipse", 73, 42, 7, 6]],
  biceps: [["ellipse", 38, 59, 4, 10], ["ellipse", 78, 59, 4, 10]],
  forearms: [["ellipse", 35, 77, 4, 10], ["ellipse", 81, 77, 4, 10]],
  abs: [["path", "M52 55 H64 V77 C61 80 55 80 52 77 Z"]],
  obliques: [["path", "M48 58 C51 62 51 73 47 78 C44 71 44 63 48 58 Z"], ["path", "M68 58 C65 62 65 73 69 78 C72 71 72 63 68 58 Z"]],
  hipflexors: [["path", "M49 82 C53 79 56 81 56 87 C52 88 49 86 49 82 Z"], ["path", "M67 82 C63 79 60 81 60 87 C64 88 67 86 67 82 Z"]],
  adductors: [["path", "M55 91 C59 100 58 113 55 121 C51 111 51 99 55 91 Z"], ["path", "M61 91 C57 100 58 113 61 121 C65 111 65 99 61 91 Z"]],
  quads: [["path", "M48 88 C55 91 56 115 51 123 C44 116 43 96 48 88 Z"], ["path", "M68 88 C61 91 60 115 65 123 C72 116 73 96 68 88 Z"]],
  calves: [["path", "M48 121 C53 126 54 142 49 147 C44 141 44 127 48 121 Z"], ["path", "M68 121 C63 126 62 142 67 147 C72 141 72 127 68 121 Z"]],
  // back figure
  traps: [["path", "M149 43 C154 34 170 34 175 43 C168 47 156 47 149 43 Z"]],
  lats: [["path", "M148 49 C157 53 158 69 150 78 C144 68 143 56 148 49 Z"], ["path", "M176 49 C167 53 166 69 174 78 C180 68 181 56 176 49 Z"]],
  triceps: [["ellipse", 141, 61, 4, 10], ["ellipse", 183, 61, 4, 10]],
  lowerback: [["path", "M157 66 H167 V82 C164 84 160 84 157 82 Z"]],
  glutes: [["path", "M151 84 C156 79 163 83 162 91 C158 96 151 94 150 88 Z"], ["path", "M173 84 C168 79 161 83 162 91 C166 96 173 94 174 88 Z"]],
  hamstrings: [["path", "M153 94 C160 101 159 121 154 128 C148 119 148 101 153 94 Z"], ["path", "M171 94 C164 101 165 121 170 128 C176 119 176 101 171 94 Z"]],
  calvesback: [["path", "M153 123 C158 129 158 144 153 149 C148 142 149 129 153 123 Z"], ["path", "M171 123 C166 129 166 144 171 149 C176 142 175 129 171 123 Z"]],
};

// Map words from a "Target:" line to canonical region keys.
const ALIASES = [
  [/\b(chest|pec(toral)?s?|pectoralis\s+(major|minor))\b/, ["chest"]],
  [/\b(shoulders?|delts?|deltoids?|anterior\s+deltoids?|lateral\s+deltoids?|posterior\s+deltoids?)\b/, ["shoulders"]],
  [/\b(biceps?|biceps\s+brachii|brachialis)\b/, ["biceps"]],
  [/\b(triceps?|triceps\s+brachii)\b/, ["triceps"]],
  [/\b(forearms?|wrist\s+flexors?|wrist\s+extensors?)\b/, ["forearms"]],
  [/\b(abs?|abdominals?|core|stomach|rectus\s+abdominis|transverse\s+abdominis)\b/, ["abs"]],
  [/\b(obliques?|internal\s+obliques?|external\s+obliques?)\b/, ["obliques"]],
  [/\b(hip\s*flexors?|iliopsoas|psoas|iliacus)\b/, ["hipflexors"]],
  [/\b(adductors?|inner\s+thighs?|groin)\b/, ["adductors"]],
  [/\b(quad(ricep)?s?|quadriceps|rectus\s+femoris|vastus\s+lateralis|vastus\s+medialis|thighs?)\b/, ["quads"]],
  [/\b(hamstrings?|hams|biceps\s+femoris|semitendinosus|semimembranosus)\b/, ["hamstrings"]],
  [/\b(glut(e|es|eus)?|gluteus\s+(maximus|medius|minimus)|butt|booty)\b/, ["glutes"]],
  [/\b(calf|calves|soleus|gastrocnemius)\b/, ["calves", "calvesback"]],
  [/\b(lats?|latissimus|latissimus\s+dorsi)\b/, ["lats"]],
  [/\b(upper\s*back|rhomboids?|rhomboid\s+(major|minor)|mid[-\s]?back)\b/, ["lats", "traps"]],
  [/\b(lower\s*back|erectors?|erector\s+spinae|spinal)\b/, ["lowerback"]],
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
  if (kind === "path") {
    const el = document.createElementNS(SVGNS, "path");
    el.setAttribute("d", a);
    return el;
  }
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
    ["path", `M${cx - 13} 32 C${cx - 18} 40 ${cx - 17} 66 ${cx - 10} 78 H${cx + 10} C${cx + 17} 66 ${cx + 18} 40 ${cx + 13} 32 Z`], // torso
    ["rect", cx - 24, 34, 9, 46, 4], // left arm
    ["rect", cx + 15, 34, 9, 46, 4], // right arm
    ["ellipse", cx, 83, 14, 8], // hips
    ["rect", cx - 11, 82, 10, 62, 5], // left leg
    ["rect", cx + 1, 82, 10, 62, 5], // right leg
  ];
  for (const p of parts) g.append(makeShape(p));
  return g;
}

function appendDefs(svg) {
  const defs = document.createElementNS(SVGNS, "defs");
  defs.innerHTML = `
    <linearGradient id="mm-body-grad" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#273a68" />
      <stop offset="58%" stop-color="#17233e" />
      <stop offset="100%" stop-color="#0f172a" />
    </linearGradient>
    <radialGradient id="mm-muscle-active" cx="35%" cy="28%" r="75%">
      <stop offset="0%" stop-color="#8ffff1" />
      <stop offset="45%" stop-color="#2dd4bf" />
      <stop offset="100%" stop-color="#0891b2" />
    </radialGradient>
    <linearGradient id="mm-muscle-muted" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#31446f" />
      <stop offset="100%" stop-color="#1c2948" />
    </linearGradient>
    <filter id="mm-glow" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="2.2" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  `;
  svg.append(defs);
}

// Builds the SVG and returns { svg, highlight(regions) }.
export function buildMuscleMap() {
  const svg = document.createElementNS(SVGNS, "svg");
  svg.setAttribute("viewBox", "0 0 216 152");
  svg.setAttribute("class", "mm-svg");
  svg.setAttribute("aria-hidden", "true");

  appendDefs(svg);
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
