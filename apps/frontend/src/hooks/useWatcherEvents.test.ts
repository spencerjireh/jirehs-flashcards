import { describe, it, expect, vi } from 'vitest';
import { listen } from '@tauri-apps/api/event';
import { renderHook, waitFor, createHookWrapper } from '../test/utils';
import { useWatcherEvents } from './useWatcherEvents';

describe('useWatcherEvents', () => {
  it('should listen for deck-updated events', async () => {
    const { wrapper } = createHookWrapper();
    renderHook(() => useWatcherEvents(), { wrapper });

    await waitFor(() => {
      expect(listen).toHaveBeenCalledWith('deck-updated', expect.any(Function));
    });
  });

  it('should invalidate queries on deck-updated event', async () => {
    let capturedHandler: ((event: unknown) => void) | undefined;
    vi.mocked(listen).mockImplementation(async (event, handler) => {
      if (event === 'deck-updated') {
        capturedHandler = handler as (event: unknown) => void;
      }
      return () => {};
    });

    const { wrapper, queryClient } = createHookWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    renderHook(() => useWatcherEvents(), { wrapper });

    await waitFor(() => {
      expect(capturedHandler).toBeDefined();
    });

    capturedHandler!({ payload: { deck_path: 'test-deck' } });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['decks'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['deck', 'test-deck'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['study-queue', 'test-deck'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['deck-stats', 'test-deck'] });
  });

  it('should clean up listener on unmount', async () => {
    const unlistenFn = vi.fn();
    vi.mocked(listen).mockResolvedValue(unlistenFn);

    const { wrapper } = createHookWrapper();
    const { unmount } = renderHook(() => useWatcherEvents(), { wrapper });

    await waitFor(() => {
      expect(listen).toHaveBeenCalled();
    });

    unmount();

    expect(unlistenFn).toHaveBeenCalled();
  });
});
