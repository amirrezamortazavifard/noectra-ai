use reqwest::Client;
use serde_json::{json, Value};
use std::time::Duration;
use crate::searxng::{search_searxng, SearxngOptions};

/// Strips conversational fluff and filler words to extract core search keywords
pub fn clean_search_query(raw: &str) -> String {
    let mut q = raw.trim().to_string();

    // Persian conversational prefixes and suffixes
    let persian_phrases = [
        "میتونی درمورد", "میتونی در مورد", "میتونی برام", "میتونی لطفا", "میتونی",
        "توی اینترنت سرچ کنی؟", "توی اینترنت سرچ کنی", "در اینترنت سرچ کنی", "توی نت سرچ کنی",
        "در اینترنت جستجو کنی", "توی اینترنت جستجو کنی", "لطفاً سرچ کن", "لطفا سرچ کن",
        "برام سرچ کن", "سرچ کن", "جستجو کن", "توی اینترنت", "در اینترنت", "در نت", "توی نت",
        "اطلاعاتی در مورد", "اطلاعاتی درباره", "اطلاعاتی درمورد", "اطلاعاتی بده", "توضیح بده",
        "در مورد", "درمورد", "درباره", "راجع به", "در رابطه با", "چیست و", "چیست",
        "به من بگو", "بگو ببینم", "میخوام بدونم", "می‌خواهم بدانم",
    ];

    for phrase in &persian_phrases {
        q = q.replace(phrase, " ");
    }

    // English conversational prefixes
    let english_phrases = [
        "can you search the web for", "can you search for", "can you search",
        "search the web for", "search the internet for", "search for",
        "please search for", "please search", "look up", "tell me about",
        "what is", "who is", "give me information about", "i want to know about",
    ];

    for phrase in &english_phrases {
        let q_lower = q.to_lowercase();
        if let Some(pos) = q_lower.find(phrase) {
            let end = pos + phrase.len();
            q.replace_range(pos..end, " ");
        }
    }

    // Clean punctuation
    q = q.replace(['؟', '?', '!', '.', ',', ':', '،', '«', '»', '"', '\'', '(', ')', '[', ']'], " ");

    let words: Vec<&str> = q.split_whitespace().collect();
    if words.is_empty() {
        raw.trim().to_string()
    } else {
        words.join(" ")
    }
}

