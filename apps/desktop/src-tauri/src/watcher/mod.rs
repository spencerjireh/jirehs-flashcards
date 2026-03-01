//! File system watcher for monitoring markdown file changes.

use crate::db::SqliteRepository;
use notify::{
    event::{CreateKind, ModifyKind, RemoveKind},
    Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher,
};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::mpsc::{channel, Receiver, Sender};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

/// Event emitted when a deck should be refreshed.
#[derive(Clone, serde::Serialize)]
pub struct DeckRefreshEvent {
    pub deck_path: String,
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

        // Spawn a thread to handle events
        let handle = app_handle.clone();
        thread::spawn(move || {
            Self::event_loop(rx, stop_rx, handle, repository);
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
    pub fn unwatch(&mut self, path: &PathBuf) -> Result<(), String> {
        let watcher = self
            .watcher
            .as_mut()
            .ok_or_else(|| "Watcher not started".to_string())?;

        watcher
            .unwatch(path)
            .map_err(|e| format!("Failed to unwatch directory: {}", e))?;

        Ok(())
    }

    /// Event loop that processes file system events.
    fn event_loop(
        rx: Receiver<Event>,
        stop_rx: Receiver<()>,
        app_handle: AppHandle,
        repository: Arc<Mutex<SqliteRepository>>,
    ) {
        let mut last_emit: HashMap<String, Instant> = HashMap::new();

        loop {
            // Check for stop signal
            if stop_rx.try_recv().is_ok() {
                break;
            }

            // Process events with a timeout
            match rx.recv_timeout(Duration::from_millis(100)) {
                Ok(event) => {
                    Self::handle_event(&event, &app_handle, &repository, &mut last_emit);
                }
                Err(std::sync::mpsc::RecvTimeoutError::Timeout) => {
                    // No events, continue
                }
                Err(std::sync::mpsc::RecvTimeoutError::Disconnected) => {
                    break;
                }
            }
        }
    }

    /// Handle a file system event.
    fn handle_event(
        event: &Event,
        app_handle: &AppHandle,
        repository: &Arc<Mutex<SqliteRepository>>,
        last_emit: &mut HashMap<String, Instant>,
    ) {
        // Only process markdown files
        let md_paths: Vec<_> = event
            .paths
            .iter()
            .filter(|p| {
                p.extension()
                    .map(|ext| ext == "md")
                    .unwrap_or(false)
            })
            .collect();

        if md_paths.is_empty() {
            return;
        }

        let kind_str = match &event.kind {
            EventKind::Create(CreateKind::File) => "created",
            EventKind::Modify(ModifyKind::Data(_)) => "modified",
            EventKind::Modify(ModifyKind::Name(_)) => "renamed",
            EventKind::Remove(RemoveKind::File) => "deleted",
            _ => return, // Ignore other events
        };

        for path in md_paths {
            let source_file = path.to_string_lossy().to_string();
            let deck_path = Self::get_deck_path_from_file(path).unwrap_or_default();

            // Auto-import: update local SQLite database
            match kind_str {
                "created" | "modified" => {
                    if let Ok(content) = std::fs::read_to_string(path) {
                        if let Ok(cards) = flashcard_core::parser::parse(&content) {
                            if let Ok(repo) = repository.lock() {
                                if let Err(e) = repo.import_cards(&deck_path, &source_file, &cards) {
                                    eprintln!("Failed to auto-import cards from {}: {}", source_file, e);
                                }
                            }
                        }
                    }
                }
                "deleted" => {
                    if let Ok(repo) = repository.lock() {
                        if let Err(e) = repo.delete_cards_by_source_file(&source_file) {
                            eprintln!("Failed to delete cards from {}: {}", source_file, e);
                        }
                    }
                }
                _ => {}
            }

            // Emit deck refresh event with debounce
            if !deck_path.is_empty() {
                let now = Instant::now();
                let should_emit = last_emit
                    .get(&deck_path)
                    .map(|last| now.duration_since(*last) > Duration::from_millis(500))
                    .unwrap_or(true);

                if should_emit {
                    last_emit.insert(deck_path.clone(), now);
                    let deck_event = DeckRefreshEvent {
                        deck_path,
                    };
                    let _ = app_handle.emit("deck-updated", deck_event);
                }
            }
        }
    }

    /// Extract deck path from a markdown file path.
    /// This assumes the deck name is the parent directory of the file.
    fn get_deck_path_from_file(file_path: &PathBuf) -> Option<String> {
        file_path
            .parent()
            .and_then(|p| p.file_name())
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
