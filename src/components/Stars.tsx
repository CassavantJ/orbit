import { Star } from 'lucide-react';

import styles from './Stars.module.css';

interface StarsProps {
  /** 0–3. */
  count: number;
  className?: string | undefined;
}

export function Stars({ count, className }: StarsProps) {
  return (
    <span className={`${styles.stars} ${className ?? ''}`}>
      {[0, 1, 2].map((index) => (
        <Star key={index} aria-hidden="true" className={styles.star} data-earned={index < count} />
      ))}
      <span className="sr-only">{count} of 3 stars</span>
    </span>
  );
}
