import { vi } from 'vitest';
import type {
  CalendarData,
  Card,
  CardState,
  CompareAnswerResponse,
  Deck,
  DeckSettings,
  DeckStats,
  EffectiveSettings,
  GlobalSettings,
  ImportResult,
  ReviewResponse,
  StudyQueue,
  StudyStats,
} from '@jirehs-flashcards/shared-types';

// Default mock return values
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
  globalSettings: {
    algorithm: 'sm2',
    rating_scale: '4point',
    matching_mode: 'exact',
    fuzzy_threshold: 0.8,
    new_cards_per_day: 20,
    reviews_per_day: 200,
    daily_reset_hour: 4,
  } as GlobalSettings,
  deckSettings: null as DeckSettings | null,
  effectiveSettings: {
    algorithm: 'sm2',
    rating_scale: '4point',
    matching_mode: 'exact',
    fuzzy_threshold: 0.8,
    new_cards_per_day: 20,
    reviews_per_day: 200,
    daily_reset_hour: 4,
  } as EffectiveSettings,
  deckStats: {
    total_cards: 0,
    new_cards: 0,
    learning_cards: 0,
    review_cards: 0,
    average_ease: 2.5,
    average_interval: 0,
  } as DeckStats,
  studyStats: {
    reviews_today: 0,
    new_today: 0,
    streak_days: 0,
    retention_rate: 0,
    total_reviews: 0,
  } as StudyStats,
  calendarData: [] as CalendarData[],
  watchedDirectories: [] as string[],
  importResult: {
    imported: 0,
    deck_path: '',
  } as ImportResult,
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

// Mock functions for Tauri commands
export const mockTauriCommands = {
  // Deck commands
  list_decks: vi.fn(() => Promise.resolve(mockDefaults.decks)),
  get_deck: vi.fn(() => Promise.resolve(mockDefaults.deck)),
  import_file: vi.fn(() => Promise.resolve(mockDefaults.importResult)),
  import_directory: vi.fn(() => Promise.resolve(mockDefaults.importResult)),

  // Study commands
  get_study_queue: vi.fn(() => Promise.resolve(mockDefaults.studyQueue)),
  submit_review: vi.fn(() => Promise.resolve(mockDefaults.reviewResponse)),
  get_card: vi.fn(() => Promise.resolve(mockDefaults.card)),
  get_card_state: vi.fn(() => Promise.resolve(mockDefaults.cardState)),
  compare_typed_answer: vi.fn(() => Promise.resolve(mockDefaults.compareAnswerResponse)),

  // Settings commands
  get_global_settings: vi.fn(() => Promise.resolve(mockDefaults.globalSettings)),
  save_global_settings: vi.fn(() => Promise.resolve()),
  get_deck_settings: vi.fn(() => Promise.resolve(mockDefaults.deckSettings)),
  save_deck_settings: vi.fn(() => Promise.resolve()),
  delete_deck_settings: vi.fn(() => Promise.resolve()),
  get_effective_settings: vi.fn(() => Promise.resolve(mockDefaults.effectiveSettings)),

  // Stats commands
  get_deck_stats: vi.fn(() => Promise.resolve(mockDefaults.deckStats)),
  get_study_stats: vi.fn(() => Promise.resolve(mockDefaults.studyStats)),
  get_calendar_data: vi.fn(() => Promise.resolve(mockDefaults.calendarData)),

  // File watcher commands
  start_watching: vi.fn(() => Promise.resolve()),
  stop_watching: vi.fn(() => Promise.resolve()),
  get_watched_directories: vi.fn(() => Promise.resolve(mockDefaults.watchedDirectories)),
};

// Setup invoke mock to route to correct command mock
export async function setupTauriMock() {
  const { invoke } = vi.mocked(await import('@tauri-apps/api/core'));

  invoke.mockImplementation(((cmd: string) => {
    const mockFn = mockTauriCommands[cmd as keyof typeof mockTauriCommands];
    if (mockFn) {
      return mockFn();
    }
    console.warn(`Unmocked Tauri command: ${cmd}`);
    return Promise.reject(new Error(`Unmocked Tauri command: ${cmd}`));
  }) as typeof invoke);
}

// Helper to reset all mocks to defaults
export function resetTauriMocks() {
  Object.values(mockTauriCommands).forEach((mock) => mock.mockClear());
}
