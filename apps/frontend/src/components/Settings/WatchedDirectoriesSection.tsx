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
    <section className="settings-section">
      <div className="settings-section-header">
        <div>
          <h2>Watched Directories</h2>
          <p className="settings-section-desc">
            Directories monitored for markdown file changes.
            New or modified flashcard files are automatically detected and imported.
          </p>
        </div>
      </div>

      <div className="watched-directories-list">
        {watchedDirectories.length === 0 ? (
          <div className="empty-watched">
            <p>No directories being watched.</p>
            <p className="empty-watched-hint">Add a directory to start importing flashcards automatically.</p>
          </div>
        ) : (
          watchedDirectories.map((dir) => (
            <div key={dir} className="watched-directory-item">
              <span className="directory-path" title={dir}>
                {dir}
              </span>
              <button
                type="button"
                className="watched-action-btn watched-action-danger"
                onClick={() => onRemoveDirectory(dir)}
                disabled={isRemovePending}
                title="Stop watching"
              >
                <Trash />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="watched-actions">
        <button
          type="button"
          className="button button-secondary button-icon"
          onClick={handleAddDirectory}
          disabled={isSelecting || isAddPending}
        >
          <FolderPlus />
          {isSelecting ? 'Selecting...' : 'Add Directory'}
        </button>

        {watchedDirectories.length > 0 && (
          <button
            type="button"
            className="button button-secondary button-icon"
            onClick={onRefreshAll}
            disabled={isRefreshing}
          >
            <RefreshDouble />
            {isRefreshing ? 'Refreshing...' : 'Refresh All'}
          </button>
        )}
      </div>

      {error && (
        <p className="settings-error">{error.message}</p>
      )}
    </section>
  );
}
