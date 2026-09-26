import { describe, expect, it } from 'vitest';

import { LEVELS } from './levels';
import {
  bodyPosition,
  launchVelocity,
  MAX_SPEED,
  predictPath,
  PROBE_RADIUS,
  simulate,
  starsFor,
  STEP,
  WORLD,
  type Level,
} from './physics';

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/** One winning shot per level, found with the solver (levels.solve.test.ts). */
const SOLUTIONS: Record<string, [degrees: number, power: number]> = {
  'first-light': [9.5, 1],
  'over-the-top': [23.5, 1],
  'the-gap': [349, 1],
  'event-horizon': [32.5, 1],
  moonrise: [20.5, 1],
  'figure-eight': [13.5, 0.72],
  'u-turn': [27.5, 0.35],
  beacon: [112, 0.27],
  crossing: [348, 1],
  binary: [350.5, 1],
  'treasure-hunt': [241, 0.26],
  'grand-tour': [329, 0.38],
};

const empty: Level = {
  id: 'empty',
  name: 'Empty',
  launch: { x: 100, y: 500 },
  goal: { x: 1500, y: 500, radius: 40 },
  bodies: [],
  par: 1,
};

describe('launch', () => {
  it('aims counterclockwise from the right, with up meaning negative y', () => {
    const up = launchVelocity({ angle: Math.PI / 2, power: 1 });
    expect(up.x).toBeCloseTo(0);
    expect(up.y).toBeCloseTo(-MAX_SPEED);
  });

  it('clamps power', () => {
    expect(launchVelocity({ angle: 0, power: 5 }).x).toBeCloseTo(MAX_SPEED);
    expect(launchVelocity({ angle: 0, power: 0 }).x).toBeGreaterThan(0);
  });
});

describe('flight', () => {
  it('flies straight with nothing to pull it', () => {
    const flight = simulate(empty, { angle: 0, power: 1 });
    expect(flight.outcome).toBe('won');
    expect(flight.time).toBeCloseTo((1500 - 40 - 100) / MAX_SPEED, 1);
  });

  it('is lost once it leaves the screen', () => {
    expect(simulate(empty, { angle: Math.PI / 2, power: 1 }).outcome).toBe('lost');
  });

  it('crashes into a body in the way', () => {
    const planet = { kind: 'planet', x: 800, y: 500, radius: 60, mass: 5 } as const;
    const flight = simulate({ ...empty, bodies: [planet] }, { angle: 0, power: 1 });
    expect(flight.outcome).toBe('crashed');
    expect(flight.hit).toBe(planet);
    expect(flight.position.x).toBeGreaterThan(800 - 60 - PROBE_RADIUS - MAX_SPEED * STEP);
  });

  it('only counts the goal once every beacon is collected', () => {
    const offPath = { ...empty, beacons: [{ x: 800, y: 200 }] };
    expect(simulate(offPath, { angle: 0, power: 1 }).outcome).toBe('lost');
    const onPath = { ...empty, beacons: [{ x: 800, y: 500 }] };
    const flight = simulate(onPath, { angle: 0, power: 1 });
    expect(flight.outcome).toBe('won');
    expect(flight.collected).toEqual([true]);
  });

  it('bends toward a planet', () => {
    const planet = { kind: 'planet', x: 800, y: 700, radius: 60, mass: 20 } as const;
    const path = predictPath({ ...empty, bodies: [planet] }, { angle: 0, power: 1 }, 1.2, 0.1);
    expect(path.at(-1)?.y).toBeGreaterThan(500);
  });

  it('plays a shot out the same way every time', () => {
    const level = LEVELS.find(({ id }) => id === 'binary') ?? empty;
    const aim = { angle: toRadians(12), power: 0.8 };
    expect(simulate(level, aim)).toEqual(simulate(level, aim));
  });

  it('moves orbiting bodies with flight time', () => {
    const moon = {
      kind: 'moon',
      x: 0,
      y: 0,
      radius: 10,
      mass: 1,
      orbit: { radius: 100, period: 4, phase: 0 },
    } as const;
    expect(bodyPosition(moon, 0).x).toBeCloseTo(100);
    expect(bodyPosition(moon, 1).y).toBeCloseTo(100);
    expect(bodyPosition(moon, 4).x).toBeCloseTo(100);
  });
});

describe('levels', () => {
  it('have unique ids', () => {
    expect(new Set(LEVELS.map(({ id }) => id)).size).toBe(LEVELS.length);
  });

  it.each(LEVELS.map((level) => [level.id, level] as const))(
    '%s can be won in one shot',
    (id, level) => {
      const solution = SOLUTIONS[id];
      expect(solution).toBeDefined();
      const [degrees, power] = solution ?? [0, 0];
      expect(simulate(level, { angle: toRadians(degrees), power }).outcome).toBe('won');
    },
  );

  it.each(LEVELS.map((level) => [level.id, level] as const))(
    '%s keeps everything on screen and clear of bodies',
    (_, level) => {
      const points = [level.launch, level.goal, ...(level.beacons ?? [])];
      for (const point of points) {
        expect(point.x).toBeGreaterThan(0);
        expect(point.y).toBeGreaterThan(0);
        expect(point.x).toBeLessThan(WORLD.width);
        expect(point.y).toBeLessThan(WORLD.height);
        for (const body of level.bodies) {
          const center = bodyPosition(body, 0);
          expect(Math.hypot(center.x - point.x, center.y - point.y)).toBeGreaterThan(
            body.radius + 20,
          );
        }
      }
    },
  );
});

describe('starsFor', () => {
  it('gives three at par, two just over, one after that', () => {
    expect(starsFor(1, 1)).toBe(3);
    expect(starsFor(3, 1)).toBe(2);
    expect(starsFor(4, 1)).toBe(1);
    expect(starsFor(2, 2)).toBe(3);
  });
});
