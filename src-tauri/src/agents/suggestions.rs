use crate::models::{ChatMessage, ModelService};
use reqwest::Client;

pub async fn generate_suggestions(
    client: &Client,
    provider_type: &str,
    base_url: Option<&str>,
    api_key: Option<&str>,
    model: &str,
    history: &[ChatMessage],
) -> Vec<String> {
    let mut history_text = String::new();
    for msg in history.iter().rev().take(6) {
        history_text.push_str(&format!("{}: {}\n", msg.role, msg.content));
    }

    let prompt = format!(
        r#"Based on the following conversation, provide exactly 3 concise, highly relevant follow-up questions or search queries the user might want to ask next.
Format your output strictly as a JSON array of 3 strings, like this:
["Question 1", "Question 2", "Question 3"]

Conversation:
{}

Respond ONLY with the JSON array."#,
        history_text
    );

    let messages = vec![
        ChatMessage {
            role: "system".to_string(),
            content: "You are a helpful query suggestion engine. Output ONLY a valid JSON array of 3 strings.".to_string(),
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

    if let Ok(res_text) = ModelService::complete(client, provider_type, base_url, api_key, model, messages).await {
        let trimmed = res_text.trim();
        if let (Some(start), Some(end)) = (trimmed.find('['), trimmed.rfind(']')) {
            if start < end {
                let json_slice = &trimmed[start..=end];
                if let Ok(list) = serde_json::from_str::<Vec<String>>(json_slice) {
                    return list;
                }
            }
        }
    }

    vec![]
}
