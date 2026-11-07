pub mod catalog_client;
pub mod download_manager;
pub mod library_manager;
pub mod models;
pub mod opds_parser;
pub mod zim_reader;

use crate::db::{
    ArchiveUserMetadataRecord, CatalogSourceRecord, Database, DownloadBundleRecord,
    LibraryCollectionRecord, SavedCatalogSearchRecord, ScanDirectoryRecord, StorageRootRecord,
};
use axum::{
    body::Body,
    extract::{Path as AxumPath, Query, State},
    http::{header, HeaderValue, StatusCode},
    response::Response,
    routing::{delete, get, post},
    Json, Router,
};
use tower_http::cors::{Any, CorsLayer};
use catalog_client::KiwixCatalogClient;
use download_manager::DownloadManager;
use library_manager::LibraryManager;
use models::{
    CatalogLanguage, CatalogQuery, CatalogResponse, DownloadTask, ImportLocalZimRequest,
    StartDownloadRequest, ZimArchive, ZimArticleContent, ZimArticleSummary,
    ZimLibraryItem,
};
use serde::Deserialize;
use serde_json::json;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use zim_reader::ZimReader;

#[derive(Clone)]
pub struct KnowledgeStoreState {
    pub catalog_client: KiwixCatalogClient,
    pub download_manager: DownloadManager,
    pub library_manager: LibraryManager,
    pub db: Database,
}

impl KnowledgeStoreState {
    pub fn new(app_data_dir: &Path, db: Database, catalog_url: Option<String>) -> Self {
        Self {
            catalog_client: KiwixCatalogClient::new(catalog_url),
            download_manager: DownloadManager::new(),
            library_manager: LibraryManager::new(app_data_dir),
            db,
        }
    }
}

pub fn create_knowledge_router(state: KnowledgeStoreState) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    Router::new()
        .route("/api/knowledge/catalog", get(get_catalog_handler))
        .route("/api/knowledge/categories", get(get_categories_handler))
        .route("/api/knowledge/languages", get(get_languages_handler))
        .route("/api/knowledge/browse-file", post(browse_zim_file_handler))
        .route("/api/knowledge/entry/:id", get(get_entry_handler))
        .route("/api/knowledge/library", get(get_library_handler))
        .route("/api/knowledge/import", post(import_zim_handler))
        .route("/api/knowledge/library/:id", delete(delete_library_item_handler))
        .route("/api/knowledge/library/:id/reveal", post(reveal_library_item_handler))
        .route("/api/knowledge/downloads", get(get_downloads_handler))
        .route("/api/knowledge/download", post(start_download_handler))
        .route("/api/knowledge/downloads/:id/pause", post(pause_download_handler))
        .route("/api/knowledge/downloads/:id/resume", post(resume_download_handler))
        .route("/api/knowledge/downloads/:id/cancel", post(cancel_download_handler))
        .route("/api/knowledge/zim/:id/articles", get(get_zim_articles_handler))
        .route("/api/knowledge/zim/:id/article", get(get_zim_article_content_handler))
        .route("/api/knowledge/zim/:id/resource", get(get_zim_resource_handler))
        .route("/api/knowledge/saved-searches", get(get_saved_searches_handler).post(save_search_handler))
        .route("/api/knowledge/saved-searches/:id", delete(delete_saved_search_handler))
        .route("/api/knowledge/disk-space", get(get_disk_space_handler))
        // CAT-006: Multiple Catalog Sources
        .route("/api/knowledge/sources", get(get_sources_handler).post(save_source_handler))
        .route("/api/knowledge/sources/:id", delete(delete_source_handler))
        .route("/api/knowledge/sources/test", post(test_source_handler))
        // DL-003, DL-009: Download Bulk Actions & Download Center
        .route("/api/knowledge/downloads/pause-all", post(pause_all_downloads_handler))
        .route("/api/knowledge/downloads/resume-all", post(resume_all_downloads_handler))
        .route("/api/knowledge/downloads/clear-completed", post(clear_completed_downloads_handler))
        // DL-007: Download Bundles
        .route("/api/knowledge/bundles", get(get_bundles_handler).post(save_bundle_handler))
        .route("/api/knowledge/bundles/:id", delete(delete_bundle_handler))
        // LIB-002, LIB-005, LIB-006, LIB-007: Library Stats, Duplicates, Relink, Health Check
        .route("/api/knowledge/library/stats", get(get_library_stats_handler))
        .route("/api/knowledge/library/duplicates", get(get_library_duplicates_handler))
        .route("/api/knowledge/library/:id/health-check", post(health_check_archive_handler))
        .route("/api/knowledge/library/:id/relink", post(relink_archive_handler))
        // LIB-003: Collections Manager
        .route("/api/knowledge/collections", get(get_collections_handler).post(save_collection_handler))
        .route("/api/knowledge/collections/:id", delete(delete_collection_handler))
        .route("/api/knowledge/collections/:id/members", post(manage_collection_member_handler))
        .route("/api/knowledge/library/:id/collections", get(get_archive_collections_handler))
        // LIB-004: Scanner Folders
        .route("/api/knowledge/scanner/folders", get(get_scan_folders_handler).post(save_scan_folder_handler))
        .route("/api/knowledge/scanner/folders/:id", delete(delete_scan_folder_handler))
        .route("/api/knowledge/scanner/scan", post(run_scanner_handler))
        // LIB-008: Storage Roots
        .route("/api/knowledge/storage/roots", get(get_storage_roots_handler).post(save_storage_root_handler))
        .route("/api/knowledge/storage/roots/:id", delete(delete_storage_root_handler))
        // LIB-009: User Metadata & Personal Tags/Notes
        .route("/api/knowledge/library/:id/meta", get(get_archive_meta_handler).post(save_archive_meta_handler))
        // LIB-010: Backup & Restore
        .route("/api/knowledge/backup", get(get_backup_snapshot_handler))
        .route("/api/knowledge/restore", post(restore_backup_snapshot_handler))
        .layer(cors)
        .with_state(state)
}

