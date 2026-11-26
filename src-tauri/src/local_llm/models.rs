use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::Read;
use std::path::{Path, PathBuf};
use tokio::io::AsyncWriteExt;

use crate::local_llm::config::LocalLlmConfig;
use crate::local_llm::huggingface::{self, HfFile, RECOMMENDED_MODELS};
use crate::local_llm::runtime::DownloadProgress;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelInfo {
    pub id: String,
    pub name: String,
    pub repo_id: String,
    pub filename: String,
    pub path: PathBuf,
    pub size_bytes: u64,
    pub quant: Option<String>,
    pub params_b: Option<String>,
    pub context_length: Option<u64>,
    pub is_vision: bool,
    pub mmproj_path: Option<PathBuf>,
    #[serde(default)]
    pub split_files: Vec<PathBuf>,
}

#[derive(Debug, Default)]
struct GgufMeta {
    name: Option<String>,
    architecture: Option<String>,
    size_label: Option<String>,
    context_length: Option<u64>,
    tags: Vec<String>,
}

fn read_gguf_metadata(path: &Path) -> Option<GgufMeta> {
    let mut f = std::fs::File::open(path).ok()?;
    let mut buf4 = [0u8; 4];
    let mut buf8 = [0u8; 8];

    f.read_exact(&mut buf4).ok()?;
    if &buf4 != b"GGUF" {
        return None;
    }

    f.read_exact(&mut buf4).ok()?;
    let _version = u32::from_le_bytes(buf4);

    f.read_exact(&mut buf8).ok()?;

    f.read_exact(&mut buf8).ok()?;
    let kv_count = u64::from_le_bytes(buf8);

    let mut meta = GgufMeta::default();

    for _ in 0..kv_count.min(128) {
        let key = read_gguf_string(&mut f)?;

        f.read_exact(&mut buf4).ok()?;
        let vtype = u32::from_le_bytes(buf4);

        match vtype {
            8 => {
                let val = read_gguf_string(&mut f)?;
                if key == "general.name" {
                    meta.name = Some(val);
                } else if key == "general.architecture" {
                    meta.architecture = Some(val);
                } else if key == "general.size_label" {
                    meta.size_label = Some(val);
                }
            }
            4 | 5 => {
                f.read_exact(&mut buf4).ok()?;
                let val = u32::from_le_bytes(buf4);
                if key.ends_with(".context_length") {
                    meta.context_length = Some(val as u64);
                }
            }
            10 | 11 => {
                f.read_exact(&mut buf8).ok()?;
                let val = u64::from_le_bytes(buf8);
                if key.ends_with(".context_length") {
                    meta.context_length = Some(val);
                }
            }
            0 | 1 => {
                let mut b = [0u8; 1];
                f.read_exact(&mut b).ok()?;
            }
            2 | 3 => {
                let mut b = [0u8; 2];
                f.read_exact(&mut b).ok()?;
            }
            6 => {
                f.read_exact(&mut buf4).ok()?;
            }
            7 => {
                let mut b = [0u8; 1];
                f.read_exact(&mut b).ok()?;
            }
            12 => {
                f.read_exact(&mut buf8).ok()?;
            }
            9 => {
                f.read_exact(&mut buf4).ok()?;
                let atype = u32::from_le_bytes(buf4);
                f.read_exact(&mut buf8).ok()?;
                let alen = u64::from_le_bytes(buf8);
                match atype {
                    0 | 1 | 7 => {
                        let mut b = vec![0u8; (alen as usize).min(1_000_000)];
                        f.read_exact(&mut b).ok()?;
                    }
                    2 | 3 => {
                        let mut b = vec![0u8; (alen as usize * 2).min(2_000_000)];
                        f.read_exact(&mut b).ok()?;
                    }
                    4 | 5 | 6 => {
                        let mut b = vec![0u8; (alen as usize * 4).min(4_000_000)];
                        f.read_exact(&mut b).ok()?;
                    }
                    10 | 11 | 12 => {
                        let mut b = vec![0u8; (alen as usize * 8).min(8_000_000)];
                        f.read_exact(&mut b).ok()?;
                    }
                    8 => {
                        let mut strings = Vec::new();
                        for _ in 0..alen.min(512) {
                            if let Some(s) = read_gguf_string(&mut f) {
                                strings.push(s);
                            }
                        }
                        if key == "general.tags" {
                            meta.tags = strings;
                        }
                    }
                    _ => break,
                }
            }
            _ => break,
        }
    }

    Some(meta)
}

