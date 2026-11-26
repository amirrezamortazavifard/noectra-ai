use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Stdio;
use std::sync::atomic::{AtomicBool, AtomicUsize};
use std::sync::{Arc, Mutex};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::{Child, Command};

use crate::local_llm::config::ServerConfig;
use crate::local_llm::hardware::{suggest_config, SystemInfo};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum ServerStatus {
    Stopped,
    Starting,
    Running {
        port: u16,
        pid: u32,
        host: String,
    },
    Error {
        message: String,
    },
}

pub struct ServerState {
    pub process: Option<Child>,
    pub status: ServerStatus,
    pub loaded_model_path: Option<String>,
    pub log_lines: Vec<String>,
    pub cancel_token: Arc<AtomicBool>,
}

impl ServerState {
    pub fn new() -> Self {
        Self {
            process: None,
            status: ServerStatus::Stopped,
            loaded_model_path: None,
            log_lines: Vec::new(),
            cancel_token: Arc::new(AtomicBool::new(false)),
        }
    }

    pub fn is_running(&self) -> bool {
        matches!(
            self.status,
            ServerStatus::Running { .. } | ServerStatus::Starting
        )
    }
}

pub type SharedServerState = Arc<Mutex<ServerState>>;

pub fn new_server_state() -> SharedServerState {
    Arc::new(Mutex::new(ServerState::new()))
}

fn get_fallback_configs(base: &ServerConfig) -> Vec<ServerConfig> {
    let mut configs = Vec::new();
    let has_mmproj = base.mmproj_path.as_ref().map_or(false, |p| !p.is_empty());

    configs.push(base.clone());

    if has_mmproj && !base.no_mmproj_offload {
        let mut c = base.clone();
        c.no_mmproj_offload = true;
        configs.push(c);
    }

    if base.n_gpu_layers != 0 || (has_mmproj && !base.no_mmproj_offload) {
        let mut c = base.clone();
        c.n_gpu_layers = 0;
        c.no_mmproj_offload = true;
        configs.push(c);
    }

    {
        let mut c = base.clone();
        c.n_gpu_layers = 0;
        c.no_mmproj_offload = true;
        c.no_mmap = true;
        configs.push(c);
    }

    {
        let mut c = base.clone();
        c.n_gpu_layers = 0;
        c.no_mmproj_offload = true;
        c.no_mmap = true;
        c.flash_attn = "off".to_string();
        configs.push(c);
    }

    configs
}

fn describe_config_level(cfg: &ServerConfig, base: &ServerConfig) -> String {
    let mut parts = Vec::new();

    if cfg.n_gpu_layers == 0 && base.n_gpu_layers != 0 {
        parts.push("CPU-only inference".to_string());
    } else if cfg.n_gpu_layers == base.n_gpu_layers {
        if cfg.n_gpu_layers == -1 {
            parts.push("Full GPU offload".to_string());
        } else if cfg.n_gpu_layers == 0 {
            parts.push("CPU-only inference".to_string());
        } else {
            parts.push(format!("{} GPU layers", cfg.n_gpu_layers));
        }
    } else {
        parts.push(format!("{} GPU layers", cfg.n_gpu_layers));
    }

    if cfg.no_mmproj_offload && !base.no_mmproj_offload {
        parts.push("vision encoder on CPU".to_string());
    }
    if cfg.no_mmap && !base.no_mmap {
        parts.push("no memory mapping".to_string());
    }
    if cfg.flash_attn == "off" && base.flash_attn != "off" {
        parts.push("flash attention disabled".to_string());
    }

    if parts.is_empty() {
        "user settings".to_string()
    } else {
        parts.join(", ")
    }
}

