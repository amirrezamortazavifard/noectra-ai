use reqwest::Client;
use serde_json::{json, Value};
use crate::scraper::scrape_url;

pub async fn open_url(client: &Client, url: &str) -> Result<Value, String> {
    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Err("Invalid URL scheme. Must be http or https".to_string());
    }
    
    match scrape_url(client, url).await {
        Some(content) => Ok(json!({
            "url": url,
            "content": content
        })),
        None => Err(format!("Failed to read content from {}", url))
    }
}
