//! File system watcher for monitoring markdown file changes.

use crate::db::SqliteRepository;
use notify::{
    event::{CreateKind, ModifyKind, RemoveKind},
    Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher,
};
use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::sync::mpsc::{channel, Sender};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{AppHandle, Emitter};
use tokio::sync::mpsc as tokio_mpsc;

/// Event emitted when a deck should be refreshed.
#[derive(Clone, serde::Serialize)]
pub struct DeckRefreshEvent {
    pub deck_path: String,
}

/// Event emitted when a watcher error occurs.
#[derive(Clone, serde::Serialize)]
pub struct WatcherErrorEvent {
    pub message: String,
    pub source_file: String,
}

/// Event emitted when an import sync detects changes.
#[derive(Clone, serde::Serialize)]
pub struct ImportSyncEvent {
    pub deck_path: String,
    pub added: usize,
    pub updated: usize,
    pub removed: usize,
}

/// Internal file event sent through the channel.
#[derive(Debug, Clone)]
enum FileEventKind {
    CreateOrModify,
    Delete,
}

#[derive(Debug, Clone)]
struct FileEvent {
    path: PathBuf,
    kind: FileEventKind,
}

/// File watcher that monitors directories for changes.
pub struct FileWatcher {
    watcher: Option<RecommendedWatcher>,
    stop_tx: Option<Sender<()>>,
}

impl FileWatcher {
    /// Create a new file watcher.
    pub fn new() -> Self {
        Self {
            watcher: None,
            stop_tx: None,
        }
    }

    /// Check if the watcher has been started.
    pub fn is_started(&self) -> bool {
        self.watcher.is_some()
    }

    /// Start the file watcher with a Tauri app handle and repository for auto-import.
    pub fn start(
        &mut self,
        app_handle: AppHandle,
        repository: Arc<Mutex<SqliteRepository>>,
    ) -> Result<(), String> {
        if self.watcher.is_some() {
            return Ok(()); // Already running
        }

        let (tx, rx) = channel();
        let (stop_tx, stop_rx) = channel::<()>();
        let (event_tx, event_rx) = tokio_mpsc::unbounded_channel::<FileEvent>();

        let watcher = RecommendedWatcher::new(
            move |result: Result<Event, notify::Error>| {
                if let Ok(event) = result {
                    let _ = tx.send(event);
                }
            },
            Config::default(),
        )
        .map_err(|e| format!("Failed to create watcher: {}", e))?;

        self.watcher = Some(watcher);
        self.stop_tx = Some(stop_tx);

        // Detection thread: converts notify events into FileEvents
        std::thread::spawn(move || {
            Self::detection_loop(rx, stop_rx, event_tx);
        });

        // Processing task: consumes FileEvents, batches, and processes
        tauri::async_runtime::spawn(async move {
            Self::processing_loop(event_rx, app_handle, repository).await;
        });

        Ok(())
    }

    /// Watch a directory for changes.
    pub fn watch(&mut self, path: PathBuf) -> Result<(), String> {
        let watcher = self
            .watcher
            .as_mut()
            .ok_or_else(|| "Watcher not started".to_string())?;

        watcher
            .watch(&path, RecursiveMode::Recursive)
            .map_err(|e| format!("Failed to watch directory: {}", e))?;

        Ok(())
    }

    /// Stop watching a directory.
    pub fn unwatch(&mut self, path: &Path) -> Result<(), String> {
        let watcher = self
            .watcher
            .as_mut()
            .ok_or_else(|| "Watcher not started".to_string())?;

        watcher
            .unwatch(path)
            .map_err(|e| format!("Failed to unwatch directory: {}", e))?;

        Ok(())
    }

    /// Detection loop: filters notify events and sends FileEvents to the channel.
    fn detection_loop(
        rx: std::sync::mpsc::Receiver<Event>,
        stop_rx: std::sync::mpsc::Receiver<()>,
        event_tx: tokio_mpsc::UnboundedSender<FileEvent>,
    ) {
        loop {
            if stop_rx.try_recv().is_ok() {
                break;
            }

            match rx.recv_timeout(Duration::from_millis(100)) {
                Ok(event) => {
                    let kind = match &event.kind {
                        EventKind::Create(CreateKind::File) => Some(FileEventKind::CreateOrModify),
                        EventKind::Modify(ModifyKind::Data(_)) => Some(FileEventKind::CreateOrModify),
                        EventKind::Modify(ModifyKind::Name(_)) => Some(FileEventKind::CreateOrModify),
                        EventKind::Remove(RemoveKind::File) => Some(FileEventKind::Delete),
                        _ => None,
                    };

                    if let Some(kind) = kind {
                        for path in &event.paths {
                            if path.extension().map(|ext| ext == "md").unwrap_or(false) {
                                let _ = event_tx.send(FileEvent {
                                    path: path.clone(),
                                    kind: kind.clone(),
                                });
                            }
                        }
                    }
                }
                Err(std::sync::mpsc::RecvTimeoutError::Timeout) => {}
                Err(std::sync::mpsc::RecvTimeoutError::Disconnected) => break,
            }
        }
    }

