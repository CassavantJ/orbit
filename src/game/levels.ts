import type { Level } from './physics';

/**
 * The levels, in order. The world is 1600×1000 with y pointing down. Every level has a known
 * one-shot solution checked in levels.test.ts; `SOLVE=1 pnpm test` measures how forgiving each
 * one is.
 */
export const LEVELS: readonly Level[] = [
  {
    id: 'first-light',
    name: 'First Light',
    hint: 'Drag back anywhere and let go to launch. Keyboard: arrows aim, Space launches.',
    launch: { x: 220, y: 560 },
    goal: { x: 1380, y: 440, radius: 55 },
    bodies: [{ kind: 'planet', x: 820, y: 820, radius: 70, mass: 12 }],
    par: 1,
  },
  {
    id: 'over-the-top',
    name: 'Over the Top',
    hint: 'Planets pull on the probe. Aim high and let gravity bring it down.',
    launch: { x: 200, y: 720 },
    goal: { x: 1400, y: 720, radius: 55 },
    bodies: [{ kind: 'planet', x: 800, y: 760, radius: 150, mass: 45 }],
    par: 1,
  },
  {
    id: 'the-gap',
    name: 'The Gap',
    launch: { x: 200, y: 520 },
    goal: { x: 1400, y: 520, radius: 50 },
    bodies: [
      { kind: 'planet', x: 800, y: 280, radius: 140, mass: 60 },
      { kind: 'planet', x: 800, y: 770, radius: 110, mass: 18 },
    ],
    par: 1,
  },
  {
    id: 'event-horizon',
    name: 'Event Horizon',
    hint: 'Black holes pull far harder than planets. Keep your distance.',
    launch: { x: 200, y: 500 },
    goal: { x: 1400, y: 500, radius: 55 },
    bodies: [{ kind: 'hole', x: 800, y: 500, radius: 24, mass: 70 }],
    par: 1,
  },
  {
    id: 'moonrise',
    name: 'Moonrise',
    hint: 'Moons move once you launch. Watch the preview and time your shot.',
    launch: { x: 180, y: 500 },
    goal: { x: 1420, y: 500, radius: 55 },
    bodies: [
      { kind: 'planet', x: 800, y: 500, radius: 100, mass: 30 },
      {
        kind: 'moon',
        x: 800,
        y: 500,
        radius: 38,
        mass: 4,
        orbit: { radius: 250, period: 5, phase: -Math.PI / 2 },
      },
    ],
    par: 1,
  },
  {
    id: 'figure-eight',
    name: 'Figure Eight',
    launch: { x: 800, y: 900 },
    goal: { x: 800, y: 110, radius: 50 },
    bodies: [
      { kind: 'planet', x: 480, y: 500, radius: 110, mass: 35 },
      { kind: 'planet', x: 1120, y: 500, radius: 110, mass: 35 },
      { kind: 'planet', x: 800, y: 500, radius: 90, mass: 10 },
    ],
    par: 1,
  },
  {
    id: 'u-turn',
    name: 'U-Turn',
    hint: 'Swing around the big planet to come back the other way.',
    launch: { x: 200, y: 240 },
    goal: { x: 200, y: 780, radius: 70 },
    bodies: [
      { kind: 'planet', x: 950, y: 510, radius: 120, mass: 50 },
      // Reaches past the left edge, so there's no sneaking around it off-screen.
      { kind: 'planet', x: 90, y: 510, radius: 180, mass: 3 },
    ],
    par: 1,
  },
  {
    id: 'beacon',
    name: 'Beacon',
    hint: 'Collect every beacon in one flight to open the goal.',
    launch: { x: 200, y: 800 },
    goal: { x: 754, y: 925, radius: 55 },
    bodies: [{ kind: 'planet', x: 800, y: 560, radius: 120, mass: 45 }],
    beacons: [{ x: 387, y: 351 }],
    par: 1,
  },
  {
    id: 'crossing',
    name: 'Crossing Traffic',
    launch: { x: 150, y: 500 },
    goal: { x: 1450, y: 500, radius: 50 },
    bodies: [
      { kind: 'planet', x: 560, y: 330, radius: 75, mass: 18 },
      {
        kind: 'moon',
        x: 560,
        y: 330,
        radius: 30,
        mass: 3,
        orbit: { radius: 190, period: 4, phase: Math.PI / 2 },
      },
      { kind: 'planet', x: 1040, y: 670, radius: 75, mass: 18 },
      {
        kind: 'moon',
        x: 1040,
        y: 670,
        radius: 30,
        mass: 3,
        orbit: { radius: 190, period: 4, phase: -Math.PI / 2 },
      },
    ],
    par: 1,
  },
  {
    id: 'binary',
    name: 'Binary',
    hint: 'Two planets circling each other. Thread the pair or go around.',
    launch: { x: 180, y: 500 },
    goal: { x: 1420, y: 500, radius: 50 },
    bodies: [
      {
        kind: 'planet',
        x: 800,
        y: 500,
        radius: 70,
        mass: 25,
        orbit: { radius: 170, period: 6, phase: 0 },
      },
      {
        kind: 'planet',
        x: 800,
        y: 500,
        radius: 70,
        mass: 25,
        orbit: { radius: 170, period: 6, phase: Math.PI },
      },
    ],
    par: 1,
  },
  {
    id: 'treasure-hunt',
    name: 'Treasure Hunt',
    launch: { x: 180, y: 250 },
    goal: { x: 359, y: 112, radius: 55 },
    bodies: [{ kind: 'planet', x: 800, y: 520, radius: 110, mass: 55 }],
    beacons: [
      { x: 249, y: 608 },
      { x: 955, y: 448 },
    ],
    par: 2,
  },
  {
    id: 'grand-tour',
    name: 'Grand Tour',
    hint: 'Out past the black hole and home again.',
    launch: { x: 160, y: 860 },
    goal: { x: 154, y: 706, radius: 55 },
    bodies: [
      { kind: 'hole', x: 820, y: 520, radius: 22, mass: 40 },
      { kind: 'planet', x: 400, y: 480, radius: 80, mass: 14 },
    ],
    beacons: [{ x: 534, y: 246 }],
    par: 2,
  },
];
