# NoDistractFocus

A customizable Pomodoro focus timer. React 19 + Vite + Zustand + Tailwind 4, installable as a PWA.

## Commands

```bash
npm install
npm run dev      # dev server
npm run build    # tsc + vite build -> dist/
npm run preview  # serve the built output
npm test         # pure-logic self-checks (node, no framework)
```

## How it works

- **`src/store.ts`** — single Zustand store, persisted to `localStorage` under
  `nodistractfocus-storage`. Writes are coalesced (1/s + on tab hide) because the
  timer updates state four times a second.
- **`src/hooks/useTimer.ts`** — the running timer is an **absolute deadline**
  (`endAt`), not accumulated tick deltas. Background tabs throttle intervals and a
  locked phone suspends them; only a deadline survives that intact.
- **`src/util.ts`** — shared pure helpers: local-date key, clock formatting,
  contrast picker, and the single shared `AudioContext`.

### Persistence

Bump `version` in `store.ts` and add a `migrate` branch whenever the persisted
shape changes. `merge` runs on every load and repairs missing or out-of-range
fields, so a payload from an older release can't render an unusable app.

## Keyboard

| Key | Action |
| --- | --- |
| `Space` | Start / pause |
| `R` | Reset |
| `F` | Focus mode |
| `N` | Skip to next |
| `Ctrl` + `Space` | Settings |
| `Esc` | Close settings, then leave focus mode |
| `Shift` + `↑` `↓` | Pick a task, `Enter` starts the queue from it |

All bindings are remappable in Settings → Shortcuts. Matching falls back to
physical key codes, so they keep working under a Thai keyboard layout.
