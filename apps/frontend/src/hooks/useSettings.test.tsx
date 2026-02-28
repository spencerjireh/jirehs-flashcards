import { describe, it, expect } from 'vitest';
import { renderHook, waitFor, act, createHookWrapper } from '../test/utils';
import { useSettings, useDeckSettings, useEffectiveSettings } from './useSettings';
import {
  createMockGlobalSettings,
  createMockDeckSettings,
  createMockEffectiveSettings,
} from '../test/factories';
import { mockTauriCommands } from '../test/mocks/tauri';

describe('useSettings', () => {
  it('should fetch global settings on mount', async () => {
    const mockSettings = createMockGlobalSettings({ new_cards_per_day: 30 });
    mockTauriCommands.get_global_settings.mockResolvedValue(mockSettings);

    const { wrapper } = createHookWrapper();
    const { result } = renderHook(() => useSettings(), {
      wrapper,
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.settings).toEqual(mockSettings);
    expect(mockTauriCommands.get_global_settings).toHaveBeenCalled();
  });

  it('should return loading state while fetching', () => {
    mockTauriCommands.get_global_settings.mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const { wrapper } = createHookWrapper();
    const { result } = renderHook(() => useSettings(), {
      wrapper,
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.settings).toBeUndefined();
  });

  it('should handle save errors', async () => {
    const mockSettings = createMockGlobalSettings();
    mockTauriCommands.get_global_settings.mockResolvedValue(mockSettings);
    mockTauriCommands.save_global_settings.mockRejectedValue(new Error('Save failed'));

    const { wrapper } = createHookWrapper();
    const { result } = renderHook(() => useSettings(), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      result.current.save(mockSettings);
    });

    await waitFor(() => {
      expect(result.current.saveError).toBeDefined();
    });

    expect(result.current.saveError?.message).toBe('Save failed');
  });

  it('should save settings successfully', async () => {
    const mockSettings = createMockGlobalSettings();
    mockTauriCommands.get_global_settings.mockResolvedValue(mockSettings);
    mockTauriCommands.save_global_settings.mockResolvedValue(undefined);

    const { wrapper } = createHookWrapper();
    const { result } = renderHook(() => useSettings(), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const updated = createMockGlobalSettings({ new_cards_per_day: 50 });

    await act(async () => {
      result.current.save(updated);
    });

    await waitFor(() => {
      expect(result.current.isSaving).toBe(false);
    });

    expect(mockTauriCommands.save_global_settings).toHaveBeenCalledWith({ settings: updated });
    expect(result.current.saveError).toBeNull();
  });

  it('should handle fetch error', async () => {
    mockTauriCommands.get_global_settings.mockRejectedValue(new Error('Load failed'));

    const { wrapper } = createHookWrapper();
    const { result } = renderHook(() => useSettings(), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error?.message).toBe('Load failed');
  });
});

describe('useDeckSettings', () => {
  it('should fetch deck settings when deckPath provided', async () => {
    const mockSettings = createMockDeckSettings({ algorithm: 'fsrs' });
    mockTauriCommands.get_deck_settings.mockResolvedValue(mockSettings);

    const { wrapper } = createHookWrapper();
    const { result } = renderHook(() => useDeckSettings('/decks/test'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.settings).toEqual(mockSettings);
    expect(mockTauriCommands.get_deck_settings).toHaveBeenCalledWith({ deckPath: '/decks/test' });
  });

  it('should not fetch when deckPath is empty', () => {
    const { wrapper } = createHookWrapper();
    const { result } = renderHook(() => useDeckSettings(''), {
      wrapper,
    });

    expect(mockTauriCommands.get_deck_settings).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });

  it('should delete deck settings', async () => {
    const mockSettings = createMockDeckSettings();
    mockTauriCommands.get_deck_settings.mockResolvedValue(mockSettings);
    mockTauriCommands.delete_deck_settings.mockResolvedValue(undefined);

    const { wrapper } = createHookWrapper();
    const { result } = renderHook(() => useDeckSettings('/decks/test'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      result.current.delete();
    });

    await waitFor(() => {
      expect(result.current.isDeleting).toBe(false);
    });

    expect(mockTauriCommands.delete_deck_settings).toHaveBeenCalledWith({ deckPath: '/decks/test' });
  });

});

describe('useEffectiveSettings', () => {
  it('should fetch effective settings without deck path', async () => {
    const mockSettings = createMockEffectiveSettings();
    mockTauriCommands.get_effective_settings.mockResolvedValue(mockSettings);

    const { wrapper } = createHookWrapper();
    const { result } = renderHook(() => useEffectiveSettings(), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockSettings);
    expect(mockTauriCommands.get_effective_settings).toHaveBeenCalledWith({ deckPath: undefined });
  });

  it('should fetch effective settings with deck path', async () => {
    const mockSettings = createMockEffectiveSettings({ algorithm: 'fsrs' });
    mockTauriCommands.get_effective_settings.mockResolvedValue(mockSettings);

    const { wrapper } = createHookWrapper();
    const { result } = renderHook(() => useEffectiveSettings('/decks/test'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockSettings);
    expect(mockTauriCommands.get_effective_settings).toHaveBeenCalledWith({ deckPath: '/decks/test' });
  });
});
