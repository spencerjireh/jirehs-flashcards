import { describe, it, expect } from 'vitest';
import { renderHook, waitFor, act, createHookWrapper } from '../test/utils';
import { useFileWatcher } from './useFileWatcher';
import { mockTauriCommands } from '../test/mocks/tauri';

describe('useFileWatcher', () => {
  it('should fetch watched directories', async () => {
    mockTauriCommands.get_watched_directories.mockResolvedValue([
      '/path/to/dir1',
      '/path/to/dir2',
    ]);

    const { wrapper } = createHookWrapper();
    const { result } = renderHook(() => useFileWatcher(), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.watchedDirectories).toEqual([
        '/path/to/dir1',
        '/path/to/dir2',
      ]);
    });

    expect(mockTauriCommands.get_watched_directories).toHaveBeenCalled();
  });

  it('should start watching a directory', async () => {
    mockTauriCommands.get_watched_directories.mockResolvedValue([]);
    mockTauriCommands.start_watching.mockResolvedValue(undefined);

    const { wrapper } = createHookWrapper();
    const { result } = renderHook(() => useFileWatcher(), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isStartingWatch).toBe(false);
    });

    await act(async () => {
      result.current.startWatching('/new/path');
    });

    await waitFor(() => {
      expect(result.current.isStartingWatch).toBe(false);
    });

    expect(mockTauriCommands.start_watching).toHaveBeenCalledWith({ dirPath: '/new/path' });
  });

  it('should stop watching a directory', async () => {
    mockTauriCommands.get_watched_directories.mockResolvedValue(['/path/to/dir']);
    mockTauriCommands.stop_watching.mockResolvedValue(undefined);

    const { wrapper } = createHookWrapper();
    const { result } = renderHook(() => useFileWatcher(), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.watchedDirectories).toHaveLength(1);
    });

    await act(async () => {
      result.current.stopWatching('/path/to/dir');
    });

    await waitFor(() => {
      expect(result.current.isStoppingWatch).toBe(false);
    });

    expect(mockTauriCommands.stop_watching).toHaveBeenCalledWith({ dirPath: '/path/to/dir' });
  });

  it('should return empty directories initially before fetch', () => {
    mockTauriCommands.get_watched_directories.mockImplementation(
      () => new Promise(() => {})
    );

    const { wrapper } = createHookWrapper();
    const { result } = renderHook(() => useFileWatcher(), {
      wrapper,
    });

    expect(result.current.watchedDirectories).toEqual([]);
  });

  it('should show toast on start watching error', async () => {
    mockTauriCommands.get_watched_directories.mockResolvedValue([]);
    mockTauriCommands.start_watching.mockRejectedValue(new Error('Permission denied'));

    const { wrapper } = createHookWrapper();
    const { result } = renderHook(() => useFileWatcher(), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isStartingWatch).toBe(false);
    });

    await act(async () => {
      result.current.startWatching('/restricted/path');
    });

    await waitFor(() => {
      expect(result.current.isStartingWatch).toBe(false);
    });

    expect(result.current.toasts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: 'Failed to watch directory: Permission denied',
          type: 'warning',
        }),
      ])
    );
  });

  it('should show toast on stop watching error', async () => {
    mockTauriCommands.get_watched_directories.mockResolvedValue(['/some/dir']);
    mockTauriCommands.stop_watching.mockRejectedValue(new Error('Not found'));

    const { wrapper } = createHookWrapper();
    const { result } = renderHook(() => useFileWatcher(), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.watchedDirectories).toHaveLength(1);
    });

    await act(async () => {
      result.current.stopWatching('/some/dir');
    });

    await waitFor(() => {
      expect(result.current.isStoppingWatch).toBe(false);
    });

    expect(result.current.toasts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: 'Failed to stop watching: Not found',
          type: 'warning',
        }),
      ])
    );
  });

  it('should show success toast after starting watch', async () => {
    mockTauriCommands.get_watched_directories.mockResolvedValue([]);
    mockTauriCommands.start_watching.mockResolvedValue(undefined);

    const { wrapper } = createHookWrapper();
    const { result } = renderHook(() => useFileWatcher(), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isStartingWatch).toBe(false);
    });

    await act(async () => {
      result.current.startWatching('/new/dir');
    });

    await waitFor(() => {
      expect(result.current.toasts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Directory is now being watched',
            type: 'success',
          }),
        ])
      );
    });
  });

  it('should dismiss toast by id', async () => {
    mockTauriCommands.get_watched_directories.mockResolvedValue([]);
    mockTauriCommands.start_watching.mockResolvedValue(undefined);

    const { wrapper } = createHookWrapper();
    const { result } = renderHook(() => useFileWatcher(), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isStartingWatch).toBe(false);
    });

    // Trigger a toast
    await act(async () => {
      result.current.startWatching('/new/dir');
    });

    await waitFor(() => {
      expect(result.current.toasts).toHaveLength(1);
    });

    const toastId = result.current.toasts[0].id;

    act(() => {
      result.current.dismissToast(toastId);
    });

    expect(result.current.toasts).toHaveLength(0);
  });
});
