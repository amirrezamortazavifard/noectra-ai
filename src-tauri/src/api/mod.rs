use crate::agents::media::{search_images, search_videos};
use crate::agents::researcher::run_research_agent;
use crate::agents::suggestions::generate_suggestions;
use crate::agents::widgets::get_weather_data;
use crate::agents::writer::stream_writer;
use crate::agents::ChunkSource;
use crate::config::{ConfigManager, ConfigModelProvider};
use crate::db::{Database, MessageRecord};
use crate::models::ChatMessage;
use axum::{
    body::Body,
    extract::{Path as AxumPath, Query, State},
    http::{header, HeaderValue, StatusCode},
    response::Response,
    routing::{delete, get, post},
    Json, Router,
};
use reqwest::Client;
use serde::Deserialize;
use serde_json::{json, Value};
use std::collections::HashMap;
use tokio::sync::mpsc;
use tokio_stream::wrappers::ReceiverStream;
use tower_http::cors::{Any, CorsLayer};
use uuid::Uuid;

#[derive(Clone)]
pub struct AppState {
    pub db: Database,
    pub config: ConfigManager,
    pub http_client: Client,
}

pub fn create_router(state: AppState) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    Router::new()
        // Config
        .route("/api/config", get(get_config).post(update_config))
        .route("/api/config/setup-complete", post(setup_complete))
        // Providers
        .route("/api/providers", get(get_providers).post(add_provider))
        .route("/api/providers/test", post(test_raw_provider))
        .route("/api/providers/:id", delete(delete_provider).patch(update_provider))
        .route("/api/providers/:id/test", post(test_saved_provider))
        .route("/api/providers/:id/models", get(get_provider_models).post(add_provider_model).delete(delete_provider_model))
        // 9Router Local AI Gateway
        .route("/api/9router/status", get(get_9router_status))
        .route("/api/9router/start", post(start_9router_service))
        .route("/api/9router/ping", post(ping_9router_model))
        // Chats
        .route("/api/chats", get(get_chats))
        .route("/api/chats/:id", get(get_chat_by_id).delete(delete_chat_by_id))
        .route("/api/reconnect/:id", get(reconnect_chat))
        // Chat streaming
        .route("/api/chat", post(chat_stream))
        // Suggestions & widgets
        .route("/api/suggestions", post(post_suggestions))
        .route("/api/weather", post(post_weather))
        .route("/api/discover", get(get_discover))
        .route("/api/open_url", post(post_open_url))
        .route("/api/article", post(post_article_content))
        .route("/api/proxy_article", get(get_proxy_article))
        .route("/api/images", post(post_images))
        .route("/api/videos", post(post_videos))
        .route("/api/uploads", post(post_uploads))
        .layer(cors)
        .with_state(state)
}

// Config Handlers
async fn get_config(State(state): State<AppState>) -> Json<Value> {
    let config = state.config.get_config();
    let fields = state.config.get_ui_config_sections();
    Json(json!({
        "values": config,
        "fields": fields
    }))
}

#[derive(Deserialize)]
struct UpdateConfigBody {
    key: String,
    value: Value,
}

async fn update_config(
    State(state): State<AppState>,
    Json(body): Json<UpdateConfigBody>,
) -> Result<Json<Value>, StatusCode> {
    state.config.update_key_value(&body.key, &body.value);
    Ok(Json(json!({ "message": "Config updated successfully." })))
}

async fn setup_complete(State(state): State<AppState>) -> Json<Value> {
    state.config.set_setup_complete(true);
    Json(json!({ "message": "Setup completed successfully." }))
}

// Provider Handlers
async fn get_providers(State(state): State<AppState>) -> Json<Value> {
    let config = state.config.get_config();
    Json(json!({ "providers": config.model_providers }))
}

async fn add_provider(
    State(state): State<AppState>,
    Json(provider): Json<ConfigModelProvider>,
) -> Json<Value> {
    let saved = state.config.add_or_update_provider(provider);
    Json(json!({ "message": "Provider saved successfully.", "provider": saved }))
}

async fn delete_provider(
    State(state): State<AppState>,
    AxumPath(id): AxumPath<String>,
) -> Json<Value> {
    state.config.delete_provider(&id);
    Json(json!({ "message": "Provider deleted successfully." }))
}

async fn update_provider(
    State(state): State<AppState>,
    AxumPath(id): AxumPath<String>,
    Json(mut provider): Json<ConfigModelProvider>,
) -> Json<Value> {
    if provider.id.is_empty() {
        provider.id = id;
    }
    let saved = state.config.add_or_update_provider(provider);
    Json(json!({ "message": "Provider updated successfully.", "provider": saved }))
}

