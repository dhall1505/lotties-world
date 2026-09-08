# Lottie's World 🌈🚗

A bright, simple endless-driving game for young children. Lottie and her
sausage dog Autumn drive along a magical rainbow road, dodging obstacles and
collecting their favourite things.

Built with React + Vite. No external image or audio assets — the artwork is
drawn live on a `<canvas>` and the sound effects are synthesized in the
browser, so the whole game is just code (easy to git-push, no binary assets
to manage).

## Play locally

```bash
npm install
npm run dev
```

Then open the printed `localhost` URL. On your phone, use your computer's
local network IP (e.g. `npm run dev -- --host`) to test touch swipe controls.

## Deploy to GitHub Pages (same flow as Colour Snap)

1. Create a new GitHub repo, e.g. `github.com/dhall1505/lotties-world`.
2. If the repo name is different from `lotties-world`, update the `base` in
   `vite.config.js` to match (e.g. `base: '/your-repo-name/'`).
3. Push this project:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Lottie's World"
   git branch -M main
   git remote add origin https://github.com/dhall1505/lotties-world.git
   git push -u origin main
   ```
4. Install dependencies and deploy the built site to the `gh-pages` branch:
   ```bash
   npm install
   npm run deploy
   ```
   This runs `vite build` then publishes the `dist` folder to `gh-pages` via
   the `gh-pages` package (same tool you used for Colour Snap).
5. In the GitHub repo settings → Pages, make sure the source is set to the
   `gh-pages` branch (it may already be selected automatically after step 4).
6. Your game will be live at:
   `https://dhall1505.github.io/lotties-world/`

## Gameplay summary

- Swipe left/right (or tap the on-screen arrows) to steer across 3 lanes.
- Collect dog treats, shells, hearts, choc jars, sweets and coins for points.
- Avoid footballs, TVs, cheese and sour sweets — each hit costs one of your
  three hearts.
- 🐰 Bunny Comforter power-up: temporary shield, absorbs one hit.
- 💩 Poo power-up: instantly clears every obstacle on screen.
- Speed increases gently over time. High score is saved on-device
  (`localStorage`) — no account needed.

## Where to customise

- **Colours / theme** — `src/style.css`
- **Road perspective / geometry** — the constants at the top of `src/Game.jsx`
  (`VANISH_X`, `HORIZON_Y`, `PLAYER_Y`, `ROAD_BOTTOM_LEFT/RIGHT`, `DEPTH_POW`)
  were measured from `public/sprites/road.png`. If you swap in a different
  road image, these will need re-measuring to match its vanishing point.
- **Collectibles / obstacles / power-ups** — the `COLLECTIBLES`, `OBSTACLES`,
  `POWERUPS` arrays near the top of `src/Game.jsx`
- **Difficulty ramp** — `state.travelTime` and `state.spawnInterval` formulas
  in `update()` inside `src/Game.jsx`
- **Sounds** — `src/audio.js`

## Art assets (public/sprites/)

Currently using your supplied images for: the car+Lottie+Autumn sprite, the
road background, coins, the bouncing football, shells, hearts, and both
power-ups. Still using placeholder emoji (not real art) for: dog treats,
choc jar, fruity sweets, cheese, and sour sweets — drop matching transparent
PNGs into `public/sprites/` and wire them into the `COLLECTIBLES` /
`OBSTACLES` arrays in `src/Game.jsx` (follow the existing `kind: 'sprite'`
entries as a template) whenever you have them.

Sprites were downscaled from the originals to keep the page light on
mobile data — no need to re-compress if you swap in new art, just keep
transparent PNGs roughly in the same size range (icons ~300–700px on their
longest side is plenty).
