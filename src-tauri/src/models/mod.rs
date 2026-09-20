use futures::StreamExt;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::time::Duration;
use tokio::sync::mpsc;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_calls: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_call_id: Option<String>,
}

pub struct ModelService;

impl ModelService {
    pub async fn complete(
        client: &Client,
        provider_type: &str,
        base_url: Option<&str>,
        api_key: Option<&str>,
        model: &str,
        messages: Vec<ChatMessage>,
    ) -> Result<String, String> {
        match provider_type {
            "gemini" => Self::complete_gemini(client, api_key.unwrap_or(""), model, messages).await,
            "anthropic" => Self::complete_anthropic(client, api_key.unwrap_or(""), model, messages).await,
            _ => {
                // OpenAI, Ollama, Groq, LM Studio (OpenAI-compatible)
                let default_base = match provider_type {
                    "ollama" => "http://localhost:11434/v1",
                    "9router" => "http://localhost:20128/v1",
                    "groq" => "https://api.groq.com/openai/v1",
                    "openrouter" => "https://openrouter.ai/api/v1",
                    "xai" => "https://api.x.ai/v1",
                    "mistral" => "https://api.mistral.ai/v1",
                    "minimax" => "https://api.minimax.io/v1",
                    "huggingface" => "https://router.huggingface.co/v1",
                    "nvidia" => "https://integrate.api.nvidia.com/v1",
                    "lmstudio" => "http://localhost:1234/v1",
                    _ => "https://api.openai.com/v1",
                };

                let clean_base = base_url
                    .map(|s| s.trim())
                    .filter(|s| !s.is_empty())
                    .unwrap_or(default_base)
                    .trim_end_matches('/');

                let effective_base = if !clean_base.starts_with("http://") && !clean_base.starts_with("https://") {
                    format!("http://{}", clean_base)
                } else {
                    clean_base.to_string()
                };

                let url = format!("{}/chat/completions", effective_base);

                let req_body = json!({
                    "model": model.trim(),
                    "messages": messages,
                    "temperature": 0.3
                });

                let mut req = client.post(&url).json(&req_body).timeout(Duration::from_secs(60));
                if provider_type == "openrouter" {
                    req = req.header("HTTP-Referer", "https://noectra.ai").header("X-Title", "Noectra AI");
                }
                if let Some(key) = api_key {
                    let key_clean = key.trim();
                    if !key_clean.is_empty() {
                        req = req.header("Authorization", format!("Bearer {}", key_clean));
                    }
                }

                let res = req.send().await.map_err(|e| {
                    if e.is_builder() {
                        format!("Builder error (Invalid URL: {}): {}", url, e)
                    } else if e.is_connect() {
                        format!("Connection refused (Failed to reach host at {}): {}", effective_base, e)
                    } else if e.is_timeout() {
                        format!("Timeout error (Request timed out after 60s): {}", e)
                    } else {
                        format!("Request failed: {}", e)
                    }
                })?;

                if !res.status().is_success() {
                    let status = res.status();
                    let status_code = status.as_u16();
                    let reason = status.canonical_reason().unwrap_or("Error");
                    let err_text = res.text().await.unwrap_or_default();
                    let clean_msg = if let Ok(val) = serde_json::from_str::<Value>(&err_text) {
                        if let Some(msg) = val["error"]["message"].as_str() {
                            msg.to_string()
                        } else if let Some(msg) = val["error"].as_str() {
                            msg.to_string()
                        } else if let Some(msg) = val["message"].as_str() {
                            msg.to_string()
                        } else {
                            err_text
                        }
                    } else {
                        err_text
                    };
                    return Err(format!("HTTP {} ({}): {}", status_code, reason, clean_msg));
                }

                let val: Value = res.json().await.map_err(|e| format!("JSON parse error: {}", e))?;
                val["choices"][0]["message"]["content"]
                    .as_str()
                    .map(|s| s.to_string())
                    .ok_or_else(|| "No content in response".to_string())
            }
        }
    }

