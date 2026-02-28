import { Link } from 'react-router-dom';
import { Restart, ArrowLeft } from 'iconoir-react';

interface StudyCompleteProps {
  onRestart?: () => void;
}

export function StudyComplete({ onRestart }: StudyCompleteProps) {
  return (
    <div className="study-complete">
      <h2>Session Complete</h2>
      <p>You've reviewed all cards for this session.</p>
      <div className="study-complete-actions">
        {onRestart && (
          <button type="button" className="button button-icon" onClick={onRestart}>
            <Restart /> Study Again
          </button>
        )}
        <Link to="/" className="button button-secondary button-icon">
          <ArrowLeft /> Back to Decks
        </Link>
      </div>
    </div>
  );
}
