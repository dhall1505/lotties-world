# Lottie's World 🌈☁️

A hub of two bright, simple games for young children, starring Lottie and her
sausage dog Autumn.

- **Rainbow Road** 🚗 — an endless driving game (dodge, collect, drive along a rainbow road)
- **Cloud Jump** ☁️ — an endless vertical bouncer (jump cloud to cloud, collect caterpillar toys, dodge a mischievous cat)

Built with React + Vite. Both games are canvas-based with synthesized sound
effects (no audio files to manage) and use `localStorage` for best scores —
no accounts, no backend.

## Play locally

```bash
npm install
npm run dev
```

Then open the printed `localhost` URL. On your phone, use your computer's
local network IP (e.g. `npm run dev -- --host`) to test touch controls.

## Deploy to GitHub Pages

Same flow as before:

```bash
npm install
npm run deploy
```

This runs `vite build` then publishes `dist/` to the `gh-pages` branch. If
you haven't already, see the earlier setup steps for creating/connecting the
GitHub repo (`github.com/dhall1505/lotties-world`) and enabling Pages in the
repo's Settings → Pages, pointed at the `gh-pages` branch.

## Project structure

```
src/
  main.jsx          entry point — renders Hub
  Hub.jsx            the two-game landing page
  hub.css            hub styles

  App.jsx            Rainbow Road (top-level) — unchanged gameplay,
  Game.jsx           only addition is a "← All Games" link on its start
  audio.js           screen so you can get back to the hub
  style.css
  screens/           Rainbow Road's screens

  games/cloud-jump/
    CloudJumpApp.jsx     top-level screen state machine + asset preloader
    CloudJumpGame.jsx    the canvas engine (physics, platforms, collisions)
    audio.js             synthesized sound effects
    cloudjump.css        styles (all classes prefixed cj-)
    screens/             Start, How to Play, Pause, Game Over

public/
  sprites/            Rainbow Road art
  sprites-cj/          Cloud Jump art (your supplied PNGs, resized)
```

Rainbow Road's own files were left untouched apart from the one small
addition (the hub link) — its gameplay, physics, and mechanics are exactly
as they were.

## Cloud Jump — how it works

- **Physics**: gravity + a fixed bounce velocity — Lottie & Autumn auto-bounce
  on every landing, you only steer horizontally (drag/tap-hold either side of
  the screen, or arrow keys on desktop).
- **Platform generation**: procedurally generated upward, always within a
  provably reachable vertical/horizontal range of the physics constants (see
  `GRAVITY`, `BOUNCE_VY`, `H_MAX_SPEED` at the top of `CloudJumpGame.jsx`) —
  every jump is guaranteed reachable by construction.
- **Difficulty**: three tiers gated by score (`getDifficulty()`), gradually
  widening gaps, introducing moving platforms, and increasing cat frequency.
- **Cats**: positioned with a horizontal offset within their platform (not
  dead-center), so the platform itself stays landable — you just have to land
  away from the cat.
- **Rescue**: one free rescue per run if you fall off the bottom of the
  screen; a heart is still lost, but you're placed back on the last platform
  you safely landed on.
- **Background**: no separate sky-background asset was supplied, so it's
  built from a few lightweight procedural parallax layers (soft cloud blobs,
  sparkles, floating hearts, occasional pastel rainbow arcs) drawn directly
  on the canvas — see `drawDecor()`.

## Where to customise

**Rainbow Road** — see the constants/arrays at the top of `src/Game.jsx`
(perspective geometry, collectibles/obstacles/power-ups, difficulty ramp).

**Cloud Jump** — see the constants/functions near the top of
`src/games/cloud-jump/CloudJumpGame.jsx`:
- Physics feel — `GRAVITY`, `BOUNCE_VY`, `H_ACCEL`, `H_MAX_SPEED`, `H_RETAIN_PER_SEC`
- Difficulty tiers — `getDifficulty()`
- Scoring — `currentScore()`, `collectCaterpillar()`
- Background decor — `drawDecor()` / `drawDecorLayer()`

## A note on testing

I don't have a browser in the environment I built this in, so I've verified
the code carefully (every file's brackets balance, the logic was traced
through by hand) but haven't been able to click through it myself. Please
give Cloud Jump a proper playtest — physics/collision tuning in particular
is the kind of thing that's hard to get perfectly right without actually
playing it. If jumps feel too easy/hard, the gap ranges and physics constants
above are the place to tune.