async fn get_provider_models(
    State(state): State<AppState>,
    AxumPath(id): AxumPath<String>,
) -> Json<Value> {
    let config = state.config.get_config();
    if let Some(p) = config.model_providers.iter().find(|prov| prov.id == id) {
        if p.provider_type == "ollama" {
            let base = p.base_url.as_deref().unwrap_or("http://localhost:11434");
            let url = format!("{}/api/tags", base.trim_end_matches('/'));
            if let Ok(res) = state.http_client.get(&url).send().await {
                if let Ok(val) = res.json::<Value>().await {
                    if let Some(models) = val["models"].as_array() {
                        let list: Vec<Value> = models
                            .iter()
                            .filter_map(|m| {
                                m["name"].as_str().map(|name| {
                                    json!({
                                        "key": name,
                                        "name": name
                                    })
                                })
                            })
                            .collect();
                        return Json(json!({ "chatModels": list, "embeddingModels": list }));
                    }
                }
            }
        } else if p.provider_type == "9router" || (p.provider_type == "custom" && p.base_url.as_deref().unwrap_or("").contains("20128")) {
            let base = p.base_url.as_deref().unwrap_or("http://localhost:20128/v1");
            let clean_base = base.trim_end_matches('/');
            let url = if clean_base.ends_with("/v1") {
                format!("{}/models", clean_base)
            } else {
                format!("{}/v1/models", clean_base)
            };
            if let Ok(res) = state.http_client.get(&url).timeout(std::time::Duration::from_millis(1500)).send().await {
                if let Ok(val) = res.json::<Value>().await {
                    let models_opt = val["data"].as_array().or_else(|| val["models"].as_array()).or_else(|| val.as_array());
                    if let Some(models) = models_opt {
                        let list: Vec<Value> = models
                            .iter()
                            .filter_map(|m| {
                                let key = m["id"].as_str().or_else(|| m["name"].as_str())?;
                                let name = m["name"].as_str().unwrap_or(key);
                                Some(json!({
                                    "key": key,
                                    "name": name
                                }))
                            })
                            .collect();
                        if !list.is_empty() {
                            return Json(json!({ "chatModels": list, "embeddingModels": [] }));
                        }
                    }
                }
            }
        }
        Json(json!({
            "chatModels": p.chat_models,
            "embeddingModels": p.embedding_models
        }))
    } else {
        Json(json!({ "chatModels": [], "embeddingModels": [] }))
    }
}

#[derive(Deserialize)]
struct AddModelPayload {
    name: String,
    key: String,
    #[serde(rename = "type")]
    model_type: String,
}

async fn add_provider_model(
    State(state): State<AppState>,
    AxumPath(id): AxumPath<String>,
    Json(payload): Json<AddModelPayload>,
) -> Result<Json<Value>, StatusCode> {
    if state.config.add_model(&id, payload.name, payload.key, &payload.model_type) {
        Ok(Json(json!({ "message": "Model added successfully." })))
    } else {
        Err(StatusCode::NOT_FOUND)
    }
}

#[derive(Deserialize)]
struct DeleteModelPayload {
    key: String,
    #[serde(rename = "type")]
    model_type: String,
}

async fn delete_provider_model(
    State(state): State<AppState>,
    AxumPath(id): AxumPath<String>,
    Json(payload): Json<DeleteModelPayload>,
) -> Result<Json<Value>, StatusCode> {
    if state.config.delete_model(&id, &payload.key, &payload.model_type) {
        Ok(Json(json!({ "message": "Model deleted successfully." })))
    } else {
        Err(StatusCode::NOT_FOUND)
    }
}

#[derive(Deserialize)]
struct TestRawProviderPayload {
    #[serde(rename = "type")]
    provider_type: String,
    #[serde(default)]
    base_url: Option<String>,
    #[serde(default)]
    api_key: Option<String>,
    #[serde(default)]
    config: Option<Value>,
    #[serde(default)]
    model: Option<String>,
}

async fn test_raw_provider(
    State(state): State<AppState>,
    Json(payload): Json<TestRawProviderPayload>,
) -> Json<Value> {
    let base_url = payload.base_url
        .or_else(|| {
            payload.config.as_ref().and_then(|c| {
                c.get("baseUrl").or_else(|| c.get("baseURL")).and_then(|v| v.as_str()).map(|s| s.to_string())
            })
        })
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());

    let api_key = payload.api_key
        .or_else(|| {
            payload.config.as_ref().and_then(|c| {
                c.get("apiKey").and_then(|v| v.as_str()).map(|s| s.to_string())
            })
        })
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());

    let model = payload.model
        .map(|m| m.trim().to_string())
        .filter(|m| !m.is_empty())
        .unwrap_or_else(|| {
            match payload.provider_type.as_str() {
                "gemini" => "gemini-2.0-flash".to_string(),
                "anthropic" => "claude-3-5-haiku-20241022".to_string(),
                "groq" => "llama-3.3-70b-versatile".to_string(),
                "ollama" => "llama3.2".to_string(),
                "9router" => "kr/claude-sonnet-4.5".to_string(),
                "xai" => "grok-2-latest".to_string(),
                "mistral" => "mistral-small-latest".to_string(),
                "minimax" => "MiniMax-M2.5".to_string(),
                "huggingface" => "deepseek-ai/DeepSeek-V3".to_string(),
                "nvidia" => "meta/llama-3.3-70b-instruct".to_string(),
                "openrouter" => "deepseek/deepseek-r1:free".to_string(),
                "lmstudio" => "local-model".to_string(),
                _ => "gpt-4o-mini".to_string(),
            }
        });

    let test_messages = vec![ChatMessage {
        role: "user".to_string(),
        content: "Ping. Reply with 'pong' only.".to_string(),
        tool_calls: None,
        tool_call_id: None,
    }];

    let start = std::time::Instant::now();
    match crate::models::ModelService::complete(
        &state.http_client,
        &payload.provider_type,
        base_url.as_deref(),
        api_key.as_deref(),
        &model,
        test_messages,
    ).await {
        Ok(reply) => {
            let latency_ms = start.elapsed().as_millis();
            Json(json!({
                "success": true,
                "latencyMs": latency_ms,
                "model": model,
                "reply": reply.trim()
            }))
        }
        Err(err) => {
            Json(json!({
                "success": false,
                "model": model,
                "error": err
            }))
        }
    }
}

#[derive(Deserialize)]
struct TestSavedProviderPayload {
    #[serde(default)]
    model: Option<String>,
}