// Handlers

async fn get_catalog_handler(
    State(state): State<KnowledgeStoreState>,
    Query(query): Query<CatalogQuery>,
) -> Result<Json<CatalogResponse>, (StatusCode, String)> {
    let mut response = state
        .catalog_client
        .fetch_entries(&query)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;

    // Cross-reference with installed library items to mark `is_installed`
    let installed = state.library_manager.list_archives().await;
    let installed_names: HashMap<String, String> = installed
        .into_iter()
        .map(|item| (item.file_name.to_lowercase(), item.file_path))
        .collect();

    for entry in response.entries.iter_mut() {
        if let Some(ref dl_url) = entry.download_url {
            let file_name = dl_url
                .split('/')
                .last()
                .unwrap_or("")
                .split('?')
                .next()
                .unwrap_or("")
                .to_lowercase();

            if !file_name.is_empty() {
                if let Some(path) = installed_names.get(&file_name) {
                    entry.is_installed = true;
                    entry.local_path = Some(path.clone());
                }
            }
        }
    }

    Ok(Json(response))
}

async fn get_categories_handler(
    State(state): State<KnowledgeStoreState>,
) -> Json<Vec<String>> {
    let cats = state.catalog_client.get_categories().await.unwrap_or_default();
    Json(cats)
}

async fn get_languages_handler(
    State(state): State<KnowledgeStoreState>,
) -> Json<Vec<CatalogLanguage>> {
    let langs = state.catalog_client.get_languages().await.unwrap_or_default();
    Json(langs)
}

async fn browse_zim_file_handler() -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let chosen = tokio::task::spawn_blocking(|| {
        rfd::FileDialog::new()
            .add_filter("ZIM Archive", &["zim"])
            .set_title("Select Local ZIM Archive")
            .pick_file()
    })
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if let Some(path) = chosen {
        Ok(Json(json!({
            "cancelled": false,
            "file_path": path.to_string_lossy().to_string()
        })))
    } else {
        Ok(Json(json!({
            "cancelled": true,
            "file_path": null
        })))
    }
}

async fn get_entry_handler(
    State(state): State<KnowledgeStoreState>,
    AxumPath(id): AxumPath<String>,
) -> Result<Json<ZimArchive>, (StatusCode, String)> {
    let entry = state
        .catalog_client
        .get_entry_details(&id)
        .await
        .map_err(|e| (StatusCode::NOT_FOUND, e))?;
    Ok(Json(entry))
}

async fn get_library_handler(
    State(state): State<KnowledgeStoreState>,
) -> Json<Vec<ZimLibraryItem>> {
    let items = state.library_manager.list_archives().await;
    Json(items)
}

async fn import_zim_handler(
    State(state): State<KnowledgeStoreState>,
    Json(payload): Json<ImportLocalZimRequest>,
) -> Result<Json<ZimLibraryItem>, (StatusCode, String)> {
    let copy = payload.copy_to_library.unwrap_or(false);
    let item = state
        .library_manager
        .import_file(&payload.file_path, copy)
        .await
        .map_err(|e| (StatusCode::BAD_REQUEST, e))?;
    Ok(Json(item))
}

