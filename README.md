# Orbit

A small gravity-slingshot puzzle game.

Twelve levels of slingshot puzzles: planets bend the probe's path, moons orbit, black holes
pull hard, and beacons have to be collected before the goal opens. Plays with mouse, touch,
keyboard or a controller, turns sideways on portrait phones, and saves progress in the browser.

- **Physics** (`src/game/physics.ts`): fixed-step gravity, so a shot plays out the same at any
  frame rate. Moons move with flight time, not wall time, so every shot is repeatable.
- **Levels** (`src/game/levels.ts`): plain data. `physics.test.ts` holds a winning shot for
  each; `SOLVE=1 pnpm exec vitest run levels.solve --silent=false` sweeps every angle and power
  and reports how forgiving each level is.

Part of [Jake's hub](https://raylmao.com). Scaffolded from the hub's app template, so it shares
the hub's theme, font and "back to the hub" bar (see `src/hub/`).

## Develop

```bash
pnpm install
pnpm dev
```

`pnpm check` runs the typecheck, lint, format check and tests; CI runs it on every push.

## Deploy

Hosted as its own Cloudflare Pages project at `https://orbit.raylmao.com`. The full steps
(GitHub repo, Pages project, subdomain and hub registry entry) are in the hub's
`ADDING_AN_APP.md`.

`public/_headers` lets the hub embed this app (`frame-ancestors`). If the app calls an API or
loads anything from another origin, add that origin to the Content-Security-Policy there.
