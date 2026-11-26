//! Survival & Offline Assistant module: Memory, Personal Files, Unified Offline Library RAG, and Axum API.

pub mod library;
pub mod memory;
pub mod my_files;
pub mod passages;
pub mod prompts;

use crate::db::Database;
use crate::knowledge_store::library_manager::LibraryManager;
use axum::{
    extract::{Path as AxumPath, Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{delete, get, post},
    Json, Router,
};
use base64::Engine;
use serde::Deserialize;
use serde_json::{json, Value};
use std::path::{Path, PathBuf};
use std::sync::Arc;

use library::UnifiedLibrary;
use memory::{MemoryEvent, MemoryStore, SurvivalSettings};
use my_files::MyFilesIndex;

#[derive(Clone)]
pub struct SurvivalState {
    pub data_dir: PathBuf,
    pub memory: MemoryStore,
    pub my_files: MyFilesIndex,
    pub library: UnifiedLibrary,
}

impl SurvivalState {
    pub fn new(
        data_dir: &Path,
        db: Database,
        library_manager: Arc<LibraryManager>,
    ) -> anyhow::Result<Self> {
        let memory = MemoryStore::new(data_dir);
        let my_files = MyFilesIndex::new(data_dir)?;
        let settings = memory.load_settings();
        let custom_dir = settings.files_dir.as_deref().map(Path::new);
        let _ = my_files.sync_folder(custom_dir);
        let library = UnifiedLibrary::new(db, my_files.clone(), library_manager);
        Ok(Self {
            data_dir: data_dir.to_path_buf(),
            memory,
            my_files,
            library,
        })
    }

    pub fn active_files_dir(&self) -> PathBuf {
        self.memory
            .load_settings()
            .files_dir
            .filter(|s| !s.trim().is_empty())
            .map(PathBuf::from)
            .unwrap_or_else(|| self.my_files.default_folder().to_path_buf())
    }
}

pub fn create_survival_router(state: SurvivalState) -> Router {
    Router::new()
        .route("/api/survival/state", get(get_state))
        .route("/api/survival/settings", post(update_settings))
        .route("/api/survival/memory", get(get_memory).post(save_memory))
        .route("/api/survival/memory/undo", post(undo_memory))
        .route("/api/survival/memory/clear", post(clear_memory))
        .route("/api/survival/files", get(list_files))
        .route("/api/survival/files/upload", post(upload_file))
        .route("/api/survival/files/:name", delete(delete_file))
        .route("/api/survival/files/sync", post(sync_files))
        .route("/api/survival/files/open-folder", post(open_files_folder))
        .route("/api/survival/files/pick-folder", post(pick_files_folder))
        .route("/api/survival/library/search", get(search_library))
        .route("/api/survival/library/document", get(get_library_document))
        .with_state(state)
}

async fn get_state(State(state): State<SurvivalState>) -> impl IntoResponse {
    let settings = state.memory.load_settings();
    let notes_count = state.memory.notes().len();
    let files_count = state.my_files.list_files().map(|v| v.len()).unwrap_or(0);
    let zim_count = state.library.library_manager.list_archives().await.len();

    Json(json!({
        "settings": settings,
        "defaultInstructions": prompts::DEFAULT_SYSTEM_INSTRUCTIONS,
        "notesCount": notes_count,
        "filesCount": files_count,
        "zimCount": zim_count,
        "filesFolder": state.active_files_dir().to_string_lossy(),
    }))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpdateSettingsReq {
    memory_ai_writes: Option<bool>,
    custom_instructions: Option<Value>,
    reasoning_budget: Option<String>,
    length_limit: Option<String>,
    files_dir: Option<Value>,
    offline_library_enabled: Option<bool>,
    model_mode: Option<String>,
}

async fn update_settings(
    State(state): State<SurvivalState>,
    Json(body): Json<UpdateSettingsReq>,
) -> impl IntoResponse {
    let res = state.memory.update_settings(|s: &mut SurvivalSettings| {
        if let Some(v) = body.memory_ai_writes {
            s.memory_ai_writes = v;
        }
        if let Some(v) = body.custom_instructions.as_ref() {
            s.custom_instructions = match v {
                Value::Null => None,
                Value::String(txt) if txt.trim().is_empty() => None,
                Value::String(txt) => Some(txt.clone()),
                _ => s.custom_instructions.clone(),
            };
        }
        if let Some(v) = body.reasoning_budget.as_ref() {
            s.reasoning_budget = v.clone();
        }
        if let Some(v) = body.length_limit.as_ref() {
            s.length_limit = v.clone();
        }
        if let Some(v) = body.files_dir.as_ref() {
            s.files_dir = match v {
                Value::Null => None,
                Value::String(txt) if txt.trim().is_empty() => None,
                Value::String(txt) => Some(txt.clone()),
                _ => s.files_dir.clone(),
            };
        }
        if let Some(v) = body.offline_library_enabled {
            s.offline_library_enabled = v;
        }
        if let Some(v) = body.model_mode.as_ref() {
            s.model_mode = v.clone();
        }
    });

    match res {
        Ok(settings) => {
            if body.files_dir.is_some() {
                let folder = state.active_files_dir();
                let _ = state.my_files.sync_folder(Some(&folder));
            }
            (StatusCode::OK, Json(json!({ "settings": settings }))).into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": e.to_string() })),
        )
            .into_response(),
    }
}

async fn get_memory(State(state): State<SurvivalState>) -> impl IntoResponse {
    let settings = state.memory.load_settings();
    let notes = state.memory.notes();
    let text = notes.join("\n");
    Json(json!({
        "notes": notes,
        "text": text,
        "aiWrites": settings.memory_ai_writes,
        "maxChars": memory::MAX_CHARS,
    }))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SaveMemoryReq {
    text: String,
    base: Option<String>,
    ai_writes: Option<bool>,
}

async fn save_memory(
    State(state): State<SurvivalState>,
    Json(body): Json<SaveMemoryReq>,
) -> impl IntoResponse {
    if let Some(ai_writes) = body.ai_writes {
        if let Err(e) = state
            .memory
            .update_settings(|s| s.memory_ai_writes = ai_writes)
        {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": e.to_string() })),
            )
                .into_response();
        }
    }
    match state.memory.save_text(&body.text, body.base.as_deref()) {
        Ok(res) => (StatusCode::OK, Json(json!(res))).into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": e.to_string() })),
        )
            .into_response(),
    }
}

async fn undo_memory(
    State(state): State<SurvivalState>,
    Json(event): Json<MemoryEvent>,
) -> impl IntoResponse {
    match state.memory.undo(&event) {
        Ok(undone) => {
            let notes = state.memory.notes();
            (
                StatusCode::OK,
                Json(json!({ "undone": undone, "notes": notes, "text": notes.join("\n") })),
            )
                .into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": e.to_string() })),
        )
            .into_response(),
    }
}

async fn clear_memory(State(state): State<SurvivalState>) -> impl IntoResponse {
    match state.memory.clear() {
        Ok(()) => (StatusCode::OK, Json(json!({ "ok": true }))).into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": e.to_string() })),
        )
            .into_response(),
    }
}

