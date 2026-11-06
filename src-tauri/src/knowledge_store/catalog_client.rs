use crate::knowledge_store::models::{CatalogQuery, CatalogResponse, ZimArchive};
use crate::knowledge_store::opds_parser::parse_opds_feed;
use reqwest::Client;
use std::time::Duration;

#[derive(Clone)]
pub struct KiwixCatalogClient {
    pub base_url: String,
    pub client: Client,
}

impl KiwixCatalogClient {
    pub fn new(base_url: Option<String>) -> Self {
        let url = base_url
            .unwrap_or_else(|| "https://library.kiwix.org/catalog/v2".to_string())
            .trim_end_matches('/')
            .to_string();

        let client = Client::builder()
            .timeout(Duration::from_secs(30))
            .redirect(reqwest::redirect::Policy::limited(10))
            .build()
            .unwrap_or_default();

        Self {
            base_url: url,
            client,
        }
    }

    pub async fn fetch_entries(&self, query: &CatalogQuery) -> Result<CatalogResponse, String> {
        let endpoint = format!("{}/entries", self.base_url);
        let mut req = self.client.get(&endpoint);

        if let Some(ref q) = query.q {
            if !q.trim().is_empty() {
                req = req.query(&[("q", q.trim())]);
            }
        }
        if let Some(ref cat) = query.category {
            if !cat.trim().is_empty() && cat != "all" {
                req = req.query(&[("category", cat.trim())]);
            }
        }
        if let Some(ref lang) = query.lang {
            if !lang.trim().is_empty() && lang != "all" {
                req = req.query(&[("lang", lang.trim())]);
            }
        }
        if let Some(ref tag) = query.tag {
            if !tag.trim().is_empty() {
                req = req.query(&[("tag", tag.trim())]);
            }
        }
        if let Some(ref notag) = query.notag {
            if !notag.trim().is_empty() {
                req = req.query(&[("notag", notag.trim())]);
            }
        }
        if let Some(maxsize) = query.maxsize {
            if maxsize > 0 {
                req = req.query(&[("maxsize", maxsize.to_string())]);
            }
        }
        let start = query.start.unwrap_or(0);
        let count = query.count.unwrap_or(30);
        req = req.query(&[("start", start.to_string()), ("count", count.to_string())]);

        let res = req.send().await.map_err(|e| format!("Failed to fetch catalog: {}", e))?;
        if !res.status().is_success() {
            return Err(format!("Catalog returned HTTP {}", res.status()));
        }

        let xml_text = res.text().await.map_err(|e| format!("Failed to read XML: {}", e))?;
        parse_opds_feed(&xml_text, &self.base_url)
    }

    pub async fn get_categories(&self) -> Result<Vec<String>, String> {
        // Fallback default rich categories list
        let default_categories = vec![
            "wikipedia".to_string(),
            "wikimed".to_string(),
            "wikibooks".to_string(),
            "wikisource".to_string(),
            "wiktionary".to_string(),
            "wikivoyage".to_string(),
            "gutenberg".to_string(),
            "stackexchange".to_string(),
            "ted".to_string(),
            "other".to_string(),
        ];

        let endpoint = format!("{}/categories", self.base_url);
        match self.client.get(&endpoint).send().await {
            Ok(res) if res.status().is_success() => {
                if let Ok(text) = res.text().await {
                    let mut cats: Vec<String> = text
                        .lines()
                        .map(|l| l.trim().to_string())
                        .filter(|l| !l.is_empty())
                        .collect();
                    if !cats.is_empty() {
                        cats.sort();
                        cats.dedup();
                        return Ok(cats);
                    }
                }
                Ok(default_categories)
            }
            _ => Ok(default_categories),
        }
    }

    pub async fn get_languages(&self) -> Result<Vec<String>, String> {
        let default_langs = vec![
            "eng".to_string(),
            "fas".to_string(),
            "ara".to_string(),
            "fra".to_string(),
            "deu".to_string(),
            "spa".to_string(),
            "ita".to_string(),
            "rus".to_string(),
            "zho".to_string(),
        ];

        let endpoint = format!("{}/languages", self.base_url);
        match self.client.get(&endpoint).send().await {
            Ok(res) if res.status().is_success() => {
                if let Ok(text) = res.text().await {
                    let mut langs: Vec<String> = text
                        .lines()
                        .map(|l| l.trim().to_string())
                        .filter(|l| !l.is_empty() && l.len() == 3)
                        .collect();
                    if !langs.is_empty() {
                        langs.sort();
                        langs.dedup();
                        return Ok(langs);
                    }
                }
                Ok(default_langs)
            }
            _ => Ok(default_langs),
        }
    }

    pub async fn get_entry_details(&self, zimid: &str) -> Result<ZimArchive, String> {
        let endpoint = format!("{}/entry/{}", self.base_url, zimid);
        let res = self.client.get(&endpoint).send().await.map_err(|e| e.to_string())?;
        if !res.status().is_success() {
            return Err(format!("Entry detail HTTP {}", res.status()));
        }
        let xml_text = res.text().await.map_err(|e| e.to_string())?;
        let catalog = parse_opds_feed(&xml_text, &self.base_url)?;
        catalog.entries.into_iter().next().ok_or_else(|| "Entry not found in XML response".to_string())
    }
}
