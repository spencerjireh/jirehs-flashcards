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

  it('should refresh all watched directories', async () => {
    mockTauriCommands.get_watched_directories.mockResolvedValue(['/some/dir']);
    mockTauriCommands.refresh_watched_directories.mockResolvedValue(undefined);

    const { wrapper } = createHookWrapper();
    const { result } = renderHook(() => useFileWatcher(), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isRefreshing).toBe(false);
    });

    await act(async () => {
      result.current.refreshAll();
    });

    await waitFor(() => {
      expect(result.current.isRefreshing).toBe(false);
    });

    expect(mockTauriCommands.refresh_watched_directories).toHaveBeenCalled();
  });
});
