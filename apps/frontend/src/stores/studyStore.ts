import { create } from 'zustand';
import type { AnswerMode, Card, CompareAnswerResponse } from '@jirehs-flashcards/shared-types';

interface StudyState {
  currentIndex: number;
  revealed: boolean;
  startTime: number | null;
  answerMode: AnswerMode;
  typedAnswer: string;
  compareResult: CompareAnswerResponse | null;
  sessionCards: Card[] | null;
  setCurrentIndex: (index: number) => void;
  setRevealed: (revealed: boolean) => void;
  startTimer: () => void;
  getElapsedMs: () => number;
  setAnswerMode: (mode: AnswerMode) => void;
  setTypedAnswer: (answer: string) => void;
  setCompareResult: (result: CompareAnswerResponse | null) => void;
  setSessionCards: (cards: Card[]) => void;
  reset: () => void;
  nextCard: () => void;
}

export const useStudyStore = create<StudyState>((set, get) => ({
  currentIndex: 0,
  revealed: false,
  startTime: null,
  answerMode: 'flip',
  typedAnswer: '',
  compareResult: null,
  sessionCards: null,

  setCurrentIndex: (index) => set({ currentIndex: index }),
  setRevealed: (revealed) => set({ revealed }),

  startTimer: () => set({ startTime: Date.now() }),

  getElapsedMs: () => {
    const { startTime } = get();
    return startTime ? Date.now() - startTime : 0;
  },

  setAnswerMode: (mode) => set({ answerMode: mode }),
  setTypedAnswer: (answer) => set({ typedAnswer: answer }),
  setCompareResult: (result) => set({ compareResult: result }),
  setSessionCards: (cards) => set({ sessionCards: cards }),

  reset: () =>
    set({
      currentIndex: 0,
      revealed: false,
      startTime: null,
      typedAnswer: '',
      compareResult: null,
      sessionCards: null,
    }),

  nextCard: () => {
    set((state) => ({
      currentIndex: state.currentIndex + 1,
      revealed: false,
      startTime: null,
      typedAnswer: '',
      compareResult: null,
    }));
  },
}));
