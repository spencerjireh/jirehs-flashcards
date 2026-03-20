import { useEffect, useState, useCallback, useRef } from 'react';
import type { Rating } from '@jirehs-flashcards/shared-types';
import { useStudySession } from '../../hooks/useStudySession';
import { useStudyStore } from '../../stores/studyStore';
import { StudyCard } from './StudyCard';
import { StudyComplete } from './StudyComplete';
import { KeyHints } from './KeyHints';
import { AmbientProgress } from './AmbientProgress';
import { TypedAnswerInput } from './TypedAnswerInput';
import { AnswerComparison } from './AnswerComparison';
import { RatingButtons } from '../Rating/RatingButtons';
import styles from './StudyOverlay.module.css';
import cardStyles from './StudyCard.module.css';

interface StudyOverlayProps {
  deckPath: string;
  onExit: () => void;
}

const RATING_NAMES: Record<Rating, string> = {
  1: 'again',
  2: 'hard',
  3: 'good',
  4: 'easy',
};

export function StudyOverlay({ deckPath, onExit }: StudyOverlayProps) {
  const {
    currentCard,
    currentIndex,
    total,
    revealed,
    isComplete,
    isLoading,
    isSubmitting,
    isComparing,
    answerMode,
    typedAnswer,
    compareResult,
    ratingScale,
    reveal,
    rate,
    restart,
    setTypedAnswer,
    submitTypedAnswer,
  } = useStudySession(deckPath);

  const { reset } = useStudyStore();

  const [falling, setFalling] = useState(false);
  const [entering, setEntering] = useState(true);
  const [fallRotation, setFallRotation] = useState(0);
  const [flashRating, setFlashRating] = useState<string | null>(null);
  const flashTimeout = useRef<ReturnType<typeof setTimeout>>();

  // Reset study store when overlay mounts
  useEffect(() => {
    reset();
  }, [reset]);

  // Reset entering state when card changes
  useEffect(() => {
    if (currentCard && !falling) {
      setEntering(true);
      const timer = setTimeout(() => setEntering(false), 400);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, currentCard, falling]);

  const handleRate = useCallback(
    (rating: Rating) => {
      if (!revealed || falling || isSubmitting) return;

      // Flash feedback
      const ratingName = RATING_NAMES[rating] ?? 'good';
      setFlashRating(ratingName);
      if (flashTimeout.current) clearTimeout(flashTimeout.current);
      flashTimeout.current = setTimeout(() => setFlashRating(null), 200);

      // Card fall
      setFallRotation(Math.random() * 10 - 5);
      setFalling(true);

      // After fall animation, submit the rating
      setTimeout(() => {
        rate(rating);
        setFalling(false);
      }, 350);
    },
    [revealed, falling, isSubmitting, rate]
  );

  // Keyboard handler
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't handle if palette is open or input is focused
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onExit();
        return;
      }

      if (isComplete) return;

      if (e.code === 'Space' && !revealed && !falling) {
        e.preventDefault();
        if (answerMode === 'flip') {
          reveal();
        }
        return;
      }

      if (revealed && !falling) {
        if (e.key === 'j') handleRate(1);      // Again
        else if (e.key === 'k') handleRate(2); // Hard
        else if (e.key === 'l') handleRate(3); // Good
        else if (e.key === ';') handleRate(4); // Easy
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [revealed, falling, isComplete, answerMode, reveal, handleRate, onExit]);

  if (isLoading) {
    return (
      <div className={styles.overlay}>
        <div className="loading">Loading cards...</div>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className={styles.overlay}>
        <StudyComplete onRestart={restart} onReturn={onExit} />
        <AmbientProgress remaining={0} total={total} visible={false} />
      </div>
    );
  }

  if (!currentCard) {
    return (
      <div className={styles.overlay}>
        <div className="no-cards">
          <h2>No cards to study</h2>
          <p>Import some flashcards to get started.</p>
        </div>
      </div>
    );
  }

  const remaining = total - currentIndex;

  return (
    <div className={styles.overlay}>
      {answerMode === 'flip' ? (
        <StudyCard
          card={currentCard}
          revealed={revealed}
          falling={falling}
          fallRotation={fallRotation}
          entering={entering}
        />
      ) : (
        <StudyCard
          card={currentCard}
          revealed={false}
          falling={falling}
          fallRotation={fallRotation}
          entering={entering}
        >
          {!revealed ? (
            <div className={cardStyles.typedSection}>
              <TypedAnswerInput
                value={typedAnswer}
                onChange={setTypedAnswer}
                onSubmit={submitTypedAnswer}
                disabled={isComparing}
              />
            </div>
          ) : (
            compareResult && (
              <div className={cardStyles.comparisonSection}>
                <AnswerComparison
                  result={compareResult}
                  correctAnswer={currentCard.answer}
                />
              </div>
            )
          )}
        </StudyCard>
      )}

      {revealed && !falling && (
        <div className={cardStyles.ratingSection}>
          <RatingButtons
            onRate={handleRate}
            disabled={isSubmitting}
            ratingScale={ratingScale}
          />
        </div>
      )}

      <div
        className={styles.ratingFlash}
        data-active={flashRating ? true : undefined}
        data-rating={flashRating ?? undefined}
      />

      <KeyHints
        revealed={revealed}
        visible={!isComplete && answerMode === 'flip'}
      />

      <AmbientProgress
        remaining={remaining}
        total={total}
        visible={!isComplete}
      />
    </div>
  );
}
