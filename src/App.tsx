import { useEffect, useState } from 'react';

import { Game } from './components/Game';
import { LevelSelect } from './components/LevelSelect';
import { LEVELS } from './game/levels';
import { isUnlocked, loadProgress, recordWin, saveProgress, type Progress } from './game/progress';

/** The level in the URL (`#level=u-turn`), if it's one the player has opened. */
function levelFromHash(progress: Progress): number | null {
  const id = new URLSearchParams(window.location.hash.slice(1)).get('level');
  const index = LEVELS.findIndex((level) => level.id === id);
  return index !== -1 && isUnlocked(LEVELS, progress, index) ? index : null;
}

export function App() {
  const [progress, setProgress] = useState(loadProgress);
  const [playing, setPlaying] = useState(() => levelFromHash(progress));

  // Each level is a history entry, so the browser's back button returns to the level list.
  useEffect(() => {
    const onPopState = () => {
      setPlaying(levelFromHash(loadProgress()));
    };
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

  const play = (index: number) => {
    const level = LEVELS[index];
    if (!level) return;
    const hash = `#level=${level.id}`;
    if (playing === null) window.history.pushState(null, '', hash);
    else window.history.replaceState(null, '', hash);
    setPlaying(index);
  };

  const showMenu = () => {
    if (playing !== null) window.history.replaceState(null, '', window.location.pathname);
    setPlaying(null);
  };

  const level = playing === null ? undefined : LEVELS[playing];
  if (playing === null || !level) {
    return <LevelSelect levels={LEVELS} progress={progress} onPlay={play} />;
  }

  return (
    <Game
      key={level.id}
      level={level}
      index={playing}
      best={progress[level.id]}
      hasNext={playing < LEVELS.length - 1}
      onWin={(shots) => {
        const next = recordWin(progress, level.id, shots);
        saveProgress(next);
        setProgress(next);
      }}
      onNext={() => {
        play(playing + 1);
      }}
      onMenu={showMenu}
    />
  );
}
