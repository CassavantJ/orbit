import { describe, expect, it } from 'vitest';

import { describeLevel, placeName } from './describe';
import { LEVELS } from './levels';

describe('describeLevel', () => {
  it('names places by thirds', () => {
    expect(placeName({ x: 100, y: 100 })).toBe('top left');
    expect(placeName({ x: 800, y: 500 })).toBe('center');
    expect(placeName({ x: 1500, y: 500 })).toBe('right');
  });

  it('describes a level with bodies and beacons', () => {
    const level = LEVELS.find(({ id }) => id === 'treasure-hunt');
    expect(level && describeLevel(level, 10)).toBe(
      'Level 11, Treasure Hunt. The probe starts at the top left; the goal is at the top left. ' +
        'In between: one planet. Collect both beacons first (left and center).',
    );
  });
});
