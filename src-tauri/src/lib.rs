pub mod story_store;

use rusqlite::{params, Connection, MAIN_DB};
use serde::{Deserialize, Serialize};
use std::{
    fs,
    io::Write,
    collections::BTreeMap,
    sync::{Arc, Mutex},
    time::Instant,
};
use tauri::Manager;
use uuid::Uuid;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ProofRuntimeInfo {
    operating_system: &'static str,
    architecture: &'static str,
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct GlobalSettings {
    locale: String,
    theme_id: String,
    ui_scale: u16,
    reduce_motion: bool,
    muted: bool,
    typewriter_sounds: bool,
    shortcut_overrides: BTreeMap<String, String>,
}

impl Default for GlobalSettings {
    fn default() -> Self {
        Self {
            locale: "cs-CZ".to_owned(),
            theme_id: "nightfall".to_owned(),
            ui_scale: 100,
            reduce_motion: false,
            muted: false,
            typewriter_sounds: false,
            shortcut_overrides: BTreeMap::new(),
        }
    }
}

fn settings_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let directory = app.path().app_config_dir().map_err(|error| error.to_string())?;
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    Ok(directory.join("settings.json"))
}

fn append_local_error(app: &tauri::AppHandle, context: &str, error: &str) {
    let Ok(directory) = app.path().app_log_dir() else { return };
    if fs::create_dir_all(&directory).is_err() {
        return;
    }
    let Ok(mut log) = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(directory.join("figmentfell.log"))
    else {
        return;
    };
    let _ = writeln!(log, "{} | {} | {}", chrono_free_timestamp(), context, error);
}

fn chrono_free_timestamp() -> String {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_secs().to_string())
        .unwrap_or_else(|_| "unknown-time".to_owned())
}

fn validate_settings(settings: &GlobalSettings) -> Result<(), String> {
    if !matches!(settings.locale.as_str(), "cs-CZ" | "en-US") {
        return Err("Unsupported locale.".to_owned());
    }
    if !matches!(settings.theme_id.as_str(), "nightfall" | "parchment") {
        return Err("Unsupported theme.".to_owned());
    }
    if !(80..=150).contains(&settings.ui_scale) {
        return Err("UI scale must be between 80 and 150 percent.".to_owned());
    }
    Ok(())
}

#[tauri::command]
fn load_global_settings(app: tauri::AppHandle) -> Result<GlobalSettings, String> {
    let result: Result<GlobalSettings, String> = (|| -> Result<GlobalSettings, String> {
        let path = settings_path(&app)?;
        if !path.exists() {
            return Ok(GlobalSettings::default());
        }
        let content = fs::read_to_string(path).map_err(|error| error.to_string())?;
        let settings: GlobalSettings = serde_json::from_str(&content).map_err(|error| error.to_string())?;
        validate_settings(&settings)?;
        Ok(settings)
    })();
    if let Err(error) = &result {
        append_local_error(&app, "load_global_settings", error);
    }
    result
}

#[tauri::command]
fn save_global_settings(settings: GlobalSettings, app: tauri::AppHandle) -> Result<(), String> {
    let result: Result<(), String> = (|| -> Result<(), String> {
        validate_settings(&settings)?;
        let path = settings_path(&app)?;
        let temporary_path = path.with_extension("json.tmp");
        let content = serde_json::to_vec_pretty(&settings).map_err(|error| error.to_string())?;
        fs::write(&temporary_path, content).map_err(|error| error.to_string())?;
        fs::rename(&temporary_path, &path).map_err(|error| error.to_string())?;
        Ok(())
    })();
    if let Err(error) = &result {
        append_local_error(&app, "save_global_settings", error);
    }
    result
}

fn stories_directory(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let directory = app.path().app_data_dir().map_err(|error| error.to_string())?.join("Stories");
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    Ok(directory)
}

fn current_timestamp() -> Result<i64, String> {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_secs() as i64)
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn list_stories(app: tauri::AppHandle) -> Result<Vec<story_store::StorySummary>, String> {
    let result = (|| -> Result<Vec<story_store::StorySummary>, String> {
        let mut stories = Vec::new();
        for entry in fs::read_dir(stories_directory(&app)?).map_err(|error| error.to_string())? {
            let entry = entry.map_err(|error| error.to_string())?;
            let path = entry.path();
            if path.extension().is_some_and(|extension| extension == "ffstory") {
                let store = story_store::StoryStore::open(&path).map_err(|error| error.to_string())?;
                stories.push(store.summary().map_err(|error| error.to_string())?);
            }
        }
        stories.sort_by(|left, right| right.last_opened_at.cmp(&left.last_opened_at).then_with(|| right.updated_at.cmp(&left.updated_at)));
        Ok(stories)
    })();
    if let Err(error) = &result { append_local_error(&app, "list_stories", error); }
    result
}

