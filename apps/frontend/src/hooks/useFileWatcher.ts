import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tauri } from '../lib/tauri';

export function useFileWatcher() {
  const queryClient = useQueryClient();

  const { data: watchedDirectories = [], refetch: refetchWatched } = useQuery({
    queryKey: ['watched-directories'],
    queryFn: tauri.getWatchedDirectories,
  });

  const startWatching = useMutation({
    mutationFn: tauri.startWatching,
    onSuccess: () => {
      refetchWatched();
    },
  });

  const stopWatching = useMutation({
    mutationFn: tauri.stopWatching,
    onSuccess: () => {
      refetchWatched();
    },
  });

  const refreshAll = useMutation({
    mutationFn: tauri.refreshWatchedDirectories,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decks'] });
    },
  });

  return {
    watchedDirectories,
    startWatching: startWatching.mutate,
    stopWatching: stopWatching.mutate,
    refreshAll: refreshAll.mutate,
    isStartingWatch: startWatching.isPending,
    isStoppingWatch: stopWatching.isPending,
    isRefreshing: refreshAll.isPending,
    startError: startWatching.error,
    stopError: stopWatching.error,
    refreshError: refreshAll.error,
  };
}
