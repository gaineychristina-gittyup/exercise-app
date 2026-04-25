# Claude Workout Buddy

A guided-workout app. You paste a workout (from Claude or anywhere), tap **Start**, and it runs through each exercise with a big countdown timer, beep cues, and auto-advance — so you don't have to think about what's next.

## How to use

1. Open the site on your phone.
2. Ask Claude (or anyone) for a workout. Each line is one move with a duration. Example:
   ```
   Squats - 40s
   Rest - 15s
   Push-ups - 40s
   Plank - 1 min
   ```
   Or paste JSON like `[{"name":"Squats","duration":40}, ...]`.
3. Tap **Use sample** if you just want to try it.
4. Tap **Start workout**.

During a workout: pause/resume, skip forward, go back, or end early. The screen stays awake (Wake Lock) while the timer runs. Lines containing the word "rest" tint the screen green.

## Run locally

```sh
npm start
```

Then visit http://localhost:3000.

## Deployed at

https://gaineychristina-gittyup.github.io/exercise-app/

GitHub Actions auto-deploys on push to `main` via `.github/workflows/pages.yml`.

## Files

- `index.html` — markup (home / active / done screens)
- `styles.css` — styles, with mobile breakpoint and rest-state theming
- `app.js` — workout parser, timer state machine, audio cues, wake lock
