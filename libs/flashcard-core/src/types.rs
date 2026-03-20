//! Core types for flashcard application.

use crate::matching::DiffSegment;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[cfg(feature = "ts-export")]
use ts_rs::TS;

/// Card learning status.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-export", derive(TS))]
#[cfg_attr(feature = "ts-export", ts(export, export_to = "libs/shared-types/src/generated/"))]
#[serde(rename_all = "snake_case")]
pub enum CardStatus {
    #[default]
    New,
    Learning,
    Review,
    Relearning,
}

impl CardStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::New => "new",
            Self::Learning => "learning",
            Self::Review => "review",
            Self::Relearning => "relearning",
        }
    }
}

impl std::str::FromStr for CardStatus {
    type Err = ();
    fn from_str(s: &str) -> std::result::Result<Self, Self::Err> {
        match s {
            "new" => Ok(Self::New),
            "learning" => Ok(Self::Learning),
            "review" => Ok(Self::Review),
            "relearning" => Ok(Self::Relearning),
            _ => Err(()),
        }
    }
}

/// Rating for a review.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-export", derive(TS))]
#[cfg_attr(feature = "ts-export", ts(export, export_to = "libs/shared-types/src/generated/"))]
#[serde(rename_all = "snake_case")]
pub enum Rating {
    Again,
    Hard,
    Good,
    Easy,
}

impl Rating {
    /// Convert to 4-point numeric value (1-4).
    pub fn to_value(self) -> u8 {
        match self {
            Self::Again => 1,
            Self::Hard => 2,
            Self::Good => 3,
            Self::Easy => 4,
        }
    }

    /// Create from 4-point numeric value.
    pub fn from_value(value: u8) -> Option<Self> {
        match value {
            1 => Some(Self::Again),
            2 => Some(Self::Hard),
            3 => Some(Self::Good),
            4 => Some(Self::Easy),
            _ => None,
        }
    }

    /// Map 2-point rating to 4-point.
    /// Wrong (1) -> Again, Correct (2) -> Good
    pub fn from_2point(correct: bool) -> Self {
        if correct { Self::Good } else { Self::Again }
    }
}

/// Card learning state.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-export", derive(TS))]
#[cfg_attr(feature = "ts-export", ts(export, export_to = "libs/shared-types/src/generated/"))]
pub struct CardState {
    pub status: CardStatus,
    pub interval_days: f64,
    pub ease_factor: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stability: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub difficulty: Option<f64>,
    pub lapses: u32,
    pub reviews_count: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-export", ts(optional))]
    pub due_date: Option<DateTime<Utc>>,
}

impl Default for CardState {
    fn default() -> Self {
        Self {
            status: CardStatus::New,
            interval_days: 0.0,
            ease_factor: 2.5,
            stability: None,
            difficulty: None,
            lapses: 0,
            reviews_count: 0,
            due_date: None,
        }
    }
}

/// Raw card parsed from markdown (may not have an ID yet).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-export", derive(TS))]
#[cfg_attr(feature = "ts-export", ts(export, export_to = "libs/shared-types/src/generated/"))]
pub struct RawCard {
    #[cfg_attr(feature = "ts-export", ts(type = "number | null"))]
    pub id: Option<i64>,
    pub question: String,
    pub answer: String,
    pub line_number: usize,
}

/// Card with assigned ID and metadata.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-export", derive(TS))]
#[cfg_attr(feature = "ts-export", ts(export, export_to = "libs/shared-types/src/generated/"))]
pub struct Card {
    #[cfg_attr(feature = "ts-export", ts(type = "number"))]
    pub id: i64,
    pub deck_path: String,
    pub question: String,
    pub answer: String,
    pub source_file: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-export", ts(optional))]
    pub deleted_at: Option<DateTime<Utc>>,
}

/// Rating scale options.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-export", derive(TS))]
#[cfg_attr(feature = "ts-export", ts(export, export_to = "libs/shared-types/src/generated/"))]
#[serde(rename_all = "snake_case")]
pub enum RatingScale {
    #[serde(rename = "4point")]
    #[default]
    FourPoint,
    #[serde(rename = "2point")]
    TwoPoint,
}

