use rusqlite::{params, Connection};
use serde::Serialize;
use std::{fmt, path::Path};

pub const CURRENT_FORMAT_VERSION: i64 = 1;

const MIGRATIONS: &[(i64, &str)] = &[ (
    1,
    "
    CREATE TABLE story_metadata (
        singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
        format_version INTEGER NOT NULL,
        story_id TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        last_opened_at INTEGER,
        cover_definition_json TEXT NOT NULL DEFAULT '{}',
        appearance_json TEXT NOT NULL DEFAULT '{}',
        workspace_layout_json TEXT NOT NULL DEFAULT '{}'
    );
    ",
)];

#[derive(Debug)]
pub enum StoryStoreError {
    Database(rusqlite::Error),
    InvalidTitle,
    UnsupportedFutureFormat { found: i64, supported: i64 },
}

impl fmt::Display for StoryStoreError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Database(error) => write!(formatter, "SQLite error: {error}"),
            Self::InvalidTitle => write!(formatter, "A story title is required."),
            Self::UnsupportedFutureFormat { found, supported } => write!(
                formatter,
                "Story format version {found} is newer than this application supports ({supported})."
            ),
        }
    }
}

impl From<rusqlite::Error> for StoryStoreError {
    fn from(error: rusqlite::Error) -> Self {
        Self::Database(error)
    }
}

/// The sole native owner of an opened `.ffstory` database. Future persistence
/// commands must go through this service rather than exposing SQLite to React.
pub struct StoryStore {
    connection: Connection,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StorySummary {
    pub id: String,
    pub title: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub last_opened_at: Option<i64>,
}

impl StoryStore {
    pub fn open(path: &Path) -> Result<Self, StoryStoreError> {
        let mut connection = Connection::open(path)?;
        connection.execute_batch("PRAGMA foreign_keys = ON;")?;
        migrate(&mut connection)?;
        Ok(Self { connection })
    }

    pub fn format_version(&self) -> Result<i64, StoryStoreError> {
        Ok(self.connection.query_row("PRAGMA user_version", [], |row| row.get(0))?)
    }

    pub fn create(path: &Path, id: &str, title: &str, timestamp: i64) -> Result<Self, StoryStoreError> {
        if title.trim().is_empty() {
            return Err(StoryStoreError::InvalidTitle);
        }
        let store = Self::open(path)?;
        store.connection.execute(
            "INSERT INTO story_metadata (singleton, format_version, story_id, title, created_at, updated_at, last_opened_at) VALUES (1, ?1, ?2, ?3, ?4, ?4, ?4)",
            params![CURRENT_FORMAT_VERSION, id, title.trim(), timestamp],
        )?;
        Ok(store)
    }

    pub fn summary(&self) -> Result<StorySummary, StoryStoreError> {
        Ok(self.connection.query_row(
            "SELECT story_id, title, created_at, updated_at, last_opened_at FROM story_metadata WHERE singleton = 1",
            [],
            |row| Ok(StorySummary {
                id: row.get(0)?,
                title: row.get(1)?,
                created_at: row.get(2)?,
                updated_at: row.get(3)?,
                last_opened_at: row.get(4)?,
            }),
        )?)
    }

    pub fn mark_opened(&self, timestamp: i64) -> Result<StorySummary, StoryStoreError> {
        self.connection.execute(
            "UPDATE story_metadata SET last_opened_at = ?1 WHERE singleton = 1",
            [timestamp],
        )?;
        self.summary()
    }
}

pub fn migrate(connection: &mut Connection) -> Result<(), StoryStoreError> {
    let current_version: i64 = connection.query_row("PRAGMA user_version", [], |row| row.get(0))?;
    if current_version > CURRENT_FORMAT_VERSION {
        return Err(StoryStoreError::UnsupportedFutureFormat {
            found: current_version,
            supported: CURRENT_FORMAT_VERSION,
        });
    }

    for (version, statements) in MIGRATIONS {
        if *version <= current_version {
            continue;
        }
        let transaction = connection.transaction()?;
        transaction.execute_batch(statements)?;
        transaction.pragma_update(None, "user_version", version)?;
        transaction.execute(
            "UPDATE story_metadata SET format_version = ?1 WHERE singleton = 1",
            [version],
        )?;
        transaction.commit()?;
    }
    Ok(())
}
