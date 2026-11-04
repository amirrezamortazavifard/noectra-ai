use axum::{extract::State, http::StatusCode, Json};
use regex::Regex;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::sync::OnceLock;

use super::AppState;

#[derive(Deserialize)]
pub struct YouTubeTranscriptRequest {
    pub url: Option<String>,
    pub video_id: Option<String>,
    pub language: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TranscriptEntry {
    pub start: f64,
    pub duration: f64,
    pub text: String,
}

pub fn extract_video_id(input: &str) -> Option<String> {
    static RE_YT: OnceLock<Regex> = OnceLock::new();
    let re = RE_YT.get_or_init(|| {
        Regex::new(r"(?:youtube\.com/(?:watch\?v=|embed/|v/|shorts/)|youtu\.be/)([a-zA-Z0-9_-]{11})")
            .unwrap()
    });

    if let Some(caps) = re.captures(input) {
        if let Some(id_match) = caps.get(1) {
            return Some(id_match.as_str().to_string());
        }
    }

    if input.len() == 11 && input.chars().all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-') {
        return Some(input.to_string());
    }

    None
}

pub async fn get_youtube_transcript_handler(
    State(state): State<AppState>,
    Json(payload): Json<YouTubeTranscriptRequest>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let video_id = match payload.video_id {
        Some(id) if !id.trim().is_empty() => id.trim().to_string(),
        _ => match payload.url {
            Some(ref u) => match extract_video_id(u) {
                Some(id) => id,
                None => {
                    return Err((
                        StatusCode::BAD_REQUEST,
                        Json(json!({ "error": "Invalid YouTube URL or video ID" })),
                    ));
                }
            },
            None => {
                return Err((
                    StatusCode::BAD_REQUEST,
                    Json(json!({ "error": "Missing video_id or url" })),
                ));
            }
        },
    };

    let watch_url = format!("https://www.youtube.com/watch?v={}", video_id);

    let html_res = state
        .http_client
        .get(&watch_url)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36")
        .header("Accept-Language", "en-US,en;q=0.9")
        .send()
        .await;

    let html = match html_res {
        Ok(res) if res.status().is_success() => res.text().await.unwrap_or_default(),
        _ => {
            return Err((
                StatusCode::BAD_GATEWAY,
                Json(json!({ "error": "Failed to connect to YouTube video page" })),
            ));
        }
    };

    // Extract title
    static RE_TITLE: OnceLock<Regex> = OnceLock::new();
    let re_title = RE_TITLE.get_or_init(|| Regex::new(r#"<title>(.*?)</title>"#).unwrap());
    let mut title = String::from("YouTube Video");
    if let Some(caps) = re_title.captures(&html) {
        if let Some(m) = caps.get(1) {
            let raw_t = m.as_str().replace(" - YouTube", "");
            title = htmlescape_simple(&raw_t);
        }
    }

    // Look for captionTracks in ytInitialPlayerResponse
    static RE_CAPTIONS: OnceLock<Regex> = OnceLock::new();
    let re_captions = RE_CAPTIONS.get_or_init(|| {
        Regex::new(r#""captionTracks":\s*(\[.*?\])"#).unwrap()
    });

    let mut caption_base_url: Option<String> = None;
    if let Some(caps) = re_captions.captures(&html) {
        if let Some(json_str) = caps.get(1) {
            if let Ok(tracks) = serde_json::from_str::<Value>(json_str.as_str()) {
                if let Some(arr) = tracks.as_array() {
                    // Try to match requested language, else pick first available
                    let req_lang = payload.language.as_deref().unwrap_or("en");
                    for track in arr {
                        let lang_code = track.get("languageCode").and_then(|v| v.as_str()).unwrap_or("");
                        if lang_code.starts_with(req_lang) {
                            if let Some(base) = track.get("baseUrl").and_then(|v| v.as_str()) {
                                caption_base_url = Some(base.to_string());
                                break;
                            }
                        }
                    }
                    if caption_base_url.is_none() && !arr.is_empty() {
                        if let Some(base) = arr[0].get("baseUrl").and_then(|v| v.as_str()) {
                            caption_base_url = Some(base.to_string());
                        }
                    }
                }
            }
        }
    }

    let caption_url = match caption_base_url {
        Some(mut u) => {
            // Append format json3 if not present
            if !u.contains("fmt=") {
                u.push_str("&fmt=json3");
            }
            u
        }
        None => {
            return Err((
                StatusCode::NOT_FOUND,
                Json(json!({
                    "error": "No captions or transcripts are available for this video.",
                    "video_id": video_id,
                    "title": title
                })),
            ));
        }
    };

    let transcript_res = state
        .http_client
        .get(&caption_url)
        .header("User-Agent", "Mozilla/5.0")
        .send()
        .await;

    let transcript_text = match transcript_res {
        Ok(res) if res.status().is_success() => res.text().await.unwrap_or_default(),
        _ => {
            return Err((
                StatusCode::BAD_GATEWAY,
                Json(json!({ "error": "Failed to download caption track" })),
            ));
        }
    };

    let mut entries: Vec<TranscriptEntry> = Vec::new();

    // Parse json3 format
    if let Ok(json_data) = serde_json::from_str::<Value>(&transcript_text) {
        if let Some(events) = json_data.get("events").and_then(|e| e.as_array()) {
            for event in events {
                let start_ms = event.get("tStartMs").and_then(|v| v.as_f64()).unwrap_or(0.0);
                let duration_ms = event.get("dDurationMs").and_then(|v| v.as_f64()).unwrap_or(0.0);

                if let Some(segs) = event.get("segs").and_then(|s| s.as_array()) {
                    let mut seg_text = String::new();
                    for seg in segs {
                        if let Some(utf8) = seg.get("utf8").and_then(|u| u.as_str()) {
                            seg_text.push_str(utf8);
                        }
                    }
                    let cleaned = seg_text.trim().to_string();
                    if !cleaned.is_empty() && cleaned != "\n" {
                        entries.push(TranscriptEntry {
                            start: (start_ms / 1000.0 * 10.0).round() / 10.0,
                            duration: (duration_ms / 1000.0 * 10.0).round() / 10.0,
                            text: cleaned,
                        });
                    }
                }
            }
        }
    }

    // Fallback: parse xml format if json3 didn't yield entries
    if entries.is_empty() {
        static RE_XML_TEXT: OnceLock<Regex> = OnceLock::new();
        let re_xml = RE_XML_TEXT.get_or_init(|| {
            Regex::new(r#"<text start="([^"]+)" dur="([^"]+)">([^<]*)</text>"#).unwrap()
        });

        for cap in re_xml.captures_iter(&transcript_text) {
            let start = cap.get(1).and_then(|m| m.as_str().parse::<f64>().ok()).unwrap_or(0.0);
            let dur = cap.get(2).and_then(|m| m.as_str().parse::<f64>().ok()).unwrap_or(0.0);
            let text = cap.get(3).map(|m| htmlescape_simple(m.as_str())).unwrap_or_default();

            if !text.trim().is_empty() {
                entries.push(TranscriptEntry {
                    start: (start * 10.0).round() / 10.0,
                    duration: (dur * 10.0).round() / 10.0,
                    text: text.trim().to_string(),
                });
            }
        }
    }

    let full_transcript = entries
        .iter()
        .map(|e| e.text.as_str())
        .collect::<Vec<_>>()
        .join(" ");

    Ok(Json(json!({
        "video_id": video_id,
        "title": title,
        "url": watch_url,
        "entry_count": entries.len(),
        "entries": entries,
        "full_text": full_transcript
    })))
}

fn htmlescape_simple(s: &str) -> String {
    s.replace("&amp;", "&")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("\n", " ")
}
