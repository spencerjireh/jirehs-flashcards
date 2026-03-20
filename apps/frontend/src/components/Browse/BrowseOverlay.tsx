import { useEffect } from 'react';
import { useBrowseSession } from '../../hooks/useBrowseSession';
import styles from './BrowseOverlay.module.css';

interface BrowseOverlayProps {
  deckPath: string;
  onExit: () => void;
}

export function BrowseOverlay({ deckPath, onExit }: BrowseOverlayProps) {
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

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onExit();
        return;
      }

      if (e.key === 'ArrowRight' || e.key === 'l') {
        goToNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'h') {
        goToPrevious();
      } else if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        reveal();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onExit, goToNext, goToPrevious, reveal]);

  if (isLoading) {
    return (
      <div className={styles.overlay}>
        <div className="loading">Loading cards...</div>
      </div>
    );
  }

  if (!currentCard || total === 0) {
    return (
      <div className={styles.overlay}>
        <div className="no-cards">
          <h2>No cards in this deck</h2>
          <p>Import some flashcards to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.card} key={currentIndex}>
        <div className={styles.question}>{currentCard.question}</div>
        <div
          className={styles.divider}
          data-visible={revealed || undefined}
        />
        <div
          className={styles.answer}
          data-visible={revealed || undefined}
        >
          {currentCard.answer}
        </div>
      </div>

      <div className={styles.counter}>
        {currentIndex + 1} / {total}
      </div>

      <div className={styles.hints}>
        <div className={styles.hint}><kbd>&#8592;</kbd> prev</div>
        <div className={styles.hint}><kbd>Space</kbd> flip</div>
        <div className={styles.hint}><kbd>&#8594;</kbd> next</div>
        <div className={styles.hint}><kbd>Esc</kbd> exit</div>
      </div>
    </div>
  );
}
