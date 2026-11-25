use crate::knowledge_store::models::{ZimArticleContent, ZimArticleSummary, ZimSearchResponse};
use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex, OnceLock, RwLock};
use std::time::Instant;
use zim::{Namespace, Zim};

const MAX_IN_MEMORY_INDEX_ENTRIES: usize = 350_000;

pub struct ZimReader;

#[derive(Debug, Clone)]
struct IndexedEntry {
    url: String,
    title: String,
    norm_title: String,
    norm_url: String,
    namespace: String,
    mime_type: String,
    is_redirect: bool,
}

struct CachedZimIndex {
    file_size: u64,
    modified_nanos: u128,
    total_articles: u32,
    main_page: Option<ZimArticleSummary>,
    entries: Vec<IndexedEntry>,
    default_indices: Vec<usize>,
}

struct ZimIndexCache {
    entries: RwLock<HashMap<PathBuf, Arc<CachedZimIndex>>>,
    build_lock: Mutex<()>,
}

static ZIM_CACHE: OnceLock<ZimIndexCache> = OnceLock::new();

fn cache_instance() -> &'static ZimIndexCache {
    ZIM_CACHE.get_or_init(|| ZimIndexCache {
        entries: RwLock::new(HashMap::new()),
        build_lock: Mutex::new(()),
    })
}

fn file_fingerprint(path: &Path) -> (u64, u128) {
    match std::fs::metadata(path) {
        Ok(meta) => {
            let size = meta.len();
            let modified = meta
                .modified()
                .ok()
                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|d| d.as_nanos())
                .unwrap_or(0);
            (size, modified)
        }
        Err(_) => (0, 0),
    }
}

/// Normalizes text for multilingual (Persian, Arabic, Latin) prefix and substring search.
/// - Lowercases Unicode characters
/// - Normalizes Arabic Kaf/Yeh/Alef variants to standard Persian/Arabic forms
/// - Strips Arabic diacritics/tatweel
/// - Converts ZWNJ/ZWJ/underscores to spaces and collapses whitespace
pub fn normalize_for_search(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    let mut last_was_space = true; // trims leading whitespace

    for ch in input.chars() {
        // Strip Arabic diacritics & tatweel
        if matches!(ch, '\u{064B}'..='\u{065F}' | '\u{0670}' | '\u{0640}') {
            continue;
        }

        let mapped = match ch {
            '\u{0643}' => '\u{06A9}',                         // Arabic Kaf -> Persian Kaf
            '\u{064A}' | '\u{0649}' => '\u{06CC}',            // Arabic Yeh / Alef Maksura -> Persian Yeh
            '\u{0623}' | '\u{0625}' | '\u{0671}' => '\u{0627}', // Alef Hamza/Wasla -> Alef
            '\u{06BE}' | '\u{06D5}' => '\u{0647}',            // Heh variants -> Heh
            '\u{200C}' | '\u{200D}' | '_' | '\t' | '\r' | '\n' => ' ',
            other => other,
        };

        if mapped.is_whitespace() {
            if !last_was_space {
                out.push(' ');
                last_was_space = true;
            }
        } else {
            for lc in mapped.to_lowercase() {
                out.push(lc);
            }
            last_was_space = false;
        }
    }

    if out.ends_with(' ') {
        out.pop();
    }

    out
}

fn is_word_separator(ch: char) -> bool {
    ch.is_whitespace()
        || matches!(
            ch,
            '-' | '(' | ')' | '[' | ']' | ':' | ',' | '.' | '/' | '\\' | '،' | '؛' | '«' | '»' | '–' | '—'
        )
}

fn is_word_boundary_prefix(norm_title: &str, q_norm: &str) -> bool {
    if !norm_title.starts_with(q_norm) {
        return false;
    }
    match norm_title[q_norm.len()..].chars().next() {
        None => true,
        Some(next_ch) => is_word_separator(next_ch),
    }
}

