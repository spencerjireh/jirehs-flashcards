import { useQuery } from '@tanstack/react-query';
import { tauri } from '../lib/tauri';

export function useDeckStats(deckPath?: string) {
  return useQuery({
    queryKey: ['deck-stats', deckPath],
    queryFn: () => tauri.getDeckStats(deckPath),
  });
}

export function useStudyStats() {
  return useQuery({
    queryKey: ['study-stats'],
    queryFn: tauri.getStudyStats,
  });
}

export function useCalendarData(days = 90) {
  return useQuery({
    queryKey: ['calendar-data', days],
    queryFn: () => tauri.getCalendarData(days),
  });
}
