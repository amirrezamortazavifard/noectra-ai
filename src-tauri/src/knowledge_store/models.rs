use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZimArchive {
    pub id: String,
    pub title: String,
    pub description: String,
    pub language: String,
    pub category: String,
    pub size_bytes: u64,
    pub article_count: Option<u64>,
    pub media_count: Option<u64>,
    pub updated_at: Option<String>,
    pub download_url: Option<String>,
    pub sha256: Option<String>,
    pub illustration_url: Option<String>,
    pub name: Option<String>,
    pub tags: Vec<String>,
    pub local_path: Option<String>,
    pub is_installed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct CatalogQuery {
    pub q: Option<String>,
    pub category: Option<String>,
    pub lang: Option<String>,
    pub tag: Option<String>,
    pub notag: Option<String>,
    pub maxsize: Option<u64>,
    pub start: Option<usize>,
    pub count: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CatalogResponse {
    pub total: usize,
    pub start_index: usize,
    pub items_per_page: usize,
    pub entries: Vec<ZimArchive>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum DownloadStatus {
    Queued,
    Downloading,
    Paused,
    Completed,
    Failed,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadTask {
    pub id: String,
    pub title: String,
    pub file_name: String,
    pub download_url: String,
    pub total_bytes: u64,
    pub downloaded_bytes: u64,
    pub speed_bps: u64,
    pub progress_pct: f32,
    pub status: DownloadStatus,
    pub error_message: Option<String>,
    pub target_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StartDownloadRequest {
    pub id: String,
    pub title: String,
    pub download_url: String,
    pub total_bytes: Option<u64>,
    pub sha256: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportLocalZimRequest {
    pub file_path: String,
    pub copy_to_library: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZimArticleSummary {
    pub url: String,
    pub title: String,
    pub namespace: String,
    pub mime_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZimArticleContent {
    pub url: String,
    pub title: String,
    pub html: String,
    pub text: String,
    pub mime_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZimLibraryItem {
    pub id: String,
    pub title: String,
    pub file_name: String,
    pub file_path: String,
    pub file_size: u64,
    pub article_count: u32,
    pub cluster_count: u32,
    pub main_page_url: Option<String>,
    pub is_external: bool,
}

