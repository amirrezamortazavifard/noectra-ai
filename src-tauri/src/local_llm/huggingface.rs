use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};

pub const DEFAULT_PREFERRED_OWNERS: &[&str] = &[
    "ggml-org",
    "bartowski",
    "unsloth",
    "AesSedai",
    "ubergarm",
    "mradermacher",
];

pub const RECOMMENDED_MODELS: &[RecommendedModelDef] = &[
    RecommendedModelDef {
        repo_id: "unsloth/Qwen3.5-4B-GGUF",
        filename: "Qwen3.5-4B-Q4_K_M.gguf",
        name: "Qwen 3.5 4B",
        description: "Lightweight but capable. Great for 8 GB RAM systems.",
        params_b: 4,
        family: "Qwen 3.5",
        quant: "Q4_K_M",
        context: Some(32768),
    },
    RecommendedModelDef {
        repo_id: "unsloth/Qwen3.5-9B-GGUF",
        filename: "Qwen3.5-9B-Q4_K_M.gguf",
        name: "Qwen 3.5 9B",
        description: "Dense 9B model. Strong reasoning and multilingual performance.",
        params_b: 9,
        family: "Qwen 3.5",
        quant: "Q4_K_M",
        context: Some(32768),
    },
    RecommendedModelDef {
        repo_id: "unsloth/gemma-3-12b-it-GGUF",
        filename: "gemma-3-12b-it-Q4_K_M.gguf",
        name: "Gemma 3 12B Instruct",
        description: "Fast, reliable general & medical/survival reasoning for 16 GB systems.",
        params_b: 12,
        family: "Gemma 3",
        quant: "Q4_K_M",
        context: Some(32768),
    },
    RecommendedModelDef {
        repo_id: "unsloth/Qwen3.5-27B-GGUF",
        filename: "Qwen3.5-27B-Q4_K_M.gguf",
        name: "Qwen 3.5 27B",
        description: "High-capability dense model for 24–32 GB+ systems.",
        params_b: 27,
        family: "Qwen 3.5",
        quant: "Q4_K_M",
        context: Some(32768),
    },
    RecommendedModelDef {
        repo_id: "unsloth/Qwen3.5-35B-A3B-GGUF",
        filename: "Qwen3.5-35B-A3B-Q4_K_M.gguf",
        name: "Qwen 3.5 35B MoE (3B active)",
        description: "Fast MoE with 3B active parameters — fast and accurate.",
        params_b: 35,
        family: "Qwen 3.5",
        quant: "Q4_K_M",
        context: Some(32768),
    },
];

