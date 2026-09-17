use reqwest::Client;
use std::time::Duration;

pub async fn scrape_url(client: &Client, url: &str) -> Option<String> {
    let res = client
        .get(url)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .timeout(Duration::from_secs(8))
        .send()
        .await
        .ok()?;

    if !res.status().is_success() {
        return None;
    }

    let html = res.text().await.ok()?;
    let text = extract_clean_text(&html);
    if text.trim().len() < 50 {
        None
    } else {
        Some(text)
    }
}

pub fn extract_clean_text(html: &str) -> String {
    let mut cleaned = html.to_string();

    // Remove script tags and contents
    if let Ok(re_script) = regex::Regex::new(r"(?is)<script.*?>.*?</script>") {
        cleaned = re_script.replace_all(&cleaned, " ").to_string();
    }
    // Remove style tags and contents
    if let Ok(re_style) = regex::Regex::new(r"(?is)<style.*?>.*?</style>") {
        cleaned = re_style.replace_all(&cleaned, " ").to_string();
    }
    // Remove svg, nav, footer, header, aside, form tags
    if let Ok(re_noise) = regex::Regex::new(r"(?is)<(svg|nav|footer|header|noscript|aside|form|iframe).*?>.*?</\1>") {
        cleaned = re_noise.replace_all(&cleaned, " ").to_string();
    }

    // Preserve paragraph breaks and line breaks before stripping tags
    if let Ok(re_p) = regex::Regex::new(r"(?i)<p[^>]*>") {
        cleaned = re_p.replace_all(&cleaned, "\n\n").to_string();
    }
    if let Ok(re_br) = regex::Regex::new(r"(?i)<br\s*/?>") {
        cleaned = re_br.replace_all(&cleaned, "\n").to_string();
    }
    if let Ok(re_h) = regex::Regex::new(r"(?i)<h[1-6][^>]*>") {
        cleaned = re_h.replace_all(&cleaned, "\n\n### ").to_string();
    }
    if let Ok(re_li) = regex::Regex::new(r"(?i)<li[^>]*>") {
        cleaned = re_li.replace_all(&cleaned, "\n• ").to_string();
    }

    // Strip remaining HTML tags
    if let Ok(re_tags) = regex::Regex::new(r"<[^>]+>") {
        cleaned = re_tags.replace_all(&cleaned, " ").to_string();
    }

    // Unescape common HTML entities
    cleaned = cleaned
        .replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&#038;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .replace("&#8217;", "’")
        .replace("&#8216;", "‘")
        .replace("&#8220;", "“")
        .replace("&#8221;", "”")
        .replace("&mdash;", "—")
        .replace("&ndash;", "–");

    // Clean up excessive blank lines while preserving paragraphs
    let lines: Vec<String> = cleaned
        .lines()
        .map(|line| line.trim().to_string())
        .filter(|line| !line.is_empty())
        .collect();

    let result = lines.join("\n\n");

    // Allow full length up to 60,000 characters
    if result.len() > 60000 {
        result[..60000].to_string()
    } else {
        result
    }
}
