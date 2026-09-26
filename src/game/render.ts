import type { OrbitGame } from './controller';
import {
  BEACON_RADIUS,
  bodyPosition,
  PROBE_RADIUS,
  WORLD,
  type Body,
  type Level,
  type Vec,
} from './physics';
import type { View } from './view';

export interface Frame {
  /** Seconds since the level opened; drives the ambient animation only. */
  clock: number;
  reducedMotion: boolean;
  /** The aim preview, in world units. */
  preview: readonly Vec[];
}

interface Star {
  x: number;
  y: number;
  size: number;
  alpha: number;
}

/** White at an alpha. rgba() rather than `rgb(… / a)` for older Safari canvases. */
const white = (alpha: number) => `rgba(255, 255, 255, ${alpha})`;
const starCache = new WeakMap<Level, Star[]>();

/** A fixed starfield per level, seeded from its id so it doesn't shimmer between visits. */
function starsFor(level: Level): Star[] {
  const cached = starCache.get(level);
  if (cached) return cached;
  let seed = 7;
  for (let index = 0; index < level.id.length; index++) {
    seed = (seed * 31 + level.id.charCodeAt(index)) >>> 0;
  }
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  const stars = Array.from({ length: 110 }, () => ({
    x: random() * WORLD.width,
    y: random() * WORLD.height,
    size: 0.6 + random() * 1.2,
    alpha: 0.15 + random() * 0.45,
  }));
  starCache.set(level, stars);
  return stars;
}

/** Draws one frame. The canvas is cleared, so the page's gradient shows through. */
export function drawFrame(
  context: CanvasRenderingContext2D,
  view: View,
  pixelRatio: number,
  game: OrbitGame,
  frame: Frame,
): void {
  const { canvas } = context;
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, canvas.width, canvas.height);
  const [a, b, c, d, e, f] = view.matrix;
  context.setTransform(
    a * pixelRatio,
    b * pixelRatio,
    c * pixelRatio,
    d * pixelRatio,
    e * pixelRatio,
    f * pixelRatio,
  );
  // One CSS pixel in world units, for line widths that shouldn't scale with the world.
  const px = 1 / view.scale;
  const { level } = game;
  const flight = game.shownFlight;
  const time = flight?.time ?? 0;
  const collected = flight?.collected ?? (level.beacons ?? []).map(() => false);
  const goalOpen = collected.every(Boolean);

  drawStars(context, level, px);
  for (const body of level.bodies) if (body.orbit) drawOrbitPath(context, body, px);
  for (const body of level.bodies) drawHalo(context, body, bodyPosition(body, time));
  drawGoal(context, level, goalOpen, frame, px);
  level.beacons?.forEach((beacon, index) => {
    drawBeacon(context, beacon, collected[index] ?? false, frame, px);
  });
  level.bodies.forEach((body, index) => {
    drawBody(context, body, bodyPosition(body, time), index, frame, px);
  });
  drawPad(context, level.launch, px);
  drawPath(context, game.ghost, px, 0.22, [4 * px, 6 * px]);

  if (game.phase === 'aiming' || game.phase === 'missed') {
    drawAim(context, game, frame, px);
  }
  if (flight) {
    drawTrail(context, game.trail, px);
    if (flight.outcome === 'crashed') drawBurst(context, flight.position, px);
    else drawProbe(context, flight.position, px);
  }
}

function drawStars(context: CanvasRenderingContext2D, level: Level, px: number) {
  for (const star of starsFor(level)) {
    context.fillStyle = white(star.alpha);
    context.beginPath();
    context.arc(star.x, star.y, star.size * px, 0, Math.PI * 2);
    context.fill();
  }
}

