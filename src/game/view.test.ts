import { describe, expect, it } from 'vitest';

import { WORLD } from './physics';
import { createView, directionToWorld, toScreen, toWorld } from './view';

describe('view', () => {
  it('fits the world in a landscape canvas, centered', () => {
    const view = createView(1624, 1024);
    expect(view.rotated).toBe(false);
    expect(toScreen(view, { x: 0, y: 0 })).toEqual({ x: 12, y: 12 });
    expect(toScreen(view, { x: WORLD.width, y: WORLD.height })).toEqual({ x: 1612, y: 1012 });
  });

  it('turns a portrait canvas so the left of the world is at the bottom', () => {
    const view = createView(400, 800);
    expect(view.rotated).toBe(true);
    const left = toScreen(view, { x: 0, y: WORLD.height / 2 });
    const right = toScreen(view, { x: WORLD.width, y: WORLD.height / 2 });
    expect(left.y).toBeGreaterThan(right.y);
    expect(left.x).toBeCloseTo(right.x);
    // The whole world stays on screen.
    for (const corner of [
      { x: 0, y: 0 },
      { x: WORLD.width, y: WORLD.height },
    ]) {
      const point = toScreen(view, corner);
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(400);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThanOrEqual(800);
    }
  });

  it('inverts exactly, rotated or not', () => {
    for (const view of [createView(1200, 700), createView(390, 760)]) {
      const point = { x: 321, y: 654 };
      const back = toWorld(view, toScreen(view, point));
      expect(back.x).toBeCloseTo(point.x);
      expect(back.y).toBeCloseTo(point.y);
    }
  });

  it('turns screen directions with the world', () => {
    const view = createView(390, 760);
    // Dragging up on a rotated screen points along +x in the world.
    const up = directionToWorld(view, { x: 0, y: -10 });
    expect(up.x).toBeGreaterThan(0);
    expect(up.y).toBeCloseTo(0);
  });
});
