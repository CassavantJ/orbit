import { ChevronLeft, Diamond, RotateCcw, Send } from 'lucide-react';
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent,
} from 'react';

import { OrbitGame } from '../game/controller';
import { describeLevel } from '../game/describe';
import { predictPath, type Aim, type Level, type Vec } from '../game/physics';
import { drawFrame } from '../game/render';
import { createView, directionToWorld, type View } from '../game/view';
import { useReducedMotion } from '../useReducedMotion';
import styles from './Game.module.css';
import { WinDialog } from './WinDialog';

interface GameProps {
  level: Level;
  index: number;
  best: number | undefined;
  hasNext: boolean;
  onWin: (shots: number) => void;
  onNext: () => void;
  onMenu: () => void;
}

/** A drag shorter than this (CSS px) is a tap, not an aim. */
const DEAD_ZONE_PX = 10;
/** Dragging this share of the shorter screen side is full power. */
const FULL_PULL = 0.4;
const PREVIEW_S = 0.75;
const PREVIEW_EVERY_S = 1 / 30;
const DEGREE = Math.PI / 180;
/** Stick input, per second at full tilt. */
const STICK_ANGLE_RATE = 70 * DEGREE;
const STICK_POWER_RATE = 0.5;
const STICK_DEAD_ZONE = 0.2;

interface Drag {
  pointer: number;
  start: Vec;
  before: Aim;
  aimed: boolean;
}

