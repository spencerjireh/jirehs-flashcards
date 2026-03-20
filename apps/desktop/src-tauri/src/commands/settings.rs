//! Settings-related Tauri commands.

use crate::db::SettingsRepository;
use crate::state::AppState;
use flashcard_core::types::{DeckSettings, EffectiveSettings, GlobalSettings};
use tauri::State;

use super::deck::{with_repo, CommandError};

/// Get global settings.
#[tauri::command]
pub async fn get_global_settings(
    state: State<'_, AppState>,
) -> Result<GlobalSettings, CommandError> {
    with_repo(&state, |repo| {
        repo.get_global_settings().map_err(Into::into)
    }).await
}

/// Save global settings.
#[tauri::command]
pub async fn save_global_settings(
    settings: GlobalSettings,
    state: State<'_, AppState>,
) -> Result<(), CommandError> {
    with_repo(&state, move |repo| {
        repo.save_global_settings(&settings).map_err(Into::into)
    }).await
}

/// Get deck-specific settings.
#[tauri::command]
pub async fn get_deck_settings(
    deck_path: String,
    state: State<'_, AppState>,
) -> Result<Option<DeckSettings>, CommandError> {
    with_repo(&state, move |repo| {
        repo.get_deck_settings(&deck_path).map_err(Into::into)
    }).await
}

/// Save deck-specific settings.
#[tauri::command]
pub async fn save_deck_settings(
    settings: DeckSettings,
    state: State<'_, AppState>,
) -> Result<(), CommandError> {
    with_repo(&state, move |repo| {
        repo.save_deck_settings(&settings).map_err(Into::into)
    }).await
}

/// Delete deck-specific settings (revert to global).
#[tauri::command]
pub async fn delete_deck_settings(
    deck_path: String,
    state: State<'_, AppState>,
) -> Result<(), CommandError> {
    with_repo(&state, move |repo| {
        repo.delete_deck_settings(&deck_path).map_err(Into::into)
    }).await
}

/// Get effective settings for a deck (global merged with deck overrides).
#[tauri::command]
pub async fn get_effective_settings(
    deck_path: Option<String>,
    state: State<'_, AppState>,
) -> Result<EffectiveSettings, CommandError> {
    with_repo(&state, move |repo| {
        repo.get_effective_settings(deck_path.as_deref()).map_err(Into::into)
    }).await
}
