import { useState, useEffect, useCallback } from 'react';
import { Book, Eye, Trash } from 'iconoir-react';
import type { Deck } from '@jirehs-flashcards/shared-types';
import { useAppStore } from '../../stores/appStore';
import styles from './DeckStack.module.css';

interface DeckStackProps {
  deck: Deck;
  position: { x: number; y: number };
}

interface ContextMenuState {
  x: number;
  y: number;
}

export function DeckStack({ deck, position }: DeckStackProps) {
  const enterStudy = useAppStore((s) => s.enterStudy);
  const enterBrowse = useAppStore((s) => s.enterBrowse);
  const requestRemoveDeck = useAppStore((s) => s.requestRemoveDeck);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const isDue = deck.due_count > 0;
  const layerCount = Math.min(Math.floor(deck.card_count / 15) + 1, 4);
  const layers = Math.min(layerCount, 3);

  const handleClick = useCallback(() => {
    if (!contextMenu) {
      enterStudy(deck.path);
    }
  }, [contextMenu, enterStudy, deck.path]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  // Close context menu on click-away or Escape
  useEffect(() => {
    if (!contextMenu) return;

    function handleClose() {
      setContextMenu(null);
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setContextMenu(null);
    }

    // Delay attaching to avoid the same click closing it
    const timer = setTimeout(() => {
      window.addEventListener('click', handleClose);
      window.addEventListener('keydown', handleKeyDown);
    }, 0);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('click', handleClose);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [contextMenu]);

  return (
    <>
      <div
        data-stack
        className={`${styles.stack} ${isDue ? styles.due : ''}`}
        style={{ left: position.x, top: position.y }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        <div className={styles.body}>
          {Array.from({ length: layers }, (_, i) => (
            <div key={i} className={styles.layer} />
          ))}
          <div className={styles.top}>
            <div className={styles.name}>{deck.name}</div>
            <div className={styles.meta}>
              <span className={styles.count}>{deck.card_count} cards</span>
              {isDue && (
                <span className={styles.dueBadge}>{deck.due_count} due</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {contextMenu && (
        <div
          className={styles.contextMenu}
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className={styles.contextItem}
            onClick={() => {
              setContextMenu(null);
              enterStudy(deck.path);
            }}
          >
            <Book width={16} height={16} /> Study
          </button>
          <button
            type="button"
            className={styles.contextItem}
            onClick={() => {
              setContextMenu(null);
              enterBrowse(deck.path);
            }}
          >
            <Eye width={16} height={16} /> Browse
          </button>
          <div className={styles.contextDivider} />
          <button
            type="button"
            className={`${styles.contextItem} ${styles.contextItemDanger}`}
            onClick={() => {
              setContextMenu(null);
              requestRemoveDeck(deck);
            }}
          >
            <Trash width={16} height={16} /> Remove
          </button>
        </div>
      )}
    </>
  );
}
