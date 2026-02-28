import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useSettings, useDeckSettings, useEffectiveSettings } from './useSettings';
import {
  createMockGlobalSettings,
  createMockDeckSettings,
  createMockEffectiveSettings,
} from '../test/factories';
import { mockTauriCommands } from '../test/mocks/tauri';
import { createHookWrapper } from '../test/utils';

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

  it('should return isSaving state', async () => {
    const mockSettings = createMockGlobalSettings();
    mockTauriCommands.get_global_settings.mockResolvedValue(mockSettings);

    const { wrapper } = createHookWrapper();
    const { result } = renderHook(() => useSettings(), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isSaving).toBe(false);
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

  it('should return save and delete functions', async () => {
    mockTauriCommands.get_deck_settings.mockResolvedValue(null);

    const { wrapper } = createHookWrapper();
    const { result } = renderHook(() => useDeckSettings('/decks/test'), {
      wrapper,
    });

    expect(typeof result.current.save).toBe('function');
    expect(typeof result.current.delete).toBe('function');
    expect(typeof result.current.saveAsync).toBe('function');
    expect(typeof result.current.deleteAsync).toBe('function');
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
