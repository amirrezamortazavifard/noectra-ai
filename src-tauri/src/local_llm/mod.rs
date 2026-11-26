pub mod config;
pub mod hardware;
pub mod huggingface;
pub mod models;
pub mod runtime;
pub mod server;

use axum::{
    extract::{Query, State},
    http::StatusCode,
    routing::{delete, get, post},
    Json, Router,
};
use config::{ActiveRuntime, LocalLlmConfig, ServerConfig};
use hardware::{get_system_info, SystemInfo};
use huggingface::{HfFile, HfModel};
use models::{ModelInfo, RecommendedModel};
use reqwest::Client;
use runtime::{AssetOption, DownloadProgress, RuntimeInfo};
use serde::Deserialize;
use serde_json::{json, Value};
use server::{SharedServerState, ServerStatus};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use tower_http::cors::{Any, CorsLayer};

#[derive(Clone)]
pub struct LocalLlmState {
    pub config: Arc<Mutex<LocalLlmConfig>>,
    pub server: SharedServerState,
    pub downloads: Arc<Mutex<HashMap<String, DownloadProgress>>>,
    pub http_client: Client,
    pub cached_system_info: Arc<Mutex<Option<SystemInfo>>>,
}

impl LocalLlmState {
    pub fn new(app_data_dir: &Path, http_client: Client) -> Self {
        let mut cfg = LocalLlmConfig::load(app_data_dir).unwrap_or_else(|_| {
            let mut c = LocalLlmConfig::default();
            c.base_dir = app_data_dir.join("local_llm");
            c
        });

        if runtime::auto_discover_runtime(&mut cfg) {
            let _ = cfg.save();
        }

        Self {
            config: Arc::new(Mutex::new(cfg)),
            server: server::new_server_state(),
            downloads: Arc::new(Mutex::new(HashMap::new())),
            http_client,
            cached_system_info: Arc::new(Mutex::new(None)),
        }
    }

    pub fn get_config(&self) -> LocalLlmConfig {
        self.config.lock().unwrap().clone()
    }

    pub fn get_system_info_cached(&self) -> SystemInfo {
        {
            let guard = self.cached_system_info.lock().unwrap();
            if let Some(ref info) = *guard {
                return info.clone();
            }
        }
        let info = get_system_info().unwrap_or_else(|_| SystemInfo {
            cpu_name: "Unknown CPU".to_string(),
            cpu_cores: 4,
            cpu_threads: 8,
            total_ram_mb: 16384,
            available_ram_mb: 8192,
            gpus: vec![],
            os: std::env::consts::OS.to_string(),
            arch: std::env::consts::ARCH.to_string(),
            available_backends: vec![],
            recommended_backend: "cpu".to_string(),
        });
        let mut guard = self.cached_system_info.lock().unwrap();
        *guard = Some(info.clone());
        info
    }

    pub fn list_installed_models(&self) -> Vec<ModelInfo> {
        let cfg = self.get_config();
        models::list_installed_models(&cfg).unwrap_or_default()
    }

