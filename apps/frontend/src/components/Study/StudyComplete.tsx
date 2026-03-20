import { Restart, ArrowLeft } from 'iconoir-react';
import styles from './StudyComplete.module.css';

interface StudyCompleteProps {
  onRestart?: () => void;
  onReturn?: () => void;
}

export function StudyComplete({ onRestart, onReturn }: StudyCompleteProps) {
  return (
    <div className={styles['study-complete']}>
      <h2>Session Complete</h2>
      <p>You've reviewed all cards for this session.</p>
      <div className={styles['study-complete-actions']}>
        {onRestart && (
          <button type="button" className="button button-icon" onClick={onRestart}>
            <Restart /> Study Again
          </button>
        )}
        {onReturn && (
          <button type="button" className="button button-secondary button-icon" onClick={onReturn}>
            <ArrowLeft /> Back to Decks
          </button>
        )}
      </div>
    </div>
  );
}
