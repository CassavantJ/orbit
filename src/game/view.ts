import { WORLD, type Vec } from './physics';

/**
 * Maps the 1600×1000 world onto the canvas, as large as it fits. On a portrait screen the world
 * turns 90° counterclockwise so it still fills the screen and the launch (usually on the left)
 * ends up at the bottom, near the thumbs. Gravity has no "down", so the puzzle plays the same.
 */
export interface View {
  /** Canvas transform from world units to CSS pixels: [a, b, c, d, e, f]. */
  matrix: readonly [number, number, number, number, number, number];
  /** CSS pixels per world unit. */
  scale: number;
  rotated: boolean;
}

const PADDING = 12;

export function createView(width: number, height: number): View {
  const rotated = height > width * 1.1;
  const worldWidth = rotated ? WORLD.height : WORLD.width;
  const worldHeight = rotated ? WORLD.width : WORLD.height;
  const scale = Math.max(
    Math.min((width - PADDING * 2) / worldWidth, (height - PADDING * 2) / worldHeight),
    0.01,
  );
  const offsetX = (width - worldWidth * scale) / 2;
  const offsetY = (height - worldHeight * scale) / 2;
  // Rotated: screen x = y·s + ox, screen y = (width − x)·s + oy.
  const matrix = rotated
    ? ([0, -scale, scale, 0, offsetX, offsetY + WORLD.width * scale] as const)
    : ([scale, 0, 0, scale, offsetX, offsetY] as const);
  return { matrix, scale, rotated };
}

export function toScreen({ matrix: [a, b, c, d, e, f] }: View, { x, y }: Vec): Vec {
  return { x: a * x + c * y + e, y: b * x + d * y + f };
}

export function toWorld({ matrix: [a, b, c, d, e, f] }: View, { x, y }: Vec): Vec {
  const determinant = a * d - b * c;
  const dx = x - e;
  const dy = y - f;
  return { x: (d * dx - c * dy) / determinant, y: (a * dy - b * dx) / determinant };
}

/** A screen-space direction (a drag, a stick) in world space. Lengths scale by 1/scale. */
export function directionToWorld(view: View, { x, y }: Vec): Vec {
  const origin = toWorld(view, { x: 0, y: 0 });
  const tip = toWorld(view, { x, y });
  return { x: tip.x - origin.x, y: tip.y - origin.y };
}