    /// Ensures llama-server is running with the specified GGUF model (by model ID, filename, or path).
    /// Returns `(base_url, model_name)` on success.
    pub async fn ensure_model_running(&self, model_key: &str) -> Result<(String, String), String> {
        let cfg = self.get_config();
        let installed = models::list_installed_models(&cfg).map_err(|e| e.to_string())?;

        let target = installed
            .iter()
            .find(|m| {
                m.id == model_key
                    || m.filename == model_key
                    || m.path.to_string_lossy() == model_key
                    || m.name == model_key
            })
            .cloned()
            .ok_or_else(|| {
                format!(
                    "Offline GGUF model '{}' was not found. Please add or download a GGUF model in Settings -> Models.",
                    model_key
                )
            })?;

        let target_path = target.path.to_string_lossy().to_string();

        // Check if already running with this exact model
        {
            let s = self.server.lock().unwrap();
            if let ServerStatus::Running { port, ref host, .. } = s.status {
                if s.loaded_model_path.as_deref() == Some(target_path.as_str()) {
                    return Ok((format!("http://{}:{}/v1", host, port), target.filename));
                }
            }
        }

        // Stop existing server if running another model or stuck in Starting/Error
        let needs_stop = {
            let s = self.server.lock().unwrap();
            s.is_running()
        };
        if needs_stop {
            let _ = server::stop_server(&self.server).await;
        }

        let mut cfg = self.get_config();
        let mut rt_info = runtime::get_runtime_info(&cfg).map_err(|e| e.to_string())?;
        if rt_info.server_binary.is_none() {
            if runtime::auto_discover_runtime(&mut cfg) {
                let _ = cfg.save();
                *self.config.lock().unwrap() = cfg.clone();
                rt_info = runtime::get_runtime_info(&cfg).map_err(|e| e.to_string())?;
            }
        }
        let server_binary = rt_info.server_binary.ok_or_else(|| {
            "No llama.cpp runtime (llama-server) is installed yet. Open Settings -> Models -> Offline Engine & GGUF to download llama.cpp or select your llama-server folder/executable.".to_string()
        })?;

        let mut server_cfg = cfg.server_config.clone();
        // When switching to a new model or n_ctx == 0 (auto), apply hardware-aware defaults so low-VRAM GPUs don't OOM
        if server_cfg.model_path != target_path || server_cfg.n_ctx == 0 {
            let sys = self.get_system_info_cached();
            let size_mb = (target.size_bytes / (1024 * 1024)).max(512);
            let suggested = server::suggest_server_config(&target_path, size_mb, &sys);
            server_cfg.n_gpu_layers = suggested.n_gpu_layers;
            server_cfg.n_ctx = suggested.n_ctx;
            server_cfg.cache_type_k = suggested.cache_type_k;
            server_cfg.cache_type_v = suggested.cache_type_v;
        }
        server_cfg.model_path = target_path.clone();
        server_cfg.mmproj_path = target.mmproj_path.map(|p| p.to_string_lossy().to_string());

        // Persist active selection
        {
            let mut guard = self.config.lock().unwrap();
            guard.selected_model_id = Some(target.id.clone());
            guard.server_config.model_path = target_path;
            let _ = guard.save();
        }

        server::start_server(&server_binary, &server_cfg, self.server.clone())
            .await
            .map_err(|e| e.to_string())?;

        Ok((
            format!("http://{}:{}/v1", server_cfg.host, server_cfg.port),
            target.filename,
        ))
    }
}

pub fn create_local_llm_router(state: LocalLlmState) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    Router::new()
        .route("/api/local-llm/hardware", get(get_hardware_handler))
        .route("/api/local-llm/config", get(get_config_handler).post(save_config_handler))
        .route("/api/local-llm/config/suggest", post(suggest_config_handler))
        .route("/api/local-llm/runtime", get(get_runtime_handler))
        .route("/api/local-llm/runtime/latest", get(get_latest_runtime_handler))
        .route("/api/local-llm/runtime/download", post(download_runtime_handler))
        .route("/api/local-llm/runtime/scan", post(scan_runtime_handler))
        .route("/api/local-llm/runtime/browse", post(browse_runtime_handler))
        .route("/api/local-llm/runtime/browse-dir", post(browse_runtime_dir_handler))
        .route("/api/local-llm/runtime/auto-discover", post(auto_discover_runtime_handler))
        .route("/api/local-llm/runtime/select", post(select_runtime_handler))
        .route("/api/local-llm/runtime/custom", delete(delete_custom_runtime_handler))
        .route("/api/local-llm/runtime/custom/add-all", post(add_all_custom_builds_handler))
        .route("/api/local-llm/runtime/auto-delete", post(set_auto_delete_handler))
        .route("/api/local-llm/runtime/managed", delete(delete_runtime_handler))
        .route("/api/local-llm/models", get(list_models_handler).delete(delete_model_handler))
        .route("/api/local-llm/models/browse-file", post(browse_gguf_file_handler))
        .route("/api/local-llm/models/browse-dir", post(browse_models_dir_handler))
        .route("/api/local-llm/models/dirs", post(update_model_dirs_handler))
        .route("/api/local-llm/hf/search", get(hf_search_handler))
        .route("/api/local-llm/hf/files", get(hf_files_handler))
        .route("/api/local-llm/hf/download", post(hf_download_handler))
        .route("/api/local-llm/downloads", get(get_downloads_handler))
        .route("/api/local-llm/downloads/abort", post(abort_download_handler))
        .route("/api/local-llm/server/status", get(server_status_handler))
        .route("/api/local-llm/server/start", post(server_start_handler))
        .route("/api/local-llm/server/stop", post(server_stop_handler))
        .route("/api/local-llm/server/ensure", post(server_ensure_handler))
        .layer(cors)
        .with_state(state)
}