#[derive(Debug, Deserialize)]
struct DeleteArchiveQuery {
    delete_file: Option<bool>,
}

async fn delete_library_item_handler(
    State(state): State<KnowledgeStoreState>,
    AxumPath(id): AxumPath<String>,
    Query(query): Query<DeleteArchiveQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let delete_from_disk = query.delete_file.unwrap_or(false);
    state
        .library_manager
        .remove_or_delete_archive(&id, delete_from_disk)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
    Ok(Json(json!({ "success": true })))
}

async fn reveal_library_item_handler(
    State(state): State<KnowledgeStoreState>,
    AxumPath(id): AxumPath<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    state
        .library_manager
        .reveal_archive(&id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
    Ok(Json(json!({ "success": true })))
}

async fn get_downloads_handler(
    State(state): State<KnowledgeStoreState>,
) -> Json<Vec<DownloadTask>> {
    let tasks = state.download_manager.get_all_tasks().await;
    Json(tasks)
}

async fn start_download_handler(
    State(state): State<KnowledgeStoreState>,
    Json(payload): Json<StartDownloadRequest>,
) -> Result<Json<DownloadTask>, (StatusCode, String)> {
    let zim_dir = state.library_manager.zim_dir.clone();
    let task = state
        .download_manager
        .start_download(payload, zim_dir)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
    Ok(Json(task))
}

async fn pause_download_handler(
    State(state): State<KnowledgeStoreState>,
    AxumPath(id): AxumPath<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    state
        .download_manager
        .pause_download(&id)
        .await
        .map_err(|e| (StatusCode::BAD_REQUEST, e))?;
    Ok(Json(json!({ "success": true })))
}

async fn resume_download_handler(
    State(state): State<KnowledgeStoreState>,
    AxumPath(id): AxumPath<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let zim_dir = state.library_manager.zim_dir.clone();
    state
        .download_manager
        .resume_download(&id, zim_dir)
        .await
        .map_err(|e| (StatusCode::BAD_REQUEST, e))?;
    Ok(Json(json!({ "success": true })))
}

async fn cancel_download_handler(
    State(state): State<KnowledgeStoreState>,
    AxumPath(id): AxumPath<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    state
        .download_manager
        .cancel_download(&id)
        .await
        .map_err(|e| (StatusCode::BAD_REQUEST, e))?;
    Ok(Json(json!({ "success": true })))
}

#[derive(Debug, Deserialize)]
struct SearchArticlesQuery {
    q: Option<String>,
    limit: Option<usize>,
}

async fn get_zim_articles_handler(
    State(state): State<KnowledgeStoreState>,
    AxumPath(id): AxumPath<String>,
    Query(params): Query<SearchArticlesQuery>,
) -> Result<Json<Vec<ZimArticleSummary>>, (StatusCode, String)> {
    let archives = state.library_manager.list_archives().await;
    let target = archives
        .into_iter()
        .find(|a| a.id == id || a.file_name == id || a.file_name == format!("{}.zim", id))
        .ok_or_else(|| (StatusCode::NOT_FOUND, "ZIM archive not found".to_string()))?;

    let path = PathBuf::from(&target.file_path);
    let q = params.q.unwrap_or_default();
    let limit = params.limit.unwrap_or(50);

    let results = tokio::task::spawn_blocking(move || {
        ZimReader::search_articles(&path, &q, limit)
    })
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;

    Ok(Json(results))
}

#[derive(Debug, Deserialize)]
struct ReadArticleQuery {
    url: String,
}

async fn get_zim_article_content_handler(
    State(state): State<KnowledgeStoreState>,
    AxumPath(id): AxumPath<String>,
    Query(params): Query<ReadArticleQuery>,
) -> Result<Json<ZimArticleContent>, (StatusCode, String)> {
    let archives = state.library_manager.list_archives().await;
    let target = archives
        .into_iter()
        .find(|a| a.id == id || a.file_name == id || a.file_name == format!("{}.zim", id))
        .ok_or_else(|| (StatusCode::NOT_FOUND, "ZIM archive not found".to_string()))?;

    let path = PathBuf::from(&target.file_path);
    let article_url = params.url;

    let content = tokio::task::spawn_blocking(move || {
        ZimReader::read_article(&path, &article_url)
    })
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;

    Ok(Json(content))
}

#[derive(Debug, Deserialize)]
struct ReadResourceQuery {
    path: String,
}

async fn get_zim_resource_handler(
    State(state): State<KnowledgeStoreState>,
    AxumPath(id): AxumPath<String>,
    Query(params): Query<ReadResourceQuery>,
) -> Result<Response, (StatusCode, String)> {
    let archives = state.library_manager.list_archives().await;
    let target = archives
        .into_iter()
        .find(|a| a.id == id || a.file_name == id || a.file_name == format!("{}.zim", id))
        .ok_or_else(|| (StatusCode::NOT_FOUND, "ZIM archive not found".to_string()))?;

    let path = PathBuf::from(&target.file_path);
    let res_path = params.path;

    let (mime, bytes) = tokio::task::spawn_blocking(move || {
        ZimReader::read_resource(&path, &res_path)
    })
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .map_err(|e| (StatusCode::NOT_FOUND, e))?;

    let mut response = Response::new(Body::from(bytes));
    if let Ok(val) = HeaderValue::from_str(&mime) {
        response.headers_mut().insert(header::CONTENT_TYPE, val);
    }
    response.headers_mut().insert(
        header::CACHE_CONTROL,
        HeaderValue::from_static("public, max-age=86400"),
    );

    Ok(response)
}

// Saved Searches Handlers
async fn get_saved_searches_handler(
    State(state): State<KnowledgeStoreState>,
) -> Result<Json<Vec<SavedCatalogSearchRecord>>, (StatusCode, String)> {
    let items = state
        .db
        .get_saved_catalog_searches()
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(items))
}

