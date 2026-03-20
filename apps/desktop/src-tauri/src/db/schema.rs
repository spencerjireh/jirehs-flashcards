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
    card_id INTEGER PRIMARY KEY REFERENCES cards(id) ON DELETE CASCADE,
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
    card_id INTEGER REFERENCES cards(id) ON DELETE CASCADE,
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

-- Watched directories (persisted for restore on restart)
CREATE TABLE IF NOT EXISTS watched_directories (
    path TEXT PRIMARY KEY,
    added_at TEXT NOT NULL
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

/// A database migration with a version number and SQL to execute.
pub struct Migration {
    pub version: i32,
    pub sql: &'static str,
}

/// Sequential migrations. Version 1 is the baseline (no-op for existing databases).
pub const MIGRATIONS: &[Migration] = &[
    Migration {
        version: 1,
        sql: "-- baseline: schema already created via CREATE TABLE IF NOT EXISTS",
    },
    Migration {
        version: 2,
        sql: "
-- Recreate card_states with ON DELETE CASCADE
CREATE TABLE card_states_new (
    card_id INTEGER PRIMARY KEY REFERENCES cards(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'new',
    interval_days REAL NOT NULL DEFAULT 0,
    ease_factor REAL NOT NULL DEFAULT 2.5,
    due_date TEXT,
    stability REAL,
    difficulty REAL,
    lapses INTEGER NOT NULL DEFAULT 0,
    reviews_count INTEGER NOT NULL DEFAULT 0
);
INSERT INTO card_states_new SELECT * FROM card_states;
DROP TABLE card_states;
ALTER TABLE card_states_new RENAME TO card_states;
CREATE INDEX IF NOT EXISTS idx_card_states_due ON card_states(due_date);

-- Recreate reviews with ON DELETE CASCADE
CREATE TABLE reviews_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id INTEGER REFERENCES cards(id) ON DELETE CASCADE,
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
INSERT INTO reviews_new SELECT * FROM reviews;
DROP TABLE reviews;
ALTER TABLE reviews_new RENAME TO reviews;
        ",
    },
    Migration {
        version: 3,
        sql: "
ALTER TABLE cards ADD COLUMN local_id INTEGER;
UPDATE cards SET local_id = id;
CREATE UNIQUE INDEX IF NOT EXISTS idx_cards_source_local ON cards(source_file, local_id);
        ",
    },
];

/// Run pending migrations. Each migration runs in its own transaction.
pub fn run_migrations(conn: &rusqlite::Connection) -> Result<(), crate::db::DbError> {
    let current_version: i32 = conn
        .query_row(
            "SELECT COALESCE(MAX(version), 0) FROM schema_version",
            [],
            |r| r.get(0),
        )
        .unwrap_or(0);

    for migration in MIGRATIONS {
        if migration.version > current_version {
            let tx = conn.unchecked_transaction()?;
            tx.execute_batch(migration.sql)?;
            tx.execute(
                "INSERT INTO schema_version (version) VALUES (?1)",
                rusqlite::params![migration.version],
            )?;
            tx.commit()?;
        }
    }

    Ok(())
}
