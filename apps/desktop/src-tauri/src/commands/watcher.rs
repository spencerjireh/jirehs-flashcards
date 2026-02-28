//! File watcher commands.

use crate::state::AppState;
use crate::watcher::{DeckRefreshEvent, FileChangeEvent};
use std::path::PathBuf;
use tauri::{AppHandle, Emitter, State};

/// Start watching a directory for file changes.
#[tauri::command]
pub async fn start_watching(
    dir_path: String,
    app_handle: AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let path = PathBuf::from(&dir_path);

    if !path.exists() {
        return Err(format!("Directory does not exist: {}", dir_path));
    }

    if !path.is_dir() {
        return Err(format!("Path is not a directory: {}", dir_path));
    }

    {
        let mut watcher = state.watcher.lock().await;

        // Initialize watcher if not already started
        if !watcher.is_started() {
            watcher.start(app_handle.clone(), state.repository.clone())?;
        }

        watcher.watch(path.clone())?;
    }

    // Initial scan: import existing .md files that the watcher would miss
    // since notify only reports changes *after* the watch is registered.
    initial_scan(&path, &app_handle, &state);

    Ok(())
}

/// Walk a directory recursively and import all existing .md files.
fn initial_scan(dir: &PathBuf, app_handle: &AppHandle, state: &AppState) {
    let entries = match std::fs::read_dir(dir) {
        Ok(entries) => entries,
        Err(_) => return,
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            initial_scan(&path, app_handle, state);
        } else if path.extension().map_or(false, |ext| ext == "md") {
            let source_file = path.to_string_lossy().to_string();
            let deck_path = path
                .parent()
                .and_then(|p| p.file_name())
                .map(|name| name.to_string_lossy().to_string())
                .unwrap_or_default();

            if let Ok(content) = std::fs::read_to_string(&path) {
                if let Ok(cards) = flashcard_core::parser::parse(&content) {
                    if let Ok(repo) = state.repository.lock() {
                        if let Err(e) = repo.import_cards(&deck_path, &source_file, &cards) {
                            eprintln!("Initial scan: failed to import {}: {}", source_file, e);
                        }
                    }
                }
            }

            let _ = app_handle.emit("file-changed", FileChangeEvent {
                path: source_file,
                kind: "created".to_string(),
            });
            if !deck_path.is_empty() {
                let _ = app_handle.emit("deck-updated", DeckRefreshEvent {
                    deck_path,
                });
            }
        }
    }
}

/// Stop watching a directory.
#[tauri::command]
pub async fn stop_watching(dir_path: String, state: State<'_, AppState>) -> Result<(), String> {
    let path = PathBuf::from(&dir_path);
    let mut watcher = state.watcher.lock().await;
    watcher.unwatch(&path)
}

/// Get the list of currently watched directories.
#[tauri::command]
pub async fn get_watched_directories(state: State<'_, AppState>) -> Result<Vec<String>, String> {
    let watcher = state.watcher.lock().await;
    Ok(watcher.get_watched_directories())
}
