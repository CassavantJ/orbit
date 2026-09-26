import { describe, expect, it, vi } from 'vitest';

import { defaultAim, normalizeAngle, OrbitGame } from './controller';
import type { Level } from './physics';

const open: Level = {
  id: 'open',
  name: 'Open',
  launch: { x: 100, y: 500 },
  goal: { x: 1500, y: 500, radius: 40 },
  bodies: [{ kind: 'planet', x: 800, y: 100, radius: 40, mass: 1 }],
  par: 1,
};

const run = (game: OrbitGame, seconds: number) => {
  for (let elapsed = 0; elapsed < seconds; elapsed += 1 / 60) game.update(1 / 60);
};

describe('OrbitGame', () => {
  it('starts aimed at the goal', () => {
    expect(defaultAim(open).angle).toBeCloseTo(0);
    const up: Level = { ...open, goal: { x: 100, y: 100, radius: 40 } };
    expect(defaultAim(up).angle).toBeCloseTo(Math.PI / 2);
  });

  it('flies a shot to the goal and counts it', () => {
    const game = new OrbitGame(open);
    const listener = vi.fn();
    game.subscribe(listener);
    game.setAim({ angle: 0, power: 1 });
    game.launch();
    expect(game.getSnapshot()).toMatchObject({ phase: 'flying', shots: 1 });
    run(game, 3);
    expect(game.getSnapshot()).toMatchObject({ phase: 'won', message: 'Goal reached in 1 shot.' });
    expect(game.ghost.length).toBeGreaterThan(10);
    expect(listener).toHaveBeenCalled();
  });

  it('ignores aiming and launching mid-flight', () => {
    const game = new OrbitGame(open);
    game.launch();
    const aim = game.aim;
    game.setAim({ angle: 2, power: 0.2 });
    game.launch();
    expect(game.aim).toBe(aim);
    expect(game.shots).toBe(1);
  });

  it('reports a miss, keeps the path, then lets you aim again', () => {
    const game = new OrbitGame(open);
    game.setAim({ angle: Math.PI / 2, power: 1 });
    game.launch();
    // Off the top after about 0.9 s.
    run(game, 1.2);
    expect(game.getSnapshot()).toMatchObject({ phase: 'missed', message: 'Lost in space.' });
    run(game, 1.5);
    expect(game.phase).toBe('aiming');
    expect(game.ghost.length).toBeGreaterThan(0);
    expect(game.shownFlight).toBeNull();
  });

  it('names what the probe crashed into', () => {
    const game = new OrbitGame({
      ...open,
      bodies: [{ kind: 'hole', x: 500, y: 500, radius: 20, mass: 10 }],
    });
    game.setAim({ angle: 0, power: 0.5 });
    game.launch();
    run(game, 3);
    expect(game.message).toBe('Swallowed by the black hole.');
  });

  it('keeps aim in range', () => {
    const game = new OrbitGame(open);
    game.setAim({ angle: -Math.PI / 2, power: 3 });
    expect(game.aim.angle).toBeCloseTo((3 * Math.PI) / 2);
    expect(game.aim.power).toBe(1);
    expect(normalizeAngle(Math.PI * 5)).toBeCloseTo(Math.PI);
  });

  it('restarts with no shots and no trails', () => {
    const game = new OrbitGame(open);
    game.launch();
    run(game, 3);
    game.restart();
    expect(game.getSnapshot()).toMatchObject({ phase: 'aiming', shots: 0 });
    expect(game.ghost).toEqual([]);
  });
});
