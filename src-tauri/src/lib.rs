use rusqlite::{params, Connection};
use serde::Serialize;
use std::{fs, time::Instant};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ProofRuntimeInfo {
    operating_system: &'static str,
    architecture: &'static str,
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![proof_runtime_info, run_storage_proof])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
