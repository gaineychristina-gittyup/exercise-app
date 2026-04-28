# Skills

Skills you can load into Claude.ai (or any Claude product that supports Skills) so it formats workouts for [GaineyFit](https://gaineychristina-gittyup.github.io/exercise-app/) without having to re-paste a system prompt every time.

## `gaineyfit-workout/`

Generates a workout in the exact format the app parses, wrapped in a fenced code block so Claude.ai shows it in a separate condensed box with a one-click copy icon.

### Use it in Claude.ai

1. Open https://claude.ai → **Settings** → **Capabilities** → **Skills** → **Create skill** (or open an existing skill to edit).
2. Upload `gaineyfit-workout/SKILL.md` (or paste its contents into a new skill named `gaineyfit-workout`).
3. In any chat, ask for a workout — e.g. *"30 minute upper body, no equipment"*. Claude will respond with a code block containing the workout. Tap the copy icon, paste into GaineyFit, tap **Start**.

### Use it as a one-off

If you don't have Skills enabled, you can paste the contents of `SKILL.md` (everything after the YAML frontmatter) at the top of a new chat as instructions — same effect, just no auto-loading.
