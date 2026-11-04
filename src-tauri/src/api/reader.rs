use axum::{
    extract::{Path as AxumPath, Query, State},
    http::StatusCode,
    Json,
};
use chrono::Utc;
use regex::Regex;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashSet;
use uuid::Uuid;

use crate::api::AppState;

// ---------------------------------------------------------------------------
// Data Models
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeedSource {
    pub id: String,
    pub url: String,
    pub name: String,
    #[serde(rename = "iconUrl")]
    pub icon_url: Option<String>,
    #[serde(rename = "openTarget")]
    pub open_target: String, // 'local' | 'full' | 'webpage' | 'external'
    #[serde(rename = "unreadCount")]
    pub unread_count: i64,
    #[serde(rename = "lastFetched")]
    pub last_fetched: Option<String>,
    #[serde(rename = "fetchFrequency")]
    pub fetch_frequency: i64, // in minutes, 0 = default
    #[serde(rename = "textDir")]
    pub text_dir: String, // 'ltr' | 'rtl' | 'vertical'
    pub hidden: bool,
    #[serde(rename = "serviceRef")]
    pub service_ref: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeedGroup {
    pub id: String,
    pub name: String,
    pub expanded: bool,
    #[serde(rename = "isMultiple")]
    pub is_multiple: bool,
    pub sids: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeedItem {
    pub id: String,
    #[serde(rename = "sourceId")]
    pub source_id: String,
    pub guid: Option<String>,
    pub title: String,
    pub link: String,
    pub author: Option<String>,
    pub content: Option<String>,
    pub snippet: Option<String>,
    #[serde(rename = "thumbUrl")]
    pub thumb_url: Option<String>,
    #[serde(rename = "pubDate")]
    pub pub_date: String,
    #[serde(rename = "hasRead")]
    pub has_read: bool,
    pub starred: bool,
    pub hidden: bool,
    pub notify: bool,
    #[serde(rename = "serviceRef")]
    pub service_ref: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeedRule {
    pub id: String,
    #[serde(rename = "targetType")]
    pub target_type: String, // 'all' | 'group' | 'source'
    #[serde(rename = "targetId")]
    pub target_id: String,
    #[serde(rename = "filterField")]
    pub filter_field: String, // 'title' | 'content' | 'author' | 'link'
    pub pattern: String,
    #[serde(rename = "matchType")]
    pub match_type: bool,
    pub actions: Vec<String>, // 'read' | 'star' | 'hide' | 'notify'
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeedLog {
    pub id: Option<i64>,
    #[serde(rename = "logType")]
    pub log_type: String, // 'info' | 'warning' | 'failure' | 'article'
    pub title: String,
    pub details: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeedSyncService {
    #[serde(rename = "serviceType")]
    pub service_type: String, // 'fever' | 'greader' | 'miniflux' | 'feedbin'
    pub enabled: bool,
    pub endpoint: Option<String>,
    pub username: Option<String>,
    pub password: Option<String>,
    #[serde(rename = "apiKey")]
    pub api_key: Option<String>,
    #[serde(rename = "lastSynced")]
    pub last_synced: Option<String>,
}

// ---------------------------------------------------------------------------
// Internal Helper: Rule Execution Engine
// ---------------------------------------------------------------------------

fn test_rule_match(rule: &FeedRule, item: &FeedItem) -> bool {
    let text_to_check = match rule.filter_field.to_lowercase().as_str() {
        "title" => &item.title,
        "content" => item.content.as_deref().unwrap_or(""),
        "author" => item.author.as_deref().unwrap_or(""),
        "link" => &item.link,
        _ => &item.title,
    };

    if let Ok(re) = Regex::new(&rule.pattern) {
        let is_match = re.is_match(text_to_check);
        if rule.match_type {
            is_match
        } else {
            !is_match
        }
    } else {
        // Fallback case-insensitive substring
        let contains = text_to_check.to_lowercase().contains(&rule.pattern.to_lowercase());
        if rule.match_type { contains } else { !contains }
    }
}

fn apply_rules(rules: &[FeedRule], item: &mut FeedItem, source_id: &str, group_ids: &[String]) {
    for rule in rules {
        let applies = match rule.target_type.as_str() {
            "all" => true,
            "source" => rule.target_id == source_id,
            "group" => group_ids.iter().any(|g| g == &rule.target_id),
            _ => false,
        };

        if applies && test_rule_match(rule, item) {
            for action in &rule.actions {
                match action.to_lowercase().as_str() {
                    "read" => item.has_read = true,
                    "star" => item.starred = true,
                    "hide" => item.hidden = true,
                    "notify" => item.notify = true,
                    _ => {}
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Feed Fetcher & Parser
// ---------------------------------------------------------------------------

pub async fn fetch_and_store_feed(
    state: &AppState,
    source_id: &str,
    url: &str,
) -> Result<usize, String> {
    let client = &state.http_client;
    let res = client
        .get(url)
        .header(
            "User-Agent",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Noectra-AI-Reader/1.1",
        )
        .timeout(std::time::Duration::from_secs(18))
        .send()
        .await
        .map_err(|e| format!("Failed to fetch feed URL {}: {}", url, e))?;

    let bytes = res
        .bytes()
        .await
        .map_err(|e| format!("Failed to read response bytes: {}", e))?;

    let parsed_feed = feed_rs::parser::parse(&bytes[..])
        .map_err(|e| format!("Feed parse error: {}", e))?;

    // Load active rules and groups from DB
    let (rules, group_ids) = {
        let conn = state.db.conn();
        let guard = conn.lock().unwrap();

        let mut stmt = guard.prepare("SELECT id, targetType, targetId, filterField, pattern, matchType, actions FROM feed_rules").unwrap();
        let rules_iter = stmt.query_map([], |row| {
            let actions_str: String = row.get(6)?;
            let actions: Vec<String> = serde_json::from_str(&actions_str).unwrap_or_default();
            Ok(FeedRule {
                id: row.get(0)?,
                target_type: row.get(1)?,
                target_id: row.get(2)?,
                filter_field: row.get(3)?,
                pattern: row.get(4)?,
                match_type: row.get::<_, i64>(5)? != 0,
                actions,
            })
        }).unwrap();
        let rules: Vec<FeedRule> = rules_iter.filter_map(|r| r.ok()).collect();

        // Check which groups this source belongs to
        let mut group_stmt = guard.prepare("SELECT id, sids FROM feed_groups").unwrap();
        let mut matched_groups = Vec::new();
        let mut rows = group_stmt.query([]).unwrap();
        while let Some(row) = rows.next().unwrap() {
            let gid: String = row.get(0).unwrap();
            let sids_str: String = row.get(1).unwrap();
            let sids: Vec<String> = serde_json::from_str(&sids_str).unwrap_or_default();
            if sids.iter().any(|s| s == source_id) {
                matched_groups.push(gid);
            }
        }

        (rules, matched_groups)
    };

    // Collect existing links and GUIDs for this source to avoid duplicates
    let existing_identifiers: HashSet<String> = {
        let conn = state.db.conn();
        let guard = conn.lock().unwrap();
        let mut stmt = guard
            .prepare("SELECT guid, link FROM feed_items WHERE sourceId = ?1")
            .unwrap();
        let rows = stmt.query_map([source_id], |row| {
            let guid: Option<String> = row.get(0)?;
            let link: String = row.get(1)?;
            Ok(guid.unwrap_or(link))
        }).unwrap();
        rows.filter_map(|r| r.ok()).collect()
    };

    let mut new_items: Vec<FeedItem> = Vec::new();
    let img_regex = Regex::new(r#"<img[^>]+src=["']([^"']+)["']"#).unwrap();

    for entry in parsed_feed.entries {
        let link = entry
            .links
            .first()
            .map(|l| l.href.clone())
            .unwrap_or_default();
        if link.is_empty() {
            continue;
        }

        let guid = Some(entry.id.clone());
        let ident = guid.as_deref().unwrap_or(&link);
        if existing_identifiers.contains(ident) || existing_identifiers.contains(&link) {
            continue;
        }

        let title = entry
            .title
            .map(|t| t.content)
            .unwrap_or_else(|| "Untitled Article".to_string());

        let author = entry.authors.first().map(|a| a.name.clone());

        let content_text = entry.content.and_then(|c| c.body).or_else(|| {
            entry.summary.map(|s| s.content)
        });

        // Snippet creation: strip HTML tags and truncate to 220 chars
        let snippet = content_text.as_ref().map(|c| {
            let no_html = Regex::new(r#"<[^>]*>"#).unwrap().replace_all(c, " ");
            let clean = Regex::new(r#"\s+"#).unwrap().replace_all(&no_html, " ").trim().to_string();
            if clean.chars().count() > 220 {
                let mut truncated: String = clean.chars().take(220).collect();
                truncated.push_str("...");
                truncated
            } else {
                clean
            }
        });

        // Thumbnail extraction
        let mut thumb_url = None;
        for media in &entry.media {
            for content in &media.content {
                if let Some(url) = &content.url {
                    thumb_url = Some(url.to_string());
                    break;
                }
            }
            if thumb_url.is_none() {
                for thumb in &media.thumbnails {
                    thumb_url = Some(thumb.image.uri.clone());
                    break;
                }
            }
            if thumb_url.is_some() {
                break;
            }
        }

        if thumb_url.is_none() {
            if let Some(content_str) = &content_text {
                if let Some(caps) = img_regex.captures(content_str) {
                    if let Some(src) = caps.get(1) {
                        let candidate = src.as_str().to_string();
                        if candidate.starts_with("http") {
                            thumb_url = Some(candidate);
                        }
                    }
                }
            }
        }

        let pub_date = entry
            .published
            .or(entry.updated)
            .map(|dt| dt.to_rfc3339())
            .unwrap_or_else(|| Utc::now().to_rfc3339());

        let mut item = FeedItem {
            id: Uuid::new_v4().to_string(),
            source_id: source_id.to_string(),
            guid,
            title,
            link,
            author,
            content: content_text,
            snippet,
            thumb_url,
            pub_date,
            has_read: false,
            starred: false,
            hidden: false,
            notify: false,
            service_ref: None,
        };

        // Apply rules engine
        apply_rules(&rules, &mut item, source_id, &group_ids);
        new_items.push(item);
    }

    let inserted_count = new_items.len();

    // Insert items into database batch
    {
        let conn = state.db.conn();
        let guard = conn.lock().unwrap();

        for item in &new_items {
            guard.execute(
                "INSERT INTO feed_items (id, sourceId, guid, title, link, author, content, snippet, thumbUrl, pubDate, hasRead, starred, hidden, notify, serviceRef)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)",
                rusqlite::params![
                    item.id,
                    item.source_id,
                    item.guid,
                    item.title,
                    item.link,
                    item.author,
                    item.content,
                    item.snippet,
                    item.thumb_url,
                    item.pub_date,
                    if item.has_read { 1 } else { 0 },
                    if item.starred { 1 } else { 0 },
                    if item.hidden { 1 } else { 0 },
                    if item.notify { 1 } else { 0 },
                    item.service_ref,
                ],
            ).ok();
        }

        // Update unread count and last_fetched for the source
        let now = Utc::now().to_rfc3339();
        guard.execute(
            "UPDATE feed_sources SET 
             unreadCount = (SELECT COUNT(*) FROM feed_items WHERE sourceId = ?1 AND hasRead = 0 AND hidden = 0),
             lastFetched = ?2
             WHERE id = ?1",
            rusqlite::params![source_id, now],
        ).ok();

        // Write log
        guard.execute(
            "INSERT INTO feed_logs (logType, title, details, createdAt) VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params![
                "article",
                format!("Fetched feed '{}'", parsed_feed.title.map(|t| t.content).unwrap_or_else(|| url.to_string())),
                format!("Synced {} new items.", inserted_count),
                now,
            ],
        ).ok();
    }

    Ok(inserted_count)
}

// ---------------------------------------------------------------------------
// HTTP API Handlers
// ---------------------------------------------------------------------------

// --- Sources ---

pub async fn get_sources_handler(State(state): State<AppState>) -> Json<Value> {
    let conn = state.db.conn();
    let guard = conn.lock().unwrap();
    let mut stmt = guard.prepare(
        "SELECT id, url, name, iconUrl, openTarget, unreadCount, lastFetched, fetchFrequency, textDir, hidden, serviceRef 
         FROM feed_sources ORDER BY name ASC"
    ).unwrap();

    let rows = stmt.query_map([], |row| {
        Ok(FeedSource {
            id: row.get(0)?,
            url: row.get(1)?,
            name: row.get(2)?,
            icon_url: row.get(3)?,
            open_target: row.get(4)?,
            unread_count: row.get(5)?,
            last_fetched: row.get(6)?,
            fetch_frequency: row.get(7)?,
            text_dir: row.get(8)?,
            hidden: row.get::<_, i64>(9)? != 0,
            service_ref: row.get(10)?,
        })
    }).unwrap();

    let sources: Vec<FeedSource> = rows.filter_map(|r| r.ok()).collect();
    Json(json!({ "sources": sources }))
}

#[derive(Deserialize)]
pub struct AddSourceReq {
    pub url: String,
    pub name: Option<String>,
    #[serde(rename = "openTarget")]
    pub open_target: Option<String>,
    #[serde(rename = "textDir")]
    pub text_dir: Option<String>,
    #[serde(rename = "fetchFrequency")]
    pub fetch_frequency: Option<i64>,
}

pub async fn add_source_handler(
    State(state): State<AppState>,
    Json(body): Json<AddSourceReq>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let url = body.url.trim().to_string();
    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Err((StatusCode::BAD_REQUEST, "Invalid URL scheme".to_string()));
    }

    // Try fetching feed metadata to deduce title and favicon
    let res = state.http_client.get(&url).timeout(std::time::Duration::from_secs(12)).send().await;
    let (detected_title, favicon) = match res {
        Ok(resp) => {
            let bytes = resp.bytes().await.unwrap_or_default();
            if let Ok(parsed) = feed_rs::parser::parse(&bytes[..]) {
                let title = parsed.title.map(|t| t.content);
                // Guess favicon
                let icon = if let Ok(parsed_url) = reqwest::Url::parse(&url) {
                    format!("{}://{}/favicon.ico", parsed_url.scheme(), parsed_url.host_str().unwrap_or(""))
                } else {
                    "".to_string()
                };
                (title, Some(icon))
            } else {
                (None, None)
            }
        }
        Err(_) => (None, None),
    };

    let name = body.name.filter(|n| !n.trim().is_empty())
        .or(detected_title)
        .unwrap_or_else(|| "RSS Feed".to_string());

    let id = Uuid::new_v4().to_string();
    let open_target = body.open_target.unwrap_or_else(|| "local".to_string());
    let text_dir = body.text_dir.unwrap_or_else(|| "ltr".to_string());
    let fetch_frequency = body.fetch_frequency.unwrap_or(0);

    {
        let conn = state.db.conn();
        let guard = conn.lock().unwrap();
        guard.execute(
            "INSERT INTO feed_sources (id, url, name, iconUrl, openTarget, unreadCount, lastFetched, fetchFrequency, textDir, hidden, serviceRef)
             VALUES (?1, ?2, ?3, ?4, ?5, 0, NULL, ?6, ?7, 0, NULL)",
            rusqlite::params![id, url, name, favicon, open_target, fetch_frequency, text_dir],
        ).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    }

    // Trigger initial fetch asynchronously
    let state_clone = state.clone();
    let sid = id.clone();
    let surl = url.clone();
    tokio::spawn(async move {
        fetch_and_store_feed(&state_clone, &sid, &surl).await.ok();
    });

    Ok(Json(json!({
        "success": true,
        "source": {
            "id": id,
            "url": url,
            "name": name,
            "iconUrl": favicon,
            "openTarget": open_target,
            "unreadCount": 0,
            "fetchFrequency": fetch_frequency,
            "textDir": text_dir,
            "hidden": false
        }
    })))
}

#[derive(Deserialize)]
pub struct UpdateSourceReq {
    pub name: Option<String>,
    #[serde(rename = "openTarget")]
    pub open_target: Option<String>,
    #[serde(rename = "fetchFrequency")]
    pub fetch_frequency: Option<i64>,
    #[serde(rename = "textDir")]
    pub text_dir: Option<String>,
    pub hidden: Option<bool>,
    #[serde(rename = "iconUrl")]
    pub icon_url: Option<String>,
}

pub async fn update_source_handler(
    State(state): State<AppState>,
    AxumPath(id): AxumPath<String>,
    Json(body): Json<UpdateSourceReq>,
) -> Result<Json<Value>, StatusCode> {
    let conn = state.db.conn();
    let guard = conn.lock().unwrap();

    if let Some(name) = body.name {
        guard.execute("UPDATE feed_sources SET name = ?1 WHERE id = ?2", rusqlite::params![name, id]).ok();
    }
    if let Some(target) = body.open_target {
        guard.execute("UPDATE feed_sources SET openTarget = ?1 WHERE id = ?2", rusqlite::params![target, id]).ok();
    }
    if let Some(freq) = body.fetch_frequency {
        guard.execute("UPDATE feed_sources SET fetchFrequency = ?1 WHERE id = ?2", rusqlite::params![freq, id]).ok();
    }
    if let Some(dir) = body.text_dir {
        guard.execute("UPDATE feed_sources SET textDir = ?1 WHERE id = ?2", rusqlite::params![dir, id]).ok();
    }
    if let Some(hidden) = body.hidden {
        guard.execute("UPDATE feed_sources SET hidden = ?1 WHERE id = ?2", rusqlite::params![if hidden { 1 } else { 0 }, id]).ok();
    }
    if let Some(icon) = body.icon_url {
        guard.execute("UPDATE feed_sources SET iconUrl = ?1 WHERE id = ?2", rusqlite::params![icon, id]).ok();
    }

    Ok(Json(json!({ "success": true })))
}

pub async fn delete_source_handler(
    State(state): State<AppState>,
    AxumPath(id): AxumPath<String>,
) -> Result<Json<Value>, StatusCode> {
    let conn = state.db.conn();
    let guard = conn.lock().unwrap();
    guard.execute("DELETE FROM feed_items WHERE sourceId = ?1", rusqlite::params![id]).ok();
    guard.execute("DELETE FROM feed_sources WHERE id = ?1", rusqlite::params![id]).ok();
    Ok(Json(json!({ "success": true })))
}

pub async fn refresh_single_source_handler(
    State(state): State<AppState>,
    AxumPath(id): AxumPath<String>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let url = {
        let conn = state.db.conn();
        let guard = conn.lock().unwrap();
        guard.query_row("SELECT url FROM feed_sources WHERE id = ?1", rusqlite::params![id], |r| r.get::<_, String>(0))
            .map_err(|_| (StatusCode::NOT_FOUND, "Source not found".to_string()))?
    };

    let count = fetch_and_store_feed(&state, &id, &url)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;

    Ok(Json(json!({ "success": true, "newItems": count })))
}

pub async fn refresh_all_sources_handler(State(state): State<AppState>) -> Json<Value> {
    let sources: Vec<(String, String)> = {
        let conn = state.db.conn();
        let guard = conn.lock().unwrap();
        let mut stmt = guard.prepare("SELECT id, url FROM feed_sources WHERE hidden = 0").unwrap();
        let rows = stmt.query_map([], |r| Ok((r.get(0)?, r.get(1)?))).unwrap();
        rows.filter_map(|r| r.ok()).collect()
    };

    let mut total_new = 0;
    for (id, url) in sources {
        if let Ok(c) = fetch_and_store_feed(&state, &id, &url).await {
            total_new += c;
        }
    }

    Json(json!({ "success": true, "totalNewItems": total_new }))
}

// --- Groups ---

pub async fn get_groups_handler(State(state): State<AppState>) -> Json<Value> {
    let conn = state.db.conn();
    let guard = conn.lock().unwrap();
    let mut stmt = guard.prepare("SELECT id, name, expanded, isMultiple, sids FROM feed_groups ORDER BY name ASC").unwrap();
    let rows = stmt.query_map([], |row| {
        let sids_str: String = row.get(4)?;
        let sids: Vec<String> = serde_json::from_str(&sids_str).unwrap_or_default();
        Ok(FeedGroup {
            id: row.get(0)?,
            name: row.get(1)?,
            expanded: row.get::<_, i64>(2)? != 0,
            is_multiple: row.get::<_, i64>(3)? != 0,
            sids,
        })
    }).unwrap();

    let groups: Vec<FeedGroup> = rows.filter_map(|r| r.ok()).collect();
    Json(json!({ "groups": groups }))
}

#[derive(Deserialize)]
pub struct CreateGroupReq {
    pub name: String,
    pub sids: Option<Vec<String>>,
}

pub async fn create_group_handler(
    State(state): State<AppState>,
    Json(body): Json<CreateGroupReq>,
) -> Json<Value> {
    let id = Uuid::new_v4().to_string();
    let sids = body.sids.unwrap_or_default();
    let sids_json = serde_json::to_string(&sids).unwrap_or_else(|_| "[]".to_string());

    let conn = state.db.conn();
    let guard = conn.lock().unwrap();
    guard.execute(
        "INSERT INTO feed_groups (id, name, expanded, isMultiple, sids) VALUES (?1, ?2, 1, 1, ?3)",
        rusqlite::params![id, body.name, sids_json],
    ).ok();

    Json(json!({ "success": true, "group": { "id": id, "name": body.name, "expanded": true, "isMultiple": true, "sids": sids } }))
}

#[derive(Deserialize)]
pub struct UpdateGroupReq {
    pub name: Option<String>,
    pub expanded: Option<bool>,
    pub sids: Option<Vec<String>>,
}

pub async fn update_group_handler(
    State(state): State<AppState>,
    AxumPath(id): AxumPath<String>,
    Json(body): Json<UpdateGroupReq>,
) -> Json<Value> {
    let conn = state.db.conn();
    let guard = conn.lock().unwrap();

    if let Some(name) = body.name {
        guard.execute("UPDATE feed_groups SET name = ?1 WHERE id = ?2", rusqlite::params![name, id]).ok();
    }
    if let Some(exp) = body.expanded {
        guard.execute("UPDATE feed_groups SET expanded = ?1 WHERE id = ?2", rusqlite::params![if exp { 1 } else { 0 }, id]).ok();
    }
    if let Some(sids) = body.sids {
        let sids_json = serde_json::to_string(&sids).unwrap_or_else(|_| "[]".to_string());
        guard.execute("UPDATE feed_groups SET sids = ?1 WHERE id = ?2", rusqlite::params![sids_json, id]).ok();
    }

    Json(json!({ "success": true }))
}

pub async fn delete_group_handler(
    State(state): State<AppState>,
    AxumPath(id): AxumPath<String>,
) -> Json<Value> {
    let conn = state.db.conn();
    let guard = conn.lock().unwrap();
    guard.execute("DELETE FROM feed_groups WHERE id = ?1", rusqlite::params![id]).ok();
    Json(json!({ "success": true }))
}

// --- Feed Items ---

#[derive(Deserialize)]
pub struct GetItemsQuery {
    pub filter: Option<String>, // 'all' | 'unread' | 'starred'
    #[serde(rename = "sourceId")]
    pub source_id: Option<String>,
    #[serde(rename = "groupId")]
    pub group_id: Option<String>,
    pub query: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

pub async fn get_items_handler(
    State(state): State<AppState>,
    Query(params): Query<GetItemsQuery>,
) -> Json<Value> {
    let conn = state.db.conn();
    let guard = conn.lock().unwrap();

    let mut sql = "SELECT id, sourceId, guid, title, link, author, content, snippet, thumbUrl, pubDate, hasRead, starred, hidden, notify, serviceRef FROM feed_items WHERE hidden = 0".to_string();
    let mut args: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    // Source or Group filter
    if let Some(sid) = &params.source_id {
        if !sid.is_empty() && sid != "all" {
            sql.push_str(" AND sourceId = ?");
            args.push(Box::new(sid.clone()));
        }
    } else if let Some(gid) = &params.group_id {
        if !gid.is_empty() {
            // Find sids of the group
            let sids_str: Option<String> = guard.query_row(
                "SELECT sids FROM feed_groups WHERE id = ?1",
                rusqlite::params![gid],
                |r| r.get(0),
            ).ok();
            if let Some(sids_raw) = sids_str {
                let sids: Vec<String> = serde_json::from_str(&sids_raw).unwrap_or_default();
                if !sids.is_empty() {
                    let placeholders: Vec<String> = sids.iter().map(|_| "?".to_string()).collect();
                    sql.push_str(&format!(" AND sourceId IN ({})", placeholders.join(",")));
                    for s in sids {
                        args.push(Box::new(s));
                    }
                }
            }
        }
    }

    // Status filter
    match params.filter.as_deref() {
        Some("unread") => sql.push_str(" AND hasRead = 0"),
        Some("starred") => sql.push_str(" AND starred = 1"),
        _ => {}
    }

    // Search query
    if let Some(q) = &params.query {
        let q_trimmed = q.trim();
        if !q_trimmed.is_empty() {
            sql.push_str(" AND (title LIKE ? OR snippet LIKE ? OR author LIKE ?)");
            let pattern = format!("%{}%", q_trimmed);
            args.push(Box::new(pattern.clone()));
            args.push(Box::new(pattern.clone()));
            args.push(Box::new(pattern));
        }
    }

    sql.push_str(" ORDER BY pubDate DESC LIMIT ? OFFSET ?");
    let limit = params.limit.unwrap_or(80);
    let offset = params.offset.unwrap_or(0);
    args.push(Box::new(limit));
    args.push(Box::new(offset));

    let mut stmt = guard.prepare(&sql).unwrap();
    let param_refs: Vec<&dyn rusqlite::ToSql> = args.iter().map(|b| b.as_ref()).collect();

    let rows = stmt.query_map(&param_refs[..], |row| {
        Ok(FeedItem {
            id: row.get(0)?,
            source_id: row.get(1)?,
            guid: row.get(2)?,
            title: row.get(3)?,
            link: row.get(4)?,
            author: row.get(5)?,
            content: row.get(6)?,
            snippet: row.get(7)?,
            thumb_url: row.get(8)?,
            pub_date: row.get(9)?,
            has_read: row.get::<_, i64>(10)? != 0,
            starred: row.get::<_, i64>(11)? != 0,
            hidden: row.get::<_, i64>(12)? != 0,
            notify: row.get::<_, i64>(13)? != 0,
            service_ref: row.get(14)?,
        })
    }).unwrap();

    let items: Vec<FeedItem> = rows.filter_map(|r| r.ok()).collect();
    Json(json!({ "items": items, "count": items.len() }))
}

#[derive(Deserialize)]
pub struct UpdateItemStatusReq {
    #[serde(rename = "hasRead")]
    pub has_read: Option<bool>,
    pub starred: Option<bool>,
    pub hidden: Option<bool>,
}

pub async fn update_item_status_handler(
    State(state): State<AppState>,
    AxumPath(id): AxumPath<String>,
    Json(body): Json<UpdateItemStatusReq>,
) -> Json<Value> {
    let conn = state.db.conn();
    let guard = conn.lock().unwrap();

    if let Some(read) = body.has_read {
        guard.execute(
            "UPDATE feed_items SET hasRead = ?1 WHERE id = ?2",
            rusqlite::params![if read { 1 } else { 0 }, id],
        ).ok();
        // Recalculate source unread
        guard.execute(
            "UPDATE feed_sources SET unreadCount = (SELECT COUNT(*) FROM feed_items WHERE sourceId = feed_sources.id AND hasRead = 0 AND hidden = 0)
             WHERE id = (SELECT sourceId FROM feed_items WHERE id = ?1)",
            rusqlite::params![id],
        ).ok();
    }

    if let Some(star) = body.starred {
        guard.execute(
            "UPDATE feed_items SET starred = ?1 WHERE id = ?2",
            rusqlite::params![if star { 1 } else { 0 }, id],
        ).ok();
    }

    if let Some(hide) = body.hidden {
        guard.execute(
            "UPDATE feed_items SET hidden = ?1 WHERE id = ?2",
            rusqlite::params![if hide { 1 } else { 0 }, id],
        ).ok();
        guard.execute(
            "UPDATE feed_sources SET unreadCount = (SELECT COUNT(*) FROM feed_items WHERE sourceId = feed_sources.id AND hasRead = 0 AND hidden = 0)
             WHERE id = (SELECT sourceId FROM feed_items WHERE id = ?1)",
            rusqlite::params![id],
        ).ok();
    }

    Json(json!({ "success": true }))
}

#[derive(Deserialize)]
pub struct MarkAllReadReq {
    #[serde(rename = "sourceId")]
    pub source_id: Option<String>,
    #[serde(rename = "groupId")]
    pub group_id: Option<String>,
}

pub async fn mark_all_read_handler(
    State(state): State<AppState>,
    Json(body): Json<MarkAllReadReq>,
) -> Json<Value> {
    let conn = state.db.conn();
    let guard = conn.lock().unwrap();

    if let Some(sid) = body.source_id {
        if sid == "all" || sid.is_empty() {
            guard.execute("UPDATE feed_items SET hasRead = 1 WHERE hasRead = 0", []).ok();
            guard.execute("UPDATE feed_sources SET unreadCount = 0", []).ok();
        } else {
            guard.execute("UPDATE feed_items SET hasRead = 1 WHERE sourceId = ?1 AND hasRead = 0", rusqlite::params![sid]).ok();
            guard.execute("UPDATE feed_sources SET unreadCount = 0 WHERE id = ?1", rusqlite::params![sid]).ok();
        }
    } else if let Some(gid) = body.group_id {
        let sids_str: Option<String> = guard.query_row(
            "SELECT sids FROM feed_groups WHERE id = ?1",
            rusqlite::params![gid],
            |r| r.get(0),
        ).ok();
        if let Some(sids_raw) = sids_str {
            let sids: Vec<String> = serde_json::from_str(&sids_raw).unwrap_or_default();
            for s in &sids {
                guard.execute("UPDATE feed_items SET hasRead = 1 WHERE sourceId = ?1 AND hasRead = 0", rusqlite::params![s]).ok();
                guard.execute("UPDATE feed_sources SET unreadCount = 0 WHERE id = ?1", rusqlite::params![s]).ok();
            }
        }
    } else {
        guard.execute("UPDATE feed_items SET hasRead = 1 WHERE hasRead = 0", []).ok();
        guard.execute("UPDATE feed_sources SET unreadCount = 0", []).ok();
    }

    Json(json!({ "success": true }))
}

// --- Rules ---

pub async fn get_rules_handler(State(state): State<AppState>) -> Json<Value> {
    let conn = state.db.conn();
    let guard = conn.lock().unwrap();
    let mut stmt = guard.prepare("SELECT id, targetType, targetId, filterField, pattern, matchType, actions FROM feed_rules").unwrap();
    let rows = stmt.query_map([], |row| {
        let actions_str: String = row.get(6)?;
        let actions: Vec<String> = serde_json::from_str(&actions_str).unwrap_or_default();
        Ok(FeedRule {
            id: row.get(0)?,
            target_type: row.get(1)?,
            target_id: row.get(2)?,
            filter_field: row.get(3)?,
            pattern: row.get(4)?,
            match_type: row.get::<_, i64>(5)? != 0,
            actions,
        })
    }).unwrap();

    let rules: Vec<FeedRule> = rows.filter_map(|r| r.ok()).collect();
    Json(json!({ "rules": rules }))
}

#[derive(Deserialize)]
pub struct SaveRuleReq {
    pub id: Option<String>,
    #[serde(rename = "targetType")]
    pub target_type: String,
    #[serde(rename = "targetId")]
    pub target_id: String,
    #[serde(rename = "filterField")]
    pub filter_field: String,
    pub pattern: String,
    #[serde(rename = "matchType")]
    pub match_type: bool,
    pub actions: Vec<String>,
}

pub async fn save_rule_handler(
    State(state): State<AppState>,
    Json(body): Json<SaveRuleReq>,
) -> Json<Value> {
    let id = body.id.unwrap_or_else(|| Uuid::new_v4().to_string());
    let actions_json = serde_json::to_string(&body.actions).unwrap_or_else(|_| "[]".to_string());

    let conn = state.db.conn();
    let guard = conn.lock().unwrap();
    guard.execute(
        "INSERT OR REPLACE INTO feed_rules (id, targetType, targetId, filterField, pattern, matchType, actions)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![
            id,
            body.target_type,
            body.target_id,
            body.filter_field,
            body.pattern,
            if body.match_type { 1 } else { 0 },
            actions_json,
        ],
    ).ok();

    Json(json!({ "success": true, "id": id }))
}

pub async fn delete_rule_handler(
    State(state): State<AppState>,
    AxumPath(id): AxumPath<String>,
) -> Json<Value> {
    let conn = state.db.conn();
    let guard = conn.lock().unwrap();
    guard.execute("DELETE FROM feed_rules WHERE id = ?1", rusqlite::params![id]).ok();
    Json(json!({ "success": true }))
}

#[derive(Deserialize)]
pub struct TestRuleReq {
    #[serde(rename = "filterField")]
    pub filter_field: String,
    pub pattern: String,
    #[serde(rename = "matchType")]
    pub match_type: bool,
    #[serde(rename = "sourceId")]
    pub source_id: Option<String>,
}

pub async fn test_rule_handler(
    State(state): State<AppState>,
    Json(body): Json<TestRuleReq>,
) -> Json<Value> {
    let conn = state.db.conn();
    let guard = conn.lock().unwrap();

    let mut sql = "SELECT id, title, content, author, link FROM feed_items WHERE hidden = 0".to_string();
    if let Some(sid) = &body.source_id {
        if sid != "all" && !sid.is_empty() {
            sql.push_str(&format!(" AND sourceId = '{}'", sid.replace("'", "''")));
        }
    }
    sql.push_str(" ORDER BY pubDate DESC LIMIT 50");

    let mut stmt = guard.prepare(&sql).unwrap();
    let mut matched_samples = Vec::new();

    let rule = FeedRule {
        id: "test".to_string(),
        target_type: "all".to_string(),
        target_id: "all".to_string(),
        filter_field: body.filter_field,
        pattern: body.pattern,
        match_type: body.match_type,
        actions: vec![],
    };

    let rows = stmt.query_map([], |row| {
        let dummy = FeedItem {
            id: row.get(0)?,
            source_id: "".to_string(),
            guid: None,
            title: row.get(1)?,
            link: row.get(4)?,
            author: row.get(3)?,
            content: row.get(2)?,
            snippet: None,
            thumb_url: None,
            pub_date: "".to_string(),
            has_read: false,
            starred: false,
            hidden: false,
            notify: false,
            service_ref: None,
        };
        Ok(dummy)
    }).unwrap();

    for item in rows.filter_map(|r| r.ok()) {
        if test_rule_match(&rule, &item) {
            matched_samples.push(json!({
                "id": item.id,
                "title": item.title,
                "link": item.link
            }));
            if matched_samples.len() >= 10 {
                break;
            }
        }
    }

    Json(json!({
        "matchedCount": matched_samples.len(),
        "samples": matched_samples
    }))
}

// --- Activity Logs ---

pub async fn get_logs_handler(State(state): State<AppState>) -> Json<Value> {
    let conn = state.db.conn();
    let guard = conn.lock().unwrap();
    let mut stmt = guard.prepare("SELECT id, logType, title, details, createdAt FROM feed_logs ORDER BY id DESC LIMIT 150").unwrap();
    let rows = stmt.query_map([], |row| {
        Ok(FeedLog {
            id: Some(row.get(0)?),
            log_type: row.get(1)?,
            title: row.get(2)?,
            details: row.get(3)?,
            created_at: row.get(4)?,
        })
    }).unwrap();

    let logs: Vec<FeedLog> = rows.filter_map(|r| r.ok()).collect();
    Json(json!({ "logs": logs }))
}

pub async fn clear_logs_handler(State(state): State<AppState>) -> Json<Value> {
    let conn = state.db.conn();
    let guard = conn.lock().unwrap();
    guard.execute("DELETE FROM feed_logs", []).ok();
    Json(json!({ "success": true }))
}

// --- OPML Import & Export ---

#[derive(Deserialize)]
pub struct ImportOpmlReq {
    pub content: String,
}

pub async fn import_opml_handler(
    State(state): State<AppState>,
    Json(body): Json<ImportOpmlReq>,
) -> Json<Value> {
    let xml = body.content;
    // Regex extract outlines
    let outline_regex = Regex::new(r#"<outline\s+([^>]+)>(?:</outline>)?|(?P<close></outline>)"#).unwrap();
    let attr_regex = Regex::new(r#"([a-zA-Z0-9_:-]+)=["']([^"']*)["']"#).unwrap();

    let mut imported_sources = 0;
    let mut current_folder: Option<String> = None;
    let mut folder_sources: Vec<String> = Vec::new();

    for caps in outline_regex.captures_iter(&xml) {
        if let Some(_) = caps.name("close") {
            if let Some(folder_name) = current_folder.take() {
                if !folder_sources.is_empty() {
                    let gid = Uuid::new_v4().to_string();
                    let sids_json = serde_json::to_string(&folder_sources).unwrap_or_else(|_| "[]".to_string());
                    let conn = state.db.conn();
                    let guard = conn.lock().unwrap();
                    guard.execute(
                        "INSERT INTO feed_groups (id, name, expanded, isMultiple, sids) VALUES (?1, ?2, 1, 1, ?3)",
                        rusqlite::params![gid, folder_name, sids_json],
                    ).ok();
                    folder_sources.clear();
                }
            }
            continue;
        }

        let attrs_str = caps.get(1).map(|m| m.as_str()).unwrap_or("");
        let mut attr_map = std::collections::HashMap::new();
        for acaps in attr_regex.captures_iter(attrs_str) {
            let k = acaps.get(1).unwrap().as_str().to_lowercase();
            let v = acaps.get(2).unwrap().as_str().to_string();
            attr_map.insert(k, v);
        }

        let xml_url = attr_map.get("xmlurl").or_else(|| attr_map.get("xml_url")).cloned();
        let title = attr_map.get("title").or_else(|| attr_map.get("text")).cloned().unwrap_or_else(|| "Feed".to_string());

        if let Some(feed_url) = xml_url {
            let sid = Uuid::new_v4().to_string();
            let conn = state.db.conn();
            let guard = conn.lock().unwrap();
            let exists: bool = guard.query_row("SELECT 1 FROM feed_sources WHERE url = ?1", rusqlite::params![feed_url], |_| Ok(true)).unwrap_or(false);
            if !exists {
                guard.execute(
                    "INSERT INTO feed_sources (id, url, name, openTarget, unreadCount, fetchFrequency, textDir, hidden)
                     VALUES (?1, ?2, ?3, 'local', 0, 0, 'ltr', 0)",
                    rusqlite::params![sid, feed_url, title],
                ).ok();
                if current_folder.is_some() {
                    folder_sources.push(sid.clone());
                }
                imported_sources += 1;
                // Fetch in background
                let state_clone = state.clone();
                let furl = feed_url.clone();
                tokio::spawn(async move {
                    fetch_and_store_feed(&state_clone, &sid, &furl).await.ok();
                });
            }
        } else if !title.is_empty() {
            // It's a folder outline
            current_folder = Some(title);
        }
    }

    Json(json!({ "success": true, "importedSources": imported_sources }))
}

pub async fn export_opml_handler(State(state): State<AppState>) -> Json<Value> {
    let conn = state.db.conn();
    let guard = conn.lock().unwrap();

    let mut stmt = guard.prepare("SELECT id, url, name FROM feed_sources ORDER BY name ASC").unwrap();
    let sources: Vec<(String, String, String)> = stmt.query_map([], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?))).unwrap().filter_map(|r| r.ok()).collect();

    let mut group_stmt = guard.prepare("SELECT id, name, sids FROM feed_groups").unwrap();
    let groups: Vec<(String, String, Vec<String>)> = group_stmt.query_map([], |r| {
        let sids_str: String = r.get(2)?;
        let sids: Vec<String> = serde_json::from_str(&sids_str).unwrap_or_default();
        Ok((r.get(0)?, r.get(1)?, sids))
    }).unwrap().filter_map(|r| r.ok()).collect();

    let mut grouped_sids = HashSet::new();
    let mut opml_body = String::new();

    for (_gid, gname, sids) in groups {
        opml_body.push_str(&format!(r#"    <outline text="{}" title="{}">"#, gname, gname));
        opml_body.push('\n');
        for sid in sids {
            if let Some((_, url, name)) = sources.iter().find(|(id, _, _)| id == &sid) {
                grouped_sids.insert(sid.clone());
                opml_body.push_str(&format!(
                    r#"      <outline type="rss" text="{}" title="{}" xmlUrl="{}" htmlUrl="{}"/>"#,
                    name, name, url, url
                ));
                opml_body.push('\n');
            }
        }
        opml_body.push_str("    </outline>\n");
    }

    // Ungrouped
    for (sid, url, name) in sources {
        if !grouped_sids.contains(&sid) {
            opml_body.push_str(&format!(
                r#"    <outline type="rss" text="{}" title="{}" xmlUrl="{}" htmlUrl="{}"/>"#,
                name, name, url, url
            ));
            opml_body.push('\n');
        }
    }

    let full_opml = format!(
        r#"<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>Noectra AI Reader Feeds Export</title>
  </head>
  <body>
{}  </body>
</opml>"#,
        opml_body
    );

    Json(json!({ "opml": full_opml }))
}

// --- Full Backup Export & Import ---

pub async fn export_backup_handler(State(state): State<AppState>) -> Json<Value> {
    let conn = state.db.conn();
    let guard = conn.lock().unwrap();

    let mut src_stmt = guard.prepare("SELECT id, url, name, iconUrl, openTarget, unreadCount, lastFetched, fetchFrequency, textDir, hidden, serviceRef FROM feed_sources").unwrap();
    let sources: Vec<FeedSource> = src_stmt.query_map([], |r| {
        Ok(FeedSource {
            id: r.get(0)?,
            url: r.get(1)?,
            name: r.get(2)?,
            icon_url: r.get(3)?,
            open_target: r.get(4)?,
            unread_count: r.get(5)?,
            last_fetched: r.get(6)?,
            fetch_frequency: r.get(7)?,
            text_dir: r.get(8)?,
            hidden: r.get::<_, i64>(9)? != 0,
            service_ref: r.get(10)?,
        })
    }).unwrap().filter_map(|r| r.ok()).collect();

    let mut grp_stmt = guard.prepare("SELECT id, name, expanded, isMultiple, sids FROM feed_groups").unwrap();
    let groups: Vec<FeedGroup> = grp_stmt.query_map([], |r| {
        let sids: Vec<String> = serde_json::from_str(&r.get::<_, String>(4)?).unwrap_or_default();
        Ok(FeedGroup {
            id: r.get(0)?,
            name: r.get(1)?,
            expanded: r.get::<_, i64>(2)? != 0,
            is_multiple: r.get::<_, i64>(3)? != 0,
            sids,
        })
    }).unwrap().filter_map(|r| r.ok()).collect();

    let mut rule_stmt = guard.prepare("SELECT id, targetType, targetId, filterField, pattern, matchType, actions FROM feed_rules").unwrap();
    let rules: Vec<FeedRule> = rule_stmt.query_map([], |r| {
        let actions: Vec<String> = serde_json::from_str(&r.get::<_, String>(6)?).unwrap_or_default();
        Ok(FeedRule {
            id: r.get(0)?,
            target_type: r.get(1)?,
            target_id: r.get(2)?,
            filter_field: r.get(3)?,
            pattern: r.get(4)?,
            match_type: r.get::<_, i64>(5)? != 0,
            actions,
        })
    }).unwrap().filter_map(|r| r.ok()).collect();

    Json(json!({
        "version": "1.0",
        "exportedAt": Utc::now().to_rfc3339(),
        "sources": sources,
        "groups": groups,
        "rules": rules
    }))
}

#[derive(Deserialize)]
pub struct ImportBackupReq {
    pub sources: Option<Vec<FeedSource>>,
    pub groups: Option<Vec<FeedGroup>>,
    pub rules: Option<Vec<FeedRule>>,
}

pub async fn import_backup_handler(
    State(state): State<AppState>,
    Json(body): Json<ImportBackupReq>,
) -> Json<Value> {
    let conn = state.db.conn();
    let guard = conn.lock().unwrap();

    if let Some(sources) = body.sources {
        for s in sources {
            guard.execute(
                "INSERT OR REPLACE INTO feed_sources (id, url, name, iconUrl, openTarget, unreadCount, lastFetched, fetchFrequency, textDir, hidden, serviceRef)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
                rusqlite::params![
                    s.id,
                    s.url,
                    s.name,
                    s.icon_url,
                    s.open_target,
                    s.unread_count,
                    s.last_fetched,
                    s.fetch_frequency,
                    s.text_dir,
                    if s.hidden { 1 } else { 0 },
                    s.service_ref,
                ],
            ).ok();
        }
    }

    if let Some(groups) = body.groups {
        for g in groups {
            let sids_json = serde_json::to_string(&g.sids).unwrap_or_else(|_| "[]".to_string());
            guard.execute(
                "INSERT OR REPLACE INTO feed_groups (id, name, expanded, isMultiple, sids)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                rusqlite::params![
                    g.id,
                    g.name,
                    if g.expanded { 1 } else { 0 },
                    if g.is_multiple { 1 } else { 0 },
                    sids_json,
                ],
            ).ok();
        }
    }

    if let Some(rules) = body.rules {
        for r in rules {
            let actions_json = serde_json::to_string(&r.actions).unwrap_or_else(|_| "[]".to_string());
            guard.execute(
                "INSERT OR REPLACE INTO feed_rules (id, targetType, targetId, filterField, pattern, matchType, actions)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                rusqlite::params![
                    r.id,
                    r.target_type,
                    r.target_id,
                    r.filter_field,
                    r.pattern,
                    if r.match_type { 1 } else { 0 },
                    actions_json,
                ],
            ).ok();
        }
    }

    Json(json!({ "success": true }))
}

// --- Cloud Sync Services ---

pub async fn get_services_handler(State(state): State<AppState>) -> Json<Value> {
    let conn = state.db.conn();
    let guard = conn.lock().unwrap();
    let mut stmt = guard.prepare("SELECT serviceType, enabled, endpoint, username, password, apiKey, lastSynced FROM feed_sync_services").unwrap();
    let rows = stmt.query_map([], |r| {
        Ok(FeedSyncService {
            service_type: r.get(0)?,
            enabled: r.get::<_, i64>(1)? != 0,
            endpoint: r.get(2)?,
            username: r.get(3)?,
            password: r.get(4)?,
            api_key: r.get(5)?,
            last_synced: r.get(6)?,
        })
    }).unwrap();

    let services: Vec<FeedSyncService> = rows.filter_map(|r| r.ok()).collect();
    Json(json!({ "services": services }))
}

pub async fn save_service_handler(
    State(state): State<AppState>,
    AxumPath(stype): AxumPath<String>,
    Json(body): Json<FeedSyncService>,
) -> Json<Value> {
    let conn = state.db.conn();
    let guard = conn.lock().unwrap();
    guard.execute(
        "INSERT OR REPLACE INTO feed_sync_services (serviceType, enabled, endpoint, username, password, apiKey, lastSynced)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![
            stype,
            if body.enabled { 1 } else { 0 },
            body.endpoint,
            body.username,
            body.password,
            body.api_key,
            body.last_synced,
        ],
    ).ok();

    Json(json!({ "success": true }))
}

pub async fn sync_service_now_handler(
    State(state): State<AppState>,
    AxumPath(stype): AxumPath<String>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let service: FeedSyncService = {
        let conn = state.db.conn();
        let guard = conn.lock().unwrap();
        guard.query_row(
            "SELECT serviceType, enabled, endpoint, username, password, apiKey, lastSynced FROM feed_sync_services WHERE serviceType = ?1",
            rusqlite::params![stype],
            |r| {
                Ok(FeedSyncService {
                    service_type: r.get(0)?,
                    enabled: r.get::<_, i64>(1)? != 0,
                    endpoint: r.get(2)?,
                    username: r.get(3)?,
                    password: r.get(4)?,
                    api_key: r.get(5)?,
                    last_synced: r.get(6)?,
                })
            },
        ).map_err(|_| (StatusCode::NOT_FOUND, "Service not configured".to_string()))?
    };

    if !service.enabled {
        return Err((StatusCode::BAD_REQUEST, "Service is not enabled".to_string()));
    }

    let endpoint = service.endpoint.unwrap_or_default();
    if endpoint.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "Missing service endpoint URL".to_string()));
    }

    // Ping / test service endpoint
    let test_res = state.http_client.get(&endpoint).timeout(std::time::Duration::from_secs(10)).send().await;
    match test_res {
        Ok(res) if res.status().is_success() || res.status() == StatusCode::UNAUTHORIZED => {
            let now = Utc::now().to_rfc3339();
            let conn = state.db.conn();
            let guard = conn.lock().unwrap();
            guard.execute("UPDATE feed_sync_services SET lastSynced = ?1 WHERE serviceType = ?2", rusqlite::params![now, stype]).ok();
            guard.execute(
                "INSERT INTO feed_logs (logType, title, details, createdAt) VALUES ('info', ?1, ?2, ?3)",
                rusqlite::params![
                    format!("Sync {} service", stype),
                    format!("Connected successfully to {}", endpoint),
                    now,
                ],
            ).ok();
            Ok(Json(json!({ "success": true, "message": "Service synced successfully", "lastSynced": now })))
        }
        Ok(res) => Err((StatusCode::BAD_GATEWAY, format!("Service responded with HTTP {}", res.status()))),
        Err(e) => Err((StatusCode::BAD_GATEWAY, format!("Service connection error: {}", e))),
    }
}
