use crate::knowledge_store::models::{CatalogLanguage, CatalogResponse, ZimArchive};
use quick_xml::events::Event;
use quick_xml::Reader;

pub fn parse_opds_feed(xml: &str, base_url: &str) -> Result<CatalogResponse, String> {
    let mut reader = Reader::from_str(xml);
    reader.config_mut().trim_text(true);

    let mut buf = Vec::new();
    let mut total = 0usize;
    let mut start_index = 0usize;
    let mut items_per_page = 0usize;
    let mut entries = Vec::new();

    let mut in_entry = false;
    let mut current_tag = String::new();

    let mut entry_id = String::new();
    let mut entry_title = String::new();
    let mut entry_summary = String::new();
    let mut entry_lang = String::new();
    let mut entry_cat = String::new();
    let mut entry_name = String::new();
    let mut entry_tags_raw = String::new();
    let mut entry_articles: Option<u64> = None;
    let mut entry_media: Option<u64> = None;
    let mut entry_updated = String::new();
    let mut entry_download_url: Option<String> = None;
    let mut entry_size: u64 = 0;
    let mut entry_illustration: Option<String> = None;

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(ref e)) => {
                let name = String::from_utf8_lossy(e.name().as_ref()).to_string();
                let local_name = name.split(':').last().unwrap_or(&name).to_string();

                if local_name == "entry" {
                    in_entry = true;
                    entry_id.clear();
                    entry_title.clear();
                    entry_summary.clear();
                    entry_lang.clear();
                    entry_cat.clear();
                    entry_name.clear();
                    entry_tags_raw.clear();
                    entry_articles = None;
                    entry_media = None;
                    entry_updated.clear();
                    entry_download_url = None;
                    entry_size = 0;
                    entry_illustration = None;
                } else if in_entry && local_name == "link" {
                    let mut rel = String::new();
                    let mut href = String::new();
                    let mut length: u64 = 0;

                    for attr in e.attributes().flatten() {
                        let key = String::from_utf8_lossy(attr.key.as_ref()).to_string();
                        let val = String::from_utf8_lossy(&attr.value).to_string();
                        match key.as_str() {
                            "rel" => rel = val,
                            "href" => href = val,
                            "length" => length = val.parse::<u64>().unwrap_or(0),
                            _ => {}
                        }
                    }

                    if rel.contains("acquisition") || href.ends_with(".zim") || href.ends_with(".zim.meta4") {
                        let clean_url = if href.ends_with(".meta4") {
                            href.strip_suffix(".meta4").unwrap_or(&href).to_string()
                        } else {
                            href.clone()
                        };
                        entry_download_url = Some(clean_url);
                        if length > 0 {
                            entry_size = length;
                        }
                    } else if rel.contains("thumbnail") || rel.contains("image") {
                        let full_thumb = if href.starts_with('/') {
                            let origin = base_url.trim_end_matches("/catalog/v2").trim_end_matches('/');
                            format!("{}{}", origin, href)
                        } else {
                            href
                        };
                        entry_illustration = Some(full_thumb);
                    }
                }
                current_tag = local_name;
            }
            Ok(Event::Empty(ref e)) => {
                let name = String::from_utf8_lossy(e.name().as_ref()).to_string();
                let local_name = name.split(':').last().unwrap_or(&name).to_string();

                if in_entry && local_name == "link" {
                    let mut rel = String::new();
                    let mut href = String::new();
                    let mut length: u64 = 0;

                    for attr in e.attributes().flatten() {
                        let key = String::from_utf8_lossy(attr.key.as_ref()).to_string();
                        let val = String::from_utf8_lossy(&attr.value).to_string();
                        match key.as_str() {
                            "rel" => rel = val,
                            "href" => href = val,
                            "length" => length = val.parse::<u64>().unwrap_or(0),
                            _ => {}
                        }
                    }

                    if rel.contains("acquisition") || href.ends_with(".zim") || href.ends_with(".zim.meta4") {
                        let clean_url = if href.ends_with(".meta4") {
                            href.strip_suffix(".meta4").unwrap_or(&href).to_string()
                        } else {
                            href.clone()
                        };
                        entry_download_url = Some(clean_url);
                        if length > 0 {
                            entry_size = length;
                        }
                    } else if rel.contains("thumbnail") || rel.contains("image") {
                        let full_thumb = if href.starts_with('/') {
                            let origin = base_url.trim_end_matches("/catalog/v2").trim_end_matches('/');
                            format!("{}{}", origin, href)
                        } else {
                            href
                        };
                        entry_illustration = Some(full_thumb);
                    }
                }
            }
            Ok(Event::Text(ref e)) => {
                let text = e.unescape().unwrap_or_default().to_string();
                if in_entry {
                    match current_tag.as_str() {
                        "id" => entry_id = text.trim_start_matches("urn:uuid:").to_string(),
                        "title" => entry_title = text,
                        "summary" | "content" => entry_summary = text,
                        "language" => entry_lang = text,
                        "category" => entry_cat = text,
                        "name" => entry_name = text,
                        "tags" => entry_tags_raw = text,
                        "articleCount" => entry_articles = text.parse::<u64>().ok(),
                        "mediaCount" => entry_media = text.parse::<u64>().ok(),
                        "updated" => entry_updated = text,
                        _ => {}
                    }
                } else {
                    match current_tag.as_str() {
                        "totalResults" => total = text.parse::<usize>().unwrap_or(0),
                        "startIndex" => start_index = text.parse::<usize>().unwrap_or(0),
                        "itemsPerPage" => items_per_page = text.parse::<usize>().unwrap_or(0),
                        _ => {}
                    }
                }
            }
            Ok(Event::End(ref e)) => {
                let name = String::from_utf8_lossy(e.name().as_ref()).to_string();
                let local_name = name.split(':').last().unwrap_or(&name).to_string();

                if local_name == "entry" {
                    in_entry = false;
                    let tags: Vec<String> = entry_tags_raw
                        .split(';')
                        .map(|t| t.trim().to_string())
                        .filter(|t| !t.is_empty() && !t.starts_with('_'))
                        .collect();

                    let effective_id = if !entry_id.is_empty() {
                        entry_id.clone()
                    } else if let Some(ref name) = Some(&entry_name).filter(|n| !n.is_empty()) {
                        (*name).clone()
                    } else {
                        uuid::Uuid::new_v4().to_string()
                    };

                    entries.push(ZimArchive {
                        id: effective_id,
                        title: if entry_title.is_empty() { entry_name.clone() } else { entry_title.clone() },
                        description: entry_summary.clone(),
                        language: if entry_lang.is_empty() { "unknown".to_string() } else { entry_lang.clone() },
                        category: if entry_cat.is_empty() { "general".to_string() } else { entry_cat.clone() },
                        size_bytes: entry_size,
                        article_count: entry_articles,
                        media_count: entry_media,
                        updated_at: if entry_updated.is_empty() { None } else { Some(entry_updated.clone()) },
                        download_url: entry_download_url.clone(),
                        sha256: None,
                        illustration_url: entry_illustration.clone(),
                        name: if entry_name.is_empty() { None } else { Some(entry_name.clone()) },
                        tags,
                        local_path: None,
                        is_installed: false,
                    });
                }
                current_tag.clear();
            }
            Ok(Event::Eof) => break,
            Err(e) => return Err(format!("XML parse error: {}", e)),
            _ => {}
        }
        buf.clear();
    }

    if total == 0 && !entries.is_empty() {
        total = entries.len();
    }

    Ok(CatalogResponse {
        total,
        start_index,
        items_per_page: if items_per_page == 0 { entries.len() } else { items_per_page },
        entries,
    })
}