/// Answer mode options.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-export", derive(TS))]
#[cfg_attr(feature = "ts-export", ts(export, export_to = "libs/shared-types/src/generated/"))]
#[serde(rename_all = "snake_case")]
pub enum AnswerMode {
    #[default]
    Flip,
    Typed,
}

/// Matching mode for typed answers.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-export", derive(TS))]
#[cfg_attr(feature = "ts-export", ts(export, export_to = "libs/shared-types/src/generated/"))]
#[serde(rename_all = "snake_case")]
pub enum MatchingMode {
    Exact,
    CaseInsensitive,
    #[default]
    Fuzzy,
}

/// Deck with card counts.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-export", derive(TS))]
#[cfg_attr(feature = "ts-export", ts(export, export_to = "libs/shared-types/src/generated/"))]
pub struct Deck {
    pub path: String,
    pub name: String,
    pub card_count: usize,
    pub new_count: usize,
    pub due_count: usize,
}

/// Study queue containing cards to study.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-export", derive(TS))]
#[cfg_attr(feature = "ts-export", ts(export, export_to = "libs/shared-types/src/generated/"))]
pub struct StudyQueue {
    pub new_cards: Vec<Card>,
    pub review_cards: Vec<Card>,
    pub new_remaining: usize,
    pub review_remaining: usize,
}

/// Algorithm options.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-export", derive(TS))]
#[cfg_attr(feature = "ts-export", ts(export, export_to = "libs/shared-types/src/generated/"))]
#[serde(rename_all = "snake_case")]
pub enum Algorithm {
    #[default]
    Sm2,
    Fsrs,
}

impl Algorithm {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Sm2 => "sm2",
            Self::Fsrs => "fsrs",
        }
    }
}

impl std::str::FromStr for Algorithm {
    type Err = ();

    fn from_str(s: &str) -> std::result::Result<Self, Self::Err> {
        match s {
            "sm2" => Ok(Self::Sm2),
            "fsrs" => Ok(Self::Fsrs),
            _ => Err(()),
        }
    }
}

/// Global settings configuration.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-export", derive(TS))]
#[cfg_attr(feature = "ts-export", ts(export, export_to = "libs/shared-types/src/generated/"))]
pub struct GlobalSettings {
    pub algorithm: Algorithm,
    pub rating_scale: RatingScale,
    pub matching_mode: MatchingMode,
    pub fuzzy_threshold: f64,
    pub new_cards_per_day: u32,
    pub reviews_per_day: u32,
    pub daily_reset_hour: u32,
}

impl Default for GlobalSettings {
    fn default() -> Self {
        Self {
            algorithm: Algorithm::default(),
            rating_scale: RatingScale::default(),
            matching_mode: MatchingMode::default(),
            fuzzy_threshold: 0.8,
            new_cards_per_day: 20,
            reviews_per_day: 200,
            daily_reset_hour: 0,
        }
    }
}

/// Per-deck settings (all fields optional for overrides).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-export", derive(TS))]
#[cfg_attr(feature = "ts-export", ts(export, export_to = "libs/shared-types/src/generated/"))]
pub struct DeckSettings {
    pub deck_path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub algorithm: Option<Algorithm>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rating_scale: Option<RatingScale>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub matching_mode: Option<MatchingMode>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fuzzy_threshold: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub new_cards_per_day: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reviews_per_day: Option<u32>,
}

impl DeckSettings {
    /// Create new deck settings with only the path set.
    pub fn new(deck_path: String) -> Self {
        Self {
            deck_path,
            algorithm: None,
            rating_scale: None,
            matching_mode: None,
            fuzzy_threshold: None,
            new_cards_per_day: None,
            reviews_per_day: None,
        }
    }
}

/// Effective settings (global merged with deck overrides).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-export", derive(TS))]
#[cfg_attr(feature = "ts-export", ts(export, export_to = "libs/shared-types/src/generated/"))]
pub struct EffectiveSettings {
    pub algorithm: Algorithm,
    pub rating_scale: RatingScale,
    pub matching_mode: MatchingMode,
    pub fuzzy_threshold: f64,
    pub new_cards_per_day: u32,
    pub reviews_per_day: u32,
    pub daily_reset_hour: u32,
}