    /// Processing loop: receives FileEvents, debounces, and processes in batches.
    async fn processing_loop(
        mut event_rx: tokio_mpsc::UnboundedReceiver<FileEvent>,
        app_handle: AppHandle,
        repository: Arc<Mutex<SqliteRepository>>,
    ) {
        let mut pending: HashMap<PathBuf, FileEventKind> = HashMap::new();

        loop {
            // Wait for the first event
            let event = match event_rx.recv().await {
                Some(e) => e,
                None => break, // Channel closed
            };
            pending.insert(event.path.clone(), event.kind);

            // Debounce: collect more events for a short window
            let deadline = tokio::time::Instant::now() + Duration::from_millis(200);
            while let Ok(Some(event)) = tokio::time::timeout_at(deadline, event_rx.recv()).await {
                pending.insert(event.path.clone(), event.kind);
            }

            // Process the batch on a blocking thread to avoid holding sync Mutex on the async runtime
            let batch = std::mem::take(&mut pending);
            let repo_clone = repository.clone();
            let handle_clone = app_handle.clone();
            let _ = tokio::task::spawn_blocking(move || {
                Self::process_batch(&batch, &handle_clone, &repo_clone);
            })
            .await;
        }
    }

    /// Process a batch of file events.
    fn process_batch(
        batch: &HashMap<PathBuf, FileEventKind>,
        app_handle: &AppHandle,
        repository: &Arc<Mutex<SqliteRepository>>,
    ) {
        // Phase 1: Read and parse files without holding the lock
        let mut parsed_files: Vec<(String, String, String, Vec<flashcard_core::types::RawCard>)> = Vec::new();
        let mut deleted_files: Vec<(String, String)> = Vec::new();
        let mut decks_to_refresh: HashSet<String> = HashSet::new();

        for (path, kind) in batch {
            let source_file = path.to_string_lossy().to_string();
            let deck_path = Self::get_deck_path_from_file(path).unwrap_or_default();

            match kind {
                FileEventKind::CreateOrModify => {
                    match std::fs::read_to_string(path) {
                        Ok(content) => match flashcard_core::parser::parse(&content) {
                            Ok(cards) => {
                                parsed_files.push((deck_path.clone(), source_file, content, cards));
                            }
                            Err(e) => {
                                let _ = app_handle.emit("watcher-error", WatcherErrorEvent {
                                    message: format!("Failed to parse: {}", e),
                                    source_file: source_file.clone(),
                                });
                            }
                        },
                        Err(e) => {
                            let _ = app_handle.emit("watcher-error", WatcherErrorEvent {
                                message: format!("Failed to read: {}", e),
                                source_file: source_file.clone(),
                            });
                        }
                    }
                }
                FileEventKind::Delete => {
                    deleted_files.push((deck_path.clone(), source_file));
                }
            }

            if !deck_path.is_empty() {
                decks_to_refresh.insert(deck_path);
            }
        }

        // Phase 2: Acquire lock and perform DB operations
        let repo = match repository.lock() {
            Ok(repo) => repo,
            Err(_) => return,
        };

        // Track diffs per deck for import-sync events
        let mut deck_diffs: HashMap<String, (usize, usize, usize)> = HashMap::new();
        #[allow(clippy::type_complexity)]
        let mut file_assignments: Vec<(String, String, Vec<(usize, i64)>)> = Vec::new();

        for (deck_path, source_file, content, cards) in &parsed_files {
            match repo.import_cards(deck_path, source_file, cards) {
                Ok(diff) => {
                    let entry = deck_diffs.entry(deck_path.clone()).or_default();
                    entry.0 += diff.added;
                    entry.1 += diff.updated;
                    entry.2 += diff.removed;
                    if !diff.id_assignments.is_empty() {
                        file_assignments.push((source_file.clone(), content.clone(), diff.id_assignments));
                    }
                }
                Err(e) => {
                    let _ = app_handle.emit("watcher-error", WatcherErrorEvent {
                        message: format!("Failed to import: {}", e),
                        source_file: source_file.clone(),
                    });
                }
            }
        }

        for (_, source_file) in &deleted_files {
            if let Err(e) = repo.delete_cards_by_source_file(source_file) {
                let _ = app_handle.emit("watcher-error", WatcherErrorEvent {
                    message: format!("Failed to delete cards: {}", e),
                    source_file: source_file.clone(),
                });
            }
        }

        drop(repo);

        // Phase 3: Write back assigned IDs and emit events (no lock held)
        for (source_file, content, assignments) in &file_assignments {
            let updated_content = flashcard_core::parser::inject_ids(content, assignments);
            let _ = std::fs::write(source_file, &updated_content);
        }

        for deck_path in decks_to_refresh {
            let _ = app_handle.emit("deck-updated", DeckRefreshEvent { deck_path: deck_path.clone() });

            // Emit import-sync for decks that had actual changes
            if let Some(&(added, updated, removed)) = deck_diffs.get(&deck_path) {
                if added > 0 || removed > 0 {
                    let _ = app_handle.emit("import-sync", ImportSyncEvent {
                        deck_path, added, updated, removed,
                    });
                }
            }
        }
    }

    /// Extract deck path from a markdown file path.
    fn get_deck_path_from_file(file_path: &Path) -> Option<String> {
        file_path
            .file_stem()
            .map(|name| name.to_string_lossy().to_string())
    }
}

impl Default for FileWatcher {
    fn default() -> Self {
        Self::new()
    }
}

impl Drop for FileWatcher {
    fn drop(&mut self) {
        if let Some(tx) = self.stop_tx.take() {
            let _ = tx.send(());
        }
    }
}
