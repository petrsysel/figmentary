use rusqlite::Connection;
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
    UnsupportedFutureFormat { found: i64, supported: i64 },
}

impl fmt::Display for StoryStoreError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Database(error) => write!(formatter, "SQLite error: {error}"),
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
