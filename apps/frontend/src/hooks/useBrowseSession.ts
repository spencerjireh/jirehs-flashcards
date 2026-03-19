import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tauri } from '../lib/tauri';

export function useBrowseSession(deckPath?: string) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const {
    data: cards,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['deck-cards', deckPath],
    queryFn: () => tauri.getDeckCards(deckPath!),
    enabled: !!deckPath,
  });

  const total = cards?.length ?? 0;
  const currentCard = total > 0 ? (cards![currentIndex] ?? null) : null;

  const reveal = useCallback(() => {
    setRevealed(true);
  }, []);

  const goToNext = useCallback(() => {
    if (!total) return;
    setCurrentIndex((prev) => (prev + 1) % total);
    setRevealed(false);
  }, [total]);

  const goToPrevious = useCallback(() => {
    if (!total) return;
    setCurrentIndex((prev) => (prev - 1 + total) % total);
    setRevealed(false);
  }, [total]);

  // Reset index when deck changes
  useEffect(() => {
    setCurrentIndex(0);
    setRevealed(false);
  }, [deckPath]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrevious();
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (!revealed) reveal();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrevious, reveal, revealed]);

  return {
    currentCard,
    currentIndex,
    total,
    revealed,
    isLoading,
    error,
    reveal,
    goToNext,
    goToPrevious,
  };
}
