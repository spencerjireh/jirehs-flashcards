//! SQLite schema definitions.

/// Complete schema for local SQLite database.
pub const SCHEMA: &str = r#"
-- Cards (parsed from local files)
CREATE TABLE IF NOT EXISTS cards (
    id INTEGER PRIMARY KEY,
    deck_path TEXT NOT NULL,
    question_text TEXT NOT NULL,
    answer_text TEXT NOT NULL,
    source_file TEXT NOT NULL,
    deleted_at TEXT
);

-- Card learning state
CREATE TABLE IF NOT EXISTS card_states (
    card_id INTEGER PRIMARY KEY REFERENCES cards(id),
    status TEXT NOT NULL DEFAULT 'new',
    interval_days REAL NOT NULL DEFAULT 0,
    ease_factor REAL NOT NULL DEFAULT 2.5,
    due_date TEXT,
    stability REAL,
    difficulty REAL,
    lapses INTEGER NOT NULL DEFAULT 0,
    reviews_count INTEGER NOT NULL DEFAULT 0
);

-- Reviews
CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id INTEGER REFERENCES cards(id),
    reviewed_at TEXT NOT NULL,
    rating INTEGER NOT NULL,
    rating_scale TEXT NOT NULL,
    answer_mode TEXT NOT NULL,
    typed_answer TEXT,
    was_correct INTEGER,
    time_taken_ms INTEGER,
    interval_before REAL,
    interval_after REAL,
    ease_before REAL,
    ease_after REAL,
    algorithm TEXT NOT NULL
);

-- Deck settings
CREATE TABLE IF NOT EXISTS deck_settings (
    deck_path TEXT PRIMARY KEY,
    algorithm TEXT,
    rating_scale TEXT,
    matching_mode TEXT,
    fuzzy_threshold REAL,
    new_cards_per_day INTEGER,
    reviews_per_day INTEGER
);

-- Global settings
CREATE TABLE IF NOT EXISTS global_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    algorithm TEXT NOT NULL DEFAULT 'sm2',
    rating_scale TEXT NOT NULL DEFAULT '4point',
    matching_mode TEXT NOT NULL DEFAULT 'fuzzy',
    fuzzy_threshold REAL NOT NULL DEFAULT 0.8,
    new_cards_per_day INTEGER NOT NULL DEFAULT 20,
    reviews_per_day INTEGER NOT NULL DEFAULT 200,
    daily_reset_hour INTEGER NOT NULL DEFAULT 0
);

-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cards_deck ON cards(deck_path);
CREATE INDEX IF NOT EXISTS idx_cards_deleted ON cards(deleted_at);
CREATE INDEX IF NOT EXISTS idx_card_states_due ON card_states(due_date);
"#;

/// Initialize global settings if not exists.
pub const INIT_GLOBAL_SETTINGS: &str = r#"
INSERT OR IGNORE INTO global_settings (id) VALUES (1);
"#;
