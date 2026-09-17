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
             );",
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
}
