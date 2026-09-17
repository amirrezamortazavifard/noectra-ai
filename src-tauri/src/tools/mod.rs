pub mod weather;
pub mod wikipedia;
pub mod stocks;
pub mod arxiv;
pub mod web_search;
pub mod url_reader;

use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolDefinition {
    pub name: String,
    pub description: String,
    pub parameters: Value,
}

/// Tools available to the Researcher Agent during iterative web research
pub fn get_researcher_tools() -> Vec<Value> {
    vec![
        json!({
            "type": "function",
            "function": {
                "name": "web_search",
                "description": "Perform live web searches for recent, factual, or current information. Provide 1 to 3 targeted keyword search queries.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "queries": {
                            "type": "array",
                            "items": { "type": "string" },
                            "description": "Array of 1 to 3 concise, SEO-friendly search queries (e.g. ['latest news on AI', 'Claude 3.5 Sonnet benchmarks'])"
                        }
                    },
                    "required": ["queries"],
                    "additionalProperties": false
                }
            }
        }),
        json!({
            "type": "function",
            "function": {
                "name": "scrape_url",
                "description": "Deep-read and extract full text content from a specific web URL found in search results.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "url": {
                            "type": "string",
                            "description": "The exact http or https URL to scrape and read."
                        }
                    },
                    "required": ["url"],
                    "additionalProperties": false
                }
            }
        }),
        json!({
            "type": "function",
            "function": {
                "name": "search_wikipedia",
                "description": "Search Wikipedia for encyclopedic, biographical, or historical background information.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "Search keyword or subject name."
                        }
                    },
                    "required": ["query"],
                    "additionalProperties": false
                }
            }
        }),
        json!({
            "type": "function",
            "function": {
                "name": "search_arxiv",
                "description": "Search ArXiv academic database for scientific papers, machine learning, physics, and mathematics research.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "Academic search query."
                        }
                    },
                    "required": ["query"],
                    "additionalProperties": false
                }
            }
        }),
        json!({
            "type": "function",
            "function": {
                "name": "get_weather",
                "description": "Get current weather conditions and forecast for a city.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "location": {
                            "type": "string",
                            "description": "City or location name, e.g. 'Tehran', 'London', 'Tokyo'"
                        }
                    },
                    "required": ["location"],
                    "additionalProperties": false
                }
            }
        }),
        json!({
            "type": "function",
            "function": {
                "name": "get_stock_price",
                "description": "Get live stock prices and market data for a ticker symbol.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "ticker": {
                            "type": "string",
                            "description": "Stock symbol (e.g. AAPL, NVDA, TSLA, BTC-USD)"
                        }
                    },
                    "required": ["ticker"],
                    "additionalProperties": false
                }
            }
        }),
        json!({
            "type": "function",
            "function": {
                "name": "done",
                "description": "Conclude the research phase when you have gathered sufficient information to answer the user query.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "summary": {
                            "type": "string",
                            "description": "Brief summary of what was found and ready to synthesize."
                        }
                    },
                    "required": [],
                    "additionalProperties": false
                }
            }
        })
    ]
}

/// All available tools for general agent use
#[allow(dead_code)]
pub fn get_available_tools() -> Vec<Value> {
    get_researcher_tools()
}

/// Executes a tool call asynchronously and returns structured JSON output
pub async fn execute_tool(
    name: &str,
    args: &Value,
    client: &Client,
    brave_api_key: Option<&str>,
    searxng_url: &str,
) -> Result<Value, String> {
    match name {
        "web_search" => {
            let mut queries: Vec<String> = Vec::new();
            if let Some(arr) = args["queries"].as_array() {
                for item in arr {
                    if let Some(s) = item.as_str() {
                        let trimmed = s.trim();
                        if !trimmed.is_empty() {
                            queries.push(trimmed.to_string());
                        }
                    }
                }
            } else if let Some(q) = args["query"].as_str() {
                let trimmed = q.trim();
                if !trimmed.is_empty() {
                    queries.push(trimmed.to_string());
                }
            }

            if queries.is_empty() {
                return Ok(json!({ "results": [] }));
            }

            // Execute searches
            let mut combined_results: Vec<Value> = Vec::new();
            let mut seen_urls = std::collections::HashSet::new();

            for q in &queries {
                if let Ok(res) = web_search::search_web(client, q, brave_api_key, searxng_url).await {
                    if let Some(items) = res.get("results").and_then(|r| r.as_array()) {
                        for item in items {
                            if let Some(url) = item["url"].as_str() {
                                let u = url.trim().to_lowercase();
                                if !u.is_empty() && !seen_urls.contains(&u) {
                                    seen_urls.insert(u);
                                    combined_results.push(item.clone());
                                }
                            }
                        }
                    }
                }
            }

            Ok(json!({
                "queries": queries,
                "results": combined_results
            }))
        }
        "scrape_url" | "open_url" => {
            let url = args["url"].as_str().unwrap_or_default();
            url_reader::open_url(client, url).await
        }
        "search_wikipedia" => {
            let query = args["query"].as_str().unwrap_or_default();
            wikipedia::search_wikipedia(client, query).await
        }
        "search_arxiv" => {
            let query = args["query"].as_str().unwrap_or_default();
            arxiv::search_arxiv(client, query).await
        }
        "get_weather" => {
            let location = args["location"].as_str().unwrap_or_default();
            weather::get_weather(client, location).await
        }
        "get_stock_price" => {
            let ticker = args["ticker"].as_str().unwrap_or_default();
            stocks::get_stock_price(client, ticker).await
        }
        "done" => {
            let summary = args["summary"].as_str().unwrap_or("Research complete.");
            Ok(json!({
                "done": true,
                "summary": summary
            }))
        }
        _ => Err(format!("Unknown tool: {}", name)),
    }
}
