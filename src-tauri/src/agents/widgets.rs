use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::time::Duration;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WeatherWidgetOutput {
    pub temperature: f64,
    pub condition: String,
    pub humidity: i64,
    #[serde(rename = "windSpeed")]
    pub wind_speed: f64,
    pub icon: String,
    #[serde(rename = "temperatureUnit")]
    pub temperature_unit: String,
    #[serde(rename = "windSpeedUnit")]
    pub wind_speed_unit: String,
}

pub async fn get_weather_data(
    client: &Client,
    lat: f64,
    lng: f64,
    unit: &str,
) -> Result<WeatherWidgetOutput, String> {
    let is_metric = unit != "Imperial";
    let temp_param = if is_metric { "" } else { "&temperature_unit=fahrenheit" };
    let wind_param = if is_metric { "" } else { "&wind_speed_unit=mph" };

    let url = format!(
        "https://api.open-meteo.com/v1/forecast?latitude={}&longitude={}&current=weather_code,temperature_2m,is_day,relative_humidity_2m,wind_speed_10m&timezone=auto{}{}",
        lat, lng, temp_param, wind_param
    );

    let res = client
        .get(&url)
        .timeout(Duration::from_secs(8))
        .send()
        .await
        .map_err(|e| format!("Weather API error: {}", e))?;

    let data: Value = res.json().await.map_err(|e| format!("Weather JSON error: {}", e))?;

    if let Some(err) = data["error"].as_bool() {
        if err {
            return Err("Weather API returned error".to_string());
        }
    }

    let current = &data["current"];
    let temp = current["temperature_2m"].as_f64().unwrap_or(20.0);
    let humidity = current["relative_humidity_2m"].as_i64().unwrap_or(50);
    let wind_speed = current["wind_speed_10m"].as_f64().unwrap_or(5.0);
    let code = current["weather_code"].as_i64().unwrap_or(0);
    let is_day = current["is_day"].as_i64().unwrap_or(1) == 1;
    let day_or_night = if is_day { "day" } else { "night" };

    let (condition, icon) = match code {
        0 => ("Clear", format!("clear-{}", day_or_night)),
        1 => ("Mainly Clear", format!("cloudy-1-{}", day_or_night)),
        2 => ("Partly Cloudy", format!("cloudy-1-{}", day_or_night)),
        3 => ("Cloudy", format!("cloudy-1-{}", day_or_night)),
        45 | 48 => ("Fog", format!("fog-{}", day_or_night)),
        51..=55 => ("Drizzle", format!("rainy-1-{}", day_or_night)),
        61..=65 => ("Rain", format!("rainy-2-{}", day_or_night)),
        71..=77 => ("Snow", format!("snowy-2-{}", day_or_night)),
        80..=82 => ("Rain Showers", format!("rainy-3-{}", day_or_night)),
        95..=99 => ("Thunderstorm", format!("scattered-thunderstorms-{}", day_or_night)),
        _ => ("Clear", format!("clear-{}", day_or_night)),
    };

    Ok(WeatherWidgetOutput {
        temperature: temp,
        condition: condition.to_string(),
        humidity,
        wind_speed,
        icon,
        temperature_unit: if is_metric { "C".to_string() } else { "F".to_string() },
        wind_speed_unit: if is_metric { "m/s".to_string() } else { "mph".to_string() },
    })
}