fn read_gguf_string(f: &mut std::fs::File) -> Option<String> {
    let mut buf8 = [0u8; 8];
    f.read_exact(&mut buf8).ok()?;
    let len = u64::from_le_bytes(buf8) as usize;
    if len > 1_000_000 {
        return None;
    }
    let mut buf = vec![0u8; len];
    f.read_exact(&mut buf).ok()?;
    Some(String::from_utf8_lossy(&buf).to_string())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecommendedModel {
    pub repo_id: String,
    pub filename: String,
    pub name: String,
    pub description: String,
    pub params_b: u32,
    pub family: String,
    pub quant: String,
    pub context: Option<u32>,
    pub estimated_size_mb: u64,
    pub installed: bool,
    pub installed_path: Option<PathBuf>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct GgufCacheEntry {
    size_bytes: u64,
    mtime_secs: i64,
    meta_name: Option<String>,
    meta_size_label: Option<String>,
    meta_context_length: Option<u64>,
    #[serde(default)]
    is_vision: bool,
    #[serde(default)]
    is_mmproj: bool,
}

type GgufCache = HashMap<String, GgufCacheEntry>;

fn load_cache(base_dir: &Path) -> GgufCache {
    let path = LocalLlmConfig::gguf_cache_path(base_dir);
    match std::fs::read_to_string(&path) {
        Ok(content) => serde_json::from_str(&content).unwrap_or_default(),
        Err(_) => HashMap::new(),
    }
}

fn save_cache(base_dir: &Path, cache: &GgufCache) {
    let path = LocalLlmConfig::gguf_cache_path(base_dir);
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    if let Ok(content) = serde_json::to_string(cache) {
        let _ = std::fs::write(path, content);
    }
}

fn file_mtime_secs(metadata: &std::fs::Metadata) -> i64 {
    metadata
        .modified()
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

pub fn list_installed_models(config: &LocalLlmConfig) -> Result<Vec<ModelInfo>> {
    let mut models = Vec::new();
    let mut seen_paths = std::collections::HashSet::new();
    let mut cache = load_cache(&config.base_dir);
    let mut cache_dirty = false;

    for dir in config.all_model_dirs() {
        if dir.exists() {
            scan_gguf_recursive(
                &dir,
                &dir,
                &mut models,
                &mut seen_paths,
                &mut cache,
                &mut cache_dirty,
                5,
            );
        }
    }

    for extra_path in &config.extra_model_files {
        if extra_path.is_file() {
            let parent = extra_path.parent().unwrap_or_else(|| Path::new("."));
            register_single_gguf(
                parent,
                extra_path,
                &mut models,
                &mut seen_paths,
                &mut cache,
                &mut cache_dirty,
            );
        }
    }

    if cache_dirty {
        save_cache(&config.base_dir, &cache);
    }

    models = consolidate_split_models(models);
    models.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(models)
}

fn consolidate_split_models(models: Vec<ModelInfo>) -> Vec<ModelInfo> {
    use std::collections::BTreeMap;

    let mut singles = Vec::new();
    let mut split_groups: BTreeMap<String, Vec<ModelInfo>> = BTreeMap::new();

    for model in models {
        if let Some((base, _part, total)) = huggingface::parse_split_filename(&model.filename) {
            let dir = model
                .path
                .parent()
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_default();
            let key = format!("{}|{}-{:05}", dir, base, total);
            split_groups.entry(key).or_default().push(model);
        } else {
            singles.push(model);
        }
    }

    for (_key, mut parts) in split_groups {
        let expected_total = huggingface::parse_split_filename(&parts[0].filename)
            .map(|(_, _, t)| t)
            .unwrap_or(0) as usize;

        if parts.len() != expected_total {
            singles.extend(parts);
            continue;
        }

        parts.sort_by_key(|m| {
            huggingface::parse_split_filename(&m.filename)
                .map(|(_, n, _)| n)
                .unwrap_or(0)
        });

        let total_size: u64 = parts.iter().map(|p| p.size_bytes).sum();
        let split_files: Vec<PathBuf> = parts.iter().map(|p| p.path.clone()).collect();
        let first = parts.into_iter().next().unwrap();

        singles.push(ModelInfo {
            size_bytes: total_size,
            split_files,
            ..first
        });
    }

    singles
}

fn register_single_gguf(
    scan_root: &Path,
    path: &Path,
    models: &mut Vec<ModelInfo>,
    seen: &mut std::collections::HashSet<PathBuf>,
    cache: &mut GgufCache,
    cache_dirty: &mut bool,
) {
    if !path.is_file()
        || path.extension().and_then(|e| e.to_str()).map(|e| e.eq_ignore_ascii_case("gguf")) != Some(true)
        || path
            .file_name()
            .map(|n| n.to_string_lossy().starts_with("__downloading__"))
            .unwrap_or(false)
    {
        return;
    }

    let canonical = path.canonicalize().unwrap_or_else(|_| path.to_path_buf());
    if !seen.insert(canonical) {
        return;
    }

    let filename = path
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();
    let file_meta = match std::fs::metadata(path) {
        Ok(m) => m,
        Err(_) => return,
    };
    let size_bytes = file_meta.len();
    let mtime_secs = file_mtime_secs(&file_meta);
    let quant = huggingface::extract_quant(&filename);
    let (repo_id, dir_fallback) = guess_repo_from_path(scan_root, path);
    let id = format!("{}/{}", repo_id, sanitize_id(&filename));

    let cache_key = path.to_string_lossy().to_string();

    let cached_meta = if let Some(cached) = cache.get(&cache_key) {
        if cached.size_bytes == size_bytes && cached.mtime_secs == mtime_secs {
            CachedMeta {
                name: cached.meta_name.clone(),
                size_label: cached.meta_size_label.clone(),
                context_length: cached.meta_context_length,
                is_vision: cached.is_vision,
                is_mmproj: cached.is_mmproj || huggingface::is_mmproj_file(&filename),
            }
        } else {
            *cache_dirty = true;
            read_and_cache(path, size_bytes, mtime_secs, &cache_key, cache)
        }
    } else {
        *cache_dirty = true;
        read_and_cache(path, size_bytes, mtime_secs, &cache_key, cache)
    };

    if cached_meta.is_mmproj {
        return;
    }

    let name = cached_meta
        .name
        .map(|n| n.rsplit('/').next().unwrap_or(&n).to_string())
        .filter(|n| n.len() >= 4)
        .unwrap_or(dir_fallback);
    let params_b = cached_meta
        .size_label
        .or_else(|| extract_params_from_filename(&filename).map(|p| format!("{}B", p)));

    let mmproj_path = find_mmproj(path, &filename, cache);
    let is_vision = cached_meta.is_vision || mmproj_path.is_some();

    models.push(ModelInfo {
        id,
        name,
        repo_id,
        filename,
        path: path.to_path_buf(),
        size_bytes,
        quant,
        params_b,
        context_length: cached_meta.context_length,
        is_vision,
        mmproj_path,
        split_files: vec![],
    });
}

fn scan_gguf_recursive(
    scan_root: &Path,
    dir: &Path,
    models: &mut Vec<ModelInfo>,
    seen: &mut std::collections::HashSet<PathBuf>,
    cache: &mut GgufCache,
    cache_dirty: &mut bool,
    max_depth: u32,
) {
    if max_depth == 0 {
        return;
    }
    let entries = match std::fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_file() {
            register_single_gguf(scan_root, &path, models, seen, cache, cache_dirty);
        } else if path.is_dir() {
            scan_gguf_recursive(
                scan_root,
                &path,
                models,
                seen,
                cache,
                cache_dirty,
                max_depth - 1,
            );
        }
    }
}

fn find_mmproj(model_path: &Path, model_filename: &str, cache: &GgufCache) -> Option<PathBuf> {
    let dir = model_path.parent()?;
    let stem = model_filename.trim_end_matches(".gguf");

    let re = regex::Regex::new(r"[-_](?:MXFP\d|IQ\d[_A-Z]*|Q\d[_KM0-9A-Z]+|F16|F32|BF16)$").unwrap();
    let base = re.replace(stem, "").to_string();

    let base_lower = base.to_lowercase();
    let segments: Vec<&str> = base_lower
        .split(&['-', '_', '.'][..])
        .filter(|s| !s.is_empty())
        .collect();

    let entries = std::fs::read_dir(dir).ok()?;
    let mut candidates: Vec<(PathBuf, usize)> = Vec::new();

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let fname = path.file_name()?.to_string_lossy().to_string();
        let fname_lower = fname.to_lowercase();
        if !fname_lower.ends_with(".gguf") || fname == model_filename {
            continue;
        }

        let is_mmproj_by_name = fname_lower.contains("mmproj");
        let cache_key = path.to_string_lossy().to_string();
        let is_mmproj_by_cache = cache.get(&cache_key).map_or(false, |e| e.is_mmproj);
        if !is_mmproj_by_name && !is_mmproj_by_cache {
            continue;
        }

        let matches = segments.iter().filter(|seg| fname_lower.contains(*seg)).count();
        candidates.push((path, matches));
    }

    if candidates.is_empty() {
        return None;
    }
    if candidates.len() == 1 {
        return Some(candidates.into_iter().next()?.0);
    }

    candidates
        .into_iter()
        .filter(|(_, score)| *score >= 1)
        .max_by_key(|(_, score)| *score)
        .map(|(p, _)| p)
}

struct CachedMeta {
    name: Option<String>,
    size_label: Option<String>,
    context_length: Option<u64>,
    is_vision: bool,
    is_mmproj: bool,
}

fn is_vision_model(tags: &[String]) -> bool {
    tags.iter().any(|t| {
        let lower = t.to_lowercase();
        lower == "image-to-text" || lower == "image-text-to-text"
    })
}

fn is_mmproj_by_metadata(meta: &GgufMeta) -> bool {
    matches!(
        meta.architecture.as_deref().map(|a| a.to_lowercase()).as_deref(),
        Some("clip")
            | Some("llava")
            | Some("nanollava")
            | Some("moondream")
            | Some("gemma3")
            | Some("gemma4")
            | Some("internvl")
            | Some("mllama")
    )
}

fn read_and_cache(
    path: &Path,
    size_bytes: u64,
    mtime_secs: i64,
    cache_key: &str,
    cache: &mut GgufCache,
) -> CachedMeta {
    let meta = read_gguf_metadata(path).unwrap_or_default();
    let is_vision = is_vision_model(&meta.tags);
    let filename = path.file_name().unwrap_or_default().to_string_lossy();
    let is_mmproj = is_mmproj_by_metadata(&meta) || huggingface::is_mmproj_file(&filename);
    cache.insert(
        cache_key.to_string(),
        GgufCacheEntry {
            size_bytes,
            mtime_secs,
            meta_name: meta.name.clone(),
            meta_size_label: meta.size_label.clone(),
            meta_context_length: meta.context_length,
            is_vision,
            is_mmproj,
        },
    );
    CachedMeta {
        name: meta.name,
        size_label: meta.size_label,
        context_length: meta.context_length,
        is_vision,
        is_mmproj,
    }
}

pub fn get_recommended_models(config: &LocalLlmConfig) -> Result<Vec<RecommendedModel>> {
    let installed = list_installed_models(config)?;

    let models = RECOMMENDED_MODELS
        .iter()
        .map(|def| {
            let estimated_size_mb = estimate_size_mb(def.params_b, def.quant);
            let installed_model = installed.iter().find(|m| m.filename == def.filename);

            RecommendedModel {
                repo_id: def.repo_id.to_string(),
                filename: def.filename.to_string(),
                name: def.name.to_string(),
                description: def.description.to_string(),
                params_b: def.params_b,
                family: def.family.to_string(),
                quant: def.quant.to_string(),
                context: def.context,
                estimated_size_mb,
                installed: installed_model.is_some(),
                installed_path: installed_model.map(|m| m.path.clone()),
            }
        })
        .collect();

    Ok(models)
}

pub async fn download_model(
    client: &reqwest::Client,
    _repo_id: &str,
    file: &HfFile,
    config: &LocalLlmConfig,
    progress_cb: impl Fn(DownloadProgress) + Send + Sync,
) -> Result<PathBuf> {
    let models_dir = config.models_dir();
    std::fs::create_dir_all(&models_dir)?;

    if !file.split_parts.is_empty() {
        return download_split_model(client, file, &models_dir, &progress_cb).await;
    }

    download_single_file(
        client,
        &file.filename,
        &file.download_url,
        file.size_bytes,
        &models_dir,
        &progress_cb,
    )
    .await
}

async fn download_split_model(
    client: &reqwest::Client,
    file: &HfFile,
    models_dir: &Path,
    progress_cb: &(dyn Fn(DownloadProgress) + Send + Sync),
) -> Result<PathBuf> {
    let total_bytes = file.size_bytes;
    let display_id = file.filename.clone();
    let mut completed_bytes: u64 = 0;

    let first_dest = models_dir.join(&file.split_parts[0].filename);

    for part in &file.split_parts {
        let dest_path = models_dir.join(&part.filename);

        if dest_path.exists() {
            if let Ok(meta) = std::fs::metadata(&dest_path) {
                if part.size_bytes > 0 && meta.len() == part.size_bytes {
                    completed_bytes += part.size_bytes;
                    continue;
                }
            }
        }

        let base = completed_bytes;
        let id = display_id.clone();
        let total = total_bytes;

        let part_cb = move |p: DownloadProgress| {
            if p.status == "done" {
                return;
            }
            progress_cb(DownloadProgress {
                id: id.clone(),
                bytes_downloaded: base + p.bytes_downloaded,
                total_bytes: total,
                percent: if total > 0 {
                    ((base + p.bytes_downloaded) as f64 / total as f64) * 100.0
                } else {
                    0.0
                },
                status: p.status,
            });
        };

        download_single_file(
            client,
            &part.filename,
            &part.download_url,
            part.size_bytes,
            models_dir,
            &part_cb,
        )
        .await?;

        completed_bytes += part.size_bytes;
    }

    progress_cb(DownloadProgress {
        id: display_id,
        bytes_downloaded: total_bytes,
        total_bytes,
        percent: 100.0,
        status: "done".to_string(),
    });

    Ok(first_dest)
}

async fn download_single_file(
    client: &reqwest::Client,
    filename: &str,
    download_url: &str,
    size_bytes: u64,
    models_dir: &Path,
    progress_cb: &(dyn Fn(DownloadProgress) + Send + Sync),
) -> Result<PathBuf> {
    let dest_path = models_dir.join(filename);
    let tmp_path = models_dir.join(format!("__downloading__{}", filename));

    if dest_path.exists() {
        let existing_size = std::fs::metadata(&dest_path)?.len();
        if size_bytes > 0 && existing_size == size_bytes {
            return Ok(dest_path);
        }
    }

    let total_bytes = size_bytes;
    let max_retries = 8u32;
    let backoff_secs: [u64; 9] = [0, 1, 2, 4, 8, 15, 30, 60, 120];
    let mut consecutive_failures = 0u32;

    loop {
        let resume_from = if tmp_path.exists() {
            std::fs::metadata(&tmp_path).map(|m| m.len()).unwrap_or(0)
        } else {
            0
        };

        if consecutive_failures > 0 {
            let delay = backoff_secs[consecutive_failures.min(8) as usize];
            progress_cb(DownloadProgress {
                id: filename.to_string(),
                bytes_downloaded: resume_from,
                total_bytes,
                percent: if total_bytes > 0 {
                    (resume_from as f64 / total_bytes as f64) * 100.0
                } else {
                    0.0
                },
                status: format!("retrying ({}/{})", consecutive_failures, max_retries),
            });
            if delay > 0 {
                tokio::time::sleep(std::time::Duration::from_secs(delay)).await;
            }
        }

        let mut req = client
            .get(download_url)
            .header("User-Agent", "noectra-ai/1.1")
            .timeout(std::time::Duration::from_secs(24 * 3600));

        if resume_from > 0 {
            req = req.header("Range", format!("bytes={}-", resume_from));
        }

        let response = match req.send().await {
            Ok(r) => r,
            Err(e) => {
                consecutive_failures += 1;
                if consecutive_failures >= max_retries {
                    anyhow::bail!("Download failed after {} retries: {}", max_retries, e);
                }
                continue;
            }
        };

        let status_code = response.status();
        if !status_code.is_success() && status_code.as_u16() != 206 {
            consecutive_failures += 1;
            if consecutive_failures >= max_retries {
                anyhow::bail!("Download failed: HTTP {}", status_code);
            }
            continue;
        }

        let content_len = response.content_length().unwrap_or(0);
        let resolved_total = if total_bytes > 0 {
            total_bytes
        } else if status_code.as_u16() == 206 {
            resume_from + content_len
        } else {
            content_len
        };

        let (mut downloaded, mut out_file) = if status_code.as_u16() == 206 && resume_from > 0 {
            let f = tokio::fs::OpenOptions::new()
                .append(true)
                .open(&tmp_path)
                .await
                .context("Failed to open temp file for resume")?;
            (resume_from, f)
        } else {
            let f = tokio::fs::File::create(&tmp_path)
                .await
                .context("Failed to create temp file")?;
            (0u64, f)
        };

        use futures::StreamExt;
        let mut stream = response.bytes_stream();
        let mut stream_error = false;
        let downloaded_at_start = downloaded;

        while let Some(chunk_result) = stream.next().await {
            match chunk_result {
                Ok(chunk) => {
                    if out_file.write_all(&chunk).await.is_err() {
                        stream_error = true;
                        break;
                    }
                    downloaded += chunk.len() as u64;
                    let percent = if resolved_total > 0 {
                        (downloaded as f64 / resolved_total as f64) * 100.0
                    } else {
                        0.0
                    };
                    progress_cb(DownloadProgress {
                        id: filename.to_string(),
                        bytes_downloaded: downloaded,
                        total_bytes: resolved_total,
                        percent,
                        status: "downloading".to_string(),
                    });
                }
                Err(_) => {
                    stream_error = true;
                    break;
                }
            }
        }

        let _ = out_file.flush().await;
        drop(out_file);

        if stream_error {
            if downloaded > downloaded_at_start {
                consecutive_failures = 0;
            } else {
                consecutive_failures += 1;
            }
            if consecutive_failures >= max_retries {
                anyhow::bail!("Download of {} failed after stream retries", filename);
            }
            continue;
        }

        tokio::fs::rename(&tmp_path, &dest_path).await?;
        progress_cb(DownloadProgress {
            id: filename.to_string(),
            bytes_downloaded: downloaded,
            total_bytes: resolved_total,
            percent: 100.0,
            status: "done".to_string(),
        });
        return Ok(dest_path);
    }
}

pub fn abort_download(filename: &str, config: &LocalLlmConfig) -> Result<()> {
    let models_dir = config.models_dir();
    let tmp_path = models_dir.join(format!("__downloading__{}", filename));
    if tmp_path.exists() {
        std::fs::remove_file(&tmp_path)?;
    }

    if let Some((base, _, total)) = huggingface::parse_split_filename(filename) {
        for i in 1..=total {
            let part_name = format!("{}-{:05}-of-{:05}.gguf", base, i, total);
            let tmp = models_dir.join(format!("__downloading__{}", part_name));
            if tmp.exists() {
                std::fs::remove_file(&tmp)?;
            }
        }
    }

    Ok(())
}

pub fn delete_model(path: &Path) -> Result<()> {
    let filename = path.file_name().and_then(|n| n.to_str()).unwrap_or("");

    if let Some((base, _, total)) = huggingface::parse_split_filename(filename) {
        if let Some(parent) = path.parent() {
            for i in 1..=total {
                let part_name = format!("{}-{:05}-of-{:05}.gguf", base, i, total);
                let part_path = parent.join(part_name);
                if part_path.exists() {
                    std::fs::remove_file(&part_path)?;
                }
            }
        }
    } else if path.exists() {
        std::fs::remove_file(path)?;
    }

    Ok(())
}

fn sanitize_id(filename: &str) -> String {
    filename
        .chars()
        .map(|c| {
            if c.is_alphanumeric() || c == '-' || c == '_' || c == '.' {
                c
            } else {
                '_'
            }
        })
        .collect()
}

fn guess_repo_from_path(scan_root: &Path, file_path: &Path) -> (String, String) {
    let relative = file_path.strip_prefix(scan_root).unwrap_or(file_path);
    let parent = relative.parent().filter(|p| !p.as_os_str().is_empty());

    let root_name = scan_root
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();

    let (repo_id, fallback_dir) = match parent {
        Some(p) => {
            let rel_str = p.to_string_lossy().to_string();
            let dir_parts: Vec<&str> = rel_str
                .split(&['\\', '/'][..])
                .filter(|s| !s.is_empty())
                .collect();
            let fallback = dir_parts.last().map(|s| s.to_string()).unwrap_or_default();
            let repo = if root_name.is_empty() {
                dir_parts.join("/")
            } else {
                let mut parts = vec![root_name.as_str()];
                parts.extend(dir_parts.iter().copied());
                parts.join("/")
            };
            (repo, fallback)
        }
        None => (root_name.clone(), root_name.clone()),
    };

    let stem = file_path
        .file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_default();
    let re = regex::Regex::new(r"-(?:MXFP\d|IQ\d[_A-Z]*|Q\d[_KM0-9A-Z]+|F16|F32|BF16)$").unwrap();
    let file_fallback = re.replace(&stem, "").to_string();

    let fallback_name =
        if fallback_dir.len() >= 4 && !fallback_dir.contains('.') && fallback_dir != root_name {
            fallback_dir
        } else {
            file_fallback
        };

    (
        repo_id,
        if fallback_name.is_empty() {
            stem
        } else {
            fallback_name
        },
    )
}

fn extract_params_from_filename(filename: &str) -> Option<u32> {
    let re = regex::Regex::new(r"(?i)[_\-.](\d+(?:\.\d+)?)b[_\-.]").ok()?;
    let caps = re.captures(filename)?;
    let val: f64 = caps.get(1)?.as_str().parse().ok()?;
    Some(val as u32)
}

pub fn estimate_size_mb(params_b: u32, quant: &str) -> u64 {
    let bits_per_weight = match quant.to_uppercase().as_str() {
        q if q.starts_with("Q2") => 2.5_f64,
        q if q.starts_with("Q3") => 3.5,
        q if q.starts_with("Q4") || q.starts_with("MXFP4") => 4.5,
        q if q.starts_with("Q5") => 5.5,
        q if q.starts_with("Q6") => 6.6,
        q if q.starts_with("Q8") => 8.5,
        "F16" | "BF16" => 16.0,
        "F32" => 32.0,
        q if q.starts_with("IQ2") => 2.3,
        q if q.starts_with("IQ3") => 3.3,
        q if q.starts_with("IQ4") => 4.3,
        _ => 4.5,
    };

    let bytes = (params_b as f64) * 1_000_000_000.0 * bits_per_weight / 8.0;
    (bytes / (1024.0 * 1024.0)) as u64
}
