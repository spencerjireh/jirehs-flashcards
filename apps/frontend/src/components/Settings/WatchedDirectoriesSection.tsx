import { useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { FolderPlus, Trash, RefreshDouble } from 'iconoir-react';

interface WatchedDirectoriesSectionProps {
  watchedDirectories: string[];
  onAddDirectory: (path: string) => void;
  onRemoveDirectory: (path: string) => void;
  onRefreshAll: () => void;
  isAddPending: boolean;
  isRemovePending: boolean;
  isRefreshing: boolean;
  error: Error | null;
}

export function WatchedDirectoriesSection({
  watchedDirectories,
  onAddDirectory,
  onRemoveDirectory,
  onRefreshAll,
  isAddPending,
  isRemovePending,
  isRefreshing,
  error,
}: WatchedDirectoriesSectionProps) {
  const [isSelecting, setIsSelecting] = useState(false);

  const handleAddDirectory = async () => {
    setIsSelecting(true);
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select directory to watch',
      });
      if (selected && typeof selected === 'string') {
        onAddDirectory(selected);
      }
    } catch (error) {
      console.error('Failed to select directory:', error);
    } finally {
      setIsSelecting(false);
    }
  };

  return (
    <div className="settings-section">
      <h2>Watched Directories</h2>
      <p className="form-hint" style={{ marginBottom: '1rem' }}>
        Directories being monitored for changes to markdown files.
        Changes will automatically refresh your flashcard decks.
      </p>

      <div className="watched-directories-list">
        {watchedDirectories.length === 0 ? (
          <p className="empty-watched">No directories are being watched.</p>
        ) : (
          watchedDirectories.map((dir) => (
            <div key={dir} className="watched-directory-item">
              <span className="directory-path" title={dir}>
                {dir}
              </span>
              <button
                type="button"
                className="button button-secondary button-icon remove-button"
                onClick={() => onRemoveDirectory(dir)}
                disabled={isRemovePending}
              >
                <Trash /> Remove
              </button>
            </div>
          ))
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          type="button"
          className="button button-secondary button-icon"
          onClick={handleAddDirectory}
          disabled={isSelecting || isAddPending}
        >
          {isSelecting ? 'Selecting...' : <><FolderPlus /> Add Directory</>}
        </button>

        {watchedDirectories.length > 0 && (
          <button
            type="button"
            className="button button-secondary button-icon"
            onClick={onRefreshAll}
            disabled={isRefreshing}
          >
            {isRefreshing ? 'Refreshing...' : <><RefreshDouble /> Refresh All</>}
          </button>
        )}
      </div>

      {error && (
        <p className="form-hint" style={{ color: 'var(--danger)' }}>
          {error.message}
        </p>
      )}
    </div>
  );
}
