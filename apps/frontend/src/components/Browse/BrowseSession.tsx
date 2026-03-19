import { ArrowLeft, ArrowRight } from 'iconoir-react';
import { useBrowseSession } from '../../hooks/useBrowseSession';
import { Card } from '../Card/Card';

interface BrowseSessionProps {
  deckPath?: string;
}

export function BrowseSession({ deckPath }: BrowseSessionProps) {
  const {
    currentCard,
    currentIndex,
    total,
    revealed,
    isLoading,
    reveal,
    goToNext,
    goToPrevious,
  } = useBrowseSession(deckPath);

  if (!deckPath) {
    return <div className="no-cards">Select a deck to browse.</div>;
  }

  if (isLoading) {
    return <div className="loading">Loading cards...</div>;
  }

  if (!currentCard || total === 0) {
    return (
      <div className="no-cards">
        <h2>No cards in this deck</h2>
        <p>Import some flashcards to get started.</p>
      </div>
    );
  }

  return (
    <div className="browse-session">
      <div className="browse-header">
        <span className="browse-counter">
          {currentIndex + 1} / {total}
        </span>
      </div>

      <Card card={currentCard} revealed={revealed} onReveal={reveal} />

      <div className="browse-nav">
        <button
          type="button"
          className="button button-secondary button-icon"
          onClick={goToPrevious}
          aria-label="Previous card"
        >
          <ArrowLeft /> Previous
        </button>
        <button
          type="button"
          className="button button-secondary button-icon"
          onClick={goToNext}
          aria-label="Next card"
        >
          Next <ArrowRight />
        </button>
      </div>
    </div>
  );
}
