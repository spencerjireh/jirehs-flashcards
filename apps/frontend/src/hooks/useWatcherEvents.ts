import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useQueryClient } from '@tanstack/react-query';

interface DeckRefreshEvent {
  deck_path: string;
}

export function useWatcherEvents() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setup = async () => {
      unlisten = await listen<DeckRefreshEvent>('deck-updated', (event) => {
        const { deck_path } = event.payload;
        queryClient.invalidateQueries({ queryKey: ['decks'] });
        queryClient.invalidateQueries({ queryKey: ['deck', deck_path] });
        queryClient.invalidateQueries({ queryKey: ['study-queue', deck_path] });
        queryClient.invalidateQueries({ queryKey: ['deck-stats', deck_path] });
      });
    };

    setup();

    return () => {
      unlisten?.();
    };
  }, [queryClient]);
}