async fn test_saved_provider(
    State(state): State<AppState>,
    AxumPath(id): AxumPath<String>,
    Json(payload): Json<TestSavedProviderPayload>,
) -> Json<Value> {
    let config = state.config.get_config();
    let provider = config.model_providers.iter().find(|p| p.id == id);
    let prov = match provider {
        Some(p) => p,
        None => return Json(json!({ "success": false, "error": "Provider not found" })),
    };

    let model = payload.model
        .map(|m| m.trim().to_string())
        .filter(|m| !m.is_empty())
        .unwrap_or_else(|| {
            prov.chat_models.first().map(|m| m.key.trim().to_string()).filter(|k| !k.is_empty()).unwrap_or_else(|| {
                match prov.provider_type.as_str() {
                    "gemini" => "gemini-2.0-flash".to_string(),
                    "anthropic" => "claude-3-5-haiku-20241022".to_string(),
                    "groq" => "llama-3.3-70b-versatile".to_string(),
                    "ollama" => "llama3.2".to_string(),
                    "xai" => "grok-2-latest".to_string(),
                    "mistral" => "mistral-small-latest".to_string(),
                    "minimax" => "MiniMax-M2.5".to_string(),
                    "huggingface" => "deepseek-ai/DeepSeek-V3".to_string(),
                    "nvidia" => "meta/llama-3.3-70b-instruct".to_string(),
                    "openrouter" => "deepseek/deepseek-r1:free".to_string(),
                    "lmstudio" => "local-model".to_string(),
                    _ => "gpt-4o-mini".to_string(),
                }
            })
        });

    let base_url = prov.get_effective_base_url();
    let api_key = prov.get_effective_api_key();

    let test_messages = vec![ChatMessage {
        role: "user".to_string(),
        content: "Ping. Reply with 'pong' only.".to_string(),
        tool_calls: None,
        tool_call_id: None,
    }];

    let start = std::time::Instant::now();
    match crate::models::ModelService::complete(
        &state.http_client,
        &prov.provider_type,
        base_url.as_deref(),
        api_key.as_deref(),
        &model,
        test_messages,
    ).await {
        Ok(reply) => {
            let latency_ms = start.elapsed().as_millis();
            Json(json!({
                "success": true,
                "latencyMs": latency_ms,
                "model": model,
                "reply": reply.trim()
            }))
        }
        Err(err) => {
            Json(json!({
                "success": false,
                "model": model,
                "error": err
            }))
        }
    }
}

// Chat DB Handlers
async fn get_chats(State(state): State<AppState>) -> Json<Value> {
    let chats = state.db.get_chats().unwrap_or_default();
    Json(json!({ "chats": chats }))
}

async fn get_chat_by_id(
    State(state): State<AppState>,
    AxumPath(id): AxumPath<String>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    match state.db.get_chat(&id) {
        Ok(Some(chat)) => {
            let messages = state.db.get_messages(&id).unwrap_or_default();
            Ok(Json(json!({
                "chat": chat,
                "messages": messages
            })))
        }
        Ok(None) => Err((
            StatusCode::NOT_FOUND,
            Json(json!({ "message": "Chat not found" })),
        )),
        Err(_) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "message": "Database error" })),
        )),
    }
}

async fn delete_chat_by_id(
    State(state): State<AppState>,
    AxumPath(id): AxumPath<String>,
) -> Json<Value> {
    let _ = state.db.delete_chat(&id);
    Json(json!({ "message": "Chat deleted successfully" }))
}

async fn reconnect_chat(AxumPath(_id): AxumPath<String>) -> Json<Value> {
    Json(json!({ "status": "ok" }))
}

// Suggestions Handler
#[derive(Deserialize)]
struct SuggestionsReq {
    #[serde(rename = "chatHistory")]
    chat_history: Vec<(String, String)>,
    #[serde(rename = "chatModel")]
    chat_model: ProviderModelSelection,
}

async fn post_suggestions(
    State(state): State<AppState>,
    Json(body): Json<SuggestionsReq>,
) -> Json<Value> {
    let config = state.config.get_config();
    let provider = config
        .model_providers
        .into_iter()
        .find(|p| p.id == body.chat_model.provider_id);

    if let Some(prov) = provider {
        let history: Vec<ChatMessage> = body
            .chat_history
            .into_iter()
            .map(|(role, content)| ChatMessage {
                role: if role == "human" { "user".to_string() } else { "assistant".to_string() },
                content,
                tool_calls: None,
                tool_call_id: None,
            })
            .collect();

        let suggestions = generate_suggestions(
            &state.http_client,
            &prov.provider_type,
            prov.base_url.as_deref(),
            prov.api_key.as_deref(),
            &body.chat_model.key,
            &history,
        )
        .await;

        return Json(json!({ "suggestions": suggestions }));
    }

    Json(json!({ "suggestions": [] }))
}

// Weather Handler
#[derive(Deserialize)]
struct WeatherReq {
    lat: f64,
    lng: f64,
    #[serde(rename = "measureUnit")]
    measure_unit: Option<String>,
}

async fn post_weather(
    State(state): State<AppState>,
    Json(body): Json<WeatherReq>,
) -> Result<Json<Value>, StatusCode> {
    let unit = body.measure_unit.as_deref().unwrap_or("Metric");
    match get_weather_data(&state.http_client, body.lat, body.lng, unit).await {
        Ok(output) => Ok(Json(json!(output))),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}

#[derive(Deserialize)]
struct OpenUrlReq {
    url: String,
}

async fn post_open_url(Json(body): Json<OpenUrlReq>) -> Result<Json<Value>, StatusCode> {
    let url = body.url.trim().to_string();
    if url.starts_with("http://") || url.starts_with("https://") {
        #[cfg(target_os = "windows")]
        {
            let _ = std::process::Command::new("cmd")
                .args(["/C", "start", "", &url])
                .spawn();
        }
        #[cfg(not(target_os = "windows"))]
        {
            let _ = std::process::Command::new("open").arg(&url).spawn();
        }
        return Ok(Json(json!({ "success": true })));
    }
    Err(StatusCode::BAD_REQUEST)
}

#[derive(Deserialize)]
struct ArticleReq {
    url: String,
}

async fn post_article_content(
    State(state): State<AppState>,
    Json(body): Json<ArticleReq>,
) -> Result<Json<Value>, StatusCode> {
    let url = body.url.trim();
    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Err(StatusCode::BAD_REQUEST);
    }
    let content = crate::scraper::scrape_url(&state.http_client, url).await;
    Ok(Json(json!({
        "url": url,
        "content": content,
    })))
}