fn has_word_prefix(norm_title: &str, q_norm: &str) -> bool {
    let mut at_boundary = true;
    for (idx, ch) in norm_title.char_indices() {
        if at_boundary && norm_title[idx..].starts_with(q_norm) {
            return true;
        }
        at_boundary = is_word_separator(ch);
    }
    false
}

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
        ".css", ".js", ".mjs", ".jsx", ".ts", ".tsx", ".png", ".jpg", ".jpeg", ".svg", ".gif",
        ".webp", ".ico", ".bmp", ".tiff", ".avif", ".mp4", ".webm", ".ogv", ".avi", ".mov", ".mkv",
        ".m4s", ".m3u8", ".mpd", ".mp3", ".ogg", ".wav", ".aac", ".flac", ".opus", ".m4a", ".woff",
        ".woff2", ".ttf", ".eot", ".otf", ".json", ".xml", ".bolt", ".vtt", ".srt", ".bin", ".dat",
        ".map", ".wasm", ".pdf", ".zip", ".tar", ".gz", ".bz2", ".7z",
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
    let path = entry.url.split('?').next().unwrap_or(&entry.url);
    let last_segment = path.split('/').filter(|s| !s.is_empty()).last().unwrap_or(path);
    let name_without_ext = last_segment
        .trim_end_matches(".html")
        .trim_end_matches(".htm");
    let readable = name_without_ext.replace('_', " ").replace('-', " ");
    if readable.is_empty() {
        entry.url.clone()
    } else {
        readable
    }
}

fn build_entry_summary(entry: &IndexedEntry, match_type: Option<&str>) -> ZimArticleSummary {
    ZimArticleSummary {
        url: entry.url.clone(),
        title: entry.title.clone(),
        namespace: entry.namespace.clone(),
        mime_type: entry.mime_type.clone(),
        match_type: match_type.map(str::to_string),
        is_redirect: entry.is_redirect,
    }
}

fn insert_readable_entry(
    entry: zim::DirectoryEntry,
    raw_entries: &mut Vec<IndexedEntry>,
    seen_urls: &mut HashSet<String>,
    title_pos_map: &mut HashMap<String, usize>,
) {
    if !is_readable_article_entry(&entry) {
        return;
    }
    let is_redirect = matches!(entry.mime_type, zim::MimeType::Redirect);
    let title = format_clean_title(&entry);
    let norm_title = normalize_for_search(&title);
    if norm_title.is_empty() {
        return;
    }
    let norm_url = normalize_for_search(&entry.url);
    let raw_url_key = entry.url.trim().to_lowercase();

    if seen_urls.contains(&raw_url_key) {
        return;
    }

    let item = IndexedEntry {
        url: entry.url,
        title,
        norm_title: norm_title.clone(),
        norm_url,
        namespace: format!("{:?}", entry.namespace),
        mime_type: format!("{:?}", entry.mime_type),
        is_redirect,
    };

    if let Some(&existing_idx) = title_pos_map.get(&norm_title) {
        if raw_entries[existing_idx].is_redirect && !is_redirect {
            seen_urls.insert(raw_url_key);
            raw_entries[existing_idx] = item;
        }
        return;
    }

    seen_urls.insert(raw_url_key);
    title_pos_map.insert(norm_title, raw_entries.len());
    raw_entries.push(item);
}