async fn force_free_port(port: u16) {
    #[cfg(target_os = "windows")]
    {
        let output = tokio::process::Command::new("netstat")
            .args(["-ano"])
            .creation_flags(0x08000000)
            .output()
            .await;
        let output = match output {
            Ok(o) if o.status.success() => o,
            _ => return,
        };
        let stdout = String::from_utf8_lossy(&output.stdout);
        for line in stdout.lines() {
            let trimmed = line.trim();
            if !trimmed.contains(&format!(":{}", port)) {
                continue;
            }
            let parts: Vec<&str> = trimmed.split_whitespace().collect();
            if parts.len() < 5 {
                continue;
            }
            let pid_str = parts[parts.len() - 1];
            let pid: u32 = match pid_str.parse() {
                Ok(p) => p,
                Err(_) => continue,
            };
            if pid == std::process::id() || pid == 0 {
                continue;
            }
            let _ = tokio::process::Command::new("taskkill")
                .args(["/F", "/PID", &pid.to_string()])
                .creation_flags(0x08000000)
                .output()
                .await;
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = port;
    }
}

async fn check_tcp_open(port: u16) -> bool {
    use tokio::net::TcpStream;
    let addr = format!("127.0.0.1:{}", port);
    matches!(
        tokio::time::timeout(
            std::time::Duration::from_millis(800),
            TcpStream::connect(&addr)
        )
        .await,
        Ok(Ok(_))
    )
}

/// Actually query `GET http://127.0.0.1:<port>/health` and return `true` ONLY when HTTP status is 200 OK.
/// While llama-server is still loading weights into RAM/VRAM it returns 503 Service Unavailable.
async fn check_http_health(port: u16) -> bool {
    let url = format!("http://127.0.0.1:{}/health", port);
    let Ok(client) = reqwest::Client::builder()
        .timeout(std::time::Duration::from_millis(900))
        .build()
    else {
        return false;
    };
    match client.get(&url).send().await {
        Ok(resp) => resp.status().is_success(),
        Err(_) => false,
    }
}

async fn find_available_port(preferred: u16) -> u16 {
    let mut candidates: Vec<u16> = Vec::with_capacity(56);
    if preferred > 0 {
        candidates.push(preferred);
        for p in preferred.saturating_add(1)..=preferred.saturating_add(25) {
            candidates.push(p);
        }
    }
    for p in 18081..=18110 {
        if !candidates.contains(&p) {
            candidates.push(p);
        }
    }
    for port in candidates {
        if !check_tcp_open(port).await && std::net::TcpListener::bind(("127.0.0.1", port)).is_ok() {
            return port;
        }
    }
    std::net::TcpListener::bind("127.0.0.1:0")
        .ok()
        .and_then(|l| l.local_addr().ok())
        .map(|a| a.port())
        .unwrap_or(preferred)
}

async fn wait_for_port_free(port: u16) -> bool {
    for _ in 0..20 {
        if !check_tcp_open(port).await {
            return true;
        }
        tokio::time::sleep(std::time::Duration::from_millis(300)).await;
    }
    false
}

pub async fn start_server(
    server_binary: &PathBuf,
    config: &ServerConfig,
    state: SharedServerState,
) -> Result<()> {
    {
        let s = state.lock().unwrap();
        if s.is_running() {
            anyhow::bail!("Local llama-server is already running or starting");
        }
    }

    let preferred_port = config.port;
    let host = config.host.clone();
    let cancel_token = {
        let mut s = state.lock().unwrap();
        s.cancel_token
            .store(false, std::sync::atomic::Ordering::Relaxed);
        s.status = ServerStatus::Starting;
        s.loaded_model_path = Some(config.model_path.clone());
        s.log_lines.clear();
        s.cancel_token.clone()
    };

    let push_log = |state_ref: &SharedServerState, line: String| {
        let mut s = state_ref.lock().unwrap();
        s.log_lines.push(line);
        if s.log_lines.len() > 400 {
            s.log_lines.drain(0..100);
        }
    };

    // Never fail just because preferred_port (e.g. 8081) is used by another app on the machine;
    // pick the first free local port automatically so offline inference always works out of the box.
    let port = find_available_port(preferred_port).await;
    if port != preferred_port {
        push_log(
            &state,
            format!(
                "[startup] Port {} is currently in use — automatically using free port {}",
                preferred_port, port
            ),
        );
    }

    let mut effective_base_cfg = config.clone();
    effective_base_cfg.port = port;
    let fallback_configs = get_fallback_configs(&effective_base_cfg);

    for (level, cfg) in fallback_configs.iter().enumerate() {
        {
            let s = state.lock().unwrap();
            if matches!(s.status, ServerStatus::Stopped) {
                anyhow::bail!("Server stopped by user");
            }
        }

        let desc = describe_config_level(cfg, config);
        let total = fallback_configs.len();
        push_log(
            &state,
            format!("[startup] Attempt {}/{}: {}", level + 1, total, desc),
        );

        let args = build_args(cfg);
        let mut cmd = Command::new(server_binary);
        if let Some(bin_dir) = server_binary.parent() {
            cmd.current_dir(bin_dir);
        }
        cmd.args(&args)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .kill_on_drop(true);
        #[cfg(target_os = "windows")]
        {
            cmd.creation_flags(0x08000000);
        }

        let mut child = match cmd.spawn() {
            Ok(c) => c,
            Err(e) => {
                push_log(&state, format!("[error] Spawn failed: {}", e));
                continue;
            }
        };

        let pid = child.id().unwrap_or(0);
        let stdout = child.stdout.take().expect("stdout not piped");
        let stderr = child.stderr.take().expect("stderr not piped");

        {
            let mut s = state.lock().unwrap();
            s.process = Some(child);
        }

        let stop = Arc::new(AtomicBool::new(false));
        let started = Arc::new(AtomicBool::new(false));
        let output_count = Arc::new(AtomicUsize::new(0));

        let spawn_reader = |stream_read: Box<dyn tokio::io::AsyncRead + Unpin + Send>,
                            prefix: &'static str,
                            stop_f: Arc<AtomicBool>,
                            started_f: Arc<AtomicBool>,
                            out_c: Arc<AtomicUsize>,
                            st: SharedServerState| {
            tokio::spawn(async move {
                let mut reader = BufReader::new(stream_read);
                let mut buf = Vec::new();
                loop {
                    if stop_f.load(std::sync::atomic::Ordering::Relaxed) {
                        break;
                    }
                    buf.clear();
                    match reader.read_until(b'\n', &mut buf).await {
                        Ok(0) | Err(_) => break,
                        Ok(_) => {
                            out_c.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
                            let line = String::from_utf8_lossy(&buf).trim_end().to_string();
                            if !started_f.load(std::sync::atomic::Ordering::Relaxed)
                                && (line.contains("HTTP server listening")
                                    || line.contains("server is listening")
                                    || line.contains("listening on"))
                            {
                                started_f.store(true, std::sync::atomic::Ordering::Relaxed);
                            }
                            let mut s = st.lock().unwrap();
                            s.log_lines.push(if prefix.is_empty() {
                                line
                            } else {
                                format!("{} {}", prefix, line)
                            });
                            if s.log_lines.len() > 400 {
                                s.log_lines.drain(0..100);
                            }
                        }
                    }
                }
            })
        };

        let h_out = spawn_reader(
            Box::new(stdout),
            "",
            stop.clone(),
            started.clone(),
            output_count.clone(),
            state.clone(),
        );
        let h_err = spawn_reader(
            Box::new(stderr),
            "[stderr]",
            stop.clone(),
            started.clone(),
            output_count.clone(),
            state.clone(),
        );

        let mut success = false;
        let mut cancelled = false;
        let attempt_start = std::time::Instant::now();
        let max_attempt_secs: u64 = 180;

        loop {
            tokio::time::sleep(std::time::Duration::from_millis(500)).await;
            let elapsed = attempt_start.elapsed().as_secs();

            if elapsed >= max_attempt_secs {
                push_log(&state, format!("[timeout] Attempt {} timed out", level + 1));
                break;
            }
            if cancel_token.load(std::sync::atomic::Ordering::Relaxed) {
                cancelled = true;
                break;
            }
            // Wait until llama-server logs it is ready AND /health returns HTTP 200 OK (not 503 Loading model)
            if check_http_health(port).await {
                success = true;
                break;
            }
            let exited_code = {
                let mut s = state.lock().unwrap();
                match s.process.as_mut() {
                    Some(c) => match c.try_wait() {
                        Ok(Some(st)) => Some(format!("{:?}", st.code())),
                        Ok(None) => None,
                        Err(e) => Some(format!("wait error: {}", e)),
                    },
                    None => Some("no process".to_string()),
                }
            };
            if let Some(code_str) = exited_code {
                push_log(
                    &state,
                    format!(
                        "[error] Process exited early on attempt {} (exit code: {})",
                        level + 1,
                        code_str
                    ),
                );
                break;
            }
        }

        if success {
            push_log(
                &state,
                format!("[ready] llama-server listening on http://{}:{} ({})", host, port, desc),
            );
            {
                let mut s = state.lock().unwrap();
                s.status = ServerStatus::Running {
                    port,
                    pid,
                    host: host.clone(),
                };
            }
            let state_monitor = state.clone();
            tokio::spawn(async move {
                loop {
                    tokio::time::sleep(std::time::Duration::from_millis(1000)).await;
                    let exit_status = {
                        let mut s = state_monitor.lock().unwrap();
                        match s.process.as_mut() {
                            Some(child) => child.try_wait(),
                            None => break,
                        }
                    };
                    match exit_status {
                        Ok(Some(status)) => {
                            let mut s = state_monitor.lock().unwrap();
                            s.process = None;
                            if s.status == ServerStatus::Stopped {
                                break;
                            }
                            if status.success() {
                                s.status = ServerStatus::Stopped;
                            } else {
                                let code = status.code().unwrap_or(-1);
                                let msg = format!("llama-server exited with code {}", code);
                                s.log_lines.push(format!("[error] {}", msg));
                                s.status = ServerStatus::Error { message: msg };
                            }
                            break;
                        }
                        Ok(None) => continue,
                        Err(e) => {
                            let mut s = state_monitor.lock().unwrap();
                            s.process = None;
                            s.status = ServerStatus::Error {
                                message: format!("Process monitor error: {}", e),
                            };
                            break;
                        }
                    }
                }
            });
            return Ok(());
        }

        stop.store(true, std::sync::atomic::Ordering::Relaxed);
        let killed_child = {
            let mut s = state.lock().unwrap();
            s.process.take()
        };
        if let Some(mut child) = killed_child {
            let _ = child.start_kill();
            let _ = tokio::time::timeout(std::time::Duration::from_secs(3), child.wait()).await;
        }
        let _ = tokio::join!(h_out, h_err);
        force_free_port(port).await;

        if cancelled {
            let mut s = state.lock().unwrap();
            s.status = ServerStatus::Stopped;
            s.loaded_model_path = None;
            anyhow::bail!("Server startup cancelled by user");
        }
    }

    let msg = "All GPU/CPU fallback configurations failed to start llama-server".to_string();
    {
        let mut s = state.lock().unwrap();
        s.status = ServerStatus::Error {
            message: msg.clone(),
        };
        s.loaded_model_path = None;
    }
    anyhow::bail!(msg)
}

pub async fn stop_server(state: &SharedServerState) -> Result<()> {
    let mut child = {
        let mut s = state.lock().unwrap();
        s.status = ServerStatus::Stopped;
        s.loaded_model_path = None;
        s.cancel_token
            .store(true, std::sync::atomic::Ordering::Relaxed);
        s.process.take()
    };

    if let Some(ref mut child) = child {
        #[cfg(unix)]
        if let Some(pid) = child.id() {
            unsafe {
                libc::kill(pid as i32, libc::SIGTERM);
            }
        }
        #[cfg(not(unix))]
        {
            let _ = child.start_kill();
        }
        let _ = tokio::time::timeout(std::time::Duration::from_secs(10), child.wait()).await;
        let _ = child.start_kill();
    }

    Ok(())
}

pub fn kill_server_sync(state: &SharedServerState) {
    let mut child = {
        let mut s = state.lock().unwrap();
        s.status = ServerStatus::Stopped;
        s.loaded_model_path = None;
        s.cancel_token
            .store(true, std::sync::atomic::Ordering::Relaxed);
        s.process.take()
    };

    if let Some(ref mut child) = child {
        let _ = child.start_kill();
        let _ = child.try_wait();
    }
}

pub fn build_args(config: &ServerConfig) -> Vec<String> {
    let mut args = Vec::new();

    args.push("--model".to_string());
    args.push(config.model_path.clone());

    if let Some(ref mmproj) = config.mmproj_path {
        if !mmproj.is_empty() {
            args.push("--mmproj".to_string());
            args.push(mmproj.clone());
            if config.no_mmproj_offload {
                args.push("--no-mmproj-offload".to_string());
            }
        }
    }

    args.push("--host".to_string());
    args.push(config.host.clone());
    args.push("--port".to_string());
    args.push(config.port.to_string());

    let effective_ctx = if config.mmproj_path.is_some() && (config.n_ctx == 0 || config.n_ctx < 8192) {
        8192
    } else {
        config.n_ctx
    };
    args.push("--ctx-size".to_string());
    args.push(effective_ctx.to_string());

    args.push("--n-gpu-layers".to_string());
    args.push(config.n_gpu_layers.to_string());

    if let Some(threads) = config.n_threads {
        if threads > 0 {
            args.push("--threads".to_string());
            args.push(threads.to_string());
        }
    }

    args.push("--flash-attn".to_string());
    args.push(config.flash_attn.clone());
    args.push("--cache-type-k".to_string());
    args.push(config.cache_type_k.clone());
    args.push("--cache-type-v".to_string());
    args.push(config.cache_type_v.clone());

    args.push("--temp".to_string());
    args.push(format!("{:.2}", config.temperature));
    args.push("--top-k".to_string());
    args.push(config.top_k.to_string());
    args.push("--min-p".to_string());
    args.push(format!("{:.4}", config.min_p));
    args.push("--top-p".to_string());
    args.push(format!("{:.4}", config.top_p));

    if config.n_predict != -1 {
        args.push("--n-predict".to_string());
        args.push(config.n_predict.to_string());
    }

    args.push("--batch-size".to_string());
    args.push(config.n_batch.to_string());
    args.push("--ubatch-size".to_string());
    args.push(config.n_ubatch.to_string());

    if config.cont_batching {
        args.push("--cont-batching".to_string());
    } else {
        args.push("--no-cont-batching".to_string());
    }

    if config.mlock {
        args.push("--mlock".to_string());
    }
    if config.no_mmap {
        args.push("--no-mmap".to_string());
    }

    if let Some(seed) = config.seed {
        args.push("--seed".to_string());
        args.push(seed.to_string());
    }

    args.push("--parallel".to_string());
    args.push(config.parallel.to_string());

    let mut sorted_params: Vec<_> = config
        .extra_params
        .iter()
        .filter(|(k, _)| k.as_str() != "__raw__" && k.as_str() != "mmproj")
        .collect();
    sorted_params.sort_by_key(|(k, _)| (*k).clone());
    for (key, value) in sorted_params {
        args.push(format!("--{}", key));
        if !value.is_empty() {
            args.push(value.clone());
        }
    }

    if let Some(raw) = config.extra_params.get("__raw__") {
        for part in raw.split_whitespace() {
            args.push(part.to_string());
        }
    }

    args
}

pub fn suggest_server_config(
    model_path: &str,
    model_size_mb: u64,
    system: &SystemInfo,
) -> ServerConfig {
    let suggestion = suggest_config(model_size_mb, system);

    let cache_type_k = if suggestion.can_fit_fully_in_vram || suggestion.total_usable_mb > 8192 {
        "f16".to_string()
    } else {
        "q8_0".to_string()
    };

    ServerConfig {
        model_path: model_path.to_string(),
        n_ctx: suggestion.n_ctx,
        n_gpu_layers: suggestion.n_gpu_layers,
        parallel: suggestion.parallel,
        flash_attn: "auto".to_string(),
        cache_type_k,
        cache_type_v: "f16".to_string(),
        ..ServerConfig::default()
    }
}