    pub async fn complete_with_tools(
        client: &Client,
        provider_type: &str,
        base_url: Option<&str>,
        api_key: Option<&str>,
        model: &str,
        messages: Vec<ChatMessage>,
        tools: Value,
    ) -> Result<Value, String> {
        let default_base = match provider_type {
            "ollama" => "http://localhost:11434/v1",
            "groq" => "https://api.groq.com/openai/v1",
            "openrouter" => "https://openrouter.ai/api/v1",
            "xai" => "https://api.x.ai/v1",
            "mistral" => "https://api.mistral.ai/v1",
            "minimax" => "https://api.minimax.io/v1",
            "huggingface" => "https://router.huggingface.co/v1",
            "nvidia" => "https://integrate.api.nvidia.com/v1",
            "lmstudio" => "http://localhost:1234/v1",
            _ => "https://api.openai.com/v1",
        };

        let clean_base = base_url
            .map(|s| s.trim())
            .filter(|s| !s.is_empty())
            .unwrap_or(default_base)
            .trim_end_matches('/');

        let effective_base = if !clean_base.starts_with("http://") && !clean_base.starts_with("https://") {
            format!("http://{}", clean_base)
        } else {
            clean_base.to_string()
        };

        let url = format!("{}/chat/completions", effective_base);

        let req_body = json!({
            "model": model.trim(),
            "messages": messages,
            "temperature": 0.3,
            "tools": tools
        });

        let mut req = client.post(&url).json(&req_body).timeout(Duration::from_secs(60));
        if provider_type == "openrouter" {
            req = req.header("HTTP-Referer", "https://noectra.ai").header("X-Title", "Noectra AI");
        }
        if let Some(key) = api_key {
            let key_clean = key.trim();
            if !key_clean.is_empty() {
                req = req.header("Authorization", format!("Bearer {}", key_clean));
            }
        }

        let res = req.send().await.map_err(|e| format!("Request failed: {}", e))?;

        if !res.status().is_success() {
            return Err(format!("HTTP {}", res.status().as_u16()));
        }

        let val: Value = res.json().await.map_err(|e| format!("JSON parse error: {}", e))?;
        Ok(val["choices"][0]["message"].clone())
    }

    /// Streaming LLM call sending chunks through an mpsc channel
    pub async fn stream_chat(
        client: &Client,
        provider_type: &str,
        base_url: Option<&str>,
        api_key: Option<&str>,
        model: &str,
        messages: Vec<ChatMessage>,
        tx: mpsc::Sender<String>,
    ) -> Result<(), String> {
        match provider_type {
            "gemini" => {
                Self::stream_gemini(client, base_url, api_key.unwrap_or(""), model, messages, tx).await
            }
            "anthropic" => {
                Self::stream_anthropic(client, api_key.unwrap_or(""), model, messages, tx).await
            }
            _ => {
                let default_base = match provider_type {
                    "ollama" => "http://localhost:11434/v1",
                    "9router" => "http://localhost:20128/v1",
                    "groq" => "https://api.groq.com/openai/v1",
                    "openrouter" => "https://openrouter.ai/api/v1",
                    "xai" => "https://api.x.ai/v1",
                    "mistral" => "https://api.mistral.ai/v1",
                    "minimax" => "https://api.minimax.io/v1",
                    "huggingface" => "https://router.huggingface.co/v1",
                    "nvidia" => "https://integrate.api.nvidia.com/v1",
                    "lmstudio" => "http://localhost:1234/v1",
                    _ => "https://api.openai.com/v1",
                };

                let clean_base = base_url
                    .map(|s| s.trim())
                    .filter(|s| !s.is_empty())
                    .unwrap_or(default_base)
                    .trim_end_matches('/');

                let effective_base = if !clean_base.starts_with("http://") && !clean_base.starts_with("https://") {
                    format!("http://{}", clean_base)
                } else {
                    clean_base.to_string()
                };

                let url = format!("{}/chat/completions", effective_base);

                let req_body = json!({
                    "model": model.trim(),
                    "messages": messages,
                    "stream": true,
                    "temperature": 0.5
                });

                let mut req = client.post(&url).json(&req_body).timeout(Duration::from_secs(120));
                if provider_type == "openrouter" {
                    req = req.header("HTTP-Referer", "https://noectra.ai").header("X-Title", "Noectra AI");
                }
                if let Some(key) = api_key {
                    let key_clean = key.trim();
                    if !key_clean.is_empty() {
                        req = req.header("Authorization", format!("Bearer {}", key_clean));
                    }
                }

                let res = req.send().await.map_err(|e| {
                    if e.is_builder() {
                        format!("Builder error (Invalid URL: {}): {}", url, e)
                    } else if e.is_connect() {
                        format!("Connection refused (Failed to reach host at {}): {}", effective_base, e)
                    } else if e.is_timeout() {
                        format!("Stream timeout error: {}", e)
                    } else {
                        format!("Stream request failed: {}", e)
                    }
                })?;

                if !res.status().is_success() {
                    let status = res.status();
                    let status_code = status.as_u16();
                    let reason = status.canonical_reason().unwrap_or("Error");
                    let err_text = res.text().await.unwrap_or_default();
                    let clean_msg = if let Ok(val) = serde_json::from_str::<Value>(&err_text) {
                        if let Some(msg) = val["error"]["message"].as_str() {
                            msg.to_string()
                        } else if let Some(msg) = val["error"].as_str() {
                            msg.to_string()
                        } else if let Some(msg) = val["message"].as_str() {
                            msg.to_string()
                        } else {
                            err_text
                        }
                    } else {
                        err_text
                    };
                    return Err(format!("HTTP {} ({}): {}", status_code, reason, clean_msg));
                }

                let mut stream = res.bytes_stream();
                let mut buffer = String::new();

                while let Some(item) = stream.next().await {
                    let bytes = match item {
                        Ok(b) => b,
                        Err(e) => {
                            eprintln!("Error reading stream chunk: {}", e);
                            break;
                        }
                    };

                    let text = String::from_utf8_lossy(&bytes);
                    buffer.push_str(&text);

                    while let Some(pos) = buffer.find('\n') {
                        let line = buffer[..pos].trim().to_string();
                        buffer.drain(..=pos);

                        if line.starts_with("data: ") {
                            let data_str = &line[6..].trim();
                            if *data_str == "[DONE]" {
                                break;
                            }
                            if let Ok(parsed) = serde_json::from_str::<Value>(data_str) {
                                if let Some(content) = parsed["choices"][0]["delta"]["content"].as_str() {
                                    if !content.is_empty() {
                                        let _ = tx.send(content.to_string()).await;
                                    }
                                }
                            }
                        }
                    }
                }

                Ok(())
            }
        }
    }