fn build_cached_index(zim_path: &Path) -> Result<Option<Arc<CachedZimIndex>>, String> {
    let (file_size, modified_nanos) = file_fingerprint(zim_path);
    let zim = Zim::new(zim_path).map_err(|e| format!("Failed to open ZIM: {}", e))?;
    let total_articles = zim.header.article_count;

    let main_page = zim
        .main_page()
        .ok()
        .flatten()
        .filter(|e| is_readable_article_entry(e))
        .map(|main_entry| {
            let title = if main_entry.title.is_empty() {
                "Home / Main Page".to_string()
            } else {
                main_entry.title.clone()
            };
            ZimArticleSummary {
                url: main_entry.url,
                title,
                namespace: format!("{:?}", main_entry.namespace),
                mime_type: format!("{:?}", main_entry.mime_type),
                match_type: Some("main_page".to_string()),
                is_redirect: matches!(main_entry.mime_type, zim::MimeType::Redirect),
            }
        });

    let mut raw_entries: Vec<IndexedEntry> = Vec::new();
    let mut seen_urls: HashSet<String> = HashSet::new();
    let mut title_pos_map: HashMap<String, usize> = HashMap::new();

    let mut used_listing = false;
    if let Ok(Some(listing)) = zim.article_list_by_title() {
        if let Ok(listing_len) = listing.len() {
            if listing_len > MAX_IN_MEMORY_INDEX_ENTRIES {
                return Ok(None);
            }
            if listing_len > 0 {
                used_listing = true;
                raw_entries.reserve(listing_len.min(100_000));
                let _ = listing.for_each(|idx| {
                    if let Ok(entry) = zim.get_by_url_index(idx) {
                        insert_readable_entry(
                            entry,
                            &mut raw_entries,
                            &mut seen_urls,
                            &mut title_pos_map,
                        );
                    }
                });
            }
        }
    }

    if !used_listing {
        if (total_articles as usize) > MAX_IN_MEMORY_INDEX_ENTRIES {
            return Ok(None);
        }
        raw_entries.reserve((total_articles as usize).min(100_000));
        for entry_res in zim.iterate_by_urls() {
            if let Ok(entry) = entry_res {
                insert_readable_entry(
                    entry,
                    &mut raw_entries,
                    &mut seen_urls,
                    &mut title_pos_map,
                );
            }
        }
    }

    // Preserve first 500 natural-order URLs for empty-query directory browsing
    let default_urls: Vec<String> = raw_entries
        .iter()
        .take(500)
        .map(|e| e.url.clone())
        .collect();

    // Sort all entries lexicographically by normalized title for O(log N) binary prefix search
    raw_entries.sort_by(|a, b| {
        a.norm_title
            .cmp(&b.norm_title)
            .then(a.is_redirect.cmp(&b.is_redirect))
            .then(a.title.len().cmp(&b.title.len()))
            .then(a.title.cmp(&b.title))
    });

    let mut url_to_sorted_idx: HashMap<&str, usize> = HashMap::with_capacity(default_urls.len() * 2);
    let default_url_set: HashSet<&str> = default_urls.iter().map(|s| s.as_str()).collect();
    for (idx, e) in raw_entries.iter().enumerate() {
        if default_url_set.contains(e.url.as_str()) {
            url_to_sorted_idx.insert(e.url.as_str(), idx);
            if url_to_sorted_idx.len() >= default_url_set.len() {
                break;
            }
        }
    }
    let default_indices: Vec<usize> = default_urls
        .iter()
        .filter_map(|u| url_to_sorted_idx.get(u.as_str()).copied())
        .collect();

    Ok(Some(Arc::new(CachedZimIndex {
        file_size,
        modified_nanos,
        total_articles,
        main_page,
        entries: raw_entries,
        default_indices,
    })))
}

fn get_or_build_cached_index(zim_path: &Path) -> Result<Option<Arc<CachedZimIndex>>, String> {
    let key = std::fs::canonicalize(zim_path).unwrap_or_else(|_| zim_path.to_path_buf());
    let (size, modified) = file_fingerprint(zim_path);
    let cache = cache_instance();

    {
        let guard = cache.entries.read().unwrap();
        if let Some(existing) = guard.get(&key) {
            if existing.file_size == size && existing.modified_nanos == modified {
                return Ok(Some(Arc::clone(existing)));
            }
        }
    }

    let _build_guard = cache.build_lock.lock().unwrap();
    // Double-check after acquiring build lock
    {
        let guard = cache.entries.read().unwrap();
        if let Some(existing) = guard.get(&key) {
            if existing.file_size == size && existing.modified_nanos == modified {
                return Ok(Some(Arc::clone(existing)));
            }
        }
    }

    let built = build_cached_index(zim_path)?;
    if let Some(ref index_arc) = built {
        let mut guard = cache.entries.write().unwrap();
        // Bound cache size to avoid unbounded memory if user opens dozens of archives
        if guard.len() >= 12 {
            guard.clear();
        }
        guard.insert(key, Arc::clone(index_arc));
    }

    Ok(built)
}

