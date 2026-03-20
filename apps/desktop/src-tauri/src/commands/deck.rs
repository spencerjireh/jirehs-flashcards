//! Deck-related Tauri commands.

use crate::db::{CardRepository, DeckRepository, SettingsRepository};
use crate::state::AppState;
use flashcard_core::types::{Card, Deck};
use flashcard_core::parser;
use std::fs;
use std::path::Path;
use tauri::State;

#[derive(Debug, serde::Serialize)]
pub struct ImportResult {
    pub added: usize,
    pub updated: usize,
    pub removed: usize,
    pub deck_path: String,
}

#[derive(Debug, serde::Serialize)]
pub struct RemoveResult {
    pub cards_removed: usize,
    pub deck_path: String,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ErrorCode {
    Database,
    Parse,
    Io,
    Internal,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct CommandError {
    pub code: ErrorCode,
    pub message: String,
}

impl CommandError {
    pub fn lock_poisoned() -> Self {
        Self {
            code: ErrorCode::Internal,
            message: "Internal error: failed to acquire database lock".into(),
        }
    }
}

impl From<crate::db::DbError> for CommandError {
    fn from(e: crate::db::DbError) -> Self {
        Self {
            code: ErrorCode::Database,
            message: e.to_string(),
        }
    }
}

impl From<flashcard_core::ParseError> for CommandError {
    fn from(e: flashcard_core::ParseError) -> Self {
        Self {
            code: ErrorCode::Parse,
            message: e.to_string(),
        }
    }
}

impl From<std::io::Error> for CommandError {
    fn from(e: std::io::Error) -> Self {
        Self {
            code: ErrorCode::Io,
            message: e.to_string(),
        }
    }
}

/// Run a closure with the repository on a blocking thread.
/// Prevents sync Mutex::lock from blocking the tokio async runtime.
pub async fn with_repo<F, T>(state: &AppState, f: F) -> Result<T, CommandError>
where
    F: FnOnce(&crate::db::SqliteRepository) -> Result<T, CommandError> + Send + 'static,
    T: Send + 'static,
{
    let repo = state.repository.clone();
    tokio::task::spawn_blocking(move || {
        let repo = repo.lock().map_err(|_| CommandError::lock_poisoned())?;
        f(&repo)
    })
    .await
    .map_err(|e| CommandError { code: ErrorCode::Internal, message: format!("Task failed: {}", e) })?
}

/// List all decks.
#[tauri::command]
pub async fn list_decks(state: State<'_, AppState>) -> Result<Vec<Deck>, CommandError> {
    with_repo(&state, |repo| {
        let settings = repo.get_global_settings()?;
        repo.get_all_decks(settings.daily_reset_hour).map_err(Into::into)
    }).await
}

/// Import a markdown file as a deck.
#[tauri::command]
pub async fn import_file(
    file_path: String,
    state: State<'_, AppState>,
) -> Result<ImportResult, CommandError> {
    let repo = state.repository.clone();
    tokio::task::spawn_blocking(move || {
        let path = Path::new(&file_path);
        let content = fs::read_to_string(path)?;
        let raw_cards = parser::parse(&content)?;

        let deck_path = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("default")
            .to_string();

        let diff = {
            let repo = repo.lock().map_err(|_| CommandError::lock_poisoned())?;
            repo.import_cards(&deck_path, &file_path, &raw_cards)?
        };

        if !diff.id_assignments.is_empty() {
            let updated_content = parser::inject_ids(&content, &diff.id_assignments);
            fs::write(&file_path, &updated_content)?;
        }

        Ok(ImportResult { added: diff.added, updated: diff.updated, removed: diff.removed, deck_path })
    })
    .await
    .map_err(|e| CommandError { code: ErrorCode::Internal, message: format!("Task failed: {}", e) })?
}

/// Import all markdown files from a directory.
#[tauri::command]
pub async fn import_directory(
    dir_path: String,
    state: State<'_, AppState>,
) -> Result<ImportResult, CommandError> {
    let repo = state.repository.clone();
    tokio::task::spawn_blocking(move || {
        let dir = Path::new(&dir_path);

        // Phase 1: Read and parse files
        let mut parsed_files = Vec::new();
        for entry in fs::read_dir(dir)? {
            let path = entry?.path();
            if path.extension().is_some_and(|ext| ext == "md") {
                let deck_path = path
                    .file_stem()
                    .and_then(|s| s.to_str())
                    .unwrap_or("default")
                    .to_string();
                let content = fs::read_to_string(&path)?;
                let raw_cards = parser::parse(&content)?;
                let file_path = path.to_string_lossy().to_string();
                parsed_files.push((deck_path, file_path, content, raw_cards));
            }
        }

        let dir_name = dir
            .file_name()
            .and_then(|s| s.to_str())
            .unwrap_or("default")
            .to_string();

        // Phase 2: Acquire lock and import
        let mut added = 0;
        let mut updated = 0;
        let mut removed = 0;
        #[allow(clippy::type_complexity)]
        let mut file_assignments: Vec<(String, String, Vec<(usize, i64)>)> = Vec::new();
        {
            let repo = repo.lock().map_err(|_| CommandError::lock_poisoned())?;
            for (deck_path, file_path, content, raw_cards) in &parsed_files {
                let diff = repo.import_cards(deck_path, file_path, raw_cards)?;
                added += diff.added;
                updated += diff.updated;
                removed += diff.removed;
                if !diff.id_assignments.is_empty() {
                    file_assignments.push((file_path.clone(), content.clone(), diff.id_assignments));
                }
            }
        }

        // Phase 3: Write back assigned IDs (no lock held)
        for (file_path, content, assignments) in &file_assignments {
            let updated_content = parser::inject_ids(content, assignments);
            let _ = fs::write(file_path, &updated_content);
        }

        Ok(ImportResult { added, updated, removed, deck_path: dir_name })
    })
    .await
    .map_err(|e| CommandError { code: ErrorCode::Internal, message: format!("Task failed: {}", e) })?
}

/// Get deck details.
#[tauri::command]
pub async fn get_deck(
    deck_path: String,
    state: State<'_, AppState>,
) -> Result<Option<Deck>, CommandError> {
    with_repo(&state, move |repo| {
        let settings = repo.get_global_settings()?;
        repo.get_deck(&deck_path, settings.daily_reset_hour).map_err(Into::into)
    }).await
}

/// Get all cards for a deck (for browse mode).
#[tauri::command]
pub async fn get_deck_cards(
    deck_path: String,
    state: State<'_, AppState>,
) -> Result<Vec<Card>, CommandError> {
    with_repo(&state, move |repo| {
        repo.get_all_deck_cards(&deck_path).map_err(Into::into)
    }).await
}

/// Remove a deck from the database (file on disk is untouched).
#[tauri::command]
pub async fn remove_deck(
    deck_path: String,
    state: State<'_, AppState>,
) -> Result<RemoveResult, CommandError> {
    let dp = deck_path.clone();
    let cards_removed = with_repo(&state, move |repo| {
        repo.remove_deck(&dp).map_err(Into::into)
    }).await?;
    Ok(RemoveResult { cards_removed, deck_path })
}
