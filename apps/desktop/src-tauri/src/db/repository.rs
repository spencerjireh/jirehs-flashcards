//! Repository pattern for database access.

use crate::db::date_utils::{get_adjusted_today, get_adjusted_today_string};
use crate::db::error::DbError;
use chrono::{DateTime, Utc};
use flashcard_core::types::{
    CalendarData, Card, CardState, CardStatus, Deck, DeckSettings, DeckStats, EffectiveSettings,
    GlobalSettings, MatchingMode, RatingScale, RawCard, Review, StudyStats,
};
use rusqlite::{params, Connection, OptionalExtension};
use std::collections::{HashMap, HashSet};
use std::path::Path;

type Result<T> = std::result::Result<T, DbError>;

/// Diff returned by import_cards showing what changed.
pub struct ImportDiff {
    pub added: usize,
    pub updated: usize,
    pub removed: usize,
    /// (line_number, local_id) for cards that need ID injection into the markdown file.
    pub id_assignments: Vec<(usize, i64)>,
}

/// Repository for card operations.
pub trait CardRepository {
    fn get_card(&self, id: i64) -> Result<Option<Card>>;
    fn get_new_cards(&self, deck_path: Option<&str>, limit: usize) -> Result<Vec<Card>>;
    fn get_due_cards(
        &self,
        deck_path: Option<&str>,
        limit: usize,
        daily_reset_hour: u32,
    ) -> Result<Vec<Card>>;
    fn get_all_deck_cards(&self, deck_path: &str) -> Result<Vec<Card>>;
}

/// Repository for card state operations.
pub trait StateRepository {
    fn get_card_state(&self, card_id: i64) -> Result<Option<CardState>>;
    fn save_card_state(&self, card_id: i64, state: &CardState) -> Result<()>;
}

/// Repository for deck operations.
pub trait DeckRepository {
    fn get_all_decks(&self, daily_reset_hour: u32) -> Result<Vec<Deck>>;
    fn get_deck(&self, path: &str, daily_reset_hour: u32) -> Result<Option<Deck>>;
}

/// Repository for settings operations.
pub trait SettingsRepository {
    fn get_global_settings(&self) -> Result<GlobalSettings>;
    fn save_global_settings(&self, settings: &GlobalSettings) -> Result<()>;
    fn get_deck_settings(&self, deck_path: &str) -> Result<Option<DeckSettings>>;
    fn save_deck_settings(&self, settings: &DeckSettings) -> Result<()>;
    fn delete_deck_settings(&self, deck_path: &str) -> Result<()>;
    fn get_effective_settings(&self, deck_path: Option<&str>) -> Result<EffectiveSettings>;
}

/// Repository for watched directory operations.
pub trait WatcherRepository {
    fn get_watched_directories(&self) -> Result<Vec<String>>;
    fn add_watched_directory(&self, path: &str) -> Result<()>;
    fn remove_watched_directory(&self, path: &str) -> Result<()>;
}

/// Repository for statistics operations.
pub trait StatsRepository {
    fn get_deck_stats(&self, deck_path: Option<&str>) -> Result<DeckStats>;
    fn get_study_stats(&self, daily_reset_hour: u32) -> Result<StudyStats>;
    fn get_calendar_data(&self, days: usize, daily_reset_hour: u32) -> Result<Vec<CalendarData>>;
}

/// SQLite implementation of repositories.
pub struct SqliteRepository {
    conn: Connection,
}

impl SqliteRepository {
    /// Open database at path, creating if necessary.
    pub fn open<P: AsRef<Path>>(path: P) -> Result<Self> {
        let conn = Connection::open(path)?;
        conn.execute_batch("PRAGMA foreign_keys = ON;")?;
        let repo = Self { conn };
        repo.initialize()?;
        Ok(repo)
    }

