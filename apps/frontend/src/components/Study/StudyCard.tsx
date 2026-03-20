import type { Card } from '@jirehs-flashcards/shared-types';
import styles from './StudyCard.module.css';

interface StudyCardProps {
  card: Card;
  revealed: boolean;
  falling: boolean;
  fallRotation: number;
  entering: boolean;
  children?: React.ReactNode;
}

export function StudyCard({
  card,
  revealed,
  falling,
  fallRotation,
  entering,
  children,
}: StudyCardProps) {
  const classNames = [
    styles.card,
    entering ? styles.entering : '',
    falling ? styles.falling : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classNames}
      style={
        falling
          ? ({ '--fall-rotate': `${fallRotation}deg` } as React.CSSProperties)
          : undefined
      }
    >
      <div className={styles.question}>{card.question}</div>
      <div className={styles.divider} data-visible={revealed || undefined} />
      <div className={styles.answer} data-visible={revealed || undefined}>
        {card.answer}
      </div>
      {children}
    </div>
  );
}