pub fn parse_opds_categories(xml: &str) -> Vec<String> {
    let mut reader = Reader::from_str(xml);
    reader.config_mut().trim_text(true);

    let mut buf = Vec::new();
    let mut categories = Vec::new();
    let mut in_entry = false;
    let mut current_tag = String::new();
    let mut title = String::new();

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(ref e)) => {
                let name = String::from_utf8_lossy(e.name().as_ref()).to_string();
                let local_name = name.split(':').last().unwrap_or(&name).to_string();
                if local_name == "entry" {
                    in_entry = true;
                    title.clear();
                }
                current_tag = local_name;
            }
            Ok(Event::Text(e)) => {
                if in_entry && current_tag == "title" {
                    if let Ok(t) = e.unescape() {
                        title = t.trim().to_lowercase();
                    }
                }
            }
            Ok(Event::End(ref e)) => {
                let name = String::from_utf8_lossy(e.name().as_ref()).to_string();
                let local_name = name.split(':').last().unwrap_or(&name).to_string();
                if local_name == "entry" {
                    in_entry = false;
                    let clean = title.trim();
                    if !clean.is_empty()
                        && !clean.contains('<')
                        && !clean.contains('>')
                        && !clean.contains('/')
                        && !clean.contains("xml")
                        && !clean.contains("feed")
                    {
                        categories.push(clean.to_string());
                    }
                }
                current_tag.clear();
            }
            Ok(Event::Eof) => break,
            Err(_) => break,
            _ => {}
        }
        buf.clear();
    }

    if categories.is_empty() {
        vec![
            "wikipedia".to_string(),
            "wikimed".to_string(),
            "wikibooks".to_string(),
            "wikisource".to_string(),
            "wiktionary".to_string(),
            "wikivoyage".to_string(),
            "wikiversity".to_string(),
            "wikiquote".to_string(),
            "gutenberg".to_string(),
            "ted".to_string(),
            "phet".to_string(),
            "ifixit".to_string(),
            "stack_exchange".to_string(),
            "other".to_string(),
        ]
    } else {
        categories.sort();
        categories.dedup();
        categories
    }
}

