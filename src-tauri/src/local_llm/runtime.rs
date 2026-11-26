use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use tokio::io::AsyncWriteExt;

use crate::local_llm::config::{ActiveRuntime, LocalLlmConfig, ManagedRuntime};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuntimeInfo {
    pub installed: bool,
    pub build: Option<u32>,
    pub backend: Option<String>,
    pub path: Option<PathBuf>,
    pub server_binary: Option<PathBuf>,
    pub runtime_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GithubRelease {
    pub tag_name: String,
    pub name: String,
    pub published_at: String,
    pub assets: Vec<ReleaseAsset>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReleaseAsset {
    pub name: String,
    pub browser_download_url: String,
    pub size: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReleaseInfo {
    pub tag_name: String,
    pub build: u32,
    pub published_at: String,
    pub available_assets: Vec<AssetOption>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssetOption {
    pub name: String,
    pub backend_id: String,
    pub backend_label: String,
    pub platform: String,
    pub download_url: String,
    pub size_mb: u64,
    pub score: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadProgress {
    pub id: String,
    pub bytes_downloaded: u64,
    pub total_bytes: u64,
    pub percent: f64,
    pub status: String,
}

pub fn get_runtime_info(config: &LocalLlmConfig) -> Result<RuntimeInfo> {
    let runtime_type = match &config.active_runtime {
        ActiveRuntime::Managed { .. } => "managed",
        ActiveRuntime::Custom { .. } => "custom",
        ActiveRuntime::None => "none",
    };

    let (build, backend) = match &config.active_runtime {
        ActiveRuntime::Managed { build, backend_id } => {
            let mr = if backend_id.is_empty() {
                config.managed_runtimes.iter().find(|r| r.build == *build)
            } else {
                config
                    .managed_runtimes
                    .iter()
                    .find(|r| r.build == *build && r.backend_id == *backend_id)
            };
            (Some(*build), mr.map(|r| r.backend_label.clone()))
        }
        ActiveRuntime::Custom { index } => {
            let label = config.custom_runtimes.get(*index).map(|c| c.label.clone());
            (None, label)
        }
        ActiveRuntime::None => (None, None),
    };

    let runtime_dir = match config.runtime_dir() {
        Ok(d) => d,
        Err(_) => {
            return Ok(RuntimeInfo {
                installed: false,
                build,
                backend,
                path: None,
                server_binary: None,
                runtime_type: runtime_type.to_string(),
            });
        }
    };

    if !runtime_dir.exists() {
        // Also check PATH for llama-server if none configured
        if matches!(config.active_runtime, ActiveRuntime::None) {
            if let Some(in_path) = find_server_in_path() {
                return Ok(RuntimeInfo {
                    installed: true,
                    build: None,
                    backend: Some("System PATH".to_string()),
                    path: in_path.parent().map(|p| p.to_path_buf()),
                    server_binary: Some(in_path),
                    runtime_type: "system".to_string(),
                });
            }
        }
        return Ok(RuntimeInfo {
            installed: false,
            build,
            backend,
            path: None,
            server_binary: None,
            runtime_type: runtime_type.to_string(),
        });
    }

    let server_binary = find_server_binary(&runtime_dir);

    Ok(RuntimeInfo {
        installed: server_binary.is_some(),
        build,
        backend,
        path: Some(runtime_dir),
        server_binary,
        runtime_type: runtime_type.to_string(),
    })
}

pub fn find_server_in_path() -> Option<PathBuf> {
    let target = if cfg!(target_os = "windows") {
        "llama-server.exe"
    } else {
        "llama-server"
    };
    if let Ok(path_var) = std::env::var("PATH") {
        for dir in std::env::split_paths(&path_var) {
            let candidate = dir.join(target);
            if candidate.is_file() {
                return Some(candidate);
            }
        }
    }
    None
}

pub fn find_server_binary(runtime_dir: &Path) -> Option<PathBuf> {
    let target = if cfg!(target_os = "windows") {
        "llama-server.exe"
    } else {
        "llama-server"
    };
    find_file_recursive(runtime_dir, target, 3)
}

pub fn find_file_recursive(dir: &Path, name: &str, max_depth: u32) -> Option<PathBuf> {
    if max_depth == 0 {
        return None;
    }
    let entries = std::fs::read_dir(dir).ok()?;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_file() && path.file_name().map(|n| n == name).unwrap_or(false) {
            return Some(path);
        }
    }
    let entries = std::fs::read_dir(dir).ok()?;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            if let Some(found) = find_file_recursive(&path, name, max_depth - 1) {
                return Some(found);
            }
        }
    }
    None
}

pub async fn fetch_latest_release(
    client: &reqwest::Client,
    available_backend_ids: &[String],
) -> Result<ReleaseInfo> {
    let url = "https://api.github.com/repos/ggml-org/llama.cpp/releases/latest";
    let response = client
        .get(url)
        .header("User-Agent", "noectra-ai/1.1")
        .header("Accept", "application/vnd.github.v3+json")
        .send()
        .await
        .context("Failed to fetch GitHub release")?;

    if !response.status().is_success() {
        anyhow::bail!("GitHub API returned status {}", response.status());
    }

    let release: GithubRelease = response
        .json()
        .await
        .context("Failed to parse GitHub release JSON")?;
    parse_release(release, available_backend_ids)
}

fn parse_release(release: GithubRelease, available_backend_ids: &[String]) -> Result<ReleaseInfo> {
    let build = release
        .tag_name
        .trim_start_matches('b')
        .parse::<u32>()
        .context("Cannot parse build number from tag")?;

    let os = std::env::consts::OS;
    let arch = std::env::consts::ARCH;

    let mut assets: Vec<AssetOption> = release
        .assets
        .iter()
        .filter(|a| a.name.ends_with(".zip") || a.name.ends_with(".tar.gz"))
        .filter_map(|a| {
            score_asset(
                &a.name,
                os,
                arch,
                a.browser_download_url.clone(),
                a.size,
                available_backend_ids,
            )
        })
        .collect();

    assets.sort_by(|a, b| b.score.cmp(&a.score));

    Ok(ReleaseInfo {
        tag_name: release.tag_name,
        build,
        published_at: release.published_at,
        available_assets: assets,
    })
}

fn score_asset(
    name: &str,
    os: &str,
    arch: &str,
    url: String,
    size: u64,
    available_backend_ids: &[String],
) -> Option<AssetOption> {
    let lower = name.to_lowercase();

    if lower.contains("sha256") || lower.contains(".tar.gz.sig") || lower.contains("source") {
        return None;
    }

    let platform_match = match os {
        "linux" => lower.contains("linux") || lower.contains("ubuntu"),
        "windows" => lower.contains("win"),
        "macos" => lower.contains("macos") || lower.contains("darwin"),
        _ => false,
    };
    if !platform_match {
        return None;
    }

    let arch_match = match arch {
        "x86_64" => lower.contains("x64") || lower.contains("amd64") || lower.contains("x86_64"),
        "aarch64" => lower.contains("arm64") || lower.contains("aarch64"),
        _ => true,
    };
    if !arch_match {
        return None;
    }

    let (backend_id, backend_label, base_score) = detect_asset_backend(&lower, os);

    let backend_available = backend_id.starts_with("cpu")
        || available_backend_ids
            .iter()
            .any(|b| backend_id.starts_with(b.as_str()));
    let score = if backend_available {
        base_score
    } else {
        base_score - 200
    };

    let size_mb = size / (1024 * 1024);

    Some(AssetOption {
        name: name.to_string(),
        backend_id,
        backend_label,
        platform: os.to_string(),
        download_url: url,
        size_mb,
        score,
    })
}

fn detect_asset_backend(lower: &str, os: &str) -> (String, String, i32) {
    if lower.contains("cuda") {
        let version = extract_cuda_version(lower).unwrap_or_default();
        ("cuda".to_string(), format!("CUDA{}", version), 100)
    } else if lower.contains("rocm") || lower.contains("hip") {
        ("rocm".to_string(), "ROCm/HIP".to_string(), 90)
    } else if lower.contains("metal") {
        ("metal".to_string(), "Metal".to_string(), 95)
    } else if lower.contains("vulkan") {
        ("vulkan".to_string(), "Vulkan".to_string(), 70)
    } else if lower.contains("sycl") {
        ("sycl".to_string(), "SYCL".to_string(), 60)
    } else if lower.contains("openvino") {
        ("openvino".to_string(), "OpenVINO".to_string(), 50)
    } else if lower.contains("noavx") || lower.contains("no-avx") {
        ("cpu-noavx".to_string(), "CPU (no AVX)".to_string(), 10)
    } else if lower.contains("avx512") {
        ("cpu-avx512".to_string(), "CPU (AVX-512)".to_string(), 30)
    } else if lower.contains("avx2") {
        ("cpu-avx2".to_string(), "CPU (AVX2)".to_string(), 25)
    } else if lower.contains("avx") {
        ("cpu-avx".to_string(), "CPU (AVX)".to_string(), 20)
    } else if os == "macos" {
        ("metal".to_string(), "Metal".to_string(), 95)
    } else {
        ("cpu".to_string(), "CPU".to_string(), 20)
    }
}

fn extract_cuda_version(lower: &str) -> Option<String> {
    let re = regex::Regex::new(r"cu(\d+)\.?(\d*)").ok()?;
    let caps = re.captures(lower)?;
    let major = caps.get(1)?.as_str();
    let minor = caps.get(2).map(|m| m.as_str()).unwrap_or("");
    if minor.is_empty() {
        Some(format!(" {}", major))
    } else {
        Some(format!(" {}.{}", major, minor))
    }
}

#[derive(Debug, Clone)]
pub struct DownloadedRuntime {
    pub managed_runtime: ManagedRuntime,
}

pub async fn download_runtime(
    client: &reqwest::Client,
    base_dir: &Path,
    asset: &AssetOption,
    tag_name: &str,
    progress_cb: impl Fn(DownloadProgress),
) -> Result<DownloadedRuntime> {
    let build = tag_name
        .trim_start_matches('b')
        .parse::<u32>()
        .context("Cannot parse build number from tag")?;

    let dir_name = format!("b{}-{}", build, asset.backend_id);
    let runtime_dir = LocalLlmConfig::runtimes_base_dir(base_dir).join(&dir_name);
    std::fs::create_dir_all(&runtime_dir)?;

    let download_id = "runtime".to_string();
    let tmp_path = runtime_dir.join(format!("__download__{}", &asset.name));

    let response = client
        .get(&asset.download_url)
        .header("User-Agent", "noectra-ai/1.1")
        .timeout(std::time::Duration::from_secs(6 * 3600))
        .send()
        .await
        .context("Failed to start download")?;

    if !response.status().is_success() {
        anyhow::bail!("Download failed with status {}", response.status());
    }

    let total_bytes = response.content_length().unwrap_or(asset.size_mb * 1024 * 1024);
    let mut file = tokio::fs::File::create(&tmp_path).await?;
    let mut downloaded: u64 = 0;

    use futures::StreamExt;
    let mut stream = response.bytes_stream();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.context("Download stream error")?;
        file.write_all(&chunk).await?;
        downloaded += chunk.len() as u64;

        let percent = if total_bytes > 0 {
            (downloaded as f64 / total_bytes as f64) * 100.0
        } else {
            0.0
        };

        progress_cb(DownloadProgress {
            id: download_id.clone(),
            bytes_downloaded: downloaded,
            total_bytes,
            percent,
            status: "downloading".to_string(),
        });
    }

    file.flush().await?;
    drop(file);

    progress_cb(DownloadProgress {
        id: download_id.clone(),
        bytes_downloaded: downloaded,
        total_bytes,
        percent: 100.0,
        status: "extracting".to_string(),
    });

    let name_lower = asset.name.to_lowercase();
    if name_lower.ends_with(".zip") {
        extract_zip(&tmp_path, &runtime_dir)?;
    } else if name_lower.ends_with(".tar.gz") {
        extract_tar_gz(&tmp_path, &runtime_dir)?;
    } else {
        anyhow::bail!("Unknown archive format: {}", asset.name);
    }

    let _ = std::fs::remove_file(&tmp_path);

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);

    progress_cb(DownloadProgress {
        id: download_id,
        bytes_downloaded: downloaded,
        total_bytes,
        percent: 100.0,
        status: "done".to_string(),
    });

    Ok(DownloadedRuntime {
        managed_runtime: ManagedRuntime {
            build,
            tag_name: tag_name.to_string(),
            backend_id: asset.backend_id.clone(),
            backend_label: asset.backend_label.clone(),
            asset_name: asset.name.clone(),
            dir_name,
            installed_at: now,
        },
    })
}

