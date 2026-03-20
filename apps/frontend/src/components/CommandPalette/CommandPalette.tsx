import { useEffect, useRef } from 'react';
import {
  Folder,
  Page,
  Settings as SettingsIcon,
  StatsReport,
  Book,
  Eye,
  Trash,
} from 'iconoir-react';
import { useAppStore } from '../../stores/appStore';
import { useCommandPalette } from '../../hooks/useCommandPalette';
import styles from './CommandPalette.module.css';

const CATEGORY_ICON = {
  action: null,
  'deck-study': Book,
  'deck-browse': Eye,
  'deck-remove': Trash,
} as const;

const ACTION_ICONS: Record<string, typeof Folder> = {
  'import-dir': Folder,
  'import-file': Page,
  settings: SettingsIcon,
  stats: StatsReport,
};

export function CommandPalette() {
  const paletteOpen = useAppStore((s) => s.paletteOpen);
  const closePalette = useAppStore((s) => s.closePalette);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    query,
    setQuery,
    filtered,
    selectedIndex,
    setSelectedIndex,
    moveSelection,
    execute,
    resetQuery,
  } = useCommandPalette();

  useEffect(() => {
    if (paletteOpen) {
      resetQuery();
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [paletteOpen, resetQuery]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveSelection(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveSelection(-1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      execute(selectedIndex);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closePalette();
    }
  }

  function getIcon(cmd: (typeof filtered)[0]) {
    const ActionIcon = ACTION_ICONS[cmd.id];
    if (ActionIcon) return <ActionIcon />;
    const CategoryIcon = CATEGORY_ICON[cmd.category];
    if (CategoryIcon) return <CategoryIcon />;
    return null;
  }

  return (
    <>
      <div
        className={styles.backdrop}
        data-open={paletteOpen || undefined}
        onClick={closePalette}
      />
      <div
        className={styles.palette}
        data-open={paletteOpen || undefined}
        onKeyDown={handleKeyDown}
      >
        <div className={styles.inputWrap}>
          <input
            ref={inputRef}
            className={styles.input}
            type="text"
            placeholder="Type a command..."
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div className={styles.results}>
          {filtered.length === 0 ? (
            <div className={styles.empty}>No matching commands</div>
          ) : (
            filtered.slice(0, 10).map((cmd, i) => (
              <div
                key={cmd.id}
                className={styles.item}
                data-selected={i === selectedIndex || undefined}
                onClick={() => execute(i)}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <span className={styles.itemIcon}>{getIcon(cmd)}</span>
                <span>{cmd.label}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
