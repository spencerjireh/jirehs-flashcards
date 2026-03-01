import { vi } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import type {
  CalendarData,
  Card,
  CardState,
  CompareAnswerResponse,
  Deck,
  DeckSettings,
  DeckStats,
  ImportResult,
  ReviewResponse,
  StudyQueue,
  StudyStats,
} from '@jirehs-flashcards/shared-types';
import {
  createMockGlobalSettings,
  createMockEffectiveSettings,
  createMockDeckStats,
  createMockStudyStats,
} from '../factories';

export const mockDefaults = {
  decks: [] as Deck[],
  deck: null as Deck | null,
  studyQueue: {
    new_cards: [],
    review_cards: [],
    new_remaining: 0,
    review_remaining: 0,
  } as StudyQueue,
  card: null as Card | null,
  cardState: null as CardState | null,
  globalSettings: createMockGlobalSettings(),
  deckSettings: null as DeckSettings | null,
  effectiveSettings: createMockEffectiveSettings(),
  deckStats: createMockDeckStats({
    total_cards: 0,
    new_cards: 0,
    learning_cards: 0,
    review_cards: 0,
    average_interval: 0,
  }),
  studyStats: createMockStudyStats({
    reviews_today: 0,
    new_today: 0,
    streak_days: 0,
    retention_rate: 0,
    total_reviews: 0,
  }),
  calendarData: [] as CalendarData[],
  watchedDirectories: [] as string[],
  importResult: { imported: 0, deck_path: '' } as ImportResult,
  reviewResponse: {
    new_state: {
      status: 'learning',
      interval_days: 1,
      ease_factor: 2.5,
      lapses: 0,
      reviews_count: 1,
    },
    next_due: new Date().toISOString(),
  } as ReviewResponse,
  compareAnswerResponse: {
    is_correct: true,
    similarity: 1.0,
    matching_mode: 'exact',
    typed_normalized: '',
    correct_normalized: '',
    diff: [],
  } as CompareAnswerResponse,
};

// Map command names to their default return values
const commandDefaults: Record<string, unknown> = {
  list_decks: mockDefaults.decks,
  get_deck: mockDefaults.deck,
  import_file: mockDefaults.importResult,
  import_directory: mockDefaults.importResult,
  get_study_queue: mockDefaults.studyQueue,
  submit_review: mockDefaults.reviewResponse,
  get_card: mockDefaults.card,
  get_card_state: mockDefaults.cardState,
  compare_typed_answer: mockDefaults.compareAnswerResponse,
  get_global_settings: mockDefaults.globalSettings,
  save_global_settings: undefined,
  get_deck_settings: mockDefaults.deckSettings,
  save_deck_settings: undefined,
  delete_deck_settings: undefined,
  get_effective_settings: mockDefaults.effectiveSettings,
  get_deck_stats: mockDefaults.deckStats,
  get_study_stats: mockDefaults.studyStats,
  get_calendar_data: mockDefaults.calendarData,
  start_watching: undefined,
  stop_watching: undefined,
  get_watched_directories: mockDefaults.watchedDirectories,
  refresh_watched_directories: undefined,
};

function createMockFn(defaultValue: unknown) {
  return vi.fn((_args?: unknown) => Promise.resolve(defaultValue));
}

export const mockTauriCommands = {
  list_decks: createMockFn(mockDefaults.decks),
  get_deck: createMockFn(mockDefaults.deck),
  import_file: createMockFn(mockDefaults.importResult),
  import_directory: createMockFn(mockDefaults.importResult),
  get_study_queue: createMockFn(mockDefaults.studyQueue),
  submit_review: createMockFn(mockDefaults.reviewResponse),
  get_card: createMockFn(mockDefaults.card),
  get_card_state: createMockFn(mockDefaults.cardState),
  compare_typed_answer: createMockFn(mockDefaults.compareAnswerResponse),
  get_global_settings: createMockFn(mockDefaults.globalSettings),
  save_global_settings: createMockFn(undefined),
  get_deck_settings: createMockFn(mockDefaults.deckSettings),
  save_deck_settings: createMockFn(undefined),
  delete_deck_settings: createMockFn(undefined),
  get_effective_settings: createMockFn(mockDefaults.effectiveSettings),
  get_deck_stats: createMockFn(mockDefaults.deckStats),
  get_study_stats: createMockFn(mockDefaults.studyStats),
  get_calendar_data: createMockFn(mockDefaults.calendarData),
  start_watching: createMockFn(undefined),
  stop_watching: createMockFn(undefined),
  get_watched_directories: createMockFn(mockDefaults.watchedDirectories),
  refresh_watched_directories: createMockFn(undefined),
};

export function setupTauriMock() {
  vi.mocked(invoke).mockImplementation(((cmd: string, args?: unknown) => {
    const mockFn = mockTauriCommands[cmd as keyof typeof mockTauriCommands];
    if (mockFn) {
      return mockFn(args);
    }
    console.warn(`Unmocked Tauri command: ${cmd}`);
    return Promise.reject(new Error(`Unmocked Tauri command: ${cmd}`));
  }) as typeof invoke);
}

export function resetTauriMocks() {
  for (const [cmd, mock] of Object.entries(mockTauriCommands)) {
    mock.mockReset().mockImplementation(
      (_args?: unknown) => Promise.resolve(commandDefaults[cmd])
    );
  }
}
