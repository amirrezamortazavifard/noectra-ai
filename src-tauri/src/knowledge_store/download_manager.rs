use crate::knowledge_store::models::{DownloadStatus, DownloadTask, StartDownloadRequest};
use futures::StreamExt;
use reqwest::header::{HeaderMap, HeaderValue, RANGE};
use reqwest::Client;
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::fs::{File, OpenOptions};
use tokio::io::AsyncWriteExt;
use tokio::sync::{watch, RwLock};

#[derive(Clone)]
pub struct DownloadManager {
    tasks: Arc<RwLock<HashMap<String, DownloadTask>>>,
    pause_senders: Arc<RwLock<HashMap<String, watch::Sender<bool>>>>,
    cancel_senders: Arc<RwLock<HashMap<String, watch::Sender<bool>>>>,
    client: Client,
}

impl DownloadManager {
    pub fn new() -> Self {
        let client = Client::builder()
            .connect_timeout(Duration::from_secs(30))
            .pool_idle_timeout(Duration::from_secs(90))
            .tcp_keepalive(Duration::from_secs(30))
            .redirect(reqwest::redirect::Policy::limited(10))
            .build()
            .unwrap_or_default();

        Self {
            tasks: Arc::new(RwLock::new(HashMap::new())),
            pause_senders: Arc::new(RwLock::new(HashMap::new())),
            cancel_senders: Arc::new(RwLock::new(HashMap::new())),
            client,
        }
    }

    pub async fn get_all_tasks(&self) -> Vec<DownloadTask> {
        let map = self.tasks.read().await;
        map.values().cloned().collect()
    }

    pub async fn get_task(&self, id: &str) -> Option<DownloadTask> {
        let map = self.tasks.read().await;
        map.get(id).cloned()
    }

    pub async fn start_download(
        &self,
        req: StartDownloadRequest,
        zim_dir: PathBuf,
    ) -> Result<DownloadTask, String> {
        let file_name = req
            .download_url
            .split('/')
            .last()
            .unwrap_or("archive.zim")
            .split('?')
            .next()
            .unwrap_or("archive.zim")
            .to_string();

        let target_path = zim_dir.join(&file_name);
        let temp_dir = zim_dir.join("temp");
        let _ = tokio::fs::create_dir_all(&temp_dir).await;
        let part_path = temp_dir.join(format!("{}.part", &file_name));

        // Check if finished file already exists
        if target_path.exists() {
            if let Ok(meta) = tokio::fs::metadata(&target_path).await {
                let task = DownloadTask {
                    id: req.id.clone(),
                    title: req.title.clone(),
                    file_name: file_name.clone(),
                    download_url: req.download_url.clone(),
                    total_bytes: meta.len(),
                    downloaded_bytes: meta.len(),
                    speed_bps: 0,
                    progress_pct: 100.0,
                    status: DownloadStatus::Completed,
                    error_message: None,
                    target_path: target_path.to_string_lossy().to_string(),
                };
                self.tasks.write().await.insert(req.id.clone(), task.clone());
                return Ok(task);
            }
        }

        let initial_downloaded = if part_path.exists() {
            tokio::fs::metadata(&part_path).await.map(|m| m.len()).unwrap_or(0)
        } else {
            0
        };

        let initial_task = DownloadTask {
            id: req.id.clone(),
            title: req.title.clone(),
            file_name: file_name.clone(),
            download_url: req.download_url.clone(),
            total_bytes: req.total_bytes.unwrap_or(0),
            downloaded_bytes: initial_downloaded,
            speed_bps: 0,
            progress_pct: if req.total_bytes.unwrap_or(0) > 0 {
                (initial_downloaded as f32 / req.total_bytes.unwrap() as f32) * 100.0
            } else {
                0.0
            },
            status: DownloadStatus::Downloading,
            error_message: None,
            target_path: target_path.to_string_lossy().to_string(),
        };

        self.tasks.write().await.insert(req.id.clone(), initial_task.clone());

        let (pause_tx, pause_rx) = watch::channel(false);
        let (cancel_tx, cancel_rx) = watch::channel(false);
        self.pause_senders.write().await.insert(req.id.clone(), pause_tx);
        self.cancel_senders.write().await.insert(req.id.clone(), cancel_tx);

        let mgr = self.clone();
        let task_id = req.id.clone();
        let download_url = req.download_url.clone();
        let sha256_checksum = req.sha256.clone();

        tokio::spawn(async move {
            mgr.run_download_loop(
                task_id,
                download_url,
                part_path,
                target_path,
                sha256_checksum,
                pause_rx,
                cancel_rx,
            )
            .await;
        });

        Ok(initial_task)
    }

