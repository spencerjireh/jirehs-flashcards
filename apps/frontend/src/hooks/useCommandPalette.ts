import { useState, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { tauri } from '../lib/tauri';
import { useAppStore } from '../stores/appStore';
import { useToastStore } from '../stores/toastStore';

function formatImportToast(deckPath: string, added: number, removed: number): string {
  const parts: string[] = [];
  if (added > 0) parts.push(`${added} added`);
  if (removed > 0) parts.push(`${removed} removed`);
  if (parts.length === 0) return `${deckPath}: up to date`;
  return `${deckPath}: ${parts.join(', ')}`;
}

export interface PaletteCommand {
  id: string;
  label: string;
  category: 'action' | 'deck-study' | 'deck-browse' | 'deck-remove';
  keywords: string[];
  action: () => void;
}

export function useCommandPalette() {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const queryClient = useQueryClient();

  const enterStudy = useAppStore((s) => s.enterStudy);
  const enterBrowse = useAppStore((s) => s.enterBrowse);
  const showSettings = useAppStore((s) => s.showSettings);
  const showStats = useAppStore((s) => s.showStats);
  const closePalette = useAppStore((s) => s.closePalette);
  const requestRemoveDeck = useAppStore((s) => s.requestRemoveDeck);
  const showToast = useToastStore((s) => s.show);

  const { data: decks } = useQuery({
    queryKey: ['decks'],
    queryFn: tauri.listDecks,
  });

  const commands = useMemo<PaletteCommand[]>(() => {
    const cmds: PaletteCommand[] = [
      {
        id: 'import-dir',
        label: 'Import Directory...',
        category: 'action',
        keywords: ['import', 'folder', 'directory', 'add', 'watch'],
        action: async () => {
          closePalette();
          const { open } = await import('@tauri-apps/plugin-dialog');
          const selected = await open({ directory: true });
          if (selected) {
            const result = await tauri.importDirectory(selected);
            queryClient.invalidateQueries({ queryKey: ['decks'] });
            showToast(formatImportToast(result.deck_path, result.added, result.removed), 'success');
          }
        },
      },
      {
        id: 'import-file',
        label: 'Import File...',
        category: 'action',
        keywords: ['import', 'file', 'add', 'markdown'],
        action: async () => {
          closePalette();
          const { open } = await import('@tauri-apps/plugin-dialog');
          const selected = await open({
            filters: [{ name: 'Markdown', extensions: ['md'] }],
          });
          if (selected) {
            const result = await tauri.importFile(selected);
            queryClient.invalidateQueries({ queryKey: ['decks'] });
            showToast(formatImportToast(result.deck_path, result.added, result.removed), 'success');
          }
        },
      },
      {
        id: 'settings',
        label: 'Settings',
        category: 'action',
        keywords: ['settings', 'preferences', 'config', 'options'],
        action: () => {
          closePalette();
          showSettings();
        },
      },
      {
        id: 'stats',
        label: 'Statistics',
        category: 'action',
        keywords: ['statistics', 'stats', 'performance', 'history'],
        action: () => {
          closePalette();
          showStats();
        },
      },
    ];

    if (decks) {
      for (const deck of decks) {
        cmds.push({
          id: `study-${deck.path}`,
          label: `Study: ${deck.name}`,
          category: 'deck-study',
          keywords: ['study', deck.name.toLowerCase(), deck.path.toLowerCase()],
          action: () => {
            closePalette();
            enterStudy(deck.path);
          },
        });
        cmds.push({
          id: `browse-${deck.path}`,
          label: `Browse: ${deck.name}`,
          category: 'deck-browse',
          keywords: ['browse', 'view', deck.name.toLowerCase(), deck.path.toLowerCase()],
          action: () => {
            closePalette();
            enterBrowse(deck.path);
          },
        });
        cmds.push({
          id: `remove-${deck.path}`,
          label: `Remove: ${deck.name}`,
          category: 'deck-remove',
          keywords: ['remove', 'delete', deck.name.toLowerCase(), deck.path.toLowerCase()],
          action: () => {
            closePalette();
            requestRemoveDeck(deck);
          },
        });
      }
    }

    return cmds;
  }, [decks, closePalette, enterStudy, enterBrowse, requestRemoveDeck, showSettings, showStats, showToast, queryClient]);

  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(q) ||
        cmd.keywords.some((kw) => kw.includes(q))
    );
  }, [commands, query]);

  const execute = useCallback(
    (index: number) => {
      const cmd = filtered[index];
      if (cmd) cmd.action();
    },
    [filtered]
  );

  const moveSelection = useCallback(
    (delta: number) => {
      setSelectedIndex((prev) => {
        const next = prev + delta;
        if (next < 0) return filtered.length - 1;
        if (next >= filtered.length) return 0;
        return next;
      });
    },
    [filtered.length]
  );

  const resetQuery = useCallback(() => {
    setQuery('');
    setSelectedIndex(0);
  }, []);

  return {
    query,
    setQuery: (q: string) => {
      setQuery(q);
      setSelectedIndex(0);
    },
    filtered,
    selectedIndex,
    setSelectedIndex,
    moveSelection,
    execute,
    resetQuery,
  };
}
