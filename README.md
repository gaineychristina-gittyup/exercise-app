# GaineyFit

A guided-workout app. You paste a workout (from Claude or anywhere), tap **Start**, and it runs each exercise hands-free — countdown timer for timed moves, big "Done set" button for rep-based moves.

Live at https://gaineychristina-gittyup.github.io/exercise-app/.

## Format

**Plain (one exercise per line):**

- Timed: `Squats - 30s` · `Plank - 1 min` · `Push-ups - 0:45`
- Rep-based: `Push-ups - 3x10` · `Squats - 3 sets of 10` · `Pull-ups - 6 reps`
- Rest: `Rest - 15s` (always timed)

**With descriptions** (shown on the active screen during the workout) — wrap each name in `**…**` and put the description on the lines below until the next bold header:

```
**Squats** - 3x10
What to do: Stand feet shoulder-width, lower hips back and down, drive through your heels to stand.
Target: Quads, glutes, hamstrings.
Feel: Thighs and glutes.

**Plank** - 30s
What to do: Forearms on the floor, body straight from head to heels, brace your core.
Target: Core, shoulders.
Feel: Abs and lower back.
```

JSON also works: `[{"name":"Squats","sets":3,"reps":10,"description":"…"}, {"name":"Plank","duration":30}]`.

## Get a workout from Claude

See [`claude-chat-instructions.md`](./claude-chat-instructions.md) for a system prompt you can paste into a Claude.ai project so Claude outputs workouts in this exact format.

## Generate with Gemini (free, in-app)

The Workout tab has a **Generate with Gemini** section. Paste a free API key from
[aistudio.google.com/apikey](https://aistudio.google.com/apikey) (stored only on
your device), describe what you want (*"30 min full body, no equipment"*), and
the app calls `gemini-2.5-flash` with the same system prompt + a summary of your
recent workouts so the suggestion adapts to what you've already done. The
result fills the workout textarea — review, edit, then tap Start.

## Active screen

- **Timed exercise:** countdown, beeps in the last 3s, auto-advances. Tap **Pause / Resume**.
- **Rep-based exercise:** shows reps + "Set k of n", tap **Done set** to advance. No timer — rest as long as you want.
- **Skip / Prev:** jump exercises.
- **Wake Lock:** screen stays on during a workout.
- **Rest theming:** lines named "Rest" tint the screen green.
- **ETA:** home + active screens show how long the workout takes and the clock time you'll finish (rep-based estimates use ~45s/set).

## Run locally

```sh
npm start
```

Then visit http://localhost:3000.

## Deploy

GitHub Actions auto-deploys on push to `main` via `.github/workflows/pages.yml`.

## Files

- `index.html` / `styles.css` / `app.js` — the app
- `claude-chat-instructions.md` — copy-paste system prompt for Claude.ai
- `.github/workflows/pages.yml` — Pages deploy workflow