#[derive(Deserialize)]
struct ProxyArticleQuery {
    url: String,
}

async fn get_proxy_article(
    State(state): State<AppState>,
    Query(params): Query<ProxyArticleQuery>,
) -> Result<Response, StatusCode> {
    let target_url = params.url.trim();
    if !target_url.starts_with("http://") && !target_url.starts_with("https://") {
        return Err(StatusCode::BAD_REQUEST);
    }

    let Ok(res) = state.http_client
        .get(target_url)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .timeout(std::time::Duration::from_secs(12))
        .send()
        .await else {
            return Err(StatusCode::BAD_GATEWAY);
        };

    let Ok(mut html) = res.text().await else {
        return Err(StatusCode::BAD_GATEWAY);
    };

    // Inject base href tag so relative resources (styles, images) load properly
    let base_tag = format!(r#"<base href="{}">"#, target_url);
    if let Some(head_pos) = html.find("<head>") {
        html.insert_str(head_pos + 6, &base_tag);
    } else if let Some(head_pos) = html.find("<HEAD>") {
        html.insert_str(head_pos + 6, &base_tag);
    }

    // Remove any meta CSP that blocks framing
    if let Ok(re_csp) = regex::Regex::new(r#"(?is)<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]*>"#) {
        html = re_csp.replace_all(&html, "").into_owned();
    }

    let mut response = Response::new(Body::from(html));
    response.headers_mut().insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("text/html; charset=utf-8"),
    );
    Ok(response)
}

