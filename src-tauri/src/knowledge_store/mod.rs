pub mod catalog_client;
pub mod download_manager;
pub mod library_manager;
pub mod models;
pub mod opds_parser;
pub mod zim_reader;

use crate::db::{
    ArchiveUserMetadataRecord, CatalogSourceRecord, Database, DownloadBundleRecord,
    LibraryCollectionRecord, SavedCatalogSearchRecord, ScanDirectoryRecord, StorageRootRecord,
    ArticleAnnotationRecord, ReadingHistoryRecord, ArticleBookmarkRecord, MedicalGlossaryRecord,
    ClinicalGuidelineRecord, ClinicalConflictRecord, ArchiveVersionRecord,
    PersonalWorkspaceItemRecord,
    OfflineModelRecord, ResearchDossierRecord,
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
        // READ-001 to READ-012: Reader Annotations, History & Bookmarks
        .route("/api/knowledge/reader/annotations", get(get_annotations_handler).post(save_annotation_handler))
        .route("/api/knowledge/reader/annotations/:id", delete(delete_annotation_handler))
        .route("/api/knowledge/reader/history", get(get_reading_history_handler).post(record_reading_history_handler).delete(clear_reading_history_handler))
        .route("/api/knowledge/reader/history/:id", delete(delete_reading_history_item_handler))
        .route("/api/knowledge/reader/bookmarks", get(get_article_bookmarks_handler).post(save_article_bookmark_handler))
        .route("/api/knowledge/reader/bookmarks/:id", delete(delete_article_bookmark_handler))
        // SEARCH-001 to SEARCH-009: Global FTS & Indexing Manager
        .route("/api/knowledge/search/global", get(global_fts_search_handler))
        .route("/api/knowledge/search/index/status", get(get_indexing_status_handler))
        .route("/api/knowledge/search/index/run", post(run_index_archive_handler))
        .route("/api/knowledge/search/index/clear", post(clear_search_index_handler))
        // MED-001 to MED-007: Medical Collections, Glossary, Guidelines & Conflicts
        .route("/api/knowledge/medical/glossary", get(get_medical_glossary_handler).post(save_medical_glossary_handler))
        .route("/api/knowledge/medical/glossary/:id", delete(delete_medical_glossary_handler))
        .route("/api/knowledge/medical/guidelines", get(get_clinical_guidelines_handler).post(save_clinical_guideline_handler))
        .route("/api/knowledge/medical/conflicts", get(get_clinical_conflicts_handler))
        // UPD-001 to UPD-003: Archive Version History & Check
        .route("/api/knowledge/updates/history", get(get_archive_version_history_handler).post(save_archive_version_handler))
        .route("/api/knowledge/updates/check", get(check_archive_updates_handler))
        // AI-001 to AI-006: Local RAG Context Endpoint
        .route("/api/knowledge/ai/rag-context", post(ai_rag_context_handler))
        // EXT-001: Knowledge Recommendations
        .route("/api/knowledge/recommendations", get(get_knowledge_recommendations_handler))
        // EXT-002: Knowledge Graph
        .route("/api/knowledge/graph", get(get_knowledge_graph_handler))
        // EXT-003: Cross-Archive Article Linking
        .route("/api/knowledge/cross-links", get(get_cross_archive_links_handler))
        // EXT-004: Personal Knowledge Workspace
        .route("/api/knowledge/workspace/items", get(get_workspace_items_handler).post(save_workspace_item_handler))
        .route("/api/knowledge/workspace/items/:id", delete(delete_workspace_item_handler))
        // EXT-005: Exportable Research Dossier
        .route("/api/knowledge/dossiers", get(get_research_dossiers_handler).post(save_research_dossier_handler))
        // EXT-006: Offline Model Manager
        .route("/api/knowledge/models", get(get_offline_models_handler))
        .route("/api/knowledge/models/:id/status", post(update_model_status_handler))
        // EXT-007: Knowledge Pack Export & Import
        .route("/api/knowledge/pack/export", get(export_knowledge_pack_handler))
        .route("/api/knowledge/pack/import", post(import_knowledge_pack_handler))
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


// ==========================================
// Handlers for Items 31 to 70
// ==========================================

#[derive(Debug, Deserialize)]
struct AnnotationsQuery {
    archive_id: Option<String>,
    article_path: Option<String>,
}

async fn get_annotations_handler(
    State(state): State<KnowledgeStoreState>,
    Query(query): Query<AnnotationsQuery>,
) -> Result<Json<Vec<ArticleAnnotationRecord>>, (StatusCode, String)> {
    let annotations = if let (Some(aid), Some(path)) = (query.archive_id, query.article_path) {
        state.db.get_article_annotations(&aid, &path).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    } else {
        state.db.get_all_annotations(None).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    };
    Ok(Json(annotations))
}

async fn save_annotation_handler(
    State(state): State<KnowledgeStoreState>,
    Json(payload): Json<ArticleAnnotationRecord>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    state.db.save_annotation(&payload).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(json!({ "success": true, "id": payload.id })))
}

