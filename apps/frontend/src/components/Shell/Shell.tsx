import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../../stores/appStore';
import { useToastStore } from '../../stores/toastStore';
import { useWatcherEvents } from '../../hooks/useWatcherEvents';
import { tauri } from '../../lib/tauri';
import { DeckSurface } from '../Surface/DeckSurface';
import { StudyOverlay } from '../Study/StudyOverlay';
import { BrowseOverlay } from '../Browse/BrowseOverlay';
import { CommandPalette } from '../CommandPalette/CommandPalette';
import { Modal } from '../Modal/Modal';
import { ConfirmDialog } from '../Modal/ConfirmDialog';
import { ToastContainer } from '../Notifications/Toast';
import { Settings } from '../../pages/Settings';
import { Stats } from '../../pages/Stats';
import styles from './Shell.module.css';

export function Shell() {
  useWatcherEvents();
  const queryClient = useQueryClient();

  const view = useAppStore((s) => s.view);
  const activeDeckPath = useAppStore((s) => s.activeDeckPath);
  const exitOverlay = useAppStore((s) => s.exitOverlay);
  const openPalette = useAppStore((s) => s.openPalette);
  const closePalette = useAppStore((s) => s.closePalette);
  const paletteOpen = useAppStore((s) => s.paletteOpen);
  const removeDeckTarget = useAppStore((s) => s.removeDeckTarget);
  const clearRemoveDeck = useAppStore((s) => s.clearRemoveDeck);

  const toasts = useToastStore((s) => s.toasts);
  const autoDismissMs = useToastStore((s) => s.autoDismissMs);
  const dismissToast = useToastStore((s) => s.dismiss);
  const removeToast = useToastStore((s) => s.remove);
  const showToast = useToastStore((s) => s.show);

  const handleConfirmRemove = async () => {
    if (!removeDeckTarget) return;
    const target = removeDeckTarget;
    clearRemoveDeck();
    try {
      const result = await tauri.removeDeck(target.path);
      queryClient.invalidateQueries({ queryKey: ['decks'] });
      showToast(`Removed ${target.name} (${result.cards_removed} cards)`, 'info');
    } catch {
      showToast(`Failed to remove ${target.name}`, 'warning');
    }
  };

  // Global Cmd+K handler
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (paletteOpen) {
          closePalette();
        } else {
          openPalette();
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [paletteOpen, openPalette, closePalette]);

  return (
    <div className={styles.shell}>
      <DeckSurface hidden={view !== 'surface'} />

      {view === 'study' && activeDeckPath && (
        <StudyOverlay deckPath={activeDeckPath} onExit={exitOverlay} />
      )}

      {view === 'browse' && activeDeckPath && (
        <BrowseOverlay deckPath={activeDeckPath} onExit={exitOverlay} />
      )}

      {view === 'settings' && (
        <Modal onClose={exitOverlay}>
          <Settings />
        </Modal>
      )}

      {view === 'stats' && (
        <Modal onClose={exitOverlay}>
          <Stats deckPath={activeDeckPath ?? undefined} />
        </Modal>
      )}

      <CommandPalette />

      {removeDeckTarget && (
        <ConfirmDialog
          title="Remove deck"
          message={`Remove "${removeDeckTarget.name}" from the app? The markdown file will stay on disk, but all learning history will be lost.`}
          confirmLabel="Remove"
          variant="danger"
          onConfirm={handleConfirmRemove}
          onCancel={clearRemoveDeck}
        />
      )}

      <ToastContainer
        toasts={toasts}
        onDismiss={dismissToast}
        onRemove={removeToast}
        autoDismissMs={autoDismissMs}
      />

      <div className={styles.dragRegion} data-tauri-drag-region />
    </div>
  );
}
