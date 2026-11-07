pub mod catalog_client;
pub mod download_manager;
pub mod library_manager;
pub mod models;
pub mod opds_parser;
pub mod zim_reader;

use crate::db::{Database, SavedCatalogSearchRecord};
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