async fn get_discover(
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let category_param = params.get("category")
        .or_else(|| params.get("topics"))
        .map(|s| s.as_str())
        .unwrap_or("tech");
    let source_param = params.get("source")
        .or_else(|| params.get("sources"))
        .map(|s| s.as_str())
        .unwrap_or("");
    let query_param = params.get("q")
        .or_else(|| params.get("search"))
        .map(|s| s.trim().to_lowercase())
        .unwrap_or_default();

    let mut all_sources: std::collections::HashMap<&str, (&str, &str)> = std::collections::HashMap::new();
    all_sources.insert("techcrunch", ("https://techcrunch.com/feed/", "TechCrunch"));
    all_sources.insert("verge", ("https://www.theverge.com/rss/index.xml", "The Verge"));
    all_sources.insert("arstechnica", ("https://feeds.arstechnica.com/arstechnica/index", "Ars Technica"));
    all_sources.insert("wired", ("https://www.wired.com/feed/rss", "Wired"));
    all_sources.insert("arxiv_cs", ("https://export.arxiv.org/rss/cs", "arXiv CS"));
    all_sources.insert("arxiv_ai", ("https://export.arxiv.org/rss/cs.AI", "arXiv AI"));
    all_sources.insert("mit_tech", ("https://www.technologyreview.com/feed/", "MIT Tech Review"));
    all_sources.insert("nature", ("https://www.nature.com/nature.rss", "Nature"));
    all_sources.insert("science_mag", ("https://www.science.org/rss/news_current.xml", "Science"));
    all_sources.insert("science_daily", ("https://www.sciencedaily.com/rss/all.xml", "ScienceDaily"));
    all_sources.insert("medpage", ("https://www.medpagetoday.com/rss/headlines.xml", "MedPage Today"));
    all_sources.insert("yahoo_finance", ("https://finance.yahoo.com/news/rssindex", "Yahoo Finance"));
    all_sources.insert("cnbc", ("https://search.cnbc.com/rs/search/combinedcms/view.xml?profile=120000000&id=10000664", "CNBC"));
    all_sources.insert("wsj", ("https://feeds.a.dj.com/rss/WSJcomUSBusiness.xml", "Wall Street Journal"));
    all_sources.insert("espn", ("https://www.espn.com/espn/rss/news", "ESPN"));
    all_sources.insert("nyt_sports", ("https://rss.nytimes.com/services/xml/rss/nyt/Sports.xml", "NYT Sports"));
    all_sources.insert("artnews", ("https://www.artnews.com/feed/", "ARTnews"));
    all_sources.insert("hyperallergic", ("https://hyperallergic.com/feed/", "Hyperallergic"));
    all_sources.insert("variety", ("https://variety.com/feed/", "Variety"));
    all_sources.insert("eonline", ("https://www.eonline.com/syndication/feeds/rssfeeds/topstories.xml", "E! News"));

    let mut topic_mapping: std::collections::HashMap<&str, Vec<&str>> = std::collections::HashMap::new();
    topic_mapping.insert("tech", vec!["techcrunch", "verge", "arstechnica", "wired"]);
    topic_mapping.insert("technology", vec!["techcrunch", "verge", "arstechnica", "wired"]);
    topic_mapping.insert("ai", vec!["arxiv_ai", "mit_tech", "techcrunch"]);
    topic_mapping.insert("cs", vec!["arxiv_cs", "wired"]);
    topic_mapping.insert("medicine", vec!["medpage", "science_daily"]);
    topic_mapping.insert("health", vec!["medpage", "science_daily"]);
    topic_mapping.insert("science", vec!["nature", "science_mag", "science_daily"]);
    topic_mapping.insert("finance", vec!["yahoo_finance", "cnbc", "wsj"]);
    topic_mapping.insert("business", vec!["yahoo_finance", "cnbc", "wsj"]);
    topic_mapping.insert("sports", vec!["espn", "nyt_sports"]);
    topic_mapping.insert("art", vec!["artnews", "hyperallergic"]);
    topic_mapping.insert("entertainment", vec!["variety", "eonline"]);

    let mut target_feeds: Vec<(&str, &str)> = Vec::new();

    let clean_source = source_param.trim().to_lowercase();
    if !clean_source.is_empty() && clean_source != "all" {
        // Strict source selection: ONLY fetch the selected source!
        for s in clean_source.split(',').map(|x| x.trim()).filter(|x| !x.is_empty()) {
            if let Some(&(url, name)) = all_sources.get(s) {
                target_feeds.push((url, name));
            }
        }
    }

    if target_feeds.is_empty() {
        // Fallback to category feeds
        for topic in category_param.split(',').map(|s| s.trim()).filter(|s| !s.is_empty()) {
            if let Some(source_ids) = topic_mapping.get(topic) {
                for id in source_ids {
                    if let Some(&(url, name)) = all_sources.get(id) {
                        if !target_feeds.iter().any(|(u, _)| *u == url) {
                            target_feeds.push((url, name));
                        }
                    }
                }
            }
        }
    }

    if target_feeds.is_empty() {
        target_feeds.push(all_sources["techcrunch"]);
    }

    let mut fetch_futures = Vec::new();
    for (url, source_name) in target_feeds {
        let client = state.http_client.clone();
        let s_name = source_name.to_string();
        fetch_futures.push(async move {
            if let Ok(res) = client.get(url).timeout(std::time::Duration::from_secs(10)).send().await {
                if let Ok(bytes) = res.bytes().await {
                    if let Ok(parsed) = feed_rs::parser::parse(std::io::Cursor::new(bytes)) {
                        return Some((parsed, s_name));
                    }
                }
            }
            None
        });
    }

    let parsed_feeds = futures::future::join_all(fetch_futures).await;

    struct Article {
        date: chrono::DateTime<chrono::Utc>,
        json: serde_json::Value,
    }

    let mut articles = Vec::new();
    let re_html = regex::Regex::new(r"<[^>]*>").unwrap();

    for feed_res in parsed_feeds {
        if let Some((feed, source_name)) = feed_res {
            for entry in feed.entries.into_iter().take(25) {
                let title = entry.title.map(|t| t.content).unwrap_or_default();
                if title.is_empty() { continue; }

                let url = entry.links.first().map(|l| l.href.clone()).unwrap_or_default();

                let summary_raw = entry.summary.as_ref().map(|s| s.content.clone()).unwrap_or_default();
                let content_body = entry.content.as_ref().and_then(|c| c.body.clone()).unwrap_or_default();
                let combined_raw = format!("{} {}", summary_raw, content_body);
                let content_for_snippet = if !summary_raw.trim().is_empty() { summary_raw } else { content_body };

                // Extract image from media, links, or HTML
                let mut thumbnail = String::new();
                for media in &entry.media {
                    if let Some(content) = media.content.first() {
                        if let Some(media_url) = &content.url {
                            if media_url.as_str().starts_with("http") {
                                thumbnail = media_url.to_string();
                                break;
                            }
                        }
                    }
                    if let Some(thumb) = media.thumbnails.first() {
                        if thumb.image.uri.starts_with("http") {
                            thumbnail = thumb.image.uri.clone();
                            break;
                        }
                    }
                }

                if thumbnail.is_empty() {
                    for link in &entry.links {
                        if let Some(media_type) = &link.media_type {
                            if media_type.starts_with("image/") && link.href.starts_with("http") {
                                thumbnail = link.href.clone();
                                break;
                            }
                        }
                        if link.rel.as_deref() == Some("enclosure") && link.href.starts_with("http") {
                            let href_lower = link.href.to_lowercase();
                            if href_lower.contains(".jpg") || href_lower.contains(".jpeg") || href_lower.contains(".png") || href_lower.contains(".webp") {
                                thumbnail = link.href.clone();
                                break;
                            }
                        }
                    }
                }

                if thumbnail.is_empty() {
                    if let Ok(re_media) = regex::Regex::new(r#"(?i)<media:thumbnail[^>]+url=["'](https?://[^"'>\s]+)["']"#) {
                        if let Some(captures) = re_media.captures(&combined_raw) {
                            if let Some(m) = captures.get(1) {
                                thumbnail = m.as_str().to_string();
                            }
                        }
                    }
                }

                if thumbnail.is_empty() && combined_raw.contains("<img") {
                    if let Ok(re_img) = regex::Regex::new(r#"(?i)<img[^>]+src=["'](https?://[^"'>\s]+)["']"#) {
                        if let Some(captures) = re_img.captures(&combined_raw) {
                            if let Some(m) = captures.get(1) {
                                thumbnail = m.as_str().to_string();
                            }
                        }
                    }
                }

                thumbnail = thumbnail.replace("&#038;", "&").replace("&amp;", "&");

                // Strip HTML for the snippet
                let content_clean = re_html.replace_all(&content_for_snippet, "").into_owned();
                let mut snippet = content_clean.trim().to_string();
                if snippet.len() > 300 {
                    snippet.truncate(300);
                    snippet.push_str("...");
                }

                // Query filter if provided
                if !query_param.is_empty() {
                    let title_lower = title.to_lowercase();
                    let snippet_lower = snippet.to_lowercase();
                    if !title_lower.contains(&query_param) && !snippet_lower.contains(&query_param) {
                        continue;
                    }
                }

                let date = entry.published.or(entry.updated).unwrap_or_else(chrono::Utc::now);

                articles.push(Article {
                    date,
                    json: json!({
                        "title": title,
                        "url": url,
                        "content": snippet,
                        "thumbnail": thumbnail,
                        "source": source_name,
                        "publishedAt": date.to_rfc3339(),
                        "category": category_param,
                    }),
                });
            }
        }
    }

    // Sort by date descending (newest first)
    articles.sort_by(|a, b| b.date.cmp(&a.date));

    // Map to JSON and take up to 60 articles
    let blogs: Vec<serde_json::Value> = articles.into_iter().map(|a| a.json).take(60).collect();

    Ok(Json(json!({ "blogs": blogs })))
}