    fn initialize(&self) -> Result<()> {
        self.conn.execute_batch(super::schema::SCHEMA)?;
        self.conn.execute_batch(super::schema::INIT_GLOBAL_SETTINGS)?;
        super::schema::run_migrations(&self.conn)?;
        Ok(())
    }

    /// Import cards from parsed markdown, syncing the DB to match.
    /// Adds new cards, updates existing ones, and removes orphans no longer in the file.
    /// Uses (source_file, local_id) as the matching key to avoid cross-file ID collisions.
    pub fn import_cards(&self, deck_path: &str, source_file: &str, raw_cards: &[RawCard]) -> Result<ImportDiff> {
        let tx = self.conn.unchecked_transaction()?;

        // Build map of existing cards: local_id -> db_id
        let mut existing_map: HashMap<i64, i64> = HashMap::new();
        let mut existing_db_ids: HashSet<i64> = HashSet::new();
        let mut max_existing_local_id: i64 = 0;
        {
            let mut stmt = tx.prepare(
                "SELECT id, local_id FROM cards WHERE source_file = ?1 AND deleted_at IS NULL",
            )?;
            let rows = stmt.query_map(params![source_file], |row| {
                Ok((row.get::<_, i64>(0)?, row.get::<_, Option<i64>>(1)?))
            })?;
            for row in rows {
                let (db_id, local_id) = row?;
                existing_db_ids.insert(db_id);
                if let Some(lid) = local_id {
                    existing_map.insert(lid, db_id);
                    if lid > max_existing_local_id {
                        max_existing_local_id = lid;
                    }
                }
            }
        }

        // Compute starting local_id for cards without IDs
        let max_incoming_id = raw_cards.iter().filter_map(|r| r.id).max().unwrap_or(0);
        let mut next_local_id = std::cmp::max(max_existing_local_id, max_incoming_id) + 1;

        let mut added = 0usize;
        let mut updated = 0usize;
        let mut seen_db_ids: HashSet<i64> = HashSet::new();
        let mut id_assignments: Vec<(usize, i64)> = Vec::new();

        for raw in raw_cards {
            let (db_id, _) = if let Some(lid) = raw.id {
                // Card has an ID in the markdown (= local_id)
                if let Some(&existing_db_id) = existing_map.get(&lid) {
                    // Update existing card
                    tx.execute(
                        "UPDATE cards SET deck_path = ?1, question_text = ?2, answer_text = ?3, source_file = ?4 WHERE id = ?5",
                        params![deck_path, raw.question, raw.answer, source_file, existing_db_id],
                    )?;
                    updated += 1;
                    (existing_db_id, lid)
                } else {
                    // New card with explicit local_id
                    tx.execute(
                        "INSERT INTO cards (local_id, deck_path, question_text, answer_text, source_file) VALUES (?1, ?2, ?3, ?4, ?5)",
                        params![lid, deck_path, raw.question, raw.answer, source_file],
                    )?;
                    added += 1;
                    (tx.last_insert_rowid(), lid)
                }
            } else {
                // Card has no ID -- assign next_local_id
                let lid = next_local_id;
                next_local_id += 1;
                tx.execute(
                    "INSERT INTO cards (local_id, deck_path, question_text, answer_text, source_file) VALUES (?1, ?2, ?3, ?4, ?5)",
                    params![lid, deck_path, raw.question, raw.answer, source_file],
                )?;
                added += 1;
                id_assignments.push((raw.line_number, lid));
                (tx.last_insert_rowid(), lid)
            };
            seen_db_ids.insert(db_id);

            // Initialize card state if not exists
            tx.execute(
                "INSERT OR IGNORE INTO card_states (card_id) VALUES (?1)",
                params![db_id],
            )?;
        }

        // Remove orphaned cards (in DB but no longer in the file)
        let orphans: Vec<i64> = existing_db_ids.difference(&seen_db_ids).copied().collect();
        for orphan_id in &orphans {
            tx.execute("DELETE FROM cards WHERE id = ?1", params![orphan_id])?;
        }

        tx.commit()?;
        Ok(ImportDiff { added, updated, removed: orphans.len(), id_assignments })
    }