/// Primary web search entry point with cascading resilient fallbacks
pub async fn search_web(
    client: &Client,
    raw_query: &str,
    brave_api_key: Option<&str>,
    searxng_url: &str,
) -> Result<Value, String> {
    let raw_trimmed = raw_query.trim();
    if raw_trimmed.is_empty() {
        return Ok(json!({ "results": [] }));
    }

    let cleaned_query = clean_search_query(raw_trimmed);
    let effective_query = if cleaned_query.is_empty() { raw_trimmed } else { &cleaned_query };

    let mut all_results: Vec<Value> = Vec::new();
    let mut seen_urls = std::collections::HashSet::new();

    // 1. Try Brave Search API first if key is provided
    if let Some(key) = brave_api_key {
        let key_clean = key.trim();
        if !key_clean.is_empty() {
            let url = format!(
                "https://api.search.brave.com/res/v1/web/search?q={}&count=8",
                urlencoding::encode(effective_query)
            );

            if let Ok(res) = client
                .get(&url)
                .header("Accept", "application/json")
                .header("X-Subscription-Token", key_clean)
                .timeout(Duration::from_secs(8))
                .send()
                .await
            {
                if res.status().is_success() {
                    if let Ok(val) = res.json::<Value>().await {
                        if let Some(results) = val["web"]["results"].as_array() {
                            let mut mapped = Vec::new();
                            for r in results {
                                if let (Some(title), Some(url), Some(snippet)) = (
                                    r["title"].as_str(),
                                    r["url"].as_str(),
                                    r["description"].as_str(),
                                ) {
                                    mapped.push(json!({
                                        "title": title.trim(),
                                        "url": url.trim(),
                                        "snippet": snippet.trim()
                                    }));
                                }
                            }
                            append_unique(&mut all_results, &mut seen_urls, mapped);
                        }
                    }
                }
            }
        }
    }

    // 2. Try DuckDuckGo Lite (High reliability, zero captcha, direct clean links)
    if all_results.len() < 5 {
        if let Ok(lite_results) = search_duckduckgo_lite(client, effective_query).await {
            append_unique(&mut all_results, &mut seen_urls, lite_results);
        }
    }

    // 3. Try DuckDuckGo HTML as secondary fallback
    if all_results.len() < 4 {
        if let Ok(ddg_results) = search_duckduckgo_html(client, effective_query).await {
            append_unique(&mut all_results, &mut seen_urls, ddg_results);
        }
    }

    // 4. Try Google Web search scraping (clean text results)
    if all_results.len() < 3 {
        if let Ok(google_results) = search_google_web(client, effective_query).await {
            append_unique(&mut all_results, &mut seen_urls, google_results);
        }
    }

    // 5. Try Wikipedia Search API (Multilingual encyclopedic knowledge)
    if all_results.len() < 4 {
        if let Ok(wiki_results) = search_wikipedia(client, effective_query).await {
            append_unique(&mut all_results, &mut seen_urls, wiki_results);
        }
    }

    // 6. Try SearXNG if custom URL is configured and not default dead searx.be
    let clean_searx = searxng_url.trim();
    if all_results.len() < 4 && !clean_searx.is_empty() && !clean_searx.contains("searx.be") {
        let opts = SearxngOptions {
            categories: vec!["general".to_string()],
            ..Default::default()
        };

        if let Ok(res) = search_searxng(client, clean_searx, effective_query, Some(opts)).await {
            let mut mapped = Vec::new();
            for r in res.results.into_iter().take(6) {
                if let (Some(title), Some(url), Some(snippet)) = (r.title, r.url, r.content) {
                    mapped.push(json!({
                        "title": title.trim(),
                        "url": url.trim(),
                        "snippet": snippet.trim()
                    }));
                }
            }
            append_unique(&mut all_results, &mut seen_urls, mapped);
        }
    }

    // 7. If still empty, try raw query with DuckDuckGo Lite without word stripping
    if all_results.is_empty() && effective_query != raw_trimmed {
        if let Ok(raw_res) = search_duckduckgo_lite(client, raw_trimmed).await {
            append_unique(&mut all_results, &mut seen_urls, raw_res);
        }
    }

    Ok(json!({ "results": all_results }))
}

fn append_unique(
    all_results: &mut Vec<Value>,
    seen_urls: &mut std::collections::HashSet<String>,
    items: Vec<Value>,
) {
    for item in items {
        if let Some(url) = item["url"].as_str() {
            let u = url.trim().to_lowercase();
            if !u.is_empty() && !seen_urls.contains(&u) {
                seen_urls.insert(u);
                all_results.push(item);
            }
        }
    }
}

/// DuckDuckGo Lite endpoint: lightweight, fast, no bot blocking, clean HTML
pub async fn search_duckduckgo_lite(client: &Client, query: &str) -> Result<Vec<Value>, String> {
    let res = client
        .post("https://lite.duckduckgo.com/lite/")
        .header(
            "User-Agent",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        )
        .header(
            "Accept",
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        )
        .header("Accept-Language", "en-US,en;q=0.9,fa;q=0.8")
        .header("Content-Type", "application/x-www-form-urlencoded")
        .header("Referer", "https://lite.duckduckgo.com/")
        .form(&[("q", query), ("kl", "wt-wt")])
        .timeout(Duration::from_secs(10))
        .send()
        .await
        .map_err(|e| format!("DDG Lite request failed: {}", e))?;

    if !res.status().is_success() {
        return Err(format!("DDG Lite HTTP {}", res.status()));
    }

    let html = res
        .text()
        .await
        .map_err(|e| format!("Failed to read DDG Lite HTML: {}", e))?;

    Ok(parse_duckduckgo_lite_html(&html))
}