// Media Handlers
#[derive(Deserialize)]
struct MediaReq {
    query: String,
}

async fn post_images(
    State(state): State<AppState>,
    Json(body): Json<MediaReq>,
) -> Json<Value> {
    let config = state.config.get_config();
    let images = search_images(&state.http_client, &config.search.searxng_url, &body.query).await;
    Json(json!({ "images": images }))
}

async fn post_videos(
    State(state): State<AppState>,
    Json(body): Json<MediaReq>,
) -> Json<Value> {
    let config = state.config.get_config();
    let videos = search_videos(&state.http_client, &config.search.searxng_url, &body.query).await;
    Json(json!({ "videos": videos }))
}

// Uploads Handler
async fn post_uploads() -> Json<Value> {
    let file_id = Uuid::new_v4().to_string();
    Json(json!({
        "files": [{
            "fileId": file_id,
            "fileName": "Uploaded Document",
            "fileExtension": "txt"
        }]
    }))
}

// Chat Streaming Handler
#[derive(Deserialize)]
struct ProviderModelSelection {
    #[serde(rename = "providerId")]
    provider_id: String,
    key: String,
}

#[derive(Deserialize)]
struct ChatMessagePayload {
    #[serde(rename = "messageId")]
    message_id: String,
    #[serde(rename = "chatId")]
    chat_id: String,
    content: String,
}

#[derive(Deserialize)]
struct ChatReqBody {
    message: ChatMessagePayload,
    #[serde(rename = "optimizationMode", default = "default_opt_mode")]
    optimization_mode: String,
    #[serde(default)]
    sources: Vec<String>,
    #[serde(default)]
    history: Vec<(String, String)>,
    #[serde(default)]
    files: Vec<String>,
    #[serde(rename = "chatModel")]
    chat_model: ProviderModelSelection,
    #[serde(rename = "systemInstructions", default)]
    system_instructions: Option<String>,
}

fn default_opt_mode() -> String {
    "balanced".to_string()
}

async fn chat_stream(
    State(state): State<AppState>,
    Json(body): Json<ChatReqBody>,
) -> Response {
    let (tx, rx) = mpsc::channel::<Result<String, std::convert::Infallible>>(100);

    let chat_id = body.message.chat_id.clone();
    let message_id = body.message.message_id.clone();
    let query = body.message.content.clone();
    let backend_id = Uuid::new_v4().to_string();

    // Ensure chat exists
    let _ = state.db.ensure_chat_exists(
        &chat_id,
        &query,
        &json!(body.sources),
        &json!(body.files),
    );

    // Initial message record in DB
    let initial_msg = MessageRecord {
        id: None,
        message_id: message_id.clone(),
        chat_id: chat_id.clone(),
        backend_id: backend_id.clone(),
        query: query.clone(),
        created_at: chrono::Utc::now().to_rfc3339(),
        response_blocks: json!([]),
        status: "answering".to_string(),
    };
    let _ = state.db.save_or_update_message(&initial_msg);

    // Spawn agent in background
    let state_clone = state.clone();
    tokio::spawn(async move {
        run_chat_agent(state_clone, body, backend_id, tx).await;
    });

    let stream = ReceiverStream::new(rx);
    let body = Body::from_stream(stream);

    Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, HeaderValue::from_static("application/x-ndjson"))
        .header(header::CACHE_CONTROL, HeaderValue::from_static("no-cache"))
        .header(header::CONNECTION, HeaderValue::from_static("keep-alive"))
        .body(body)
        .unwrap()
}