    /// Soft-delete all cards from a specific source file.
    pub fn delete_cards_by_source_file(&self, source_file: &str) -> Result<usize> {
        let now = Utc::now().to_rfc3339();
        let count = self.conn.execute(
            "UPDATE cards SET deleted_at = ?1 WHERE source_file = ?2 AND deleted_at IS NULL",
            params![now, source_file],
        )?;
        Ok(count)
    }

    /// Remove a deck entirely from the database (cards + settings).
    /// The markdown file on disk is not touched.
    pub fn remove_deck(&self, deck_path: &str) -> Result<usize> {
        let tx = self.conn.unchecked_transaction()?;
        // CASCADE handles card_states + reviews
        let count = tx.execute(
            "DELETE FROM cards WHERE deck_path = ?1",
            params![deck_path],
        )?;
        tx.execute(
            "DELETE FROM deck_settings WHERE deck_path = ?1",
            params![deck_path],
        )?;
        tx.commit()?;
        Ok(count)
    }

    /// Atomically save card state and insert review in a single transaction.
    pub fn submit_review_atomic(&self, card_id: i64, state: &CardState, review: &Review) -> Result<i64> {
        let tx = self.conn.unchecked_transaction()?;

        let status_str = state.status.as_str();
        let due_str = state.due_date.map(|d| d.to_rfc3339());

        tx.execute(
            "INSERT OR REPLACE INTO card_states (card_id, status, interval_days, ease_factor, due_date, stability, difficulty, lapses, reviews_count) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![card_id, status_str, state.interval_days, state.ease_factor, due_str, state.stability, state.difficulty, state.lapses, state.reviews_count],
        )?;

        tx.execute(
            "INSERT INTO reviews (card_id, reviewed_at, rating, rating_scale, answer_mode,
                typed_answer, was_correct, time_taken_ms, interval_before, interval_after,
                ease_before, ease_after, algorithm)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
            params![
                review.card_id,
                review.reviewed_at,
                review.rating,
                review.rating_scale,
                review.answer_mode,
                review.typed_answer,
                review.was_correct.map(|b| if b { 1 } else { 0 }),
                review.time_taken_ms,
                review.interval_before,
                review.interval_after,
                review.ease_before,
                review.ease_after,
                review.algorithm,
            ],
        )?;

        let review_id = tx.last_insert_rowid();
        tx.commit()?;
        Ok(review_id)
    }
}

impl CardRepository for SqliteRepository {
    fn get_card(&self, id: i64) -> Result<Option<Card>> {
        self.conn
            .query_row(
                "SELECT id, deck_path, question_text, answer_text, source_file FROM cards WHERE id = ?1 AND deleted_at IS NULL",
                params![id],
                Self::row_to_card,
            )
            .optional()
            .map_err(Into::into)
    }

    fn get_new_cards(&self, deck_path: Option<&str>, limit: usize) -> Result<Vec<Card>> {
        let sql = match deck_path {
            Some(_) => "SELECT c.id, c.deck_path, c.question_text, c.answer_text, c.source_file
                FROM cards c
                JOIN card_states cs ON c.id = cs.card_id
                WHERE c.deck_path = ?1 AND c.deleted_at IS NULL AND cs.status = 'new'
                LIMIT ?2",
            None => "SELECT c.id, c.deck_path, c.question_text, c.answer_text, c.source_file
                FROM cards c
                JOIN card_states cs ON c.id = cs.card_id
                WHERE c.deleted_at IS NULL AND cs.status = 'new'
                LIMIT ?1",
        };

        let mut stmt = self.conn.prepare(sql)?;
        let cards = if let Some(path) = deck_path {
            stmt.query_map(params![path, limit], Self::row_to_card)?
        } else {
            stmt.query_map(params![limit], Self::row_to_card)?
        };

        cards.collect::<std::result::Result<Vec<_>, _>>().map_err(Into::into)
    }