async fn get_hardware_handler(State(state): State<LocalLlmState>) -> Json<SystemInfo> {
    let info = tokio::task::spawn_blocking(move || state.get_system_info_cached())
        .await
        .unwrap();
    Json(info)
}

async fn get_config_handler(State(state): State<LocalLlmState>) -> Json<LocalLlmConfig> {
    Json(state.get_config())
}

#[derive(Deserialize)]
struct SaveConfigPayload {
    server_config: Option<ServerConfig>,
    model_dirs: Option<Vec<PathBuf>>,
    download_dir: Option<PathBuf>,
    auto_delete_old_runtimes: Option<bool>,
    selected_model_id: Option<String>,
}

async fn save_config_handler(
    State(state): State<LocalLlmState>,
    Json(payload): Json<SaveConfigPayload>,
) -> Result<Json<LocalLlmConfig>, (StatusCode, String)> {
    let updated = {
        let mut cfg = state.config.lock().unwrap();
        if let Some(sc) = payload.server_config {
            cfg.server_config = sc;
        }
        if let Some(dirs) = payload.model_dirs {
            cfg.model_dirs = dirs;
        }
        if let Some(dl_dir) = payload.download_dir {
            cfg.download_dir = Some(dl_dir);
        }
        if let Some(auto_del) = payload.auto_delete_old_runtimes {
            cfg.auto_delete_old_runtimes = auto_del;
        }
        if let Some(sel) = payload.selected_model_id {
            cfg.selected_model_id = Some(sel);
        }
        cfg.save().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        cfg.clone()
    };
    Ok(Json(updated))
}

#[derive(Deserialize)]
struct SuggestConfigPayload {
    model_path: String,
    model_size_mb: Option<u64>,
}

async fn suggest_config_handler(
    State(state): State<LocalLlmState>,
    Json(payload): Json<SuggestConfigPayload>,
) -> Json<Value> {
    let sys = state.get_system_info_cached();
    let size_mb = payload.model_size_mb.unwrap_or_else(|| {
        std::fs::metadata(&payload.model_path)
            .map(|m| (m.len() / (1024 * 1024)).max(512))
            .unwrap_or(4096)
    });
    let hw_sug = hardware::suggest_config(size_mb, &sys);
    let suggested = server::suggest_server_config(&payload.model_path, size_mb, &sys);
    Json(json!({
        "n_gpu_layers": suggested.n_gpu_layers,
        "n_ctx": suggested.n_ctx,
        "parallel": suggested.parallel,
        "notes": hw_sug.notes,
        "server_config": suggested,
    }))
}

async fn get_runtime_handler(
    State(state): State<LocalLlmState>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let cfg = {
        let mut guard = state.config.lock().unwrap();
        if runtime::auto_discover_runtime(&mut guard) {
            let _ = guard.save();
        }
        guard.clone()
    };
    let info: RuntimeInfo =
        runtime::get_runtime_info(&cfg).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(json!({
        "info": info,
        "active_runtime": cfg.active_runtime,
        "managed_runtimes": cfg.managed_runtimes,
        "custom_runtimes": cfg.custom_runtimes,
        "auto_delete_old_runtimes": cfg.auto_delete_old_runtimes,
    })))
}

async fn get_latest_runtime_handler(
    State(state): State<LocalLlmState>,
) -> Result<Json<runtime::ReleaseInfo>, (StatusCode, String)> {
    let sys = state.get_system_info_cached();
    let avail: Vec<String> = sys
        .available_backends
        .iter()
        .filter(|b| b.available)
        .map(|b| b.id.clone())
        .collect();
    let release = runtime::fetch_latest_release(&state.http_client, &avail)
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    Ok(Json(release))
}

#[derive(Deserialize)]
struct DownloadRuntimePayload {
    asset: AssetOption,
    tag_name: String,
}

