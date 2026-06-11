// Maps a "Target:" line to curated external anatomy images.
// Images load from Wikimedia Commons via Special:FilePath so the app can show
// real anatomy references without bundling files or calling an API at runtime.

const COMMONS_FILE_BASE = "https://commons.wikimedia.org/wiki/Special:FilePath/";
const COMMONS_PAGE_BASE = "https://commons.wikimedia.org/wiki/File:";

const IMAGE_LIBRARY = {
  chest: { label: "Pectoralis Major", file: "Pectoralis_major.png" },
  serratus: { label: "Serratus Anterior", file: "Serratus_anterior_muscle.jpg" },
  shoulders: { label: "Deltoids", file: "Deltoid_muscle_frontal.png" },
  biceps: { label: "Biceps Brachii", file: "Biceps_brachii_muscle_-_animation03.gif" },
  triceps: { label: "Triceps Brachii", file: "Triceps_brachii_muscle06.png" },
  forearms: { label: "Forearm Muscles", file: "Forearm_muscles_front_deep.png" },
  abs: { label: "Rectus Abdominis", file: "Rectus_abdominis.png" },
  obliques: { label: "External Oblique", file: "External_abdominal_oblique_muscle_2.jpg" },
  hipflexors: { label: "Hip Flexors", file: "Hip_flexor_strain.svg" },
  adductors: { label: "Hip Adductors", file: "Anterior_Hip_Muscles_2.PNG" },
  quads: { label: "Quadriceps", file: "Quadriceps_3D.gif" },
  hamstrings: { label: "Hamstrings", file: "Hamstrings.gif" },
  glutes: { label: "Gluteus Maximus", file: "Gluteus_maximus.png" },
  calves: { label: "Calves", file: "Gastrocnemius_muscle.png" },
  lats: { label: "Latissimus Dorsi", file: "Latissimus_dorsi_muscle_animation3.gif" },
  traps: { label: "Trapezius", file: "Trapezius.png" },
  lowerback: { label: "Erector Spinae", file: "Erector_spinae_muscles.png" },
};

const ALIASES = [
  [/\b(pec(toral)?s?|pectoralis\s+(major|minor))\b/, ["chest"]],
  [/\b(serratus\s+anterior|boxer'?s?\s+muscle)\b/, ["serratus"]],
  [/\b(delts?|deltoids?|anterior\s+deltoids?|lateral\s+deltoids?|posterior\s+deltoids?)\b/, ["shoulders"]],
  [/\b(biceps?|biceps\s+brachii|brachialis)\b/, ["biceps"]],
  [/\b(triceps?|triceps\s+brachii)\b/, ["triceps"]],
  [/\b(forearms?|wrist\s+flexors?|wrist\s+extensors?)\b/, ["forearms"]],
  [/\b(rectus\s+abdominis|transverse\s+abdominis|abdominals?)\b/, ["abs"]],
  [/\b(obliques?|internal\s+obliques?|external\s+obliques?)\b/, ["obliques"]],
  [/\b(hip\s*flexors?|iliopsoas|psoas|iliacus)\b/, ["hipflexors"]],
  [/\b(adductors?)\b/, ["adductors"]],
  [/\b(quad(ricep)?s?|quadriceps|rectus\s+femoris|vastus\s+lateralis|vastus\s+medialis)\b/, ["quads"]],
  [/\b(hamstrings?|hams|biceps\s+femoris|semitendinosus|semimembranosus)\b/, ["hamstrings"]],
  [/\b(glut(e|es|eus)?|gluteus\s+(maximus|medius|minimus))\b/, ["glutes"]],
  [/\b(calf|calves|soleus|gastrocnemius)\b/, ["calves"]],
  [/\b(lats?|latissimus|latissimus\s+dorsi)\b/, ["lats"]],
  [/\b(rhomboids?|rhomboid\s+(major|minor))\b/, ["lats", "traps"]],
  [/\b(erectors?|erector\s+spinae)\b/, ["lowerback"]],
  [/\b(traps?|trapezius)\b/, ["traps"]],
];

function commonsFileUrl(file) {
  return `${COMMONS_FILE_BASE}${encodeURIComponent(file)}?width=640`;
}

function commonsPageUrl(file) {
  return `${COMMONS_PAGE_BASE}${encodeURIComponent(file)}`;
}

export function targetToRegions(targetText) {
  const text = (targetText || "").toLowerCase();
  if (!text) return [];
  const matches = [];
  for (const [re, keys] of ALIASES) {
    const match = text.match(re);
    if (match) keys.forEach((key) => matches.push({ key, index: match.index ?? 0 }));
  }
  const out = new Set();
  for (const { key } of matches.sort((a, b) => a.index - b.index)) {
    out.add(key);
  }
  return [...out];
}

function makeCard(item) {
  const fig = document.createElement("figure");
  fig.className = "mm-card";

  const img = document.createElement("img");
  img.className = "mm-card__img";
  img.src = commonsFileUrl(item.file);
  img.alt = `${item.label} anatomy reference`;
  img.loading = "lazy";
  img.decoding = "async";
  img.addEventListener("error", () => fig.remove());

  const caption = document.createElement("figcaption");
  caption.className = "mm-card__caption";

  const label = document.createElement("span");
  label.className = "mm-card__label";
  label.textContent = item.label;

  const source = document.createElement("a");
  source.className = "mm-card__source";
  source.href = commonsPageUrl(item.file);
  source.target = "_blank";
  source.rel = "noopener";
  source.textContent = "Source";

  caption.append(label, source);
  fig.append(img, caption);
  return fig;
}

// Keeps the existing app contract: "svg" is now an HTML image gallery element.
export function buildMuscleMap() {
  const gallery = document.createElement("div");
  gallery.className = "mm-gallery";

  function highlight(regions) {
    gallery.replaceChildren();
    const seen = new Set();
    const items = regions
      .map((key) => ({ key, ...IMAGE_LIBRARY[key] }))
      .filter((item) => item.file && !seen.has(item.file) && seen.add(item.file));

    for (const item of items) gallery.append(makeCard(item));
  }

  return { svg: gallery, highlight };
}
