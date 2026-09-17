use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearxngSearchResult {
    pub title: Option<String>,
    pub url: Option<String>,
    pub content: Option<String>,
    pub img_src: Option<String>,
    pub thumbnail_src: Option<String>,
    pub thumbnail: Option<String>,
    pub author: Option<String>,
    pub iframe_src: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearxngSearchResponse {
    pub results: Vec<SearxngSearchResult>,
    #[serde(default)]
    pub suggestions: Vec<String>,
}

#[derive(Debug, Default)]
pub struct SearxngOptions {
    pub categories: Vec<String>,
    pub engines: Vec<String>,
    pub language: Option<String>,
    pub pageno: Option<u32>,
}

pub async fn search_searxng(
    client: &Client,
    base_url: &str,
    query: &str,
    opts: Option<SearxngOptions>,
) -> Result<SearxngSearchResponse, String> {
    let clean_base = base_url.trim_end_matches('/');
    let mut url = format!("{}/search?format=json&q={}", clean_base, urlencoding::encode(query));

    if let Some(opts) = opts {
        if !opts.categories.is_empty() {
            url.push_str(&format!("&categories={}", opts.categories.join(",")));
        }
        if !opts.engines.is_empty() {
            url.push_str(&format!("&engines={}", opts.engines.join(",")));
        }
        if let Some(lang) = opts.language {
            url.push_str(&format!("&language={}", lang));
        }
        if let Some(page) = opts.pageno {
            url.push_str(&format!("&pageno={}", page));
        }
    }

    let response = client
        .get(&url)
        .timeout(Duration::from_secs(12))
        .send()
        .await
        .map_err(|e| format!("SearXNG request failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("SearXNG returned error status: {}", response.status()));
    }

    let data: SearxngSearchResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse SearXNG JSON: {}", e))?;

    Ok(data)
}

mod urlencoding {
    pub fn encode(s: &str) -> String {
        let mut encoded = String::new();
        for b in s.bytes() {
            match b {
                b'a'..=b'z' | b'A'..=b'Z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                    encoded.push(b as char);
                }
                _ => {
                    encoded.push_str(&format!("%{:02X}", b));
                }
            }
        }
        encoded
    }
}
