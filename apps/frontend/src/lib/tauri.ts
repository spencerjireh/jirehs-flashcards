import { invoke } from '@tauri-apps/api/core';
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
  ReviewRequest,
  ReviewResponse,
  StudyQueue,
  StudyStats,
} from '@jirehs-flashcards/shared-types';

export const tauri = {
  // Deck commands
  listDecks: () => invoke<Deck[]>('list_decks'),
  getDeck: (deckPath: string) => invoke<Deck | null>('get_deck', { deckPath }),
  importFile: (filePath: string) => invoke<ImportResult>('import_file', { filePath }),
  importDirectory: (dirPath: string) => invoke<ImportResult>('import_directory', { dirPath }),

  // Study commands
  getStudyQueue: (deckPath?: string) => invoke<StudyQueue>('get_study_queue', { deckPath }),
  submitReview: (request: ReviewRequest) => invoke<ReviewResponse>('submit_review', { request }),
  getCard: (cardId: number) => invoke<Card | null>('get_card', { cardId }),
  getCardState: (cardId: number) => invoke<CardState | null>('get_card_state', { cardId }),
  compareTypedAnswer: (typedAnswer: string, correctAnswer: string, deckPath?: string) =>
    invoke<CompareAnswerResponse>('compare_typed_answer', { typedAnswer, correctAnswer, deckPath }),

  // Settings commands
  getGlobalSettings: () => invoke<GlobalSettings>('get_global_settings'),
  saveGlobalSettings: (settings: GlobalSettings) =>
    invoke<void>('save_global_settings', { settings }),
  getDeckSettings: (deckPath: string) =>
    invoke<DeckSettings | null>('get_deck_settings', { deckPath }),
  saveDeckSettings: (settings: DeckSettings) =>
    invoke<void>('save_deck_settings', { settings }),
  deleteDeckSettings: (deckPath: string) =>
    invoke<void>('delete_deck_settings', { deckPath }),
  getEffectiveSettings: (deckPath?: string) =>
    invoke<EffectiveSettings>('get_effective_settings', { deckPath }),

  // Stats commands
  getDeckStats: (deckPath?: string) =>
    invoke<DeckStats>('get_deck_stats', { deckPath }),
  getStudyStats: () => invoke<StudyStats>('get_study_stats'),
  getCalendarData: (days?: number) =>
    invoke<CalendarData[]>('get_calendar_data', { days }),

  // File watcher commands
  startWatching: (dirPath: string) => invoke<void>('start_watching', { dirPath }),
  stopWatching: (dirPath: string) => invoke<void>('stop_watching', { dirPath }),
  getWatchedDirectories: () => invoke<string[]>('get_watched_directories'),
};
