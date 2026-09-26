import { describe, expect, it } from 'vitest';

import { LEVELS } from './levels';
import { isUnlocked, loadProgress, nextLevelIndex, recordWin, saveProgress } from './progress';

const memory = () => {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
};

describe('progress', () => {
  it('saves and loads', () => {
    const storage = memory();
    saveProgress({ 'first-light': 2 }, storage);
    expect(loadProgress(storage)).toEqual({ 'first-light': 2 });
  });

  it('survives missing, broken or tampered data', () => {
    expect(loadProgress(null)).toEqual({});
    const storage = memory();
    storage.setItem('orbit.progress.v1', '{not json');
    expect(loadProgress(storage)).toEqual({});
    storage.setItem('orbit.progress.v1', '{"a":1,"b":"x","c":-2,"d":1.5}');
    expect(loadProgress(storage)).toEqual({ a: 1 });
  });

  it('keeps the fewest shots', () => {
    const once = recordWin({}, 'x', 3);
    expect(recordWin(once, 'x', 5)).toBe(once);
    expect(recordWin(once, 'x', 1)).toEqual({ x: 1 });
  });

  it('opens levels one at a time', () => {
    expect(isUnlocked(LEVELS, {}, 0)).toBe(true);
    expect(isUnlocked(LEVELS, {}, 1)).toBe(false);
    const first = LEVELS[0]?.id ?? '';
    expect(isUnlocked(LEVELS, { [first]: 1 }, 1)).toBe(true);
    expect(isUnlocked(LEVELS, { [first]: 1 }, 2)).toBe(false);
  });

  it('continues from the first unwon level', () => {
    expect(nextLevelIndex(LEVELS, {})).toBe(0);
    const all = Object.fromEntries(LEVELS.map((level) => [level.id, 1]));
    expect(nextLevelIndex(LEVELS, all)).toBe(LEVELS.length - 1);
  });
});