export function Game({ level, index, best, hasNext, onWin, onNext, onMenu }: GameProps) {
  const [game] = useState(() => new OrbitGame(level));
  const snapshot = useSyncExternalStore(game.subscribe, game.getSnapshot);
  const reducedMotion = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const view = useRef<View>(createView(1, 1));
  const size = useRef({ width: 1, height: 1, ratio: 1 });
  const drag = useRef<Drag | null>(null);
  const [rotated, setRotated] = useState(false);

  const won = snapshot.phase === 'won';
  const canAim = snapshot.phase === 'aiming' || snapshot.phase === 'missed';
  const beacons = level.beacons?.length ?? 0;

  const recordWin = useEffectEvent(() => {
    onWin(game.shots);
  });
  useEffect(() => {
    if (won) recordWin();
  }, [won]);

  // Canvas size follows its box; the view is recomputed to fit.
  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;
    const observer = new ResizeObserver(() => {
      const { width, height } = stage.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      size.current = { width, height, ratio };
      view.current = createView(width, height);
      setRotated(view.current.rotated);
    });
    observer.observe(stage);
    return () => {
      observer.disconnect();
    };
  }, []);

  // Gamepad: stick aims smoothly, d-pad in fine steps, A launches, X/Y restart, B leaves.
  const buttonsDown = useRef<boolean[]>([]);
  const pollGamepad = useEffectEvent((seconds: number) => {
    const pads = typeof navigator.getGamepads === 'function' ? navigator.getGamepads() : [];
    const pad = pads.find((candidate) => candidate?.connected);
    if (!pad) return;
    const pressed = pad.buttons.map((button) => button.pressed);
    const edge = (button: number) =>
      (pressed[button] ?? false) && !(buttonsDown.current[button] ?? false);
    buttonsDown.current = pressed;

    const curve = (value: number) => {
      const magnitude = Math.max(0, (Math.abs(value) - STICK_DEAD_ZONE) / (1 - STICK_DEAD_ZONE));
      return Math.sign(value) * magnitude * magnitude;
    };
    const x = curve(pad.axes[0] ?? 0);
    const y = curve(pad.axes[1] ?? 0);
    if (x !== 0 || y !== 0) {
      game.nudge(-x * STICK_ANGLE_RATE * seconds, -y * STICK_POWER_RATE * seconds);
    }
    if (edge(14)) game.nudge(0.5 * DEGREE, 0);
    if (edge(15)) game.nudge(-0.5 * DEGREE, 0);
    if (edge(12)) game.nudge(0, 0.01);
    if (edge(13)) game.nudge(0, -0.01);
    if (edge(0)) {
      if (game.phase === 'won') {
        if (hasNext) onNext();
        else onMenu();
      } else game.launch();
    }
    if (edge(2) || edge(3)) game.restart();
    if (edge(1)) onMenu();
  });

  // The frame loop: input, physics, then drawing.
  useEffect(() => {
    const context = canvasRef.current?.getContext('2d');
    if (!context) return;
    const opened = performance.now();
    let last = opened;
    let frame = 0;
    let preview: { aim: Aim | null; points: Vec[] } = { aim: null, points: [] };

    const loop = (now: number) => {
      const seconds = (now - last) / 1000;
      last = now;
      pollGamepad(seconds);
      game.update(seconds);
      if (game.canAim && preview.aim !== game.aim) {
        preview = {
          aim: game.aim,
          points: predictPath(level, game.aim, PREVIEW_S, PREVIEW_EVERY_S),
        };
      }
      drawFrame(context, view.current, size.current.ratio, game, {
        clock: (now - opened) / 1000,
        reducedMotion,
        preview: game.canAim ? preview.points : [],
      });
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [game, level, reducedMotion]);

  // Keyboard: arrows aim (Shift for fine steps), Space or Enter launches, R restarts.
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    if (won) return;
    const target = event.target instanceof Element ? event.target : null;
    const onControl = target?.closest('button, a, input, select, textarea') != null;
    const angleStep = (event.shiftKey ? 0.1 : 1) * DEGREE;
    const powerStep = event.shiftKey ? 0.002 : 0.01;
    switch (event.key) {
      case 'ArrowLeft':
        game.nudge(angleStep, 0);
        break;
      case 'ArrowRight':
        game.nudge(-angleStep, 0);
        break;
      case 'ArrowUp':
        game.nudge(0, powerStep);
        break;
      case 'ArrowDown':
        game.nudge(0, -powerStep);
        break;
      case ' ':
      case 'Enter':
        if (onControl) return;
        game.launch();
        break;
      case 'r':
      case 'R':
        game.restart();
        break;
      case 'Escape':
        onMenu();
        break;
      default:
        return;
    }
    event.preventDefault();
  });
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      onKeyDown(event);
    };
    window.addEventListener('keydown', listener);
    return () => {
      window.removeEventListener('keydown', listener);
    };
  }, []);

  // Pointer: drag back from anywhere, like a slingshot, and let go to launch.
  const pointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!event.isPrimary || event.button !== 0 || !game.canAim) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      pointer: event.pointerId,
      start: { x: event.clientX, y: event.clientY },
      before: game.aim,
      aimed: false,
    };
  };
  const dragDistance = (event: PointerEvent, current: Drag) =>
    Math.hypot(event.clientX - current.start.x, event.clientY - current.start.y);
  const pointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const current = drag.current;
    if (current?.pointer !== event.pointerId) return;
    const distance = dragDistance(event, current);
    if (distance < DEAD_ZONE_PX) {
      if (current.aimed) game.setAim(current.before);
      current.aimed = false;
      return;
    }
    current.aimed = true;
    // The shot goes opposite the drag.
    const direction = directionToWorld(view.current, {
      x: current.start.x - event.clientX,
      y: current.start.y - event.clientY,
    });
    const fullPull = FULL_PULL * Math.min(size.current.width, size.current.height);
    game.setAim({ angle: Math.atan2(-direction.y, direction.x), power: distance / fullPull });
  };
  const pointerUp = (event: PointerEvent<HTMLCanvasElement>) => {
    const current = drag.current;
    if (current?.pointer !== event.pointerId) return;
    drag.current = null;
    if (current.aimed && dragDistance(event, current) >= DEAD_ZONE_PX) game.launch();
  };
  const pointerCancel = () => {
    if (drag.current?.aimed) game.setAim(drag.current.before);
    drag.current = null;
  };

  // The readout gives the angle as seen on screen: a rotated view turns the world 90°.
  const onScreen = ((snapshot.aim.angle * 180) / Math.PI + (rotated ? 90 : 0)) % 360;

  const status =
    snapshot.message ||
    (snapshot.shots === 0 && level.hint ? level.hint : rotated ? '' : 'Drag back to aim.');

  return (
    <div className={styles.game}>
      <header className={styles.top}>
        <button type="button" className={styles.iconButton} onClick={onMenu}>
          <ChevronLeft aria-hidden="true" className={styles.icon} />
          <span className={styles.buttonLabel}>Levels</span>
        </button>
        <h1 className={styles.title}>
          <span className={styles.number}>{index + 1}</span> {level.name}
        </h1>
        <p className={styles.stats}>
          <span>Shots {snapshot.shots}</span>
          {beacons > 0 && (
            <span className={styles.beacons}>
              <Diamond aria-hidden="true" className={styles.beaconIcon} />
              <span className="sr-only">Beacons </span>
              {snapshot.collected}/{beacons}
            </span>
          )}
          <span className={styles.par}>Par {level.par}</span>
          {best !== undefined && <span className={styles.par}>Best {best}</span>}
        </p>
        <button
          type="button"
          className={styles.iconButton}
          onClick={() => {
            game.restart();
          }}
        >
          <RotateCcw aria-hidden="true" className={styles.icon} />
          <span className={styles.buttonLabel}>Restart</span>
        </button>
      </header>

      <div
        ref={stageRef}
        className={styles.stage}
        role="img"
        aria-label={describeLevel(level, index)}
      >
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onPointerCancel={pointerCancel}
          onLostPointerCapture={pointerCancel}
        />
      </div>

      <footer className={styles.bottom}>
        <p className={styles.readout} aria-live="off">
          <span>Angle {onScreen.toFixed(1)}Â°</span>
          <span>Power {Math.round(snapshot.aim.power * 100)}%</span>
        </p>
        <p role="status" className={styles.status}>
          {status}
        </p>
        <button
          type="button"
          className={styles.launch}
          disabled={!canAim}
          onClick={() => {
            game.launch();
          }}
        >
          <Send aria-hidden="true" className={styles.icon} />
          Launch
        </button>
      </footer>

      {won && (
        <WinDialog
          shots={snapshot.shots}
          par={level.par}
          best={best}
          hasNext={hasNext}
          onNext={onNext}
          onReplay={() => {
            game.restart();
          }}
          onMenu={onMenu}
        />
      )}
    </div>
  );
}
