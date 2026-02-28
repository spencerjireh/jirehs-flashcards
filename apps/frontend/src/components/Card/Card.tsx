import type { Card as CardType } from '@jirehs-flashcards/shared-types';
import { Eye } from 'iconoir-react';

interface CardProps {
  card: CardType;
  revealed: boolean;
  onReveal: () => void;
}

export function Card({ card, revealed, onReveal }: CardProps) {
  return (
    <div className="card">
      <div className="card-content">
        <div className="card-question">
          <div className="card-label">Question</div>
          <div className="card-text">{card.question}</div>
        </div>

        {revealed ? (
          <div className="card-answer">
            <div className="card-label">Answer</div>
            <div className="card-text">{card.answer}</div>
          </div>
        ) : (
          <button type="button" className="button button-icon reveal-button" onClick={onReveal}>
            <Eye /> Show Answer
          </button>
        )}
      </div>
    </div>
  );
}
