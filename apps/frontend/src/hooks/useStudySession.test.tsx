import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useStudySession } from './useStudySession';
import { useStudyStore } from '../stores/studyStore';
import {
  createMockCard,
  createMockStudyQueue,
  createMockEffectiveSettings,
} from '../test/factories';
import { mockTauriCommands } from '../test/mocks/tauri';
import { createHookWrapper } from '../test/utils';

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
});