    pub async fn pause_download(&self, id: &str) -> Result<(), String> {
        if let Some(tx) = self.pause_senders.read().await.get(id) {
            let _ = tx.send(true);
        }
        let mut tasks = self.tasks.write().await;
        if let Some(task) = tasks.get_mut(id) {
            task.status = DownloadStatus::Paused;
            task.speed_bps = 0;
            return Ok(());
        }
        Err("Task not found".to_string())
    }

    pub async fn pause_all(&self) {
        let active_ids: Vec<String> = {
            let tasks = self.tasks.read().await;
            tasks
                .values()
                .filter(|t| t.status == DownloadStatus::Downloading || t.status == DownloadStatus::Queued)
                .map(|t| t.id.clone())
                .collect()
        };
        for id in active_ids {
            let _ = self.pause_download(&id).await;
        }
    }

    pub async fn resume_all(&self, zim_dir: PathBuf) {
        let paused_ids: Vec<String> = {
            let tasks = self.tasks.read().await;
            tasks
                .values()
                .filter(|t| t.status == DownloadStatus::Paused)
                .map(|t| t.id.clone())
                .collect()
        };
        for id in paused_ids {
            let _ = self.resume_download(&id, zim_dir.clone()).await;
        }
    }

    pub async fn clear_completed(&self) {
        let mut tasks = self.tasks.write().await;
        tasks.retain(|_, t| {
            t.status == DownloadStatus::Downloading
                || t.status == DownloadStatus::Queued
                || t.status == DownloadStatus::Paused
        });
    }

    pub async fn resume_download(&self, id: &str, zim_dir: PathBuf) -> Result<(), String> {
        let task = {
            let tasks = self.tasks.read().await;
            tasks.get(id).cloned().ok_or_else(|| "Task not found".to_string())?
        };

        let req = StartDownloadRequest {
            id: task.id,
            title: task.title,
            download_url: task.download_url,
            total_bytes: Some(task.total_bytes),
            sha256: None,
        };

        self.start_download(req, zim_dir).await?;
        Ok(())
    }

    pub async fn cancel_download(&self, id: &str) -> Result<(), String> {
        if let Some(tx) = self.cancel_senders.read().await.get(id) {
            let _ = tx.send(true);
        }
        let mut tasks = self.tasks.write().await;
        if let Some(task) = tasks.get_mut(id) {
            task.status = DownloadStatus::Cancelled;
            task.speed_bps = 0;
            // Clean up partial file
            let part_path = PathBuf::from(&task.target_path)
                .parent()
                .map(|p| p.join("temp").join(format!("{}.part", &task.file_name)));
            if let Some(p) = part_path {
                let _ = tokio::fs::remove_file(p).await;
            }
            return Ok(());
        }
        Err("Task not found".to_string())
    }