#[derive(Debug, Deserialize)]
struct SaveSearchPayload {
    name: String,
    query: Option<String>,
    filters: serde_json::Value,
}

async fn save_search_handler(
    State(state): State<KnowledgeStoreState>,
    Json(payload): Json<SaveSearchPayload>,
) -> Result<Json<SavedCatalogSearchRecord>, (StatusCode, String)> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let record = SavedCatalogSearchRecord {
        id: id.clone(),
        name: payload.name,
        query: payload.query.unwrap_or_default(),
        filters_json: payload.filters,
        sort_order: 0,
        created_at: now.clone(),
        updated_at: now,
    };
    state
        .db
        .save_catalog_search(&record)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(record))
}

async fn delete_saved_search_handler(
    State(state): State<KnowledgeStoreState>,
    AxumPath(id): AxumPath<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    state
        .db
        .delete_saved_catalog_search(&id)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(json!({ "success": true })))
}

// Disk Space Check
#[cfg(target_os = "windows")]
fn get_available_disk_space(path: &Path) -> (u64, u64) {
    use std::os::windows::ffi::OsStrExt;
    let wide: Vec<u16> = path.as_os_str().encode_wide().chain(Some(0)).collect();
    let mut free_bytes_available: u64 = 0;
    let mut total_number_of_bytes: u64 = 0;
    let mut total_number_of_free_bytes: u64 = 0;
    unsafe {
        #[link(name = "kernel32")]
        extern "system" {
            fn GetDiskFreeSpaceExW(
                lpDirectoryName: *const u16,
                lpBytesAvailableToCaller: *mut u64,
                lpTotalNumberOfBytes: *mut u64,
                lpTotalNumberOfFreeBytes: *mut u64,
            ) -> i32;
        }
        if GetDiskFreeSpaceExW(
            wide.as_ptr(),
            &mut free_bytes_available,
            &mut total_number_of_bytes,
            &mut total_number_of_free_bytes,
        ) != 0
        {
            return (free_bytes_available, total_number_of_bytes);
        }
    }
    (0, 0)
}

#[cfg(not(target_os = "windows"))]
fn get_available_disk_space(_path: &Path) -> (u64, u64) {
    (100 * 1024 * 1024 * 1024, 500 * 1024 * 1024 * 1024)
}

async fn get_disk_space_handler(
    State(state): State<KnowledgeStoreState>,
) -> Json<serde_json::Value> {
    let zim_dir = state.library_manager.zim_dir.clone();
    let (free_bytes, total_bytes) = get_available_disk_space(&zim_dir);
    Json(json!({
        "free_bytes": free_bytes,
        "total_bytes": total_bytes,
        "destination_path": zim_dir.to_string_lossy().to_string()
    }))
}

// --- CAT-006: Multiple Catalog Sources Handlers ---
async fn get_sources_handler(
    State(state): State<KnowledgeStoreState>,
) -> Result<Json<Vec<CatalogSourceRecord>>, (StatusCode, String)> {
    let list = state
        .db
        .get_catalog_sources()
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(list))
}

#[derive(Debug, Deserialize)]
struct SaveSourcePayload {
    id: Option<String>,
    name: String,
    url: String,
    is_enabled: Option<bool>,
    priority: Option<i64>,
}

