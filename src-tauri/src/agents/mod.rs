pub mod classifier;
pub mod media;
pub mod researcher;
pub mod suggestions;
pub mod widgets;
pub mod writer;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChunkSource {
    pub content: String,
    pub metadata: serde_json::Value,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum SessionBlock {
    #[serde(rename = "text")]
    Text { id: String, data: String },
    #[serde(rename = "source")]
    Source { id: String, data: Vec<ChunkSource> },
    #[serde(rename = "suggestion")]
    Suggestion { id: String, data: Vec<String> },
    #[serde(rename = "widget")]
    Widget {
        id: String,
        data: WidgetData,
    },
    #[serde(rename = "research")]
    Research {
        id: String,
        data: ResearchData,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WidgetData {
    pub widget_type: String,
    pub params: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResearchData {
    pub sub_steps: Vec<serde_json::Value>,
}
