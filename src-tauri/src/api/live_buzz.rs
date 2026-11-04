use axum::{
    extract::{Query, State},
    http::StatusCode,
    Json,
};
use chrono::Utc;
use regex::Regex;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::Instant;

use crate::api::AppState;

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LiveBuzzItem {
    pub id: String,
    pub rank: usize,
    pub title: String,
    pub url: String,
    pub snippet: Option<String>,
    pub author: Option<String>,
    #[serde(rename = "extraInfo")]
    pub extra_info: Option<String>,
    #[serde(rename = "publishedAt")]
    pub published_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LiveBuzzSourceMeta {
    pub id: &'static str,
    pub name: &'static str,
    pub category: &'static str,
    pub description: &'static str,
    pub icon: &'static str,
    pub color: &'static str,
}

pub const AVAILABLE_SOURCES: &[LiveBuzzSourceMeta] = &[
    LiveBuzzSourceMeta {
        id: "github",
        name: "GitHub Trending",
        category: "Code & Dev",
        description: "Today's most starred open-source repositories and developers.",
        icon: "github",
        color: "#24292e",
    },
    LiveBuzzSourceMeta {
        id: "hackernews",
        name: "Hacker News",
        category: "Tech & Startups",
        description: "Top curated tech discussions and news from Y Combinator.",
        icon: "hackernews",
        color: "#ff6600",
    },
    LiveBuzzSourceMeta {
        id: "producthunt",
        name: "Product Hunt",
        category: "Product Launch",
        description: "The best new tech products, AI agents and startup launches today.",
        icon: "producthunt",
        color: "#da552f",
    },
    LiveBuzzSourceMeta {
        id: "huggingface",
        name: "Hugging Face Trending",
        category: "AI & Models",
        description: "Trending open-weight AI models, datasets and spaces.",
        icon: "huggingface",
        color: "#ffd21e",
    },
    LiveBuzzSourceMeta {
        id: "arxiv",
        name: "arXiv AI & CS",
        category: "Research",
        description: "Breaking artificial intelligence and computer science papers.",
        icon: "arxiv",
        color: "#b31b1b",
    },
    LiveBuzzSourceMeta {
        id: "techcrunch",
        name: "TechCrunch AI",
        category: "Venture & Tech",
        description: "Startup news, venture capital rounds, and enterprise AI breakthroughs.",
        icon: "techcrunch",
        color: "#00a562",
    },
    LiveBuzzSourceMeta {
        id: "v2ex",
        name: "V2EX Hot",
        category: "Community",
        description: "Trending developer discussions, tools, and technical threads.",
        icon: "v2ex",
        color: "#333344",
    },
    LiveBuzzSourceMeta {
        id: "36kr",
        name: "36Kr Quick Flash",
        category: "Business Tech",
        description: "High-speed technology trends and industry milestones.",
        icon: "36kr",
        color: "#1890ff",
    },
];

// ---------------------------------------------------------------------------
// In-Memory Adaptive Cache
// ---------------------------------------------------------------------------

struct CachedFeed {
    items: Vec<LiveBuzzItem>,
    cached_at: Instant,
}

static CACHE: std::sync::OnceLock<Arc<Mutex<HashMap<String, CachedFeed>>>> =
    std::sync::OnceLock::new();

fn get_cache() -> Arc<Mutex<HashMap<String, CachedFeed>>> {
    CACHE
        .get_or_init(|| Arc::new(Mutex::new(HashMap::new())))
        .clone()
}

// ---------------------------------------------------------------------------
// Real-Time Scrapers
// ---------------------------------------------------------------------------

async fn scrape_github_trending(client: &reqwest::Client) -> Vec<LiveBuzzItem> {
    let url = "https://github.com/trending?spoken_language_code=";
    let res = match client
        .get(url)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .timeout(std::time::Duration::from_secs(12))
        .send()
        .await
    {
        Ok(r) => r.text().await.unwrap_or_default(),
        Err(_) => return vec![],
    };

    let mut items = Vec::new();
    let row_re = Regex::new(r#"(?s)<article class="Box-row">(.*?)</article>"#).unwrap();
    let title_re = Regex::new(r#"<h2[^>]*>\s*<a href="/([^"]+)"#).unwrap();
    let desc_re = Regex::new(r#"(?s)<p class="col-9[^"]*">(.*?)</p>"#).unwrap();
    let stars_re = Regex::new(r#"(?s)([0-9,]+)\s+stars today"#).unwrap();
    let lang_re = Regex::new(r#"itemprop="programmingLanguage">([^<]+)<"#).unwrap();

    let mut rank = 1;
    for cap in row_re.captures_iter(&res) {
        let block = cap.get(1).map(|m| m.as_str()).unwrap_or("");
        if let Some(tcap) = title_re.captures(block) {
            let repo_path = tcap.get(1).unwrap().as_str().trim();
            let repo_url = format!("https://github.com/{}", repo_path);
            let desc = desc_re
                .captures(block)
                .map(|m| m.get(1).unwrap().as_str().trim().to_string())
                .unwrap_or_default();
            let clean_desc = Regex::new(r#"<[^>]+>"#)
                .unwrap()
                .replace_all(&desc, "")
                .trim()
                .to_string();

            let stars_today = stars_re
                .captures(block)
                .map(|m| format!("★ {} today", m.get(1).unwrap().as_str().trim()));

            let lang = lang_re
                .captures(block)
                .map(|m| m.get(1).unwrap().as_str().trim().to_string());

            let extra = match (stars_today, lang) {
                (Some(s), Some(l)) => Some(format!("{} • {}", l, s)),
                (Some(s), None) => Some(s),
                (None, Some(l)) => Some(l),
                _ => None,
            };

            items.push(LiveBuzzItem {
                id: repo_path.to_string(),
                rank,
                title: repo_path.replace("/", " / "),
                url: repo_url,
                snippet: if clean_desc.is_empty() { None } else { Some(clean_desc) },
                author: repo_path.split('/').next().map(|s| s.to_string()),
                extra_info: extra,
                published_at: Some(Utc::now().to_rfc3339()),
            });
            rank += 1;
        }
    }

    items
}

async fn scrape_hackernews(client: &reqwest::Client) -> Vec<LiveBuzzItem> {
    // We use the ultra-fast HNRSS frontpage feed
    let url = "https://hnrss.org/frontpage?count=30";
    let bytes = match client
        .get(url)
        .header("User-Agent", "Mozilla/5.0")
        .timeout(std::time::Duration::from_secs(12))
        .send()
        .await
    {
        Ok(r) => r.bytes().await.unwrap_or_default(),
        Err(_) => return vec![],
    };

    let parsed = match feed_rs::parser::parse(&bytes[..]) {
        Ok(f) => f,
        Err(_) => return vec![],
    };

    let points_re = Regex::new(r#"Points: (\d+)"#).unwrap();
    let comments_re = Regex::new(r#"Comments: (\d+)"#).unwrap();

    let mut items = Vec::new();
    let mut rank = 1;

    for entry in parsed.entries {
        let link = entry
            .links
            .first()
            .map(|l| l.href.clone())
            .unwrap_or_default();
        if link.is_empty() {
            continue;
        }

        let desc = entry.summary.map(|s| s.content).unwrap_or_default();
        let points = points_re.captures(&desc).map(|m| m.get(1).unwrap().as_str().to_string());
        let comments = comments_re.captures(&desc).map(|m| m.get(1).unwrap().as_str().to_string());

        let extra = match (points, comments) {
            (Some(p), Some(c)) => Some(format!("▲ {} pts • 💬 {} comments", p, c)),
            (Some(p), None) => Some(format!("▲ {} pts", p)),
            _ => None,
        };

        items.push(LiveBuzzItem {
            id: entry.id,
            rank,
            title: entry.title.map(|t| t.content).unwrap_or_else(|| "HN Story".to_string()),
            url: link,
            snippet: None,
            author: entry.authors.first().map(|a| a.name.clone()),
            extra_info: extra,
            published_at: entry.published.map(|dt| dt.to_rfc3339()),
        });
        rank += 1;
    }

    items
}

async fn scrape_producthunt(client: &reqwest::Client) -> Vec<LiveBuzzItem> {
    // Official / Verified ProductHunt daily Atom RSS feed
    let url = "https://www.producthunt.com/feed";
    let bytes = match client
        .get(url)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
        .timeout(std::time::Duration::from_secs(12))
        .send()
        .await
    {
        Ok(r) => r.bytes().await.unwrap_or_default(),
        Err(_) => return vec![],
    };

    let parsed = match feed_rs::parser::parse(&bytes[..]) {
        Ok(f) => f,
        Err(_) => return vec![],
    };

    let mut items = Vec::new();
    let mut rank = 1;

    for entry in parsed.entries {
        let link = entry
            .links
            .first()
            .map(|l| l.href.clone())
            .unwrap_or_default();
        if link.is_empty() {
            continue;
        }

        let raw_desc = entry.summary.map(|s| s.content).unwrap_or_default();
        let clean_desc = Regex::new(r#"<[^>]+>"#)
            .unwrap()
            .replace_all(&raw_desc, "")
            .trim()
            .to_string();

        items.push(LiveBuzzItem {
            id: entry.id,
            rank,
            title: entry.title.map(|t| t.content).unwrap_or_else(|| "Featured Product".to_string()),
            url: link,
            snippet: if clean_desc.is_empty() { None } else { Some(clean_desc) },
            author: entry.authors.first().map(|a| a.name.clone()),
            extra_info: Some("🚀 Launched Today".to_string()),
            published_at: entry.published.map(|dt| dt.to_rfc3339()),
        });
        rank += 1;
    }

    items
}

async fn scrape_huggingface(client: &reqwest::Client) -> Vec<LiveBuzzItem> {
    let url = "https://huggingface.co/api/models?sort=trending&direction=-1&limit=25";
    let res = match client
        .get(url)
        .timeout(std::time::Duration::from_secs(12))
        .send()
        .await
    {
        Ok(r) => r.json::<Vec<Value>>().await.unwrap_or_default(),
        Err(_) => return vec![],
    };

    let mut items = Vec::new();
    let mut rank = 1;

    for val in res {
        let model_id = val.get("id").and_then(|v| v.as_str()).unwrap_or("");
        if model_id.is_empty() {
            continue;
        }

        let downloads = val.get("downloads").and_then(|v| v.as_i64()).unwrap_or(0);
        let likes = val.get("likes").and_then(|v| v.as_i64()).unwrap_or(0);
        let pipeline_tag = val
            .get("pipeline_tag")
            .and_then(|v| v.as_str())
            .unwrap_or("model");

        items.push(LiveBuzzItem {
            id: model_id.to_string(),
            rank,
            title: model_id.to_string(),
            url: format!("https://huggingface.co/{}", model_id),
            snippet: Some(format!("AI model tag: {}", pipeline_tag)),
            author: model_id.split('/').next().map(|s| s.to_string()),
            extra_info: Some(format!("{} • ♥ {} • 📥 {}", pipeline_tag, likes, downloads)),
            published_at: Some(Utc::now().to_rfc3339()),
        });
        rank += 1;
    }

    items
}

async fn scrape_arxiv(client: &reqwest::Client) -> Vec<LiveBuzzItem> {
    let url = "https://export.arxiv.org/rss/cs.AI";
    let bytes = match client
        .get(url)
        .timeout(std::time::Duration::from_secs(12))
        .send()
        .await
    {
        Ok(r) => r.bytes().await.unwrap_or_default(),
        Err(_) => return vec![],
    };

    let parsed = match feed_rs::parser::parse(&bytes[..]) {
        Ok(f) => f,
        Err(_) => return vec![],
    };

    let mut items = Vec::new();
    let mut rank = 1;

    for entry in parsed.entries {
        let link = entry
            .links
            .first()
            .map(|l| l.href.clone())
            .unwrap_or_default();
        if link.is_empty() {
            continue;
        }

        let title = entry
            .title
            .map(|t| t.content)
            .unwrap_or_else(|| "Research Paper".to_string());
        // Clean title prefixes like "arXiv:2501.xxxxx"
        let clean_title = Regex::new(r#"^\[.*?\]\s*"#)
            .unwrap()
            .replace(&title, "")
            .to_string();

        let raw_desc = entry.summary.map(|s| s.content).unwrap_or_default();
        let clean_desc = Regex::new(r#"<[^>]+>"#)
            .unwrap()
            .replace_all(&raw_desc, "")
            .trim()
            .to_string();

        items.push(LiveBuzzItem {
            id: entry.id,
            rank,
            title: clean_title,
            url: link,
            snippet: if clean_desc.is_empty() { None } else { Some(clean_desc) },
            author: entry.authors.first().map(|a| a.name.clone()),
            extra_info: Some("📄 arXiv Pre-print".to_string()),
            published_at: entry.published.map(|dt| dt.to_rfc3339()),
        });
        rank += 1;
    }

    items
}

async fn scrape_techcrunch(client: &reqwest::Client) -> Vec<LiveBuzzItem> {
    let url = "https://techcrunch.com/category/artificial-intelligence/feed/";
    let bytes = match client
        .get(url)
        .header("User-Agent", "Mozilla/5.0")
        .timeout(std::time::Duration::from_secs(12))
        .send()
        .await
    {
        Ok(r) => r.bytes().await.unwrap_or_default(),
        Err(_) => return vec![],
    };

    let parsed = match feed_rs::parser::parse(&bytes[..]) {
        Ok(f) => f,
        Err(_) => return vec![],
    };

    let mut items = Vec::new();
    let mut rank = 1;

    for entry in parsed.entries {
        let link = entry
            .links
            .first()
            .map(|l| l.href.clone())
            .unwrap_or_default();
        if link.is_empty() {
            continue;
        }

        let raw_desc = entry.summary.map(|s| s.content).unwrap_or_default();
        let clean_desc = Regex::new(r#"<[^>]+>"#)
            .unwrap()
            .replace_all(&raw_desc, "")
            .trim()
            .to_string();

        items.push(LiveBuzzItem {
            id: entry.id,
            rank,
            title: entry.title.map(|t| t.content).unwrap_or_else(|| "TechCrunch News".to_string()),
            url: link,
            snippet: if clean_desc.is_empty() { None } else { Some(clean_desc) },
            author: entry.authors.first().map(|a| a.name.clone()),
            extra_info: Some("⚡ TechCrunch AI".to_string()),
            published_at: entry.published.map(|dt| dt.to_rfc3339()),
        });
        rank += 1;
    }

    items
}

async fn scrape_v2ex(client: &reqwest::Client) -> Vec<LiveBuzzItem> {
    let url = "https://www.v2ex.com/api/topics/hot.json";
    let res = match client
        .get(url)
        .header("User-Agent", "Mozilla/5.0")
        .timeout(std::time::Duration::from_secs(12))
        .send()
        .await
    {
        Ok(r) => r.json::<Vec<Value>>().await.unwrap_or_default(),
        Err(_) => return vec![],
    };

    let mut items = Vec::new();
    let mut rank = 1;

    for val in res {
        let title = val.get("title").and_then(|v| v.as_str()).unwrap_or("");
        let url = val.get("url").and_then(|v| v.as_str()).unwrap_or("");
        let replies = val.get("replies").and_then(|v| v.as_i64()).unwrap_or(0);
        let node_name = val
            .get("node")
            .and_then(|n| n.get("title"))
            .and_then(|v| v.as_str())
            .unwrap_or("tech");

        if !title.is_empty() && !url.is_empty() {
            items.push(LiveBuzzItem {
                id: url.to_string(),
                rank,
                title: title.to_string(),
                url: url.to_string(),
                snippet: None,
                author: val.get("member").and_then(|m| m.get("username")).and_then(|u| u.as_str()).map(|s| s.to_string()),
                extra_info: Some(format!("{} • 💬 {} replies", node_name, replies)),
                published_at: Some(Utc::now().to_rfc3339()),
            });
            rank += 1;
        }
    }

    items
}

async fn scrape_36kr(client: &reqwest::Client) -> Vec<LiveBuzzItem> {
    let url = "https://36kr.com/feed";
    let bytes = match client
        .get(url)
        .header("User-Agent", "Mozilla/5.0")
        .timeout(std::time::Duration::from_secs(12))
        .send()
        .await
    {
        Ok(r) => r.bytes().await.unwrap_or_default(),
        Err(_) => return vec![],
    };

    let parsed = match feed_rs::parser::parse(&bytes[..]) {
        Ok(f) => f,
        Err(_) => return vec![],
    };

    let mut items = Vec::new();
    let mut rank = 1;

    for entry in parsed.entries {
        let link = entry
            .links
            .first()
            .map(|l| l.href.clone())
            .unwrap_or_default();
        if link.is_empty() {
            continue;
        }

        let raw_desc = entry.summary.map(|s| s.content).unwrap_or_default();
        let clean_desc = Regex::new(r#"<[^>]+>"#)
            .unwrap()
            .replace_all(&raw_desc, "")
            .trim()
            .to_string();

        items.push(LiveBuzzItem {
            id: entry.id,
            rank,
            title: entry.title.map(|t| t.content).unwrap_or_else(|| "36Kr News".to_string()),
            url: link,
            snippet: if clean_desc.is_empty() { None } else { Some(clean_desc) },
            author: entry.authors.first().map(|a| a.name.clone()),
            extra_info: Some("36Kr Tech Flash".to_string()),
            published_at: entry.published.map(|dt| dt.to_rfc3339()),
        });
        rank += 1;
    }

    items
}

// ---------------------------------------------------------------------------
// HTTP Handlers
// ---------------------------------------------------------------------------

pub async fn get_live_buzz_sources_handler() -> Json<Value> {
    Json(json!({
        "sources": AVAILABLE_SOURCES
    }))
}

#[derive(Deserialize)]
pub struct LiveBuzzStreamQuery {
    pub source: String,
    pub force: Option<bool>,
}

pub async fn get_live_buzz_stream_handler(
    State(state): State<AppState>,
    Query(params): Query<LiveBuzzStreamQuery>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let source_id = params.source.to_lowercase();
    let force = params.force.unwrap_or(false);

    let cache = get_cache();
    let cache_duration = std::time::Duration::from_secs(12 * 60); // 12 minutes adaptive cache

    // Check cache
    if !force {
        let guard = cache.lock().unwrap();
        if let Some(entry) = guard.get(&source_id) {
            if entry.cached_at.elapsed() < cache_duration {
                return Ok(Json(json!({
                    "source": source_id,
                    "cached": true,
                    "items": entry.items,
                    "count": entry.items.len(),
                    "updatedAt": Utc::now().to_rfc3339()
                })));
            }
        }
    }

    let client = &state.http_client;
    let items = match source_id.as_str() {
        "github" => scrape_github_trending(client).await,
        "hackernews" => scrape_hackernews(client).await,
        "producthunt" => scrape_producthunt(client).await,
        "huggingface" => scrape_huggingface(client).await,
        "arxiv" => scrape_arxiv(client).await,
        "techcrunch" => scrape_techcrunch(client).await,
        "v2ex" => scrape_v2ex(client).await,
        "36kr" => scrape_36kr(client).await,
        _ => return Err((StatusCode::NOT_FOUND, "Unknown source ID".to_string())),
    };

    // Store in cache
    {
        let mut guard = cache.lock().unwrap();
        guard.insert(
            source_id.clone(),
            CachedFeed {
                items: items.clone(),
                cached_at: Instant::now(),
            },
        );
    }

    Ok(Json(json!({
        "source": source_id,
        "cached": false,
        "items": items,
        "count": items.len(),
        "updatedAt": Utc::now().to_rfc3339()
    })))
}