fn parse_duckduckgo_lite_html(html: &str) -> Vec<Value> {
    let re_html_tag = regex::Regex::new(r"<[^>]+>").unwrap();
    let re_link = regex::Regex::new(
        r#"(?is)<a[^>]+href="([^"]+)"[^>]*class=['"][^'"]*result-link[^'"]*['"][^>]*>(.*?)</a>"#,
    )
    .unwrap();
    let re_snippet = regex::Regex::new(
        r#"(?is)<td[^>]*class=['"][^'"]*result-snippet[^'"]*['"][^>]*>(.*?)</td>"#,
    )
    .unwrap();

    let links: Vec<(String, String)> = re_link
        .captures_iter(html)
        .map(|cap| {
            let raw_href = cap.get(1).map(|m| m.as_str()).unwrap_or("");
            let raw_title = cap.get(2).map(|m| m.as_str()).unwrap_or("");
            let clean_title = clean_text(&re_html_tag.replace_all(raw_title, ""));
            let clean_url = clean_ddg_url(raw_href);
            (clean_title, clean_url)
        })
        .collect();

    let snippets: Vec<String> = re_snippet
        .captures_iter(html)
        .map(|cap| {
            let raw_snip = cap.get(1).map(|m| m.as_str()).unwrap_or("");
            clean_text(&re_html_tag.replace_all(raw_snip, ""))
        })
        .collect();

    let mut results = Vec::new();
    let count = std::cmp::min(links.len(), 10);

    for i in 0..count {
        let (title, url) = &links[i];
        if url.is_empty() || title.is_empty() {
            continue;
        }
        let snippet = snippets.get(i).cloned().unwrap_or_default();
        results.push(json!({
            "title": title,
            "url": url,
            "snippet": snippet
        }));
    }

    results
}

/// DuckDuckGo HTML endpoint with standard browser headers
pub async fn search_duckduckgo_html(client: &Client, query: &str) -> Result<Vec<Value>, String> {
    let params = [("q", query), ("kl", "wt-wt")];
    let res = client
        .post("https://html.duckduckgo.com/html/")
        .header(
            "User-Agent",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        )
        .header(
            "Accept",
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        )
        .header("Accept-Language", "en-US,en;q=0.9,fa;q=0.8")
        .header("Referer", "https://html.duckduckgo.com/")
        .header("Content-Type", "application/x-www-form-urlencoded")
        .form(&params)
        .timeout(Duration::from_secs(9))
        .send()
        .await
        .map_err(|e| format!("DuckDuckGo request failed: {}", e))?;

    if !res.status().is_success() {
        return Err(format!("DuckDuckGo HTTP {}", res.status()));
    }

    let html = res
        .text()
        .await
        .map_err(|e| format!("Failed to read DuckDuckGo HTML: {}", e))?;

    if html.contains("anomaly-modal") || html.contains("challenge-form") {
        return Err("DuckDuckGo challenged bot detection".to_string());
    }

    Ok(parse_duckduckgo_html(&html))
}

fn parse_duckduckgo_html(html: &str) -> Vec<Value> {
    let re_html_tag = regex::Regex::new(r"<[^>]+>").unwrap();
    let re_title_link = regex::Regex::new(
        r#"(?is)<a[^>]+(?:class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"|href="([^"]+)"[^>]+class="[^"]*result__a[^"]*")[^>]*>(.*?)</a>"#,
    )
    .unwrap();
    let re_snippet = regex::Regex::new(
        r#"(?is)<a[^>]+(?:class="[^"]*result__snippet[^"]*"[^>]+href="([^"]+)"|href="([^"]+)"[^>]+class="[^"]*result__snippet[^"]*")[^>]*>(.*?)</a>"#,
    )
    .unwrap();

    let titles_links: Vec<(String, String)> = re_title_link
        .captures_iter(html)
        .map(|cap| {
            let href = cap.get(1).or_else(|| cap.get(2)).map(|m| m.as_str()).unwrap_or("");
            let raw_title = cap.get(3).map(|m| m.as_str()).unwrap_or("");
            let clean_title = clean_text(&re_html_tag.replace_all(raw_title, ""));
            let url = clean_ddg_url(href);
            (clean_title, url)
        })
        .collect();

    let snippets: Vec<String> = re_snippet
        .captures_iter(html)
        .map(|cap| {
            let raw_snippet = cap.get(3).map(|m| m.as_str()).unwrap_or("");
            clean_text(&re_html_tag.replace_all(raw_snippet, ""))
        })
        .collect();

    let mut results = Vec::new();
    let count = std::cmp::min(titles_links.len(), 6);

    for i in 0..count {
        let (title, url) = &titles_links[i];
        if url.is_empty() || title.is_empty() {
            continue;
        }
        let snippet = snippets.get(i).cloned().unwrap_or_default();
        results.push(json!({
            "title": title,
            "url": url,
            "snippet": snippet
        }));
    }

    results
}

