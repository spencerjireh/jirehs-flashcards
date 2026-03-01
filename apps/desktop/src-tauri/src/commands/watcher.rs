//! File watcher commands.

use crate::db::WatcherRepository;
use crate::state::AppState;
use crate::watcher::DeckRefreshEvent;
use std::collections::HashSet;
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

    // Persist to DB only after watcher is confirmed active
    {
        let repo = state.repository.lock().map_err(|e| e.to_string())?;
        repo.add_watched_directory(&dir_path).map_err(|e| e.to_string())?;
    }

    // Initial scan: import existing .md files
    scan_directory(&path, &app_handle, &state);

    Ok(())
}

/// Walk a directory recursively, import all .md files, and emit one event per deck.
pub(crate) fn scan_directory(dir: &PathBuf, app_handle: &AppHandle, state: &AppState) {
    let mut deck_paths: HashSet<String> = HashSet::new();
    scan_directory_recursive(dir, state, &mut deck_paths);

    // Emit one deck-updated event per unique deck
    for deck_path in deck_paths {
        let _ = app_handle.emit("deck-updated", DeckRefreshEvent { deck_path });
    }
}

fn scan_directory_recursive(dir: &PathBuf, state: &AppState, deck_paths: &mut HashSet<String>) {
    let entries = match std::fs::read_dir(dir) {
        Ok(entries) => entries,
        Err(_) => return,
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            scan_directory_recursive(&path, state, deck_paths);
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
                            eprintln!("Scan: failed to import {}: {}", source_file, e);
                        }
                    }
                }
            }

            if !deck_path.is_empty() {
                deck_paths.insert(deck_path);
            }
        }
    }
}

/// Stop watching a directory.
#[tauri::command]
pub async fn stop_watching(dir_path: String, state: State<'_, AppState>) -> Result<(), String> {
    let path = PathBuf::from(&dir_path);
    let mut watcher = state.watcher.lock().await;
    watcher.unwatch(&path)?;

    // Remove from DB only after watcher confirmed stopped
    let repo = state.repository.lock().map_err(|e| e.to_string())?;
    repo.remove_watched_directory(&dir_path).map_err(|e| e.to_string())
}

/// Get the list of watched directories (from DB).
#[tauri::command]
pub async fn get_watched_directories(state: State<'_, AppState>) -> Result<Vec<String>, String> {
    let repo = state.repository.lock().map_err(|e| e.to_string())?;
    repo.get_watched_directories().map_err(|e| e.to_string())
}

/// Re-scan all watched directories and re-import files.
#[tauri::command]
pub async fn refresh_watched_directories(
    app_handle: AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let dirs = {
        let repo = state.repository.lock().map_err(|e| e.to_string())?;
        repo.get_watched_directories().map_err(|e| e.to_string())?
    };

    for dir_str in &dirs {
        let path = PathBuf::from(dir_str);
        if path.is_dir() {
            scan_directory(&path, &app_handle, &state);
        }
    }

    Ok(())
}
