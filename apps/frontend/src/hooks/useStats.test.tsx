import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDeckStats, useStudyStats, useCalendarData } from './useStats';
import {
  createMockDeckStats,
  createMockStudyStats,
  createMockCalendarData,
} from '../test/factories';
import { mockTauriCommands } from '../test/mocks/tauri';
import { createHookWrapper } from '../test/utils';

describe('useDeckStats', () => {
  it('should fetch deck stats for a specific deck', async () => {
    const mockStats = createMockDeckStats({ total_cards: 50 });
    mockTauriCommands.get_deck_stats.mockResolvedValue(mockStats);

    const { wrapper } = createHookWrapper();
    const { result } = renderHook(() => useDeckStats('/decks/test'), {
      wrapper,
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockStats);
    expect(mockTauriCommands.get_deck_stats).toHaveBeenCalledWith({ deckPath: '/decks/test' });
  });

  it('should fetch global stats when no deck path provided', async () => {
    const mockStats = createMockDeckStats({ total_cards: 100 });
    mockTauriCommands.get_deck_stats.mockResolvedValue(mockStats);

    const { wrapper } = createHookWrapper();
    const { result } = renderHook(() => useDeckStats(), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockStats);
    expect(mockTauriCommands.get_deck_stats).toHaveBeenCalledWith({ deckPath: undefined });
  });

  it('should handle errors', async () => {
    const error = new Error('Failed to fetch stats');
    mockTauriCommands.get_deck_stats.mockRejectedValue(error);

    const { wrapper } = createHookWrapper();
    const { result } = renderHook(() => useDeckStats('/decks/test'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(error);
  });
});

describe('useStudyStats', () => {
  it('should fetch study stats', async () => {
    const mockStats = createMockStudyStats({ streak_days: 10 });
    mockTauriCommands.get_study_stats.mockResolvedValue(mockStats);

    const { wrapper } = createHookWrapper();
    const { result } = renderHook(() => useStudyStats(), {
      wrapper,
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockStats);
    expect(mockTauriCommands.get_study_stats).toHaveBeenCalled();
  });

  it('should handle errors', async () => {
    const error = new Error('Failed to fetch study stats');
    mockTauriCommands.get_study_stats.mockRejectedValue(error);

    const { wrapper } = createHookWrapper();
    const { result } = renderHook(() => useStudyStats(), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(error);
  });
});

describe('useCalendarData', () => {
  it('should fetch calendar data with default 90 days', async () => {
    const mockData = createMockCalendarData(90);
    mockTauriCommands.get_calendar_data.mockResolvedValue(mockData);

    const { wrapper } = createHookWrapper();
    const { result } = renderHook(() => useCalendarData(), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(mockTauriCommands.get_calendar_data).toHaveBeenCalledWith({ days: 90 });
  });

  it('should fetch calendar data with custom days', async () => {
    const mockData = createMockCalendarData(30);
    mockTauriCommands.get_calendar_data.mockResolvedValue(mockData);

    const { wrapper } = createHookWrapper();
    const { result } = renderHook(() => useCalendarData(30), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockTauriCommands.get_calendar_data).toHaveBeenCalledWith({ days: 30 });
  });

  it('should handle errors', async () => {
    const error = new Error('Failed to fetch calendar data');
    mockTauriCommands.get_calendar_data.mockRejectedValue(error);

    const { wrapper } = createHookWrapper();
    const { result } = renderHook(() => useCalendarData(), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(error);
  });
});
