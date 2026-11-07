use crate::knowledge_store::models::{ZimArticleContent, ZimArticleSummary};
use std::path::Path;
use zim::{Namespace, Zim};

pub struct ZimReader;

fn is_readable_article_entry(entry: &zim::DirectoryEntry) -> bool {
    // 1. Must be in UserContent or Articles namespace
    match entry.namespace {
        Namespace::UserContent | Namespace::Articles => {}
        _ => return false,
    }

    if entry.url.is_empty() {
        return false;
    }

    // 2. Filter out non-article MIME types
    match &entry.mime_type {
        zim::MimeType::Redirect => {
            // Redirects are allowed as potential article links, checked against URL extensions below
        }
        zim::MimeType::Type(m) => {
            let m_lower = m.to_lowercase();
            // Disallow media, fonts, binary, data, styles, scripts, manifests
            if m_lower.starts_with("video/")
                || m_lower.starts_with("audio/")
                || m_lower.starts_with("image/")
                || m_lower.starts_with("font/")
                || m_lower.contains("font")
                || m_lower.contains("javascript")
                || m_lower.contains("css")
                || m_lower.contains("octet-stream")
                || m_lower.contains("mpegurl")
                || m_lower.contains("dash+xml")
                || m_lower.contains("json")
                || m_lower.contains("binary")
                || m_lower.contains("tar")
                || m_lower.contains("zip")
                || m_lower.contains("pdf")
            {
                return false;
            }
            // Must be html, plain text, or markdown
            if !(m_lower.contains("html")
                || m_lower == "text/plain"
                || m_lower == "text/markdown"
                || m_lower == "application/xhtml+xml")
            {
                return false;
            }
        }
        _ => return false,
    }

    // 3. Filter by file extensions
    let url_clean = entry
        .url
        .split('?')
        .next()
        .unwrap_or(&entry.url)
        .split('#')
        .next()
        .unwrap_or(&entry.url);
    let lower_url = url_clean.to_lowercase();

    const EXCLUDED_EXTENSIONS: &[&str] = &[
        ".css", ".js", ".mjs", ".jsx", ".ts", ".tsx",
        ".png", ".jpg", ".jpeg", ".svg", ".gif", ".webp", ".ico", ".bmp", ".tiff", ".avif",
        ".mp4", ".webm", ".ogv", ".avi", ".mov", ".mkv", ".m4s", ".m3u8", ".mpd",
        ".mp3", ".ogg", ".wav", ".aac", ".flac", ".opus", ".m4a",
        ".woff", ".woff2", ".ttf", ".eot", ".otf",
        ".json", ".xml", ".bolt", ".vtt", ".srt", ".bin", ".dat", ".map", ".wasm",
        ".pdf", ".zip", ".tar", ".gz", ".bz2", ".7z",
    ];

    for ext in EXCLUDED_EXTENSIONS {
        if lower_url.ends_with(ext) {
            return false;
        }
    }

    // 4. Exclude URL paths that are clearly CDN segments, font directories, or manifest endpoints
    if lower_url.contains("/media/v1/hls/")
        || lower_url.contains("/fonts/")
        || lower_url.contains("brightcovecdn.com")
        || lower_url.contains("manifest.")
        || lower_url.contains("edge.api.")
    {
        return false;
    }

    true
}