    fn get_due_cards(
        &self,
        deck_path: Option<&str>,
        limit: usize,
        daily_reset_hour: u32,
    ) -> Result<Vec<Card>> {
        let today = get_adjusted_today_string(daily_reset_hour);
        let sql = match deck_path {
            Some(_) => "SELECT c.id, c.deck_path, c.question_text, c.answer_text, c.source_file
                FROM cards c
                JOIN card_states cs ON c.id = cs.card_id
                WHERE c.deck_path = ?1 AND c.deleted_at IS NULL AND cs.status != 'new' AND cs.due_date <= ?2
                ORDER BY cs.due_date
                LIMIT ?3",
            None => "SELECT c.id, c.deck_path, c.question_text, c.answer_text, c.source_file
                FROM cards c
                JOIN card_states cs ON c.id = cs.card_id
                WHERE c.deleted_at IS NULL AND cs.status != 'new' AND cs.due_date <= ?1
                ORDER BY cs.due_date
                LIMIT ?2",
        };

        let mut stmt = self.conn.prepare(sql)?;
        let cards = if let Some(path) = deck_path {
            stmt.query_map(params![path, today, limit], Self::row_to_card)?
        } else {
            stmt.query_map(params![today, limit], Self::row_to_card)?
        };

        cards.collect::<std::result::Result<Vec<_>, _>>().map_err(Into::into)
    }

    fn get_all_deck_cards(&self, deck_path: &str) -> Result<Vec<Card>> {
        let mut stmt = self.conn.prepare(
            "SELECT c.id, c.deck_path, c.question_text, c.answer_text, c.source_file
             FROM cards c
             WHERE c.deck_path = ?1 AND c.deleted_at IS NULL
             ORDER BY c.id",
        )?;
        let cards = stmt.query_map(params![deck_path], Self::row_to_card)?;
        cards.collect::<std::result::Result<Vec<_>, _>>().map_err(Into::into)
    }
}

impl SqliteRepository {
    fn row_to_card(row: &rusqlite::Row) -> rusqlite::Result<Card> {
        Ok(Card {
            id: row.get(0)?,
            deck_path: row.get(1)?,
            question: row.get(2)?,
            answer: row.get(3)?,
            source_file: row.get(4)?,
            deleted_at: None,
        })
    }
}

impl StateRepository for SqliteRepository {
    fn get_card_state(&self, card_id: i64) -> Result<Option<CardState>> {
        self.conn
            .query_row(
                "SELECT status, interval_days, ease_factor, due_date, stability, difficulty, lapses, reviews_count FROM card_states WHERE card_id = ?1",
                params![card_id],
                |row| {
                    let status_str: String = row.get(0)?;
                    let status = status_str.parse::<CardStatus>().unwrap_or_default();
                    let due_str: Option<String> = row.get(3)?;
                    let due_date = due_str.and_then(|s| DateTime::parse_from_rfc3339(&s).ok().map(|dt| dt.with_timezone(&Utc)));

                    Ok(CardState {
                        status,
                        interval_days: row.get(1)?,
                        ease_factor: row.get(2)?,
                        due_date,
                        stability: row.get(4)?,
                        difficulty: row.get(5)?,
                        lapses: row.get(6)?,
                        reviews_count: row.get(7)?,
                    })
                },
            )
            .optional()
            .map_err(Into::into)
    }

    fn save_card_state(&self, card_id: i64, state: &CardState) -> Result<()> {
        let status_str = state.status.as_str();
        let due_str = state.due_date.map(|d| d.to_rfc3339());

        self.conn.execute(
            "INSERT OR REPLACE INTO card_states (card_id, status, interval_days, ease_factor, due_date, stability, difficulty, lapses, reviews_count) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![card_id, status_str, state.interval_days, state.ease_factor, due_str, state.stability, state.difficulty, state.lapses, state.reviews_count],
        )?;
        Ok(())
    }
}