impl EffectiveSettings {
    /// Merge global settings with optional deck settings.
    pub fn merge(global: &GlobalSettings, deck: Option<&DeckSettings>) -> Self {
        match deck {
            Some(d) => Self {
                algorithm: d.algorithm.unwrap_or(global.algorithm),
                rating_scale: d.rating_scale.unwrap_or(global.rating_scale),
                matching_mode: d.matching_mode.unwrap_or(global.matching_mode),
                fuzzy_threshold: d.fuzzy_threshold.unwrap_or(global.fuzzy_threshold),
                new_cards_per_day: d.new_cards_per_day.unwrap_or(global.new_cards_per_day),
                reviews_per_day: d.reviews_per_day.unwrap_or(global.reviews_per_day),
                daily_reset_hour: global.daily_reset_hour,
            },
            None => Self {
                algorithm: global.algorithm,
                rating_scale: global.rating_scale,
                matching_mode: global.matching_mode,
                fuzzy_threshold: global.fuzzy_threshold,
                new_cards_per_day: global.new_cards_per_day,
                reviews_per_day: global.reviews_per_day,
                daily_reset_hour: global.daily_reset_hour,
            },
        }
    }
}

/// Deck statistics.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-export", derive(TS))]
#[cfg_attr(feature = "ts-export", ts(export, export_to = "libs/shared-types/src/generated/"))]
pub struct DeckStats {
    pub total_cards: usize,
    pub new_cards: usize,
    pub learning_cards: usize,
    pub review_cards: usize,
    pub average_ease: f64,
    pub average_interval: f64,
}

/// Overall study statistics.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-export", derive(TS))]
#[cfg_attr(feature = "ts-export", ts(export, export_to = "libs/shared-types/src/generated/"))]
pub struct StudyStats {
    pub reviews_today: usize,
    pub new_today: usize,
    pub streak_days: usize,
    pub retention_rate: f64,
    pub total_reviews: usize,
}

/// Calendar data point.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-export", derive(TS))]
#[cfg_attr(feature = "ts-export", ts(export, export_to = "libs/shared-types/src/generated/"))]
pub struct CalendarData {
    pub date: String,
    pub reviews: usize,
}

/// Review record.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-export", derive(TS))]
#[cfg_attr(feature = "ts-export", ts(export, export_to = "libs/shared-types/src/generated/"))]
pub struct Review {
    #[cfg_attr(feature = "ts-export", ts(type = "number"))]
    pub id: i64,
    #[cfg_attr(feature = "ts-export", ts(type = "number"))]
    pub card_id: i64,
    pub reviewed_at: String,
    pub rating: i32,
    pub rating_scale: String,
    pub answer_mode: String,
    pub typed_answer: Option<String>,
    pub was_correct: Option<bool>,
    pub time_taken_ms: Option<i32>,
    pub interval_before: f64,
    pub interval_after: f64,
    pub ease_before: f64,
    pub ease_after: f64,
    pub algorithm: String,
}

/// Review request from frontend.
#[derive(Debug, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-export", derive(TS))]
#[cfg_attr(feature = "ts-export", ts(export, export_to = "libs/shared-types/src/generated/"))]
pub struct ReviewRequest {
    #[cfg_attr(feature = "ts-export", ts(type = "number"))]
    pub card_id: i64,
    pub rating: u8,
    pub rating_scale: String,
    pub answer_mode: String,
    #[serde(default)]
    pub typed_answer: Option<String>,
    #[serde(default)]
    #[cfg_attr(feature = "ts-export", ts(type = "number | null"))]
    pub time_taken_ms: Option<i64>,
}

/// Review response to frontend.
#[derive(Debug, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-export", derive(TS))]
#[cfg_attr(feature = "ts-export", ts(export, export_to = "libs/shared-types/src/generated/"))]
pub struct ReviewResponse {
    pub new_state: CardState,
    pub next_due: String,
}

/// Response from typed answer comparison.
#[derive(Debug, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-export", derive(TS))]
#[cfg_attr(feature = "ts-export", ts(export, export_to = "libs/shared-types/src/generated/"))]
pub struct CompareAnswerResponse {
    pub is_correct: bool,
    pub similarity: f64,
    pub matching_mode: String,
    pub typed_normalized: String,
    pub correct_normalized: String,
    pub diff: Vec<DiffSegment>,
}
