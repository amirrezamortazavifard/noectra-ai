use crate::searxng::{search_searxng, SearxngOptions};
use reqwest::Client;
use serde_json::{json, Value};

pub async fn search_images(
    client: &Client,
    searxng_url: &str,
    query: &str,
) -> Vec<Value> {
    let opts = SearxngOptions {
        categories: vec!["images".to_string()],
        engines: vec![],
        language: Some("en".to_string()),
        pageno: Some(1),
    };

    let mut images = Vec::new();
    if let Ok(res) = search_searxng(client, searxng_url, query, Some(opts)).await {
        for item in res.results.into_iter().take(8) {
            let img_src = item.img_src.or(item.thumbnail_src).or(item.thumbnail);
            if let Some(src) = img_src {
                images.push(json!({
                    "url": item.url.unwrap_or_default(),
                    "title": item.title.unwrap_or_default(),
                    "img_src": src,
                    "thumbnail_src": src
                }));
            }
        }
    }
    images
}

pub async fn search_videos(
    client: &Client,
    searxng_url: &str,
    query: &str,
) -> Vec<Value> {
    let opts = SearxngOptions {
        categories: vec!["videos".to_string()],
        engines: vec![],
        language: Some("en".to_string()),
        pageno: Some(1),
    };

    let mut videos = Vec::new();
    if let Ok(res) = search_searxng(client, searxng_url, query, Some(opts)).await {
        for item in res.results.into_iter().take(8) {
            videos.push(json!({
                "url": item.url.unwrap_or_default(),
                "title": item.title.unwrap_or_default(),
                "thumbnail_src": item.thumbnail_src.or(item.thumbnail).unwrap_or_default(),
                "iframe_src": item.iframe_src.unwrap_or_default(),
                "author": item.author.unwrap_or_default()
            }));
        }
    }
    videos
}
