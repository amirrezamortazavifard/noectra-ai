use crate::agents::ChunkSource;
use crate::config::ConfigModelProvider;
use crate::models::{ChatMessage, ModelService};
use crate::scraper::scrape_url;
use crate::tools::{execute_tool, get_researcher_tools, web_search::clean_search_query};
use reqwest::Client;
use serde_json::{json, Value};
use std::collections::HashSet;
use tokio::sync::mpsc;
use uuid::Uuid;

/// Runs the autonomous, multi-turn Researcher Agent (combining Rig & Perplexica paradigms)
/// with real-time UI streaming of sub-steps (reasoning, searching, search_results, reading).
pub async fn run_research_agent(
    client: &Client,
    provider: Option<&ConfigModelProvider>,
    model: &str,
    query: &str,
    history: &[ChatMessage],
    mode: &str,
    brave_api_key: Option<&str>,
    searxng_url: &str,
    research_block_id: &str,
    tx: &mpsc::Sender<Result<String, std::convert::Infallible>>,
) -> (Vec<ChunkSource>, Value) {
    let mut all_sources: Vec<ChunkSource> = Vec::new();
    let mut seen_urls: HashSet<String> = HashSet::new();
    let mut sub_steps: Vec<Value> = Vec::new();

    let max_iterations = match mode {
        "speed" => 2,
        "balanced" => 4,
        "quality" => 7,
        _ => 3,
    };

    // Initial research block placeholder
    let mut research_block = json!({
        "id": research_block_id,
        "type": "research",
        "data": {
            "subSteps": []
        }
    });

    let _ = tx
        .send(Ok(format!(
            "{}\n",
            json!({ "type": "block", "block": research_block })
        )))
        .await;

    // Helper closure to emit sub-step updates in real-time
    let emit_sub_step_patch = |sub_steps: &Vec<Value>| {
        json!({
            "type": "updateBlock",
            "blockId": research_block_id,
            "patch": [
                {
                    "op": "replace",
                    "path": "/data/subSteps",
                    "value": sub_steps
                }
            ]
        })
    };

    let cleaned_main_query = clean_search_query(query);
    let today_utc = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC").to_string();

    let mut agent_messages: Vec<ChatMessage> = Vec::new();

    // Context from conversation history
    let mut history_snippet = String::new();
    for msg in history.iter().rev().take(6) {
        history_snippet.push_str(&format!("{}: {}\n", msg.role, msg.content));
    }

    let initial_user_prompt = format!(
        r#"User Query: "{}"
Key search topic: "{}"
Conversation History:
{}
"#,
        query, cleaned_main_query, history_snippet
    );

    agent_messages.push(ChatMessage {
        role: "user".to_string(),
        content: initial_user_prompt,
        tool_calls: None,
        tool_call_id: None,
    });

    let mut search_performed = false;

    // Multi-turn Agent Loop (Rig Tool Execution & Perplexica Iterative Search)
    for iteration in 0..max_iterations {
        let system_prompt = format!(
            r###"You are an autonomous research agent for Noectra AI.
Your objective is to thoroughly answer the user's inquiry by iteratively selecting and invoking the available tools.
Current Date & Time: {}
Current Iteration: {} of {} (Mode: {})

### AVAILABLE TOOLS:
1. web_search: Search the live web. Provide 1 to 3 targeted keyword queries.
   Example: {{"reasoning": "Looking for latest news and specs", "tool": "web_search", "arguments": {{"queries": ["keyword 1", "keyword 2"]}}}}
2. scrape_url: Read and extract full content from a specific web URL found in search results.
   Example: {{"reasoning": "Reading full article to understand details", "tool": "scrape_url", "arguments": {{"url": "https://example.com/article"}}}}
3. search_wikipedia: Encyclopedic & historical background.
   Example: {{"reasoning": "Checking background definition", "tool": "search_wikipedia", "arguments": {{"query": "subject"}}}}
4. search_arxiv: Academic preprints & AI/ML research papers.
   Example: {{"reasoning": "Searching academic papers", "tool": "search_arxiv", "arguments": {{"query": "paper topic"}}}}
5. get_weather: Weather conditions & forecasts.
   Example: {{"reasoning": "Checking weather", "tool": "get_weather", "arguments": {{"location": "Tehran"}}}}
6. get_stock_price: Stock price & financial quote.
   Example: {{"reasoning": "Checking stock", "tool": "get_stock_price", "arguments": {{"ticker": "NVDA"}}}}
7. done: Finish research when sufficient context is gathered to answer thoroughly.
   Example: {{"reasoning": "Sufficient context gathered.", "tool": "done", "arguments": {{"summary": "Found required details"}}}}

### RULES:
- Respond STRICTLY with a valid JSON object matching the format above. Do NOT include markdown text outside the JSON.
- If you need information, ALWAYS call web_search first with 1 to 3 clear, SEO-friendly keyword queries.
- If you have gathered enough information, call done.
"###,
            today_utc,
            iteration + 1,
            max_iterations,
            mode
        );

        let mut turn_messages = vec![ChatMessage {
            role: "system".to_string(),
            content: system_prompt,
            tool_calls: None,
            tool_call_id: None,
        }];
        turn_messages.extend(agent_messages.clone());

        // Invoke model to decide next action
        let action_result = if let Some(prov) = provider {
            let base_url = prov.get_effective_base_url();
            let api_key = prov.get_effective_api_key();
            let tools_def = json!(get_researcher_tools());

            // Try tool-calling completion first for OpenAI-compatible providers
            if prov.provider_type != "gemini" && prov.provider_type != "anthropic" {
                if let Ok(msg_val) = ModelService::complete_with_tools(
                    client,
                    &prov.provider_type,
                    base_url.as_deref(),
                    api_key.as_deref(),
                    model,
                    turn_messages.clone(),
                    tools_def,
                )
                .await
                {
                    parse_tool_call_from_val(&msg_val)
                } else {
                    ModelService::complete(
                        client,
                        &prov.provider_type,
                        base_url.as_deref(),
                        api_key.as_deref(),
                        model,
                        turn_messages,
                    )
                    .await
                    .ok()
                    .and_then(|text| parse_tool_call_from_text(&text))
                }
            } else {
                ModelService::complete(
                    client,
                    &prov.provider_type,
                    base_url.as_deref(),
                    api_key.as_deref(),
                    model,
                    turn_messages,
                )
                .await
                .ok()
                .and_then(|text| parse_tool_call_from_text(&text))
            }
        } else {
            None
        };

        // Fallback for first iteration if LLM failed to choose a tool
        let (reasoning, tool_name, tool_args) = match action_result {
            Some(call) => call,
            None => {
                if iteration == 0 {
                    (
                        "Searching the web for latest and relevant information".to_string(),
                        "web_search".to_string(),
                        json!({ "queries": [cleaned_main_query.clone(), query.to_string()] }),
                    )
                } else {
                    (
                        "Concluding research phase".to_string(),
                        "done".to_string(),
                        json!({ "summary": "Done" }),
                    )
                }
            }
        };

        // Emit reasoning sub-step if provided
        if !reasoning.trim().is_empty() {
            let reasoning_step = json!({
                "id": Uuid::new_v4().to_string(),
                "type": "reasoning",
                "reasoning": reasoning
            });
            sub_steps.push(reasoning_step);
            let _ = tx.send(Ok(format!("{}\n", emit_sub_step_patch(&sub_steps)))).await;
        }

        // Handle tool invocation
        if tool_name == "done" {
            break;
        }

        if tool_name == "web_search" {
            search_performed = true;
            let mut queries_to_search = Vec::new();
            if let Some(arr) = tool_args["queries"].as_array() {
                for q in arr {
                    if let Some(s) = q.as_str() {
                        if !s.trim().is_empty() {
                            queries_to_search.push(s.trim().to_string());
                        }
                    }
                }
            } else if let Some(q) = tool_args["query"].as_str() {
                if !q.trim().is_empty() {
                    queries_to_search.push(q.trim().to_string());
                }
            }

            if queries_to_search.is_empty() {
                queries_to_search.push(cleaned_main_query.clone());
            }

            // Emit 'searching' sub-step
            let searching_step = json!({
                "id": Uuid::new_v4().to_string(),
                "type": "searching",
                "searching": queries_to_search.clone()
            });
            sub_steps.push(searching_step);
            let _ = tx.send(Ok(format!("{}\n", emit_sub_step_patch(&sub_steps)))).await;

            // Execute web search tool
            let search_output = execute_tool(
                "web_search",
                &json!({ "queries": queries_to_search }),
                client,
                brave_api_key,
                searxng_url,
            )
            .await;

            let mut newly_found: Vec<Value> = Vec::new();
            if let Ok(val) = search_output {
                if let Some(items) = val["results"].as_array() {
                    for item in items {
                        let url = item["url"].as_str().unwrap_or_default().to_string();
                        let title = item["title"].as_str().unwrap_or_default().to_string();
                        let snippet = item["snippet"].as_str().unwrap_or_default().to_string();

                        if url.is_empty() || title.is_empty() {
                            continue;
                        }

                        let url_clean = url.trim().to_lowercase();
                        if !seen_urls.contains(&url_clean) {
                            seen_urls.insert(url_clean);
                            all_sources.push(ChunkSource {
                                content: snippet.clone(),
                                metadata: json!({
                                    "title": title.clone(),
                                    "url": url.clone(),
                                }),
                            });
                            newly_found.push(json!({
                                "content": snippet.clone(),
                                "title": title.clone(),
                                "url": url.clone(),
                                "metadata": {
                                    "title": title.clone(),
                                    "url": url.clone()
                                }
                            }));
                        }
                    }
                }
            }

            // Emit 'search_results' sub-step
            if !newly_found.is_empty() {
                let results_step = json!({
                    "id": Uuid::new_v4().to_string(),
                    "type": "search_results",
                    "reading": newly_found
                });
                sub_steps.push(results_step);
                let _ = tx.send(Ok(format!("{}\n", emit_sub_step_patch(&sub_steps)))).await;
            }

            // Record into agent memory
            agent_messages.push(ChatMessage {
                role: "assistant".to_string(),
                content: format!(
                    "{{\"tool\": \"web_search\", \"arguments\": {}}}",
                    json!({ "queries": queries_to_search })
                ),
                tool_calls: None,
                tool_call_id: None,
            });

            agent_messages.push(ChatMessage {
                role: "user".to_string(),
                content: format!(
                    "Tool 'web_search' found {} results. Continue research or call 'done' if satisfied.",
                    all_sources.len()
                ),
                tool_calls: None,
                tool_call_id: None,
            });
        } else if tool_name == "scrape_url" || tool_name == "open_url" {
            let url = tool_args["url"].as_str().unwrap_or_default().to_string();
            if !url.is_empty() {
                // Emit 'reading' sub-step
                let reading_step = json!({
                    "id": Uuid::new_v4().to_string(),
                    "type": "reading",
                    "reading": [json!({
                        "content": "",
                        "title": url.clone(),
                        "url": url.clone(),
                        "metadata": {
                            "title": url.clone(),
                            "url": url.clone()
                        }
                    })]
                });
                sub_steps.push(reading_step);
                let _ = tx.send(Ok(format!("{}\n", emit_sub_step_patch(&sub_steps)))).await;

                if let Some(scraped_content) = scrape_url(client, &url).await {
                    // Update source content if exists, or append
                    if let Some(source) = all_sources
                        .iter_mut()
                        .find(|s| s.metadata["url"].as_str() == Some(&url))
                    {
                        source.content = scraped_content;
                    } else {
                        all_sources.push(ChunkSource {
                            content: scraped_content,
                            metadata: json!({
                                "title": url.clone(),
                                "url": url.clone()
                            }),
                        });
                    }
                }
            }

            agent_messages.push(ChatMessage {
                role: "assistant".to_string(),
                content: format!("{{\"tool\": \"scrape_url\", \"arguments\": {}}}", tool_args),
                tool_calls: None,
                tool_call_id: None,
            });
            agent_messages.push(ChatMessage {
                role: "user".to_string(),
                content: "Webpage read successfully. Continue research or call 'done'.".to_string(),
                tool_calls: None,
                tool_call_id: None,
            });
        } else {
            // General tool execution (weather, stocks, wikipedia, arxiv)
            let tool_output = execute_tool(
                &tool_name,
                &tool_args,
                client,
                brave_api_key,
                searxng_url,
            )
            .await;

            if let Ok(out_val) = tool_output {
                let out_str = serde_json::to_string(&out_val).unwrap_or_default();
                all_sources.push(ChunkSource {
                    content: out_str.clone(),
                    metadata: json!({
                        "title": format!("Tool: {}", tool_name),
                        "url": format!("tool://{}", tool_name)
                    }),
                });

                agent_messages.push(ChatMessage {
                    role: "assistant".to_string(),
                    content: format!("{{\"tool\": \"{}\", \"arguments\": {}}}", tool_name, tool_args),
                    tool_calls: None,
                    tool_call_id: None,
                });
                agent_messages.push(ChatMessage {
                    role: "user".to_string(),
                    content: format!("Tool result: {}. Wrap up or call 'done'.", out_str),
                    tool_calls: None,
                    tool_call_id: None,
                });
            }
        }

        // In speed mode, 1 search turn is enough
        if mode == "speed" && search_performed {
            break;
        }
    }

    // Fail-safe: If no sources were gathered, run a direct resilient web search
    if all_sources.is_empty() {
        let fallback_step = json!({
            "id": Uuid::new_v4().to_string(),
            "type": "searching",
            "searching": [query.to_string(), cleaned_main_query.clone()]
        });
        sub_steps.push(fallback_step);
        let _ = tx.send(Ok(format!("{}\n", emit_sub_step_patch(&sub_steps)))).await;

        let fallback_output = execute_tool(
            "web_search",
            &json!({ "queries": [cleaned_main_query.clone(), query.to_string()] }),
            client,
            brave_api_key,
            searxng_url,
        )
        .await;

        let mut found_list = Vec::new();
        if let Ok(val) = fallback_output {
            if let Some(items) = val["results"].as_array() {
                for item in items.iter().take(6) {
                    let url = item["url"].as_str().unwrap_or_default().to_string();
                    let title = item["title"].as_str().unwrap_or_default().to_string();
                    let snippet = item["snippet"].as_str().unwrap_or_default().to_string();

                    if !url.is_empty() && !title.is_empty() {
                        let url_clean = url.trim().to_lowercase();
                        if !seen_urls.contains(&url_clean) {
                            seen_urls.insert(url_clean);
                            all_sources.push(ChunkSource {
                                content: snippet.clone(),
                                metadata: json!({
                                    "title": title.clone(),
                                    "url": url.clone(),
                                }),
                            });
                            found_list.push(json!({
                                "content": snippet.clone(),
                                "title": title.clone(),
                                "url": url.clone(),
                                "metadata": {
                                    "title": title.clone(),
                                    "url": url.clone()
                                }
                            }));
                        }
                    }
                }
            }
        }

        if !found_list.is_empty() {
            let res_step = json!({
                "id": Uuid::new_v4().to_string(),
                "type": "search_results",
                "reading": found_list
            });
            sub_steps.push(res_step);
            let _ = tx.send(Ok(format!("{}\n", emit_sub_step_patch(&sub_steps)))).await;
        }
    }

    // Enrich top pages with deep scraping in balanced / quality mode
    if mode != "speed" && !all_sources.is_empty() {
        let scrape_limit = if mode == "quality" { 4 } else { 2 };
        let mut to_scrape: Vec<(usize, String, String)> = Vec::new();

        for (idx, s) in all_sources.iter().enumerate().take(scrape_limit) {
            if let Some(url) = s.metadata["url"].as_str() {
                if url.starts_with("http") {
                    let title = s.metadata["title"].as_str().unwrap_or(url).to_string();
                    to_scrape.push((idx, url.to_string(), title));
                }
            }
        }

        if !to_scrape.is_empty() {
            let reading_items: Vec<Value> = to_scrape
                .iter()
                .map(|(_, u, t)| json!({
                    "content": "",
                    "title": t.clone(),
                    "url": u.clone(),
                    "metadata": {
                        "title": t.clone(),
                        "url": u.clone()
                    }
                }))
                .collect();

            let reading_step = json!({
                "id": Uuid::new_v4().to_string(),
                "type": "reading",
                "reading": reading_items
            });
            sub_steps.push(reading_step);
            let _ = tx.send(Ok(format!("{}\n", emit_sub_step_patch(&sub_steps)))).await;

            for (idx, url, _) in to_scrape {
                if let Some(full_text) = scrape_url(client, &url).await {
                    if full_text.len() > 100 && idx < all_sources.len() {
                        all_sources[idx].content = full_text;
                    }
                }
            }
        }
    }

    // Finalize research block state
    research_block["data"]["subSteps"] = json!(sub_steps);
    (all_sources, research_block)
}