async fn delete_annotation_handler(
    State(state): State<KnowledgeStoreState>,
    AxumPath(id): AxumPath<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    state.db.delete_annotation(&id).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(json!({ "success": true })))
}

#[derive(Debug, Deserialize)]
struct HistoryQuery {
    limit: Option<usize>,
}

async fn get_reading_history_handler(
    State(state): State<KnowledgeStoreState>,
    Query(query): Query<HistoryQuery>,
) -> Result<Json<Vec<ReadingHistoryRecord>>, (StatusCode, String)> {
    let limit = query.limit.unwrap_or(50);
    let history = state.db.get_reading_history(limit).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(history))
}

async fn record_reading_history_handler(
    State(state): State<KnowledgeStoreState>,
    Json(payload): Json<ReadingHistoryRecord>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    state.db.record_reading_history(&payload).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(json!({ "success": true })))
}

async fn clear_reading_history_handler(
    State(state): State<KnowledgeStoreState>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    state.db.clear_reading_history().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(json!({ "success": true })))
}

async fn delete_reading_history_item_handler(
    State(state): State<KnowledgeStoreState>,
    AxumPath(id): AxumPath<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    state.db.delete_reading_history_item(&id).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(json!({ "success": true })))
}

#[derive(Debug, Deserialize)]
struct BookmarksQuery {
    archive_id: Option<String>,
}

async fn get_article_bookmarks_handler(
    State(state): State<KnowledgeStoreState>,
    Query(query): Query<BookmarksQuery>,
) -> Result<Json<Vec<ArticleBookmarkRecord>>, (StatusCode, String)> {
    let bookmarks = state.db.get_article_bookmarks(query.archive_id.as_deref()).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(bookmarks))
}

async fn save_article_bookmark_handler(
    State(state): State<KnowledgeStoreState>,
    Json(payload): Json<ArticleBookmarkRecord>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    state.db.save_article_bookmark(&payload).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(json!({ "success": true, "id": payload.id })))
}

async fn delete_article_bookmark_handler(
    State(state): State<KnowledgeStoreState>,
    AxumPath(id): AxumPath<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    state.db.delete_article_bookmark(&id).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(json!({ "success": true })))
}

// SEARCH Handlers

#[derive(Debug, Deserialize)]
struct GlobalSearchQuery {
    q: String,
    archive_id: Option<String>,
    limit: Option<usize>,
}

async fn global_fts_search_handler(
    State(state): State<KnowledgeStoreState>,
    Query(query): Query<GlobalSearchQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let limit = query.limit.unwrap_or(30);
    let results = state.db.search_global_fts(&query.q, query.archive_id.as_deref(), limit)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(json!({
        "query": query.q,
        "count": results.len(),
        "results": results
    })))
}

async fn get_indexing_status_handler(
    State(state): State<KnowledgeStoreState>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let stats = state.db.get_indexing_stats().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(stats))
}

#[derive(Debug, Deserialize)]
struct RunIndexPayload {
    archive_id: String,
    max_articles: Option<usize>,
}

async fn run_index_archive_handler(
    State(state): State<KnowledgeStoreState>,
    Json(payload): Json<RunIndexPayload>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let library = state.library_manager.list_archives().await;
    let item = library.into_iter().find(|a| a.id == payload.archive_id);
    let item = match item {
        Some(i) => i,
        None => return Err((StatusCode::NOT_FOUND, "Archive not found in library".into())),
    };

    let p = Path::new(&item.file_path);
    let articles = ZimReader::search_articles(p, "", payload.max_articles.unwrap_or(200))
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;

    let mut indexed_count = 0;
    for summary in articles {
        if let Ok(content) = ZimReader::read_article(p, &summary.url) {
            let plain_text = clean_html_to_plain(&content.html);
            let words = plain_text.split_whitespace().count() as i64;
            let _ = state.db.index_article_content(
                &payload.archive_id,
                &summary.url,
                &summary.title,
                &plain_text,
                words,
            );
            indexed_count += 1;
        }
    }

    Ok(Json(json!({
        "success": true,
        "archive_id": payload.archive_id,
        "indexed_count": indexed_count
    })))
}

