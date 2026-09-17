use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConfigModelProvider {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub name: String,
    #[serde(rename = "type")]
    pub provider_type: String,
    #[serde(default)]
    pub base_url: Option<String>,
    #[serde(default)]
    pub api_key: Option<String>,
    #[serde(default = "default_provider_config")]
    pub config: serde_json::Value,
    #[serde(default)]
    pub chat_models: Vec<ModelInfo>,
    #[serde(default)]
    pub embedding_models: Vec<ModelInfo>,
    #[serde(default)]
    pub custom_models: Vec<ModelInfo>,
}

fn default_provider_config() -> serde_json::Value {
    json!({
        "apiKey": "",
        "baseUrl": ""
    })
}

impl ConfigModelProvider {
    pub fn get_effective_base_url(&self) -> Option<String> {
        if let Some(ref u) = self.base_url {
            let t = u.trim();
            if !t.is_empty() {
                return Some(t.to_string());
            }
        }
        for key in &["baseURL", "baseUrl"] {
            if let Some(val) = self.config.get(*key).and_then(|v| v.as_str()) {
                let t = val.trim();
                if !t.is_empty() {
                    return Some(t.to_string());
                }
            }
        }
        None
    }

    pub fn get_effective_api_key(&self) -> Option<String> {
        if let Some(ref k) = self.api_key {
            let t = k.trim();
            if !t.is_empty() {
                return Some(t.to_string());
            }
        }
        for key in &["apiKey", "apikey"] {
            if let Some(val) = self.config.get(*key).and_then(|v| v.as_str()) {
                let t = val.trim();
                if !t.is_empty() {
                    return Some(t.to_string());
                }
            }
        }
        None
    }