pub fn register_downloaded_runtime(config: &mut LocalLlmConfig, downloaded: DownloadedRuntime) -> Result<()> {
    let rt = downloaded.managed_runtime;
    let build = rt.build;
    let backend_id = rt.backend_id.clone();

    config
        .managed_runtimes
        .retain(|r| !(r.build == build && r.backend_id == backend_id));
    config.managed_runtimes.push(rt);

    config.active_runtime = ActiveRuntime::Managed {
        build,
        backend_id: backend_id.clone(),
    };

    if config.auto_delete_old_runtimes {
        let base_dir = LocalLlmConfig::runtimes_base_dir(&config.base_dir);
        let old_runtimes: Vec<_> = config
            .managed_runtimes
            .iter()
            .filter(|r| r.backend_id == backend_id && r.build != build)
            .map(|r| (r.build, r.backend_id.clone(), r.dir_name.clone()))
            .collect();

        for (old_build, old_backend, old_dir_name) in &old_runtimes {
            let old_dir = base_dir.join(old_dir_name);
            if old_dir.exists() {
                let _ = std::fs::remove_dir_all(&old_dir);
            }
            config
                .managed_runtimes
                .retain(|r| !(r.build == *old_build && r.backend_id == *old_backend));
        }
    }

    config.managed_runtimes.sort_by(|a, b| b.build.cmp(&a.build));
    Ok(())
}

