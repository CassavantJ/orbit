/**
 * Level design aid, skipped in normal runs: `SOLVE=1 pnpm exec vitest run levels.solve` sweeps
 * every angle and power for each level and prints how many shots win and one that does.
 */
import { describe, it } from 'vitest';

// Node's process, without pulling Node's types into the browser code.
declare const process: { env: Record<string, string | undefined> };

import { LEVELS } from './levels';
import { simulate } from './physics';

const ANGLE_STEP_DEG = 0.5;
const POWER_STEP = 0.01;

describe.skipIf(!process.env.SOLVE)('level solver', () => {
  it('reports the winning share of shots per level', () => {
    for (const level of LEVELS) {
      let wins = 0;
      let total = 0;
      let fullPowerWins = 0;
      let best: { angle: number; power: number; time: number } | null = null;
      for (let degrees = 0; degrees < 360; degrees += ANGLE_STEP_DEG) {
        for (let power = 0.1; power <= 1.0001; power += POWER_STEP) {
          const angle = (degrees * Math.PI) / 180;
          const flight = simulate(level, { angle, power });
          total++;
          if (flight.outcome === 'won') {
            wins++;
            if (power > 0.97) fullPowerWins++;
            if (!best || flight.time < best.time)
              best = { angle: degrees, power, time: flight.time };
          }
        }
      }
      const share = ((wins / total) * 100).toFixed(2);
      const sample = best
        ? `e.g. ${best.angle}° at ${Math.round(best.power * 100)}% (${best.time.toFixed(1)} s)`
        : 'UNSOLVABLE';
      console.log(
        `${level.id.padEnd(16)} ${share.padStart(6)}% win  ${String(fullPowerWins).padStart(4)} at full power  ${sample}`,
      );
    }
  }, 600_000);
});