fn search_in_cached_index(
    index: &CachedZimIndex,
    query: &str,
    max_results: usize,
) -> Vec<ZimArticleSummary> {
    let q_norm = normalize_for_search(query);
    let mut results = Vec::with_capacity(max_results);

    if q_norm.is_empty() {
        let mut seen_urls = HashSet::new();
        if let Some(ref main) = index.main_page {
            seen_urls.insert(main.url.clone());
            results.push(main.clone());
        }
        for &idx in &index.default_indices {
            if results.len() >= max_results {
                break;
            }
            let entry = &index.entries[idx];
            if seen_urls.insert(entry.url.clone()) {
                results.push(build_entry_summary(entry, None));
            }
        }
        if results.len() < max_results {
            for entry in &index.entries {
                if results.len() >= max_results {
                    break;
                }
                if seen_urls.insert(entry.url.clone()) {
                    results.push(build_entry_summary(entry, None));
                }
            }
        }
        return results;
    }

    let mut seen_indices = HashSet::new();

    // 1. O(log N) binary search for prefix matches (exact prefix comes first!)
    let start_pos = index
        .entries
        .partition_point(|e| e.norm_title.as_str() < q_norm.as_str());

    let mut exact_hits: Vec<(usize, &IndexedEntry)> = Vec::new();
    let mut boundary_prefix_hits: Vec<(usize, &IndexedEntry)> = Vec::new();
    let mut regular_prefix_hits: Vec<(usize, &IndexedEntry)> = Vec::new();
    let mut redirect_prefix_hits: Vec<(usize, &IndexedEntry)> = Vec::new();

    const MAX_PREFIX_SCAN: usize = 8_000;
    for (offset, entry) in index.entries[start_pos..].iter().enumerate() {
        if offset >= MAX_PREFIX_SCAN || !entry.norm_title.starts_with(&q_norm) {
            break;
        }
        let abs_idx = start_pos + offset;
        seen_indices.insert(abs_idx);

        if entry.norm_title == q_norm {
            exact_hits.push((abs_idx, entry));
        } else if !entry.is_redirect && is_word_boundary_prefix(&entry.norm_title, &q_norm) {
            boundary_prefix_hits.push((abs_idx, entry));
        } else if !entry.is_redirect {
            regular_prefix_hits.push((abs_idx, entry));
        } else {
            redirect_prefix_hits.push((abs_idx, entry));
        }
    }

    for (_, e) in exact_hits {
        if results.len() >= max_results {
            return results;
        }
        results.push(build_entry_summary(e, Some("exact")));
    }
    for (_, e) in boundary_prefix_hits {
        if results.len() >= max_results {
            return results;
        }
        results.push(build_entry_summary(e, Some("prefix")));
    }
    for (_, e) in regular_prefix_hits {
        if results.len() >= max_results {
            return results;
        }
        results.push(build_entry_summary(e, Some("prefix")));
    }
    for (_, e) in redirect_prefix_hits {
        if results.len() >= max_results {
            return results;
        }
        results.push(build_entry_summary(e, Some("prefix")));
    }

    // 2. If fewer than max_results prefix matches were found, fill remaining slots with word-prefix and substring matches
    if results.len() < max_results {
        let mut word_prefix_hits: Vec<&IndexedEntry> = Vec::new();
        let mut contains_hits: Vec<&IndexedEntry> = Vec::new();
        let remaining_needed = max_results - results.len();

        for (idx, entry) in index.entries.iter().enumerate() {
            if seen_indices.contains(&idx) {
                continue;
            }
            if has_word_prefix(&entry.norm_title, &q_norm) {
                word_prefix_hits.push(entry);
                if word_prefix_hits.len() >= remaining_needed * 2 {
                    break;
                }
            } else if contains_hits.len() < remaining_needed
                && (entry.norm_title.contains(&q_norm) || entry.norm_url.contains(&q_norm))
            {
                contains_hits.push(entry);
            }
        }

        word_prefix_hits.sort_by(|a, b| {
            a.is_redirect
                .cmp(&b.is_redirect)
                .then(a.title.len().cmp(&b.title.len()))
                .then(a.norm_title.cmp(&b.norm_title))
        });

        for e in word_prefix_hits {
            if results.len() >= max_results {
                break;
            }
            results.push(build_entry_summary(e, Some("word_prefix")));
        }

        if results.len() < max_results {
            contains_hits.sort_by(|a, b| {
                a.is_redirect
                    .cmp(&b.is_redirect)
                    .then(a.title.len().cmp(&b.title.len()))
                    .then(a.norm_title.cmp(&b.norm_title))
            });
            for e in contains_hits {
                if results.len() >= max_results {
                    break;
                }
                results.push(build_entry_summary(e, Some("contains")));
            }
        }
    }

    results
}

