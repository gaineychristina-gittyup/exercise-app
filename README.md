# Exercise Tracker

A small static web app for logging workouts. Entries persist locally via `localStorage`, so no backend is required.

## Run locally

Open `index.html` directly in a browser, or serve the folder:

```sh
npm start
```

Then visit http://localhost:3000.

## Use it on your phone

After this branch is merged to `main`, GitHub Actions will deploy to GitHub Pages. To enable Pages once:

1. Go to **Settings → Pages** on the repo.
2. Set **Source** to **GitHub Actions**.

The next push to `main` will publish at:

```
https://gaineychristina-gittyup.github.io/exercise-app/
```

Open that URL on your phone — entries are stored per-device in `localStorage`.

## Files

- `index.html` — markup and form
- `styles.css` — styles (with mobile breakpoint)
- `app.js` — entry list, persistence, add/edit/delete handlers
- `.github/workflows/pages.yml` — auto-deploy to GitHub Pages on push to `main`
