import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useStudyStore } from './studyStore';
import { createMockCompareAnswerResponse } from '../test/factories';

describe('useStudyStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useStudyStore.setState({
      currentIndex: 0,
      revealed: false,
      startTime: null,
      answerMode: 'flip',
      typedAnswer: '',
      compareResult: null,
    });
  });

  describe('initial state', () => {
    it('should have correct initial values', () => {
      const state = useStudyStore.getState();

      expect(state.currentIndex).toBe(0);
      expect(state.revealed).toBe(false);
      expect(state.startTime).toBeNull();
      expect(state.answerMode).toBe('flip');
      expect(state.typedAnswer).toBe('');
      expect(state.compareResult).toBeNull();
    });
  });

  describe('startTimer', () => {
    it('should set startTime to current timestamp', () => {
      const before = Date.now();
      useStudyStore.getState().startTimer();
      const after = Date.now();

      const startTime = useStudyStore.getState().startTime;
      expect(startTime).not.toBeNull();
      expect(startTime).toBeGreaterThanOrEqual(before);
      expect(startTime).toBeLessThanOrEqual(after);
    });
  });

  describe('getElapsedMs', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('should return 0 when timer not started', () => {
      const elapsed = useStudyStore.getState().getElapsedMs();

      expect(elapsed).toBe(0);
    });

    it('should return elapsed time when timer is running', () => {
      useStudyStore.getState().startTimer();
      vi.advanceTimersByTime(1000);

      const elapsed = useStudyStore.getState().getElapsedMs();
      expect(elapsed).toBeGreaterThanOrEqual(1000);
    });

    it('should return correct elapsed time after multiple advances', () => {
      useStudyStore.getState().startTimer();
      vi.advanceTimersByTime(500);
      vi.advanceTimersByTime(500);

      const elapsed = useStudyStore.getState().getElapsedMs();
      expect(elapsed).toBeGreaterThanOrEqual(1000);
    });
  });

  describe('reset', () => {
    it('should clear all state except answerMode', () => {
      // Set up non-default state
      useStudyStore.setState({
        currentIndex: 5,
        revealed: true,
        startTime: Date.now(),
        answerMode: 'typed',
        typedAnswer: 'some answer',
        compareResult: createMockCompareAnswerResponse(),
      });

      useStudyStore.getState().reset();

      const state = useStudyStore.getState();
      expect(state.currentIndex).toBe(0);
      expect(state.revealed).toBe(false);
      expect(state.startTime).toBeNull();
      expect(state.answerMode).toBe('typed'); // Should preserve answer mode
      expect(state.typedAnswer).toBe('');
      expect(state.compareResult).toBeNull();
    });

    it('should preserve flip mode when resetting', () => {
      useStudyStore.setState({
        currentIndex: 3,
        answerMode: 'flip',
      });

      useStudyStore.getState().reset();

      expect(useStudyStore.getState().answerMode).toBe('flip');
    });
  });

  describe('nextCard', () => {
    it('should increment the current index', () => {
      useStudyStore.getState().nextCard();

      expect(useStudyStore.getState().currentIndex).toBe(1);
    });

    it('should reset card-specific state', () => {
      // Set up state as if we just reviewed a card
      useStudyStore.setState({
        currentIndex: 2,
        revealed: true,
        startTime: Date.now(),
        typedAnswer: 'my answer',
        compareResult: createMockCompareAnswerResponse(),
      });

      useStudyStore.getState().nextCard();

      const state = useStudyStore.getState();
      expect(state.currentIndex).toBe(3);
      expect(state.revealed).toBe(false);
      expect(state.startTime).toBeNull();
      expect(state.typedAnswer).toBe('');
      expect(state.compareResult).toBeNull();
    });

    it('should preserve answer mode', () => {
      useStudyStore.setState({ answerMode: 'typed' });

      useStudyStore.getState().nextCard();

      expect(useStudyStore.getState().answerMode).toBe('typed');
    });

    it('should increment correctly multiple times', () => {
      useStudyStore.getState().nextCard();
      useStudyStore.getState().nextCard();
      useStudyStore.getState().nextCard();

      expect(useStudyStore.getState().currentIndex).toBe(3);
    });
  });
});