async fn list_files(State(state): State<SurvivalState>) -> impl IntoResponse {
    let folder = state.active_files_dir();
    let _ = state.my_files.sync_folder(Some(&folder));
    match state.my_files.list_files() {
        Ok(files) => (
            StatusCode::OK,
            Json(json!({
                "files": files,
                "folder": folder.to_string_lossy(),
            })),
        )
            .into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": e.to_string() })),
        )
            .into_response(),
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct UploadFileReq {
    filename: String,
    content_base64: Option<String>,
    extracted_text: Option<String>,
}

async fn upload_file(
    State(state): State<SurvivalState>,
    Json(body): Json<UploadFileReq>,
) -> impl IntoResponse {
    let folder = state.active_files_dir();
    let decoded = match body.content_base64 {
        Some(ref b64) if !b64.is_empty() => {
            match base64::engine::general_purpose::STANDARD.decode(b64) {
                Ok(bytes) => Some(bytes),
                Err(e) => {
                    return (
                        StatusCode::BAD_REQUEST,
                        Json(json!({ "error": format!("Invalid base64 payload: {e}") })),
                    )
                        .into_response();
                }
            }
        }
        _ => None,
    };

    match state.my_files.save_and_index(
        Some(&folder),
        &body.filename,
        decoded.as_deref(),
        body.extracted_text.as_deref(),
    ) {
        Ok(file) => (StatusCode::OK, Json(json!({ "file": file }))).into_response(),
        Err(e) => (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": e.to_string() })),
        )
            .into_response(),
    }
}

async fn delete_file(
    State(state): State<SurvivalState>,
    AxumPath(name): AxumPath<String>,
) -> impl IntoResponse {
    let decoded_name = urlencoding::decode(&name)
        .map(|c| c.into_owned())
        .unwrap_or(name);
    let folder = state.active_files_dir();
    match state.my_files.delete_file(Some(&folder), &decoded_name) {
        Ok(removed) => (StatusCode::OK, Json(json!({ "removed": removed }))).into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": e.to_string() })),
        )
            .into_response(),
    }
}

