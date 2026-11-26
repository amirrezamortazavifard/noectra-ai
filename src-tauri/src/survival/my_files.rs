//! Personal document folder indexing (`survival_files.sqlite`) with FTS5 and passage splitting.

use crate::survival::passages::split_passages;
use rusqlite::{params, Connection};
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::UNIX_EPOCH;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PersonalFileInfo {
    pub id: String,
    pub name: String,
    pub title: String,
    pub size_bytes: u64,
    pub modified_ts: i64,
    pub passage_count: usize,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PersonalSearchHit {
    pub doc_id: String,
    pub passage_id: String,
    pub name: String,
    pub title: String,
    pub heading: String,
    pub snippet: String,
    pub score: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PersonalDocument {
    pub doc_id: String,
    pub name: String,
    pub title: String,
    pub text: String,
    pub passages: Vec<PersonalPassage>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PersonalPassage {
    pub passage_id: String,
    pub ordinal: i64,
    pub heading: String,
    pub text: String,
}

#[derive(Clone)]
pub struct MyFilesIndex {
    db_path: PathBuf,
    default_dir: PathBuf,
    lock: Arc<Mutex<()>>,
}

impl MyFilesIndex {
    pub fn new(data_dir: &Path) -> anyhow::Result<Self> {
        let default_dir = data_dir.join("survival_files");
        fs::create_dir_all(&default_dir)?;
        let db_path = data_dir.join("survival_files.sqlite");
        let idx = Self {
            db_path,
            default_dir,
            lock: Arc::new(Mutex::new(())),
        };
        idx.init_schema()?;
        Ok(idx)
    }

    pub fn default_folder(&self) -> &Path {
        &self.default_dir
    }

    fn conn(&self) -> rusqlite::Result<Connection> {
        let conn = Connection::open(&self.db_path)?;
        conn.execute_batch(
            "PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA foreign_keys = ON;",
        )?;
        Ok(conn)
    }

    fn init_schema(&self) -> anyhow::Result<()> {
        let _g = self.lock.lock().unwrap();
        let conn = self.conn()?;
        conn.execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS files (
                name TEXT PRIMARY KEY,
                doc_id TEXT NOT NULL,
                title TEXT NOT NULL,
                size_bytes INTEGER NOT NULL,
                modified_ts INTEGER NOT NULL,
                content_hash TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS docs (
                doc_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                title TEXT NOT NULL,
                full_text TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS passages (
                passage_id TEXT PRIMARY KEY,
                doc_id TEXT NOT NULL,
                ordinal INTEGER NOT NULL,
                heading TEXT NOT NULL,
                text TEXT NOT NULL,
                FOREIGN KEY (doc_id) REFERENCES docs(doc_id) ON DELETE CASCADE
            );
            CREATE VIRTUAL TABLE IF NOT EXISTS passages_fts USING fts5(
                passage_id UNINDEXED,
                title,
                body,
                tokenize='unicode61 remove_diacritics 2'
            );
            "#,
        )?;
        Ok(())
    }

    pub fn list_files(&self) -> anyhow::Result<Vec<PersonalFileInfo>> {
        let _g = self.lock.lock().unwrap();
        let conn = self.conn()?;
        let mut stmt = conn.prepare(
            "SELECT f.doc_id, f.name, f.title, f.size_bytes, f.modified_ts,
                    (SELECT COUNT(*) FROM passages p WHERE p.doc_id = f.doc_id) as pcount
             FROM files f ORDER BY f.modified_ts DESC, f.name ASC",
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(PersonalFileInfo {
                id: row.get(0)?,
                name: row.get(1)?,
                title: row.get(2)?,
                size_bytes: row.get::<_, i64>(3)?.max(0) as u64,
                modified_ts: row.get(4)?,
                passage_count: row.get::<_, i64>(5)?.max(0) as usize,
            })
        })?;
        Ok(rows.filter_map(Result::ok).collect())
    }

    /// Return `(name, title)` pairs for prompt injection.
    pub fn file_summaries(&self) -> Vec<(String, String)> {
        self.list_files()
            .unwrap_or_default()
            .into_iter()
            .map(|f| (f.name, f.title))
            .collect()
    }

    /// Save an uploaded file to `folder` and index its text into SQLite FTS5 immediately.
    pub fn save_and_index(
        &self,
        folder: Option<&Path>,
        raw_filename: &str,
        raw_bytes: Option<&[u8]>,
        extracted_text: Option<&str>,
    ) -> anyhow::Result<PersonalFileInfo> {
        let dir = folder.unwrap_or(&self.default_dir);
        fs::create_dir_all(dir)?;
        let safe_name = sanitize_filename(raw_filename);
        if safe_name.is_empty() {
            anyhow::bail!("Invalid filename");
        }
        let dest = dir.join(&safe_name);
        if let Some(bytes) = raw_bytes {
            fs::write(&dest, bytes)?;
        } else if let Some(text) = extracted_text {
            fs::write(&dest, text.as_bytes())?;
        } else {
            anyhow::bail!("Either file bytes or extracted text is required");
        }

        let size_bytes = fs::metadata(&dest).map(|m| m.len()).unwrap_or(0);
        let modified_ts = fs::metadata(&dest)
            .and_then(|m| m.modified())
            .ok()
            .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
            .map(|d| d.as_secs() as i64)
            .unwrap_or(0);

        let text = if let Some(ext) = extracted_text.filter(|t| !t.trim().is_empty()) {
            ext.to_string()
        } else {
            extract_text_from_file(&dest, raw_bytes.unwrap_or(&[]))
        };

        self.index_document(&safe_name, size_bytes, modified_ts, &text)
    }

    pub fn sync_folder(&self, folder: Option<&Path>) -> anyhow::Result<usize> {
        let dir = folder.unwrap_or(&self.default_dir);
        if !dir.exists() {
            fs::create_dir_all(dir)?;
            return Ok(0);
        }

        let mut on_disk: HashMap<String, PathBuf> = HashMap::new();
        for entry in fs::read_dir(dir)? {
            let entry = entry?;
            let path = entry.path();
            if !path.is_file() || !is_supported_ext(&path) {
                continue;
            }
            if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                on_disk.insert(name.to_string(), path);
            }
        }

        let existing = {
            let _g = self.lock.lock().unwrap();
            let conn = self.conn()?;
            let mut stmt = conn.prepare("SELECT name, size_bytes, modified_ts FROM files")?;
            let map: HashMap<String, (u64, i64)> = stmt
                .query_map([], |r| {
                    Ok((
                        r.get::<_, String>(0)?,
                        (r.get::<_, i64>(1)?.max(0) as u64, r.get::<_, i64>(2)?),
                    ))
                })?
                .filter_map(Result::ok)
                .collect();
            map
        };

        // Remove deleted files unless they were PDFs uploaded via client extraction and deleted on disk
        for name in existing.keys() {
            if !on_disk.contains_key(name) {
                let _ = self.delete_by_name_internal(name, false, dir);
            }
        }

        let mut indexed = 0usize;
        for (name, path) in &on_disk {
            let meta = match fs::metadata(path) {
                Ok(m) => m,
                Err(_) => continue,
            };
            let size = meta.len();
            let mtime = meta
                .modified()
                .ok()
                .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                .map(|d| d.as_secs() as i64)
                .unwrap_or(0);

            if existing
                .get(name)
                .map_or(false, |&(es, em)| es == size && em == mtime)
            {
                continue;
            }

            // Skip raw binary PDFs without sidecar text on passive folder sync if we can't decode them as UTF-8
            let bytes = match fs::read(path) {
                Ok(b) => b,
                Err(_) => continue,
            };
            let text = extract_text_from_file(path, &bytes);
            if text.trim().is_empty() {
                continue;
            }
            if self.index_document(name, size, mtime, &text).is_ok() {
                indexed += 1;
            }
        }

        Ok(indexed)
    }

    pub fn delete_file(&self, folder: Option<&Path>, name: &str) -> anyhow::Result<bool> {
        let dir = folder.unwrap_or(&self.default_dir);
        self.delete_by_name_internal(name, true, dir)
    }

    fn delete_by_name_internal(
        &self,
        name: &str,
        remove_disk: bool,
        dir: &Path,
    ) -> anyhow::Result<bool> {
        if remove_disk {
            let safe = sanitize_filename(name);
            let p = dir.join(&safe);
            if p.exists() {
                let _ = fs::remove_file(p);
            }
        }
        let _g = self.lock.lock().unwrap();
        let conn = self.conn()?;
        let doc_id: Option<String> = conn
            .query_row(
                "SELECT doc_id FROM files WHERE name = ?1",
                params![name],
                |r| r.get(0),
            )
            .ok();
        if let Some(did) = doc_id {
            conn.execute(
                "DELETE FROM passages_fts WHERE passage_id IN (SELECT passage_id FROM passages WHERE doc_id = ?1)",
                params![did],
            )?;
            conn.execute("DELETE FROM docs WHERE doc_id = ?1", params![did])?;
            conn.execute("DELETE FROM files WHERE name = ?1", params![name])?;
            return Ok(true);
        }
        Ok(false)
    }

    fn index_document(
        &self,
        name: &str,
        size_bytes: u64,
        modified_ts: i64,
        raw_text: &str,
    ) -> anyhow::Result<PersonalFileInfo> {
        let text = normalize_text(raw_text);
        if text.trim().is_empty() {
            anyhow::bail!("No readable text could be extracted from '{name}'");
        }
        let title = derive_title(name, &text);
        let doc_id = format!("doc_{}", short_hash(name));
        let content_hash = short_hash(&text);
        let chunks = split_passages(&text, 1500, 3000);
        let passage_count = chunks.len().max(1);

        let _g = self.lock.lock().unwrap();
        let mut conn = self.conn()?;
        let tx = conn.transaction()?;

        tx.execute(
            "DELETE FROM passages_fts WHERE passage_id IN (SELECT passage_id FROM passages WHERE doc_id = ?1)",
            params![doc_id],
        )?;
        tx.execute("DELETE FROM docs WHERE doc_id = ?1", params![doc_id])?;
        tx.execute(
            "INSERT INTO docs (doc_id, name, title, full_text) VALUES (?1, ?2, ?3, ?4)",
            params![doc_id, name, title, text],
        )?;

        if chunks.is_empty() {
            let pid = format!("myfile://{doc_id}#p0");
            tx.execute(
                "INSERT INTO passages (passage_id, doc_id, ordinal, heading, text) VALUES (?1, ?2, 0, ?3, ?4)",
                params![pid, doc_id, title, text],
            )?;
            tx.execute(
                "INSERT INTO passages_fts (passage_id, title, body) VALUES (?1, ?2, ?3)",
                params![pid, title, text],
            )?;
        } else {
            for (idx, chunk) in chunks.iter().enumerate() {
                let pid = format!("myfile://{doc_id}#p{idx}");
                let fts_title = if chunk.heading.is_empty() {
                    title.clone()
                } else {
                    format!("{title} — {}", chunk.heading)
                };
                tx.execute(
                    "INSERT INTO passages (passage_id, doc_id, ordinal, heading, text) VALUES (?1, ?2, ?3, ?4, ?5)",
                    params![pid, doc_id, idx as i64, chunk.heading, chunk.text],
                )?;
                tx.execute(
                    "INSERT INTO passages_fts (passage_id, title, body) VALUES (?1, ?2, ?3)",
                    params![pid, fts_title, chunk.text],
                )?;
            }
        }

        tx.execute(
            "INSERT OR REPLACE INTO files (name, doc_id, title, size_bytes, modified_ts, content_hash)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                name,
                doc_id,
                title,
                size_bytes as i64,
                modified_ts,
                content_hash
            ],
        )?;

        tx.commit()?;

        Ok(PersonalFileInfo {
            id: doc_id,
            name: name.to_string(),
            title,
            size_bytes,
            modified_ts,
            passage_count,
        })
    }

    pub fn search(&self, query: &str, limit: usize) -> anyhow::Result<Vec<PersonalSearchHit>> {
        let fts_query = build_fts_query(query);
        if fts_query.is_empty() {
            return Ok(Vec::new());
        }
        let _g = self.lock.lock().unwrap();
        let conn = self.conn()?;
        let mut stmt = conn.prepare(
            "SELECT p.doc_id, p.passage_id, d.name, d.title, p.heading,
                    snippet(passages_fts, 2, '...', '...', ' ... ', 32) as snip,
                    bm25(passages_fts, 4.0, 1.0) as rank
             FROM passages_fts
             JOIN passages p ON p.passage_id = passages_fts.passage_id
             JOIN docs d ON d.doc_id = p.doc_id
             WHERE passages_fts MATCH ?1
             ORDER BY rank ASC
             LIMIT ?2",
        )?;
        let rows = stmt.query_map(params![fts_query, limit as i64], |r| {
            Ok(PersonalSearchHit {
                doc_id: r.get(0)?,
                passage_id: r.get(1)?,
                name: r.get(2)?,
                title: r.get(3)?,
                heading: r.get(4)?,
                snippet: r.get(5)?,
                score: -r.get::<_, f64>(6).unwrap_or(0.0),
            })
        })?;
        Ok(rows.filter_map(Result::ok).collect())
    }

    pub fn read_passage(&self, passage_or_doc_id: &str) -> anyhow::Result<Option<PersonalPassage>> {
        let _g = self.lock.lock().unwrap();
        let conn = self.conn()?;
        if let Some(p) = conn
            .query_row(
                "SELECT passage_id, ordinal, heading, text FROM passages WHERE passage_id = ?1",
                params![passage_or_doc_id],
                |r| {
                    Ok(PersonalPassage {
                        passage_id: r.get(0)?,
                        ordinal: r.get(1)?,
                        heading: r.get(2)?,
                        text: r.get(3)?,
                    })
                },
            )
            .ok()
        {
            return Ok(Some(p));
        }

        let clean_doc = passage_or_doc_id
            .trim_start_matches("myfile://")
            .split('#')
            .next()
            .unwrap_or("");
        Ok(conn
            .query_row(
                "SELECT passage_id, ordinal, heading, text FROM passages WHERE doc_id = ?1 ORDER BY ordinal ASC LIMIT 1",
                params![clean_doc],
                |r| {
                    Ok(PersonalPassage {
                        passage_id: r.get(0)?,
                        ordinal: r.get(1)?,
                        heading: r.get(2)?,
                        text: r.get(3)?,
                    })
                },
            )
            .ok())
    }

    pub fn get_document(&self, id: &str) -> anyhow::Result<Option<PersonalDocument>> {
        let doc_id = id.trim_start_matches("myfile://").split('#').next().unwrap_or("");
        let _g = self.lock.lock().unwrap();
        let conn = self.conn()?;
        let row = conn
            .query_row(
                "SELECT doc_id, name, title, full_text FROM docs WHERE doc_id = ?1 OR name = ?2",
                params![doc_id, id],
                |r| {
                    Ok((
                        r.get::<_, String>(0)?,
                        r.get::<_, String>(1)?,
                        r.get::<_, String>(2)?,
                        r.get::<_, String>(3)?,
                    ))
                },
            )
            .ok();

        let Some((did, name, title, full_text)) = row else {
            return Ok(None);
        };

        let mut stmt = conn.prepare(
            "SELECT passage_id, ordinal, heading, text FROM passages WHERE doc_id = ?1 ORDER BY ordinal ASC",
        )?;
        let passages = stmt
            .query_map(params![did], |r| {
                Ok(PersonalPassage {
                    passage_id: r.get(0)?,
                    ordinal: r.get(1)?,
                    heading: r.get(2)?,
                    text: r.get(3)?,
                })
            })?
            .filter_map(Result::ok)
            .collect();

        Ok(Some(PersonalDocument {
            doc_id: did,
            name,
            title,
            text: full_text,
            passages,
        }))
    }
}

fn sanitize_filename(name: &str) -> String {
    Path::new(name)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .chars()
        .filter(|&c| !['\\', '/', ':', '*', '?', '"', '<', '>', '|', '\0'].contains(&c))
        .collect::<String>()
        .trim()
        .to_string()
}

fn is_supported_ext(path: &Path) -> bool {
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();
    matches!(
        ext.as_str(),
        "txt" | "md" | "markdown" | "csv" | "tsv" | "html" | "htm" | "json" | "log" | "rst"
    )
}

fn extract_text_from_file(path: &Path, bytes: &[u8]) -> String {
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();
    let raw = String::from_utf8_lossy(bytes);
    if matches!(ext.as_str(), "html" | "htm") {
        html2md::parse_html(&raw)
    } else if ext == "json" {
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(&raw) {
            serde_json::to_string_pretty(&v).unwrap_or_else(|_| raw.into_owned())
        } else {
            raw.into_owned()
        }
    } else {
        raw.into_owned()
    }
}

fn normalize_text(raw: &str) -> String {
    raw.replace("\r\n", "\n")
        .replace('\r', "\n")
        .trim()
        .to_string()
}

fn derive_title(filename: &str, text: &str) -> String {
    for line in text.lines().take(10) {
        let t = line.trim();
        if let Some(rest) = t.strip_prefix("# ") {
            let cleaned = rest.trim();
            if !cleaned.is_empty() && cleaned.len() <= 120 {
                return cleaned.to_string();
            }
        }
    }
    Path::new(filename)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or(filename)
        .replace(['_', '-'], " ")
        .trim()
        .to_string()
}

fn short_hash(s: &str) -> String {
    let mut h = Sha256::new();
    h.update(s.as_bytes());
    let hex = format!("{:x}", h.finalize());
    hex.chars().take(12).collect()
}

pub fn build_fts_query(query: &str) -> String {
    let tokens: Vec<String> = query
        .split(|c: char| !c.is_alphanumeric() && c != '_')
        .map(|t| t.trim())
        .filter(|t| t.chars().count() >= 2)
        .map(|t| format!("\"{}\"", t.replace('"', "")))
        .collect();
    if tokens.is_empty() {
        let single: Vec<String> = query
            .split_whitespace()
            .filter(|t| !t.is_empty())
            .map(|t| format!("\"{}\"", t.replace('"', "")))
            .collect();
        return single.join(" OR ");
    }
    tokens.join(" OR ")
}