async fn download_runtime_handler(
    State(state): State<LocalLlmState>,
    Json(payload): Json<DownloadRuntimePayload>,
) -> Json<Value> {
    let state_clone = state.clone();
    tokio::spawn(async move {
        let base_dir = state_clone.get_config().base_dir.clone();
        let downloads_map = state_clone.downloads.clone();
        let res = runtime::download_runtime(
            &state_clone.http_client,
            &base_dir,
            &payload.asset,
            &payload.tag_name,
            move |prog| {
                let mut guard = downloads_map.lock().unwrap();
                guard.insert("runtime".to_string(), prog);
            },
        )
        .await;

        match res {
            Ok(dl) => {
                let mut cfg = state_clone.config.lock().unwrap();
                let _ = runtime::register_downloaded_runtime(&mut cfg, dl);
                let _ = cfg.save();
            }
            Err(e) => {
                let mut guard = state_clone.downloads.lock().unwrap();
                guard.insert(
                    "runtime".to_string(),
                    DownloadProgress {
                        id: "runtime".to_string(),
                        bytes_downloaded: 0,
                        total_bytes: 0,
                        percent: 0.0,
                        status: format!("error: {}", e),
                    },
                );
            }
        }
    });

    Json(json!({ "started": true, "id": "runtime" }))
}

#[derive(Deserialize)]
struct ScanRuntimePayload {
    path: String,
}

async fn scan_runtime_handler(
    Json(payload): Json<ScanRuntimePayload>,
) -> Result<Json<runtime::ScanResult>, (StatusCode, String)> {
    let p = PathBuf::from(payload.path.trim());
    let res = runtime::scan_for_builds(&p).map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
    Ok(Json(res))
}

async fn browse_runtime_handler(
    State(state): State<LocalLlmState>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let chosen = tokio::task::spawn_blocking(|| {
        rfd::FileDialog::new()
            .set_title("Select llama-server Binary or Folder")
            .pick_file()
    })
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if let Some(path) = chosen {
        let mut cfg = state.config.lock().unwrap();
        runtime::set_custom_runtime(&path, &mut cfg)
            .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
        cfg.save().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        return Ok(Json(json!({ "cancelled": false, "path": path })));
    }

    Ok(Json(json!({ "cancelled": true })))
}

async fn browse_runtime_dir_handler(
    State(state): State<LocalLlmState>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let chosen = tokio::task::spawn_blocking(|| {
        rfd::FileDialog::new()
            .set_title("Select llama.cpp Directory")
            .pick_folder()
    })
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if let Some(dir) = chosen {
        let scan = runtime::scan_for_builds(&dir)
            .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
        if scan.is_source_distribution && !scan.builds.is_empty() {
            let mut cfg = state.config.lock().unwrap();
            let mut first_new = None;
            for b in &scan.builds {
                if cfg.custom_runtimes.iter().any(|c| c.binary_path == b.binary_path) {
                    continue;
                }
                let idx = cfg.custom_runtimes.len();
                if first_new.is_none() {
                    first_new = Some(idx);
                }
                cfg.custom_runtimes.push(config::CustomRuntime {
                    label: b.label.clone(),
                    binary_path: b.binary_path.clone(),
                });
            }
            if let Some(idx) = first_new {
                cfg.active_runtime = ActiveRuntime::Custom { index: idx };
            }
            let _ = cfg.save();
        } else if scan.builds.len() == 1 {
            let mut cfg = state.config.lock().unwrap();
            runtime::set_custom_runtime(&scan.builds[0].binary_path, &mut cfg)
                .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
            cfg.save().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        }
        return Ok(Json(json!({
            "cancelled": false,
            "dir": dir,
            "result": scan,
        })));
    }

    Ok(Json(json!({ "cancelled": true })))
}

async fn auto_discover_runtime_handler(
    State(state): State<LocalLlmState>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let (discovered, info) = {
        let mut cfg = state.config.lock().unwrap();
        let changed = runtime::auto_discover_runtime(&mut cfg);
        if changed {
            let _ = cfg.save();
        }
        let info = runtime::get_runtime_info(&cfg)
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        (changed, info)
    };
    Ok(Json(json!({ "discovered": discovered, "info": info })))
}