    async fn stream_gemini(
        client: &Client,
        base_url: Option<&str>,
        api_key: &str,
        model: &str,
        messages: Vec<ChatMessage>,
        tx: mpsc::Sender<String>,
    ) -> Result<(), String> {
        let default_base = "https://generativelanguage.googleapis.com";
        let clean_base = base_url
            .map(|s| s.trim())
            .filter(|s| !s.is_empty())
            .unwrap_or(default_base)
            .trim_end_matches('/');

        let effective_base = if !clean_base.starts_with("http://") && !clean_base.starts_with("https://") {
            format!("https://{}", clean_base)
        } else {
            clean_base.to_string()
        };

        let clean_model = model.trim().trim_start_matches("models/");
        let url = format!(
            "{}/v1beta/models/{}:streamGenerateContent?alt=sse&key={}",
            effective_base, clean_model, api_key.trim()
        );

        let mut system_instruction = String::new();
        let mut contents: Vec<Value> = Vec::new();

        for m in &messages {
            if m.role == "system" {
                if !system_instruction.is_empty() {
                    system_instruction.push_str("\n\n");
                }
                system_instruction.push_str(&m.content);
            } else {
                let role = if m.role == "assistant" { "model" } else { "user" };
                if let Some(last) = contents.last_mut() {
                    if last["role"] == role {
                        if let Some(parts) = last["parts"].as_array_mut() {
                            parts.push(json!({ "text": m.content }));
                        }
                        continue;
                    }
                }
                contents.push(json!({
                    "role": role,
                    "parts": [{ "text": m.content }]
                }));
            }
        }

        if contents.is_empty() {
            contents.push(json!({
                "role": "user",
                "parts": [{ "text": "Hello" }]
            }));
        } else if contents[0]["role"] == "model" {
            contents.insert(0, json!({
                "role": "user",
                "parts": [{ "text": "Please continue." }]
            }));
        }

        let mut req_body = json!({
            "contents": contents,
            "tools": [
                { "googleSearch": {} }
            ],
            "generationConfig": {
                "temperature": 0.5
            }
        });
        if !system_instruction.is_empty() {
            req_body["systemInstruction"] = json!({
                "parts": [{ "text": system_instruction }]
            });
        }

        let mut res = client
            .post(&url)
            .json(&req_body)
            .timeout(Duration::from_secs(120))
            .send()
            .await
            .map_err(|e| format!("Gemini stream request failed: {}", e))?;

        // If googleSearch tool is unsupported or rejected (HTTP 400), retry without tools
        if res.status() == reqwest::StatusCode::BAD_REQUEST {
            if let Some(obj) = req_body.as_object_mut() {
                obj.remove("tools");
            }
            res = client
                .post(&url)
                .json(&req_body)
                .timeout(Duration::from_secs(120))
                .send()
                .await
                .map_err(|e| format!("Gemini retry stream request failed: {}", e))?;
        }

        if !res.status().is_success() {
            let status = res.status();
            let status_code = status.as_u16();
            let reason = status.canonical_reason().unwrap_or("Error");
            let err_text = res.text().await.unwrap_or_default();
            let clean_msg = if let Ok(val) = serde_json::from_str::<Value>(&err_text) {
                if let Some(msg) = val["error"]["message"].as_str() {
                    msg.to_string()
                } else {
                    err_text
                }
            } else {
                err_text
            };
            return Err(format!("Gemini HTTP {} ({}): {}", status_code, reason, clean_msg));
        }

        let mut stream = res.bytes_stream();
        let mut buffer = String::new();
        let mut token_count = 0;

        while let Some(item) = stream.next().await {
            let bytes = match item {
                Ok(b) => b,
                Err(e) => {
                    eprintln!("Error reading Gemini stream chunk: {}", e);
                    break;
                }
            };

            let text = String::from_utf8_lossy(&bytes);
            buffer.push_str(&text);

            while let Some(pos) = buffer.find('\n') {
                let line = buffer[..pos].trim().to_string();
                buffer.drain(..=pos);

                if line.starts_with("data: ") {
                    let data_str = &line[6..].trim();
                    if *data_str == "[DONE]" {
                        break;
                    }
                    if let Ok(parsed) = serde_json::from_str::<Value>(data_str) {
                        if let Some(candidates) = parsed["candidates"].as_array() {
                            if let Some(first_cand) = candidates.first() {
                                if let Some(parts) = first_cand["content"]["parts"].as_array() {
                                    for part in parts {
                                        if let Some(chunk_text) = part["text"].as_str() {
                                            if !chunk_text.is_empty() {
                                                token_count += 1;
                                                let _ = tx.send(chunk_text.to_string()).await;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        if token_count == 0 {
            if let Ok(full_resp) = Self::complete_gemini(client, api_key, clean_model, messages).await {
                if !full_resp.is_empty() {
                    let _ = tx.send(full_resp).await;
                }
            }
        }

        Ok(())
    }

    async fn stream_anthropic(
        client: &Client,
        api_key: &str,
        model: &str,
        messages: Vec<ChatMessage>,
        tx: mpsc::Sender<String>,
    ) -> Result<(), String> {
        let url = "https://api.anthropic.com/v1/messages";

        let mut system_prompt = String::new();
        let mut ant_messages = Vec::new();

        for m in &messages {
            if m.role == "system" {
                if !system_prompt.is_empty() {
                    system_prompt.push_str("\n\n");
                }
                system_prompt.push_str(&m.content);
            } else {
                ant_messages.push(json!({
                    "role": m.role,
                    "content": m.content
                }));
            }
        }

        let mut req_body = json!({
            "model": model,
            "max_tokens": 4096,
            "messages": ant_messages,
            "stream": true,
        });
        if !system_prompt.is_empty() {
            req_body["system"] = json!(system_prompt);
        }

        let res = client
            .post(url)
            .header("x-api-key", api_key)
            .header("anthropic-version", "2023-06-01")
            .json(&req_body)
            .timeout(Duration::from_secs(120))
            .send()
            .await
            .map_err(|e| format!("Anthropic stream request failed: {}", e))?;

        if !res.status().is_success() {
            let status = res.status();
            let status_code = status.as_u16();
            let reason = status.canonical_reason().unwrap_or("Error");
            let err_text = res.text().await.unwrap_or_default();
            return Err(format!("Anthropic HTTP {} ({}): {}", status_code, reason, err_text));
        }

        let mut stream = res.bytes_stream();
        let mut buffer = String::new();
        let mut token_count = 0;

        while let Some(item) = stream.next().await {
            let bytes = match item {
                Ok(b) => b,
                Err(e) => {
                    eprintln!("Error reading Anthropic stream chunk: {}", e);
                    break;
                }
            };

            let text = String::from_utf8_lossy(&bytes);
            buffer.push_str(&text);

            while let Some(pos) = buffer.find('\n') {
                let line = buffer[..pos].trim().to_string();
                buffer.drain(..=pos);

                if line.starts_with("data: ") {
                    let data_str = &line[6..].trim();
                    if *data_str == "[DONE]" {
                        break;
                    }
                    if let Ok(parsed) = serde_json::from_str::<Value>(data_str) {
                        if let Some(delta_text) = parsed["delta"]["text"].as_str() {
                            if !delta_text.is_empty() {
                                token_count += 1;
                                let _ = tx.send(delta_text.to_string()).await;
                            }
                        }
                    }
                }
            }
        }

        if token_count == 0 {
            if let Ok(full_resp) = Self::complete_anthropic(client, api_key, model, messages).await {
                if !full_resp.is_empty() {
                    let _ = tx.send(full_resp).await;
                }
            }
        }

        Ok(())
    }

    async fn complete_gemini(
        client: &Client,
        api_key: &str,
        model: &str,
        messages: Vec<ChatMessage>,
    ) -> Result<String, String> {
        let clean_model = model.trim().trim_start_matches("models/");
        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
            clean_model, api_key.trim()
        );

        let mut system_instruction = String::new();
        let mut contents: Vec<Value> = Vec::new();

        for m in messages {
            if m.role == "system" {
                if !system_instruction.is_empty() {
                    system_instruction.push_str("\n\n");
                }
                system_instruction.push_str(&m.content);
            } else {
                let role = if m.role == "assistant" { "model" } else { "user" };
                if let Some(last) = contents.last_mut() {
                    if last["role"] == role {
                        if let Some(parts) = last["parts"].as_array_mut() {
                            parts.push(json!({ "text": m.content }));
                        }
                        continue;
                    }
                }
                contents.push(json!({
                    "role": role,
                    "parts": [{ "text": m.content }]
                }));
            }
        }

        if contents.is_empty() {
            contents.push(json!({
                "role": "user",
                "parts": [{ "text": "Hello" }]
            }));
        } else if contents[0]["role"] == "model" {
            contents.insert(0, json!({
                "role": "user",
                "parts": [{ "text": "Please continue." }]
            }));
        }

        let mut req_body = json!({
            "contents": contents,
            "generationConfig": {
                "temperature": 0.3
            }
        });
        if !system_instruction.is_empty() {
            req_body["systemInstruction"] = json!({
                "parts": [{ "text": system_instruction }]
            });
        }

        let res = client
            .post(&url)
            .json(&req_body)
            .send()
            .await
            .map_err(|e| format!("Gemini request failed: {}", e))?;

        if !res.status().is_success() {
            let status = res.status();
            let status_code = status.as_u16();
            let reason = status.canonical_reason().unwrap_or("Error");
            let err_text = res.text().await.unwrap_or_default();
            let clean_msg = if let Ok(val) = serde_json::from_str::<Value>(&err_text) {
                if let Some(msg) = val["error"]["message"].as_str() {
                    msg.to_string()
                } else if let Some(msg) = val["message"].as_str() {
                    msg.to_string()
                } else {
                    err_text
                }
            } else {
                err_text
            };
            return Err(format!("Gemini HTTP {} ({}): {}", status_code, reason, clean_msg));
        }

        let val: Value = res.json().await.map_err(|e| format!("Gemini JSON parse failed: {}", e))?;
        val["candidates"][0]["content"]["parts"][0]["text"]
            .as_str()
            .map(|s| s.to_string())
            .ok_or_else(|| "No content from Gemini".to_string())
    }

    async fn complete_anthropic(
        client: &Client,
        api_key: &str,
        model: &str,
        messages: Vec<ChatMessage>,
    ) -> Result<String, String> {
        let url = "https://api.anthropic.com/v1/messages";

        let mut system_prompt = String::new();
        let mut ant_messages = Vec::new();

        for m in messages {
            if m.role == "system" {
                system_prompt = m.content;
            } else {
                ant_messages.push(json!({
                    "role": m.role,
                    "content": m.content
                }));
            }
        }

        let mut req_body = json!({
            "model": model,
            "max_tokens": 4096,
            "messages": ant_messages
        });
        if !system_prompt.is_empty() {
            req_body["system"] = json!(system_prompt);
        }

        let res = client
            .post(url)
            .header("x-api-key", api_key)
            .header("anthropic-version", "2023-06-01")
            .json(&req_body)
            .send()
            .await
            .map_err(|e| format!("Anthropic request failed: {}", e))?;

        if !res.status().is_success() {
            let status = res.status();
            let status_code = status.as_u16();
            let reason = status.canonical_reason().unwrap_or("Error");
            let err_text = res.text().await.unwrap_or_default();
            let clean_msg = if let Ok(val) = serde_json::from_str::<Value>(&err_text) {
                if let Some(msg) = val["error"]["message"].as_str() {
                    msg.to_string()
                } else if let Some(msg) = val["message"].as_str() {
                    msg.to_string()
                } else {
                    err_text
                }
            } else {
                err_text
            };
            return Err(format!("Anthropic HTTP {} ({}): {}", status_code, reason, clean_msg));
        }

        let val: Value = res.json().await.map_err(|e| format!("Anthropic JSON error: {}", e))?;
        val["content"][0]["text"]
            .as_str()
            .map(|s| s.to_string())
            .ok_or_else(|| "No content from Anthropic".to_string())
    }
}
