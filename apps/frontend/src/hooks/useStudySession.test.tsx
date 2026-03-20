import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor, act, createHookWrapper } from '../test/utils';
import { useStudySession } from './useStudySession';
import { useStudyStore } from '../stores/studyStore';
import {
  createMockCard,
  createMockStudyQueue,
  createMockEffectiveSettings,
} from '../test/factories';
import { mockTauriCommands } from '../test/mocks/tauri';

describe('useStudySession', () => {
  beforeEach(() => {
    // Reset Zustand store
    useStudyStore.setState({
      currentIndex: 0,
      revealed: false,
      startTime: null,
      answerMode: 'flip',
      typedAnswer: '',
      compareResult: null,
      sessionCards: null,
    });

    // Default mock implementations
    mockTauriCommands.get_effective_settings.mockResolvedValue(
      createMockEffectiveSettings()
    );
  });

  it('should fetch study queue for deck', async () => {
    const mockQueue = createMockStudyQueue({
      new_cards: [createMockCard()],
      review_cards: [createMockCard()],
    });
    mockTauriCommands.get_study_queue.mockResolvedValue(mockQueue);

    const { wrapper } = createHookWrapper();
    const { result } = renderHook(() => useStudySession('/decks/test'), {
      wrapper,
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockTauriCommands.get_study_queue).toHaveBeenCalledWith({ deckPath: '/decks/test' });
  });

  it('should return loading state initially', () => {
    mockTauriCommands.get_study_queue.mockImplementation(
      () => new Promise(() => {})
    );

    const { wrapper } = createHookWrapper();
    const { result } = renderHook(() => useStudySession('/decks/test'), {
      wrapper,
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.currentCard).toBeUndefined();
  });

  it('should combine new_cards and review_cards into allCards', async () => {
    const newCard = createMockCard({ id: 1 });
    const reviewCard = createMockCard({ id: 2 });
    const mockQueue = createMockStudyQueue({
      new_cards: [newCard],
      review_cards: [reviewCard],
    });
    mockTauriCommands.get_study_queue.mockResolvedValue(mockQueue);

    const { wrapper } = createHookWrapper();
    const { result } = renderHook(() => useStudySession('/decks/test'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.total).toBe(2);
    expect(result.current.currentCard).toEqual(newCard);
  });

  it('should return currentCard at current index', async () => {
    const card1 = createMockCard({ id: 1, question: 'Q1' });
    const card2 = createMockCard({ id: 2, question: 'Q2' });
    const mockQueue = createMockStudyQueue({
      new_cards: [card1, card2],
    });
    mockTauriCommands.get_study_queue.mockResolvedValue(mockQueue);

    const { wrapper } = createHookWrapper();
    const { result } = renderHook(() => useStudySession('/decks/test'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.currentCard?.question).toBe('Q1');

    // Advance to next card
    act(() => {
      useStudyStore.getState().setCurrentIndex(1);
    });

    expect(result.current.currentCard?.question).toBe('Q2');
  });

  it('should calculate progress correctly', async () => {
    const mockQueue = createMockStudyQueue({
      new_cards: [createMockCard(), createMockCard(), createMockCard(), createMockCard()],
    });
    mockTauriCommands.get_study_queue.mockResolvedValue(mockQueue);

    const { wrapper } = createHookWrapper();
    const { result } = renderHook(() => useStudySession('/decks/test'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.progress).toBe(0);
    expect(result.current.total).toBe(4);

    act(() => {
      useStudyStore.getState().setCurrentIndex(2);
    });

    expect(result.current.progress).toBe(0.5);
  });

  it('should return isComplete true when all cards reviewed', async () => {
    const mockQueue = createMockStudyQueue({
      new_cards: [createMockCard()],
    });
    mockTauriCommands.get_study_queue.mockResolvedValue(mockQueue);

    const { wrapper } = createHookWrapper();
    const { result } = renderHook(() => useStudySession('/decks/test'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isComplete).toBe(false);

    act(() => {
      useStudyStore.getState().setCurrentIndex(1);
    });

    expect(result.current.isComplete).toBe(true);
  });

  it('should toggle answer mode', async () => {
    const mockQueue = createMockStudyQueue({
      new_cards: [createMockCard()],
    });
    mockTauriCommands.get_study_queue.mockResolvedValue(mockQueue);

    const { wrapper } = createHookWrapper();
    const { result } = renderHook(() => useStudySession('/decks/test'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.answerMode).toBe('flip');

    act(() => {
      result.current.toggleAnswerMode();
    });

    expect(result.current.answerMode).toBe('typed');

    act(() => {
      result.current.toggleAnswerMode();
    });

    expect(result.current.answerMode).toBe('flip');
  });

  it('should reveal card and set revealed state', async () => {
    const mockQueue = createMockStudyQueue({
      new_cards: [createMockCard()],
    });
    mockTauriCommands.get_study_queue.mockResolvedValue(mockQueue);

    const { wrapper } = createHookWrapper();
    const { result } = renderHook(() => useStudySession('/decks/test'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.revealed).toBe(false);

    act(() => {
      result.current.reveal();
    });

    expect(result.current.revealed).toBe(true);
  });

  it('should set typed answer', async () => {
    const mockQueue = createMockStudyQueue({
      new_cards: [createMockCard()],
    });
    mockTauriCommands.get_study_queue.mockResolvedValue(mockQueue);

    const { wrapper } = createHookWrapper();
    const { result } = renderHook(() => useStudySession('/decks/test'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setTypedAnswer('my answer');
    });

    expect(result.current.typedAnswer).toBe('my answer');
  });

  it('should return default rating scale when settings not loaded', async () => {
    mockTauriCommands.get_effective_settings.mockImplementation(
      () => new Promise(() => {})
    );
    mockTauriCommands.get_study_queue.mockResolvedValue(createMockStudyQueue());

    const { wrapper } = createHookWrapper();
    const { result } = renderHook(() => useStudySession('/decks/test'), {
      wrapper,
    });

    // Default should be 4point
    expect(result.current.ratingScale).toBe('4point');
  });

  it('should submit review and advance to next card', async () => {
    const card = createMockCard({ id: 42 });
    const mockQueue = createMockStudyQueue({ new_cards: [card, createMockCard()] });
    mockTauriCommands.get_study_queue.mockResolvedValue(mockQueue);
    mockTauriCommands.submit_review.mockResolvedValue({
      new_state: { status: 'learning', interval_days: 1, ease_factor: 2.5, lapses: 0, reviews_count: 1 },
      next_due: new Date().toISOString(),
    });

    const { wrapper } = createHookWrapper();
    const { result } = renderHook(() => useStudySession('/decks/test'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Start timer so getElapsedMs returns a value
    act(() => {
      useStudyStore.getState().startTimer();
    });

    await act(async () => {
      result.current.rate(3);
    });

    await waitFor(() => {
      expect(result.current.isSubmitting).toBe(false);
    });

    expect(mockTauriCommands.submit_review).toHaveBeenCalledWith({
      request: expect.objectContaining({
        card_id: 42,
        rating: 3,
        rating_scale: '4point',
        answer_mode: 'flip',
      }),
    });
    // Should have advanced to next card
    expect(result.current.currentIndex).toBe(1);
  });

  it('should not rate when no current card', async () => {
    mockTauriCommands.get_study_queue.mockResolvedValue(createMockStudyQueue());

    const { wrapper } = createHookWrapper();
    const { result } = renderHook(() => useStudySession('/decks/test'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.rate(3);
    });

    expect(mockTauriCommands.submit_review).not.toHaveBeenCalled();
  });

  it('should submit typed answer and set compare result', async () => {
    const card = createMockCard({ id: 10, answer: 'Paris' });
    const mockQueue = createMockStudyQueue({ new_cards: [card] });
    mockTauriCommands.get_study_queue.mockResolvedValue(mockQueue);

    const compareResponse = {
      is_correct: true,
      similarity: 1.0,
      matching_mode: 'exact' as const,
      typed_normalized: 'paris',
      correct_normalized: 'paris',
      diff: [{ text: 'paris', diff_type: 'Same' as const }],
    };
    mockTauriCommands.compare_typed_answer.mockResolvedValue(compareResponse);

    const { wrapper } = createHookWrapper();
    const { result } = renderHook(() => useStudySession('/decks/test'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setTypedAnswer('Paris');
    });

    await act(async () => {
      result.current.submitTypedAnswer();
    });

    await waitFor(() => {
      expect(result.current.compareResult).toEqual(compareResponse);
    });

    expect(result.current.revealed).toBe(true);
    expect(mockTauriCommands.compare_typed_answer).toHaveBeenCalledWith({
      typedAnswer: 'Paris',
      correctAnswer: 'Paris',
      deckPath: '/decks/test',
    });
  });

  it('should not submit typed answer when empty', async () => {
    const card = createMockCard({ id: 10 });
    const mockQueue = createMockStudyQueue({ new_cards: [card] });
    mockTauriCommands.get_study_queue.mockResolvedValue(mockQueue);

    const { wrapper } = createHookWrapper();
    const { result } = renderHook(() => useStudySession('/decks/test'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.submitTypedAnswer();
    });

    expect(mockTauriCommands.compare_typed_answer).not.toHaveBeenCalled();
  });

  it('should use rating scale from effective settings', async () => {
    mockTauriCommands.get_effective_settings.mockResolvedValue(
      createMockEffectiveSettings({ rating_scale: '2point' })
    );
    mockTauriCommands.get_study_queue.mockResolvedValue(
      createMockStudyQueue({ new_cards: [createMockCard()] })
    );

    const { wrapper } = createHookWrapper();
    const { result } = renderHook(() => useStudySession('/decks/test'), { wrapper });

    await waitFor(() => {
      expect(result.current.ratingScale).toBe('2point');
    });
  });

  it('should handle queue fetch error', async () => {
    mockTauriCommands.get_study_queue.mockRejectedValue(new Error('Network error'));

    const { wrapper } = createHookWrapper();
    const { result } = renderHook(() => useStudySession('/decks/test'), { wrapper });

    await waitFor(() => {
      expect(result.current.queue.isError).toBe(true);
    });

    expect(result.current.queue.error?.message).toBe('Network error');
  });

  it('should restart session by resetting store and refetching queue', async () => {
    const mockQueue = createMockStudyQueue({ new_cards: [createMockCard()] });
    mockTauriCommands.get_study_queue.mockResolvedValue(mockQueue);

    const { wrapper } = createHookWrapper();
    const { result } = renderHook(() => useStudySession('/decks/test'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Advance state
    act(() => {
      useStudyStore.getState().setCurrentIndex(1);
      useStudyStore.getState().setRevealed(true);
    });

    expect(result.current.isComplete).toBe(true);

    act(() => {
      result.current.restart();
    });

    // Store should be reset
    expect(useStudyStore.getState().currentIndex).toBe(0);
    expect(useStudyStore.getState().revealed).toBe(false);
  });
});
