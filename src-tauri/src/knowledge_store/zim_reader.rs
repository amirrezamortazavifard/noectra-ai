use crate::knowledge_store::models::{ZimArticleContent, ZimArticleSummary};
use std::path::Path;
use zim::{Namespace, Zim};

pub struct ZimReader;

impl ZimReader {
    pub fn search_articles(
        zim_path: &Path,
        query: &str,
        limit: usize,
    ) -> Result<Vec<ZimArticleSummary>, String> {
        let zim = Zim::new(zim_path).map_err(|e| format!("Failed to open ZIM: {}", e))?;
        let q_clean = query.trim().to_lowercase();
        let mut results = Vec::new();
        let mut seen_titles = std::collections::HashSet::new();
        let mut seen_urls = std::collections::HashSet::new();
        let max_results = if limit == 0 { 60 } else { limit.min(300) };

        for entry_res in zim.iterate_by_urls() {
            let entry = match entry_res {
                Ok(e) => e,
                Err(_) => continue,
            };

            // Filter out non-article namespaces (like layout '-', images 'I', metadata 'M')
            let is_article = match entry.namespace {
                Namespace::UserContent | Namespace::Articles => true,
                _ => false,
            };

            if !is_article {
                continue;
            }

            // Exclude common static asset extensions
            if entry.url.ends_with(".css")
                || entry.url.ends_with(".js")
                || entry.url.ends_with(".png")
                || entry.url.ends_with(".jpg")
                || entry.url.ends_with(".svg")
                || entry.url.ends_with(".ico")
            {
                continue;
            }

            let title = if entry.title.is_empty() {
                entry.url.clone()
            } else {
                entry.title.clone()
            };

            let norm_title = title.trim().to_lowercase();
            let norm_url = entry.url.trim().to_lowercase();

            if seen_titles.contains(&norm_title) || seen_urls.contains(&norm_url) {
                continue;
            }

            if q_clean.is_empty()
                || norm_title.contains(&q_clean)
                || norm_url.contains(&q_clean)
            {
                seen_titles.insert(norm_title);
                seen_urls.insert(norm_url);

                results.push(ZimArticleSummary {
                    url: entry.url,
                    title,
                    namespace: format!("{:?}", entry.namespace),
                    mime_type: format!("{:?}", entry.mime_type),
                });

                if results.len() >= max_results {
                    break;
                }
            }
        }

        Ok(results)
    }

    pub fn read_article(
        zim_path: &Path,
        article_url: &str,
    ) -> Result<ZimArticleContent, String> {
        let clean_url = article_url.trim_start_matches('/');
        if clean_url.contains("..") {
            return Err("Path traversal attempt detected in article URL".to_string());
        }

        let zim = Zim::new(zim_path).map_err(|e| format!("Failed to open ZIM: {}", e))?;

        // Try namespaces: UserContent (modern 6.1+), then Articles (legacy)
        let mut found_entry = None;
        if let Ok(Some(entry)) = zim.get_by_path(Namespace::UserContent, article_url) {
            found_entry = Some(entry);
        } else if let Ok(Some(entry)) = zim.get_by_path(Namespace::Articles, article_url) {
            found_entry = Some(entry);
        } else {
            // Scan through iterate_by_urls as fallback lookup
            for entry_res in zim.iterate_by_urls() {
                if let Ok(entry) = entry_res {
                    if entry.url == article_url || entry.title == article_url {
                        found_entry = Some(entry);
                        break;
                    }
                }
            }
        }

        let entry = found_entry.ok_or_else(|| format!("Article '{}' not found in archive", article_url))?;

        // Resolve redirects automatically
        let resolved = zim.resolve(entry).unwrap_or_else(|_| {
            // Fallback to original entry if resolve fails
            // (Re-fetch original)
            zim.get_by_path(Namespace::UserContent, article_url)
                .ok()
                .flatten()
                .unwrap()
        });

        let title = if resolved.title.is_empty() {
            resolved.url.clone()
        } else {
            resolved.title.clone()
        };

        let content_handle = zim
            .entry_content(&resolved)
            .map_err(|e| format!("Failed to access content: {}", e))?
            .ok_or_else(|| "Entry has no content body".to_string())?;

        let raw_bytes = content_handle
            .to_vec()
            .map_err(|e| format!("Decompression error: {}", e))?;

        let html = String::from_utf8_lossy(&raw_bytes).to_string();
        let markdown_text = html2md::parse_html(&html);

        Ok(ZimArticleContent {
            url: resolved.url,
            title,
            html,
            text: markdown_text,
            mime_type: format!("{:?}", resolved.mime_type),
        })
    }

    pub fn read_resource(
        zim_path: &Path,
        resource_path: &str,
    ) -> Result<(String, Vec<u8>), String> {
        let clean_path = resource_path.trim_start_matches('/');
        if clean_path.contains("..") {
            return Err("Invalid path traversal detected in resource URL".to_string());
        }

        let zim = Zim::new(zim_path).map_err(|e| format!("Failed to open ZIM: {}", e))?;

        let mut found_entry = None;
        for ns in [Namespace::UserContent, Namespace::Articles] {
            if let Ok(Some(entry)) = zim.get_by_path(ns, clean_path) {
                found_entry = Some(entry);
                break;
            }
        }

        if found_entry.is_none() {
            for entry_res in zim.iterate_by_urls() {
                if let Ok(entry) = entry_res {
                    if entry.url == clean_path || entry.title == clean_path {
                        found_entry = Some(entry);
                        break;
                    }
                }
            }
        }

        let entry = found_entry.ok_or_else(|| format!("Resource '{}' not found in archive", clean_path))?;
        let resolved = match zim.resolve(entry) {
            Ok(r) => r,
            Err(_) => {
                zim.get_by_path(Namespace::UserContent, clean_path)
                    .ok()
                    .flatten()
                    .ok_or_else(|| "Could not resolve resource".to_string())?
            }
        };

        let content_handle = zim
            .entry_content(&resolved)
            .map_err(|e| format!("Failed to access content: {}", e))?
            .ok_or_else(|| "Entry has no content body".to_string())?;

        let raw_bytes = content_handle
            .to_vec()
            .map_err(|e| format!("Decompression error: {}", e))?;

        let lower = clean_path.to_lowercase();
        let mime = if lower.ends_with(".png") {
            "image/png".to_string()
        } else if lower.ends_with(".jpg") || lower.ends_with(".jpeg") {
            "image/jpeg".to_string()
        } else if lower.ends_with(".svg") {
            "image/svg+xml".to_string()
        } else if lower.ends_with(".webp") {
            "image/webp".to_string()
        } else if lower.ends_with(".css") {
            "text/css".to_string()
        } else if lower.ends_with(".js") {
            "application/javascript".to_string()
        } else {
            "application/octet-stream".to_string()
        };

        Ok((mime, raw_bytes))
    }
}