async fn save_source_handler(
    State(state): State<KnowledgeStoreState>,
    Json(payload): Json<SaveSourcePayload>,
) -> Result<Json<CatalogSourceRecord>, (StatusCode, String)> {
    let clean_url = payload.url.trim().to_string();
    if !clean_url.starts_with("https://") && !clean_url.starts_with("http://") {
        return Err((StatusCode::BAD_REQUEST, "URL must start with http:// or https://".to_string()));
    }
    // Basic SSRF protection
    let lower = clean_url.to_lowercase();
    if lower.contains("localhost") || lower.contains("127.0.0.1") || lower.contains("169.254.") || lower.contains("0.0.0.0") {
        return Err((StatusCode::FORBIDDEN, "Local and loopback network addresses are blocked for catalog sources".to_string()));
    }

    let now = chrono::Utc::now().to_rfc3339();
    let id = payload.id.unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
    let record = CatalogSourceRecord {
        id,
        name: payload.name.trim().to_string(),
        url: clean_url,
        is_enabled: payload.is_enabled.unwrap_or(true),
        is_default: false,
        priority: payload.priority.unwrap_or(1),
        created_at: now.clone(),
        updated_at: now,
    };
    state
        .db
        .save_catalog_source(&record)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(record))
}

async fn delete_source_handler(
    State(state): State<KnowledgeStoreState>,
    AxumPath(id): AxumPath<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    state
        .db
        .delete_catalog_source(&id)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(json!({ "success": true })))
}

#[derive(Debug, Deserialize)]
struct TestSourcePayload {
    url: String,
}

async fn test_source_handler(
    Json(payload): Json<TestSourcePayload>,
) -> Json<serde_json::Value> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(8))
        .build()
        .unwrap_or_default();

    match client.get(&payload.url).send().await {
        Ok(res) => {
            let status = res.status().as_u16();
            let is_success = res.status().is_success();
            Json(json!({
                "success": is_success,
                "status": status,
                "message": if is_success { "Connection successful" } else { "Server returned HTTP error" }
            }))
        }
        Err(e) => {
            Json(json!({
                "success": false,
                "status": 0,
                "message": e.to_string()
            }))
        }
    }
}

// --- DL-003, DL-009: Download Bulk Actions ---
async fn pause_all_downloads_handler(
    State(state): State<KnowledgeStoreState>,
) -> Json<serde_json::Value> {
    state.download_manager.pause_all().await;
    Json(json!({ "success": true }))
}

async fn resume_all_downloads_handler(
    State(state): State<KnowledgeStoreState>,
) -> Json<serde_json::Value> {
    let zim_dir = state.library_manager.zim_dir.clone();
    state.download_manager.resume_all(zim_dir).await;
    Json(json!({ "success": true }))
}

async fn clear_completed_downloads_handler(
    State(state): State<KnowledgeStoreState>,
) -> Json<serde_json::Value> {
    state.download_manager.clear_completed().await;
    Json(json!({ "success": true }))
}

// --- DL-007: Download Bundles Handlers ---
async fn get_bundles_handler(
    State(state): State<KnowledgeStoreState>,
) -> Result<Json<Vec<DownloadBundleRecord>>, (StatusCode, String)> {
    let bundles = state
        .db
        .get_download_bundles()
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(bundles))
}

#[derive(Debug, Deserialize)]
struct SaveBundlePayload {
    id: Option<String>,
    name: String,
    archive_ids: Vec<String>,
    total_bytes: Option<i64>,
}

async fn save_bundle_handler(
    State(state): State<KnowledgeStoreState>,
    Json(payload): Json<SaveBundlePayload>,
) -> Result<Json<DownloadBundleRecord>, (StatusCode, String)> {
    let id = payload.id.unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
    let now = chrono::Utc::now().to_rfc3339();
    let record = DownloadBundleRecord {
        id,
        name: payload.name.trim().to_string(),
        archive_ids: payload.archive_ids,
        total_bytes: payload.total_bytes.unwrap_or(0),
        status: "ready".to_string(),
        created_at: now.clone(),
        updated_at: now,
    };
    state
        .db
        .save_download_bundle(&record)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(record))
}

async fn delete_bundle_handler(
    State(state): State<KnowledgeStoreState>,
    AxumPath(id): AxumPath<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    state
        .db
        .delete_download_bundle(&id)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(json!({ "success": true })))
}

