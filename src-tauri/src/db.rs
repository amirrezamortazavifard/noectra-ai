use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::sync::{Arc, Mutex};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatRecord {
    pub id: String,
    pub title: String,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    pub sources: serde_json::Value,
    pub files: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageRecord {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<i64>,
    #[serde(rename = "messageId")]
    pub message_id: String,
    #[serde(rename = "chatId")]
    pub chat_id: String,
    #[serde(rename = "backendId")]
    pub backend_id: String,
    pub query: String,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "responseBlocks")]
    pub response_blocks: serde_json::Value,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiscoverSavedItem {
    pub id: String,
    #[serde(rename = "itemType")]
    pub item_type: String,
    pub title: String,
    pub source: String,
    pub url: String,
    #[serde(rename = "dataJson")]
    pub data_json: serde_json::Value,
    #[serde(rename = "savedAt")]
    pub saved_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiscoverQueueItem {
    pub id: String,
    #[serde(rename = "itemType")]
    pub item_type: String,
    pub title: String,
    pub source: String,
    pub url: String,
    #[serde(rename = "dataJson")]
    pub data_json: serde_json::Value,
    #[serde(rename = "addedAt")]
    pub added_at: String,
    #[serde(rename = "isRead")]
    pub is_read: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiscoverFollowedTopic {
    #[serde(rename = "topicId")]
    pub topic_id: String,
    pub category: String,
    #[serde(rename = "displayName")]
    pub display_name: String,
    #[serde(rename = "followedAt")]
    pub followed_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiscoverFeedbackRecord {
    pub id: Option<i64>,
    #[serde(rename = "itemId")]
    pub item_id: String,
    #[serde(rename = "feedbackType")]
    pub feedback_type: String,
    pub meta: serde_json::Value,
    #[serde(rename = "createdAt")]
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SavedCatalogSearchRecord {
    pub id: String,
    pub name: String,
    pub query: String,
    #[serde(rename = "filtersJson")]
    pub filters_json: serde_json::Value,
    #[serde(rename = "sortOrder")]
    pub sort_order: i64,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CatalogSourceRecord {
    pub id: String,
    pub name: String,
    pub url: String,
    #[serde(rename = "isEnabled")]
    pub is_enabled: bool,
    #[serde(rename = "isDefault")]
    pub is_default: bool,
    pub priority: i64,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LibraryCollectionRecord {
    pub id: String,
    pub name: String,
    pub description: String,
    pub color: String,
    pub icon: String,
    #[serde(rename = "itemCount")]
    pub item_count: Option<i64>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArchiveUserMetadataRecord {
    #[serde(rename = "archiveId")]
    pub archive_id: String,
    #[serde(rename = "displayName")]
    pub display_name: Option<String>,
    #[serde(rename = "customNotes")]
    pub custom_notes: Option<String>,
    #[serde(rename = "customTags")]
    pub custom_tags: Vec<String>,
    #[serde(rename = "isFavorite")]
    pub is_favorite: bool,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageRootRecord {
    pub id: String,
    pub path: String,
    pub role: String,
    #[serde(rename = "isActive")]
    pub is_active: bool,
    #[serde(rename = "freeBytes")]
    pub free_bytes: Option<u64>,
    #[serde(rename = "totalBytes")]
    pub total_bytes: Option<u64>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanDirectoryRecord {
    pub id: String,
    pub path: String,
    pub recursive: bool,
    #[serde(rename = "lastScannedAt")]
    pub last_scanned_at: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadBundleRecord {
    pub id: String,
    pub name: String,
    #[serde(rename = "archiveIds")]
    pub archive_ids: Vec<String>,
    #[serde(rename = "totalBytes")]
    pub total_bytes: i64,
    pub status: String,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArticleAnnotationRecord {
    pub id: String,
    #[serde(rename = "archiveId")]
    pub archive_id: String,
    #[serde(rename = "articlePath")]
    pub article_path: String,
    #[serde(rename = "selectedText")]
    pub selected_text: String,
    #[serde(rename = "prefixContext")]
    pub prefix_context: Option<String>,
    #[serde(rename = "suffixContext")]
    pub suffix_context: Option<String>,
    #[serde(rename = "anchorId")]
    pub anchor_id: Option<String>,
    pub color: String,
    pub note: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReadingHistoryRecord {
    pub id: String,
    #[serde(rename = "archiveId")]
    pub archive_id: String,
    #[serde(rename = "archiveTitle")]
    pub archive_title: String,
    #[serde(rename = "articlePath")]
    pub article_path: String,
    #[serde(rename = "articleTitle")]
    pub article_title: String,
    #[serde(rename = "scrollPercentage")]
    pub scroll_percentage: f64,
    #[serde(rename = "lastReadAt")]
    pub last_read_at: String,
    #[serde(rename = "durationSeconds")]
    pub duration_seconds: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArticleBookmarkRecord {
    pub id: String,
    #[serde(rename = "archiveId")]
    pub archive_id: String,
    #[serde(rename = "archiveTitle")]
    pub archive_title: String,
    #[serde(rename = "articlePath")]
    pub article_path: String,
    #[serde(rename = "articleTitle")]
    pub article_title: String,
    pub tags: Vec<String>,
    pub note: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MedicalGlossaryRecord {
    pub id: String,
    pub term: String,
    #[serde(rename = "farsiTranslation")]
    pub farsi_translation: String,
    pub definition: String,
    pub abbreviation: Option<String>,
    pub specialty: String,
    pub source: String,
    #[serde(rename = "isFavorite")]
    pub is_favorite: bool,
    #[serde(rename = "createdAt")]
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClinicalGuidelineRecord {
    pub id: String,
    pub title: String,
    pub organization: String,
    pub specialty: String,
    #[serde(rename = "currentVersion")]
    pub current_version: String,
    #[serde(rename = "latestVersion")]
    pub latest_version: Option<String>,
    #[serde(rename = "publicationDate")]
    pub publication_date: Option<String>,
    #[serde(rename = "hasUpdate")]
    pub has_update: bool,
    #[serde(rename = "evidenceType")]
    pub evidence_type: String,
    pub summary: Option<String>,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClinicalConflictRecord {
    pub id: String,
    pub topic: String,
    pub specialty: String,
    #[serde(rename = "sourceA")]
    pub source_a: String,
    #[serde(rename = "recommendationA")]
    pub recommendation_a: String,
    #[serde(rename = "sourceB")]
    pub source_b: String,
    #[serde(rename = "recommendationB")]
    pub recommendation_b: String,
    #[serde(rename = "evidenceLevelA")]
    pub evidence_level_a: Option<String>,
    #[serde(rename = "evidenceLevelB")]
    pub evidence_level_b: Option<String>,
    #[serde(rename = "reviewStatus")]
    pub review_status: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArchiveVersionRecord {
    pub id: String,
    #[serde(rename = "archiveId")]
    pub archive_id: String,
    #[serde(rename = "archiveTitle")]
    pub archive_title: String,
    #[serde(rename = "versionDate")]
    pub version_date: String,
    #[serde(rename = "fileSizeBytes")]
    pub file_size_bytes: i64,
    pub sha256: Option<String>,
    #[serde(rename = "installedAt")]
    pub installed_at: String,
    #[serde(rename = "filePath")]
    pub file_path: String,
    #[serde(rename = "retentionStatus")]
    pub retention_status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GlobalSearchResultRecord {
    #[serde(rename = "archiveId")]
    pub archive_id: String,
    #[serde(rename = "archiveTitle")]
    pub archive_title: String,
    #[serde(rename = "articlePath")]
    pub article_path: String,
    pub title: String,
    pub snippet: String,
    pub score: f64,
    #[serde(rename = "wordCount")]
    pub word_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeGraphEntityRecord {
    pub id: String,
    #[serde(rename = "archiveId")]
    pub archive_id: String,
    #[serde(rename = "articlePath")]
    pub article_path: String,
    #[serde(rename = "entityType")]
    pub entity_type: String,
    pub name: String,
    pub confidence: f64,
    #[serde(rename = "createdAt")]
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeGraphRelationRecord {
    pub id: String,
    #[serde(rename = "sourceEntity")]
    pub source_entity: String,
    #[serde(rename = "targetEntity")]
    pub target_entity: String,
    #[serde(rename = "relationType")]
    pub relation_type: String,
    pub citation: String,
    pub confidence: f64,
    #[serde(rename = "createdAt")]
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PersonalWorkspaceItemRecord {
    pub id: String,
    #[serde(rename = "itemType")]
    pub item_type: String, // article, note, highlight, pdf
    pub title: String,
    pub content: String,
    pub tags: String,
    #[serde(rename = "sourceRef")]
    pub source_ref: String,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OfflineModelRecord {
    pub id: String,
    pub name: String,
    #[serde(rename = "modelType")]
    pub model_type: String, // translation, embedding, reranker, tts, llm
    #[serde(rename = "sizeBytes")]
    pub size_bytes: i64,
    pub license: String,
    pub languages: String,
    pub status: String, // installed, available, downloading
    #[serde(rename = "downloadUrl")]
    pub download_url: Option<String>,
    #[serde(rename = "hardwareReqs")]
    pub hardware_reqs: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResearchDossierRecord {
    pub id: String,
    pub title: String,
    pub topic: String,
    pub content: String,
    pub citations: String,
    #[serde(rename = "createdAt")]
    pub created_at: String,
}


#[derive(Clone)]
pub struct Database {
    conn: Arc<Mutex<Connection>>,
}

impl Database {
    pub fn new<P: AsRef<Path>>(path: P) -> Result<Self> {
        if let Some(parent) = path.as_ref().parent() {
            std::fs::create_dir_all(parent).ok();
        }
        let conn = Connection::open(path)?;
        conn.execute_batch(
            "PRAGMA journal_mode = WAL;
             PRAGMA foreign_keys = ON;

             CREATE TABLE IF NOT EXISTS chats (
                 id TEXT PRIMARY KEY,
                 title TEXT NOT NULL,
                 createdAt TEXT NOT NULL,
                 sources TEXT NOT NULL DEFAULT '[]',
                 files TEXT NOT NULL DEFAULT '[]'
             );

             CREATE TABLE IF NOT EXISTS messages (
                 id INTEGER PRIMARY KEY AUTOINCREMENT,
                 messageId TEXT NOT NULL,
                 chatId TEXT NOT NULL,
                 backendId TEXT NOT NULL,
                 query TEXT NOT NULL,
                 createdAt TEXT NOT NULL,
                 responseBlocks TEXT NOT NULL DEFAULT '[]',
                 status TEXT NOT NULL DEFAULT 'answering'
             );

             CREATE TABLE IF NOT EXISTS discover_saved_items (
                 id TEXT PRIMARY KEY,
                 itemType TEXT NOT NULL,
                 title TEXT NOT NULL,
                 source TEXT NOT NULL,
                 url TEXT NOT NULL,
                 dataJson TEXT NOT NULL DEFAULT '{}',
                 savedAt TEXT NOT NULL
             );
             CREATE INDEX IF NOT EXISTS idx_discover_saved_savedAt ON discover_saved_items (savedAt DESC);

             CREATE TABLE IF NOT EXISTS discover_reading_queue (
                 id TEXT PRIMARY KEY,
                 itemType TEXT NOT NULL,
                 title TEXT NOT NULL,
                 source TEXT NOT NULL,
                 url TEXT NOT NULL,
                 dataJson TEXT NOT NULL DEFAULT '{}',
                 addedAt TEXT NOT NULL,
                 isRead INTEGER NOT NULL DEFAULT 0
             );
             CREATE INDEX IF NOT EXISTS idx_discover_queue_addedAt ON discover_reading_queue (addedAt DESC);

             CREATE TABLE IF NOT EXISTS discover_followed_topics (
                 topicId TEXT PRIMARY KEY,
                 category TEXT NOT NULL,
                 displayName TEXT NOT NULL,
                 followedAt TEXT NOT NULL
             );

             CREATE TABLE IF NOT EXISTS discover_user_feedback (
                 id INTEGER PRIMARY KEY AUTOINCREMENT,
                 itemId TEXT NOT NULL,
                 feedbackType TEXT NOT NULL,
                 meta TEXT NOT NULL DEFAULT '{}',
                 createdAt TEXT NOT NULL
             );
             CREATE INDEX IF NOT EXISTS idx_discover_feedback_itemId ON discover_user_feedback (itemId);

             -- RSS & Fluent Reader Tables
             CREATE TABLE IF NOT EXISTS feed_sources (
                 id TEXT PRIMARY KEY,
                 url TEXT NOT NULL,
                 name TEXT NOT NULL,
                 iconUrl TEXT,
                 openTarget TEXT NOT NULL DEFAULT 'local',
                 unreadCount INTEGER NOT NULL DEFAULT 0,
                 lastFetched TEXT,
                 fetchFrequency INTEGER NOT NULL DEFAULT 0,
                 textDir TEXT NOT NULL DEFAULT 'ltr',
                 hidden INTEGER NOT NULL DEFAULT 0,
                 serviceRef TEXT
             );
             CREATE INDEX IF NOT EXISTS idx_feed_sources_url ON feed_sources (url);

             CREATE TABLE IF NOT EXISTS feed_groups (
                 id TEXT PRIMARY KEY,
                 name TEXT NOT NULL,
                 expanded INTEGER NOT NULL DEFAULT 1,
                 isMultiple INTEGER NOT NULL DEFAULT 1,
                 sids TEXT NOT NULL DEFAULT '[]'
             );

             CREATE TABLE IF NOT EXISTS feed_items (
                 id TEXT PRIMARY KEY,
                 sourceId TEXT NOT NULL,
                 guid TEXT,
                 title TEXT NOT NULL,
                 link TEXT NOT NULL,
                 author TEXT,
                 content TEXT,
                 snippet TEXT,
                 thumbUrl TEXT,
                 pubDate TEXT,
                 hasRead INTEGER NOT NULL DEFAULT 0,
                 starred INTEGER NOT NULL DEFAULT 0,
                 hidden INTEGER NOT NULL DEFAULT 0,
                 notify INTEGER NOT NULL DEFAULT 0,
                 serviceRef TEXT,
                 FOREIGN KEY(sourceId) REFERENCES feed_sources(id) ON DELETE CASCADE
             );
             CREATE INDEX IF NOT EXISTS idx_feed_items_sourceId ON feed_items (sourceId);
             CREATE INDEX IF NOT EXISTS idx_feed_items_pubDate ON feed_items (pubDate DESC);
             CREATE INDEX IF NOT EXISTS idx_feed_items_hasRead ON feed_items (hasRead);
             CREATE INDEX IF NOT EXISTS idx_feed_items_starred ON feed_items (starred);

             CREATE TABLE IF NOT EXISTS feed_rules (
                 id TEXT PRIMARY KEY,
                 targetType TEXT NOT NULL,
                 targetId TEXT NOT NULL,
                 filterField TEXT NOT NULL,
                 pattern TEXT NOT NULL,
                 matchType INTEGER NOT NULL DEFAULT 1,
                 actions TEXT NOT NULL DEFAULT '[]'
             );

             CREATE TABLE IF NOT EXISTS feed_logs (
                 id INTEGER PRIMARY KEY AUTOINCREMENT,
                 logType TEXT NOT NULL,
                 title TEXT NOT NULL,
                 details TEXT,
                 createdAt TEXT NOT NULL
             );
             CREATE INDEX IF NOT EXISTS idx_feed_logs_createdAt ON feed_logs (createdAt DESC);

             CREATE TABLE IF NOT EXISTS feed_sync_services (
                 serviceType TEXT PRIMARY KEY,
                 enabled INTEGER NOT NULL DEFAULT 0,
                 endpoint TEXT,
                 username TEXT,
                 password TEXT,
                 apiKey TEXT,
                 lastSynced TEXT
             );

             -- Knowledge Store & ZIM Core Tables
             CREATE TABLE IF NOT EXISTS zim_archives (
                 id TEXT PRIMARY KEY,
                 zim_id TEXT,
                 uuid TEXT,
                 title TEXT NOT NULL,
                 description TEXT NOT NULL DEFAULT '',
                 language TEXT NOT NULL DEFAULT '',
                 category TEXT NOT NULL DEFAULT '',
                 tags TEXT NOT NULL DEFAULT '[]',
                 file_path TEXT NOT NULL,
                 file_size_bytes INTEGER NOT NULL DEFAULT 0,
                 sha256 TEXT,
                 source_catalog TEXT,
                 acquisition_url TEXT,
                 archive_date TEXT,
                 added_at TEXT NOT NULL,
                 updated_at TEXT NOT NULL,
                 last_verified_at TEXT,
                 status TEXT NOT NULL DEFAULT 'downloaded',
                 link_type TEXT NOT NULL DEFAULT 'local',
                 is_available INTEGER NOT NULL DEFAULT 1,
                 article_count INTEGER,
                 media_count INTEGER,
                 index_status TEXT NOT NULL DEFAULT 'unindexed',
                 index_version INTEGER NOT NULL DEFAULT 0
             );
             CREATE INDEX IF NOT EXISTS idx_zim_archives_status ON zim_archives (status);
             CREATE INDEX IF NOT EXISTS idx_zim_archives_lang ON zim_archives (language);
             CREATE INDEX IF NOT EXISTS idx_zim_archives_cat ON zim_archives (category);

             CREATE TABLE IF NOT EXISTS download_tasks (
                 id TEXT PRIMARY KEY,
                 zim_id TEXT,
                 title TEXT NOT NULL,
                 source_url TEXT NOT NULL,
                 target_path TEXT NOT NULL,
                 temporary_path TEXT,
                 status TEXT NOT NULL DEFAULT 'queued',
                 bytes_downloaded INTEGER NOT NULL DEFAULT 0,
                 total_bytes INTEGER NOT NULL DEFAULT 0,
                 speed_bps INTEGER NOT NULL DEFAULT 0,
                 progress_pct REAL NOT NULL DEFAULT 0.0,
                 etag TEXT,
                 last_modified TEXT,
                 accept_ranges INTEGER NOT NULL DEFAULT 1,
                 checksum_expected TEXT,
                 checksum_actual TEXT,
                 checksum_status TEXT,
                 retry_count INTEGER NOT NULL DEFAULT 0,
                 error_code TEXT,
                 error_message TEXT,
                 priority INTEGER NOT NULL DEFAULT 0,
                 created_at TEXT NOT NULL,
                 updated_at TEXT NOT NULL,
                 completed_at TEXT
             );
             CREATE INDEX IF NOT EXISTS idx_download_tasks_status ON download_tasks (status);

             CREATE TABLE IF NOT EXISTS saved_catalog_searches (
                 id TEXT PRIMARY KEY,
                 name TEXT NOT NULL,
                 query TEXT NOT NULL DEFAULT '',
                 filters_json TEXT NOT NULL DEFAULT '{}',
                 sort_order INTEGER NOT NULL DEFAULT 0,
                 created_at TEXT NOT NULL,
                 updated_at TEXT NOT NULL
             );
             CREATE INDEX IF NOT EXISTS idx_saved_searches_created ON saved_catalog_searches (created_at DESC);

             CREATE TABLE IF NOT EXISTS indexing_jobs (
                 id TEXT PRIMARY KEY,
                 archive_id TEXT NOT NULL,
                 status TEXT NOT NULL DEFAULT 'pending',
                 phase TEXT,
                 items_total INTEGER NOT NULL DEFAULT 0,
                 items_processed INTEGER NOT NULL DEFAULT 0,
                 bytes_processed INTEGER NOT NULL DEFAULT 0,
                 last_processed_item TEXT,
                 error_count INTEGER NOT NULL DEFAULT 0,
                 started_at TEXT NOT NULL,
                 updated_at TEXT NOT NULL,
                 completed_at TEXT,
                 FOREIGN KEY(archive_id) REFERENCES zim_archives(id) ON DELETE CASCADE
             );

             -- CAT-006: Multiple Catalog Sources
             CREATE TABLE IF NOT EXISTS catalog_sources (
                 id TEXT PRIMARY KEY,
                 name TEXT NOT NULL,
                 url TEXT NOT NULL,
                 is_enabled INTEGER NOT NULL DEFAULT 1,
                 is_default INTEGER NOT NULL DEFAULT 0,
                 priority INTEGER NOT NULL DEFAULT 0,
                 created_at TEXT NOT NULL,
                 updated_at TEXT NOT NULL
             );

             INSERT OR IGNORE INTO catalog_sources (id, name, url, is_enabled, is_default, priority, created_at, updated_at)
             VALUES ('kiwix-default', 'Official Kiwix OPDS Catalog', 'https://library.kiwix.org/catalog/v2', 1, 1, 0, datetime('now'), datetime('now'));

             -- DL-007: Download Bundles
             CREATE TABLE IF NOT EXISTS download_bundles (
                 id TEXT PRIMARY KEY,
                 name TEXT NOT NULL,
                 archive_ids TEXT NOT NULL DEFAULT '[]',
                 total_bytes INTEGER NOT NULL DEFAULT 0,
                 status TEXT NOT NULL DEFAULT 'queued',
                 created_at TEXT NOT NULL,
                 updated_at TEXT NOT NULL
             );

             -- LIB-003: Collections & Categories
             CREATE TABLE IF NOT EXISTS library_collections (
                 id TEXT PRIMARY KEY,
                 name TEXT NOT NULL,
                 description TEXT NOT NULL DEFAULT '',
                 color TEXT NOT NULL DEFAULT 'sky',
                 icon TEXT NOT NULL DEFAULT 'folder',
                 created_at TEXT NOT NULL,
                 updated_at TEXT NOT NULL
             );

             INSERT OR IGNORE INTO library_collections (id, name, description, color, icon, created_at, updated_at)
             VALUES 
             ('col-med', 'Medical & Healthcare', 'Clinical and medical encyclopedias, WikiMed, and medical textbooks', 'emerald', 'stethoscope', datetime('now'), datetime('now')),
             ('col-wiki', 'Encyclopedias', 'General reference, Wikipedia, and WikiBooks collections', 'sky', 'book-open', datetime('now'), datetime('now')),
             ('col-tech', 'Engineering & CS', 'Programming, StackExchange Q&A, and technical manuals', 'indigo', 'cpu', datetime('now'), datetime('now'));

             CREATE TABLE IF NOT EXISTS archive_collection_members (
                 archive_id TEXT NOT NULL,
                 collection_id TEXT NOT NULL,
                 PRIMARY KEY (archive_id, collection_id),
                 FOREIGN KEY(collection_id) REFERENCES library_collections(id) ON DELETE CASCADE
             );

             -- LIB-009: User Metadata & Personal Tags/Notes
             CREATE TABLE IF NOT EXISTS archive_user_metadata (
                 archive_id TEXT PRIMARY KEY,
                 display_name TEXT,
                 custom_notes TEXT,
                 custom_tags TEXT NOT NULL DEFAULT '[]',
                 is_favorite INTEGER NOT NULL DEFAULT 0,
                 updated_at TEXT NOT NULL
             );

             -- LIB-008: Storage Roots & Multi-location
             CREATE TABLE IF NOT EXISTS storage_roots (
                 id TEXT PRIMARY KEY,
                 path TEXT NOT NULL,
                 role TEXT NOT NULL DEFAULT 'managed',
                 is_active INTEGER NOT NULL DEFAULT 1,
                 created_at TEXT NOT NULL
             );

             -- LIB-004: Scanner Folders
             CREATE TABLE IF NOT EXISTS scan_directories (
                 id TEXT PRIMARY KEY,
                 path TEXT NOT NULL,
                 recursive INTEGER NOT NULL DEFAULT 1,
                 last_scanned_at TEXT,
                 created_at TEXT NOT NULL
             );

             -- READ-002: Highlights & Annotations
             CREATE TABLE IF NOT EXISTS article_annotations (
                 id TEXT PRIMARY KEY,
                 archive_id TEXT NOT NULL,
                 article_path TEXT NOT NULL,
                 selected_text TEXT NOT NULL,
                 prefix_context TEXT,
                 suffix_context TEXT,
                 anchor_id TEXT,
                 color TEXT NOT NULL DEFAULT 'yellow',
                 note TEXT,
                 created_at TEXT NOT NULL,
                 updated_at TEXT NOT NULL
             );
             CREATE INDEX IF NOT EXISTS idx_article_annotations_arch_path ON article_annotations (archive_id, article_path);

             -- READ-007: Reading History & Continue Reading
             CREATE TABLE IF NOT EXISTS article_reading_history (
                 id TEXT PRIMARY KEY,
                 archive_id TEXT NOT NULL,
                 archive_title TEXT NOT NULL,
                 article_path TEXT NOT NULL,
                 article_title TEXT NOT NULL,
                 scroll_percentage REAL NOT NULL DEFAULT 0.0,
                 last_read_at TEXT NOT NULL,
                 duration_seconds INTEGER NOT NULL DEFAULT 0
             );
             CREATE INDEX IF NOT EXISTS idx_reading_history_time ON article_reading_history (last_read_at DESC);
             CREATE INDEX IF NOT EXISTS idx_reading_history_article ON article_reading_history (archive_id, article_path);

             -- READ-008: Article Bookmarks
             CREATE TABLE IF NOT EXISTS article_bookmarks (
                 id TEXT PRIMARY KEY,
                 archive_id TEXT NOT NULL,
                 archive_title TEXT NOT NULL,
                 article_path TEXT NOT NULL,
                 article_title TEXT NOT NULL,
                 tags TEXT NOT NULL DEFAULT '[]',
                 note TEXT,
                 created_at TEXT NOT NULL
             );
             CREATE INDEX IF NOT EXISTS idx_article_bookmarks_arch ON article_bookmarks (archive_id);

             -- SEARCH-001 to SEARCH-009: Full-Text Search (SQLite FTS5) & Indexed Articles
             CREATE TABLE IF NOT EXISTS knowledge_indexed_articles (
                 id TEXT PRIMARY KEY,
                 archive_id TEXT NOT NULL,
                 article_path TEXT NOT NULL,
                 title TEXT NOT NULL,
                 plain_text TEXT NOT NULL,
                 word_count INTEGER NOT NULL DEFAULT 0,
                 indexed_at TEXT NOT NULL,
                 UNIQUE(archive_id, article_path)
             );
             CREATE INDEX IF NOT EXISTS idx_indexed_articles_archive ON knowledge_indexed_articles (archive_id);

             CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_articles_fts USING fts5(
                 title,
                 plain_text,
                 archive_id UNINDEXED,
                 article_path UNINDEXED,
                 tokenize = 'unicode61'
             );

             -- MED-004: Medical Glossary
             CREATE TABLE IF NOT EXISTS medical_glossary_terms (
                 id TEXT PRIMARY KEY,
                 term TEXT NOT NULL,
                 farsi_translation TEXT NOT NULL,
                 definition TEXT NOT NULL,
                 abbreviation TEXT,
                 specialty TEXT NOT NULL DEFAULT 'General Medicine',
                 source TEXT NOT NULL DEFAULT 'Standard Medical Lexicon',
                 is_favorite INTEGER NOT NULL DEFAULT 0,
                 created_at TEXT NOT NULL
             );
             CREATE INDEX IF NOT EXISTS idx_med_glossary_term ON medical_glossary_terms (term);

             INSERT OR IGNORE INTO medical_glossary_terms (id, term, farsi_translation, definition, abbreviation, specialty, source, created_at)
             VALUES
             ('gloss-1', 'Hypertension', 'فشار خون بالا', 'A chronic medical condition in which systemic arterial blood pressure is persistently elevated.', 'HTN', 'Cardiology', 'AHA Guidelines', datetime('now')),
             ('gloss-2', 'Myocardial Infarction', 'انفارکتوس میوکارد (سکته قلبی)', 'Ischemia-induced necrosis of myocardial tissue resulting from acute coronary artery occlusion.', 'MI', 'Cardiology', 'ACC/AHA', datetime('now')),
             ('gloss-3', 'Diabetes Mellitus', 'دیابت قندی', 'A metabolic disorder characterized by chronic hyperglycemia resulting from defects in insulin secretion, action, or both.', 'DM', 'Endocrinology', 'ADA Standards of Care', datetime('now')),
             ('gloss-4', 'Chronic Obstructive Pulmonary Disease', 'بیماری انسدادی مزمن ریه', 'A progressive lung disease characterized by persistent airflow limitation and respiratory symptoms.', 'COPD', 'Pulmonology', 'GOLD Guidelines', datetime('now')),
             ('gloss-5', 'Sepsis', 'سپسیس (عفونت منتشر)', 'Life-threatening organ dysfunction caused by a dysregulated host response to infection.', 'SEPSIS', 'Critical Care', 'Surviving Sepsis Campaign', datetime('now')),
             ('gloss-6', 'Cerebrovascular Accident', 'سکته مغزی', 'Sudden loss of brain function due to a disturbance in the cerebral blood supply.', 'CVA', 'Neurology', 'AHA/ASA Stroke Guidelines', datetime('now'));

             -- MED-005: Clinical Guidelines
             CREATE TABLE IF NOT EXISTS clinical_guidelines (
                 id TEXT PRIMARY KEY,
                 title TEXT NOT NULL,
                 organization TEXT NOT NULL,
                 specialty TEXT NOT NULL,
                 current_version TEXT NOT NULL,
                 latest_version TEXT,
                 publication_date TEXT,
                 has_update INTEGER NOT NULL DEFAULT 0,
                 evidence_type TEXT NOT NULL DEFAULT 'Clinical Guideline',
                 summary TEXT,
                 updated_at TEXT NOT NULL
             );

             INSERT OR IGNORE INTO clinical_guidelines (id, title, organization, specialty, current_version, latest_version, publication_date, has_update, evidence_type, summary, updated_at)
             VALUES
             ('guide-1', 'Guideline for Prevention and Management of High Blood Pressure', 'ACC/AHA', 'Cardiology', '2023 Comprehensive', '2024 Interim Revision', '2023-11-01', 1, 'Clinical Practice Guideline', 'Defines stage 1 hypertension threshold at >=130/80 mmHg; emphasizes early combination pharmacotherapy in high-risk patients.', datetime('now')),
             ('guide-2', 'Global Strategy for Diagnosis, Management, and Prevention of COPD', 'GOLD', 'Pulmonology', '2024 Report', '2024 Report', '2024-01-15', 0, 'International Guideline', 'Recommends LABA+LAMA dual bronchodilation as primary maintenance therapy for symptomatic COPD patients.', datetime('now')),
             ('guide-3', 'Standards of Care in Diabetes', 'American Diabetes Association (ADA)', 'Endocrinology', '2024 Standards', '2024 Standards', '2024-01-01', 0, 'Clinical Practice Recommendation', 'Recommends early SGLT2 inhibitors and GLP-1 receptor agonists in patients with established ASCVD or CKD independent of baseline A1C.', datetime('now')),
             ('guide-4', 'International Guidelines for Management of Sepsis and Septic Shock', 'Surviving Sepsis Campaign', 'Critical Care & Emergency', '2021 Update', '2023 Pediatric & Adult Digest', '2021-10-01', 0, 'Evidence-Based Guideline', 'Guidance on dynamic assessment of fluid responsiveness and early norepinephrine administration in septic shock.', datetime('now'));

             -- MED-006: Clinical Conflicts & Differing Recommendations
             CREATE TABLE IF NOT EXISTS clinical_conflicts (
                 id TEXT PRIMARY KEY,
                 topic TEXT NOT NULL,
                 specialty TEXT NOT NULL,
                 source_a TEXT NOT NULL,
                 recommendation_a TEXT NOT NULL,
                 source_b TEXT NOT NULL,
                 recommendation_b TEXT NOT NULL,
                 evidence_level_a TEXT,
                 evidence_level_b TEXT,
                 review_status TEXT NOT NULL DEFAULT 'Candidate Conflict - Requires Clinical Review',
                 updated_at TEXT NOT NULL
             );

             INSERT OR IGNORE INTO clinical_conflicts (id, topic, specialty, source_a, recommendation_a, source_b, recommendation_b, evidence_level_a, evidence_level_b, review_status, updated_at)
             VALUES
             ('conf-1', 'Hypertension Diagnostic Threshold', 'Cardiology', 'ACC/AHA (2023)', 'Stage 1 Hypertension starts at SBP >= 130 mmHg or DBP >= 80 mmHg.', 'ESC/ESH (European Society)', 'Hypertension defined as SBP >= 140 mmHg or DBP >= 90 mmHg; 130-139/85-89 classified as High-Normal.', 'Class I, Level A', 'Class I, Level A', 'Active Guideline Variance', datetime('now')),
             ('conf-2', 'Initial Fluid Resuscitation Volume in Sepsis', 'Critical Care', 'Surviving Sepsis Campaign', 'Recommends initial crystalloid fluid bolus of 30 mL/kg within 3 hours.', 'CLOVERS Trial (NEJM 2023)', 'Restrictive fluid strategy demonstrated equivalent 90-day mortality compared to liberal fluid protocol.', 'Weak Recommendation, Low Quality Evidence', 'High (Multicenter RCT)', 'Emerging Evidence Debate', datetime('now'));

             -- UPD-001 to UPD-003: Archive Version History
             
              -- EXT-002: Knowledge Graph Entities & Relations
              CREATE TABLE IF NOT EXISTS knowledge_graph_entities (
                  id TEXT PRIMARY KEY,
                  archive_id TEXT NOT NULL,
                  article_path TEXT NOT NULL,
                  entity_type TEXT NOT NULL,
                  name TEXT NOT NULL,
                  confidence REAL NOT NULL DEFAULT 1.0,
                  created_at TEXT NOT NULL
              );
              CREATE INDEX IF NOT EXISTS idx_kg_entities_name ON knowledge_graph_entities (name);

              CREATE TABLE IF NOT EXISTS knowledge_graph_relations (
                  id TEXT PRIMARY KEY,
                  source_entity TEXT NOT NULL,
                  target_entity TEXT NOT NULL,
                  relation_type TEXT NOT NULL,
                  citation TEXT NOT NULL,
                  confidence REAL NOT NULL DEFAULT 1.0,
                  created_at TEXT NOT NULL
              );

              -- Seed knowledge graph sample
              INSERT OR IGNORE INTO knowledge_graph_entities (id, archive_id, article_path, entity_type, name, confidence, created_at)
              VALUES
              ('kg-e1', 'wikimed', 'A/Hypertension', 'Disease', 'Hypertension', 0.98, datetime('now')),
              ('kg-e2', 'wikimed', 'A/Amlodipine', 'Drug', 'Amlodipine', 0.95, datetime('now')),
              ('kg-e3', 'wikimed', 'A/Heart_failure', 'Disease', 'Heart Failure', 0.94, datetime('now')),
              ('kg-e4', 'wikimed', 'A/Metformin', 'Drug', 'Metformin', 0.99, datetime('now')),
              ('kg-e5', 'wikimed', 'A/Type_2_diabetes', 'Disease', 'Type 2 Diabetes', 0.97, datetime('now'));

              INSERT OR IGNORE INTO knowledge_graph_relations (id, source_entity, target_entity, relation_type, citation, confidence, created_at)
              VALUES
              ('kg-r1', 'Amlodipine', 'Hypertension', 'TREATS', 'WikiMed: A/Hypertension (First-line CCB)', 0.96, datetime('now')),
              ('kg-r2', 'Hypertension', 'Heart Failure', 'RISK_FACTOR_FOR', 'AHA Guidelines 2023', 0.92, datetime('now')),
              ('kg-r3', 'Metformin', 'Type 2 Diabetes', 'FIRST_LINE_THERAPY', 'ADA Standards of Care 2024', 0.98, datetime('now'));

              -- EXT-004: Personal Knowledge Workspace Items
              CREATE TABLE IF NOT EXISTS personal_workspace_items (
                  id TEXT PRIMARY KEY,
                  item_type TEXT NOT NULL,
                  title TEXT NOT NULL,
                  content TEXT NOT NULL,
                  tags TEXT NOT NULL DEFAULT '[]',
                  source_ref TEXT NOT NULL,
                  created_at TEXT NOT NULL,
                  updated_at TEXT NOT NULL
              );

              -- EXT-005: Exportable Research Dossiers
              CREATE TABLE IF NOT EXISTS research_dossiers (
                  id TEXT PRIMARY KEY,
                  title TEXT NOT NULL,
                  topic TEXT NOT NULL,
                  content TEXT NOT NULL,
                  citations TEXT NOT NULL DEFAULT '[]',
                  created_at TEXT NOT NULL
              );

              -- EXT-006: Offline Model Manager
              CREATE TABLE IF NOT EXISTS offline_models (
                  id TEXT PRIMARY KEY,
                  name TEXT NOT NULL,
                  model_type TEXT NOT NULL,
                  size_bytes INTEGER NOT NULL,
                  license TEXT NOT NULL,
                  languages TEXT NOT NULL,
                  status TEXT NOT NULL DEFAULT 'available',
                  download_url TEXT,
                  hardware_reqs TEXT NOT NULL,
                  updated_at TEXT NOT NULL
              );

              INSERT OR IGNORE INTO offline_models (id, name, model_type, size_bytes, license, languages, status, download_url, hardware_reqs, updated_at)
              VALUES
              ('mod-tts-en', 'Piper TTS (en-US-lessac)', 'tts', 65000000, 'MIT', 'English', 'installed', NULL, 'CPU Compatible (Zero GPU requirement)', datetime('now')),
              ('mod-trans-fa', 'Opus-MT (en-to-fa Fast)', 'translation', 290000000, 'Apache-2.0', 'English, Persian', 'installed', NULL, '2GB RAM, AVX2 CPU', datetime('now')),
              ('mod-emb-bge', 'BGE-Small-EN-v1.5 ONNX', 'embedding', 133000000, 'MIT', 'English', 'available', 'https://huggingface.co/BAAI/bge-small-en-v1.5', '512MB RAM, CPU', datetime('now')),
              ('mod-rerank-ms', 'bge-reranker-base ONNX', 'reranker', 440000000, 'MIT', 'Multilingual', 'available', 'https://huggingface.co/BAAI/bge-reranker-base', '1GB RAM, CPU', datetime('now'));

              CREATE TABLE IF NOT EXISTS archive_version_history (
                 id TEXT PRIMARY KEY,
                 archive_id TEXT NOT NULL,
                 archive_title TEXT NOT NULL,
                 version_date TEXT NOT NULL,
                 file_size_bytes INTEGER NOT NULL,
                 sha256 TEXT,
                 installed_at TEXT NOT NULL,
                 file_path TEXT NOT NULL,
                 retention_status TEXT NOT NULL DEFAULT 'active'
             );
             CREATE INDEX IF NOT EXISTS idx_archive_version_hist ON archive_version_history (archive_id);",
        )?;
        Ok(Self {
            conn: Arc::new(Mutex::new(conn)),
        })
    }

    pub fn conn(&self) -> Arc<Mutex<Connection>> {
        self.conn.clone()
    }

    pub fn get_chats(&self) -> Result<Vec<ChatRecord>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, title, createdAt, sources, files FROM chats ORDER BY rowid DESC")?;
        let rows = stmt.query_map([], |row| {
            let sources_str: String = row.get(3)?;
            let files_str: String = row.get(4)?;
            let sources = serde_json::from_str(&sources_str).unwrap_or(serde_json::json!([]));
            let files = serde_json::from_str(&files_str).unwrap_or(serde_json::json!([]));
            Ok(ChatRecord {
                id: row.get(0)?,
                title: row.get(1)?,
                created_at: row.get(2)?,
                sources,
                files,
            })
        })?;

        let mut chats = Vec::new();
        for r in rows {
            chats.push(r?);
        }
        Ok(chats)
    }

    pub fn get_chat(&self, id: &str) -> Result<Option<ChatRecord>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, title, createdAt, sources, files FROM chats WHERE id = ?1")?;
        let mut rows = stmt.query(params![id])?;
        if let Some(row) = rows.next()? {
            let sources_str: String = row.get(3)?;
            let files_str: String = row.get(4)?;
            let sources = serde_json::from_str(&sources_str).unwrap_or(serde_json::json!([]));
            let files = serde_json::from_str(&files_str).unwrap_or(serde_json::json!([]));
            Ok(Some(ChatRecord {
                id: row.get(0)?,
                title: row.get(1)?,
                created_at: row.get(2)?,
                sources,
                files,
            }))
        } else {
            Ok(None)
        }
    }

    pub fn ensure_chat_exists(&self, id: &str, title: &str, sources: &serde_json::Value, files: &serde_json::Value) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id FROM chats WHERE id = ?1")?;
        let exists = stmt.exists(params![id])?;
        if !exists {
            let created_at = chrono::Utc::now().to_rfc3339();
            let sources_str = serde_json::to_string(sources).unwrap_or_else(|_| "[]".to_string());
            let files_str = serde_json::to_string(files).unwrap_or_else(|_| "[]".to_string());
            conn.execute(
                "INSERT INTO chats (id, title, createdAt, sources, files) VALUES (?1, ?2, ?3, ?4, ?5)",
                params![id, title, created_at, sources_str, files_str],
            )?;
        }
        Ok(())
    }

    pub fn get_messages(&self, chat_id: &str) -> Result<Vec<MessageRecord>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, messageId, chatId, backendId, query, createdAt, responseBlocks, status FROM messages WHERE chatId = ?1 ORDER BY id ASC",
        )?;
        let rows = stmt.query_map(params![chat_id], |row| {
            let blocks_str: String = row.get(6)?;
            let response_blocks = serde_json::from_str(&blocks_str).unwrap_or(serde_json::json!([]));
            Ok(MessageRecord {
                id: Some(row.get(0)?),
                message_id: row.get(1)?,
                chat_id: row.get(2)?,
                backend_id: row.get(3)?,
                query: row.get(4)?,
                created_at: row.get(5)?,
                response_blocks,
                status: row.get(7)?,
            })
        })?;

        let mut messages = Vec::new();
        for r in rows {
            messages.push(r?);
        }
        Ok(messages)
    }

    pub fn save_or_update_message(&self, msg: &MessageRecord) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let blocks_str = serde_json::to_string(&msg.response_blocks).unwrap_or_else(|_| "[]".to_string());

        let mut check_stmt = conn.prepare("SELECT id FROM messages WHERE chatId = ?1 AND messageId = ?2")?;
        let existing_id: Option<i64> = check_stmt.query_row(params![msg.chat_id, msg.message_id], |row| row.get(0)).ok();

        if let Some(id) = existing_id {
            // Delete messages after this one (if regenerating/rewriting)
            conn.execute("DELETE FROM messages WHERE chatId = ?1 AND id > ?2", params![msg.chat_id, id])?;
            conn.execute(
                "UPDATE messages SET backendId = ?1, query = ?2, responseBlocks = ?3, status = ?4 WHERE id = ?5",
                params![msg.backend_id, msg.query, blocks_str, msg.status, id],
            )?;
        } else {
            conn.execute(
                "INSERT INTO messages (messageId, chatId, backendId, query, createdAt, responseBlocks, status) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![msg.message_id, msg.chat_id, msg.backend_id, msg.query, msg.created_at, blocks_str, msg.status],
            )?;
        }
        Ok(())
    }

    pub fn update_message_response(&self, chat_id: &str, message_id: &str, blocks: &serde_json::Value, status: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let blocks_str = serde_json::to_string(blocks).unwrap_or_else(|_| "[]".to_string());
        conn.execute(
            "UPDATE messages SET responseBlocks = ?1, status = ?2 WHERE chatId = ?3 AND messageId = ?4",
            params![blocks_str, status, chat_id, message_id],
        )?;
        Ok(())
    }

    pub fn delete_chat(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM chats WHERE id = ?1", params![id])?;
        conn.execute("DELETE FROM messages WHERE chatId = ?1", params![id])?;
        Ok(())
    }

    // --- Discover Intelligence: Saved Items ---
    pub fn get_saved_items(&self) -> Result<Vec<DiscoverSavedItem>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, itemType, title, source, url, dataJson, savedAt FROM discover_saved_items ORDER BY savedAt DESC",
        )?;
        let rows = stmt.query_map([], |row| {
            let data_str: String = row.get(5)?;
            let data_json = serde_json::from_str(&data_str).unwrap_or(serde_json::json!({}));
            Ok(DiscoverSavedItem {
                id: row.get(0)?,
                item_type: row.get(1)?,
                title: row.get(2)?,
                source: row.get(3)?,
                url: row.get(4)?,
                data_json,
                saved_at: row.get(6)?,
            })
        })?;

        let mut items = Vec::new();
        for r in rows {
            items.push(r?);
        }
        Ok(items)
    }

    pub fn save_item(&self, item: &DiscoverSavedItem) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let data_str = serde_json::to_string(&item.data_json).unwrap_or_else(|_| "{}".to_string());
        conn.execute(
            "INSERT OR REPLACE INTO discover_saved_items (id, itemType, title, source, url, dataJson, savedAt)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                item.id,
                item.item_type,
                item.title,
                item.source,
                item.url,
                data_str,
                item.saved_at
            ],
        )?;
        Ok(())
    }

    pub fn delete_saved_item(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM discover_saved_items WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn is_item_saved(&self, id: &str) -> Result<bool> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT 1 FROM discover_saved_items WHERE id = ?1")?;
        Ok(stmt.exists(params![id])?)
    }

    // --- Discover Intelligence: Reading Queue ---
    pub fn get_reading_queue(&self) -> Result<Vec<DiscoverQueueItem>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, itemType, title, source, url, dataJson, addedAt, isRead FROM discover_reading_queue ORDER BY addedAt DESC",
        )?;
        let rows = stmt.query_map([], |row| {
            let data_str: String = row.get(5)?;
            let data_json = serde_json::from_str(&data_str).unwrap_or(serde_json::json!({}));
            let is_read_int: i64 = row.get(7)?;
            Ok(DiscoverQueueItem {
                id: row.get(0)?,
                item_type: row.get(1)?,
                title: row.get(2)?,
                source: row.get(3)?,
                url: row.get(4)?,
                data_json,
                added_at: row.get(6)?,
                is_read: is_read_int != 0,
            })
        })?;

        let mut items = Vec::new();
        for r in rows {
            items.push(r?);
        }
        Ok(items)
    }

    pub fn add_to_reading_queue(&self, item: &DiscoverQueueItem) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let data_str = serde_json::to_string(&item.data_json).unwrap_or_else(|_| "{}".to_string());
        conn.execute(
            "INSERT OR REPLACE INTO discover_reading_queue (id, itemType, title, source, url, dataJson, addedAt, isRead)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                item.id,
                item.item_type,
                item.title,
                item.source,
                item.url,
                data_str,
                item.added_at,
                if item.is_read { 1 } else { 0 }
            ],
        )?;
        Ok(())
    }

    pub fn update_reading_queue_status(&self, id: &str, is_read: bool) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE discover_reading_queue SET isRead = ?1 WHERE id = ?2",
            params![if is_read { 1 } else { 0 }, id],
        )?;
        Ok(())
    }

    pub fn remove_from_reading_queue(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM discover_reading_queue WHERE id = ?1", params![id])?;
        Ok(())
    }

    // --- Discover Intelligence: Followed Topics ---
    pub fn get_followed_topics(&self) -> Result<Vec<DiscoverFollowedTopic>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT topicId, category, displayName, followedAt FROM discover_followed_topics ORDER BY followedAt DESC",
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(DiscoverFollowedTopic {
                topic_id: row.get(0)?,
                category: row.get(1)?,
                display_name: row.get(2)?,
                followed_at: row.get(3)?,
            })
        })?;

        let mut topics = Vec::new();
        for r in rows {
            topics.push(r?);
        }
        Ok(topics)
    }

    pub fn follow_topic(&self, topic: &DiscoverFollowedTopic) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO discover_followed_topics (topicId, category, displayName, followedAt)
             VALUES (?1, ?2, ?3, ?4)",
            params![topic.topic_id, topic.category, topic.display_name, topic.followed_at],
        )?;
        Ok(())
    }

    pub fn unfollow_topic(&self, topic_id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM discover_followed_topics WHERE topicId = ?1", params![topic_id])?;
        Ok(())
    }

    // --- Discover Intelligence: Feedback ---
    pub fn record_feedback(&self, item_id: &str, feedback_type: &str, meta: &serde_json::Value) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let meta_str = serde_json::to_string(meta).unwrap_or_else(|_| "{}".to_string());
        let created_at = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO discover_user_feedback (itemId, feedbackType, meta, createdAt)
             VALUES (?1, ?2, ?3, ?4)",
            params![item_id, feedback_type, meta_str, created_at],
        )?;
        Ok(())
    }

    pub fn get_user_feedback(&self) -> Result<Vec<DiscoverFeedbackRecord>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, itemId, feedbackType, meta, createdAt FROM discover_user_feedback ORDER BY id DESC LIMIT 500",
        )?;
        let rows = stmt.query_map([], |row| {
            let meta_str: String = row.get(3)?;
            let meta = serde_json::from_str(&meta_str).unwrap_or(serde_json::json!({}));
            Ok(DiscoverFeedbackRecord {
                id: Some(row.get(0)?),
                item_id: row.get(1)?,
                feedback_type: row.get(2)?,
                meta,
                created_at: row.get(4)?,
            })
        })?;

        let mut records = Vec::new();
        for r in rows {
            records.push(r?);
        }
        Ok(records)
    }

    // --- Knowledge Store: Saved Searches ---
    pub fn get_saved_catalog_searches(&self) -> Result<Vec<SavedCatalogSearchRecord>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, query, filters_json, sort_order, created_at, updated_at FROM saved_catalog_searches ORDER BY created_at DESC",
        )?;
        let rows = stmt.query_map([], |row| {
            let filters_str: String = row.get(3)?;
            let filters_json: serde_json::Value = serde_json::from_str(&filters_str).unwrap_or(serde_json::json!({}));
            Ok(SavedCatalogSearchRecord {
                id: row.get(0)?,
                name: row.get(1)?,
                query: row.get(2)?,
                filters_json,
                sort_order: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })?;

        let mut results = Vec::new();
        for r in rows {
            if let Ok(rec) = r {
                results.push(rec);
            }
        }
        Ok(results)
    }

    pub fn save_catalog_search(&self, record: &SavedCatalogSearchRecord) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO saved_catalog_searches (id, name, query, filters_json, sort_order, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
             ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                query = excluded.query,
                filters_json = excluded.filters_json,
                sort_order = excluded.sort_order,
                updated_at = excluded.updated_at",
            params![
                record.id,
                record.name,
                record.query,
                record.filters_json.to_string(),
                record.sort_order,
                record.created_at,
                record.updated_at,
            ],
        )?;
        Ok(())
    }

    pub fn delete_saved_catalog_search(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM saved_catalog_searches WHERE id = ?1", params![id])?;
        Ok(())
    }

    // --- CAT-006: Multiple Catalog Sources ---
    pub fn get_catalog_sources(&self) -> Result<Vec<CatalogSourceRecord>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, url, is_enabled, is_default, priority, created_at, updated_at FROM catalog_sources ORDER BY priority ASC, created_at ASC",
        )?;
        let rows = stmt.query_map([], |row| {
            let is_enabled: i64 = row.get(3)?;
            let is_default: i64 = row.get(4)?;
            Ok(CatalogSourceRecord {
                id: row.get(0)?,
                name: row.get(1)?,
                url: row.get(2)?,
                is_enabled: is_enabled == 1,
                is_default: is_default == 1,
                priority: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })?;
        let mut res = Vec::new();
        for r in rows {
            if let Ok(item) = r {
                res.push(item);
            }
        }
        Ok(res)
    }

    pub fn save_catalog_source(&self, record: &CatalogSourceRecord) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO catalog_sources (id, name, url, is_enabled, is_default, priority, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
             ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                url = excluded.url,
                is_enabled = excluded.is_enabled,
                is_default = excluded.is_default,
                priority = excluded.priority,
                updated_at = excluded.updated_at",
            params![
                record.id,
                record.name,
                record.url,
                if record.is_enabled { 1 } else { 0 },
                if record.is_default { 1 } else { 0 },
                record.priority,
                record.created_at,
                record.updated_at,
            ],
        )?;
        Ok(())
    }

    pub fn delete_catalog_source(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        // Prevent deleting default source
        conn.execute("DELETE FROM catalog_sources WHERE id = ?1 AND is_default = 0", params![id])?;
        Ok(())
    }

    // --- LIB-003: Collections Manager ---
    pub fn get_library_collections(&self) -> Result<Vec<LibraryCollectionRecord>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT c.id, c.name, c.description, c.color, c.icon, c.created_at, c.updated_at,
                    (SELECT COUNT(*) FROM archive_collection_members m WHERE m.collection_id = c.id) as item_count
             FROM library_collections c ORDER BY c.created_at ASC",
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(LibraryCollectionRecord {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                color: row.get(3)?,
                icon: row.get(4)?,
                item_count: Some(row.get(7)?),
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })?;
        let mut res = Vec::new();
        for r in rows {
            if let Ok(c) = r {
                res.push(c);
            }
        }
        Ok(res)
    }

    pub fn save_library_collection(&self, record: &LibraryCollectionRecord) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO library_collections (id, name, description, color, icon, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
             ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                description = excluded.description,
                color = excluded.color,
                icon = excluded.icon,
                updated_at = excluded.updated_at",
            params![
                record.id,
                record.name,
                record.description,
                record.color,
                record.icon,
                record.created_at,
                record.updated_at,
            ],
        )?;
        Ok(())
    }

    pub fn delete_library_collection(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM library_collections WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn add_archive_to_collection(&self, archive_id: &str, collection_id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR IGNORE INTO archive_collection_members (archive_id, collection_id) VALUES (?1, ?2)",
            params![archive_id, collection_id],
        )?;
        Ok(())
    }

    pub fn remove_archive_from_collection(&self, archive_id: &str, collection_id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "DELETE FROM archive_collection_members WHERE archive_id = ?1 AND collection_id = ?2",
            params![archive_id, collection_id],
        )?;
        Ok(())
    }

    pub fn get_archive_collections(&self, archive_id: &str) -> Result<Vec<String>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT collection_id FROM archive_collection_members WHERE archive_id = ?1")?;
        let rows = stmt.query_map(params![archive_id], |row| row.get(0))?;
        let mut ids = Vec::new();
        for r in rows {
            if let Ok(id) = r {
                ids.push(id);
            }
        }
        Ok(ids)
    }

    // --- LIB-009: User Metadata & Personal Tags/Notes ---
    pub fn get_archive_user_metadata(&self, archive_id: &str) -> Result<Option<ArchiveUserMetadataRecord>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT archive_id, display_name, custom_notes, custom_tags, is_favorite, updated_at FROM archive_user_metadata WHERE archive_id = ?1",
        )?;
        let mut rows = stmt.query(params![archive_id])?;
        if let Some(row) = rows.next()? {
            let tags_str: String = row.get(3)?;
            let tags: Vec<String> = serde_json::from_str(&tags_str).unwrap_or_default();
            let is_fav: i64 = row.get(4)?;
            Ok(Some(ArchiveUserMetadataRecord {
                archive_id: row.get(0)?,
                display_name: row.get(1)?,
                custom_notes: row.get(2)?,
                custom_tags: tags,
                is_favorite: is_fav == 1,
                updated_at: row.get(5)?,
            }))
        } else {
            Ok(None)
        }
    }

    pub fn save_archive_user_metadata(&self, record: &ArchiveUserMetadataRecord) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let tags_json = serde_json::to_string(&record.custom_tags).unwrap_or_else(|_| "[]".to_string());
        conn.execute(
            "INSERT INTO archive_user_metadata (archive_id, display_name, custom_notes, custom_tags, is_favorite, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)
             ON CONFLICT(archive_id) DO UPDATE SET
                display_name = excluded.display_name,
                custom_notes = excluded.custom_notes,
                custom_tags = excluded.custom_tags,
                is_favorite = excluded.is_favorite,
                updated_at = excluded.updated_at",
            params![
                record.archive_id,
                record.display_name,
                record.custom_notes,
                tags_json,
                if record.is_favorite { 1 } else { 0 },
                record.updated_at,
            ],
        )?;
        Ok(())
    }

    // --- LIB-008: Storage Roots ---
    pub fn get_storage_roots(&self) -> Result<Vec<StorageRootRecord>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, path, role, is_active, created_at FROM storage_roots ORDER BY created_at ASC",
        )?;
        let rows = stmt.query_map([], |row| {
            let is_act: i64 = row.get(3)?;
            Ok(StorageRootRecord {
                id: row.get(0)?,
                path: row.get(1)?,
                role: row.get(2)?,
                is_active: is_act == 1,
                free_bytes: None,
                total_bytes: None,
                created_at: row.get(4)?,
            })
        })?;
        let mut res = Vec::new();
        for r in rows {
            if let Ok(item) = r {
                res.push(item);
            }
        }
        Ok(res)
    }

    pub fn save_storage_root(&self, record: &StorageRootRecord) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO storage_roots (id, path, role, is_active, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(id) DO UPDATE SET
                path = excluded.path,
                role = excluded.role,
                is_active = excluded.is_active",
            params![
                record.id,
                record.path,
                record.role,
                if record.is_active { 1 } else { 0 },
                record.created_at,
            ],
        )?;
        Ok(())
    }

    pub fn delete_storage_root(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM storage_roots WHERE id = ?1", params![id])?;
        Ok(())
    }

    // --- LIB-004: Scanner Folders ---
    pub fn get_scan_directories(&self) -> Result<Vec<ScanDirectoryRecord>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, path, recursive, last_scanned_at, created_at FROM scan_directories ORDER BY created_at ASC",
        )?;
        let rows = stmt.query_map([], |row| {
            let rec: i64 = row.get(2)?;
            Ok(ScanDirectoryRecord {
                id: row.get(0)?,
                path: row.get(1)?,
                recursive: rec == 1,
                last_scanned_at: row.get(3)?,
                created_at: row.get(4)?,
            })
        })?;
        let mut res = Vec::new();
        for r in rows {
            if let Ok(d) = r {
                res.push(d);
            }
        }
        Ok(res)
    }

    pub fn save_scan_directory(&self, record: &ScanDirectoryRecord) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO scan_directories (id, path, recursive, last_scanned_at, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(id) DO UPDATE SET
                path = excluded.path,
                recursive = excluded.recursive,
                last_scanned_at = excluded.last_scanned_at",
            params![
                record.id,
                record.path,
                if record.recursive { 1 } else { 0 },
                record.last_scanned_at,
                record.created_at,
            ],
        )?;
        Ok(())
    }

    pub fn delete_scan_directory(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM scan_directories WHERE id = ?1", params![id])?;
        Ok(())
    }

    // --- DL-007: Download Bundles ---
    pub fn get_download_bundles(&self) -> Result<Vec<DownloadBundleRecord>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, archive_ids, total_bytes, status, created_at, updated_at FROM download_bundles ORDER BY created_at DESC",
        )?;
        let rows = stmt.query_map([], |row| {
            let ids_str: String = row.get(2)?;
            let archive_ids: Vec<String> = serde_json::from_str(&ids_str).unwrap_or_default();
            Ok(DownloadBundleRecord {
                id: row.get(0)?,
                name: row.get(1)?,
                archive_ids,
                total_bytes: row.get(3)?,
                status: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })?;
        let mut res = Vec::new();
        for r in rows {
            if let Ok(b) = r {
                res.push(b);
            }
        }
        Ok(res)
    }

    pub fn save_download_bundle(&self, record: &DownloadBundleRecord) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let ids_json = serde_json::to_string(&record.archive_ids).unwrap_or_else(|_| "[]".to_string());
        conn.execute(
            "INSERT INTO download_bundles (id, name, archive_ids, total_bytes, status, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
             ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                archive_ids = excluded.archive_ids,
                total_bytes = excluded.total_bytes,
                status = excluded.status,
                updated_at = excluded.updated_at",
            params![
                record.id,
                record.name,
                ids_json,
                record.total_bytes,
                record.status,
                record.created_at,
                record.updated_at,
            ],
        )?;
        Ok(())
    }

    pub fn delete_download_bundle(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM download_bundles WHERE id = ?1", params![id])?;
        Ok(())
    }

    // --- READ-002: Highlights & Annotations ---
    pub fn get_article_annotations(&self, archive_id: &str, article_path: &str) -> Result<Vec<ArticleAnnotationRecord>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, archive_id, article_path, selected_text, prefix_context, suffix_context, anchor_id, color, note, created_at, updated_at
             FROM article_annotations
             WHERE archive_id = ?1 AND article_path = ?2
             ORDER BY rowid ASC",
        )?;
        let rows = stmt.query_map(params![archive_id, article_path], |row| {
            Ok(ArticleAnnotationRecord {
                id: row.get(0)?,
                archive_id: row.get(1)?,
                article_path: row.get(2)?,
                selected_text: row.get(3)?,
                prefix_context: row.get(4)?,
                suffix_context: row.get(5)?,
                anchor_id: row.get(6)?,
                color: row.get(7)?,
                note: row.get(8)?,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
            })
        })?;
        let mut list = Vec::new();
        for r in rows {
            if let Ok(a) = r {
                list.push(a);
            }
        }
        Ok(list)
    }

    pub fn get_all_annotations(&self, archive_id: Option<&str>) -> Result<Vec<ArticleAnnotationRecord>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, archive_id, article_path, selected_text, prefix_context, suffix_context, anchor_id, color, note, created_at, updated_at
             FROM article_annotations
             WHERE (?1 IS NULL OR archive_id = ?1)
             ORDER BY rowid DESC",
        )?;
        let rows = stmt.query_map(rusqlite::params![archive_id], |row| {
            Ok(ArticleAnnotationRecord {
                id: row.get(0)?,
                archive_id: row.get(1)?,
                article_path: row.get(2)?,
                selected_text: row.get(3)?,
                prefix_context: row.get(4)?,
                suffix_context: row.get(5)?,
                anchor_id: row.get(6)?,
                color: row.get(7)?,
                note: row.get(8)?,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
            })
        })?;
        let mut list = Vec::new();
        for r in rows {
            if let Ok(a) = r {
                list.push(a);
            }
        }
        Ok(list)
    }

    pub fn save_annotation(&self, record: &ArticleAnnotationRecord) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO article_annotations (id, archive_id, article_path, selected_text, prefix_context, suffix_context, anchor_id, color, note, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
             ON CONFLICT(id) DO UPDATE SET
                selected_text = excluded.selected_text,
                color = excluded.color,
                note = excluded.note,
                updated_at = excluded.updated_at",
            params![
                record.id,
                record.archive_id,
                record.article_path,
                record.selected_text,
                record.prefix_context,
                record.suffix_context,
                record.anchor_id,
                record.color,
                record.note,
                record.created_at,
                record.updated_at,
            ],
        )?;
        Ok(())
    }

    pub fn delete_annotation(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM article_annotations WHERE id = ?1", params![id])?;
        Ok(())
    }

    // --- READ-007: Reading History & Continue Reading ---
    pub fn get_reading_history(&self, limit: usize) -> Result<Vec<ReadingHistoryRecord>> {
        let conn = self.conn.lock().unwrap();
        let max_items = if limit == 0 { 50 } else { limit.min(200) };
        let mut stmt = conn.prepare(
            "SELECT id, archive_id, archive_title, article_path, article_title, scroll_percentage, last_read_at, duration_seconds
             FROM article_reading_history
             ORDER BY last_read_at DESC
             LIMIT ?1",
        )?;
        let rows = stmt.query_map(params![max_items as i64], |row| {
            Ok(ReadingHistoryRecord {
                id: row.get(0)?,
                archive_id: row.get(1)?,
                archive_title: row.get(2)?,
                article_path: row.get(3)?,
                article_title: row.get(4)?,
                scroll_percentage: row.get(5)?,
                last_read_at: row.get(6)?,
                duration_seconds: row.get(7)?,
            })
        })?;
        let mut list = Vec::new();
        for r in rows {
            if let Ok(item) = r {
                list.push(item);
            }
        }
        Ok(list)
    }

    pub fn record_reading_history(&self, record: &ReadingHistoryRecord) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO article_reading_history (id, archive_id, archive_title, article_path, article_title, scroll_percentage, last_read_at, duration_seconds)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
             ON CONFLICT(id) DO UPDATE SET
                scroll_percentage = excluded.scroll_percentage,
                last_read_at = excluded.last_read_at,
                duration_seconds = duration_seconds + excluded.duration_seconds",
            params![
                record.id,
                record.archive_id,
                record.archive_title,
                record.article_path,
                record.article_title,
                record.scroll_percentage,
                record.last_read_at,
                record.duration_seconds,
            ],
        )?;
        Ok(())
    }

    pub fn clear_reading_history(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM article_reading_history", [])?;
        Ok(())
    }

    pub fn delete_reading_history_item(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM article_reading_history WHERE id = ?1", params![id])?;
        Ok(())
    }

    // --- READ-008: Article Bookmarks ---
    pub fn get_article_bookmarks(&self, archive_id: Option<&str>) -> Result<Vec<ArticleBookmarkRecord>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, archive_id, archive_title, article_path, article_title, tags, note, created_at
             FROM article_bookmarks
             WHERE (?1 IS NULL OR archive_id = ?1)
             ORDER BY rowid DESC",
        )?;
        let rows = stmt.query_map(rusqlite::params![archive_id], |row| {
            let tags_str: String = row.get(5)?;
            let tags = serde_json::from_str(&tags_str).unwrap_or_else(|_| Vec::new());
            Ok(ArticleBookmarkRecord {
                id: row.get(0)?,
                archive_id: row.get(1)?,
                archive_title: row.get(2)?,
                article_path: row.get(3)?,
                article_title: row.get(4)?,
                tags,
                note: row.get(6)?,
                created_at: row.get(7)?,
            })
        })?;
        let mut list = Vec::new();
        for r in rows {
            if let Ok(item) = r {
                list.push(item);
            }
        }
        Ok(list)
    }

    pub fn save_article_bookmark(&self, record: &ArticleBookmarkRecord) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let tags_json = serde_json::to_string(&record.tags).unwrap_or_else(|_| "[]".to_string());
        conn.execute(
            "INSERT INTO article_bookmarks (id, archive_id, archive_title, article_path, article_title, tags, note, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
             ON CONFLICT(id) DO UPDATE SET
                tags = excluded.tags,
                note = excluded.note",
            params![
                record.id,
                record.archive_id,
                record.archive_title,
                record.article_path,
                record.article_title,
                tags_json,
                record.note,
                record.created_at,
            ],
        )?;
        Ok(())
    }

    pub fn delete_article_bookmark(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM article_bookmarks WHERE id = ?1", params![id])?;
        Ok(())
    }

    // --- SEARCH-001 to SEARCH-009: Full-Text Search (SQLite FTS5) & Search Index ---
    pub fn index_article_content(
        &self,
        archive_id: &str,
        article_path: &str,
        title: &str,
        plain_text: &str,
        word_count: i64,
    ) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let id = format!("{}:{}", archive_id, article_path);
        let now = chrono::Utc::now().to_rfc3339();

        conn.execute(
            "INSERT INTO knowledge_indexed_articles (id, archive_id, article_path, title, plain_text, word_count, indexed_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
             ON CONFLICT(archive_id, article_path) DO UPDATE SET
                title = excluded.title,
                plain_text = excluded.plain_text,
                word_count = excluded.word_count,
                indexed_at = excluded.indexed_at",
            params![id, archive_id, article_path, title, plain_text, word_count, now],
        )?;

        // Update FTS virtual table
        conn.execute(
            "DELETE FROM knowledge_articles_fts WHERE archive_id = ?1 AND article_path = ?2",
            params![archive_id, article_path],
        ).ok();

        conn.execute(
            "INSERT INTO knowledge_articles_fts (title, plain_text, archive_id, article_path)
             VALUES (?1, ?2, ?3, ?4)",
            params![title, plain_text, archive_id, article_path],
        )?;

        Ok(())
    }

    pub fn search_global_fts(
        &self,
        query: &str,
        archive_filter: Option<&str>,
        limit: usize,
    ) -> Result<Vec<GlobalSearchResultRecord>> {
        let conn = self.conn.lock().unwrap();
        let max_results = if limit == 0 { 40 } else { limit.min(100) };
        let clean_q = query.trim().replace('"', "\"\"");
        if clean_q.is_empty() {
            return Ok(Vec::new());
        }

        let fts_query = format!("\"{}\"*", clean_q);

        let (sql, params_vec): (String, Vec<Box<dyn rusqlite::ToSql>>) = match archive_filter {
            Some(aid) => (
                "SELECT f.archive_id, COALESCE(z.title, f.archive_id), f.article_path, f.title,
                        snippet(knowledge_articles_fts, 1, '<b>', '</b>', '...', 24),
                        bm25(knowledge_articles_fts),
                        COALESCE(i.word_count, 0)
                 FROM knowledge_articles_fts f
                 LEFT JOIN zim_archives z ON z.id = f.archive_id
                 LEFT JOIN knowledge_indexed_articles i ON (i.archive_id = f.archive_id AND i.article_path = f.article_path)
                 WHERE knowledge_articles_fts MATCH ?1 AND f.archive_id = ?2
                 ORDER BY bm25(knowledge_articles_fts) ASC
                 LIMIT ?3".to_string(),
                vec![Box::new(fts_query), Box::new(aid.to_string()), Box::new(max_results as i64)],
            ),
            None => (
                "SELECT f.archive_id, COALESCE(z.title, f.archive_id), f.article_path, f.title,
                        snippet(knowledge_articles_fts, 1, '<b>', '</b>', '...', 24),
                        bm25(knowledge_articles_fts),
                        COALESCE(i.word_count, 0)
                 FROM knowledge_articles_fts f
                 LEFT JOIN zim_archives z ON z.id = f.archive_id
                 LEFT JOIN knowledge_indexed_articles i ON (i.archive_id = f.archive_id AND i.article_path = f.article_path)
                 WHERE knowledge_articles_fts MATCH ?1
                 ORDER BY bm25(knowledge_articles_fts) ASC
                 LIMIT ?2".to_string(),
                vec![Box::new(fts_query), Box::new(max_results as i64)],
            ),
        };

        let mut stmt = conn.prepare(&sql)?;
        let mut param_refs = Vec::new();
        for p in &params_vec {
            param_refs.push(p.as_ref());
        }

        let rows = stmt.query_map(param_refs.as_slice(), |row| {
            let score_raw: f64 = row.get(5)?;
            // Normalize BM25 score (smaller is better in sqlite bm25, convert to positive relevance)
            let score = (100.0 / (1.0 + score_raw.abs())).min(100.0);
            Ok(GlobalSearchResultRecord {
                archive_id: row.get(0)?,
                archive_title: row.get(1)?,
                article_path: row.get(2)?,
                title: row.get(3)?,
                snippet: row.get(4)?,
                score,
                word_count: row.get(6)?,
            })
        })?;

        let mut list = Vec::new();
        for r in rows {
            if let Ok(item) = r {
                list.push(item);
            }
        }
        Ok(list)
    }

    pub fn get_indexing_stats(&self) -> Result<serde_json::Value> {
        let conn = self.conn.lock().unwrap();
        let total_articles: i64 = conn.query_row(
            "SELECT COUNT(*) FROM knowledge_indexed_articles",
            [],
            |r| r.get(0),
        ).unwrap_or(0);
        let total_words: i64 = conn.query_row(
            "SELECT COALESCE(SUM(word_count), 0) FROM knowledge_indexed_articles",
            [],
            |r| r.get(0),
        ).unwrap_or(0);
        let archives_indexed: i64 = conn.query_row(
            "SELECT COUNT(DISTINCT archive_id) FROM knowledge_indexed_articles",
            [],
            |r| r.get(0),
        ).unwrap_or(0);

        Ok(serde_json::json!({
            "total_articles": total_articles,
            "total_words": total_words,
            "archives_indexed": archives_indexed,
            "engine": "SQLite FTS5 (BM25 + unicode61 tokenizer)"
        }))
    }

    pub fn clear_search_index(&self, archive_id_opt: Option<&str>) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        if let Some(aid) = archive_id_opt {
            conn.execute("DELETE FROM knowledge_indexed_articles WHERE archive_id = ?1", params![aid])?;
            conn.execute("DELETE FROM knowledge_articles_fts WHERE archive_id = ?1", params![aid])?;
        } else {
            conn.execute("DELETE FROM knowledge_indexed_articles", [])?;
            conn.execute("DELETE FROM knowledge_articles_fts", [])?;
        }
        Ok(())
    }

    // --- MED-004: Medical Glossary ---
    pub fn get_medical_glossary(&self, search: Option<&str>, specialty: Option<&str>) -> Result<Vec<MedicalGlossaryRecord>> {
        let conn = self.conn.lock().unwrap();
        let s_term = search.map(|s| format!("%{}%", s.trim()));
        let spec_term = match specialty {
            Some("all") | None => None,
            Some(s) if s.is_empty() => None,
            Some(s) => Some(s.to_string()),
        };
        let mut stmt = conn.prepare(
            "SELECT id, term, farsi_translation, definition, abbreviation, specialty, source, is_favorite, created_at
             FROM medical_glossary_terms
             WHERE (?1 IS NULL OR specialty = ?1)
               AND (?2 IS NULL OR term LIKE ?2 OR farsi_translation LIKE ?2 OR abbreviation LIKE ?2 OR definition LIKE ?2)
             ORDER BY is_favorite DESC, term ASC
             LIMIT 100",
        )?;
        let rows = stmt.query_map(rusqlite::params![spec_term, s_term], |row| {
            let is_fav_int: i64 = row.get(7)?;
            Ok(MedicalGlossaryRecord {
                id: row.get(0)?,
                term: row.get(1)?,
                farsi_translation: row.get(2)?,
                definition: row.get(3)?,
                abbreviation: row.get(4)?,
                specialty: row.get(5)?,
                source: row.get(6)?,
                is_favorite: is_fav_int == 1,
                created_at: row.get(8)?,
            })
        })?;
        let mut list = Vec::new();
        for r in rows {
            if let Ok(item) = r {
                list.push(item);
            }
        }
        Ok(list)
    }

    pub fn save_medical_glossary_term(&self, record: &MedicalGlossaryRecord) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO medical_glossary_terms (id, term, farsi_translation, definition, abbreviation, specialty, source, is_favorite, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
             ON CONFLICT(id) DO UPDATE SET
                term = excluded.term,
                farsi_translation = excluded.farsi_translation,
                definition = excluded.definition,
                abbreviation = excluded.abbreviation,
                specialty = excluded.specialty,
                source = excluded.source,
                is_favorite = excluded.is_favorite",
            params![
                record.id,
                record.term,
                record.farsi_translation,
                record.definition,
                record.abbreviation,
                record.specialty,
                record.source,
                if record.is_favorite { 1 } else { 0 },
                record.created_at,
            ],
        )?;
        Ok(())
    }

    pub fn delete_medical_glossary_term(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM medical_glossary_terms WHERE id = ?1", params![id])?;
        Ok(())
    }

    // --- MED-005: Clinical Guidelines ---
    pub fn get_clinical_guidelines(&self) -> Result<Vec<ClinicalGuidelineRecord>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, title, organization, specialty, current_version, latest_version, publication_date, has_update, evidence_type, summary, updated_at
             FROM clinical_guidelines
             ORDER BY updated_at DESC",
        )?;
        let rows = stmt.query_map([], |row| {
            let has_up_int: i64 = row.get(7)?;
            Ok(ClinicalGuidelineRecord {
                id: row.get(0)?,
                title: row.get(1)?,
                organization: row.get(2)?,
                specialty: row.get(3)?,
                current_version: row.get(4)?,
                latest_version: row.get(5)?,
                publication_date: row.get(6)?,
                has_update: has_up_int == 1,
                evidence_type: row.get(8)?,
                summary: row.get(9)?,
                updated_at: row.get(10)?,
            })
        })?;
        let mut list = Vec::new();
        for r in rows {
            if let Ok(item) = r {
                list.push(item);
            }
        }
        Ok(list)
    }

    pub fn save_clinical_guideline(&self, record: &ClinicalGuidelineRecord) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO clinical_guidelines (id, title, organization, specialty, current_version, latest_version, publication_date, has_update, evidence_type, summary, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
             ON CONFLICT(id) DO UPDATE SET
                title = excluded.title,
                organization = excluded.organization,
                specialty = excluded.specialty,
                current_version = excluded.current_version,
                latest_version = excluded.latest_version,
                publication_date = excluded.publication_date,
                has_update = excluded.has_update,
                evidence_type = excluded.evidence_type,
                summary = excluded.summary,
                updated_at = excluded.updated_at",
            params![
                record.id,
                record.title,
                record.organization,
                record.specialty,
                record.current_version,
                record.latest_version,
                record.publication_date,
                if record.has_update { 1 } else { 0 },
                record.evidence_type,
                record.summary,
                record.updated_at,
            ],
        )?;
        Ok(())
    }

    // --- MED-006: Clinical Conflicts ---
    pub fn get_clinical_conflicts(&self) -> Result<Vec<ClinicalConflictRecord>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, topic, specialty, source_a, recommendation_a, source_b, recommendation_b, evidence_level_a, evidence_level_b, review_status, updated_at
             FROM clinical_conflicts
             ORDER BY updated_at DESC",
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(ClinicalConflictRecord {
                id: row.get(0)?,
                topic: row.get(1)?,
                specialty: row.get(2)?,
                source_a: row.get(3)?,
                recommendation_a: row.get(4)?,
                source_b: row.get(5)?,
                recommendation_b: row.get(6)?,
                evidence_level_a: row.get(7)?,
                evidence_level_b: row.get(8)?,
                review_status: row.get(9)?,
                updated_at: row.get(10)?,
            })
        })?;
        let mut list = Vec::new();
        for r in rows {
            if let Ok(item) = r {
                list.push(item);
            }
        }
        Ok(list)
    }

    // --- UPD-001 to UPD-003: Archive Version History ---
    pub fn get_archive_version_history(&self, archive_id_opt: Option<&str>) -> Result<Vec<ArchiveVersionRecord>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, archive_id, archive_title, version_date, file_size_bytes, sha256, installed_at, file_path, retention_status
             FROM archive_version_history
             WHERE (?1 IS NULL OR archive_id = ?1)
             ORDER BY installed_at DESC",
        )?;
        let rows = stmt.query_map(rusqlite::params![archive_id_opt], |row| {
            Ok(ArchiveVersionRecord {
                id: row.get(0)?,
                archive_id: row.get(1)?,
                archive_title: row.get(2)?,
                version_date: row.get(3)?,
                file_size_bytes: row.get(4)?,
                sha256: row.get(5)?,
                installed_at: row.get(6)?,
                file_path: row.get(7)?,
                retention_status: row.get(8)?,
            })
        })?;
        let mut list = Vec::new();
        for r in rows {
            if let Ok(item) = r {
                list.push(item);
            }
        }
        Ok(list)
    }

    pub fn save_archive_version(&self, record: &ArchiveVersionRecord) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO archive_version_history (id, archive_id, archive_title, version_date, file_size_bytes, sha256, installed_at, file_path, retention_status)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
             ON CONFLICT(id) DO UPDATE SET
                retention_status = excluded.retention_status",
            params![
                record.id,
                record.archive_id,
                record.archive_title,
                record.version_date,
                record.file_size_bytes,
                record.sha256,
                record.installed_at,
                record.file_path,
                record.retention_status,
            ],
        )?;
        Ok(())
    }

    // --- EXT-002: Knowledge Graph ---
    pub fn get_knowledge_graph(&self) -> Result<(Vec<KnowledgeGraphEntityRecord>, Vec<KnowledgeGraphRelationRecord>)> {
        let conn = self.conn.lock().unwrap();
        let mut ent_stmt = conn.prepare("SELECT id, archive_id, article_path, entity_type, name, confidence, created_at FROM knowledge_graph_entities")?;
        let entities = ent_stmt.query_map([], |row| {
            Ok(KnowledgeGraphEntityRecord {
                id: row.get(0)?,
                archive_id: row.get(1)?,
                article_path: row.get(2)?,
                entity_type: row.get(3)?,
                name: row.get(4)?,
                confidence: row.get(5)?,
                created_at: row.get(6)?,
            })
        })?.filter_map(|r| r.ok()).collect();

        let mut rel_stmt = conn.prepare("SELECT id, source_entity, target_entity, relation_type, citation, confidence, created_at FROM knowledge_graph_relations")?;
        let relations = rel_stmt.query_map([], |row| {
            Ok(KnowledgeGraphRelationRecord {
                id: row.get(0)?,
                source_entity: row.get(1)?,
                target_entity: row.get(2)?,
                relation_type: row.get(3)?,
                citation: row.get(4)?,
                confidence: row.get(5)?,
                created_at: row.get(6)?,
            })
        })?.filter_map(|r| r.ok()).collect();

        Ok((entities, relations))
    }

    // --- EXT-004: Personal Knowledge Workspace ---
    pub fn get_workspace_items(&self) -> Result<Vec<PersonalWorkspaceItemRecord>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, item_type, title, content, tags, source_ref, created_at, updated_at FROM personal_workspace_items ORDER BY updated_at DESC")?;
        let items = stmt.query_map([], |row| {
            Ok(PersonalWorkspaceItemRecord {
                id: row.get(0)?,
                item_type: row.get(1)?,
                title: row.get(2)?,
                content: row.get(3)?,
                tags: row.get(4)?,
                source_ref: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })?.filter_map(|r| r.ok()).collect();
        Ok(items)
    }

    pub fn save_workspace_item(&self, record: &PersonalWorkspaceItemRecord) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO personal_workspace_items (id, item_type, title, content, tags, source_ref, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
             ON CONFLICT(id) DO UPDATE SET
             title=excluded.title, content=excluded.content, tags=excluded.tags, updated_at=excluded.updated_at",
            params![record.id, record.item_type, record.title, record.content, record.tags, record.source_ref, record.created_at, record.updated_at],
        )?;
        Ok(())
    }

    pub fn delete_workspace_item(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM personal_workspace_items WHERE id = ?1", params![id])?;
        Ok(())
    }

    // --- EXT-005: Exportable Research Dossiers ---
    pub fn get_research_dossiers(&self) -> Result<Vec<ResearchDossierRecord>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, title, topic, content, citations, created_at FROM research_dossiers ORDER BY created_at DESC")?;
        let dossiers = stmt.query_map([], |row| {
            Ok(ResearchDossierRecord {
                id: row.get(0)?,
                title: row.get(1)?,
                topic: row.get(2)?,
                content: row.get(3)?,
                citations: row.get(4)?,
                created_at: row.get(5)?,
            })
        })?.filter_map(|r| r.ok()).collect();
        Ok(dossiers)
    }

    pub fn save_research_dossier(&self, record: &ResearchDossierRecord) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO research_dossiers (id, title, topic, content, citations, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)
             ON CONFLICT(id) DO UPDATE SET
             title=excluded.title, topic=excluded.topic, content=excluded.content, citations=excluded.citations",
            params![record.id, record.title, record.topic, record.content, record.citations, record.created_at],
        )?;
        Ok(())
    }

    // --- EXT-006: Offline Models Manager ---
    pub fn get_offline_models(&self) -> Result<Vec<OfflineModelRecord>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, name, model_type, size_bytes, license, languages, status, download_url, hardware_reqs, updated_at FROM offline_models")?;
        let models = stmt.query_map([], |row| {
            Ok(OfflineModelRecord {
                id: row.get(0)?,
                name: row.get(1)?,
                model_type: row.get(2)?,
                size_bytes: row.get(3)?,
                license: row.get(4)?,
                languages: row.get(5)?,
                status: row.get(6)?,
                download_url: row.get(7)?,
                hardware_reqs: row.get(8)?,
                updated_at: row.get(9)?,
            })
        })?.filter_map(|r| r.ok()).collect();
        Ok(models)
    }

    pub fn update_offline_model_status(&self, id: &str, status: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE offline_models SET status = ?2, updated_at = ?3 WHERE id = ?1",
            params![id, status, chrono::Utc::now().to_rfc3339()],
        )?;
        Ok(())
    }

}
