use reqwest::Client;
use serde_json::{json, Value};

pub async fn get_stock_price(client: &Client, ticker: &str) -> Result<Value, String> {
    let url = format!("https://query1.finance.yahoo.com/v8/finance/chart/{}", urlencoding::encode(ticker));
    
    let res = client
        .get(&url)
        .header("User-Agent", "Mozilla/5.0") // Yahoo blocks default reqwest UA sometimes
        .send()
        .await
        .map_err(|e| format!("Yahoo Finance fetch failed: {}", e))?;

    if !res.status().is_success() {
        return Err(format!("Yahoo Finance returned status: {}. Note: Check if the ticker '{}' is valid.", res.status(), ticker));
    }

    let val: Value = res.json().await.map_err(|e| format!("Yahoo Finance JSON error: {}", e))?;
    
    let result = &val["chart"]["result"];
    if result.is_null() || result.as_array().map(|a| a.is_empty()).unwrap_or(true) {
        return Ok(json!({ "error": "Ticker not found or no data available" }));
    }
    
    let meta = &result[0]["meta"];
    
    Ok(json!({
        "symbol": meta["symbol"],
        "currency": meta["currency"],
        "regularMarketPrice": meta["regularMarketPrice"],
        "previousClose": meta["chartPreviousClose"],
        "exchangeName": meta["exchangeName"],
        "instrumentType": meta["instrumentType"]
    }))
}