// --- LIB-002, LIB-005, LIB-006, LIB-007: Library Overview, Duplicates, Relink & Health ---
async fn get_library_stats_handler(
    State(state): State<KnowledgeStoreState>,
) -> Json<serde_json::Value> {
    let items = state.library_manager.list_archives().await;
    let total_archives = items.len();
    let available_archives = items.iter().filter(|i| i.is_valid && i.status != "missing").count();
    let missing_archives = items.iter().filter(|i| i.status == "missing").count();

    let mut total_size_bytes: u64 = 0;
    let mut managed_size_bytes: u64 = 0;
    let mut linked_size_bytes: u64 = 0;
    let mut total_articles: u64 = 0;

    for item in items.iter() {
        total_size_bytes += item.file_size;
        total_articles += item.article_count as u64;
        if item.is_external {
            linked_size_bytes += item.file_size;
        } else {
            managed_size_bytes += item.file_size;
        }
    }

    Json(json!({
        "total_archives": total_archives,
        "available_archives": available_archives,
        "missing_archives": missing_archives,
        "total_size_bytes": total_size_bytes,
        "managed_size_bytes": managed_size_bytes,
        "linked_size_bytes": linked_size_bytes,
        "total_articles": total_articles
    }))
}

async fn get_library_duplicates_handler(
    State(state): State<KnowledgeStoreState>,
) -> Json<serde_json::Value> {
    let items = state.library_manager.list_archives().await;
    let mut groups: HashMap<String, Vec<ZimLibraryItem>> = HashMap::new();

    for item in items {
        if item.file_size > 0 {
            let key = format!("{}_{}", item.file_size, item.title.trim().to_lowercase());
            groups.entry(key).or_default().push(item);
        }
    }

    let duplicate_groups: Vec<serde_json::Value> = groups
        .into_iter()
        .filter(|(_, list)| list.len() > 1)
        .map(|(_, list)| {
            json!({
                "title": list[0].title.clone(),
                "file_size": list[0].file_size,
                "count": list.len(),
                "items": list
            })
        })
        .collect();

    Json(json!({ "duplicates": duplicate_groups }))
}

async fn health_check_archive_handler(
    State(state): State<KnowledgeStoreState>,
    AxumPath(id): AxumPath<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let archives = state.library_manager.list_archives().await;
    let item = archives
        .into_iter()
        .find(|a| a.id == id || a.file_name == id || a.file_name == format!("{}.zim", id))
        .ok_or_else(|| (StatusCode::NOT_FOUND, "Archive not found in library".to_string()))?;

    let path = PathBuf::from(&item.file_path);
    let now = chrono::Utc::now().to_rfc3339();

    if !path.exists() {
        return Ok(Json(json!({
            "status": "missing",
            "message": "Physical file does not exist at registered path",
            "verified_at": now
        })));
    }

    match zim::Zim::new(&path) {
        Ok(z) => {
            let article_count = z.header.article_count;
            Ok(Json(json!({
                "status": "healthy",
                "message": format!("Valid ZIM archive with {} verified articles", article_count),
                "article_count": article_count,
                "verified_at": now
            })))
        }
        Err(e) => {
            Ok(Json(json!({
                "status": "corrupt",
                "message": format!("Failed to read ZIM header: {}", e),
                "verified_at": now
            })))
        }
    }
}

#[derive(Debug, Deserialize)]
struct RelinkArchivePayload {
    new_path: String,
}

async fn relink_archive_handler(
    State(state): State<KnowledgeStoreState>,
    AxumPath(id): AxumPath<String>,
    Json(payload): Json<RelinkArchivePayload>,
) -> Result<Json<ZimLibraryItem>, (StatusCode, String)> {
    let path = PathBuf::from(&payload.new_path);
    let updated = state
        .library_manager
        .relink_archive(&id, &path)
        .await
        .map_err(|e| (StatusCode::BAD_REQUEST, e))?;
    Ok(Json(updated))
}

// --- LIB-003: Collections Handlers ---
async fn get_collections_handler(
    State(state): State<KnowledgeStoreState>,
) -> Result<Json<Vec<LibraryCollectionRecord>>, (StatusCode, String)> {
    let list = state
        .db
        .get_library_collections()
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(list))
}

#[derive(Debug, Deserialize)]
struct SaveCollectionPayload {
    id: Option<String>,
    name: String,
    description: Option<String>,
    color: Option<String>,
    icon: Option<String>,
}

async fn save_collection_handler(
    State(state): State<KnowledgeStoreState>,
    Json(payload): Json<SaveCollectionPayload>,
) -> Result<Json<LibraryCollectionRecord>, (StatusCode, String)> {
    let id = payload.id.unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
    let now = chrono::Utc::now().to_rfc3339();
    let record = LibraryCollectionRecord {
        id,
        name: payload.name.trim().to_string(),
        description: payload.description.unwrap_or_default(),
        color: payload.color.unwrap_or_else(|| "sky".to_string()),
        icon: payload.icon.unwrap_or_else(|| "folder".to_string()),
        item_count: Some(0),
        created_at: now.clone(),
        updated_at: now,
    };
    state
        .db
        .save_library_collection(&record)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(record))
}

