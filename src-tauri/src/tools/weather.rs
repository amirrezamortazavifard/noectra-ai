use reqwest::Client;
use serde_json::{json, Value};

pub async fn get_weather(client: &Client, location: &str) -> Result<Value, String> {
    let url = format!("https://wttr.in/{}?format=j1", urlencoding::encode(location));
    
    let res = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Weather fetch failed: {}", e))?;

    if !res.status().is_success() {
        return Err(format!("Weather API returned status: {}", res.status()));
    }

    let val: Value = res.json().await.map_err(|e| format!("Weather JSON parse error: {}", e))?;
    
    // Extract the most relevant parts to save tokens
    let current = &val["current_condition"][0];
    let summary = json!({
        "location": location,
        "temperature_c": current["temp_C"],
        "feels_like_c": current["FeelsLikeC"],
        "humidity": current["humidity"],
        "description": current["weatherDesc"][0]["value"],
        "wind_speed_kmh": current["windspeedKmph"],
    });
    
    Ok(summary)
}
