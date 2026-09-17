use reqwest::Client;
use serde_json::{json, Value};
use feed_rs::parser;

pub async fn search_arxiv(client: &Client, query: &str) -> Result<Value, String> {
    // Basic search by all fields (all:)
    let url = format!(
        "http://export.arxiv.org/api/query?search_query=all:{}&start=0&max_results=3",
        urlencoding::encode(query)
    );
    
    let res = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("ArXiv fetch failed: {}", e))?;

    if !res.status().is_success() {
        return Err(format!("ArXiv API returned status: {}", res.status()));
    }

    let bytes = res.bytes().await.map_err(|e| format!("Failed to read ArXiv response: {}", e))?;
    
    let feed = parser::parse(bytes.as_ref()).map_err(|e| format!("XML parse error: {}", e))?;
    
    let mut papers = Vec::new();
    
    for entry in feed.entries.into_iter().take(3) {
        let title = entry.title.map(|t| t.content).unwrap_or_default().replace('\n', " ");
        let summary = entry.summary.map(|s| s.content).unwrap_or_default().replace('\n', " ");
        let link = entry.links.first().map(|l| l.href.clone()).unwrap_or_default();
        let authors: Vec<String> = entry.authors.into_iter().map(|a| a.name).collect();
        
        papers.push(json!({
            "title": title.trim(),
            "summary": summary.trim(),
            "authors": authors,
            "url": link
        }));
    }
    
    if papers.is_empty() {
        Ok(json!({ "error": "No papers found for this query." }))
    } else {
        Ok(json!({ "results": papers }))
    }
}