    async fn run_download_loop(
        &self,
        id: String,
        url: String,
        part_path: PathBuf,
        target_path: PathBuf,
        sha256_checksum: Option<String>,
        pause_rx: watch::Receiver<bool>,
        cancel_rx: watch::Receiver<bool>,
    ) {
        let max_retries = 10;
        let mut retry_count = 0;
        let mut final_downloaded: u64;

        loop {
            let mut existing_bytes: u64 = 0;
            if part_path.exists() {
                if let Ok(meta) = tokio::fs::metadata(&part_path).await {
                    existing_bytes = meta.len();
                }
            }
            final_downloaded = existing_bytes;

            let mut headers = HeaderMap::new();
            if existing_bytes > 0 {
                if let Ok(val) = HeaderValue::from_str(&format!("bytes={}-", existing_bytes)) {
                    headers.insert(RANGE, val);
                }
            }

            let resp_res = self.client.get(&url).headers(headers).send().await;
            let response = match resp_res {
                Ok(r) => r,
                Err(e) => {
                    if retry_count < max_retries {
                        retry_count += 1;
                        let backoff_secs = (retry_count as u64).min(10);
                        {
                            let mut map = self.tasks.write().await;
                            if let Some(t) = map.get_mut(&id) {
                                t.error_message = Some(format!(
                                    "Connection issue: {}. Auto-retrying ({}/{})...",
                                    e, retry_count, max_retries
                                ));
                            }
                        }
                        tokio::time::sleep(Duration::from_secs(backoff_secs)).await;
                        continue;
                    }
                    let mut map = self.tasks.write().await;
                    if let Some(t) = map.get_mut(&id) {
                        t.status = DownloadStatus::Failed;
                        t.error_message = Some(format!("Network error: {}", e));
                    }
                    return;
                }
            };

            let status = response.status();
            let is_range_response = status.as_u16() == 206;

            let (mut file, mut downloaded) = if is_range_response && existing_bytes > 0 {
                let f = match OpenOptions::new().create(true).append(true).open(&part_path).await {
                    Ok(f) => f,
                    Err(e) => {
                        let mut map = self.tasks.write().await;
                        if let Some(t) = map.get_mut(&id) {
                            t.status = DownloadStatus::Failed;
                            t.error_message = Some(format!("Failed to open partial file: {}", e));
                        }
                        return;
                    }
                };
                (f, existing_bytes)
            } else {
                let f = match File::create(&part_path).await {
                    Ok(f) => f,
                    Err(e) => {
                        let mut map = self.tasks.write().await;
                        if let Some(t) = map.get_mut(&id) {
                            t.status = DownloadStatus::Failed;
                            t.error_message = Some(format!("Failed to create partial file: {}", e));
                        }
                        return;
                    }
                };
                (f, 0u64)
            };

            let content_length = response.content_length().unwrap_or(0);
            let total_expected = if is_range_response {
                existing_bytes + content_length
            } else {
                content_length
            };

            {
                let mut map = self.tasks.write().await;
                if let Some(t) = map.get_mut(&id) {
                    if total_expected > 0 {
                        t.total_bytes = total_expected;
                    }
                    t.downloaded_bytes = downloaded;
                    t.status = DownloadStatus::Downloading;
                    t.error_message = None;
                }
            }

            let mut stream = response.bytes_stream();
            let mut last_tick = Instant::now();
            let mut bytes_since_tick = 0u64;
            let mut stream_failed_err = None;

            while let Some(chunk_res) = stream.next().await {
                if *cancel_rx.borrow() {
                    let mut map = self.tasks.write().await;
                    if let Some(t) = map.get_mut(&id) {
                        t.status = DownloadStatus::Cancelled;
                        t.speed_bps = 0;
                    }
                    let _ = tokio::fs::remove_file(&part_path).await;
                    return;
                }

                if *pause_rx.borrow() {
                    let _ = file.flush().await;
                    let mut map = self.tasks.write().await;
                    if let Some(t) = map.get_mut(&id) {
                        t.status = DownloadStatus::Paused;
                        t.speed_bps = 0;
                    }
                    return;
                }

                match chunk_res {
                    Ok(chunk) => {
                        let len = chunk.len() as u64;
                        if let Err(e) = file.write_all(&chunk).await {
                            let mut map = self.tasks.write().await;
                            if let Some(t) = map.get_mut(&id) {
                                t.status = DownloadStatus::Failed;
                                t.error_message = Some(format!("Write error: {}", e));
                            }
                            return;
                        }
                        downloaded += len;
                        final_downloaded = downloaded;
                        bytes_since_tick += len;
                        // Successfully receiving data resets retry count
                        if retry_count > 0 && bytes_since_tick > 512 * 1024 {
                            retry_count = 0;
                        }

                        let now = Instant::now();
                        let elapsed = now.duration_since(last_tick);
                        if elapsed >= Duration::from_millis(500) {
                            let speed = (bytes_since_tick as f64 / elapsed.as_secs_f64()) as u64;
                            let mut map = self.tasks.write().await;
                            if let Some(t) = map.get_mut(&id) {
                                t.downloaded_bytes = downloaded;
                                t.speed_bps = speed;
                                if t.total_bytes > 0 {
                                    t.progress_pct = (downloaded as f32 / t.total_bytes as f32) * 100.0;
                                }
                            }
                            last_tick = now;
                            bytes_since_tick = 0;
                        }
                    }
                    Err(e) => {
                        stream_failed_err = Some(e);
                        break;
                    }
                }
            }

            let _ = file.flush().await;
            drop(file);

            if let Some(e) = stream_failed_err {
                if retry_count < max_retries {
                    retry_count += 1;
                    let backoff_secs = (retry_count as u64).min(8);
                    {
                        let mut map = self.tasks.write().await;
                        if let Some(t) = map.get_mut(&id) {
                            t.speed_bps = 0;
                            t.error_message = Some(format!(
                                "Interrupted: {}. Auto-reconnecting from {} ({}/{})...",
                                e, downloaded, retry_count, max_retries
                            ));
                        }
                    }
                    tokio::time::sleep(Duration::from_secs(backoff_secs)).await;
                    continue; // Auto-resumes from exact byte offset using HTTP Range!
                } else {
                    let mut map = self.tasks.write().await;
                    if let Some(t) = map.get_mut(&id) {
                        t.status = DownloadStatus::Failed;
                        t.error_message = Some(format!("Stream read error: {}", e));
                    }
                    return;
                }
            }

            // Stream completed cleanly
            break;
        }

        // Verification if checksum provided
        if let Some(ref expected_hash) = sha256_checksum {
            if let Ok(mut check_file) = File::open(&part_path).await {
                let mut hasher = Sha256::new();
                let mut check_buf = [0u8; 64 * 1024];
                use tokio::io::AsyncReadExt;
                while let Ok(n) = check_file.read(&mut check_buf).await {
                    if n == 0 {
                        break;
                    }
                    hasher.update(&check_buf[..n]);
                }
                let actual_hash = format!("{:x}", hasher.finalize());
                if !actual_hash.eq_ignore_ascii_case(expected_hash) {
                    let mut map = self.tasks.write().await;
                    if let Some(t) = map.get_mut(&id) {
                        t.status = DownloadStatus::Failed;
                        t.error_message = Some("SHA-256 Checksum validation failed".to_string());
                    }
                    return;
                }
            }
        }

        // Atomic rename
        if let Err(e) = tokio::fs::rename(&part_path, &target_path).await {
            let mut map = self.tasks.write().await;
            if let Some(t) = map.get_mut(&id) {
                t.status = DownloadStatus::Failed;
                t.error_message = Some(format!("Failed to finalize file: {}", e));
            }
            return;
        }

        // Mark as completed
        let mut map = self.tasks.write().await;
        if let Some(t) = map.get_mut(&id) {
            t.status = DownloadStatus::Completed;
            t.downloaded_bytes = final_downloaded;
            t.total_bytes = final_downloaded;
            t.progress_pct = 100.0;
            t.speed_bps = 0;
            t.error_message = None;
        }
    }
}
