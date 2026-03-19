import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '../test/utils';
import { useBrowseSession } from './useBrowseSession';
import { createMockCard, resetIdCounter } from '../test/factories';
import { createHookWrapper } from '../test/utils';
import { mockTauriCommands } from '../test/mocks/tauri';

describe('useBrowseSession', () => {
  const mockCards = [
    createMockCard({ id: 1, question: 'Q1', answer: 'A1' }),
    createMockCard({ id: 2, question: 'Q2', answer: 'A2' }),
    createMockCard({ id: 3, question: 'Q3', answer: 'A3' }),
  ];

  beforeEach(() => {
    resetIdCounter();
    mockTauriCommands.get_deck_cards.mockResolvedValue(mockCards);
  });

  it('should return loading state initially', () => {
    mockTauriCommands.get_deck_cards.mockImplementation(() => new Promise(() => {}));
    const { wrapper } = createHookWrapper();
    const { result } = renderHook(() => useBrowseSession('/decks/test'), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.currentCard).toBeNull();
  });

  it('should return cards after fetch', async () => {
    const { wrapper } = createHookWrapper();
    const { result } = renderHook(() => useBrowseSession('/decks/test'), { wrapper });

    await waitFor(() => {
      expect(result.current.total).toBe(3);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.currentCard?.question).toBe('Q1');
    expect(result.current.currentIndex).toBe(0);
  });

  it('should not fetch when deckPath is undefined', () => {
    const { wrapper } = createHookWrapper();
    const { result } = renderHook(() => useBrowseSession(undefined), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.total).toBe(0);
    expect(result.current.currentCard).toBeNull();
  });

  it('should advance with goToNext and wrap around', async () => {
    const { wrapper } = createHookWrapper();
    const { result } = renderHook(() => useBrowseSession('/decks/test'), { wrapper });

    await waitFor(() => {
      expect(result.current.total).toBe(3);
    });

    await act(async () => result.current.goToNext());
    expect(result.current.currentIndex).toBe(1);
    expect(result.current.currentCard?.question).toBe('Q2');

    await act(async () => result.current.goToNext());
    expect(result.current.currentIndex).toBe(2);

    // Wrap around
    await act(async () => result.current.goToNext());
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.currentCard?.question).toBe('Q1');
  });

  it('should go back with goToPrevious and wrap around', async () => {
    const { wrapper } = createHookWrapper();
    const { result } = renderHook(() => useBrowseSession('/decks/test'), { wrapper });

    await waitFor(() => {
      expect(result.current.total).toBe(3);
    });

    await act(async () => result.current.goToPrevious());
    expect(result.current.currentIndex).toBe(2);
    expect(result.current.currentCard?.question).toBe('Q3');

    await act(async () => result.current.goToPrevious());
    expect(result.current.currentIndex).toBe(1);
  });

  it('should set revealed to true on reveal', async () => {
    const { wrapper } = createHookWrapper();
    const { result } = renderHook(() => useBrowseSession('/decks/test'), { wrapper });

    await waitFor(() => {
      expect(result.current.total).toBe(3);
    });

    expect(result.current.revealed).toBe(false);

    await act(async () => result.current.reveal());
    expect(result.current.revealed).toBe(true);
  });

  it('should reset revealed on navigation', async () => {
    const { wrapper } = createHookWrapper();
    const { result } = renderHook(() => useBrowseSession('/decks/test'), { wrapper });

    await waitFor(() => {
      expect(result.current.total).toBe(3);
    });

    await act(async () => result.current.reveal());
    expect(result.current.revealed).toBe(true);

    await act(async () => result.current.goToNext());
    expect(result.current.revealed).toBe(false);
  });
});