fn generate_prefix_probes(raw_query: &str) -> Vec<String> {
    let trimmed = raw_query.trim();
    if trimmed.is_empty() {
        return Vec::new();
    }
    let mut probes = Vec::new();
    let mut push_unique = |s: String| {
        if !s.is_empty() && !probes.contains(&s) {
            probes.push(s);
        }
    };

    push_unique(trimmed.to_string());
    push_unique(trimmed.to_lowercase());

    // Titlecase first character (for English ZIMs sorted by ASCII uppercase first)
    let mut chars = trimmed.chars();
    if let Some(first) = chars.next() {
        let rest: String = chars.collect();
        let title_case = format!("{}{}", first.to_uppercase(), rest.to_lowercase());
        push_unique(title_case);
        let first_upper_only = format!("{}{}", first.to_uppercase(), rest);
        push_unique(first_upper_only);
    }

    push_unique(trimmed.to_uppercase());

    // Persian <-> Arabic Kaf/Yeh probe variants
    let to_arabic = trimmed.replace('\u{06A9}', "\u{0643}").replace('\u{06CC}', "\u{064A}");
    push_unique(to_arabic);
    let to_persian = trimmed.replace('\u{0643}', "\u{06A9}").replace('\u{064A}', "\u{06CC}");
    push_unique(to_persian);

    probes
}

