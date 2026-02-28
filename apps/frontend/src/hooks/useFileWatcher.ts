import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import { tauri } from '../lib/tauri';
import type { Toast } from '../components/Notifications/Toast';

interface FileChangeEvent {
  path: string;
  kind: string;
}

interface DeckRefreshEvent {
  deck_path: string;
}

export function useFileWatcher() {
  const queryClient = useQueryClient();
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Query for watched directories
  const { data: watchedDirectories = [], refetch: refetchWatched } = useQuery({
    queryKey: ['watched-directories'],
    queryFn: tauri.getWatchedDirectories,
  });

  // Mutation to start watching a directory
  const startWatching = useMutation({
    mutationFn: tauri.startWatching,
    onSuccess: () => {
      refetchWatched();
      addToast('Directory is now being watched', 'success');
    },
    onError: (error: Error) => {
      addToast(`Failed to watch directory: ${error.message}`, 'warning');
    },
  });

  // Mutation to stop watching a directory
  const stopWatching = useMutation({
    mutationFn: tauri.stopWatching,
    onSuccess: () => {
      refetchWatched();
      addToast('Stopped watching directory', 'info');
    },
    onError: (error: Error) => {
      addToast(`Failed to stop watching: ${error.message}`, 'warning');
    },
  });

  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  // Dismiss a toast
  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Listen to file change events
  useEffect(() => {
    let unlistenFile: (() => void) | undefined;
    let unlistenDeck: (() => void) | undefined;

    const setupListeners = async () => {
      unlistenFile = await listen<FileChangeEvent>('file-changed', (event) => {
        const { path, kind } = event.payload;
        addToast(`File ${kind}: ${path.split('/').pop()}`, 'info');
      });

      unlistenDeck = await listen<DeckRefreshEvent>('deck-updated', (event) => {
        const { deck_path } = event.payload;
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ['decks'] });
        queryClient.invalidateQueries({ queryKey: ['deck', deck_path] });
        queryClient.invalidateQueries({ queryKey: ['study-queue', deck_path] });
        queryClient.invalidateQueries({ queryKey: ['deck-stats', deck_path] });
        addToast(`Deck updated: ${deck_path}`, 'success');
      });
    };

    setupListeners();

    return () => {
      unlistenFile?.();
      unlistenDeck?.();
    };
  }, [queryClient, addToast]);

  return {
    watchedDirectories,
    startWatching: startWatching.mutate,
    stopWatching: stopWatching.mutate,
    isStartingWatch: startWatching.isPending,
    isStoppingWatch: stopWatching.isPending,
    toasts,
    dismissToast,
  };
}