#[tauri::command]
fn create_story(title: String, app: tauri::AppHandle) -> Result<story_store::StorySummary, String> {
    let result = (|| -> Result<story_store::StorySummary, String> {
        let id = Uuid::new_v4().to_string();
        let path = stories_directory(&app)?.join(format!("{id}.ffstory"));
        let store = story_store::StoryStore::create(&path, &id, &title, current_timestamp()?).map_err(|error| error.to_string())?;
        store.summary().map_err(|error| error.to_string())
    })();
    if let Err(error) = &result { append_local_error(&app, "create_story", error); }
    result
}

#[tauri::command]
fn open_story(id: String, app: tauri::AppHandle) -> Result<story_store::StorySummary, String> {
    let result = (|| -> Result<story_store::StorySummary, String> {
        let id = Uuid::parse_str(&id).map_err(|_| "Invalid story identifier.".to_owned())?.to_string();
        let path = stories_directory(&app)?.join(format!("{id}.ffstory"));
        if !path.is_file() { return Err("Story does not exist in the managed library.".to_owned()); }
        let store = story_store::StoryStore::open(&path).map_err(|error| error.to_string())?;
        store.mark_opened(current_timestamp()?).map_err(|error| error.to_string())
    })();
    if let Err(error) = &result { append_local_error(&app, "open_story", error); }
    result
}

fn managed_story_path(app: &tauri::AppHandle, id: &str) -> Result<std::path::PathBuf, String> {
    let id = Uuid::parse_str(id).map_err(|_| "Invalid story identifier.".to_owned())?.to_string();
    let path = stories_directory(app)?.join(format!("{id}.ffstory"));
    if !path.is_file() { return Err("Story does not exist in the managed library.".to_owned()); }
    Ok(path)
}

#[tauri::command]
fn load_story_workspace(id: String, app: tauri::AppHandle) -> Result<story_store::StoryWorkspace, String> {
    let result = (|| {
        let store = story_store::StoryStore::open(&managed_story_path(&app, &id)?).map_err(|error| error.to_string())?;
        store.workspace().map_err(|error| error.to_string())
    })();
    if let Err(error) = &result { append_local_error(&app, "load_story_workspace", error); }
    result
}

#[tauri::command]
async fn save_markdown_document(id: String, document_id: String, markdown: String, app: tauri::AppHandle, coordinator: tauri::State<'_, StoryWriteCoordinator>) -> Result<(), String> {
    let task_app = app.clone();
    let write_lock = coordinator.0.clone();
    let result = tauri::async_runtime::spawn_blocking(move || {
        let _guard = write_lock.lock().map_err(|error| error.to_string())?;
        let store = story_store::StoryStore::open(&managed_story_path(&task_app, &id)?).map_err(|error| error.to_string())?;
        store.save_markdown(&document_id, &markdown, current_timestamp()?).map_err(|error| error.to_string())
    }).await.map_err(|error| error.to_string())?;
    if let Err(error) = &result { append_local_error(&app, "save_markdown_document", error); }
    result
}

#[tauri::command]
fn create_markdown_document(id: String, title: String, app: tauri::AppHandle) -> Result<story_store::StoryDocument, String> {
    let result = (|| {
        let store = story_store::StoryStore::open(&managed_story_path(&app, &id)?).map_err(|error| error.to_string())?;
        store.create_markdown_document(&title, current_timestamp()?).map_err(|error| error.to_string())
    })();
    if let Err(error) = &result { append_local_error(&app, "create_markdown_document", error); }
    result
}

