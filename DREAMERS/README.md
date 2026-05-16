# Dreamers

A top-down 2D narrative exploration game. See [`DESIGN.md`](./DESIGN.md) for the full design.

## Status

**Phase 0** — project foundation. The page renders a static 15×15 checkerboard grid and runs a `requestAnimationFrame` loop. No gameplay yet.

Build phases are tracked in `DESIGN.md` under "Build phases".

## How to run

ES modules require a local server (browsers block `import` over `file://`). From the `DREAMERS/` directory, run any of:

```sh
# Python (most systems have it)
python3 -m http.server 8000

# Node (if you have npx)
npx --yes http-server -p 8000

# PHP
php -S localhost:8000
```

Then open <http://localhost:8000> in a browser. You should see a 480×480 checkerboard of two muted green tiles, centered on a dark page.

## Architecture

- **Vanilla HTML / CSS / JavaScript** — no frameworks, no build step, no npm.
- **ES6 modules** (`import` / `export`) for code organization.
- **Single `<canvas>`** for all rendering; the DOM holds nothing except the canvas.
- **Data-driven content** — rooms, dialogue, items, and NPCs will live as JSON under `/data` and be loaded at runtime.
- **Placeholder art** — colored rectangles for now; sprites under `/sprites/placeholders` later.

## Layout

```
DREAMERS/
├── index.html
├── style.css
├── README.md
├── DESIGN.md
├── src/
│   └── main.js          (Phase 0: canvas + loop + checkerboard)
├── data/
│   ├── rooms/dream1/    (room JSON — Phase 1)
│   └── dialogue/        (dialogue JSON — Phase 4)
└── sprites/
    └── placeholders/    (placeholder art — Phase 8)
```

Additional `/src` modules (`rooms.js`, `movement.js`, `inventory.js`, `dialogue.js`, `journal.js`, `combat.js`, `dream_state.js`) and `/data` JSON files will be added in the phase that introduces them.