async fn sync_files(State(state): State<SurvivalState>) -> impl IntoResponse {
    let folder = state.active_files_dir();
    match state.my_files.sync_folder(Some(&folder)) {
        Ok(count) => (StatusCode::OK, Json(json!({ "indexed": count }))).into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": e.to_string() })),
        )
            .into_response(),
    }
}

async fn open_files_folder(State(state): State<SurvivalState>) -> impl IntoResponse {
    let folder = state.active_files_dir();
    let _ = std::fs::create_dir_all(&folder);
    #[cfg(target_os = "windows")]
    let res = std::process::Command::new("explorer").arg(&folder).spawn();
    #[cfg(target_os = "macos")]
    let res = std::process::Command::new("open").arg(&folder).spawn();
    #[cfg(all(unix, not(target_os = "macos")))]
    let res = std::process::Command::new("xdg-open").arg(&folder).spawn();

    match res {
        Ok(_) => (
            StatusCode::OK,
            Json(json!({ "ok": true, "folder": folder.to_string_lossy() })),
        )
            .into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": e.to_string() })),
        )
            .into_response(),
    }
}

async fn pick_files_folder(State(state): State<SurvivalState>) -> impl IntoResponse {
    let picked = tokio::task::spawn_blocking(|| {
        rfd::FileDialog::new()
            .set_title("Choose Personal Library Folder")
            .pick_folder()
    })
    .await
    .ok()
    .flatten();

    if let Some(folder) = picked {
        let folder_str = folder.to_string_lossy().to_string();
        let _ = state
            .memory
            .update_settings(|s| s.files_dir = Some(folder_str.clone()));
        let _ = state.my_files.sync_folder(Some(&folder));
        return (StatusCode::OK, Json(json!({ "folder": folder_str }))).into_response();
    }

    (StatusCode::OK, Json(json!({ "folder": Value::Null }))).into_response()
}

#[derive(Deserialize)]
struct SearchLibQuery {
    q: String,
    limit: Option<usize>,
}

async fn search_library(
    State(state): State<SurvivalState>,
    Query(params): Query<SearchLibQuery>,
) -> impl IntoResponse {
    let hits = state
        .library
        .search(&params.q, params.limit.unwrap_or(10).min(25))
        .await;
    Json(json!({ "hits": hits }))
}

#[derive(Deserialize)]
struct DocQuery {
    id: String,
}

async fn get_library_document(
    State(state): State<SurvivalState>,
    Query(params): Query<DocQuery>,
) -> impl IntoResponse {
    match state.library.get_document(&params.id).await {
        Some(doc) => (StatusCode::OK, Json(json!({ "document": doc }))).into_response(),
        None => (
            StatusCode::NOT_FOUND,
            Json(json!({ "error": "Document not found" })),
        )
            .into_response(),
    }
}
