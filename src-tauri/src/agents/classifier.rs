use crate::models::{ChatMessage, ModelService};
use reqwest::Client;
use serde::{Deserialize, Serialize};

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClassificationResult {
    #[serde(rename = "standaloneFollowUp")]
    pub standalone_follow_up: String,
    #[serde(rename = "skipSearch")]
    pub skip_search: bool,
    #[serde(default)]
    pub queries: Vec<String>,
    #[serde(default)]
    pub widgets: Vec<String>,
}

impl Default for ClassificationResult {
    fn default() -> Self {
        Self {
            standalone_follow_up: String::new(),
            skip_search: false,
            queries: vec![],
            widgets: vec![],
        }
    }
}

#[allow(dead_code)]
pub async fn classify(
    client: &Client,
    provider_type: &str,
    base_url: Option<&str>,
    api_key: Option<&str>,
    model: &str,
    query: &str,
    history: &[ChatMessage],
) -> ClassificationResult {
    let mut history_text = String::new();
    for msg in history.iter().rev().take(6) {
        history_text.push_str(&format!("{}: {}\n", msg.role, msg.content));
    }

    let prompt = format!(
        r#"You are a query classifier for an AI search engine.
Given the conversation history and the latest user query, output a JSON object strictly following this schema:
{{
  "standaloneFollowUp": "Clear, self-contained search query incorporating context if needed",
  "skipSearch": false (set to true ONLY for purely conversational greetings like 'hi', 'thank you', 'how are you'),
  "queries": ["1 to 3 search terms for web search"],
  "widgets": ["weather" if asking about weather, "calculation" if asking to calculate math, "stock" if asking for stock quote/price]
}}

Conversation history:
{}

User query: {}

Respond ONLY with valid JSON, nothing else."#,
        history_text, query
    );

    let messages = vec![
        ChatMessage {
            role: "system".to_string(),
            content: "You are a concise JSON classifier. Respond strictly with a JSON object.".to_string(),
            tool_calls: None,
            tool_call_id: None,
        },
        ChatMessage {
            role: "user".to_string(),
            content: prompt,
            tool_calls: None,
            tool_call_id: None,
        },
    ];

    let result = ModelService::complete(client, provider_type, base_url, api_key, model, messages).await;

    if let Ok(res_text) = result {
        let clean_json = extract_json_str(&res_text);
        if let Ok(parsed) = serde_json::from_str::<ClassificationResult>(&clean_json) {
            return parsed;
        }
    }

    // Fallback if LLM classification fails
    let cleaned = crate::tools::web_search::clean_search_query(query);
    let mut fallback_queries = vec![cleaned.clone()];
    if cleaned != query && !cleaned.is_empty() {
        // Also add clean version as primary
    } else {
        fallback_queries = vec![query.to_string()];
    }

    ClassificationResult {
        standalone_follow_up: cleaned,
        skip_search: false,
        queries: fallback_queries,
        widgets: vec![],
    }
}

fn extract_json_str(s: &str) -> String {
    let trimmed = s.trim();
    if let (Some(start), Some(end)) = (trimmed.find('{'), trimmed.rfind('}')) {
        if start < end {
            return trimmed[start..=end].to_string();
        }
    }
    trimmed.to_string()
}