/// Binary-search fallback directly on disk/mmap ZIM listing for ultra-large archives (> 350k articles).
fn search_large_zim_binary(
    zim_path: &Path,
    query: &str,
    max_results: usize,
) -> Result<(u32, Vec<ZimArticleSummary>), String> {
    let zim = Zim::new(zim_path).map_err(|e| format!("Failed to open ZIM: {}", e))?;
    let total_articles = zim.header.article_count;
    let q_norm = normalize_for_search(query);
    let mut results = Vec::new();
    let mut seen_urls = HashSet::new();
    let mut seen_titles = HashSet::new();

    if q_norm.is_empty() {
        if let Ok(Some(main_entry)) = zim.main_page() {
            if is_readable_article_entry(&main_entry) {
                let title = if main_entry.title.is_empty() {
                    "Home / Main Page".to_string()
                } else {
                    main_entry.title.clone()
                };
                seen_titles.insert(normalize_for_search(&title));
                seen_urls.insert(main_entry.url.to_lowercase());
                results.push(ZimArticleSummary {
                    url: main_entry.url,
                    title,
                    namespace: format!("{:?}", main_entry.namespace),
                    mime_type: format!("{:?}", main_entry.mime_type),
                    match_type: Some("main_page".to_string()),
                    is_redirect: matches!(main_entry.mime_type, zim::MimeType::Redirect),
                });
            }
        }
    }

    if let Ok(Some(listing)) = zim.article_list_by_title() {
        if let Ok(listing_len) = listing.len() {
            if listing_len > 0 {
                if q_norm.is_empty() {
                    let limit = listing_len.min(max_results * 4);
                    for pos in 0..limit {
                        if let Ok(Some(idx)) = listing.get(pos) {
                            if let Ok(entry) = zim.get_by_url_index(idx) {
                                if !is_readable_article_entry(&entry) {
                                    continue;
                                }
                                let title = format_clean_title(&entry);
                                let nt = normalize_for_search(&title);
                                let nu = entry.url.to_lowercase();
                                if seen_titles.insert(nt) && seen_urls.insert(nu) {
                                    results.push(ZimArticleSummary {
                                        url: entry.url,
                                        title,
                                        namespace: format!("{:?}", entry.namespace),
                                        mime_type: format!("{:?}", entry.mime_type),
                                        match_type: None,
                                        is_redirect: matches!(entry.mime_type, zim::MimeType::Redirect),
                                    });
                                    if results.len() >= max_results {
                                        break;
                                    }
                                }
                            }
                        }
                    }
                    return Ok((total_articles, results));
                }

                let probes = generate_prefix_probes(query);
                let mut candidates: Vec<(u8, IndexedEntry)> = Vec::new();

                for probe in probes {
                    // Binary search lower_bound on title-ordered listing
                    let mut low = 0usize;
                    let mut high = listing_len;
                    while low < high {
                        let mid = low + (high - low) / 2;
                        let title_at_mid = listing
                            .get(mid)
                            .ok()
                            .flatten()
                            .and_then(|idx| zim.get_by_url_index(idx).ok())
                            .map(|e| format_clean_title(&e))
                            .unwrap_or_default();

                        if title_at_mid.as_str() < probe.as_str() {
                            low = mid + 1;
                        } else {
                            high = mid;
                        }
                    }

                    let scan_end = listing_len.min(low + max_results * 5);
                    for pos in low..scan_end {
                        if let Ok(Some(idx)) = listing.get(pos) {
                            if let Ok(entry) = zim.get_by_url_index(idx) {
                                if !is_readable_article_entry(&entry) {
                                    continue;
                                }
                                let title = format_clean_title(&entry);
                                let nt = normalize_for_search(&title);
                                if !nt.starts_with(&q_norm) {
                                    // Stop once we pass the probe's raw byte prefix
                                    if !title.to_lowercase().starts_with(&probe.to_lowercase()) {
                                        break;
                                    }
                                    continue;
                                }
                                let nu = entry.url.to_lowercase();
                                if !seen_urls.insert(nu.clone()) || !seen_titles.insert(nt.clone()) {
                                    continue;
                                }
                                let is_redirect = matches!(entry.mime_type, zim::MimeType::Redirect);
                                let tier = if nt == q_norm {
                                    0
                                } else if !is_redirect && is_word_boundary_prefix(&nt, &q_norm) {
                                    1
                                } else if !is_redirect {
                                    2
                                } else {
                                    3
                                };
                                candidates.push((
                                    tier,
                                    IndexedEntry {
                                        url: entry.url,
                                        title,
                                        norm_title: nt,
                                        norm_url: normalize_for_search(&nu),
                                        namespace: format!("{:?}", entry.namespace),
                                        mime_type: format!("{:?}", entry.mime_type),
                                        is_redirect,
                                    },
                                ));
                            }
                        }
                    }
                }

                candidates.sort_by(|a, b| {
                    a.0.cmp(&b.0)
                        .then(a.1.norm_title.cmp(&b.1.norm_title))
                        .then(a.1.title.len().cmp(&b.1.title.len()))
                });

                for (tier, item) in candidates.into_iter().take(max_results) {
                    let mtype = if tier == 0 { "exact" } else { "prefix" };
                    results.push(build_entry_summary(&item, Some(mtype)));
                }
            }
        }
    }

    Ok((total_articles, results))
}

fn push_unique_candidate(candidates: &mut Vec<String>, s: String) {
    let trimmed = s.trim_start_matches('/').to_string();
    if !trimmed.is_empty() && !candidates.contains(&trimmed) {
        candidates.push(trimmed);
    }
}

fn build_lookup_candidates(raw_path: &str) -> Vec<String> {
    let mut candidates = Vec::new();

    let without_hash = raw_path.split('#').next().unwrap_or(raw_path);
    let clean = without_hash.trim_start_matches('/').trim_start_matches("./");
    push_unique_candidate(&mut candidates, clean.to_string());

    if let Ok(decoded) = urlencoding::decode(clean) {
        push_unique_candidate(&mut candidates, decoded.into_owned());
    }

    // Strip leading relative ../ segments if any
    let mut stripped = clean;
    while let Some(rest) = stripped.strip_prefix("../") {
        stripped = rest;
    }
    push_unique_candidate(&mut candidates, stripped.to_string());
    if let Ok(decoded) = urlencoding::decode(stripped) {
        push_unique_candidate(&mut candidates, decoded.into_owned());
    }

    // Strip explicit namespace prefix like "A/" or "C/" or "I/"
    let existing = candidates.clone();
    for c in existing {
        if let Some(rest) = c
            .strip_prefix("A/")
            .or_else(|| c.strip_prefix("C/"))
            .or_else(|| c.strip_prefix("I/"))
            .or_else(|| c.strip_prefix("W/"))
        {
            push_unique_candidate(&mut candidates, rest.to_string());
        }
    }

    candidates
}