async fn delete_collection_handler(
    State(state): State<KnowledgeStoreState>,
    AxumPath(id): AxumPath<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    state
        .db
        .delete_library_collection(&id)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(json!({ "success": true })))
}

#[derive(Debug, Deserialize)]
struct CollectionMemberPayload {
    archive_id: String,
    action: String, // "add" or "remove"
}

async fn manage_collection_member_handler(
    State(state): State<KnowledgeStoreState>,
    AxumPath(id): AxumPath<String>,
    Json(payload): Json<CollectionMemberPayload>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if payload.action == "add" {
        state
            .db
            .add_archive_to_collection(&payload.archive_id, &id)
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    } else {
        state
            .db
            .remove_archive_from_collection(&payload.archive_id, &id)
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    }
    Ok(Json(json!({ "success": true })))
}

async fn get_archive_collections_handler(
    State(state): State<KnowledgeStoreState>,
    AxumPath(id): AxumPath<String>,
) -> Result<Json<Vec<String>>, (StatusCode, String)> {
    let ids = state
        .db
        .get_archive_collections(&id)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(ids))
}

// --- LIB-004: Scanner Folders Handlers ---
async fn get_scan_folders_handler(
    State(state): State<KnowledgeStoreState>,
) -> Result<Json<Vec<ScanDirectoryRecord>>, (StatusCode, String)> {
    let list = state
        .db
        .get_scan_directories()
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(list))
}

#[derive(Debug, Deserialize)]
struct SaveScanFolderPayload {
    path: String,
    recursive: Option<bool>,
}

async fn save_scan_folder_handler(
    State(state): State<KnowledgeStoreState>,
    Json(payload): Json<SaveScanFolderPayload>,
) -> Result<Json<ScanDirectoryRecord>, (StatusCode, String)> {
    let id = uuid::Uuid::new_v4().to_string();
    let record = ScanDirectoryRecord {
        id,
        path: payload.path.trim().to_string(),
        recursive: payload.recursive.unwrap_or(true),
        last_scanned_at: None,
        created_at: chrono::Utc::now().to_rfc3339(),
    };
    state
        .db
        .save_scan_directory(&record)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(record))
}

async fn delete_scan_folder_handler(
    State(state): State<KnowledgeStoreState>,
    AxumPath(id): AxumPath<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    state
        .db
        .delete_scan_directory(&id)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(json!({ "success": true })))
}

async fn run_scanner_handler(
    State(state): State<KnowledgeStoreState>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let folders = state
        .db
        .get_scan_directories()
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let existing = state.library_manager.list_archives().await;
    let existing_paths: std::collections::HashSet<String> = existing
        .into_iter()
        .map(|a| a.file_path.to_lowercase())
        .collect();

    let mut discovered: Vec<serde_json::Value> = Vec::new();

    for folder in folders {
        let dir = PathBuf::from(&folder.path);
        let found_files = state.library_manager.scan_directory(&dir, folder.recursive);
        for path in found_files {
            let path_str = path.to_string_lossy().to_string();
            let is_already_imported = existing_paths.contains(&path_str.to_lowercase());
            let file_name = path
                .file_name()
                .map(|f| f.to_string_lossy().to_string())
                .unwrap_or_default();

            discovered.push(json!({
                "file_name": file_name,
                "file_path": path_str,
                "is_already_imported": is_already_imported
            }));
        }
    }

    Ok(Json(json!({ "discovered": discovered })))
}

// --- LIB-008: Storage Roots Handlers ---
async fn get_storage_roots_handler(
    State(state): State<KnowledgeStoreState>,
) -> Result<Json<Vec<StorageRootRecord>>, (StatusCode, String)> {
    let mut roots = state
        .db
        .get_storage_roots()
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Always ensure default app zim directory is listed as managed root
    let default_zim_path = state.library_manager.zim_dir.to_string_lossy().to_string();
    if !roots.iter().any(|r| r.path == default_zim_path) {
        roots.insert(
            0,
            StorageRootRecord {
                id: "default-zim-dir".to_string(),
                path: default_zim_path,
                role: "managed".to_string(),
                is_active: true,
                free_bytes: None,
                total_bytes: None,
                created_at: chrono::Utc::now().to_rfc3339(),
            },
        );
    }

    for root in roots.iter_mut() {
        let (free, total) = get_available_disk_space(Path::new(&root.path));
        root.free_bytes = Some(free);
        root.total_bytes = Some(total);
    }

    Ok(Json(roots))
}