/// Google Web search scraping (clean text results view `udm=14`)
pub async fn search_google_web(client: &Client, query: &str) -> Result<Vec<Value>, String> {
    let url = format!(
        "https://www.google.com/search?q={}&hl=en&num=8&udm=14",
        urlencoding::encode(query)
    );

    let res = client
        .get(&url)
        .header(
            "User-Agent",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        )
        .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
        .header("Accept-Language", "en-US,en;q=0.9")
        .timeout(Duration::from_secs(8))
        .send()
        .await
        .map_err(|e| format!("Google request failed: {}", e))?;

    if !res.status().is_success() {
        return Err(format!("Google HTTP {}", res.status()));
    }

    let html = res
        .text()
        .await
        .map_err(|e| format!("Failed to read Google HTML: {}", e))?;

    Ok(parse_google_html(&html))
}

fn parse_google_html(html: &str) -> Vec<Value> {
    let re_html_tag = regex::Regex::new(r"<[^>]+>").unwrap();
    // Match Google search result links with h3 titles
    let re_result = regex::Regex::new(
        r#"(?is)<a[^>]+href="(/url\?q=[^"&]+|https?://[^"]+)"[^>]*>.*?<h3[^>]*>(.*?)</h3>"#,
    )
    .unwrap();

    let mut results = Vec::new();
    let mut seen = std::collections::HashSet::new();

    for cap in re_result.captures_iter(html) {
        let raw_url = cap.get(1).map(|m| m.as_str()).unwrap_or("");
        let raw_title = cap.get(2).map(|m| m.as_str()).unwrap_or("");

        let clean_title = clean_text(&re_html_tag.replace_all(raw_title, ""));
        let mut final_url = raw_url.to_string();

        if final_url.starts_with("/url?q=") {
            let after = &final_url[7..];
            if let Some(end) = after.find('&') {
                final_url = urlencoding::decode(&after[..end])
                    .map(|d| d.into_owned())
                    .unwrap_or_else(|_| after[..end].to_string());
            } else {
                final_url = urlencoding::decode(after)
                    .map(|d| d.into_owned())
                    .unwrap_or_else(|_| after.to_string());
            }
        }

        if !final_url.starts_with("http") || final_url.contains("google.com/") {
            continue;
        }

        let u_lower = final_url.to_lowercase();
        if seen.contains(&u_lower) {
            continue;
        }
        seen.insert(u_lower);

        if !clean_title.is_empty() {
            results.push(json!({
                "title": clean_title,
                "url": final_url,
                "snippet": clean_title.clone()
            }));
        }

        if results.len() >= 6 {
            break;
        }
    }

    results
}

/// Wikipedia Search API (instant, free, encyclopedic, zero captchas)
pub async fn search_wikipedia(client: &Client, query: &str) -> Result<Vec<Value>, String> {
    let clean_query = query.trim();
    if clean_query.is_empty() {
        return Ok(vec![]);
    }

    let has_persian = clean_query.chars().any(|c| ('\u{0600}'..='\u{06FF}').contains(&c));
    let langs = if has_persian { vec!["fa", "en"] } else { vec!["en"] };

    let mut results = Vec::new();
    let re_html_tag = regex::Regex::new(r"<[^>]+>").unwrap();

    for lang in langs {
        let url = format!(
            "https://{}.wikipedia.org/w/api.php?action=query&list=search&srsearch={}&format=json&utf8=1",
            lang,
            urlencoding::encode(clean_query)
        );

        if let Ok(res) = client
            .get(&url)
            .header("User-Agent", "NoectraAI/1.0 (https://noectra.ai; contact@noectra.ai)")
            .timeout(Duration::from_secs(6))
            .send()
            .await
        {
            if res.status().is_success() {
                if let Ok(val) = res.json::<Value>().await {
                    if let Some(items) = val["query"]["search"].as_array() {
                        for item in items.iter().take(4) {
                            let title = item["title"].as_str().unwrap_or_default();
                            let raw_snippet = item["snippet"].as_str().unwrap_or_default();
                            let snippet = clean_text(&re_html_tag.replace_all(raw_snippet, ""));
                            let page_url = format!("https://{}.wikipedia.org/wiki/{}", lang, urlencoding::encode(title));

                            if !title.is_empty() && !snippet.is_empty() {
                                results.push(json!({
                                    "title": title,
                                    "url": page_url,
                                    "snippet": snippet
                                }));
                            }
                        }
                    }
                }
            }
        }
        if results.len() >= 4 {
            break;
        }
    }

    Ok(results)
}