#[derive(Deserialize)]
struct DeleteCustomRuntimeQuery {
    index: usize,
}

async fn delete_custom_runtime_handler(
    State(state): State<LocalLlmState>,
    Query(query): Query<DeleteCustomRuntimeQuery>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let mut cfg = state.config.lock().unwrap();
    runtime::remove_custom_runtime(query.index, &mut cfg)
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
    cfg.save().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(json!({ "success": true })))
}

#[derive(Deserialize)]
struct AddAllCustomBuildsPayload {
    builds: Vec<runtime::CustomBuild>,
}

async fn add_all_custom_builds_handler(
    State(state): State<LocalLlmState>,
    Json(payload): Json<AddAllCustomBuildsPayload>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let mut cfg = state.config.lock().unwrap();
    let mut first_new = None;
    for b in payload.builds {
        if cfg.custom_runtimes.iter().any(|c| c.binary_path == b.binary_path) {
            continue;
        }
        let idx = cfg.custom_runtimes.len();
        if first_new.is_none() {
            first_new = Some(idx);
        }
        cfg.custom_runtimes.push(config::CustomRuntime {
            label: b.label,
            binary_path: b.binary_path,
        });
    }
    if let Some(idx) = first_new {
        cfg.active_runtime = ActiveRuntime::Custom { index: idx };
    }
    cfg.save().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(json!({ "success": true })))
}

#[derive(Deserialize)]
struct SetAutoDeletePayload {
    enabled: bool,
}

async fn set_auto_delete_handler(
    State(state): State<LocalLlmState>,
    Json(payload): Json<SetAutoDeletePayload>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let mut cfg = state.config.lock().unwrap();
    cfg.auto_delete_old_runtimes = payload.enabled;
    cfg.save().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(json!({ "success": true })))
}

#[derive(Deserialize)]
struct SelectRuntimePayload {
    runtime_type: String, // "managed" | "custom"
    build: Option<u32>,
    backend_id: Option<String>,
    custom_path: Option<String>,
    custom_index: Option<usize>,
}

async fn select_runtime_handler(
    State(state): State<LocalLlmState>,
    Json(payload): Json<SelectRuntimePayload>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let mut cfg = state.config.lock().unwrap();
    if payload.runtime_type == "managed" {
        let build = payload.build.ok_or((StatusCode::BAD_REQUEST, "Missing build".to_string()))?;
        cfg.active_runtime = ActiveRuntime::Managed {
            build,
            backend_id: payload.backend_id.unwrap_or_default(),
        };
    } else if let Some(path_str) = payload.custom_path {
        runtime::set_custom_runtime(&PathBuf::from(path_str), &mut cfg)
            .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
    } else if let Some(idx) = payload.custom_index {
        cfg.active_runtime = ActiveRuntime::Custom { index: idx };
    }
    cfg.save().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(json!({ "success": true, "active_runtime": cfg.active_runtime })))
}

#[derive(Deserialize)]
struct DeleteRuntimeQuery {
    build: u32,
    backend_id: Option<String>,
}

async fn delete_runtime_handler(
    State(state): State<LocalLlmState>,
    Query(query): Query<DeleteRuntimeQuery>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let mut cfg = state.config.lock().unwrap();
    runtime::delete_managed_runtime(query.build, query.backend_id.as_deref().unwrap_or(""), &mut cfg)
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
    cfg.save().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(json!({ "success": true })))
}

async fn list_models_handler(
    State(state): State<LocalLlmState>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let cfg = state.get_config();
    let installed: Vec<ModelInfo> =
        models::list_installed_models(&cfg).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let recommended: Vec<RecommendedModel> =
        models::get_recommended_models(&cfg).unwrap_or_default();

    Ok(Json(json!({
        "installed": installed,
        "recommended": recommended,
        "model_dirs": cfg.model_dirs,
        "download_dir": cfg.download_dir,
        "selected_model_id": cfg.selected_model_id,
    })))
}

#[derive(Deserialize)]
struct DeleteModelQuery {
    path: String,
}

