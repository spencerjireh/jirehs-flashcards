import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useQueryClient } from '@tanstack/react-query';
import type { ImportSyncEvent } from '@jirehs-flashcards/shared-types';
import { useToastStore } from '../stores/toastStore';

interface DeckRefreshEvent {
  deck_path: string;
}

export function useWatcherEvents() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unlisteners: (() => void)[] = [];

    const setup = async () => {
      const u1 = await listen<DeckRefreshEvent>('deck-updated', (event) => {
        const { deck_path } = event.payload;
        queryClient.invalidateQueries({ queryKey: ['decks'] });
        queryClient.invalidateQueries({ queryKey: ['deck', deck_path] });
        queryClient.invalidateQueries({ queryKey: ['study-queue', deck_path] });
        queryClient.invalidateQueries({ queryKey: ['deck-stats', deck_path] });
      });
      unlisteners.push(u1);

      const u2 = await listen<ImportSyncEvent>('import-sync', (event) => {
        const { deck_path, added, removed } = event.payload;
        const parts: string[] = [];
        if (added > 0) parts.push(`${added} added`);
        if (removed > 0) parts.push(`${removed} removed`);
        if (parts.length > 0) {
          useToastStore.getState().show(`${deck_path}: ${parts.join(', ')}`, 'info');
        }
      });
      unlisteners.push(u2);
    };

    setup();

    return () => {
      for (const unlisten of unlisteners) {
        unlisten();
      }
    };
  }, [queryClient]);
}
