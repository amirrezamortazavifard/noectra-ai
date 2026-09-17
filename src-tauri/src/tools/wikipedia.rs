use reqwest::Client;
use serde_json::{json, Value};

pub async fn search_wikipedia(client: &Client, query: &str) -> Result<Value, String> {
    let url = format!(
        "https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&format=json&titles={}",
        urlencoding::encode(query)
    );
    
    let res = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Wikipedia fetch failed: {}", e))?;

    if !res.status().is_success() {
        return Err(format!("Wikipedia API returned status: {}", res.status()));
    }

    let val: Value = res.json().await.map_err(|e| format!("Wikipedia JSON parse error: {}", e))?;
    
    // Extract the text
    let pages = val["query"]["pages"].as_object().ok_or("Invalid format")?;
    for (page_id, page_data) in pages {
        if page_id == "-1" {
            return Ok(json!({ "error": "Page not found on Wikipedia. Try another spelling." }));
        }
        if let Some(extract) = page_data["extract"].as_str() {
            return Ok(json!({
                "title": page_data["title"],
                "summary": extract
            }));
        }
    }
    
    Ok(json!({ "error": "No summary found" }))
}
