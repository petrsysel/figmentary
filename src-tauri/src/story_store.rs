use rusqlite::{params, Connection};
use serde::Serialize;
use std::{fmt, path::Path};

pub const CURRENT_FORMAT_VERSION: i64 = 2;

const MIGRATIONS: &[(i64, &str)] = &[
    (1, "CREATE TABLE story_metadata (singleton INTEGER PRIMARY KEY CHECK (singleton = 1), format_version INTEGER NOT NULL, story_id TEXT NOT NULL UNIQUE, title TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, last_opened_at INTEGER, cover_definition_json TEXT NOT NULL DEFAULT '{}', appearance_json TEXT NOT NULL DEFAULT '{}', workspace_layout_json TEXT NOT NULL DEFAULT '{}');"),
    (2, "CREATE TABLE documents (id TEXT PRIMARY KEY, type TEXT NOT NULL CHECK (type IN ('markdown', 'pdf', 'image')), title TEXT NOT NULL, markdown TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL); INSERT INTO documents (id, type, title, markdown, created_at, updated_at) SELECT 'journal', 'markdown', 'Journal', '# Journal\\n\\n', created_at, updated_at FROM story_metadata; UPDATE story_metadata SET workspace_layout_json = '{\"left\":{\"tabs\":[\"journal\"],\"activeTabId\":\"journal\"},\"right\":{\"tabs\":[],\"activeTabId\":null},\"sizes\":[45,35,20],\"collapsed\":[false,false,false]}' WHERE workspace_layout_json = '{}';"),
];

#[derive(Debug)]
pub enum StoryStoreError { Database(rusqlite::Error), InvalidTitle, UnsupportedFutureFormat { found: i64, supported: i64 } }
impl fmt::Display for StoryStoreError { fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result { match self { Self::Database(e) => write!(f, "SQLite error: {e}"), Self::InvalidTitle => write!(f, "A story title is required."), Self::UnsupportedFutureFormat { found, supported } => write!(f, "Story format version {found} is newer than this application supports ({supported}).") } } }
impl From<rusqlite::Error> for StoryStoreError { fn from(error: rusqlite::Error) -> Self { Self::Database(error) } }

pub struct StoryStore { connection: Connection }
#[derive(Serialize)] #[serde(rename_all = "camelCase")]
pub struct StorySummary { pub id: String, pub title: String, pub created_at: i64, pub updated_at: i64, pub last_opened_at: Option<i64> }
#[derive(Serialize)] #[serde(rename_all = "camelCase")]
pub struct StoryDocument { pub id: String, pub document_type: String, pub title: String, pub markdown: Option<String>, pub updated_at: i64 }
#[derive(Serialize)] #[serde(rename_all = "camelCase")]
pub struct StoryWorkspace { pub story: StorySummary, pub documents: Vec<StoryDocument>, pub workspace_layout_json: String }

