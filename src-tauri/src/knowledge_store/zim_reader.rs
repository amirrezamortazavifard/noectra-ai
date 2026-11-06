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
        let max_results = if limit == 0 { 50 } else { limit.min(200) };

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

            if q_clean.is_empty()
                || title.to_lowercase().contains(&q_clean)
                || entry.url.to_lowercase().contains(&q_clean)
            {
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
}