pub fn delete_managed_runtime(build: u32, backend_id: &str, config: &mut LocalLlmConfig) -> Result<()> {
    let is_active = config.active_build() == Some(build)
        && config
            .active_backend_id()
            .map_or(true, |id| id == backend_id || backend_id.is_empty());
    if is_active {
        anyhow::bail!("Cannot delete the active runtime. Switch to another first.");
    }
    if let Some(mr) = config
        .managed_runtimes
        .iter()
        .find(|r| r.build == build && (backend_id.is_empty() || r.backend_id == backend_id))
    {
        let dir = LocalLlmConfig::runtimes_base_dir(&config.base_dir).join(&mr.dir_name);
        if dir.exists() {
            std::fs::remove_dir_all(&dir)?;
        }
    }
    config
        .managed_runtimes
        .retain(|r| !(r.build == build && (backend_id.is_empty() || r.backend_id == backend_id)));
    Ok(())
}

fn extract_zip(zip_path: &Path, dest: &Path) -> Result<()> {
    let file = std::fs::File::open(zip_path)?;
    let mut archive = zip::ZipArchive::new(file)?;

    for i in 0..archive.len() {
        let mut zip_file = archive.by_index(i)?;
        let out_path = match zip_file.enclosed_name() {
            Some(p) => dest.join(p),
            None => continue,
        };

        if zip_file.name().ends_with('/') {
            std::fs::create_dir_all(&out_path)?;
        } else {
            if let Some(parent) = out_path.parent() {
                std::fs::create_dir_all(parent)?;
            }
            let mut out_file = std::fs::File::create(&out_path)?;
            std::io::copy(&mut zip_file, &mut out_file)?;

            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                if let Some(mode) = zip_file.unix_mode() {
                    std::fs::set_permissions(&out_path, std::fs::Permissions::from_mode(mode))?;
                }
            }
        }
    }

    Ok(())
}