async fn delete_model_handler(
    State(state): State<LocalLlmState>,
    Query(query): Query<DeleteModelQuery>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let p = PathBuf::from(&query.path);
    models::delete_model(&p).map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
    {
        let mut cfg = state.config.lock().unwrap();
        cfg.extra_model_files.retain(|f| f != &p);
        let _ = cfg.save();
    }
    Ok(Json(json!({ "success": true })))
}

async fn browse_gguf_file_handler(
    State(state): State<LocalLlmState>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let chosen = tokio::task::spawn_blocking(|| {
        rfd::FileDialog::new()
            .add_filter("GGUF Model", &["gguf"])
            .set_title("Select Local GGUF Model")
            .pick_file()
    })
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if let Some(path) = chosen {
        let mut cfg = state.config.lock().unwrap();
        if !cfg.extra_model_files.contains(&path) {
            cfg.extra_model_files.push(path.clone());
            let _ = cfg.save();
        }
        let installed = models::list_installed_models(&cfg).unwrap_or_default();
        return Ok(Json(json!({
            "cancelled": false,
            "file_path": path,
            "installed": installed,
        })));
    }
    Ok(Json(json!({ "cancelled": true })))
}

async fn browse_models_dir_handler(
    State(state): State<LocalLlmState>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let chosen = tokio::task::spawn_blocking(|| {
        rfd::FileDialog::new()
            .set_title("Select GGUF Models Folder")
            .pick_folder()
    })
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if let Some(dir) = chosen {
        let mut cfg = state.config.lock().unwrap();
        if !cfg.model_dirs.contains(&dir) {
            cfg.model_dirs.push(dir.clone());
            let _ = cfg.save();
        }
        return Ok(Json(json!({ "cancelled": false, "dir": dir, "model_dirs": cfg.model_dirs })));
    }
    Ok(Json(json!({ "cancelled": true })))
}

#[derive(Deserialize)]
struct UpdateModelDirsPayload {
    action: String, // "add" | "remove" | "set_download"
    path: PathBuf,
}

async fn update_model_dirs_handler(
    State(state): State<LocalLlmState>,
    Json(payload): Json<UpdateModelDirsPayload>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let mut cfg = state.config.lock().unwrap();
    match payload.action.as_str() {
        "add" => {
            if !cfg.model_dirs.contains(&payload.path) {
                cfg.model_dirs.push(payload.path);
            }
        }
        "remove" => {
            cfg.model_dirs.retain(|d| d != &payload.path);
        }
        "set_download" => {
            if !cfg.model_dirs.contains(&payload.path) {
                cfg.model_dirs.push(payload.path.clone());
            }
            cfg.download_dir = Some(payload.path);
        }
        _ => {}
    }
    cfg.save().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(json!({
        "model_dirs": cfg.model_dirs,
        "download_dir": cfg.download_dir,
    })))
}

#[derive(Deserialize)]
struct HfSearchQuery {
    q: String,
    owner: Option<String>,
}

async fn hf_search_handler(
    State(state): State<LocalLlmState>,
    Query(query): Query<HfSearchQuery>,
) -> Result<Json<Vec<HfModel>>, (StatusCode, String)> {
    let res = huggingface::search_models(&state.http_client, &query.q, query.owner.as_deref())
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    Ok(Json(res))
}

#[derive(Deserialize)]
struct HfFilesQuery {
    repo_id: String,
}

async fn hf_files_handler(
    State(state): State<LocalLlmState>,
    Query(query): Query<HfFilesQuery>,
) -> Result<Json<Vec<HfFile>>, (StatusCode, String)> {
    let res = huggingface::get_repo_files(&state.http_client, &query.repo_id)
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    Ok(Json(res))
}

#[derive(Deserialize)]
struct HfDownloadPayload {
    repo_id: String,
    file: HfFile,
}

