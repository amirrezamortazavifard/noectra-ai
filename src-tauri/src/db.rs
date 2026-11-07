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
             );",
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
}
