//! Unified Offline Library combining Personal Files (`MyFilesIndex`),
//! indexed ZIM FTS articles (`Database`), and live installed ZIM archives (`LibraryManager` + `ZimReader`).

use crate::db::Database;
use crate::knowledge_store::library_manager::LibraryManager;
use crate::knowledge_store::zim_reader::ZimReader;
use crate::survival::my_files::MyFilesIndex;
use crate::survival::passages::split_passages;
use regex::Regex;
use serde::Serialize;
use std::collections::{HashMap, HashSet};
use std::path::Path;
use std::sync::{Arc, OnceLock};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LibrarySearchHit {
    /// Stable ID usable in `read_article` / `show_article` / `OfflineSourceDrawer`
    pub id: String,
    pub title: String,
    pub source_label: String,
    pub source_key: String,
    pub url: String,
    pub snippet: String,
    pub authority: i32,
    pub score: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryPassageView {
    pub id: String,
    pub ordinal: usize,
    pub heading: String,
    pub text: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryDocumentView {
    pub id: String,
    pub title: String,
    pub source_label: String,
    pub url: String,
    pub highlight_passage_id: Option<String>,
    pub highlight_text: Option<String>,
    pub text: String,
    pub passages: Vec<LibraryPassageView>,
}

#[derive(Clone)]
pub struct UnifiedLibrary {
    pub db: Database,
    pub my_files: MyFilesIndex,
    pub library_manager: Arc<LibraryManager>,
}

impl UnifiedLibrary {
    pub fn new(db: Database, my_files: MyFilesIndex, library_manager: Arc<LibraryManager>) -> Self {
        Self {
            db,
            my_files,
            library_manager,
        }
    }

    /// Search across:
    /// 1. User's personal files (`survival_files.sqlite` FTS5) — highest authority boost
    /// 2. Indexed ZIM / local knowledge FTS (`knowledge_articles_fts`)
    /// 3. Live `.zim` files inside `data/zim/` (prefix + keyword search + instant passage extraction)
    pub async fn search(&self, query: &str, limit: usize) -> Vec<LibrarySearchHit> {
        let mut out: Vec<LibrarySearchHit> = Vec::new();
        let mut seen_urls: HashSet<String> = HashSet::new();
        let per_source = limit.max(6);

        // 1. Personal Files
        if let Ok(file_hits) = self.my_files.search(query, per_source) {
            for h in file_hits {
                if seen_urls.insert(h.passage_id.clone()) {
                    out.push(LibrarySearchHit {
                        id: h.passage_id.clone(),
                        title: if h.heading.is_empty() {
                            h.title.clone()
                        } else {
                            format!("{} — {}", h.title, h.heading)
                        },
                        source_label: format!("Your File: {}", h.name),
                        source_key: "personal".to_string(),
                        url: h.passage_id,
                        snippet: h.snippet,
                        authority: 4,
                        score: h.score + 5.0,
                    });
                }
            }
        }

        // 2. Indexed SQLite FTS (local packs / pre-indexed ZIMs)
        let db_hits = self
            .db
            .search_global_fts(query, None, per_source)
            .unwrap_or_default();
        for hit in db_hits {
            let source_url = format!("zim://{}/{}", hit.archive_id, hit.article_path);
            if seen_urls.insert(source_url.clone()) {
                out.push(LibrarySearchHit {
                    id: source_url.clone(),
                    title: hit.title,
                    source_label: if hit.archive_title.is_empty() {
                        format!("Offline Archive ({})", hit.archive_id)
                    } else {
                        hit.archive_title
                    },
                    source_key: hit.archive_id,
                    url: source_url,
                    snippet: strip_html_to_text(&hit.snippet),
                    authority: 3,
                    score: hit.score + 2.0,
                });
            }
        }

        // 3. Live ZIM scan across installed `.zim` files so ZIMs work out-of-the-box without pre-indexing
        let mut zim_queries = vec![query.trim().to_string()];
        for tok in query
            .split(|c: char| !c.is_alphanumeric())
            .filter(|t| t.chars().count() >= 3)
            .take(3)
        {
            if !zim_queries.iter().any(|q| q.eq_ignore_ascii_case(tok)) {
                zim_queries.push(tok.to_string());
            }
        }

        let archives = self.library_manager.list_archives().await;
        for archive in archives {
            let zim_path = Path::new(&archive.file_path);
            let archive_title = if archive.title.is_empty() {
                archive.id.clone()
            } else {
                archive.title.clone()
            };

            let mut matched_paths: HashSet<String> = HashSet::new();
            for zq in &zim_queries {
                if let Ok(entries) = ZimReader::search_articles(zim_path, zq, 4) {
                    for entry in entries {
                        let url = format!("zim://{}/{}", archive.id, entry.url);
                        if seen_urls.contains(&url) || !matched_paths.insert(entry.url.clone()) {
                            continue;
                        }
                        if out.len() >= limit * 2 {
                            break;
                        }
                        let snippet = match ZimReader::read_article(zim_path, &entry.url) {
                            Ok(article) => {
                                let clean = if !article.text.trim().is_empty() {
                                    article.text
                                } else {
                                    strip_html_to_text(&article.html)
                                };
                                extract_best_snippet(&clean, query)
                            }
                            Err(_) => entry.title.clone(),
                        };
                        seen_urls.insert(url.clone());
                        out.push(LibrarySearchHit {
                            id: url.clone(),
                            title: entry.title,
                            source_label: archive_title.clone(),
                            source_key: archive.id.clone(),
                            url,
                            snippet,
                            authority: 2,
                            score: 1.5,
                        });
                    }
                }
            }
        }

        out.sort_by(|a, b| {
            b.authority
                .cmp(&a.authority)
                .then_with(|| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal))
        });
        out.truncate(limit);
        out
    }

    /// Read full clean text for a passage or document ID (`myfile://...` or `zim://archive_id/path`).
    pub async fn read_passage_context(&self, id: &str) -> Option<(String, String, String)> {
        if id.starts_with("myfile://") || id.starts_with("doc_") {
            if let Ok(Some(doc)) = self.my_files.get_document(id) {
                if let Some(p) = doc.passages.iter().find(|p| p.passage_id == id) {
                    return Some((doc.title, format!("Your File: {}", doc.name), p.text.clone()));
                }
                let excerpt: String = doc.text.chars().take(4500).collect();
                return Some((doc.title, format!("Your File: {}", doc.name), excerpt));
            }
            return None;
        }

        if let Some(doc) = self.get_document(id).await {
            let excerpt: String = doc.text.chars().take(4500).collect();
            return Some((doc.title, doc.source_label, excerpt));
        }
        None
    }

    /// Retrieve the full structured document (with chunked passages) for the inline source drawer.
    pub async fn get_document(&self, raw_id: &str) -> Option<LibraryDocumentView> {
        let id = raw_id.trim();
        if id.starts_with("myfile://") || id.starts_with("doc_") {
            if let Ok(Some(doc)) = self.my_files.get_document(id) {
                let highlight_text = doc
                    .passages
                    .iter()
                    .find(|p| p.passage_id == id)
                    .map(|p| p.text.clone());
                let passages = doc
                    .passages
                    .into_iter()
                    .map(|p| LibraryPassageView {
                        id: p.passage_id,
                        ordinal: p.ordinal.max(0) as usize,
                        heading: p.heading,
                        text: p.text,
                    })
                    .collect();
                return Some(LibraryDocumentView {
                    id: format!("myfile://{}", doc.doc_id),
                    title: doc.title,
                    source_label: format!("Your File: {}", doc.name),
                    url: id.to_string(),
                    highlight_passage_id: Some(id.to_string()),
                    highlight_text,
                    text: doc.text,
                    passages,
                });
            }
            return None;
        }

        // Parse `zim://<archive_id>/<article_path>`
        let trimmed = id.strip_prefix("zim://").unwrap_or(id);
        let (archive_id, article_path) = match trimmed.split_once('/') {
            Some((a, p)) => (a, p),
            None => return None,
        };

        let archives = self.library_manager.list_archives().await;
        if let Some(archive) = archives
            .into_iter()
            .find(|a| a.id == archive_id || a.file_name == archive_id)
        {
            let zim_path = Path::new(&archive.file_path);
            if let Ok(article) = ZimReader::read_article(zim_path, article_path) {
                let clean = if !article.text.trim().is_empty() {
                    article.text
                } else {
                    strip_html_to_text(&article.html)
                };
                let title = if !article.title.trim().is_empty() {
                    article.title
                } else {
                    article_path
                        .split('/')
                        .last()
                        .unwrap_or(article_path)
                        .to_string()
                };
                let source_label = if archive.title.is_empty() {
                    archive.id.clone()
                } else {
                    archive.title
                };
                let passages = split_passages(&clean, 1500, 3000)
                    .into_iter()
                    .enumerate()
                    .map(|(i, c)| LibraryPassageView {
                        id: format!("zim://{archive_id}/{article_path}#p{i}"),
                        ordinal: i,
                        heading: c.heading,
                        text: c.text,
                    })
                    .collect();
                return Some(LibraryDocumentView {
                    id: format!("zim://{archive_id}/{article_path}"),
                    title,
                    source_label,
                    url: format!("zim://{archive_id}/{article_path}"),
                    highlight_passage_id: None,
                    highlight_text: None,
                    text: clean,
                    passages,
                });
            }
        }

        None
    }
}

/// Filter/verify candidate sources so only retrieved passages actually referenced (or read) are emitted.
pub fn verify_cited_sources(
    answer: &str,
    retrieved: &HashMap<String, LibrarySearchHit>,
    opened_ids: &[String],
) -> Vec<LibrarySearchHit> {
    let mut result: Vec<LibrarySearchHit> = Vec::new();
    let mut seen: HashSet<String> = HashSet::new();
    let answer_lower = answer.to_lowercase();

    for id in opened_ids {
        if let Some(hit) = retrieved.get(id) {
            if seen.insert(hit.id.clone()) {
                result.push(hit.clone());
            }
        }
    }

    for hit in retrieved.values() {
        if seen.contains(&hit.id) {
            continue;
        }
        let title_lower = hit.title.to_lowercase();
        let short_title = title_lower.split(" — ").next().unwrap_or(&title_lower);
        let id_match = answer_lower.contains(&hit.id.to_lowercase());
        let title_match = short_title.len() >= 4 && answer_lower.contains(short_title);
        if id_match || title_match {
            if seen.insert(hit.id.clone()) {
                result.push(hit.clone());
            }
        }
    }

    if result.is_empty() && !retrieved.is_empty() {
        let mut all: Vec<LibrarySearchHit> = retrieved.values().cloned().collect();
        all.sort_by(|a, b| {
            b.authority
                .cmp(&a.authority)
                .then_with(|| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal))
        });
        result = all.into_iter().take(5).collect();
    }

    result
}

pub fn strip_html_to_text(html: &str) -> String {
    let md = html2md::parse_html(html);
    if !md.trim().is_empty() {
        return md.trim().to_string();
    }
    static TAG_RE: OnceLock<Regex> = OnceLock::new();
    let re = TAG_RE.get_or_init(|| Regex::new(r"<[^>]+>").unwrap());
    re.replace_all(html, " ")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

fn extract_best_snippet(text: &str, query: &str) -> String {
    let lower = text.to_lowercase();
    let first_match = query
        .split_whitespace()
        .filter(|w| w.chars().count() >= 3)
        .find_map(|w| lower.find(&w.to_lowercase()));

    if let Some(pos) = first_match {
        let start = text[..pos]
            .char_indices()
            .rev()
            .nth(80)
            .map(|(i, _)| i)
            .unwrap_or(0);
        let excerpt: String = text[start..].chars().take(320).collect();
        if start > 0 {
            format!("...{}", excerpt.trim())
        } else {
            excerpt.trim().to_string()
        }
    } else {
        text.chars().take(320).collect::<String>().trim().to_string()
    }
}