async fn hf_download_handler(
    State(state): State<LocalLlmState>,
    Json(payload): Json<HfDownloadPayload>,
) -> Json<Value> {
    let file_id = payload.file.filename.clone();
    let state_clone = state.clone();
    tokio::spawn(async move {
        let cfg = state_clone.get_config();
        let downloads_map = state_clone.downloads.clone();
        let id_for_err = payload.file.filename.clone();
        let res = models::download_model(
            &state_clone.http_client,
            &payload.repo_id,
            &payload.file,
            &cfg,
            move |prog| {
                let mut guard = downloads_map.lock().unwrap();
                guard.insert(prog.id.clone(), prog);
            },
        )
        .await;

        if let Err(e) = res {
            let mut guard = state_clone.downloads.lock().unwrap();
            guard.insert(
                id_for_err.clone(),
                DownloadProgress {
                    id: id_for_err,
                    bytes_downloaded: 0,
                    total_bytes: payload.file.size_bytes,
                    percent: 0.0,
                    status: format!("error: {}", e),
                },
            );
        }
    });

    Json(json!({ "started": true, "id": file_id }))
}

async fn get_downloads_handler(State(state): State<LocalLlmState>) -> Json<Vec<DownloadProgress>> {
    let guard = state.downloads.lock().unwrap();
    Json(guard.values().cloned().collect())
}

#[derive(Deserialize)]
struct AbortDownloadPayload {
    filename: String,
}

async fn abort_download_handler(
    State(state): State<LocalLlmState>,
    Json(payload): Json<AbortDownloadPayload>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let cfg = state.get_config();
    models::abort_download(&payload.filename, &cfg)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let mut guard = state.downloads.lock().unwrap();
    guard.remove(&payload.filename);
    Ok(Json(json!({ "success": true })))
}

async fn server_status_handler(State(state): State<LocalLlmState>) -> Json<Value> {
    let s = state.server.lock().unwrap();
    Json(json!({
        "status": s.status,
        "loaded_model_path": s.loaded_model_path,
        "logs": s.log_lines,
    }))
}

#[derive(Deserialize)]
struct ServerStartPayload {
    model_path: Option<String>,
    server_config: Option<ServerConfig>,
}

async fn server_start_handler(
    State(state): State<LocalLlmState>,
    Json(payload): Json<ServerStartPayload>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let mut cfg = state.get_config();
    if let Some(sc) = payload.server_config {
        cfg.server_config = sc;
    }
    if let Some(mp) = payload.model_path {
        if !mp.trim().is_empty() {
            cfg.server_config.model_path = mp;
        }
    }
    if cfg.server_config.model_path.trim().is_empty() {
        return Err((StatusCode::BAD_REQUEST, "No GGUF model selected".to_string()));
    }

    let rt_info = runtime::get_runtime_info(&cfg).map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
    let server_binary = rt_info.server_binary.ok_or((
        StatusCode::BAD_REQUEST,
        "llama-server binary not found. Please install a runtime in Settings -> Models -> Offline GGUF Engine.".to_string(),
    ))?;

    let installed = models::list_installed_models(&cfg).unwrap_or_default();
    if let Some(m) = installed.iter().find(|m| m.path.to_string_lossy() == cfg.server_config.model_path) {
        cfg.server_config.mmproj_path = m.mmproj_path.as_ref().map(|p| p.to_string_lossy().to_string());
        cfg.selected_model_id = Some(m.id.clone());
    }

    {
        let mut guard = state.config.lock().unwrap();
        *guard = cfg.clone();
        let _ = guard.save();
    }

    let needs_stop = {
        let s = state.server.lock().unwrap();
        s.is_running()
    };
    if needs_stop {
        let _ = server::stop_server(&state.server).await;
    }

    server::start_server(&server_binary, &cfg.server_config, state.server.clone())
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let s = state.server.lock().unwrap();
    Ok(Json(json!({
        "success": true,
        "status": s.status,
        "loaded_model_path": s.loaded_model_path,
    })))
}

async fn server_stop_handler(
    State(state): State<LocalLlmState>,
) -> Result<Json<Value>, (StatusCode, String)> {
    server::stop_server(&state.server)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(json!({ "success": true })))
}

#[derive(Deserialize)]
struct ServerEnsurePayload {
    model_key: String,
}

async fn server_ensure_handler(
    State(state): State<LocalLlmState>,
    Json(payload): Json<ServerEnsurePayload>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let (base_url, model_name) = state
        .ensure_model_running(&payload.model_key)
        .await
        .map_err(|e| (StatusCode::BAD_REQUEST, e))?;
    Ok(Json(json!({
        "success": true,
        "base_url": base_url,
        "model": model_name,
    })))
}