fn clean_ddg_url(raw: &str) -> String {
    let mut url = raw.trim();
    if url.starts_with("//") {
        url = &url[2..];
    }
    if let Some(pos) = url.find("uddg=") {
        let after = &url[pos + 5..];
        let encoded_url = if let Some(end) = after.find('&') {
            &after[..end]
        } else {
            after
        };
        if let Ok(decoded) = urlencoding::decode(encoded_url) {
            return decoded.into_owned();
        }
    }
    if url.starts_with("duckduckgo.com") {
        return format!("https://{}", url);
    }
    if !url.starts_with("http://") && !url.starts_with("https://") && !url.is_empty() {
        return format!("https://{}", url);
    }
    url.to_string()
}

fn clean_text(s: &str) -> String {
    let unescaped = s
        .replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .replace("&#x27;", "'")
        .replace("&mdash;", "—")
        .replace("&ndash;", "–");
    let words: Vec<&str> = unescaped.split_whitespace().collect();
    words.join(" ")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_clean_search_query_persian() {
        let raw = "میتونی برام توی اینترنت سرچ کنی اخبار جدید هوش مصنوعی؟";
        let cleaned = clean_search_query(raw);
        assert!(cleaned.contains("اخبار جدید هوش مصنوعی"));
        assert!(!cleaned.contains("میتونی برام"));
    }

    #[test]
    fn test_clean_search_query_english() {
        let raw = "Can you search the web for Rust 2024 features?";
        let cleaned = clean_search_query(raw);
        assert!(cleaned.contains("Rust 2024 features"));
        assert!(!cleaned.contains("search the web for"));
    }

    #[test]
    fn test_parse_ddg_lite_html() {
        let sample_html = r#"
            <a rel="nofollow" href="https://rust-lang.org/" class='result-link'>Rust Programming Language</a>
            <td class='result-snippet'>Rust is a systems programming language that runs blazingly fast.</td>
        "#;
        let results = parse_duckduckgo_lite_html(sample_html);
        assert_eq!(results.len(), 1);
        assert_eq!(results[0]["title"], "Rust Programming Language");
        assert_eq!(results[0]["url"], "https://rust-lang.org/");
        assert!(results[0]["snippet"].as_str().unwrap().contains("blazingly fast"));
    }

    #[tokio::test]
    async fn test_search_web_integration() {
        let client = Client::builder()
            .timeout(Duration::from_secs(12))
            .build()
            .unwrap();

        let res = search_web(&client, "Rust programming language", None, "").await;
        assert!(res.is_ok());
        let val = res.unwrap();
        let items = val["results"].as_array().unwrap();
        assert!(!items.is_empty(), "Search results should not be empty!");
        assert!(items[0]["url"].as_str().unwrap().starts_with("http"));
    }

    #[tokio::test]
    async fn test_search_web_persian_integration() {
        let client = Client::builder()
            .timeout(Duration::from_secs(12))
            .build()
            .unwrap();

        let res = search_web(&client, "اخبار هوش مصنوعی", None, "").await;
        assert!(res.is_ok());
        let val = res.unwrap();
        let items = val["results"].as_array().unwrap();
        assert!(!items.is_empty(), "Persian search results should not be empty!");
        assert!(items[0]["url"].as_str().unwrap().starts_with("http"));
    }
}