pub struct RecommendedModelDef {
    pub repo_id: &'static str,
    pub filename: &'static str,
    pub name: &'static str,
    pub description: &'static str,
    pub params_b: u32,
    pub family: &'static str,
    pub quant: &'static str,
    pub context: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HfModel {
    pub repo_id: String,
    pub name: String,
    pub author: String,
    pub tags: Vec<String>,
    pub files: Vec<HfFile>,
    pub downloads: u64,
    pub likes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HfFile {
    pub filename: String,
    pub size_bytes: u64,
    pub quant: Option<String>,
    pub download_url: String,
    #[serde(default)]
    pub is_split: bool,
    #[serde(default)]
    pub split_parts: Vec<HfFilePart>,
    #[serde(default)]
    pub is_mmproj: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HfFilePart {
    pub filename: String,
    pub size_bytes: u64,
    pub download_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct HfApiModel {
    id: String,
    author: Option<String>,
    tags: Option<Vec<String>>,
    downloads: Option<u64>,
    likes: Option<u64>,
    siblings: Option<Vec<HfApiFile>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct HfApiFile {
    rfilename: String,
    size: Option<u64>,
}

pub async fn search_models(
    client: &reqwest::Client,
    query: &str,
    owner: Option<&str>,
) -> Result<Vec<HfModel>> {
    let mut url = format!(
        "https://huggingface.co/api/models?search={}&filter=gguf&limit=30&sort=downloads",
        urlencoding_simple(query)
    );
    if let Some(owner) = owner {
        if !owner.trim().is_empty() {
            url = format!(
                "https://huggingface.co/api/models?author={}&search={}&filter=gguf&limit=40&sort=downloads",
                owner,
                urlencoding_simple(query)
            );
        }
    }

    let response = client
        .get(&url)
        .header("User-Agent", "noectra-ai/1.1")
        .send()
        .await
        .context("Failed to search HuggingFace")?;

    if !response.status().is_success() {
        anyhow::bail!("HuggingFace API error: {}", response.status());
    }

    let models: Vec<HfApiModel> = response.json().await.context("Failed to parse HF response")?;
    Ok(models.into_iter().map(convert_model).collect())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct HfTreeEntry {
    #[serde(rename = "type")]
    entry_type: String,
    size: Option<u64>,
    path: String,
}

pub fn is_imatrix_file(filename: &str) -> bool {
    let lower = filename.to_lowercase();
    lower.contains("imatrix") || lower.contains("importance_matrix")
}

pub fn is_mmproj_file(filename: &str) -> bool {
    filename.to_lowercase().contains("mmproj")
}

pub fn parse_split_filename(filename: &str) -> Option<(String, u32, u32)> {
    let name = filename.rsplit('/').next().unwrap_or(filename);
    let re = regex::Regex::new(r"^(.+)-(\d{5})-of-(\d{5})\.gguf$").ok()?;
    let caps = re.captures(name)?;
    let base = caps.get(1)?.as_str().to_string();
    let part: u32 = caps.get(2)?.as_str().parse().ok()?;
    let total: u32 = caps.get(3)?.as_str().parse().ok()?;
    Some((base, part, total))
}

fn split_group_key(path: &str) -> Option<String> {
    let dir_prefix = match path.rfind('/') {
        Some(pos) => &path[..=pos],
        None => "",
    };
    let (base, _, total) = parse_split_filename(path)?;
    Some(format!("{}{}-{:05}", dir_prefix, base, total))
}

fn consolidate_files(files: Vec<HfFile>) -> Vec<HfFile> {
    use std::collections::BTreeMap;

    let mut singles: Vec<HfFile> = Vec::new();
    let mut split_groups: BTreeMap<String, Vec<HfFile>> = BTreeMap::new();

    for file in files {
        if let Some(key) = split_group_key(&file.filename) {
            split_groups.entry(key).or_default().push(file);
        } else {
            let basename = file.filename.rsplit('/').next().unwrap_or(&file.filename).to_string();
            let is_mmproj = is_mmproj_file(&basename);
            singles.push(HfFile {
                filename: basename,
                is_split: false,
                split_parts: vec![],
                is_mmproj,
                ..file
            });
        }
    }

    for (_key, mut parts) in split_groups {
        parts.sort_by_key(|f| parse_split_filename(&f.filename).map(|(_, n, _)| n).unwrap_or(0));

        let total_size: u64 = parts.iter().map(|p| p.size_bytes).sum();
        let quant = parts[0].quant.clone();

        let split_parts: Vec<HfFilePart> = parts
            .iter()
            .map(|p| {
                let basename = p.filename.rsplit('/').next().unwrap_or(&p.filename).to_string();
                HfFilePart {
                    filename: basename,
                    size_bytes: p.size_bytes,
                    download_url: p.download_url.clone(),
                }
            })
            .collect();

        let first = &parts[0];
        let first_basename = first.filename.rsplit('/').next().unwrap_or(&first.filename).to_string();

        singles.push(HfFile {
            filename: first_basename,
            size_bytes: total_size,
            quant,
            download_url: first.download_url.clone(),
            is_split: true,
            split_parts,
            is_mmproj: false,
        });
    }

    singles
}

fn fetch_tree_recursive<'a>(
    client: &'a reqwest::Client,
    repo_id: &'a str,
    path: &'a str,
    max_depth: u32,
) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<Vec<HfTreeEntry>>> + Send + 'a>> {
    Box::pin(async move {
        if max_depth == 0 {
            return Ok(vec![]);
        }

        let url = if path.is_empty() {
            format!("https://huggingface.co/api/models/{}/tree/main", repo_id)
        } else {
            format!(
                "https://huggingface.co/api/models/{}/tree/main/{}",
                repo_id, path
            )
        };

        let response = client
            .get(&url)
            .header("User-Agent", "noectra-ai/1.1")
            .send()
            .await
            .context("Failed to fetch repo tree")?;

        if !response.status().is_success() {
            return Ok(vec![]);
        }

        let entries: Vec<HfTreeEntry> = response.json().await.unwrap_or_default();
        let mut result = Vec::new();

        for entry in entries {
            if entry.entry_type == "directory" {
                let sub = fetch_tree_recursive(client, repo_id, &entry.path, max_depth - 1).await?;
                result.extend(sub);
            } else {
                result.push(entry);
            }
        }

        Ok(result)
    })
}

pub async fn get_repo_files(client: &reqwest::Client, repo_id: &str) -> Result<Vec<HfFile>> {
    let entries = fetch_tree_recursive(client, repo_id, "", 3).await?;

    let files: Vec<HfFile> = entries
        .into_iter()
        .filter(|e| e.entry_type == "file" && e.path.ends_with(".gguf"))
        .filter(|e| !is_imatrix_file(&e.path))
        .map(|e| {
            let quant = extract_quant(&e.path);
            let download_url = format!(
                "https://huggingface.co/{}/resolve/main/{}",
                repo_id, e.path
            );
            let is_mmproj = is_mmproj_file(&e.path);
            HfFile {
                filename: e.path,
                size_bytes: e.size.unwrap_or(0),
                quant,
                download_url,
                is_split: false,
                split_parts: vec![],
                is_mmproj,
            }
        })
        .collect();

    Ok(consolidate_files(files))
}

fn convert_model(m: HfApiModel) -> HfModel {
    let repo_id = m.id.clone();
    let author = m
        .author
        .unwrap_or_else(|| repo_id.split('/').next().unwrap_or("unknown").to_string());
    let name = repo_id.split('/').last().unwrap_or(&repo_id).to_string();

    let files: Vec<HfFile> = m
        .siblings
        .unwrap_or_default()
        .into_iter()
        .filter(|f| f.rfilename.ends_with(".gguf"))
        .filter(|f| !is_imatrix_file(&f.rfilename))
        .map(|f| {
            let quant = extract_quant(&f.rfilename);
            let download_url = format!(
                "https://huggingface.co/{}/resolve/main/{}",
                repo_id, f.rfilename
            );
            let is_mmproj = is_mmproj_file(&f.rfilename);
            HfFile {
                filename: f.rfilename,
                size_bytes: f.size.unwrap_or(0),
                quant,
                download_url,
                is_split: false,
                split_parts: vec![],
                is_mmproj,
            }
        })
        .collect();

    let files = consolidate_files(files);

    HfModel {
        repo_id,
        name,
        author,
        tags: m.tags.unwrap_or_default(),
        files,
        downloads: m.downloads.unwrap_or(0),
        likes: m.likes.unwrap_or(0),
    }
}

pub fn extract_quant(filename: &str) -> Option<String> {
    let re = regex::Regex::new(r"(?i)(MXFP\d|IQ\d[_A-Z]*|Q\d[_KM0-9A-Z]+|F16|F32|BF16)").ok()?;
    re.find(filename).map(|m| m.as_str().to_uppercase())
}

fn urlencoding_simple(s: &str) -> String {
    s.chars()
        .map(|c| match c {
            'a'..='z' | 'A'..='Z' | '0'..='9' | '-' | '_' | '.' | '~' => c.to_string(),
            ' ' => '+'.to_string(),
            c => format!("%{:02X}", c as u32),
        })
        .collect()
}
