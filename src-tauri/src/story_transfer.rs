use crate::story_store::{StoryStore, StorySummary, CURRENT_FORMAT_VERSION};
use rusqlite::{Connection, OpenFlags};
use std::{fmt, fs, io, path::Path};
use uuid::Uuid;

#[derive(Debug)]
pub enum TransferError {
    InvalidStory(String),
    NewerVersion(i64),
    ExistingFile,
    FileOperation(String),
}

impl TransferError {
    pub fn code(&self) -> &'static str {
        match self {
            Self::InvalidStory(_) => "INVALID_STORY",
            Self::NewerVersion(_) => "NEWER_STORY",
            Self::ExistingFile => "FILE_EXISTS",
            Self::FileOperation(_) => "FILE_ERROR",
        }
    }
}

impl fmt::Display for TransferError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidStory(detail) => write!(formatter, "Invalid story: {detail}"),
            Self::NewerVersion(version) => write!(
                formatter,
                "Story format {version} is newer than supported format {CURRENT_FORMAT_VERSION}"
            ),
            Self::ExistingFile => write!(formatter, "The export destination already exists"),
            Self::FileOperation(detail) => write!(formatter, "File operation failed: {detail}"),
        }
    }
}

fn invalid(error: impl fmt::Display) -> TransferError {
    TransferError::InvalidStory(error.to_string())
}

fn file_error(error: impl fmt::Display) -> TransferError {
    TransferError::FileOperation(error.to_string())
}

fn inspect_source(path: &Path) -> Result<Connection, TransferError> {
    if !path.is_file() || !is_story_path(path) {
        return Err(invalid("Expected a .ffstory file"));
    }
    let connection = Connection::open_with_flags(
        path,
        OpenFlags::SQLITE_OPEN_READ_ONLY | OpenFlags::SQLITE_OPEN_NO_MUTEX,
    )
    .map_err(invalid)?;
    connection
        .execute_batch("PRAGMA trusted_schema = OFF;")
        .map_err(invalid)?;
    let version: i64 = connection
        .query_row("PRAGMA user_version", [], |row| row.get(0))
        .map_err(invalid)?;
    if version > CURRENT_FORMAT_VERSION {
        return Err(TransferError::NewerVersion(version));
    }
    if version < 1 {
        return Err(invalid("Missing supported story format version"));
    }
    let (id, title, stored_version): (String, String, i64) = connection
        .query_row(
            "SELECT story_id, title, format_version FROM story_metadata WHERE singleton = 1",
            [],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .map_err(invalid)?;
    if stored_version != version || Uuid::parse_str(&id).is_err() || title.trim().is_empty() {
        return Err(invalid("Story metadata is inconsistent"));
    }
    let unsafe_schema_entries: i64 = connection
        .query_row(
            "SELECT COUNT(*) FROM sqlite_schema WHERE type IN ('trigger', 'view')",
            [],
            |row| row.get(0),
        )
        .map_err(invalid)?;
    if unsafe_schema_entries != 0 {
        return Err(invalid("Unsupported schema objects"));
    }
    if version >= 2 {
        connection.query_row(
            "SELECT COUNT(*) FROM documents WHERE id IS NULL OR title IS NULL OR updated_at IS NULL OR type NOT IN ('markdown', 'pdf', 'image') OR (type = 'markdown' AND markdown IS NULL)",
            [],
            |row| row.get::<_, i64>(0),
        ).and_then(|invalid_documents| {
            if invalid_documents == 0 { Ok(()) } else { Err(rusqlite::Error::InvalidQuery) }
        }).map_err(invalid)?;
    }
    let integrity: String = connection
        .query_row("PRAGMA quick_check", [], |row| row.get(0))
        .map_err(invalid)?;
    if integrity != "ok" {
        return Err(invalid(integrity));
    }
    Ok(connection)
}

fn is_story_path(path: &Path) -> bool {
    path.extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| extension.eq_ignore_ascii_case("ffstory"))
}

fn snapshot_into(connection: &Connection, destination: &Path) -> Result<(), TransferError> {
    let path = destination
        .to_str()
        .ok_or_else(|| file_error("The selected path is not valid Unicode"))?;
    connection
        .execute("VACUUM INTO ?1", [path])
        .map_err(file_error)?;
    Ok(())
}

pub fn import_story(
    source: &Path,
    stories_directory: &Path,
    timestamp: i64,
) -> Result<StorySummary, TransferError> {
    let connection = inspect_source(source)?;
    let id = Uuid::new_v4().to_string();
    let staging = stories_directory.join(format!(".import-{id}.tmp"));
    let destination = stories_directory.join(format!("{id}.ffstory"));
    if staging.exists() || destination.exists() {
        return Err(TransferError::ExistingFile);
    }
    let result = (|| {
        snapshot_into(&connection, &staging)?;
        drop(connection);
        let store = StoryStore::open(&staging).map_err(invalid)?;
        let summary = store
            .assign_import_identity(&id, timestamp)
            .map_err(invalid)?;
        drop(store);
        fs::rename(&staging, &destination).map_err(file_error)?;
        Ok(summary)
    })();
    if result.is_err() {
        let _ = fs::remove_file(&staging);
    }
    result
}

pub fn export_story(source: &Path, destination: &Path) -> Result<(), TransferError> {
    if !is_story_path(destination) {
        return Err(file_error("Choose a .ffstory destination"));
    }
    if destination.exists() {
        return Err(TransferError::ExistingFile);
    }
    let connection = inspect_source(source)?;
    let parent = destination
        .parent()
        .ok_or_else(|| file_error("Missing destination directory"))?;
    let staging = parent.join(format!(".figmentfell-export-{}.tmp", Uuid::new_v4()));
    let result = (|| {
        snapshot_into(&connection, &staging)?;
        drop(connection);
        match fs::hard_link(&staging, destination) {
            Ok(()) => Ok(()),
            Err(error) if error.kind() == io::ErrorKind::AlreadyExists => {
                Err(TransferError::ExistingFile)
            }
            Err(_) => {
                let mut input = fs::File::open(&staging).map_err(file_error)?;
                let mut output = fs::OpenOptions::new()
                    .write(true)
                    .create_new(true)
                    .open(destination)
                    .map_err(|error| {
                        if error.kind() == io::ErrorKind::AlreadyExists {
                            TransferError::ExistingFile
                        } else {
                            file_error(error)
                        }
                    })?;
                if let Err(error) =
                    io::copy(&mut input, &mut output).and_then(|_| output.sync_all())
                {
                    drop(output);
                    let _ = fs::remove_file(destination);
                    return Err(file_error(error));
                }
                Ok(())
            }
        }
    })();
    let _ = fs::remove_file(&staging);
    result
}

pub fn suggested_file_name(title: &str) -> String {
    let safe: String = title
        .chars()
        .map(|character| {
            if character.is_control()
                || matches!(
                    character,
                    '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|'
                )
            {
                '_'
            } else {
                character
            }
        })
        .take(80)
        .collect();
    let safe = safe.trim().trim_matches('.');
    format!(
        "{}.ffstory",
        if safe.is_empty() { "FigmentFell" } else { safe }
    )
}