async fn run_chat_agent(
    state: AppState,
    body: ChatReqBody,
    _backend_id: String,
    tx: mpsc::Sender<Result<String, std::convert::Infallible>>,
) {
    let chat_id = body.message.chat_id;
    let message_id = body.message.message_id;
    let query = body.message.content;
    let config = state.config.get_config();

    let provider = config
        .model_providers
        .iter()
        .find(|p| p.id == body.chat_model.provider_id)
        .cloned();

    let mut current_messages: Vec<ChatMessage> = body
        .history
        .into_iter()
        .map(|(role, content)| ChatMessage {
            role: if role == "human" {
                "user".to_string()
            } else {
                "assistant".to_string()
            },
            content,
            tool_calls: None,
            tool_call_id: None,
        })
        .collect();

    current_messages.push(ChatMessage {
        role: "user".to_string(),
        content: query.clone(),
        tool_calls: None,
        tool_call_id: None,
    });

    let mut response_blocks: Vec<Value> = Vec::new();

    // Check if web search is enabled / requested
    // Default to enabled if sources list is empty or contains "web", "academic", or "discussions"
    let web_search_enabled = body.sources.is_empty()
        || body
            .sources
            .iter()
            .any(|s| s == "web" || s == "academic" || s == "discussions");

    let mut gathered_sources: Vec<ChunkSource> = Vec::new();

    if web_search_enabled {
        let research_block_id = Uuid::new_v4().to_string();
        let brave_key = config.search.brave_api_key.as_deref();
        let searx_url = &config.search.searxng_url;

        let (sources, final_research_block) = run_research_agent(
            &state.http_client,
            provider.as_ref(),
            &body.chat_model.key,
            &query,
            &current_messages,
            &body.optimization_mode,
            brave_key,
            searx_url,
            &research_block_id,
            &tx,
        )
        .await;

        gathered_sources = sources;

        if !gathered_sources.is_empty() {
            // Emit Source block for UI card presentation
            let source_items: Vec<Value> = gathered_sources
                .iter()
                .map(|s| {
                    json!({
                        "content": s.content,
                        "metadata": s.metadata
                    })
                })
                .collect();

            let source_block = json!({
                "id": Uuid::new_v4().to_string(),
                "type": "source",
                "data": source_items
            });
            response_blocks.push(source_block.clone());
            let _ = tx
                .send(Ok(format!(
                    "{}\n",
                    json!({ "type": "block", "block": source_block })
                )))
                .await;
        }

        response_blocks.push(final_research_block);
        let _ = tx
            .send(Ok(format!(
                "{}\n",
                json!({ "type": "researchComplete" })
            )))
            .await;
    } else {
        let _ = tx
            .send(Ok(format!(
                "{}\n",
                json!({ "type": "researchComplete" })
            )))
            .await;
    }

    // 2. Text block for answer
    let text_block_id = Uuid::new_v4().to_string();
    let text_block = json!({
        "id": text_block_id,
        "type": "text",
        "data": ""
    });
    response_blocks.push(text_block.clone());
    let _ = tx
        .send(Ok(format!(
            "{}\n",
            json!({ "type": "block", "block": text_block })
        )))
        .await;

    // 3. Writer streaming with citations
    let mut full_text = String::new();
    if let Some(ref prov) = provider {
        let (token_tx, mut token_rx) = mpsc::channel::<String>(100);

        let http_client = state.http_client.clone();
        let prov_clone = prov.clone();
        let chat_model_key = body.chat_model.key.clone();
        let current_messages_clone = current_messages.clone();
        let gathered_sources_clone = gathered_sources.clone();
        let system_instructions = body.system_instructions.clone().unwrap_or_default();
        let optimization_mode = body.optimization_mode.clone();
        let query_clone = query.clone();

        tokio::spawn(async move {
            let base_url = prov_clone.get_effective_base_url();
            let api_key = prov_clone.get_effective_api_key();

            let stream_res = if !gathered_sources_clone.is_empty() {
                stream_writer(
                    &http_client,
                    &prov_clone.provider_type,
                    base_url.as_deref(),
                    api_key.as_deref(),
                    &chat_model_key,
                    &query_clone,
                    &current_messages_clone,
                    &gathered_sources_clone,
                    &system_instructions,
                    &optimization_mode,
                    token_tx.clone(),
                )
                .await
            } else {
                let mut agent_messages = current_messages_clone;
                if !agent_messages.iter().any(|m| m.role == "system") {
                    agent_messages.insert(0, ChatMessage {
                        role: "system".to_string(),
                        content: format!(
                            "You are Noectra AI, an intelligent research and search assistant. Thoroughly address the user's inquiry with depth, precision, clear markdown headings, and informative explanations. If external web search results are not attached, provide a direct, comprehensive, and helpful answer based on your deep knowledge base. Never say you cannot search the web or lack real-time access; respond directly and authoritatively.\n\nUser instructions: {}",
                            system_instructions
                        ),
                        tool_calls: None,
                        tool_call_id: None,
                    });
                }
                crate::models::ModelService::stream_chat(
                    &http_client,
                    &prov_clone.provider_type,
                    base_url.as_deref(),
                    api_key.as_deref(),
                    &chat_model_key,
                    agent_messages,
                    token_tx.clone(),
                )
                .await
            };

            if let Err(e) = stream_res {
                eprintln!("Error in LLM stream: {}", e);
                let _ = token_tx.send(format!("\n\n*Error generating response: {}*", e)).await;
            }
        });

        while let Some(chunk) = token_rx.recv().await {
            full_text.push_str(&chunk);
            let patch_msg = json!({
                "type": "updateBlock",
                "blockId": text_block_id,
                "patch": [
                    {
                        "op": "replace",
                        "path": "/data",
                        "value": full_text
                    }
                ]
            });
            let _ = tx.send(Ok(format!("{}\n", patch_msg))).await;
        }
    } else {
        full_text = "Please configure an active AI provider in settings.".to_string();
        let patch_msg = json!({
            "type": "updateBlock",
            "blockId": text_block_id,
            "patch": [
                {
                    "op": "replace",
                    "path": "/data",
                    "value": full_text
                }
            ]
        });
        let _ = tx.send(Ok(format!("{}\n", patch_msg))).await;
    }

    // Update text block in response_blocks
    for b in response_blocks.iter_mut() {
        if b["id"] == text_block_id {
            b["data"] = json!(full_text);
        }
    }

    // 4. Follow-up suggestions
    if let Some(ref prov) = provider {
        let base_url = prov.get_effective_base_url();
        let api_key = prov.get_effective_api_key();
        let suggestions = crate::agents::suggestions::generate_suggestions(
            &state.http_client,
            &prov.provider_type,
            base_url.as_deref(),
            api_key.as_deref(),
            &body.chat_model.key,
            &current_messages,
        )
        .await;

        if !suggestions.is_empty() {
            let sug_block = json!({
                "id": Uuid::new_v4().to_string(),
                "type": "suggestion",
                "data": suggestions
            });
            response_blocks.push(sug_block.clone());
            let _ = tx
                .send(Ok(format!(
                    "{}\n",
                    json!({ "type": "block", "block": sug_block })
                )))
                .await;
        }
    }

    // 5. Finish stream and persist to database
    let _ = tx.send(Ok(format!("{}\n", json!({ "type": "messageEnd" })))).await;

    let _ = state.db.update_message_response(
        &chat_id,
        &message_id,
        &json!(response_blocks),
        "completed",
    );
}

// ==================== 9Router Lifecycle Handlers ====================

