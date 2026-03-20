import { useMemo, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tauri } from '../../lib/tauri';
import { useAppStore } from '../../stores/appStore';
import { usePannable } from '../../hooks/usePannable';
import { DeckStack } from './DeckStack';
import styles from './DeckSurface.module.css';

interface DeckSurfaceProps {
  hidden?: boolean;
}

/**
 * Deterministic layout: arrange decks in rows with some vertical jitter
 * for a natural, non-grid feel.
 */
function computePositions(count: number): Array<{ x: number; y: number }> {
  const positions: Array<{ x: number; y: number }> = [];
  const colSpacing = 280;
  const rowSpacing = 200;
  const cols = Math.max(Math.ceil(Math.sqrt(count * 1.5)), 3);
  const offsetX = 200;
  const offsetY = 150;

  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    // Deterministic jitter based on index
    const jitterX = ((i * 37) % 60) - 30;
    const jitterY = ((i * 53) % 50) - 25;
    positions.push({
      x: offsetX + col * colSpacing + jitterX,
      y: offsetY + row * rowSpacing + jitterY,
    });
  }

  return positions;
}

export function DeckSurface({ hidden }: DeckSurfaceProps) {
  const openPalette = useAppStore((s) => s.openPalette);

  const { data: decks, isLoading } = useQuery({
    queryKey: ['decks'],
    queryFn: tauri.listDecks,
  });

  const {
    containerRef,
    surfaceRef,
    surfaceStyle,
    handleMouseDown,
    dragging,
    panTo,
  } = usePannable();

  const positions = useMemo(
    () => computePositions(decks?.length ?? 0),
    [decks?.length]
  );

  const hasCentered = useRef(false);
  useEffect(() => {
    if (positions.length === 0 || hasCentered.current) return;
    hasCentered.current = true;

    const avgX = positions.reduce((s, p) => s + p.x, 0) / positions.length;
    const avgY = positions.reduce((s, p) => s + p.y, 0) / positions.length;
    const vpW = containerRef.current?.clientWidth ?? window.innerWidth;
    const vpH = containerRef.current?.clientHeight ?? window.innerHeight;

    panTo(-(avgX - vpW / 2), -(avgY - vpH / 2));
  }, [positions, panTo, containerRef]);

  return (
    <>
      <div
        ref={containerRef}
        className={styles.container}
        data-dragging={dragging || undefined}
        data-hidden={hidden || undefined}
        onMouseDown={handleMouseDown}
      >
        <div ref={surfaceRef} className={styles.surface} style={surfaceStyle}>
          {isLoading && (
            <div className={styles.empty}>
              <p>Loading decks...</p>
            </div>
          )}

          {!isLoading && (!decks || decks.length === 0) && (
            <div className={styles.empty}>
              <h2>No decks yet</h2>
              <p>Import a markdown file or directory to get started.</p>
              <span className={styles.emptyHint}>
                Press Cmd+K to open the command palette
              </span>
            </div>
          )}

          {decks?.map((deck, i) => (
            <DeckStack
              key={deck.path}
              deck={deck}
              position={positions[i] ?? { x: 0, y: 0 }}
            />
          ))}
        </div>
      </div>

      {!hidden && (
        <>
          <div className={styles.brand}>
            <span className={styles.brandName}>Jireh's Flashcards</span>
            <span className={styles.brandHint}>drag to explore</span>
          </div>

          <div className={styles.cmdkHint} onClick={openPalette}>
            <kbd>Cmd</kbd><kbd>K</kbd>
          </div>
        </>
      )}
    </>
  );
}
