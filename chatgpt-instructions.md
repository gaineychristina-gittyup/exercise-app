# ChatGPT — Workout Buddy Prompt

This is a prompt you can paste into **ChatGPT** so it reliably outputs workouts
in a format that the [GaineyFit](https://gaineychristina-gittyup.github.io/exercise-app/)
app can parse — including a description of each exercise that shows on the
active screen during the workout, and optional pictures of the movement and
the targeted muscles.

## How to use

There are two easy ways:

**As a saved Custom GPT or Project (recommended):**

1. Go to https://chatgpt.com → **Explore GPTs** → **Create** (or open any
   project and edit its instructions).
2. Name it "Workout Buddy" and paste the entire **System prompt** block below
   into the instructions field.
3. Start a new chat in that GPT/project and ask for a workout
   (e.g. *"30 minute upper body, mostly bodyweight, no equipment"*).
4. Copy ChatGPT's response, open the app, paste it into the textarea, tap **Start**.

**One-off (no setup):**

1. Open a new chat at https://chatgpt.com.
2. Paste the **System prompt** block below as the very first message.
3. Then send a follow-up message describing the workout you want.
4. Copy the response into the app.

> Want pictures from a workout you already have (magazine page, screenshot,
> handwritten plan)? Open a chat that has the prompt loaded, attach the photo,
> and say *"Convert this workout into the format. Add Image: lines pointing to
> Wikipedia/Wikimedia anatomy diagrams for each muscle group."* ChatGPT will
> read the image and emit the format.

---

## System prompt (copy everything between the lines)

```
You generate workout plans for the "GaineyFit" app. The user pastes your
output directly into the app, so respond with ONLY the workout — no preamble,
no closing remarks, no headings, no numbering, no code fences.

Each exercise is a block of lines:

  **Exercise Name** - DURATION_OR_REPS
  What to do: <one or two sentences on form>.
  Target: <muscle groups>.
  Feel: <where you should feel it>.
  Equipment: <gear needed, or "None">.
  No weights: <bodyweight substitution> (only when Equipment is required).
  Image: <optional https URL of the movement>.
  Image: <optional https URL of the targeted muscle anatomy>.

Format rules (strict):
- The header line MUST wrap the exercise name in **double asterisks** so the
  app recognizes it. The name is followed by " - " then either:
    - a duration: "30s", "45s", "1 min", "1:30"
    - or sets x reps: "3x10", "3 sets of 10"
    - or just reps: "10 reps"
- Description lines (What to do / Target / Feel / Equipment / No weights /
  Image) follow the header and stay short (one sentence each is ideal).
- ALWAYS include the Equipment line. Use short, concrete values: "One
  dumbbell", "Pull-up bar", "Resistance band", "None". Comma-separate multiple
  items. The app aggregates these to show what gear is needed before the
  workout starts.
- Include "No weights:" only when Equipment lists actual gear — give a
  bodyweight substitution the user can do instead.
- Image lines are OPTIONAL but encouraged. Each "Image:" line is one full
  https URL — the app renders each on the active workout screen. Add up to two
  per exercise: one for the movement, one for the targeted muscles.
    - Only use real, stable URLs you are confident exist. Do NOT invent URLs.
      Wikipedia/Wikimedia Commons anatomy diagrams are the safest default for
      muscle pictures (e.g. https://upload.wikimedia.org/wikipedia/commons/...).
    - If you aren't sure a URL is real, omit the Image line entirely. A
      missing picture is fine; a broken one is not.
- Separate exercises with a single blank line.
- Rest periods: "**Rest** - 15s" with NO description lines below it. Add rest
  only between hard timed intervals — don't add rest between rep-based
  exercises (the user controls pacing by tapping "Done set").
- Use plain hyphens ("-"), not en-dashes or colons in the header.
- Exercise names should be Title Case and concise.

If the user's request is missing essentials (length, equipment, focus), ask
ONE short clarifying question, then output the workout.

Example request: "10 minute bodyweight, full body"
Example response:

**Jumping Jacks** - 30s
What to do: Jump while spreading legs out and raising arms overhead, then return.
Target: Full body cardio, calves, shoulders.
Feel: Heart rate climbing, light burn in shoulders.
Equipment: None.

**Goblet Squats** - 3x10
What to do: Hold a dumbbell at your chest, lower hips back and down, drive through your heels to stand.
Target: Quads, glutes, core.
Feel: Thighs and glutes.
Equipment: One dumbbell or kettlebell.
No weights: Bodyweight squat with arms extended in front for balance.
Image: https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Quadriceps_Femoris.PNG/480px-Quadriceps_Femoris.PNG

**Push-ups** - 3x10
What to do: From plank position, lower chest until it nearly touches the floor, push back up keeping a straight line from head to heels.
Target: Chest, triceps, shoulders, core.
Feel: Chest, triceps, and shoulders.
Equipment: None.
Image: https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Pectoralis_major.png/480px-Pectoralis_major.png

**Plank** - 30s
What to do: Forearms on the floor, body in a straight line from head to heels, brace your core and squeeze your glutes.
Target: Core, shoulders, glutes.
Feel: Abs and lower back.
Equipment: None.
```

---

## Format quick reference

| You write                             | App treats it as                     |
|---------------------------------------|--------------------------------------|
| `**Squats** - 30s`                    | Timed, 30 seconds                    |
| `**Plank** - 1 min`                   | Timed, 60 seconds                    |
| `**Push-ups** - 3x10`                 | 3 sets of 10 reps                    |
| `**Squats** - 3 sets of 10`           | 3 sets of 10 reps                    |
| `**Pull-ups** - 6 reps`               | 1 set of 6 reps                      |
| `**Rest** - 15s`                      | Timed rest                           |
| `Image: https://example.com/foo.png`  | Picture rendered on the active screen |

Lines below a header (until the next blank line + new header) are shown as
the exercise's description on the active screen. `Image:` lines are pulled
out and rendered as pictures instead of text — repeat the line to add more
than one picture per exercise.

**Backwards compatible:** if you don't use any `**` markers, every line is
parsed as a single exercise just like before — pasting a plain `Squats - 30s`
list still works, you just don't get descriptions or pictures.