/// Helper function to parse tool call from JSON text
fn parse_tool_call_from_text(text: &str) -> Option<(String, String, Value)> {
    let trimmed = text.trim();
    let json_slice = if let (Some(start), Some(end)) = (trimmed.find('{'), trimmed.rfind('}')) {
        if start < end {
            &trimmed[start..=end]
        } else {
            trimmed
        }
    } else {
        trimmed
    };

    if let Ok(val) = serde_json::from_str::<Value>(json_slice) {
        let reasoning = val["reasoning"]
            .as_str()
            .or_else(|| val["thought"].as_str())
            .or_else(|| val["plan"].as_str())
            .unwrap_or_default()
            .to_string();

        let tool_name = val["tool"]
            .as_str()
            .or_else(|| val["name"].as_str())
            .or_else(|| val["action"].as_str())
            .unwrap_or("done")
            .to_string();

        let args = val
            .get("arguments")
            .or_else(|| val.get("parameters"))
            .cloned()
            .unwrap_or_else(|| json!({}));

        return Some((reasoning, tool_name, args));
    }

    None
}

/// Helper function to parse tool call from OpenAI response structure
fn parse_tool_call_from_val(val: &Value) -> Option<(String, String, Value)> {
    if let Some(tool_calls) = val["tool_calls"].as_array() {
        if let Some(tc) = tool_calls.first() {
            let name = tc["function"]["name"].as_str().unwrap_or("done").to_string();
            let args_raw = tc["function"]["arguments"].as_str().unwrap_or("{}");
            let args_val = serde_json::from_str::<Value>(args_raw).unwrap_or_else(|_| json!({}));
            return Some((String::new(), name, args_val));
        }
    }

    if let Some(content) = val["content"].as_str() {
        return parse_tool_call_from_text(content);
    }

    None
}