#[tauri::command]
async fn save_workspace_layout(id: String, workspace_layout_json: String, app: tauri::AppHandle, coordinator: tauri::State<'_, StoryWriteCoordinator>) -> Result<(), String> {
    serde_json::from_str::<serde_json::Value>(&workspace_layout_json).map_err(|error| error.to_string())?;
    let task_app = app.clone();
    let write_lock = coordinator.0.clone();
    let result = tauri::async_runtime::spawn_blocking(move || {
        let _guard = write_lock.lock().map_err(|error| error.to_string())?;
        let store = story_store::StoryStore::open(&managed_story_path(&task_app, &id)?).map_err(|error| error.to_string())?;
        store.save_layout(&workspace_layout_json, current_timestamp()?).map_err(|error| error.to_string())
    }).await.map_err(|error| error.to_string())?;
    if let Err(error) = &result { append_local_error(&app, "save_workspace_layout", error); }
    result
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct StorageProofResult {
    chunk_count: usize,
    attachment_megabytes: usize,
    attachment_bytes_before: i64,
    attachment_bytes_after: i64,
    elapsed_milliseconds: u128,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RecoveryProofResult {
    attachment_megabytes: usize,
    snapshot_bytes: u64,
    snapshot_revision: String,
    current_revision: String,
    recovered_revision: String,
    rescue_revision: String,
    elapsed_milliseconds: u128,
}

#[derive(Default)]
struct PdfProofStore {
    state: Mutex<Option<PdfProofState>>,
}

/// Separate native commands open separate SQLite connections; this lock keeps
/// their writes ordered while preserving concurrent reads and UI responsiveness.
#[derive(Clone, Default)]
struct StoryWriteCoordinator(Arc<Mutex<()>>);

struct PdfProofState {
    directory: std::path::PathBuf,
    story_path: std::path::PathBuf,
    byte_length: usize,
    range_requests: usize,
    served_bytes: usize,
}

impl Drop for PdfProofStore {
    fn drop(&mut self) {
        if let Ok(state) = self.state.get_mut() {
            if let Some(proof) = state.take() {
                let _ = fs::remove_dir_all(proof.directory);
            }
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PdfProofMetadata {
    byte_length: usize,
    initial_bytes: Vec<u8>,
    range_requests: usize,
    served_bytes: usize,
}

#[tauri::command]
fn proof_runtime_info() -> ProofRuntimeInfo {
    ProofRuntimeInfo {
        operating_system: std::env::consts::OS,
        architecture: std::env::consts::ARCH,
    }
}

/// Phase 0 only: creates an SQLite-backed .ffstory-shaped file under the OS
/// temporary directory. The generated file is removed after verification.
#[tauri::command]
fn run_storage_proof() -> Result<StorageProofResult, String> {
    const CHUNK_COUNT: usize = 640;
    const ATTACHMENT_MEGABYTES: usize = 32;

    let proof_directory = std::env::temp_dir().join(format!(
        "figmentfell-storage-proof-{}",
        std::process::id()
    ));
    fs::create_dir_all(&proof_directory).map_err(|error| error.to_string())?;
    let story_path = proof_directory.join("proof.ffstory");
    let started = Instant::now();

    let result = (|| -> Result<StorageProofResult, String> {
        let mut connection = Connection::open(&story_path).map_err(|error| error.to_string())?;
        connection
            .execute_batch(
                "
                PRAGMA journal_mode = WAL;
                PRAGMA foreign_keys = ON;
                CREATE TABLE documents (
                  id TEXT PRIMARY KEY,
                  title TEXT NOT NULL
                );
                CREATE TABLE markdown_chunks (
                  id TEXT PRIMARY KEY,
                  document_id TEXT NOT NULL REFERENCES documents(id),
                  chunk_order INTEGER NOT NULL,
                  markdown TEXT NOT NULL,
                  updated_at INTEGER NOT NULL
                );
                CREATE TABLE assets (
                  id TEXT PRIMARY KEY,
                  media_type TEXT NOT NULL,
                  payload BLOB NOT NULL
                );
                ",
            )
            .map_err(|error| error.to_string())?;

        let transaction = connection.transaction().map_err(|error| error.to_string())?;
        transaction
            .execute(
                "INSERT INTO documents (id, title) VALUES (?1, ?2)",
                params!["journal", "Storage proof journal"],
            )
            .map_err(|error| error.to_string())?;
        for index in 0..CHUNK_COUNT {
            transaction
                .execute(
                    "INSERT INTO markdown_chunks (id, document_id, chunk_order, markdown, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
                    params![
                        format!("chunk-{index:04}"),
                        "journal",
                        index,
                        format!("## Entry {}\n\nStored independently.", index + 1),
                        0,
                    ],
                )
                .map_err(|error| error.to_string())?;
        }
        let attachment = vec![0xA5_u8; ATTACHMENT_MEGABYTES * 1024 * 1024];
        transaction
            .execute(
                "INSERT INTO assets (id, media_type, payload) VALUES (?1, ?2, ?3)",
                params!["reference-pdf", "application/pdf", attachment],
            )
            .map_err(|error| error.to_string())?;
        transaction.commit().map_err(|error| error.to_string())?;

        let attachment_bytes_before: i64 = connection
            .query_row("SELECT length(payload) FROM assets WHERE id = 'reference-pdf'", [], |row| row.get(0))
            .map_err(|error| error.to_string())?;

        connection
            .execute(
                "UPDATE markdown_chunks SET markdown = ?1, updated_at = ?2 WHERE id = ?3",
                params!["## Entry 640\n\nOne-character-equivalent chunk update.", 1, "chunk-0639"],
            )
            .map_err(|error| error.to_string())?;

        let attachment_bytes_after: i64 = connection
            .query_row("SELECT length(payload) FROM assets WHERE id = 'reference-pdf'", [], |row| row.get(0))
            .map_err(|error| error.to_string())?;
        if attachment_bytes_before != attachment_bytes_after {
            return Err("Attachment changed during a chunk-only update.".to_owned());
        }

        Ok(StorageProofResult {
            chunk_count: CHUNK_COUNT,
            attachment_megabytes: ATTACHMENT_MEGABYTES,
            attachment_bytes_before,
            attachment_bytes_after,
            elapsed_milliseconds: started.elapsed().as_millis(),
        })
    })();

    let cleanup_result = fs::remove_dir_all(&proof_directory);
    match (result, cleanup_result) {
        (Ok(result), Ok(())) => Ok(result),
        (Ok(_), Err(error)) => Err(format!("Storage proof passed, but cleanup failed: {error}")),
        (Err(error), _) => Err(error),
    }
}

fn create_sqlite_snapshot(connection: &Connection, destination: &std::path::Path) -> Result<(), String> {
    let escaped_path = destination.to_string_lossy().replace('\'', "''");
    connection
        .execute_batch(&format!("VACUUM INTO '{escaped_path}';"))
        .map_err(|error| error.to_string())
}

/// Phase 0 only: proves that a consistent SQLite snapshot can be restored
/// without discarding the state that existed immediately before restoration.
#[tauri::command]
fn run_recovery_proof() -> Result<RecoveryProofResult, String> {
    const ATTACHMENT_MEGABYTES: usize = 4;
    let nonce = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|error| error.to_string())?
        .as_nanos();
    let proof_directory = std::env::temp_dir().join(format!(
        "figmentfell-recovery-proof-{}-{nonce}",
        std::process::id()
    ));
    fs::create_dir(&proof_directory).map_err(|error| error.to_string())?;
    let story_path = proof_directory.join("active.ffstory");
    let snapshot_path = proof_directory.join("snapshot.ffstory");
    let rescue_path = proof_directory.join("pre-restore.ffstory");
    let restore_staging_path = proof_directory.join("restore-staging.ffstory");
    let started = Instant::now();

    let result = (|| -> Result<RecoveryProofResult, String> {
        let connection = Connection::open(&story_path).map_err(|error| error.to_string())?;
        connection
            .execute_batch(
                "
                PRAGMA journal_mode = WAL;
                CREATE TABLE documents (id TEXT PRIMARY KEY, markdown TEXT NOT NULL);
                CREATE TABLE assets (id TEXT PRIMARY KEY, payload BLOB NOT NULL);
                ",
            )
            .map_err(|error| error.to_string())?;
        connection
            .execute(
                "INSERT INTO documents (id, markdown) VALUES ('journal', ?1)",
                params!["# Journal\n\nRevision preserved by the first snapshot."],
            )
            .map_err(|error| error.to_string())?;
        connection
            .execute(
                "INSERT INTO assets (id, payload) VALUES ('map', ?1)",
                params![vec![0x5A_u8; ATTACHMENT_MEGABYTES * 1024 * 1024]],
            )
            .map_err(|error| error.to_string())?;

        create_sqlite_snapshot(&connection, &snapshot_path)?;
        let snapshot_revision: String = Connection::open(&snapshot_path)
            .map_err(|error| error.to_string())?
            .query_row("SELECT markdown FROM documents WHERE id = 'journal'", [], |row| row.get(0))
            .map_err(|error| error.to_string())?;

        connection
            .execute(
                "UPDATE documents SET markdown = ?1 WHERE id = 'journal'",
                params!["# Journal\n\nNewer revision written after the first snapshot."],
            )
            .map_err(|error| error.to_string())?;
        let current_revision: String = connection
            .query_row("SELECT markdown FROM documents WHERE id = 'journal'", [], |row| row.get(0))
            .map_err(|error| error.to_string())?;
        create_sqlite_snapshot(&connection, &rescue_path)?;

        // Checkpoint and leave WAL mode before replacing the active main file,
        // so no stale sidecar can be associated with the restored database.
        connection
            .execute_batch("PRAGMA wal_checkpoint(TRUNCATE); PRAGMA journal_mode = DELETE;")
            .map_err(|error| error.to_string())?;
        drop(connection);

        fs::copy(&snapshot_path, &restore_staging_path).map_err(|error| error.to_string())?;
        fs::rename(&restore_staging_path, &story_path).map_err(|error| error.to_string())?;

        let recovered_connection = Connection::open(&story_path).map_err(|error| error.to_string())?;
        let recovered_revision: String = recovered_connection
            .query_row("SELECT markdown FROM documents WHERE id = 'journal'", [], |row| row.get(0))
            .map_err(|error| error.to_string())?;
        let recovered_attachment_bytes: i64 = recovered_connection
            .query_row("SELECT length(payload) FROM assets WHERE id = 'map'", [], |row| row.get(0))
            .map_err(|error| error.to_string())?;
        let rescue_revision: String = Connection::open(&rescue_path)
            .map_err(|error| error.to_string())?
            .query_row("SELECT markdown FROM documents WHERE id = 'journal'", [], |row| row.get(0))
            .map_err(|error| error.to_string())?;

        if recovered_revision != snapshot_revision {
            return Err("Restored story does not match the selected snapshot.".to_owned());
        }
        if rescue_revision != current_revision {
            return Err("Pre-restore snapshot did not preserve the current story state.".to_owned());
        }
        if recovered_attachment_bytes != (ATTACHMENT_MEGABYTES * 1024 * 1024) as i64 {
            return Err("Restored attachment is incomplete.".to_owned());
        }

        Ok(RecoveryProofResult {
            attachment_megabytes: ATTACHMENT_MEGABYTES,
            snapshot_bytes: fs::metadata(&snapshot_path).map_err(|error| error.to_string())?.len(),
            snapshot_revision,
            current_revision,
            recovered_revision,
            rescue_revision,
            elapsed_milliseconds: started.elapsed().as_millis(),
        })
    })();

    let cleanup_result = fs::remove_dir_all(&proof_directory);
    match (result, cleanup_result) {
        (Ok(result), Ok(())) => Ok(result),
        (Ok(_), Err(error)) => Err(format!("Recovery proof passed, but cleanup failed: {error}")),
        (Err(error), _) => Err(error),
    }
}

fn append_pdf_object(buffer: &mut Vec<u8>, offsets: &mut Vec<usize>, id: usize, body: &[u8]) {
    offsets.push(buffer.len());
    buffer.extend_from_slice(format!("{id} 0 obj\n").as_bytes());
    buffer.extend_from_slice(body);
    buffer.extend_from_slice(b"\nendobj\n");
}

fn build_pdf_proof_document(target_bytes: usize) -> Vec<u8> {
    let mut pdf = b"%PDF-1.7\n%\xE2\xE3\xCF\xD3\n".to_vec();
    let mut offsets = Vec::new();
    append_pdf_object(&mut pdf, &mut offsets, 1, b"<< /Type /Catalog /Pages 2 0 R >>");
    append_pdf_object(&mut pdf, &mut offsets, 2, b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
    append_pdf_object(&mut pdf, &mut offsets, 3, b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>");
    let page_text = b"BT /F1 20 Tf 72 720 Td (FigmentFell PDF range proof - searchable local attachment) Tj ET";
    append_pdf_object(&mut pdf, &mut offsets, 4, format!("<< /Length {} >>\nstream\n", page_text.len()).as_bytes());
    let content_offset = pdf.len() - b"\nendobj\n".len();
    pdf.truncate(content_offset);
    pdf.extend_from_slice(page_text);
    pdf.extend_from_slice(b"\nendstream\nendobj\n");
    append_pdf_object(&mut pdf, &mut offsets, 5, b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

    let overhead_estimate = 512usize;
    let filler_length = target_bytes.saturating_sub(pdf.len() + overhead_estimate);
    offsets.push(pdf.len());
    pdf.extend_from_slice(format!("6 0 obj\n<< /Length {filler_length} >>\nstream\n").as_bytes());
    pdf.resize(pdf.len() + filler_length, b' ');
    pdf.extend_from_slice(b"\nendstream\nendobj\n");

    let xref_offset = pdf.len();
    pdf.extend_from_slice(format!("xref\n0 {}\n0000000000 65535 f \n", offsets.len() + 1).as_bytes());
    for offset in offsets {
        pdf.extend_from_slice(format!("{offset:010} 00000 n \n").as_bytes());
    }
    pdf.extend_from_slice(format!("trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF\n").as_bytes());
    pdf
}

#[tauri::command]
fn start_pdf_proof(store: tauri::State<PdfProofStore>) -> Result<PdfProofMetadata, String> {
    const TARGET_BYTES: usize = 32 * 1024 * 1024;
    const INITIAL_BYTES: usize = 64 * 1024;
    let mut state = store.state.lock().map_err(|error| error.to_string())?;
    if let Some(previous) = state.take() {
        fs::remove_dir_all(previous.directory).map_err(|error| error.to_string())?;
    }

    let directory = std::env::temp_dir().join(format!("figmentfell-pdf-proof-{}", std::process::id()));
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    let story_path = directory.join("range-proof.ffstory");
    let pdf = build_pdf_proof_document(TARGET_BYTES);
    let byte_length = pdf.len();
    let initial_bytes = pdf[..INITIAL_BYTES.min(byte_length)].to_vec();
    let connection = Connection::open(&story_path).map_err(|error| error.to_string())?;
    connection
        .execute_batch("CREATE TABLE assets (id INTEGER PRIMARY KEY, media_type TEXT NOT NULL, payload BLOB NOT NULL);")
        .map_err(|error| error.to_string())?;
    connection
        .execute("INSERT INTO assets (id, media_type, payload) VALUES (1, 'application/pdf', ?1)", params![pdf])
        .map_err(|error| error.to_string())?;

    *state = Some(PdfProofState {
        directory,
        story_path,
        byte_length,
        range_requests: 0,
        served_bytes: INITIAL_BYTES.min(byte_length),
    });
    Ok(PdfProofMetadata {
        byte_length,
        initial_bytes,
        range_requests: 0,
        served_bytes: INITIAL_BYTES.min(byte_length),
    })
}

#[tauri::command]
fn read_pdf_proof_range(begin: usize, end: usize, store: tauri::State<PdfProofStore>) -> Result<Vec<u8>, String> {
    let mut state = store.state.lock().map_err(|error| error.to_string())?;
    let proof = state.as_mut().ok_or_else(|| "PDF proof has not been initialized.".to_owned())?;
    if begin >= end || end > proof.byte_length {
        return Err("Requested PDF byte range is invalid.".to_owned());
    }
    let connection = Connection::open(&proof.story_path).map_err(|error| error.to_string())?;
    let blob = connection
        .blob_open(MAIN_DB, "assets", "payload", 1, false)
        .map_err(|error| error.to_string())?;
    let mut bytes = vec![0_u8; end - begin];
    blob.read_at(&mut bytes, begin).map_err(|error| error.to_string())?;
    proof.range_requests += 1;
    proof.served_bytes += bytes.len();
    Ok(bytes)
}

#[tauri::command]
fn pdf_proof_metrics(store: tauri::State<PdfProofStore>) -> Result<PdfProofMetadata, String> {
    let state = store.state.lock().map_err(|error| error.to_string())?;
    let proof = state.as_ref().ok_or_else(|| "PDF proof has not been initialized.".to_owned())?;
    Ok(PdfProofMetadata {
        byte_length: proof.byte_length,
        initial_bytes: Vec::new(),
        range_requests: proof.range_requests,
        served_bytes: proof.served_bytes,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(PdfProofStore::default())
        .manage(StoryWriteCoordinator::default())
        .invoke_handler(tauri::generate_handler![
            proof_runtime_info,
            load_global_settings,
            save_global_settings,
            list_stories,
            create_story,
            open_story,
            load_story_workspace,
            save_markdown_document,
            create_markdown_document,
            save_workspace_layout,
            run_storage_proof,
            run_recovery_proof,
            start_pdf_proof,
            read_pdf_proof_range,
            pdf_proof_metrics
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