    pub fn ensure_config_populated(&mut self) {
        let eff_url = self.get_effective_base_url().unwrap_or_default();
        let eff_key = self.get_effective_api_key().unwrap_or_default();

        self.base_url = if eff_url.is_empty() { None } else { Some(eff_url.clone()) };
        self.api_key = if eff_key.is_empty() { None } else { Some(eff_key.clone()) };

        if self.config.is_null() || !self.config.is_object() {
            self.config = json!({
                "apiKey": eff_key,
                "baseUrl": eff_url.clone(),
                "baseURL": eff_url,
            });
        } else {
            self.config["apiKey"] = json!(eff_key);
            self.config["baseUrl"] = json!(eff_url.clone());
            self.config["baseURL"] = json!(eff_url);
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelInfo {
    pub key: String,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchConfig {
    #[serde(default = "default_searxng_url")]
    pub searxng_url: String,
    #[serde(default)]
    pub brave_api_key: Option<String>,
}

fn default_searxng_url() -> String {
    "https://searx.be".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    pub version: u32,
    pub setup_complete: bool,
    pub preferences: Value,
    pub personalization: Value,
    pub model_providers: Vec<ConfigModelProvider>,
    pub search: SearchConfig,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            version: 1,
            setup_complete: false,
            preferences: json!({
                "theme": "dark",
                "measureUnit": "Metric",
                "autoMediaSearch": true,
                "showWeatherWidget": true
            }),
            personalization: json!({
                "systemInstructions": ""
            }),
            model_providers: vec![
                ConfigModelProvider {
                    id: "openai".to_string(),
                    name: "OpenAI".to_string(),
                    provider_type: "openai".to_string(),
                    base_url: Some("https://api.openai.com/v1".to_string()),
                    api_key: Some("".to_string()),
                    config: json!({
                        "apiKey": "",
                        "baseUrl": "https://api.openai.com/v1"
                    }),
                    chat_models: vec![
                        ModelInfo { key: "gpt-4o".to_string(), name: "GPT-4o".to_string() },
                        ModelInfo { key: "gpt-4o-mini".to_string(), name: "GPT-4o Mini".to_string() },
                    ],
                    embedding_models: vec![
                        ModelInfo { key: "text-embedding-3-small".to_string(), name: "Text Embedding 3 Small".to_string() },
                    ],
                    custom_models: vec![],
                },
                ConfigModelProvider {
                    id: "ollama".to_string(),
                    name: "Ollama".to_string(),
                    provider_type: "ollama".to_string(),
                    base_url: Some("http://localhost:11434".to_string()),
                    api_key: None,
                    config: json!({
                        "apiKey": "",
                        "baseUrl": "http://localhost:11434"
                    }),
                    chat_models: vec![
                        ModelInfo { key: "llama3.2".to_string(), name: "Llama 3.2".to_string() },
                        ModelInfo { key: "qwen2.5".to_string(), name: "Qwen 2.5".to_string() },
                    ],
                    embedding_models: vec![
                        ModelInfo { key: "nomic-embed-text".to_string(), name: "Nomic Embed Text".to_string() },
                    ],
                    custom_models: vec![],
                },
                ConfigModelProvider {
                    id: "groq".to_string(),
                    name: "Groq".to_string(),
                    provider_type: "groq".to_string(),
                    base_url: Some("https://api.groq.com/openai/v1".to_string()),
                    api_key: Some("".to_string()),
                    config: json!({
                        "apiKey": "",
                        "baseUrl": "https://api.groq.com/openai/v1"
                    }),
                    chat_models: vec![
                        ModelInfo { key: "llama-3.3-70b-versatile".to_string(), name: "Llama 3.3 70B".to_string() },
                    ],
                    embedding_models: vec![],
                    custom_models: vec![],
                },
                ConfigModelProvider {
                    id: "gemini".to_string(),
                    name: "Google Gemini".to_string(),
                    provider_type: "gemini".to_string(),
                    base_url: None,
                    api_key: Some("".to_string()),
                    config: json!({
                        "apiKey": "",
                        "baseUrl": ""
                    }),
                    chat_models: vec![
                        ModelInfo { key: "gemini-2.0-flash".to_string(), name: "Gemini 2.0 Flash".to_string() },
                    ],
                    embedding_models: vec![],
                    custom_models: vec![],
                },
            ],
            search: SearchConfig {
                searxng_url: "https://searx.be".to_string(),
                brave_api_key: None,
            },
        }
    }
}

#[derive(Clone)]
pub struct ConfigManager {
    path: PathBuf,
    config: Arc<Mutex<AppConfig>>,
}

impl ConfigManager {
    pub fn new<P: AsRef<Path>>(path: P) -> Self {
        let path_buf = path.as_ref().to_path_buf();
        let mut config: AppConfig = if path_buf.exists() {
            match fs::read_to_string(&path_buf) {
                Ok(content) => serde_json::from_str(&content).unwrap_or_default(),
                Err(_) => AppConfig::default(),
            }
        } else {
            let def = AppConfig::default();
            if let Some(parent) = path_buf.parent() {
                fs::create_dir_all(parent).ok();
            }
            if let Ok(content) = serde_json::to_string_pretty(&def) {
                fs::write(&path_buf, content).ok();
            }
            def
        };

        for prov in config.model_providers.iter_mut() {
            prov.ensure_config_populated();
        }
        if let Ok(content) = serde_json::to_string_pretty(&config) {
            fs::write(&path_buf, content).ok();
        }

        Self {
            path: path_buf,
            config: Arc::new(Mutex::new(config)),
        }
    }

    pub fn get_config(&self) -> AppConfig {
        self.config.lock().unwrap().clone()
    }

    #[allow(dead_code)]
    pub fn is_setup_complete(&self) -> bool {
        self.config.lock().unwrap().setup_complete
    }

    pub fn set_setup_complete(&self, complete: bool) {
        let mut cfg = self.config.lock().unwrap();
        cfg.setup_complete = complete;
        self.save_to_disk(&cfg);
    }

    pub fn update_key_value(&self, key: &str, value: &Value) {
        let mut cfg = self.config.lock().unwrap();
        let parts: Vec<&str> = key.split('.').collect();
        if parts.len() == 2 {
            let section = parts[0];
            let subkey = parts[1];
            if section == "preferences" {
                if let Value::Object(ref mut map) = cfg.preferences {
                    map.insert(subkey.to_string(), value.clone());
                }
            } else if section == "personalization" {
                if let Value::Object(ref mut map) = cfg.personalization {
                    map.insert(subkey.to_string(), value.clone());
                }
            } else if section == "search" {
                if subkey == "searxngURL" || subkey == "searxng_url" {
                    if let Some(url) = value.as_str() {
                        cfg.search.searxng_url = url.to_string();
                    }
                } else if subkey == "braveApiKey" || subkey == "brave_api_key" {
                    cfg.search.brave_api_key = value.as_str().map(|s| s.trim().to_string()).filter(|s| !s.is_empty());
                }
            }
        }
        self.save_to_disk(&cfg);
    }

    pub fn add_or_update_provider(&self, mut provider: ConfigModelProvider) -> ConfigModelProvider {
        let mut cfg = self.config.lock().unwrap();
        if provider.id.is_empty() {
            provider.id = uuid::Uuid::new_v4().to_string();
        }
        if provider.name.is_empty() {
            provider.name = match provider.provider_type.as_str() {
                "openrouter" => "OpenRouter".to_string(),
                "custom" => "9router / Custom".to_string(),
                _ => format!("{} Connection", provider.provider_type),
            };
        }
        if provider.chat_models.is_empty() {
            let defaults: Vec<(&str, &str)> = match provider.provider_type.as_str() {
                "openai" => vec![
                    ("gpt-4o", "GPT-4o"),
                    ("gpt-4o-mini", "GPT-4o Mini"),
                    ("o3-mini", "o3-mini"),
                ],
                "anthropic" => vec![
                    ("claude-3-7-sonnet-20250219", "Claude 3.7 Sonnet"),
                    ("claude-3-5-sonnet-20241022", "Claude 3.5 Sonnet"),
                    ("claude-3-5-haiku-20241022", "Claude 3.5 Haiku"),
                ],
                "gemini" => vec![
                    ("gemini-2.5-flash", "Gemini 2.5 Flash"),
                    ("gemini-2.5-pro", "Gemini 2.5 Pro"),
                    ("gemini-2.0-flash", "Gemini 2.0 Flash"),
                ],
                "groq" => vec![
                    ("llama-3.3-70b-versatile", "Llama 3.3 70B"),
                    ("llama-3.1-8b-instant", "Llama 3.1 8B Instant"),
                    ("deepseek-r1-distill-llama-70b", "DeepSeek R1 Distill 70B"),
                ],
                "xai" => vec![
                    ("grok-2-latest", "Grok 2"),
                    ("grok-2-vision-1212", "Grok 2 Vision"),
                ],
                "mistral" => vec![
                    ("mistral-large-latest", "Mistral Large"),
                    ("mistral-small-latest", "Mistral Small"),
                    ("codestral-latest", "Codestral"),
                ],
                "minimax" => vec![
                    ("MiniMax-M2.7", "MiniMax-M2.7"),
                    ("MiniMax-M2.5", "MiniMax-M2.5"),
                ],
                "huggingface" => vec![
                    ("deepseek-ai/DeepSeek-R1", "DeepSeek-R1"),
                    ("deepseek-ai/DeepSeek-V3", "DeepSeek-V3"),
                ],
                "nvidia" => vec![
                    ("meta/llama-3.3-70b-instruct", "Llama 3.3 70B (NIM)"),
                    ("deepseek-ai/deepseek-r1", "DeepSeek-R1 (NIM)"),
                ],
                "openrouter" => vec![
                    ("deepseek/deepseek-r1:free", "DeepSeek-R1 (Free)"),
                    ("deepseek/deepseek-chat", "DeepSeek-V3"),
                    ("anthropic/claude-3.5-sonnet", "Claude 3.5 Sonnet"),
                ],
                "azure" => vec![
                    ("gpt-4o", "GPT-4o"),
                    ("gpt-4o-mini", "GPT-4o Mini"),
                ],
                "ollama" => vec![
                    ("llama3.2", "Llama 3.2"),
                    ("deepseek-r1", "DeepSeek R1"),
                ],
                "lmstudio" => vec![
                    ("local-model", "Active Loaded Model"),
                ],
                _ => vec![
                    ("default-model", "Default Model"),
                ],
            };
            provider.chat_models = defaults
                .into_iter()
                .map(|(k, n)| ModelInfo { key: k.to_string(), name: n.to_string() })
                .collect();
        }
        provider.ensure_config_populated();
        if provider.api_key.is_none() {
            provider.api_key = provider.config.get("apiKey")
                .or_else(|| provider.config.get("apikey"))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
        }
        if provider.base_url.is_none() {
            provider.base_url = provider.config.get("baseUrl")
                .or_else(|| provider.config.get("baseURL"))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
        }
        if let Some(pos) = cfg.model_providers.iter().position(|p| p.id == provider.id) {
            cfg.model_providers[pos] = provider.clone();
        } else {
            cfg.model_providers.push(provider.clone());
        }
        self.save_to_disk(&cfg);
        provider
    }

    pub fn add_model(&self, provider_id: &str, name: String, key: String, model_type: &str) -> bool {
        let mut cfg = self.config.lock().unwrap();
        if let Some(pos) = cfg.model_providers.iter().position(|p| p.id == provider_id) {
            let model = ModelInfo {
                key: key.trim().to_string(),
                name: name.trim().to_string(),
            };
            if model_type == "chat" {
                if !cfg.model_providers[pos].chat_models.iter().any(|m| m.key == model.key) {
                    cfg.model_providers[pos].chat_models.push(model);
                }
            } else if model_type == "embedding" {
                if !cfg.model_providers[pos].embedding_models.iter().any(|m| m.key == model.key) {
                    cfg.model_providers[pos].embedding_models.push(model);
                }
            }
            self.save_to_disk(&cfg);
            return true;
        }
        false
    }

    pub fn delete_model(&self, provider_id: &str, key: &str, model_type: &str) -> bool {
        let mut cfg = self.config.lock().unwrap();
        if let Some(pos) = cfg.model_providers.iter().position(|p| p.id == provider_id) {
            if model_type == "chat" {
                cfg.model_providers[pos].chat_models.retain(|m| m.key != key);
            } else if model_type == "embedding" {
                cfg.model_providers[pos].embedding_models.retain(|m| m.key != key);
            }
            self.save_to_disk(&cfg);
            return true;
        }
        false
    }

    pub fn delete_provider(&self, provider_id: &str) {
        let mut cfg = self.config.lock().unwrap();
        cfg.model_providers.retain(|p| p.id != provider_id);
        self.save_to_disk(&cfg);
    }

    fn save_to_disk(&self, cfg: &AppConfig) {
        if let Ok(content) = serde_json::to_string_pretty(cfg) {
            fs::write(&self.path, content).ok();
        }
    }

    pub fn get_ui_config_sections(&self) -> Value {
        json!({
            "preferences": [
                {
                    "name": "Theme",
                    "key": "theme",
                    "type": "select",
                    "options": [
                        { "name": "Light", "value": "light" },
                        { "name": "Dark", "value": "dark" }
                    ],
                    "required": false,
                    "description": "Choose between light and dark layouts for the app.",
                    "default": "dark",
                    "scope": "client"
                },
                {
                    "name": "Measurement Unit",
                    "key": "measureUnit",
                    "type": "select",
                    "options": [
                        { "name": "Imperial", "value": "Imperial" },
                        { "name": "Metric", "value": "Metric" }
                    ],
                    "required": false,
                    "description": "Choose between Metric and Imperial measurement unit.",
                    "default": "Metric",
                    "scope": "client"
                },
                {
                    "name": "Auto video & image search",
                    "key": "autoMediaSearch",
                    "type": "switch",
                    "required": false,
                    "description": "Automatically search for relevant images and videos.",
                    "default": true,
                    "scope": "client"
                },
                {
                    "name": "Show weather widget",
                    "key": "showWeatherWidget",
                    "type": "switch",
                    "required": false,
                    "description": "Display the weather card on the home screen.",
                    "default": true,
                    "scope": "client"
                },
                {
                    "name": "Interface Sound Effects",
                    "key": "soundEffectsEnabled",
                    "type": "switch",
                    "required": false,
                    "description": "Play organic audio cues for research synthesis, completions, and notifications.",
                    "default": true,
                    "scope": "client"
                }
            ],
            "personalization": [
                {
                    "name": "System Instructions",
                    "key": "systemInstructions",
                    "type": "textarea",
                    "required": false,
                    "description": "Instructions for the AI to adhere to.",
                    "default": "",
                    "scope": "server"
                }
            ],
            "search": [
                {
                    "name": "Brave Search API Key",
                    "key": "braveApiKey",
                    "type": "text",
                    "required": false,
                    "description": "Optional Brave Search API key for official Brave Web Search results.",
                    "default": "",
                    "scope": "server"
                },
                {
                    "name": "SearXNG URL",
                    "key": "searxngURL",
                    "type": "text",
                    "required": false,
                    "description": "Optional custom URL of your SearXNG instance (e.g. http://localhost:8080).",
                    "default": "https://searx.be",
                    "scope": "server"
                }
            ],
            "modelProviders": [
                {
                    "name": "OpenAI",
                    "key": "openai",
                    "fields": [
                        {
                            "type": "password",
                            "name": "API Key",
                            "key": "apiKey",
                            "description": "Your OpenAI API key",
                            "required": true,
                            "placeholder": "OpenAI API Key",
                            "scope": "server"
                        },
                        {
                            "type": "string",
                            "name": "Base URL",
                            "key": "baseURL",
                            "description": "The base URL for the OpenAI API",
                            "required": true,
                            "placeholder": "OpenAI Base URL",
                            "default": "https://api.openai.com/v1",
                            "scope": "server"
                        }
                    ]
                },
                {
                    "name": "Ollama",
                    "key": "ollama",
                    "fields": [
                        {
                            "type": "string",
                            "name": "Base URL",
                            "key": "baseURL",
                            "description": "The base URL for the Ollama API",
                            "required": true,
                            "placeholder": "http://localhost:11434",
                            "default": "http://localhost:11434",
                            "scope": "server"
                        }
                    ]
                },
                {
                    "name": "Groq",
                    "key": "groq",
                    "fields": [
                        {
                            "type": "password",
                            "name": "API Key",
                            "key": "apiKey",
                            "description": "Your Groq API key",
                            "required": true,
                            "placeholder": "Groq API Key",
                            "scope": "server"
                        }
                    ]
                },
                {
                    "name": "Anthropic",
                    "key": "anthropic",
                    "fields": [
                        {
                            "type": "password",
                            "name": "API Key",
                            "key": "apiKey",
                            "description": "Your Anthropic API key",
                            "required": true,
                            "placeholder": "Anthropic API Key",
                            "scope": "server"
                        }
                    ]
                },
                {
                    "name": "Google Gemini",
                    "key": "gemini",
                    "fields": [
                        {
                            "type": "password",
                            "name": "API Key",
                            "key": "apiKey",
                            "description": "Your Google Gemini API key",
                            "required": true,
                            "placeholder": "Gemini API Key",
                            "scope": "server"
                        }
                    ]
                },
                {
                    "name": "xAI (Grok)",
                    "key": "xai",
                    "fields": [
                        {
                            "type": "password",
                            "name": "API Key",
                            "key": "apiKey",
                            "description": "Your xAI Grok API key",
                            "required": true,
                            "placeholder": "xai-...",
                            "scope": "server"
                        },
                        {
                            "type": "string",
                            "name": "Base URL",
                            "key": "baseURL",
                            "description": "xAI API endpoint",
                            "required": false,
                            "placeholder": "https://api.x.ai/v1",
                            "default": "https://api.x.ai/v1",
                            "scope": "server"
                        }
                    ]
                },
                {
                    "name": "Mistral AI",
                    "key": "mistral",
                    "fields": [
                        {
                            "type": "password",
                            "name": "API Key",
                            "key": "apiKey",
                            "description": "Your Mistral API key",
                            "required": true,
                            "placeholder": "Mistral API Key",
                            "scope": "server"
                        },
                        {
                            "type": "string",
                            "name": "Base URL",
                            "key": "baseURL",
                            "description": "Mistral API endpoint",
                            "required": false,
                            "placeholder": "https://api.mistral.ai/v1",
                            "default": "https://api.mistral.ai/v1",
                            "scope": "server"
                        }
                    ]
                },
                {
                    "name": "MiniMax",
                    "key": "minimax",
                    "fields": [
                        {
                            "type": "password",
                            "name": "API Key",
                            "key": "apiKey",
                            "description": "Your MiniMax API key / JWT token",
                            "required": true,
                            "placeholder": "eyJhbGciOi...",
                            "scope": "server"
                        },
                        {
                            "type": "string",
                            "name": "Base URL",
                            "key": "baseURL",
                            "description": "MiniMax API endpoint",
                            "required": false,
                            "placeholder": "https://api.minimax.io/v1",
                            "default": "https://api.minimax.io/v1",
                            "scope": "server"
                        }
                    ]
                },
                {
                    "name": "Hugging Face",
                    "key": "huggingface",
                    "fields": [
                        {
                            "type": "password",
                            "name": "API Key",
                            "key": "apiKey",
                            "description": "Your Hugging Face User Access Token",
                            "required": true,
                            "placeholder": "hf_...",
                            "scope": "server"
                        },
                        {
                            "type": "string",
                            "name": "Base URL",
                            "key": "baseURL",
                            "description": "Hugging Face Inference Router URL",
                            "required": false,
                            "placeholder": "https://router.huggingface.co/v1",
                            "default": "https://router.huggingface.co/v1",
                            "scope": "server"
                        }
                    ]
                },
                {
                    "name": "NVIDIA NIM",
                    "key": "nvidia",
                    "fields": [
                        {
                            "type": "password",
                            "name": "API Key",
                            "key": "apiKey",
                            "description": "Your NVIDIA NGC API Key",
                            "required": true,
                            "placeholder": "nvapi-...",
                            "scope": "server"
                        },
                        {
                            "type": "string",
                            "name": "Base URL",
                            "key": "baseURL",
                            "description": "NVIDIA NIM API endpoint",
                            "required": false,
                            "placeholder": "https://integrate.api.nvidia.com/v1",
                            "default": "https://integrate.api.nvidia.com/v1",
                            "scope": "server"
                        }
                    ]
                },
                {
                    "name": "Azure OpenAI",
                    "key": "azure",
                    "fields": [
                        {
                            "type": "password",
                            "name": "API Key",
                            "key": "apiKey",
                            "description": "Your Azure OpenAI Resource Key",
                            "required": true,
                            "placeholder": "Azure API Key",
                            "scope": "server"
                        },
                        {
                            "type": "string",
                            "name": "Base URL",
                            "key": "baseURL",
                            "description": "Full Azure endpoint e.g. https://YOUR-RESOURCE.openai.azure.com/openai/v1",
                            "required": true,
                            "placeholder": "https://YOUR-RESOURCE.openai.azure.com/openai/v1",
                            "scope": "server"
                        }
                    ]
                },
                {
                    "name": "LM Studio",
                    "key": "lmstudio",
                    "fields": [
                        {
                            "type": "string",
                            "name": "Base URL",
                            "key": "baseURL",
                            "description": "The base URL for the LM Studio API",
                            "required": true,
                            "placeholder": "http://localhost:1234/v1",
                            "default": "http://localhost:1234/v1",
                            "scope": "server"
                        }
                    ]
                },
                {
                    "name": "OpenRouter",
                    "key": "openrouter",
                    "fields": [
                        {
                            "type": "password",
                            "name": "API Key",
                            "key": "apiKey",
                            "description": "Your OpenRouter API Key (sk-or-...)",
                            "required": true,
                            "placeholder": "sk-or-v1-...",
                            "scope": "server"
                        },
                        {
                            "type": "string",
                            "name": "Base URL",
                            "key": "baseURL",
                            "description": "OpenRouter Base URL endpoint",
                            "required": true,
                            "placeholder": "https://openrouter.ai/api/v1",
                            "default": "https://openrouter.ai/api/v1",
                            "scope": "server"
                        }
                    ]
                },
                {
                    "name": "9router / Custom (Local OpenAI)",
                    "key": "custom",
                    "fields": [
                        {
                            "type": "string",
                            "name": "Base URL",
                            "key": "baseURL",
                            "description": "Endpoint URL of your local 9router, proxy or server",
                            "required": true,
                            "placeholder": "http://localhost:8000/v1",
                            "default": "http://localhost:8000/v1",
                            "scope": "server"
                        },
                        {
                            "type": "password",
                            "name": "API Key",
                            "key": "apiKey",
                            "description": "API Key (optional if 9router doesn't require auth)",
                            "required": false,
                            "placeholder": "Optional API Key",
                            "default": "",
                            "scope": "server"
                        }
                    ]
                }
            ]
        })
    }
}
