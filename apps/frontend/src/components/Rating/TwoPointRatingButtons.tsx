import type { Rating } from '@jirehs-flashcards/shared-types';
import styles from './RatingButtons.module.css';

interface TwoPointRatingButtonsProps {
  onRate: (rating: Rating) => void;
  disabled?: boolean;
}

export function TwoPointRatingButtons({ onRate, disabled = false }: TwoPointRatingButtonsProps) {
  // 2-point scale: Wrong (1) -> Again, Correct (2) -> Good (3)
  return (
    <div className={`${styles['rating-buttons']} ${styles['two-point']}`}>
      <button
        type="button"
        className={`${styles['rating-button']} ${styles['rating-wrong']}`}
        style={{ '--rating-color': 'var(--danger)' } as React.CSSProperties}
        onClick={() => onRate(1)}
        disabled={disabled}
      >
        Wrong
      </button>
      <button
        type="button"
        className={`${styles['rating-button']} ${styles['rating-correct']}`}
        style={{ '--rating-color': 'var(--success)' } as React.CSSProperties}
        onClick={() => onRate(3)}
        disabled={disabled}
      >
        Correct
      </button>
    </div>
  );
}
