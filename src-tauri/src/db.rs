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
             CREATE INDEX IF NOT EXISTS idx_discover_feedback_itemId ON discover_user_feedback (itemId);",
        )?;
        Ok(Self {
            conn: Arc::new(Mutex::new(conn)),
        })
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
}