impl ZimReader {
    pub fn invalidate_cache(zim_path: &Path) {
        let key = std::fs::canonicalize(zim_path).unwrap_or_else(|_| zim_path.to_path_buf());
        let cache = cache_instance();
        let mut guard = cache.entries.write().unwrap();
        guard.remove(&key);
    }

    pub fn search_articles(
        zim_path: &Path,
        query: &str,
        limit: usize,
    ) -> Result<Vec<ZimArticleSummary>, String> {
        let resp = Self::search_articles_detailed(zim_path, query, limit)?;
        Ok(resp.results)
    }

    pub fn search_articles_detailed(
        zim_path: &Path,
        query: &str,
        limit: usize,
    ) -> Result<ZimSearchResponse, String> {
        let started = Instant::now();
        let max_results = if limit == 0 { 60 } else { limit.min(300) };

        if let Some(cached) = get_or_build_cached_index(zim_path)? {
            let results = search_in_cached_index(&cached, query, max_results);
            return Ok(ZimSearchResponse {
                query: query.to_string(),
                total_articles: cached.total_articles,
                total_indexed: cached.entries.len(),
                search_mode: "cached_index".to_string(),
                elapsed_ms: started.elapsed().as_millis() as u64,
                results,
            });
        }

        let (total_articles, results) = search_large_zim_binary(zim_path, query, max_results)?;
        Ok(ZimSearchResponse {
            query: query.to_string(),
            total_articles,
            total_indexed: total_articles as usize,
            search_mode: "binary_listing".to_string(),
            elapsed_ms: started.elapsed().as_millis() as u64,
            results,
        })
    }

    pub fn read_article(
        zim_path: &Path,
        article_url: &str,
    ) -> Result<ZimArticleContent, String> {
        let clean_url = article_url.trim_start_matches('/');
        if clean_url.contains("..") && !clean_url.starts_with("../") {
            return Err("Path traversal attempt detected in article URL".to_string());
        }

        let zim = Zim::new(zim_path).map_err(|e| format!("Failed to open ZIM: {}", e))?;
        let candidates = build_lookup_candidates(article_url);

        let mut found_entry = None;
        'outer: for cand in &candidates {
            for ns in [
                Namespace::UserContent,
                Namespace::Articles,
                Namespace::CategoriesArticle,
            ] {
                if let Ok(Some(entry)) = zim.get_by_path(ns, cand) {
                    found_entry = Some(entry);
                    break 'outer;
                }
            }
        }

        if found_entry.is_none() {
            let cand_set: HashSet<&str> = candidates.iter().map(|s| s.as_str()).collect();
            for entry_res in zim.iterate_by_urls() {
                if let Ok(entry) = entry_res {
                    if cand_set.contains(entry.url.as_str())
                        || cand_set.contains(entry.title.as_str())
                    {
                        found_entry = Some(entry);
                        break;
                    }
                }
            }
        }

        let entry = found_entry
            .ok_or_else(|| format!("Article '{}' not found in archive", article_url))?;

        let fallback_url = entry.url.clone();
        let fallback_ns = entry.namespace;

        // Resolve redirects safely without panicking
        let resolved = match zim.resolve(entry) {
            Ok(r) => r,
            Err(_) => zim
                .get_by_path(fallback_ns, &fallback_url)
                .ok()
                .flatten()
                .ok_or_else(|| format!("Failed to resolve redirect for '{}'", article_url))?,
        };

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
        let is_video = mime_str.starts_with("video/")
            || resolved.url.ends_with(".mp4")
            || resolved.url.ends_with(".webm");
        let is_audio = mime_str.starts_with("audio/")
            || resolved.url.ends_with(".mp3")
            || resolved.url.ends_with(".ogg")
            || resolved.url.ends_with(".wav");
        let is_image = mime_str.starts_with("image/")
            || resolved.url.ends_with(".png")
            || resolved.url.ends_with(".jpg")
            || resolved.url.ends_with(".svg");

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
        if clean_path.contains("..") && !clean_path.starts_with("../") {
            return Err("Invalid path traversal detected in resource URL".to_string());
        }