impl DeckRepository for SqliteRepository {
    fn get_all_decks(&self, daily_reset_hour: u32) -> Result<Vec<Deck>> {
        let today = get_adjusted_today_string(daily_reset_hour);
        let mut stmt = self.conn.prepare(
            "SELECT deck_path, COUNT(*) as total,
                SUM(CASE WHEN cs.status = 'new' THEN 1 ELSE 0 END) as new_count,
                SUM(CASE WHEN cs.status != 'new' AND cs.due_date <= ?1 THEN 1 ELSE 0 END) as due_count
            FROM cards c
            LEFT JOIN card_states cs ON c.id = cs.card_id
            WHERE c.deleted_at IS NULL
            GROUP BY deck_path",
        )?;

        let decks = stmt
            .query_map(params![today], |row| {
                let path: String = row.get(0)?;
                let name = path.rsplit('/').next().unwrap_or(&path).to_string();
                Ok(Deck {
                    path: path.clone(),
                    name,
                    card_count: row.get(1)?,
                    new_count: row.get(2)?,
                    due_count: row.get(3)?,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;

        Ok(decks)
    }

    fn get_deck(&self, path: &str, daily_reset_hour: u32) -> Result<Option<Deck>> {
        let today = get_adjusted_today_string(daily_reset_hour);
        self.conn
            .query_row(
                "SELECT deck_path, COUNT(*) as total,
                    SUM(CASE WHEN cs.status = 'new' THEN 1 ELSE 0 END) as new_count,
                    SUM(CASE WHEN cs.status != 'new' AND cs.due_date <= ?1 THEN 1 ELSE 0 END) as due_count
                FROM cards c
                LEFT JOIN card_states cs ON c.id = cs.card_id
                WHERE c.deleted_at IS NULL AND c.deck_path = ?2
                GROUP BY deck_path",
                params![today, path],
                |row| {
                    let path: String = row.get(0)?;
                    let name = path.rsplit('/').next().unwrap_or(&path).to_string();
                    Ok(Deck {
                        path: path.clone(),
                        name,
                        card_count: row.get(1)?,
                        new_count: row.get(2)?,
                        due_count: row.get(3)?,
                    })
                },
            )
            .optional()
            .map_err(Into::into)
    }
}

impl SettingsRepository for SqliteRepository {
    fn get_global_settings(&self) -> Result<GlobalSettings> {
        self.conn
            .query_row(
                "SELECT algorithm, rating_scale, matching_mode, fuzzy_threshold, new_cards_per_day, reviews_per_day, daily_reset_hour FROM global_settings WHERE id = 1",
                [],
                |row| {
                    let algorithm_str: String = row.get(0)?;
                    let rating_scale_str: String = row.get(1)?;
                    let matching_mode_str: String = row.get(2)?;

                    Ok(GlobalSettings {
                        algorithm: algorithm_str.parse().unwrap_or_default(),
                        rating_scale: match rating_scale_str.as_str() {
                            "2point" => RatingScale::TwoPoint,
                            _ => RatingScale::FourPoint,
                        },
                        matching_mode: match matching_mode_str.as_str() {
                            "exact" => MatchingMode::Exact,
                            "case_insensitive" => MatchingMode::CaseInsensitive,
                            _ => MatchingMode::Fuzzy,
                        },
                        fuzzy_threshold: row.get(3)?,
                        new_cards_per_day: row.get(4)?,
                        reviews_per_day: row.get(5)?,
                        daily_reset_hour: row.get(6)?,
                    })
                },
            )
            .map_err(Into::into)
    }

    fn save_global_settings(&self, settings: &GlobalSettings) -> Result<()> {
        let algorithm_str = settings.algorithm.as_str();
        let rating_scale_str = match settings.rating_scale {
            RatingScale::FourPoint => "4point",
            RatingScale::TwoPoint => "2point",
        };
        let matching_mode_str = match settings.matching_mode {
            MatchingMode::Exact => "exact",
            MatchingMode::CaseInsensitive => "case_insensitive",
            MatchingMode::Fuzzy => "fuzzy",
        };

        self.conn.execute(
            "UPDATE global_settings SET algorithm = ?1, rating_scale = ?2, matching_mode = ?3, fuzzy_threshold = ?4, new_cards_per_day = ?5, reviews_per_day = ?6, daily_reset_hour = ?7 WHERE id = 1",
            params![
                algorithm_str,
                rating_scale_str,
                matching_mode_str,
                settings.fuzzy_threshold,
                settings.new_cards_per_day,
                settings.reviews_per_day,
                settings.daily_reset_hour,
            ],
        )?;

        Ok(())
    }

    fn get_deck_settings(&self, deck_path: &str) -> Result<Option<DeckSettings>> {
        self.conn
            .query_row(
                "SELECT deck_path, algorithm, rating_scale, matching_mode, fuzzy_threshold, new_cards_per_day, reviews_per_day FROM deck_settings WHERE deck_path = ?1",
                params![deck_path],
                |row| {
                    let deck_path: String = row.get(0)?;
                    let algorithm_str: Option<String> = row.get(1)?;
                    let rating_scale_str: Option<String> = row.get(2)?;
                    let matching_mode_str: Option<String> = row.get(3)?;

                    Ok(DeckSettings {
                        deck_path,
                        algorithm: algorithm_str.and_then(|s| s.parse().ok()),
                        rating_scale: rating_scale_str.map(|s| match s.as_str() {
                            "2point" => RatingScale::TwoPoint,
                            _ => RatingScale::FourPoint,
                        }),
                        matching_mode: matching_mode_str.map(|s| match s.as_str() {
                            "exact" => MatchingMode::Exact,
                            "case_insensitive" => MatchingMode::CaseInsensitive,
                            _ => MatchingMode::Fuzzy,
                        }),
                        fuzzy_threshold: row.get(4)?,
                        new_cards_per_day: row.get(5)?,
                        reviews_per_day: row.get(6)?,
                    })
                },
            )
            .optional()
            .map_err(Into::into)
    }

    fn save_deck_settings(&self, settings: &DeckSettings) -> Result<()> {
        let algorithm_str = settings.algorithm.map(|a| a.as_str().to_string());
        let rating_scale_str = settings.rating_scale.map(|rs| match rs {
            RatingScale::FourPoint => "4point".to_string(),
            RatingScale::TwoPoint => "2point".to_string(),
        });
        let matching_mode_str = settings.matching_mode.map(|mm| match mm {
            MatchingMode::Exact => "exact".to_string(),
            MatchingMode::CaseInsensitive => "case_insensitive".to_string(),
            MatchingMode::Fuzzy => "fuzzy".to_string(),
        });

        self.conn.execute(
            "INSERT OR REPLACE INTO deck_settings (deck_path, algorithm, rating_scale, matching_mode, fuzzy_threshold, new_cards_per_day, reviews_per_day) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                settings.deck_path,
                algorithm_str,
                rating_scale_str,
                matching_mode_str,
                settings.fuzzy_threshold,
                settings.new_cards_per_day,
                settings.reviews_per_day,
            ],
        )?;

        Ok(())
    }

    fn delete_deck_settings(&self, deck_path: &str) -> Result<()> {
        self.conn.execute(
            "DELETE FROM deck_settings WHERE deck_path = ?1",
            params![deck_path],
        )?;
        Ok(())
    }

    fn get_effective_settings(&self, deck_path: Option<&str>) -> Result<EffectiveSettings> {
        let global = self.get_global_settings()?;
        let deck = match deck_path {
            Some(path) => self.get_deck_settings(path)?,
            None => None,
        };
        Ok(EffectiveSettings::merge(&global, deck.as_ref()))
    }
}

impl StatsRepository for SqliteRepository {
    fn get_deck_stats(&self, deck_path: Option<&str>) -> Result<DeckStats> {
        let (total, new, learning, review, avg_ease, avg_interval) = match deck_path {
            Some(path) => {
                self.conn.query_row(
                    "SELECT
                        COUNT(*) as total,
                        SUM(CASE WHEN cs.status = 'new' THEN 1 ELSE 0 END) as new_count,
                        SUM(CASE WHEN cs.status = 'learning' OR cs.status = 'relearning' THEN 1 ELSE 0 END) as learning_count,
                        SUM(CASE WHEN cs.status = 'review' THEN 1 ELSE 0 END) as review_count,
                        COALESCE(AVG(cs.ease_factor), 2.5) as avg_ease,
                        COALESCE(AVG(CASE WHEN cs.interval_days > 0 THEN cs.interval_days END), 0) as avg_interval
                    FROM cards c
                    LEFT JOIN card_states cs ON c.id = cs.card_id
                    WHERE c.deleted_at IS NULL AND c.deck_path = ?1",
                    params![path],
                    |row| Ok((
                        row.get::<_, usize>(0)?,
                        row.get::<_, usize>(1)?,
                        row.get::<_, usize>(2)?,
                        row.get::<_, usize>(3)?,
                        row.get::<_, f64>(4)?,
                        row.get::<_, f64>(5)?,
                    )),
                )?
            }
            None => {
                self.conn.query_row(
                    "SELECT
                        COUNT(*) as total,
                        SUM(CASE WHEN cs.status = 'new' THEN 1 ELSE 0 END) as new_count,
                        SUM(CASE WHEN cs.status = 'learning' OR cs.status = 'relearning' THEN 1 ELSE 0 END) as learning_count,
                        SUM(CASE WHEN cs.status = 'review' THEN 1 ELSE 0 END) as review_count,
                        COALESCE(AVG(cs.ease_factor), 2.5) as avg_ease,
                        COALESCE(AVG(CASE WHEN cs.interval_days > 0 THEN cs.interval_days END), 0) as avg_interval
                    FROM cards c
                    LEFT JOIN card_states cs ON c.id = cs.card_id
                    WHERE c.deleted_at IS NULL",
                    [],
                    |row| Ok((
                        row.get::<_, usize>(0)?,
                        row.get::<_, usize>(1)?,
                        row.get::<_, usize>(2)?,
                        row.get::<_, usize>(3)?,
                        row.get::<_, f64>(4)?,
                        row.get::<_, f64>(5)?,
                    )),
                )?
            }
        };

        Ok(DeckStats {
            total_cards: total,
            new_cards: new,
            learning_cards: learning,
            review_cards: review,
            average_ease: avg_ease,
            average_interval: avg_interval,
        })
    }

    fn get_study_stats(&self, daily_reset_hour: u32) -> Result<StudyStats> {
        let today = get_adjusted_today_string(daily_reset_hour);
        let today_date = get_adjusted_today(daily_reset_hour);

        // Get today's review count
        let reviews_today: usize = self.conn.query_row(
            "SELECT COUNT(*) FROM reviews WHERE date(reviewed_at) = ?1",
            params![today],
            |row| row.get(0),
        ).unwrap_or(0);

        // Get today's new cards seen (cards that were 'new' status and got reviewed today)
        let new_today: usize = self.conn.query_row(
            "SELECT COUNT(DISTINCT card_id) FROM reviews
             WHERE date(reviewed_at) = ?1",
            params![today],
            |row| row.get(0),
        ).unwrap_or(0);

        // Get total reviews
        let total_reviews: usize = self.conn.query_row(
            "SELECT COUNT(*) FROM reviews",
            [],
            |row| row.get(0),
        ).unwrap_or(0);

        // Calculate streak: fetch all distinct review dates, count consecutive days in Rust
        let mut streak_days = 0usize;
        {
            let mut stmt = self.conn.prepare(
                "SELECT DISTINCT date(reviewed_at) as d FROM reviews ORDER BY d DESC",
            )?;
            let dates: Vec<String> = stmt
                .query_map([], |row| row.get::<_, String>(0))?
                .collect::<std::result::Result<Vec<_>, _>>()?;

            let mut expected = today_date;
            let mut idx = 0;

            // Allow for today not having reviews yet
            if dates.first().map(|d| d.as_str()) != Some(&today) {
                expected = expected.pred_opt().unwrap_or(expected);
            }

            while idx < dates.len() {
                let expected_str = expected.format("%Y-%m-%d").to_string();
                if dates[idx] == expected_str {
                    streak_days += 1;
                    expected = expected.pred_opt().unwrap_or(expected);
                    idx += 1;
                } else {
                    break;
                }
            }
        }

        // Calculate retention rate (correct reviews / total reviews)
        let retention_rate: f64 = self.conn.query_row(
            "SELECT COALESCE(
                CAST(SUM(CASE WHEN rating >= 3 THEN 1 ELSE 0 END) AS REAL) /
                NULLIF(COUNT(*), 0),
                0.0
            ) FROM reviews",
            [],
            |row| row.get(0),
        ).unwrap_or(0.0);

        Ok(StudyStats {
            reviews_today,
            new_today,
            streak_days,
            retention_rate,
            total_reviews,
        })
    }

    fn get_calendar_data(&self, days: usize, daily_reset_hour: u32) -> Result<Vec<CalendarData>> {
        let today = get_adjusted_today(daily_reset_hour);
        let start_date = today - chrono::Duration::days(days as i64 - 1);
        let start_str = start_date.format("%Y-%m-%d").to_string();
        let today_str = today.format("%Y-%m-%d").to_string();

        // Single query: group review counts by date
        let mut stmt = self.conn.prepare(
            "SELECT date(reviewed_at) as review_date, COUNT(*) as review_count
             FROM reviews
             WHERE date(reviewed_at) BETWEEN ?1 AND ?2
             GROUP BY date(reviewed_at)",
        )?;

        let mut review_map: HashMap<String, usize> = HashMap::new();
        let rows = stmt.query_map(params![start_str, today_str], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, usize>(1)?))
        })?;
        for row in rows {
            let (date, count) = row?;
            review_map.insert(date, count);
        }

