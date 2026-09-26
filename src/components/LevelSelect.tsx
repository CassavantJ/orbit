import { Lock, Play } from 'lucide-react';
import { useId } from 'react';

import { app } from '../app.config';
import { starsFor, type Level } from '../game/physics';
import { isUnlocked, nextLevelIndex, type Progress } from '../game/progress';
import styles from './LevelSelect.module.css';
import { Stars } from './Stars';

interface LevelSelectProps {
  levels: readonly Level[];
  progress: Progress;
  onPlay: (index: number) => void;
}

export function LevelSelect({ levels, progress, onPlay }: LevelSelectProps) {
  const id = useId();
  const next = nextLevelIndex(levels, progress);
  const started = Object.keys(progress).length > 0;

  return (
    <main className={styles.menu}>
      <header className={styles.intro}>
        <h1 className={styles.title}>{app.title}</h1>
        <p className={styles.tagline}>
          Fling a probe through gravity wells to reach the goal. Planets bend its path, moons move,
          and black holes don’t let go.
        </p>
        <button
          type="button"
          className={styles.play}
          onClick={() => {
            onPlay(next);
          }}
        >
          <Play aria-hidden="true" className={styles.playIcon} />
          {started ? `Continue: level ${next + 1}` : 'Play'}
        </button>
      </header>

      <section aria-labelledby={`${id}-levels`}>
        <h2 id={`${id}-levels`} className={styles.heading}>
          Levels
        </h2>
        <ol className={styles.grid}>
          {levels.map((level, index) => {
            const unlocked = isUnlocked(levels, progress, index);
            const best = progress[level.id];
            return (
              <li key={level.id}>
                <button
                  type="button"
                  className={styles.level}
                  disabled={!unlocked}
                  onClick={() => {
                    onPlay(index);
                  }}
                >
                  <span className={styles.levelNumber}>{index + 1}</span>
                  <span className={styles.levelName}>{unlocked ? level.name : 'Locked'}</span>
                  {!unlocked && <Lock aria-hidden="true" className={styles.lock} />}
                  {best !== undefined && (
                    <span className={styles.levelStars}>
                      <Stars count={starsFor(best, level.par)} />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      <section aria-labelledby={`${id}-how`} className={styles.how}>
        <h2 id={`${id}-how`} className={styles.heading}>
          How to play
        </h2>
        <dl className={styles.controls}>
          <div>
            <dt>Mouse or touch</dt>
            <dd>Drag back anywhere, like a slingshot, and let go to launch.</dd>
          </div>
          <div>
            <dt>Keyboard</dt>
            <dd>
              Left and Right aim, Up and Down set power (hold Shift for fine steps), Space launches,
              R restarts, Escape returns here.
            </dd>
          </div>
          <div>
            <dt>Controller</dt>
            <dd>Left stick aims, D-pad fine-tunes, A launches, X restarts, B returns here.</dd>
          </div>
        </dl>
        <p className={styles.note}>
          The dotted line shows where a shot starts to go; the faint dashed line is your last shot.
          Moons only move once you launch, so every shot is repeatable.
        </p>
      </section>
    </main>
  );
}
