use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerConfig {
    pub model_path: String,
    #[serde(default)]
    pub mmproj_path: Option<String>,
    pub host: String,
    pub port: u16,
    pub n_ctx: u32,
    pub n_gpu_layers: i32,
    pub n_threads: Option<i32>,
    pub flash_attn: String,
    pub cache_type_k: String,
    pub cache_type_v: String,
    pub temperature: f32,
    pub top_k: i32,
    pub min_p: f32,
    pub top_p: f32,
    pub n_predict: i32,
    pub n_batch: u32,
    pub n_ubatch: u32,
    pub cont_batching: bool,
    pub mlock: bool,
    pub no_mmap: bool,
    pub seed: Option<u64>,
    pub rope_freq_scale: Option<f32>,
    pub rope_freq_base: Option<f32>,
    pub grp_attn_n: Option<u32>,
    pub grp_attn_w: Option<u32>,
    pub parallel: u32,
    #[serde(default)]
    pub no_mmproj_offload: bool,
    #[serde(default)]
    pub extra_params: HashMap<String, String>,
}

impl Default for ServerConfig {
    fn default() -> Self {
        Self {
            model_path: String::new(),
            mmproj_path: None,
            host: "127.0.0.1".to_string(),
            port: 8081,
            n_ctx: 0,
            n_gpu_layers: -1,
            n_threads: None,
            flash_attn: "auto".to_string(),
            cache_type_k: "f16".to_string(),
            cache_type_v: "f16".to_string(),
            temperature: 0.7,
            top_k: 40,
            min_p: 0.05,
            top_p: 0.95,
            n_predict: -1,
            n_batch: 512,
            n_ubatch: 512,
            cont_batching: true,
            mlock: false,
            no_mmap: false,
            seed: None,
            rope_freq_scale: None,
            rope_freq_base: None,
            grp_attn_n: None,
            grp_attn_w: None,
            parallel: 1,
            no_mmproj_offload: false,
            extra_params: HashMap::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ManagedRuntime {
    pub build: u32,
    pub tag_name: String,
    pub backend_id: String,
    pub backend_label: String,
    pub asset_name: String,
    pub dir_name: String,
    pub installed_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomRuntime {
    pub label: String,
    pub binary_path: PathBuf,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum ActiveRuntime {
    Managed {
        build: u32,
        #[serde(default)]
        backend_id: String,
    },
    Custom {
        index: usize,
    },
    #[default]
    None,
}

fn default_true() -> bool {
    true
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct LocalLlmConfig {
    #[serde(skip)]
    pub base_dir: PathBuf,

    #[serde(default)]
    pub managed_runtimes: Vec<ManagedRuntime>,
    #[serde(default)]
    pub custom_runtimes: Vec<CustomRuntime>,
    #[serde(default)]
    pub active_runtime: ActiveRuntime,
    #[serde(default)]
    pub auto_delete_old_runtimes: bool,

    #[serde(default)]
    pub model_dirs: Vec<PathBuf>,
    #[serde(default)]
    pub extra_model_files: Vec<PathBuf>,
    pub download_dir: Option<PathBuf>,

    #[serde(default = "default_true")]
    pub auto_check_updates: bool,
    #[serde(default)]
    pub favorite_models: Vec<String>,
    pub selected_model_id: Option<String>,
    #[serde(default)]
    pub preferred_owners: Vec<String>,

    #[serde(default)]
    pub server_config: ServerConfig,
}

impl LocalLlmConfig {
    pub fn config_path(base_dir: &Path) -> PathBuf {
        base_dir.join("config.json")
    }

    pub fn default_models_dir(base_dir: &Path) -> PathBuf {
        base_dir.join("models")
    }

    pub fn runtimes_base_dir(base_dir: &Path) -> PathBuf {
        base_dir.join("runtimes")
    }

    pub fn gguf_cache_path(base_dir: &Path) -> PathBuf {
        base_dir.join("gguf_cache.json")
    }

    pub fn load(app_data_dir: &Path) -> Result<Self> {
        let base_dir = app_data_dir.join("local_llm");
        let _ = std::fs::create_dir_all(&base_dir);
        let default_models = Self::default_models_dir(&base_dir);
        let _ = std::fs::create_dir_all(&default_models);
        let _ = std::fs::create_dir_all(Self::runtimes_base_dir(&base_dir));

        let path = Self::config_path(&base_dir);
        if !path.exists() {
            let cfg = Self {
                base_dir,
                auto_check_updates: true,
                model_dirs: vec![default_models.clone()],
                download_dir: Some(default_models),
                server_config: ServerConfig::default(),
                ..Default::default()
            };
            let _ = cfg.save();
            return Ok(cfg);
        }

        let content = std::fs::read_to_string(&path)?;
        let mut config: Self = serde_json::from_str(&content).unwrap_or_default();
        config.base_dir = base_dir.clone();

        if config.model_dirs.is_empty() {
            config.model_dirs.push(default_models.clone());
        } else if !config.model_dirs.contains(&default_models) {
            config.model_dirs.insert(0, default_models.clone());
        }
        if config.download_dir.is_none() {
            config.download_dir = Some(default_models);
        }

        Ok(config)
    }

    pub fn save(&self) -> Result<()> {
        let path = Self::config_path(&self.base_dir);
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let content = serde_json::to_string_pretty(self)?;
        std::fs::write(path, content)?;
        Ok(())
    }

    pub fn models_dir(&self) -> PathBuf {
        self.download_dir
            .clone()
            .unwrap_or_else(|| Self::default_models_dir(&self.base_dir))
    }

    pub fn all_model_dirs(&self) -> Vec<PathBuf> {
        if self.model_dirs.is_empty() {
            vec![Self::default_models_dir(&self.base_dir)]
        } else {
            self.model_dirs.clone()
        }
    }

    pub fn runtime_dir(&self) -> Result<PathBuf> {
        match &self.active_runtime {
            ActiveRuntime::Managed { build, backend_id } => {
                let mr = if backend_id.is_empty() {
                    self.managed_runtimes.iter().find(|r| r.build == *build)
                } else {
                    self.managed_runtimes
                        .iter()
                        .find(|r| r.build == *build && r.backend_id == *backend_id)
                };
                if let Some(mr) = mr {
                    Ok(Self::runtimes_base_dir(&self.base_dir).join(&mr.dir_name))
                } else {
                    Ok(self.base_dir.join("runtime"))
                }
            }
            ActiveRuntime::Custom { index } => {
                if let Some(cr) = self.custom_runtimes.get(*index) {
                    Ok(cr
                        .binary_path
                        .parent()
                        .unwrap_or(&cr.binary_path)
                        .to_path_buf())
                } else {
                    anyhow::bail!("Custom runtime index {} not found", index)
                }
            }
            ActiveRuntime::None => Ok(self.base_dir.join("runtime")),
        }
    }

    pub fn active_build(&self) -> Option<u32> {
        match &self.active_runtime {
            ActiveRuntime::Managed { build, .. } => Some(*build),
            _ => None,
        }
    }

    pub fn active_backend_id(&self) -> Option<&str> {
        match &self.active_runtime {
            ActiveRuntime::Managed { backend_id, .. } => Some(backend_id.as_str()),
            _ => None,
        }
    }
}
