use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ProofRuntimeInfo {
    operating_system: &'static str,
    architecture: &'static str,
}

#[tauri::command]
fn proof_runtime_info() -> ProofRuntimeInfo {
    ProofRuntimeInfo {
        operating_system: std::env::consts::OS,
        architecture: std::env::consts::ARCH,
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![proof_runtime_info])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
