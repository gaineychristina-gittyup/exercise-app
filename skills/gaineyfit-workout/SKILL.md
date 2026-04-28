---
name: gaineyfit-workout
description: Generate workouts formatted for the GaineyFit app. Use whenever the user asks for a workout, training plan, exercise routine, or anything they want to paste into GaineyFit (e.g. "give me a 20 minute upper body workout", "make me a leg day", "quick HIIT session"). Output is wrapped in a single fenced code block so the user gets a one-click copy button and a condensed view.
---

# GaineyFit Workout Formatter

Generate workout plans formatted for the GaineyFit app at https://gaineychristina-gittyup.github.io/exercise-app/. The user pastes the output directly into the app's textarea and taps Start.

## How to respond

1. If the request is missing essentials (length, equipment, focus), ask ONE short clarifying question first. Otherwise skip straight to the workout.
2. Output the workout as a **single fenced code block** (triple backticks, no language tag). This is what gives the user the one-click copy button and the condensed box.
3. Put **nothing inside the code block except the workout itself** — no preamble, no headings, no numbering, no commentary.
4. Outside the code block, you may add at most one short sentence above (e.g. "Here's a 20-min upper-body session:") and one short sentence below (e.g. "Paste into GaineyFit and tap Start."). Keep it minimal — the code block is the product.

## Workout format (strict)

Each exercise is a block of lines:

```
**Exercise Name** - DURATION_OR_REPS
What to do: <one or two sentences on form>.
Target: <muscle groups>.
Feel: <where you should feel it>.
Equipment: <gear needed, or "None">.
No weights: <bodyweight substitution> (only when Equipment is required).
```

Rules:

- The header line MUST wrap the exercise name in `**double asterisks**` so the app recognizes it.
- After the name comes ` - ` then one of:
  - duration: `30s`, `45s`, `1 min`, `1:30`
  - sets x reps: `3x10`, `3 sets of 10`
  - just reps: `10 reps`
- Description lines (What to do / Target / Feel / Equipment / No weights) follow the header — one short sentence each.
- ALWAYS include the Equipment line. Use short concrete values: `One dumbbell`, `Pull-up bar`, `Resistance band`, `None`. Comma-separate multiples. The app aggregates these to show what gear is needed before the workout starts.
- Include `No weights:` ONLY when Equipment lists actual gear — give a bodyweight substitution.
- Separate exercises with a single blank line.
- Rest: `**Rest** - 15s` with NO description lines. Add rest only between hard timed intervals — don't add rest between rep-based exercises (the user controls pacing with "Done set").
- Use plain hyphens (`-`), not en-dashes or colons in the header.
- Exercise names: Title Case, concise.

## Example

Request: "10 minute bodyweight, full body"

Response:

Here's a quick 10-min full-body session:

```
**Jumping Jacks** - 30s
What to do: Jump while spreading legs out and raising arms overhead, then return.
Target: Full body cardio, calves, shoulders.
Feel: Heart rate climbing, light burn in shoulders.
Equipment: None.

**Bodyweight Squats** - 3x12
What to do: Stand feet shoulder-width, lower hips back and down, drive through your heels to stand.
Target: Quads, glutes, hamstrings.
Feel: Thighs and glutes.
Equipment: None.

**Push-ups** - 3x10
What to do: From plank, lower chest until it nearly touches the floor, push back up keeping a straight line from head to heels.
Target: Chest, triceps, shoulders, core.
Feel: Chest, triceps, and shoulders.
Equipment: None.

**Reverse Lunges** - 3x10
What to do: Step one foot back into a lunge, drop the back knee toward the floor, drive through the front heel to return.
Target: Quads, glutes, hamstrings.
Feel: Front-leg quad and glute.
Equipment: None.

**Plank** - 30s
What to do: Forearms on the floor, body straight from head to heels, brace your core and squeeze your glutes.
Target: Core, shoulders, glutes.
Feel: Abs and lower back.
Equipment: None.

**Mountain Climbers** - 30s
What to do: From plank, drive knees toward chest one at a time as fast as you can stay controlled.
Target: Core, shoulders, hip flexors, cardio.
Feel: Abs and shoulders, lungs working.
Equipment: None.
```

Paste into GaineyFit and tap Start.

## Quick parser reference

| You write | App treats it as |
|---|---|
| `**Squats** - 30s` | Timed, 30 seconds |
| `**Plank** - 1 min` | Timed, 60 seconds |
| `**Push-ups** - 3x10` | 3 sets of 10 reps |
| `**Squats** - 3 sets of 10` | 3 sets of 10 reps |
| `**Pull-ups** - 6 reps` | 1 set of 6 reps |
| `**Rest** - 15s` | Timed rest |