fn check_9router_installed() -> (bool, Option<String>) {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        let where_res = std::process::Command::new("cmd")
            .args(["/C", "where", "9router"])
            .creation_flags(CREATE_NO_WINDOW)
            .output();

        let is_installed = match where_res {
            Ok(out) => out.status.success(),
            Err(_) => false,
        };

        let version = if is_installed {
            let ver_res = std::process::Command::new("cmd")
                .args(["/C", "9router", "--version"])
                .creation_flags(CREATE_NO_WINDOW)
                .output();
            ver_res.ok().and_then(|out| {
                if out.status.success() {
                    let s = String::from_utf8_lossy(&out.stdout).trim().to_string();
                    if !s.is_empty() {
                        Some(s)
                    } else {
                        None
                    }
                } else {
                    None
                }
            })
        } else {
            None
        };

        (is_installed, version)
    }
    #[cfg(not(target_os = "windows"))]
    {
        let which_res = std::process::Command::new("which")
            .arg("9router")
            .output();

        let is_installed = match which_res {
            Ok(out) => out.status.success(),
            Err(_) => false,
        };

        let version = if is_installed {
            let ver_res = std::process::Command::new("9router")
                .arg("--version")
                .output();
            ver_res.ok().and_then(|out| {
                if out.status.success() {
                    let s = String::from_utf8_lossy(&out.stdout).trim().to_string();
                    if !s.is_empty() {
                        Some(s)
                    } else {
                        None
                    }
                } else {
                    None
                }
            })
        } else {
            None
        };

        (is_installed, version)
    }
}

async fn get_9router_status(State(state): State<AppState>) -> Json<Value> {
    let (is_installed, version) = check_9router_installed();

    let mut is_running = false;
    let mut models_count = 0;
    let mut latency_ms: Option<u128> = None;

    let start = std::time::Instant::now();
    if let Ok(res) = state
        .http_client
        .get("http://localhost:20128/v1/models")
        .timeout(std::time::Duration::from_millis(1500))
        .send()
        .await
    {
        if res.status().is_success() {
            is_running = true;
            latency_ms = Some(start.elapsed().as_millis());
            if let Ok(val) = res.json::<Value>().await {
                if let Some(arr) = val["data"]
                    .as_array()
                    .or_else(|| val["models"].as_array())
                    .or_else(|| val.as_array())
                {
                    models_count = arr.len();
                }
            }
        }
    }

    Json(json!({
        "isRunning": is_running,
        "isInstalled": is_installed,
        "version": version.unwrap_or_else(|| "Unknown".to_string()),
        "port": 20128,
        "baseUrl": "http://localhost:20128/v1",
        "dashboardUrl": "http://localhost:20128",
        "modelsCount": models_count,
        "latencyMs": latency_ms
    }))
}

async fn start_9router_service(State(state): State<AppState>) -> Json<Value> {
    // 1. Check if already running
    if let Ok(res) = state
        .http_client
        .get("http://localhost:20128/v1/models")
        .timeout(std::time::Duration::from_millis(1200))
        .send()
        .await
    {
        if res.status().is_success() {
            return Json(json!({
                "success": true,
                "alreadyRunning": true,
                "message": "9Router is already running on http://localhost:20128."
            }));
        }
    }

    // 2. Check if installed
    let (is_installed, _) = check_9router_installed();
    if !is_installed {
        return Json(json!({
            "success": false,
            "notInstalled": true,
            "error": "The '9router' command was not found in system PATH. Please install it globally by running 'npm install -g 9router' in your terminal.",
            "installCommand": "npm install -g 9router"
        }));
    }

    // 3. Spawn background process
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        let spawn_res = std::process::Command::new("cmd")
            .args(["/C", "9router", "--no-browser", "--skip-update"])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn();

        if let Err(e) = spawn_res {
            return Json(json!({
                "success": false,
                "error": format!("Failed to spawn 9router process: {}", e)
            }));
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        let spawn_res = std::process::Command::new("9router")
            .args(["--no-browser", "--skip-update"])
            .spawn();

        if let Err(e) = spawn_res {
            return Json(json!({
                "success": false,
                "error": format!("Failed to spawn 9router process: {}", e)
            }));
        }
    }

    // 4. Poll http://localhost:20128/v1/models for up to 6 seconds
    let mut started = false;
    for _ in 0..12 {
        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
        if let Ok(res) = state
            .http_client
            .get("http://localhost:20128/v1/models")
            .timeout(std::time::Duration::from_millis(800))
            .send()
            .await
        {
            if res.status().is_success() {
                started = true;
                break;
            }
        }
    }

    if started {
        Json(json!({
            "success": true,
            "message": "9Router started successfully and is listening on port 20128."
        }))
    } else {
        Json(json!({
            "success": false,
            "error": "9Router process was launched, but port 20128 did not become ready within 6 seconds. Please verify your 9router installation or run '9router' in CMD."
        }))
    }
}

#[derive(Deserialize)]
struct Ping9RouterPayload {
    #[serde(default)]
    model: Option<String>,
}

async fn ping_9router_model(
    State(state): State<AppState>,
    Json(payload): Json<Ping9RouterPayload>,
) -> Json<Value> {
    let model = payload
        .model
        .filter(|m| !m.trim().is_empty())
        .unwrap_or_else(|| "kr/claude-sonnet-4.5".to_string());

    let test_messages = vec![ChatMessage {
        role: "user".to_string(),
        content: "Ping. Reply with 'pong' only.".to_string(),
        tool_calls: None,
        tool_call_id: None,
    }];

    let start = std::time::Instant::now();
    match crate::models::ModelService::complete(
        &state.http_client,
        "9router",
        Some("http://localhost:20128/v1"),
        None,
        &model,
        test_messages,
    )
    .await
    {
        Ok(reply) => {
            let latency_ms = start.elapsed().as_millis();
            Json(json!({
                "success": true,
                "latencyMs": latency_ms,
                "model": model,
                "reply": reply.trim()
            }))
        }
        Err(err) => Json(json!({
            "success": false,
            "model": model,
            "error": err
        })),
    }
}