fn extract_tar_gz(tar_path: &Path, dest: &Path) -> Result<()> {
    let file = std::fs::File::open(tar_path)?;
    let gz = flate2::read::GzDecoder::new(file);
    let mut archive = tar::Archive::new(gz);
    archive.unpack(dest)?;
    Ok(())
}

pub fn set_custom_runtime(path: &Path, config: &mut LocalLlmConfig) -> Result<()> {
    if !path.exists() {
        anyhow::bail!("Path does not exist: {}", path.display());
    }

    let binary = if path.is_file() {
        path.to_path_buf()
    } else {
        find_server_binary(path).ok_or_else(|| {
            anyhow::anyhow!("No llama-server binary found at {}", path.display())
        })?
    };

    let label = path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "Custom".to_string());

    let index = if let Some(idx) = config
        .custom_runtimes
        .iter()
        .position(|c| c.binary_path == binary)
    {
        idx
    } else {
        let idx = config.custom_runtimes.len();
        config.custom_runtimes.push(crate::local_llm::config::CustomRuntime {
            label,
            binary_path: binary,
        });
        idx
    };
    config.active_runtime = ActiveRuntime::Custom { index };
    Ok(())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomBuild {
    pub binary_path: PathBuf,
    pub label: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanResult {
    pub builds: Vec<CustomBuild>,
    pub is_source_distribution: bool,
}

fn is_llamacpp_source_dir(root: &Path) -> bool {
    let cmake = root.join("CMakeLists.txt");
    if let Ok(content) = std::fs::read_to_string(&cmake) {
        content.contains("project(\"llama.cpp\"")
    } else {
        false
    }
}

pub fn scan_for_builds(root: &Path) -> Result<ScanResult> {
    if !root.exists() {
        anyhow::bail!("Path does not exist: {}", root.display());
    }

    let target = if cfg!(target_os = "windows") {
        "llama-server.exe"
    } else {
        "llama-server"
    };

    let mut results = Vec::new();
    find_all_binaries_recursive(root, target, 5, root, &mut results);
    results.sort_by(|a, b| a.label.cmp(&b.label));
    Ok(ScanResult {
        is_source_distribution: is_llamacpp_source_dir(root),
        builds: results,
    })
}

fn find_all_binaries_recursive(
    dir: &Path,
    name: &str,
    max_depth: u32,
    root: &Path,
    results: &mut Vec<CustomBuild>,
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
        if path.is_file() && path.file_name().map(|n| n == name).unwrap_or(false) {
            let label = if let Ok(rel) = path.strip_prefix(root) {
                let root_name = root
                    .file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_default();
                let first_subdir = rel
                    .components()
                    .next()
                    .map(|c| c.as_os_str().to_string_lossy().to_string());
                match first_subdir {
                    Some(sub) => format!("{} - {}", root_name, sub),
                    None => root_name,
                }
            } else {
                path.display().to_string()
            };
            results.push(CustomBuild {
                binary_path: path,
                label,
            });
        } else if path.is_dir() {
            if let Some(dir_name) = path.file_name().and_then(|n| n.to_str()) {
                if dir_name.starts_with('.') || dir_name == "node_modules" || dir_name == "__pycache__" {
                    continue;
                }
            }
            find_all_binaries_recursive(&path, name, max_depth - 1, root, results);
        }
    }
}