impl StoryStore {
    pub fn open(path: &Path) -> Result<Self, StoryStoreError> { let mut connection = Connection::open(path)?; connection.busy_timeout(std::time::Duration::from_secs(3))?; connection.execute_batch("PRAGMA foreign_keys = ON;")?; migrate(&mut connection)?; Ok(Self { connection }) }
    pub fn create(path: &Path, id: &str, title: &str, timestamp: i64) -> Result<Self, StoryStoreError> {
        if title.trim().is_empty() { return Err(StoryStoreError::InvalidTitle); }
        let store = Self::open(path)?;
        store.connection.execute("INSERT INTO story_metadata (singleton, format_version, story_id, title, created_at, updated_at, last_opened_at) VALUES (1, ?1, ?2, ?3, ?4, ?4, ?4)", params![CURRENT_FORMAT_VERSION, id, title.trim(), timestamp])?;
        store.connection.execute("INSERT INTO documents (id, type, title, markdown, created_at, updated_at) VALUES ('journal', 'markdown', 'Journal', '# Journal\\n\\n', ?1, ?1)", [timestamp])?;
        store.connection.execute("UPDATE story_metadata SET workspace_layout_json = ?1 WHERE singleton = 1", [default_layout_json()])?;
        Ok(store)
    }
    pub fn summary(&self) -> Result<StorySummary, StoryStoreError> { Ok(self.connection.query_row("SELECT story_id, title, created_at, updated_at, last_opened_at FROM story_metadata WHERE singleton = 1", [], |r| Ok(StorySummary { id:r.get(0)?, title:r.get(1)?, created_at:r.get(2)?, updated_at:r.get(3)?, last_opened_at:r.get(4)? }))?) }
    pub fn mark_opened(&self, timestamp: i64) -> Result<StorySummary, StoryStoreError> { self.connection.execute("UPDATE story_metadata SET last_opened_at = ?1 WHERE singleton = 1", [timestamp])?; self.summary() }
    pub fn workspace(&self) -> Result<StoryWorkspace, StoryStoreError> {
        let layout: String = self.connection.query_row("SELECT workspace_layout_json FROM story_metadata WHERE singleton = 1", [], |r| r.get(0))?;
        let mut statement = self.connection.prepare("SELECT id, type, title, markdown, updated_at FROM documents ORDER BY created_at")?;
        let documents = statement.query_map([], |r| Ok(StoryDocument { id:r.get(0)?, document_type:r.get(1)?, title:r.get(2)?, markdown:r.get(3)?, updated_at:r.get(4)? }))?.collect::<Result<Vec<_>, _>>()?;
        Ok(StoryWorkspace { story:self.summary()?, documents, workspace_layout_json:layout })
    }
    pub fn save_markdown(&self, document_id: &str, markdown: &str, timestamp: i64) -> Result<(), StoryStoreError> { let changed=self.connection.execute("UPDATE documents SET markdown = ?1, updated_at = ?2 WHERE id = ?3 AND type = 'markdown'", params![markdown, timestamp, document_id])?; if changed == 0 { return Err(StoryStoreError::Database(rusqlite::Error::QueryReturnedNoRows)); } self.connection.execute("UPDATE story_metadata SET updated_at = ?1 WHERE singleton = 1", [timestamp])?; Ok(()) }
    pub fn create_markdown_document(&self, title: &str, timestamp: i64) -> Result<StoryDocument, StoryStoreError> {
        if title.trim().is_empty() { return Err(StoryStoreError::InvalidTitle); }
        let id = uuid::Uuid::new_v4().to_string();
        let markdown = format!("# {}\n\n", title.trim());
        self.connection.execute("INSERT INTO documents (id, type, title, markdown, created_at, updated_at) VALUES (?1, 'markdown', ?2, ?3, ?4, ?4)", params![id, title.trim(), markdown, timestamp])?;
        self.connection.execute("UPDATE story_metadata SET updated_at = ?1 WHERE singleton = 1", [timestamp])?;
        Ok(StoryDocument { id, document_type: "markdown".to_owned(), title: title.trim().to_owned(), markdown: Some(markdown), updated_at: timestamp })
    }
    pub fn save_layout(&self, layout: &str, timestamp: i64) -> Result<(), StoryStoreError> { self.connection.execute("UPDATE story_metadata SET workspace_layout_json = ?1, updated_at = ?2 WHERE singleton = 1", params![layout, timestamp])?; Ok(()) }
}

fn default_layout_json() -> &'static str { "{\"left\":{\"tabs\":[\"journal\"],\"activeTabId\":\"journal\"},\"right\":{\"tabs\":[],\"activeTabId\":null},\"sizes\":[45,35,20],\"collapsed\":[false,false,false]}" }
pub fn migrate(connection: &mut Connection) -> Result<(), StoryStoreError> { let current:i64=connection.query_row("PRAGMA user_version", [], |r| r.get(0))?; if current > CURRENT_FORMAT_VERSION { return Err(StoryStoreError::UnsupportedFutureFormat { found:current, supported:CURRENT_FORMAT_VERSION }); } for (version, sql) in MIGRATIONS { if *version > current { let tx=connection.transaction()?; tx.execute_batch(sql)?; tx.pragma_update(None, "user_version", version)?; tx.execute("UPDATE story_metadata SET format_version = ?1 WHERE singleton = 1", [version])?; tx.commit()?; } } Ok(()) }
