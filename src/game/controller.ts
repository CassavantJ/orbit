import {
  clampPower,
  startFlight,
  STEP,
  stepFlight,
  type Aim,
  type Body,
  type Flight,
  type Level,
  type Vec,
} from './physics';

/** `missed` shows where the last shot ended; aiming again ends it early. */
export type Phase = 'aiming' | 'flying' | 'missed' | 'won';

export interface Snapshot {
  phase: Phase;
  shots: number;
  aim: Aim;
  collected: number;
  /** What just happened, for the status line and screen readers. Empty while nothing has. */
  message: string;
}

/** A trail point every this many physics steps. */
const TRAIL_EVERY = 2;
const MISSED_PAUSE_S = 1.2;
/** Longest frame the physics catches up on, so a backgrounded tab doesn't fast-forward. */
const MAX_FRAME_S = 0.1;
const TAU = Math.PI * 2;

/** Starts aimed at the goal at medium power: a sensible first guess to adjust from. */
export function defaultAim({ launch, goal }: Level): Aim {
  return { angle: normalizeAngle(Math.atan2(launch.y - goal.y, goal.x - launch.x)), power: 0.6 };
}

export function normalizeAngle(angle: number): number {
  return ((angle % TAU) + TAU) % TAU;
}

function crashMessage(body: Body | null): string {
  if (body?.kind === 'hole') return 'Swallowed by the black hole.';
  if (body?.kind === 'moon') return 'Crashed into a moon.';
  return 'Crashed into a planet.';
}

/**
 * One level's play state: aiming, flying, the shot count and the trails. It knows nothing about
 * React or the DOM; the Game component feeds it input and time, and draws what it holds.
 */
export class OrbitGame {
  readonly level: Level;
  aim: Aim;
  shots = 0;
  phase: Phase = 'aiming';
  flight: Flight | null = null;
  /** The current shot's path. */
  trail: Vec[] = [];
  /** The previous shot's path, kept faintly on screen to aim against. */
  ghost: Vec[] = [];
  message = '';

  #accumulator = 0;
  #steps = 0;
  #missedFor = 0;
  #listeners = new Set<() => void>();
  #snapshot: Snapshot;

  constructor(level: Level) {
    this.level = level;
    this.aim = defaultAim(level);
    this.#snapshot = this.#makeSnapshot();
  }

  subscribe = (listener: () => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };

  getSnapshot = () => this.#snapshot;

  /** The flight to show: none while aiming, since the next shot starts afresh. */
  get shownFlight(): Flight | null {
    return this.phase === 'aiming' ? null : this.flight;
  }

  get canAim(): boolean {
    return this.phase === 'aiming' || this.phase === 'missed';
  }

  setAim(aim: Aim): void {
    if (!this.canAim) return;
    this.phase = 'aiming';
    this.aim = { angle: normalizeAngle(aim.angle), power: clampPower(aim.power) };
    this.#emit();
  }

  nudge(angle: number, power: number): void {
    this.setAim({ angle: this.aim.angle + angle, power: this.aim.power + power });
  }

  launch(): void {
    if (!this.canAim) return;
    this.phase = 'flying';
    this.shots += 1;
    this.flight = startFlight(this.level, this.aim);
    this.trail = [{ ...this.level.launch }];
    this.#accumulator = 0;
    this.#steps = 0;
    this.message = `Shot ${this.shots} launched.`;
    this.#emit();
  }

  restart(): void {
    this.phase = 'aiming';
    this.shots = 0;
    this.flight = null;
    this.trail = [];
    this.ghost = [];
    this.message = 'Level restarted.';
    this.#emit();
  }

  /** Advances time by `seconds` of wall clock. */
  update(seconds: number): void {
    const elapsed = Math.min(seconds, MAX_FRAME_S);
    if (this.phase === 'missed') {
      this.#missedFor += elapsed;
      if (this.#missedFor >= MISSED_PAUSE_S) {
        this.phase = 'aiming';
        this.#emit();
      }
      return;
    }
    const flight = this.flight;
    if (this.phase !== 'flying' || !flight) return;

    this.#accumulator += elapsed;
    const collectedBefore = flight.collected.filter(Boolean).length;
    while (this.#accumulator >= STEP && flight.outcome === 'flying') {
      stepFlight(this.level, flight);
      this.#accumulator -= STEP;
      this.#steps += 1;
      if (this.#steps % TRAIL_EVERY === 0) this.trail.push({ ...flight.position });
    }

    if (flight.outcome !== 'flying') {
      this.trail.push({ ...flight.position });
      this.#finish(flight);
    } else if (flight.collected.filter(Boolean).length > collectedBefore) {
      const collected = flight.collected.filter(Boolean).length;
      const total = flight.collected.length;
      this.message =
        collected === total
          ? 'All beacons collected. The goal is open.'
          : `Beacon ${collected} of ${total}.`;
      this.#emit();
    }
  }

  #finish(flight: Flight): void {
    this.ghost = this.trail;
    if (flight.outcome === 'won') {
      this.phase = 'won';
      this.message = `Goal reached in ${this.shots} ${this.shots === 1 ? 'shot' : 'shots'}.`;
    } else {
      this.phase = 'missed';
      this.#missedFor = 0;
      const missing = flight.collected.some((collected) => !collected);
      this.message =
        flight.outcome === 'crashed'
          ? crashMessage(flight.hit)
          : missing && flight.collected.length > 0
            ? 'Lost in space. Collect every beacon to open the goal.'
            : 'Lost in space.';
    }
    this.#emit();
  }

  #makeSnapshot(): Snapshot {
    return {
      phase: this.phase,
      shots: this.shots,
      aim: this.aim,
      collected: this.shownFlight?.collected.filter(Boolean).length ?? 0,
      message: this.message,
    };
  }

  #emit(): void {
    this.#snapshot = this.#makeSnapshot();
    for (const listener of this.#listeners) listener();
  }
}
