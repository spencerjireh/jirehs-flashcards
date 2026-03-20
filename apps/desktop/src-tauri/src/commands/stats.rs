//! Statistics Tauri commands.

use crate::db::{SettingsRepository, StatsRepository};
use crate::state::AppState;
use flashcard_core::types::{CalendarData, DeckStats, StudyStats};
use tauri::State;

use super::deck::{with_repo, CommandError};

/// Get deck statistics.
#[tauri::command]
pub async fn get_deck_stats(
    deck_path: Option<String>,
    state: State<'_, AppState>,
) -> Result<DeckStats, CommandError> {
    with_repo(&state, move |repo| {
        repo.get_deck_stats(deck_path.as_deref()).map_err(Into::into)
    }).await
}

/// Get overall study statistics.
#[tauri::command]
pub async fn get_study_stats(state: State<'_, AppState>) -> Result<StudyStats, CommandError> {
    with_repo(&state, |repo| {
        let settings = repo.get_global_settings()?;
        repo.get_study_stats(settings.daily_reset_hour).map_err(Into::into)
    }).await
}

/// Get calendar data for heatmap.
#[tauri::command]
pub async fn get_calendar_data(
    days: Option<usize>,
    state: State<'_, AppState>,
) -> Result<Vec<CalendarData>, CommandError> {
    with_repo(&state, move |repo| {
        let settings = repo.get_global_settings()?;
        let days = days.unwrap_or(90);
        repo.get_calendar_data(days, settings.daily_reset_hour).map_err(Into::into)
    }).await
}