        // Fill in all days (including zero-review days)
        let mut data = Vec::with_capacity(days);
        for i in 0..days {
            let date = start_date + chrono::Duration::days(i as i64);
            let date_str = date.format("%Y-%m-%d").to_string();
            let reviews = review_map.get(&date_str).copied().unwrap_or(0);
            data.push(CalendarData { date: date_str, reviews });
        }

        Ok(data)
    }
}

impl WatcherRepository for SqliteRepository {
    fn get_watched_directories(&self) -> Result<Vec<String>> {
        let mut stmt = self.conn.prepare("SELECT path FROM watched_directories ORDER BY added_at")?;
        let dirs = stmt
            .query_map([], |row| row.get::<_, String>(0))?
            .collect::<std::result::Result<Vec<_>, _>>()?;
        Ok(dirs)
    }

    fn add_watched_directory(&self, path: &str) -> Result<()> {
        let now = Utc::now().to_rfc3339();
        self.conn.execute(
            "INSERT OR IGNORE INTO watched_directories (path, added_at) VALUES (?1, ?2)",
            params![path, now],
        )?;
        Ok(())
    }

    fn remove_watched_directory(&self, path: &str) -> Result<()> {
        self.conn.execute(
            "DELETE FROM watched_directories WHERE path = ?1",
            params![path],
        )?;
        Ok(())
    }
}