function drawOrbitPath(context: CanvasRenderingContext2D, body: Body, px: number) {
  if (!body.orbit) return;
  context.save();
  context.strokeStyle = white(0.14);
  context.lineWidth = px;
  context.setLineDash([3 * px, 7 * px]);
  context.beginPath();
  context.arc(body.x, body.y, body.orbit.radius, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}

/** A soft glow around each body, wider for stronger pull: a hint at where gravity bites. */
function drawHalo(context: CanvasRenderingContext2D, body: Body, at: Vec) {
  const reach = body.radius + Math.sqrt(body.mass) * (body.kind === 'hole' ? 38 : 24);
  const glow = context.createRadialGradient(at.x, at.y, body.radius, at.x, at.y, reach);
  const strength = body.kind === 'hole' ? 0.16 : 0.07;
  glow.addColorStop(0, white(strength));
  glow.addColorStop(1, white(0));
  context.fillStyle = glow;
  context.beginPath();
  context.arc(at.x, at.y, reach, 0, Math.PI * 2);
  context.fill();
}

function drawBody(
  context: CanvasRenderingContext2D,
  body: Body,
  at: Vec,
  index: number,
  frame: Frame,
  px: number,
) {
  const { radius } = body;
  if (body.kind === 'hole') {
    // Accretion disk: a bright ring fading outward, with a slow swirl.
    const disk = context.createRadialGradient(at.x, at.y, radius, at.x, at.y, radius * 3.4);
    disk.addColorStop(0, white(0.55));
    disk.addColorStop(0.35, white(0.18));
    disk.addColorStop(1, white(0));
    context.fillStyle = disk;
    context.beginPath();
    context.arc(at.x, at.y, radius * 3.4, 0, Math.PI * 2);
    context.fill();

    const spin = frame.reducedMotion ? 0 : frame.clock * 0.9;
    context.strokeStyle = white(0.45);
    context.lineWidth = 1.2 * px;
    for (let arm = 0; arm < 3; arm++) {
      const start = spin + (arm * Math.PI * 2) / 3;
      context.beginPath();
      context.arc(at.x, at.y, radius * (1.7 + arm * 0.35), start, start + 1.4);
      context.stroke();
    }

    context.fillStyle = '#06020c';
    context.beginPath();
    context.arc(at.x, at.y, radius, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = white(0.9);
    context.lineWidth = 1.5 * px;
    context.stroke();
    return;
  }

  // Lit from the top left, like the hub's icons.
  const fill = context.createRadialGradient(
    at.x - radius * 0.35,
    at.y - radius * 0.4,
    radius * 0.1,
    at.x,
    at.y,
    radius,
  );
  fill.addColorStop(0, white(0.3));
  fill.addColorStop(1, white(0.05));
  context.fillStyle = fill;
  context.beginPath();
  context.arc(at.x, at.y, radius, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = white(0.85);
  context.lineWidth = 1.5 * px;
  context.stroke();

  // Big planets get a ring; the tilt varies by index so they don't all match.
  if (body.kind === 'planet' && body.mass >= 45) {
    context.save();
    context.translate(at.x, at.y);
    context.rotate(-0.35 + (index % 3) * 0.3);
    context.strokeStyle = white(0.5);
    context.lineWidth = 1.2 * px;
    context.beginPath();
    context.ellipse(0, 0, radius * 1.55, radius * 0.32, 0, Math.PI * 1.02, Math.PI * 1.98, true);
    context.stroke();
    context.restore();
  }
}

function drawGoal(
  context: CanvasRenderingContext2D,
  level: Level,
  open: boolean,
  frame: Frame,
  px: number,
) {
  const { goal } = level;
  context.save();
  if (open) {
    context.shadowColor = white(0.8);
    context.shadowBlur = 14;
  } else {
    context.setLineDash([6 * px, 6 * px]);
  }
  context.strokeStyle = white(open ? 0.95 : 0.45);
  context.lineWidth = 2 * px;
  context.beginPath();
  context.arc(goal.x, goal.y, goal.radius, 0, Math.PI * 2);
  context.stroke();
  context.restore();

  context.strokeStyle = white(open ? 0.35 : 0.15);
  context.lineWidth = px;
  context.beginPath();
  context.arc(goal.x, goal.y, goal.radius * 0.55, 0, Math.PI * 2);
  context.stroke();

  if (open && !frame.reducedMotion) {
    // A ripple drifting outward every two seconds.
    const phase = (frame.clock % 2) / 2;
    context.strokeStyle = white(0.4 * (1 - phase));
    context.beginPath();
    context.arc(goal.x, goal.y, goal.radius * (1 + phase * 0.6), 0, Math.PI * 2);
    context.stroke();
  }
}

function drawBeacon(
  context: CanvasRenderingContext2D,
  beacon: Vec,
  collected: boolean,
  frame: Frame,
  px: number,
) {
  const size = BEACON_RADIUS * 0.7;
  const bob = frame.reducedMotion || collected ? 0 : Math.sin(frame.clock * 2.5) * 0.12;
  context.save();
  context.translate(beacon.x, beacon.y);
  context.rotate(Math.PI / 4 + bob);
  if (collected) {
    context.strokeStyle = white(0.3);
    context.lineWidth = px;
    context.strokeRect(-size / 2, -size / 2, size, size);
  } else {
    context.shadowColor = white(0.9);
    context.shadowBlur = 12;
    context.fillStyle = '#fff';
    context.fillRect(-size / 2, -size / 2, size, size);
    context.shadowBlur = 0;
    context.strokeStyle = white(0.4);
    context.lineWidth = px;
    context.strokeRect(-size, -size, size * 2, size * 2);
  }
  context.restore();
}

function drawPad(context: CanvasRenderingContext2D, launch: Vec, px: number) {
  context.strokeStyle = white(0.35);
  context.lineWidth = px;
  context.beginPath();
  context.arc(launch.x, launch.y, 18, 0, Math.PI * 2);
  context.stroke();
}

function drawPath(
  context: CanvasRenderingContext2D,
  points: readonly Vec[],
  px: number,
  alpha: number,
  dash: number[],
) {
  if (points.length < 2) return;
  context.save();
  context.strokeStyle = white(alpha);
  context.lineWidth = 1.2 * px;
  context.setLineDash(dash);
  context.beginPath();
  points.forEach((point, index) => {
    if (index === 0) context.moveTo(point.x, point.y);
    else context.lineTo(point.x, point.y);
  });
  context.stroke();
  context.restore();
}

/** The live trail: brighter toward the probe, drawn in a few bands of alpha. */
function drawTrail(context: CanvasRenderingContext2D, trail: readonly Vec[], px: number) {
  const bands = 12;
  const size = Math.ceil(trail.length / bands);
  context.lineWidth = 2 * px;
  context.lineCap = 'round';
  for (let band = 0; band < bands; band++) {
    const slice = trail.slice(band * size, (band + 1) * size + 1);
    if (slice.length < 2) continue;
    context.strokeStyle = white(0.12 + (0.6 * (band + 1)) / bands);
    context.beginPath();
    slice.forEach((point, index) => {
      if (index === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    });
    context.stroke();
  }
}

function drawProbe(context: CanvasRenderingContext2D, at: Vec, px: number) {
  context.save();
  context.shadowColor = white(1);
  context.shadowBlur = 16;
  context.fillStyle = '#fff';
  context.beginPath();
  context.arc(at.x, at.y, PROBE_RADIUS, 0, Math.PI * 2);
  context.fill();
  context.restore();
  context.strokeStyle = white(0.5);
  context.lineWidth = px;
  context.beginPath();
  context.arc(at.x, at.y, PROBE_RADIUS + 5, 0, Math.PI * 2);
  context.stroke();
}

function drawBurst(context: CanvasRenderingContext2D, at: Vec, px: number) {
  context.strokeStyle = white(0.8);
  context.lineWidth = 1.5 * px;
  for (let ray = 0; ray < 8; ray++) {
    const angle = (ray * Math.PI) / 4;
    context.beginPath();
    context.moveTo(at.x + Math.cos(angle) * 6, at.y + Math.sin(angle) * 6);
    context.lineTo(at.x + Math.cos(angle) * 18, at.y + Math.sin(angle) * 18);
    context.stroke();
  }
}

function drawAim(context: CanvasRenderingContext2D, game: OrbitGame, frame: Frame, px: number) {
  const { launch } = game.level;
  const { angle, power } = game.aim;
  const direction = { x: Math.cos(angle), y: -Math.sin(angle) };

  // The slingshot band, pulled back opposite the shot, longer with more power.
  const band = 26 + 70 * power;
  context.strokeStyle = white(0.55);
  context.lineWidth = 2 * px;
  context.lineCap = 'round';
  context.beginPath();
  context.moveTo(launch.x, launch.y);
  context.lineTo(launch.x - direction.x * band, launch.y - direction.y * band);
  context.stroke();

  // Where the shot starts to go: fading dots.
  frame.preview.forEach((point, index) => {
    const alpha = 0.85 * (1 - index / frame.preview.length);
    context.fillStyle = white(alpha);
    context.beginPath();
    context.arc(point.x, point.y, 2.6 * px + 1.2, 0, Math.PI * 2);
    context.fill();
  });

  drawProbe(context, launch, px);
}