fn format_clean_title(entry: &zim::DirectoryEntry) -> String {
    if !entry.title.is_empty() {
        return entry.title.clone();
    }
    // Clean up URL into a readable title
    let path = entry.url.split('?').next().unwrap_or(&entry.url);
    let last_segment = path.split('/').filter(|s| !s.is_empty()).last().unwrap_or(path);
    let name_without_ext = last_segment.trim_end_matches(".html").trim_end_matches(".htm");
    let readable = name_without_ext.replace('_', " ").replace('-', " ");
    if readable.is_empty() {
        entry.url.clone()
    } else {
        readable
    }
}

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

        // 1. If query is empty, prioritize main page if available
        if q_clean.is_empty() {
            if let Ok(Some(main_entry)) = zim.main_page() {
                if is_readable_article_entry(&main_entry) {
                    let title = if main_entry.title.is_empty() {
                        "Home / Main Page".to_string()
                    } else {
                        main_entry.title.clone()
                    };
                    seen_titles.insert(title.trim().to_lowercase());
                    seen_urls.insert(main_entry.url.trim().to_lowercase());
                    results.push(ZimArticleSummary {
                        url: main_entry.url,
                        title,
                        namespace: format!("{:?}", main_entry.namespace),
                        mime_type: format!("{:?}", main_entry.mime_type),
                    });
                }
            }
        }

        // 2. Try article_list_by_title (Kiwix format 6.1+)
        let mut populated_from_listing = false;
        if let Ok(Some(listing)) = zim.article_list_by_title() {
            if let Ok(listing_len) = listing.len() {
                if listing_len > 0 {
                    populated_from_listing = true;
                    // Scan listing window
                    let scan_limit = if q_clean.is_empty() {
                        listing_len.min(max_results * 5)
                    } else {
                        listing_len.min(10_000)
                    };

                    for pos in 0..scan_limit {
                        if let Ok(Some(idx)) = listing.get(pos) {
                            if let Ok(entry) = zim.get_by_url_index(idx) {
                                if !is_readable_article_entry(&entry) {
                                    continue;
                                }

                                let title = format_clean_title(&entry);
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
                        }
                    }
                }
            }
        }

        // 3. Fallback to iterate_by_urls if article_list_by_title was not present or yielded fewer than max_results
        if !populated_from_listing || (results.is_empty() && !q_clean.is_empty()) {
            for entry_res in zim.iterate_by_urls() {
                let entry = match entry_res {
                    Ok(e) => e,
                    Err(_) => continue,
                };

                if !is_readable_article_entry(&entry) {
                    continue;
                }

                let title = format_clean_title(&entry);
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
            zim.get_by_path(Namespace::UserContent, article_url)
                .ok()
                .flatten()
                .unwrap()
        });

        let title = format_clean_title(&resolved);

        let content_handle = zim
            .entry_content(&resolved)
            .map_err(|e| format!("Failed to access content: {}", e))?
            .ok_or_else(|| "Entry has no content body".to_string())?;

        let raw_bytes = content_handle
            .to_vec()
            .map_err(|e| format!("Decompression error: {}", e))?;

        let mime_str = match &resolved.mime_type {
            zim::MimeType::Type(m) => m.to_lowercase(),
            _ => String::new(),
        };

        // Check if entry is media or binary
        let is_video = mime_str.starts_with("video/") || resolved.url.ends_with(".mp4") || resolved.url.ends_with(".webm");
        let is_audio = mime_str.starts_with("audio/") || resolved.url.ends_with(".mp3") || resolved.url.ends_with(".ogg") || resolved.url.ends_with(".wav");
        let is_image = mime_str.starts_with("image/") || resolved.url.ends_with(".png") || resolved.url.ends_with(".jpg") || resolved.url.ends_with(".svg");

        let is_binary_stream = {
            let sample = &raw_bytes[..raw_bytes.len().min(1024)];
            sample.iter().any(|&b| b == 0) || {
                let non_text_count = sample
                    .iter()
                    .filter(|&&b| b < 0x09 || (b > 0x0a && b < 0x0d) || (b > 0x0d && b < 0x20))
                    .count();
                non_text_count > (sample.len() / 5)
            }
        };

        let (html, markdown_text) = if is_video {
            let html_content = format!(
                r#"<div class="zim-media-container" style="text-align: center; padding: 48px 16px;">
                    <div style="font-size: 40px; margin-bottom: 12px;">🎬</div>
                    <h3 style="font-size: 20px; font-weight: 600; margin-bottom: 8px;">Multimedia Video Entry</h3>
                    <p style="color: #94a3b8; font-size: 13px; margin-bottom: 24px;">URL: {}</p>
                </div>"#,
                article_url
            );
            (html_content, format!("Multimedia Video: {}", article_url))
        } else if is_audio {
            let html_content = format!(
                r#"<div class="zim-media-container" style="text-align: center; padding: 48px 16px;">
                    <div style="font-size: 40px; margin-bottom: 12px;">🎵</div>
                    <h3 style="font-size: 20px; font-weight: 600; margin-bottom: 8px;">Audio Entry</h3>
                    <p style="color: #94a3b8; font-size: 13px; margin-bottom: 24px;">URL: {}</p>
                </div>"#,
                article_url
            );
            (html_content, format!("Audio Entry: {}", article_url))
        } else if is_binary_stream && !is_image {
            let html_content = format!(
                r#"<div class="zim-binary-notice" style="padding: 48px 20px; text-align: center; max-width: 640px; margin: 40px auto; border-radius: 12px; border: 1px dashed rgba(255,255,255,0.15); background: rgba(255,255,255,0.02);">
                    <div style="font-size: 40px; margin-bottom: 16px;">📦</div>
                    <h3 style="font-size: 20px; font-weight: 600; margin-bottom: 8px;">Non-Text Binary Entry</h3>
                    <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
                        The selected item is a binary asset or media segment (<code>{}</code>) and cannot be displayed as plain text.
                    </p>
                    <span style="display: inline-block; font-size: 12px; padding: 4px 12px; border-radius: 9999px; background: rgba(255,255,255,0.06); color: #cbd5e1; border: 1px solid rgba(255,255,255,0.1);">
                        Size: {} bytes
                    </span>
                </div>"#,
                article_url,
                raw_bytes.len()
            );
            (html_content, format!("Non-text binary entry: {}", article_url))
        } else {
            let html_str = String::from_utf8_lossy(&raw_bytes).to_string();
            let md_str = html2md::parse_html(&html_str);
            (html_str, md_str)
        };

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

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn test_nhs_medicines_zim() {
        let p = PathBuf::from("../data/zim/nhs.uk_en_medicines_2026-09b.zim");
        if !p.exists() {
            return;
        }

        let articles = ZimReader::search_articles(&p, "", 20).unwrap();
        println!("ZimReader search articles returned {} items:", articles.len());
        assert!(!articles.is_empty());
        for (i, a) in articles.iter().enumerate() {
            println!("  [{}] title='{}' url='{}'", i, a.title, a.url);
            assert!(!a.url.ends_with(".ts"));
            assert!(!a.url.ends_with(".vtt"));
            assert!(!a.url.contains("brightcovecdn.com"));
        }

        // Verify main page is first
        assert_eq!(articles[0].url, "www.nhs.uk/medicines/");
        assert_eq!(articles[0].title, "Medicines A to Z - NHS");

        // Verify reading main page
        let art = ZimReader::read_article(&p, &articles[0].url).unwrap();
        assert_eq!(art.title, "Medicines A to Z - NHS");
        assert!(!art.html.is_empty());
        if let Some(pos) = art.html.find('\u{FFFD}') {
            let start = pos.saturating_sub(50);
            let end = (pos + 50).min(art.html.len());
            println!("Found FFFD at {}: {:?}", pos, &art.html[start..end]);
        }
    }
}