#[derive(Debug, Deserialize)]
struct ClearIndexPayload {
    archive_id: Option<String>,
}

async fn clear_search_index_handler(
    State(state): State<KnowledgeStoreState>,
    Json(payload): Json<ClearIndexPayload>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    state.db.clear_search_index(payload.archive_id.as_deref()).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(json!({ "success": true })))
}

// Simple HTML text cleaner for FTS indexing
fn clean_html_to_plain(html: &str) -> String {
    let mut in_tag = false;
    let mut out = String::with_capacity(html.len());
    for ch in html.chars() {
        if ch == '<' {
            in_tag = true;
            out.push(' ');
        } else if ch == '>' {
            in_tag = false;
        } else if !in_tag {
            out.push(ch);
        }
    }
    out.split_whitespace().collect::<Vec<&str>>().join(" ")
}

// Medical Handlers (MED-001 to MED-007)

#[derive(Debug, Deserialize)]
struct GlossaryQuery {
    q: Option<String>,
    specialty: Option<String>,
}

async fn get_medical_glossary_handler(
    State(state): State<KnowledgeStoreState>,
    Query(query): Query<GlossaryQuery>,
) -> Result<Json<Vec<MedicalGlossaryRecord>>, (StatusCode, String)> {
    let terms = state.db.get_medical_glossary(query.q.as_deref(), query.specialty.as_deref())
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(terms))
}

async fn save_medical_glossary_handler(
    State(state): State<KnowledgeStoreState>,
    Json(payload): Json<MedicalGlossaryRecord>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    state.db.save_medical_glossary_term(&payload).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(json!({ "success": true, "id": payload.id })))
}

async fn delete_medical_glossary_handler(
    State(state): State<KnowledgeStoreState>,
    AxumPath(id): AxumPath<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    state.db.delete_medical_glossary_term(&id).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(json!({ "success": true })))
}

async fn get_clinical_guidelines_handler(
    State(state): State<KnowledgeStoreState>,
) -> Result<Json<Vec<ClinicalGuidelineRecord>>, (StatusCode, String)> {
    let guidelines = state.db.get_clinical_guidelines().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(guidelines))
}

async fn save_clinical_guideline_handler(
    State(state): State<KnowledgeStoreState>,
    Json(payload): Json<ClinicalGuidelineRecord>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    state.db.save_clinical_guideline(&payload).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(json!({ "success": true, "id": payload.id })))
}

async fn get_clinical_conflicts_handler(
    State(state): State<KnowledgeStoreState>,
) -> Result<Json<Vec<ClinicalConflictRecord>>, (StatusCode, String)> {
    let conflicts = state.db.get_clinical_conflicts().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(conflicts))
}

// UPD-001 to UPD-003 Handlers

#[derive(Debug, Deserialize)]
struct VersionHistoryQuery {
    archive_id: Option<String>,
}

async fn get_archive_version_history_handler(
    State(state): State<KnowledgeStoreState>,
    Query(query): Query<VersionHistoryQuery>,
) -> Result<Json<Vec<ArchiveVersionRecord>>, (StatusCode, String)> {
    let versions = state.db.get_archive_version_history(query.archive_id.as_deref())
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(versions))
}

async fn save_archive_version_handler(
    State(state): State<KnowledgeStoreState>,
    Json(payload): Json<ArchiveVersionRecord>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    state.db.save_archive_version(&payload).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(json!({ "success": true })))
}

