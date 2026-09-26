import type { Level } from './physics';

const KEY = 'orbit.progress.v1';

/** Fewest shots each level has been won in, by level id. */
export type Progress = Readonly<Record<string, number>>;

export function loadProgress(storage: Pick<Storage, 'getItem'> | null = safeStorage()): Progress {
  try {
    const parsed: unknown = JSON.parse(storage?.getItem(KEY) ?? '{}');
    if (typeof parsed !== 'object' || parsed === null) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, number] => Number.isInteger(entry[1]) && entry[1] > 0,
      ),
    );
  } catch {
    return {};
  }
}

export function saveProgress(
  progress: Progress,
  storage: Pick<Storage, 'setItem'> | null = safeStorage(),
): void {
  try {
    storage?.setItem(KEY, JSON.stringify(progress));
  } catch {
    // Private mode or full storage: progress just lasts for this visit.
  }
}

/** Keeps the best (fewest) shots for the level. */
export function recordWin(progress: Progress, levelId: string, shots: number): Progress {
  const best = progress[levelId];
  return best !== undefined && best <= shots ? progress : { ...progress, [levelId]: shots };
}

/**
 * Levels open one at a time: the next is playable once as many levels as come before it have
 * been won. Playing in order, that's "beat a level to open the next".
 */
export function isUnlocked(levels: readonly Level[], progress: Progress, index: number): boolean {
  const won = levels.filter((level) => progress[level.id] !== undefined).length;
  return index <= won;
}

/** The first level not yet won, or the last level once all are. */
export function nextLevelIndex(levels: readonly Level[], progress: Progress): number {
  const index = levels.findIndex((level) => progress[level.id] === undefined);
  return index === -1 ? levels.length - 1 : index;
}

function safeStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
