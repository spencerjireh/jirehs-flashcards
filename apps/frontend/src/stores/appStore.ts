import { create } from 'zustand';
import type { Deck } from '@jirehs-flashcards/shared-types';

export type AppView = 'surface' | 'study' | 'browse' | 'settings' | 'stats';

interface AppState {
  view: AppView;
  activeDeckPath: string | null;
  paletteOpen: boolean;
  removeDeckTarget: Deck | null;

  enterStudy: (deckPath: string) => void;
  enterBrowse: (deckPath: string) => void;
  showSettings: () => void;
  showStats: (deckPath?: string) => void;
  exitOverlay: () => void;
  openPalette: () => void;
  closePalette: () => void;
  requestRemoveDeck: (deck: Deck) => void;
  clearRemoveDeck: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  view: 'surface',
  activeDeckPath: null,
  paletteOpen: false,
  removeDeckTarget: null,

  enterStudy: (deckPath) => set({ view: 'study', activeDeckPath: deckPath }),
  enterBrowse: (deckPath) => set({ view: 'browse', activeDeckPath: deckPath }),
  showSettings: () => set({ view: 'settings', activeDeckPath: null }),
  showStats: (deckPath) => set({ view: 'stats', activeDeckPath: deckPath ?? null }),
  exitOverlay: () => set({ view: 'surface', activeDeckPath: null }),
  openPalette: () => set({ paletteOpen: true }),
  closePalette: () => set({ paletteOpen: false }),
  requestRemoveDeck: (deck) => set({ removeDeckTarget: deck }),
  clearRemoveDeck: () => set({ removeDeckTarget: null }),
}));