async fn check_archive_updates_handler(
    State(state): State<KnowledgeStoreState>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let library = state.library_manager.list_archives().await;
    let catalog = state.catalog_client.fetch_entries(&models::CatalogQuery {
        q: None,
        category: None,
        lang: None,
        tag: None,
        notag: None,
        maxsize: None,
        start: Some(0),
        count: Some(500),
    }).await.unwrap_or_else(|_| models::CatalogResponse {
        total: 0,
        start_index: 0,
        items_per_page: 500,
        entries: vec![],
    });

    let mut updates_available = Vec::new();
    for item in &library {
        let matched = catalog.entries.iter().find(|e| {
            e.title.to_lowercase() == item.title.to_lowercase() ||
            item.file_name.to_lowercase().starts_with(&e.title.to_lowercase().replace(' ', "_"))
        });

        if let Some(cat) = matched {
            let is_newer = match (&item.modified_at, &cat.updated_at) {
                (Some(local_d), Some(remote_d)) => remote_d > local_d,
                _ => false,
            };
            if is_newer {
                updates_available.push(json!({
                    "archive_id": item.id,
                    "title": item.title,
                    "current_date": item.modified_at,
                    "new_version_date": cat.updated_at,
                    "download_url": cat.download_url,
                    "size_mb": (cat.size_bytes as f64) / (1024.0 * 1024.0)
                }));
            }
        }
    }

    Ok(Json(json!({
        "checked_at": chrono::Utc::now().to_rfc3339(),
        "total_archives": library.len(),
        "updates_found": updates_available.len(),
        "updates": updates_available
    })))
}

// AI-001 to AI-006: Local RAG Context Retrieval Handler

#[derive(Debug, Deserialize)]
struct RagContextRequest {
    query: String,
    archive_id: Option<String>,
    max_chunks: Option<usize>,
}

async fn ai_rag_context_handler(
    State(state): State<KnowledgeStoreState>,
    Json(payload): Json<RagContextRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let max_chunks = payload.max_chunks.unwrap_or(5);
    let search_results = state.db.search_global_fts(&payload.query, payload.archive_id.as_deref(), max_chunks)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let mut context_chunks = Vec::new();
    let mut citations = Vec::new();

    for res in search_results {
        context_chunks.push(json!({
            "archive": res.archive_title,
            "article": res.title,
            "path": res.article_path,
            "snippet": res.snippet,
            "score": res.score
        }));
        citations.push(format!("{} - [{}] ({})", res.archive_title, res.title, res.article_path));
    }

    Ok(Json(json!({
        "query": payload.query,
        "chunks_found": context_chunks.len(),
        "context_chunks": context_chunks,
        "citations": citations
    })))
}


// ==========================================
// Handlers for Items 71 to 81 (EXT-001 to EXT-007)
// ==========================================

async fn get_knowledge_recommendations_handler(
    State(state): State<KnowledgeStoreState>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let library = state.library_manager.list_archives().await;
    let catalog = state.catalog_client.fetch_entries(&models::CatalogQuery {
        count: Some(60),
        ..Default::default()
    }).await.unwrap_or_else(|_| models::CatalogResponse {
        total: 0,
        start_index: 0,
        items_per_page: 60,
        entries: vec![],
    });

    let installed_ids: std::collections::HashSet<String> = library.into_iter().map(|a| a.title.to_lowercase()).collect();
    let mut recommendations = Vec::new();

    for entry in catalog.entries {
        if !installed_ids.contains(&entry.title.to_lowercase()) {
            recommendations.push(json!({
                "id": entry.id,
                "title": entry.title,
                "description": entry.description,
                "category": entry.category,
                "language": entry.language,
                "size_bytes": entry.size_bytes,
                "download_url": entry.download_url,
                "reason": "Popular companion archive for offline reference"
            }));
            if recommendations.len() >= 6 {
                break;
            }
        }
    }

    Ok(Json(json!({
        "enabled": true,
        "count": recommendations.len(),
        "recommendations": recommendations
    })))
}

async fn get_knowledge_graph_handler(
    State(state): State<KnowledgeStoreState>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let (entities, relations) = state.db.get_knowledge_graph()
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(json!({
        "entities": entities,
        "relations": relations
    })))
}

#[derive(Debug, Deserialize)]
struct CrossLinkQuery {
    title: String,
}

async fn get_cross_archive_links_handler(
    State(state): State<KnowledgeStoreState>,
    Query(query): Query<CrossLinkQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let results = state.db.search_global_fts(&query.title, None, 10)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let mut links = Vec::new();
    for r in results {
        let link_type = if r.title.to_lowercase() == query.title.to_lowercase() {
            "EXACT"
        } else if r.title.to_lowercase().contains(&query.title.to_lowercase()) {
            "TITLE_MATCH"
        } else {
            "SEMANTIC"
        };

        links.push(json!({
            "archive_id": r.archive_id,
            "archive_title": r.archive_title,
            "article_path": r.article_path,
            "title": r.title,
            "link_type": link_type,
            "snippet": r.snippet
        }));
    }

    Ok(Json(json!({
        "query": query.title,
        "cross_links_count": links.len(),
        "links": links
    })))
}

