import { useEffect, useId, useRef } from 'react';

import { starsFor } from '../game/physics';
import styles from './WinDialog.module.css';
import { Stars } from './Stars';

interface WinDialogProps {
  shots: number;
  par: number;
  /** Best before this win. */
  best: number | undefined;
  hasNext: boolean;
  onNext: () => void;
  onReplay: () => void;
  onMenu: () => void;
}

export function WinDialog({ shots, par, best, hasNext, onNext, onReplay, onMenu }: WinDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const stars = starsFor(shots, par);
  const newBest = best === undefined || shots < best;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    // Opening as a modal focuses the first button, "Next level".
    dialog.showModal();
    return () => {
      dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby={titleId}
      onCancel={(event) => {
        // Escape goes back to the level list rather than leaving a won level half-open.
        event.preventDefault();
        onMenu();
      }}
    >
      <h2 id={titleId} className={styles.title}>
        Goal!
      </h2>
      <Stars count={stars} className={styles.stars} />
      <p className={styles.summary}>
        {shots} {shots === 1 ? 'shot' : 'shots'} · par {par}
        {newBest && best !== undefined && <span className={styles.best}> · new best</span>}
      </p>
      <div className={styles.actions}>
        <button type="button" className={styles.primary} onClick={hasNext ? onNext : onMenu}>
          {hasNext ? 'Next level' : 'All levels'}
        </button>
        <button type="button" className={styles.secondary} onClick={onReplay}>
          Play again
        </button>
        {hasNext && (
          <button type="button" className={styles.secondary} onClick={onMenu}>
            Levels
          </button>
        )}
      </div>
    </dialog>
  );
}