/// Backward compatibility wrapper for direct non-streaming calls
#[allow(dead_code)]
pub async fn research(
    client: &Client,
    brave_api_key: Option<&str>,
    searxng_url: &str,
    queries: &[String],
    mode: &str,
) -> Vec<ChunkSource> {
    let mut all_sources = Vec::new();
    let mut seen_urls = HashSet::new();

    let max_results = match mode {
        "speed" => 4,
        "balanced" => 7,
        "quality" => 10,
        _ => 5,
    };

    for query in queries {
        if let Ok(res) = crate::tools::web_search::search_web(client, query, brave_api_key, searxng_url).await {
            if let Some(items) = res.get("results").and_then(|r| r.as_array()) {
                for item in items {
                    let url = item.get("url").and_then(|u| u.as_str()).unwrap_or_default().to_string();
                    let title = item.get("title").and_then(|t| t.as_str()).unwrap_or_default().to_string();
                    let snippet = item.get("snippet").and_then(|s| s.as_str()).unwrap_or_default().to_string();

                    if url.is_empty() || title.is_empty() || seen_urls.contains(&url) {
                        continue;
                    }
                    seen_urls.insert(url.clone());

                    all_sources.push(ChunkSource {
                        content: snippet,
                        metadata: json!({
                            "title": title,
                            "url": url,
                        }),
                    });

                    if all_sources.len() >= max_results {
                        break;
                    }
                }
            }
        }
        if all_sources.len() >= max_results {
            break;
        }
    }

    all_sources
}