async fn get_workspace_items_handler(
    State(state): State<KnowledgeStoreState>,
) -> Result<Json<Vec<PersonalWorkspaceItemRecord>>, (StatusCode, String)> {
    let items = state.db.get_workspace_items().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(items))
}

async fn save_workspace_item_handler(
    State(state): State<KnowledgeStoreState>,
    Json(payload): Json<PersonalWorkspaceItemRecord>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    state.db.save_workspace_item(&payload).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(json!({ "success": true, "id": payload.id })))
}

async fn delete_workspace_item_handler(
    State(state): State<KnowledgeStoreState>,
    AxumPath(id): AxumPath<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    state.db.delete_workspace_item(&id).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(json!({ "success": true })))
}

async fn get_research_dossiers_handler(
    State(state): State<KnowledgeStoreState>,
) -> Result<Json<Vec<ResearchDossierRecord>>, (StatusCode, String)> {
    let dossiers = state.db.get_research_dossiers().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(dossiers))
}

async fn save_research_dossier_handler(
    State(state): State<KnowledgeStoreState>,
    Json(payload): Json<ResearchDossierRecord>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    state.db.save_research_dossier(&payload).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(json!({ "success": true, "id": payload.id })))
}

async fn get_offline_models_handler(
    State(state): State<KnowledgeStoreState>,
) -> Result<Json<Vec<OfflineModelRecord>>, (StatusCode, String)> {
    let models = state.db.get_offline_models().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(models))
}

#[derive(Debug, Deserialize)]
struct UpdateModelStatusPayload {
    status: String,
}

async fn update_model_status_handler(
    State(state): State<KnowledgeStoreState>,
    AxumPath(id): AxumPath<String>,
    Json(payload): Json<UpdateModelStatusPayload>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    state.db.update_offline_model_status(&id, &payload.status).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(json!({ "success": true })))
}

async fn export_knowledge_pack_handler(
    State(state): State<KnowledgeStoreState>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let collections = state.db.get_library_collections().unwrap_or_default();
    let searches = state.db.get_saved_catalog_searches().unwrap_or_default();
    let workspace = state.db.get_workspace_items().unwrap_or_default();
    let dossiers = state.db.get_research_dossiers().unwrap_or_default();
    let (entities, relations) = state.db.get_knowledge_graph().unwrap_or_default();

    Ok(Json(json!({
        "pack_name": "Noectra Knowledge Pack",
        "exported_at": chrono::Utc::now().to_rfc3339(),
        "schema_version": 2,
        "collections": collections,
        "saved_searches": searches,
        "workspace_items": workspace,
        "dossiers": dossiers,
        "knowledge_graph": {
            "entities": entities,
            "relations": relations
        }
    })))
}

#[derive(Debug, Deserialize)]
struct ImportKnowledgePackPayload {
    collections: Option<Vec<LibraryCollectionRecord>>,
    saved_searches: Option<Vec<SavedCatalogSearchRecord>>,
    workspace_items: Option<Vec<PersonalWorkspaceItemRecord>>,
    dossiers: Option<Vec<ResearchDossierRecord>>,
}

async fn import_knowledge_pack_handler(
    State(state): State<KnowledgeStoreState>,
    Json(payload): Json<ImportKnowledgePackPayload>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let mut imported = 0;

    if let Some(cols) = payload.collections {
        for c in cols {
            let _ = state.db.save_library_collection(&c);
            imported += 1;
        }
    }
    if let Some(searches) = payload.saved_searches {
        for s in searches {
            let _ = state.db.save_catalog_search(&s);
            imported += 1;
        }
    }
    if let Some(items) = payload.workspace_items {
        for item in items {
            let _ = state.db.save_workspace_item(&item);
            imported += 1;
        }
    }
    if let Some(dos) = payload.dossiers {
        for d in dos {
            let _ = state.db.save_research_dossier(&d);
            imported += 1;
        }
    }

    Ok(Json(json!({
        "success": true,
        "imported_count": imported
    })))
}