#[derive(Debug, Deserialize)]
struct SaveStorageRootPayload {
    path: String,
    role: Option<String>,
}

async fn save_storage_root_handler(
    State(state): State<KnowledgeStoreState>,
    Json(payload): Json<SaveStorageRootPayload>,
) -> Result<Json<StorageRootRecord>, (StatusCode, String)> {
    let id = uuid::Uuid::new_v4().to_string();
    let record = StorageRootRecord {
        id,
        path: payload.path.trim().to_string(),
        role: payload.role.unwrap_or_else(|| "managed".to_string()),
        is_active: true,
        free_bytes: None,
        total_bytes: None,
        created_at: chrono::Utc::now().to_rfc3339(),
    };
    state
        .db
        .save_storage_root(&record)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(record))
}

async fn delete_storage_root_handler(
    State(state): State<KnowledgeStoreState>,
    AxumPath(id): AxumPath<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    state
        .db
        .delete_storage_root(&id)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(json!({ "success": true })))
}

// --- LIB-009: User Metadata & Personal Tags/Notes Handlers ---
async fn get_archive_meta_handler(
    State(state): State<KnowledgeStoreState>,
    AxumPath(id): AxumPath<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let meta = state
        .db
        .get_archive_user_metadata(&id)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(json!(meta)))
}

#[derive(Debug, Deserialize)]
struct SaveArchiveMetaPayload {
    display_name: Option<String>,
    custom_notes: Option<String>,
    custom_tags: Option<Vec<String>>,
    is_favorite: Option<bool>,
}

async fn save_archive_meta_handler(
    State(state): State<KnowledgeStoreState>,
    AxumPath(id): AxumPath<String>,
    Json(payload): Json<SaveArchiveMetaPayload>,
) -> Result<Json<ArchiveUserMetadataRecord>, (StatusCode, String)> {
    let record = ArchiveUserMetadataRecord {
        archive_id: id,
        display_name: payload.display_name,
        custom_notes: payload.custom_notes,
        custom_tags: payload.custom_tags.unwrap_or_default(),
        is_favorite: payload.is_favorite.unwrap_or(false),
        updated_at: chrono::Utc::now().to_rfc3339(),
    };
    state
        .db
        .save_archive_user_metadata(&record)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(record))
}

// --- LIB-010: Backup & Restore Handlers ---
async fn get_backup_snapshot_handler(
    State(state): State<KnowledgeStoreState>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let sources = state.db.get_catalog_sources().unwrap_or_default();
    let collections = state.db.get_library_collections().unwrap_or_default();
    let searches = state.db.get_saved_catalog_searches().unwrap_or_default();
    let roots = state.db.get_storage_roots().unwrap_or_default();
    let scan_dirs = state.db.get_scan_directories().unwrap_or_default();

    Ok(Json(json!({
        "version": 1,
        "backup_date": chrono::Utc::now().to_rfc3339(),
        "sources": sources,
        "collections": collections,
        "saved_searches": searches,
        "storage_roots": roots,
        "scan_directories": scan_dirs
    })))
}

#[derive(Debug, Deserialize)]
struct RestoreSnapshotPayload {
    sources: Option<Vec<CatalogSourceRecord>>,
    collections: Option<Vec<LibraryCollectionRecord>>,
    saved_searches: Option<Vec<SavedCatalogSearchRecord>>,
    storage_roots: Option<Vec<StorageRootRecord>>,
    scan_directories: Option<Vec<ScanDirectoryRecord>>,
}

async fn restore_backup_snapshot_handler(
    State(state): State<KnowledgeStoreState>,
    Json(payload): Json<RestoreSnapshotPayload>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let mut restored_count = 0;

    if let Some(sources) = payload.sources {
        for s in sources {
            let _ = state.db.save_catalog_source(&s);
            restored_count += 1;
        }
    }
    if let Some(cols) = payload.collections {
        for c in cols {
            let _ = state.db.save_library_collection(&c);
            restored_count += 1;
        }
    }
    if let Some(searches) = payload.saved_searches {
        for s in searches {
            let _ = state.db.save_catalog_search(&s);
            restored_count += 1;
        }
    }
    if let Some(roots) = payload.storage_roots {
        for r in roots {
            let _ = state.db.save_storage_root(&r);
            restored_count += 1;
        }
    }
    if let Some(scans) = payload.scan_directories {
        for d in scans {
            let _ = state.db.save_scan_directory(&d);
            restored_count += 1;
        }
    }

    Ok(Json(json!({
        "success": true,
        "restored_items": restored_count
    })))
}