        let zim = Zim::new(zim_path).map_err(|e| format!("Failed to open ZIM: {}", e))?;
        let candidates = build_lookup_candidates(resource_path);

        let mut found_entry = None;
        'outer: for cand in &candidates {
            for ns in [
                Namespace::UserContent,
                Namespace::Articles,
                Namespace::ImagesFile,
                Namespace::ImagesText,
            ] {
                if let Ok(Some(entry)) = zim.get_by_path(ns, cand) {
                    found_entry = Some(entry);
                    break 'outer;
                }
            }
        }

        if found_entry.is_none() {
            let cand_set: HashSet<&str> = candidates.iter().map(|s| s.as_str()).collect();
            for entry_res in zim.iterate_by_urls() {
                if let Ok(entry) = entry_res {
                    if cand_set.contains(entry.url.as_str())
                        || cand_set.contains(entry.title.as_str())
                    {
                        found_entry = Some(entry);
                        break;
                    }
                }
            }
        }

        let entry = found_entry
            .ok_or_else(|| format!("Resource '{}' not found in archive", clean_path))?;
        let fallback_url = entry.url.clone();
        let fallback_ns = entry.namespace;
        let resolved = match zim.resolve(entry) {
            Ok(r) => r,
            Err(_) => zim
                .get_by_path(fallback_ns, &fallback_url)
                .ok()
                .flatten()
                .ok_or_else(|| "Could not resolve resource".to_string())?,
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
    fn test_normalize_for_search() {
        assert_eq!(normalize_for_search("  سیب‌زمینی "), "سیب زمینی");
        assert_eq!(normalize_for_search("كيبورد"), "کیبورد");
        assert_eq!(normalize_for_search("سُرفه"), "سرفه");
        assert_eq!(normalize_for_search("About_Buscopan"), "about buscopan");
    }

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

        // Verify prefix search for "about a"
        let prefix_hits = ZimReader::search_articles(&p, "about a", 15).unwrap();
        assert!(!prefix_hits.is_empty());
        assert!(prefix_hits[0].title.to_lowercase().starts_with("about a"));

        // Verify reading main page
        let art = ZimReader::read_article(&p, &articles[0].url).unwrap();
        assert_eq!(art.title, "Medicines A to Z - NHS");
        assert!(!art.html.is_empty());
    }

    #[test]
    fn test_persian_medical_zim_prefix_search() {
        let p = PathBuf::from("../data/zim/wikipedia_fa_medicine_maxi_2026-10.zim");
        if !p.exists() {
            return;
        }

        let r_s = ZimReader::search_articles_detailed(&p, "س", 25).unwrap();
        println!(
            "Query 'س': indexed={} mode={} elapsed={}ms hits={}",
            r_s.total_indexed,
            r_s.search_mode,
            r_s.elapsed_ms,
            r_s.results.len()
        );
        assert!(!r_s.results.is_empty());
        for item in &r_s.results {
            let norm = normalize_for_search(&item.title);
            assert!(
                norm.starts_with('س'),
                "Expected '{}' to start with 'س' for query 'س'",
                item.title
            );
        }

        let r_si = ZimReader::search_articles_detailed(&p, "سی", 25).unwrap();
        println!(
            "Query 'سی': elapsed={}ms hits={} top5={:?}",
            r_si.elapsed_ms,
            r_si.results.len(),
            r_si.results.iter().take(5).map(|x| &x.title).collect::<Vec<_>>()
        );
        assert!(!r_si.results.is_empty());
        for item in &r_si.results {
            let norm = normalize_for_search(&item.title);
            assert!(
                norm.starts_with("سی"),
                "Expected '{}' to start with 'سی' for query 'سی'",
                item.title
            );
        }

        let r_sar = ZimReader::search_articles_detailed(&p, "سر", 25).unwrap();
        println!(
            "Query 'سر': elapsed={}ms hits={} top5={:?}",
            r_sar.elapsed_ms,
            r_sar.results.len(),
            r_sar.results.iter().take(5).map(|x| &x.title).collect::<Vec<_>>()
        );
        assert!(!r_sar.results.is_empty());
        assert!(normalize_for_search(&r_sar.results[0].title).starts_with("سر"));
    }
}
