use crate::knowledge_store::models::ZimLibraryItem;
use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio::sync::RwLock;
use zim::Zim;

#[derive(Clone)]
pub struct LibraryManager {
    pub zim_dir: PathBuf,
    pub external_paths: Arc<RwLock<Vec<PathBuf>>>,
}

impl LibraryManager {
    pub fn new(app_data_dir: &Path) -> Self {
        let zim_dir = app_data_dir.join("zim");
        let _ = std::fs::create_dir_all(&zim_dir);

        Self {
            zim_dir,
            external_paths: Arc::new(RwLock::new(Vec::new())),
        }
    }

    pub async fn list_archives(&self) -> Vec<ZimLibraryItem> {
        let mut items = Vec::new();
        let mut seen = HashSet::new();

        // 1. Scan app zim directory
        if let Ok(entries) = std::fs::read_dir(&self.zim_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_file() && path.extension().map(|e| e == "zim").unwrap_or(false) {
                    if let Ok(item) = self.inspect_zim_file(&path, false) {
                        seen.insert(path.clone());
                        items.push(item);
                    }
                }
            }
        }

        // 2. Scan external imported files
        let externals = self.external_paths.read().await;
        for path in externals.iter() {
            if path.exists() && !seen.contains(path) {
                if let Ok(item) = self.inspect_zim_file(path, true) {
                    seen.insert(path.clone());
                    items.push(item);
                }
            }
        }

        items
    }

    pub fn inspect_zim_file(&self, path: &Path, is_external: bool) -> Result<ZimLibraryItem, String> {
        let meta = std::fs::metadata(path).map_err(|e| e.to_string())?;
        let file_name = path
            .file_name()
            .map(|f| f.to_string_lossy().to_string())
            .unwrap_or_else(|| "archive.zim".to_string());

        let id = file_name.trim_end_matches(".zim").to_string();

        let (title, article_count, cluster_count, main_page) = match Zim::new(path) {
            Ok(z) => {
                let count = z.header.article_count;
                let clusters = z.header.cluster_count;
                let main_url = z.main_page().ok().flatten().map(|e| e.url);

                // Try reading metadata title or fallback to filename
                let mut title = file_name.trim_end_matches(".zim").replace('_', " ");
                if let Ok(Some(content)) = z.metadata("Title") {
                    if let Ok(bytes) = content.to_vec() {
                        let parsed = String::from_utf8_lossy(&bytes).trim().to_string();
                        if !parsed.is_empty() {
                            title = parsed;
                        }
                    }
                }

                (title, count, clusters, main_url)
            }
            Err(_) => {
                let fallback_title = file_name.trim_end_matches(".zim").replace('_', " ");
                (fallback_title, 0, 0, None)
            }
        };

        Ok(ZimLibraryItem {
            id,
            title,
            file_name,
            file_path: path.to_string_lossy().to_string(),
            file_size: meta.len(),
            article_count,
            cluster_count,
            main_page_url: main_page,
            is_external,
        })
    }

    pub async fn import_file(&self, source_path_str: &str, copy: bool) -> Result<ZimLibraryItem, String> {
        let clean_str = source_path_str.trim().trim_matches('"').trim_matches('\'').trim();
        let mut source_path = PathBuf::from(clean_str);

        // 1. If exact path does not exist, try with .zim extension
        if !source_path.exists() {
            let with_zim = source_path.with_extension("zim");
            if with_zim.exists() {
                source_path = with_zim;
            } else if let Some(parent) = source_path.parent() {
                // Try fuzzy prefix match in parent directory
                if parent.exists() {
                    let file_stem = source_path
                        .file_name()
                        .map(|f| f.to_string_lossy().to_string())
                        .unwrap_or_default();

                    if let Ok(dir_entries) = std::fs::read_dir(parent) {
                        for entry in dir_entries.flatten() {
                            let p = entry.path();
                            if p.is_file() && p.extension().map(|e| e == "zim").unwrap_or(false) {
                                let name = p.file_name().map(|f| f.to_string_lossy()).unwrap_or_default();
                                if name.starts_with(&file_stem) {
                                    source_path = p;
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }

        if !source_path.exists() {
            return Err(format!("File '{}' does not exist on disk.", clean_str));
        }

        if !source_path.extension().map(|e| e.eq_ignore_ascii_case("zim")).unwrap_or(false) {
            return Err("Selected file must have a .zim extension".to_string());
        }

        if copy {
            let file_name = source_path
                .file_name()
                .ok_or_else(|| "Invalid file name".to_string())?;
            let dest_path = self.zim_dir.join(file_name);
            if source_path != dest_path {
                std::fs::copy(&source_path, &dest_path)
                    .map_err(|e| format!("Failed to copy file: {}", e))?;
            }
            self.inspect_zim_file(&dest_path, false)
        } else {
            let mut externals = self.external_paths.write().await;
            if !externals.contains(&source_path) {
                externals.push(source_path.clone());
            }
            self.inspect_zim_file(&source_path, true)
        }
    }

    pub async fn delete_archive(&self, id_or_filename: &str) -> Result<(), String> {
        // Check in app zim_dir
        let in_dir = self.zim_dir.join(if id_or_filename.ends_with(".zim") {
            id_or_filename.to_string()
        } else {
            format!("{}.zim", id_or_filename)
        });

        if in_dir.exists() {
            std::fs::remove_file(&in_dir).map_err(|e| e.to_string())?;
            return Ok(());
        }

        // Check in externals
        let mut externals = self.external_paths.write().await;
        externals.retain(|p| {
            p.file_name()
                .map(|f| f.to_string_lossy() != id_or_filename && f.to_string_lossy() != format!("{}.zim", id_or_filename))
                .unwrap_or(true)
        });

        Ok(())
    }
}

