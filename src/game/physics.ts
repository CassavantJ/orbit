/**
 * The probe's flight: gravity from every body, integrated in fixed steps so a shot plays out the
 * same way at any frame rate. Moving bodies are placed by flight time, so aiming is deterministic.
 */

export interface Vec {
  x: number;
  y: number;
}

export interface Body {
  kind: 'planet' | 'moon' | 'hole';
  /** Position, or the center of the orbit when `orbit` is set. */
  x: number;
  y: number;
  /** Touching this ends the flight. For a hole, it's the event horizon. */
  radius: number;
  mass: number;
  orbit?: { radius: number; period: number; phase: number };
}

export interface Goal extends Vec {
  radius: number;
}

export interface Level {
  id: string;
  name: string;
  /** Shown under the level on first play. */
  hint?: string;
  launch: Vec;
  goal: Goal;
  bodies: readonly Body[];
  /** All of these have to be collected in one flight before the goal counts. */
  beacons?: readonly Vec[];
  /** Launches for three stars. */
  par: number;
}

export interface Aim {
  /** Radians, counterclockwise from the +x axis with y pointing up (so π/2 aims up). */
  angle: number;
  /** 0–1 of MAX_SPEED. */
  power: number;
}

export type Outcome = 'flying' | 'won' | 'crashed' | 'lost';

export interface Flight {
  time: number;
  position: Vec;
  velocity: Vec;
  collected: boolean[];
  outcome: Outcome;
  /** The body hit, when the outcome is `crashed`. */
  hit: Body | null;
}

export const WORLD = { width: 1600, height: 1000 } as const;
export const G = 1e6;
export const MAX_SPEED = 620;
export const MIN_POWER = 0.08;
export const PROBE_RADIUS = 7;
export const BEACON_RADIUS = 20;
export const STEP = 1 / 120;
export const MAX_FLIGHT_S = 20;
/** How far past the edge the probe may go before it's lost: just out of sight. */
const MARGIN = 40;
/** Keeps the pull finite if the probe grazes a body's center. */
const SOFTENING_SQ = 100;

export function bodyPosition(body: Body, time: number): Vec {
  if (!body.orbit) return { x: body.x, y: body.y };
  const { radius, period, phase } = body.orbit;
  const angle = phase + (2 * Math.PI * time) / period;
  return { x: body.x + radius * Math.cos(angle), y: body.y + radius * Math.sin(angle) };
}

export function clampPower(power: number): number {
  return Math.min(Math.max(power, MIN_POWER), 1);
}

export function launchVelocity({ angle, power }: Aim): Vec {
  const speed = clampPower(power) * MAX_SPEED;
  // World y points down, so "up" is negative y.
  return { x: Math.cos(angle) * speed, y: -Math.sin(angle) * speed };
}

export function startFlight(level: Level, aim: Aim): Flight {
  return {
    time: 0,
    position: { ...level.launch },
    velocity: launchVelocity(aim),
    collected: (level.beacons ?? []).map(() => false),
    outcome: 'flying',
    hit: null,
  };
}

/** Advances the flight by one STEP, in place. */
export function stepFlight(level: Level, flight: Flight): void {
  if (flight.outcome !== 'flying') return;

  // Semi-implicit Euler: update velocity from gravity, then position from the new velocity.
  // Stable for orbits, unlike plain Euler, and cheap enough for the aim preview.
  let ax = 0;
  let ay = 0;
  for (const body of level.bodies) {
    const center = bodyPosition(body, flight.time);
    const dx = center.x - flight.position.x;
    const dy = center.y - flight.position.y;
    const distanceSq = dx * dx + dy * dy;
    const distance = Math.sqrt(distanceSq);
    const pull = (G * body.mass) / (distanceSq + SOFTENING_SQ);
    ax += (pull * dx) / distance;
    ay += (pull * dy) / distance;
  }
  flight.velocity.x += ax * STEP;
  flight.velocity.y += ay * STEP;
  flight.position.x += flight.velocity.x * STEP;
  flight.position.y += flight.velocity.y * STEP;
  flight.time += STEP;

  const { position } = flight;
  for (const body of level.bodies) {
    const center = bodyPosition(body, flight.time);
    if (Math.hypot(center.x - position.x, center.y - position.y) < body.radius + PROBE_RADIUS) {
      flight.outcome = 'crashed';
      flight.hit = body;
      return;
    }
  }

  level.beacons?.forEach((beacon, index) => {
    if (Math.hypot(beacon.x - position.x, beacon.y - position.y) < BEACON_RADIUS + PROBE_RADIUS) {
      flight.collected[index] = true;
    }
  });

  const { goal } = level;
  const open = flight.collected.every(Boolean);
  if (open && Math.hypot(goal.x - position.x, goal.y - position.y) < goal.radius) {
    flight.outcome = 'won';
    return;
  }

  const outside =
    position.x < -MARGIN ||
    position.y < -MARGIN ||
    position.x > WORLD.width + MARGIN ||
    position.y > WORLD.height + MARGIN;
  if (outside || flight.time >= MAX_FLIGHT_S) flight.outcome = 'lost';
}

/** The first `seconds` of a shot, sampled every `every` seconds, for the aim preview. */
export function predictPath(level: Level, aim: Aim, seconds: number, every: number): Vec[] {
  const flight = startFlight(level, aim);
  const points: Vec[] = [];
  const stride = Math.max(1, Math.round(every / STEP));
  for (let step = 1; step * STEP <= seconds && flight.outcome === 'flying'; step++) {
    stepFlight(level, flight);
    if (step % stride === 0) points.push({ ...flight.position });
  }
  return points;
}

/** Plays a whole shot out. Used by tests and the level checker. */
export function simulate(level: Level, aim: Aim): Flight {
  const flight = startFlight(level, aim);
  while (flight.outcome === 'flying') stepFlight(level, flight);
  return flight;
}

export function starsFor(shots: number, par: number): 1 | 2 | 3 {
  if (shots <= par) return 3;
  if (shots <= par + 2) return 2;
  return 1;
}