pub fn parse_opds_languages(xml: &str) -> Vec<CatalogLanguage> {
    let mut reader = Reader::from_str(xml);
    reader.config_mut().trim_text(true);

    let mut buf = Vec::new();
    let mut languages = Vec::new();
    let mut in_entry = false;
    let mut current_tag = String::new();
    let mut title = String::new();
    let mut code = String::new();
    let mut count: Option<u64> = None;

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(ref e)) => {
                let name = String::from_utf8_lossy(e.name().as_ref()).to_string();
                let local_name = name.split(':').last().unwrap_or(&name).to_string();
                if local_name == "entry" {
                    in_entry = true;
                    title.clear();
                    code.clear();
                    count = None;
                }
                current_tag = local_name;
            }
            Ok(Event::Text(e)) => {
                if in_entry {
                    if let Ok(t) = e.unescape() {
                        let text = t.trim();
                        if current_tag == "title" {
                            title = text.to_string();
                        } else if current_tag == "language" {
                            code = text.to_lowercase();
                        } else if current_tag == "count" {
                            count = text.parse::<u64>().ok();
                        }
                    }
                }
            }
            Ok(Event::End(ref e)) => {
                let name = String::from_utf8_lossy(e.name().as_ref()).to_string();
                let local_name = name.split(':').last().unwrap_or(&name).to_string();
                if local_name == "entry" {
                    in_entry = false;
                    let clean_code = code.trim().to_lowercase();
                    let clean_name = title.trim().to_string();
                    if !clean_code.is_empty()
                        && !clean_code.contains('<')
                        && !clean_name.is_empty()
                        && !clean_name.contains('<')
                    {
                        languages.push(CatalogLanguage {
                            code: clean_code,
                            name: clean_name,
                            count,
                        });
                    }
                }
                current_tag.clear();
            }
            Ok(Event::Eof) => break,
            Err(_) => break,
            _ => {}
        }
        buf.clear();
    }

    if languages.is_empty() {
        vec![
            CatalogLanguage { code: "eng".to_string(), name: "English".to_string(), count: None },
            CatalogLanguage { code: "fas".to_string(), name: "Persian (فارسی)".to_string(), count: None },
            CatalogLanguage { code: "ara".to_string(), name: "Arabic (العربية)".to_string(), count: None },
            CatalogLanguage { code: "spa".to_string(), name: "Spanish (Español)".to_string(), count: None },
            CatalogLanguage { code: "fra".to_string(), name: "French (Français)".to_string(), count: None },
            CatalogLanguage { code: "deu".to_string(), name: "German (Deutsch)".to_string(), count: None },
            CatalogLanguage { code: "rus".to_string(), name: "Russian (Русский)".to_string(), count: None },
            CatalogLanguage { code: "zho".to_string(), name: "Chinese (中文)".to_string(), count: None },
            CatalogLanguage { code: "ita".to_string(), name: "Italian (Italiano)".to_string(), count: None },
            CatalogLanguage { code: "tur".to_string(), name: "Turkish (Türkçe)".to_string(), count: None },
        ]
    } else {
        languages.sort_by(|a, b| {
            let count_b = b.count.unwrap_or(0);
            let count_a = a.count.unwrap_or(0);
            count_b.cmp(&count_a).then_with(|| a.name.cmp(&b.name))
        });
        languages
    }
}
