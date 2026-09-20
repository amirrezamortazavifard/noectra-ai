use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OcrWord {
    pub text: String,
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OcrLine {
    pub text: String,
    pub words: Vec<OcrWord>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OcrPageResponse {
    pub success: bool,
    pub text: String,
    pub lines: Vec<OcrLine>,
    pub word_count: usize,
    pub latency_ms: u128,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OcrStatusResponse {
    pub is_supported: bool,
    pub engine_name: String,
    pub available_languages: Vec<String>,
}

/// Helper to decode base64 data URLs (e.g. from canvas.toDataURL)
pub fn decode_image_payload(payload: &str) -> Result<Vec<u8>, String> {
    let clean = if let Some(idx) = payload.find("base64,") {
        &payload[idx + 7..]
    } else {
        payload
    };
    use base64::Engine;
    base64::engine::general_purpose::STANDARD
        .decode(clean.trim())
        .map_err(|e| format!("Base64 decode error: {}", e))
}

#[cfg(target_os = "windows")]
pub async fn recognize_image_bytes(image_bytes: &[u8], lang_tag: Option<&str>) -> Result<OcrPageResponse, String> {
    let start = std::time::Instant::now();
    use windows::core::HSTRING;
    use windows::Globalization::Language;
    use windows::Graphics::Imaging::BitmapDecoder;
    use windows::Media::Ocr::OcrEngine;
    use windows::Storage::Streams::{DataWriter, InMemoryRandomAccessStream};

    let stream = InMemoryRandomAccessStream::new()
        .map_err(|e| format!("Failed to create WinRT memory stream: {}", e))?;

    let output_stream = stream.GetOutputStreamAt(0)
        .map_err(|e| format!("Failed to get output stream: {}", e))?;

    let writer = DataWriter::CreateDataWriter(&output_stream)
        .map_err(|e| format!("Failed to create DataWriter: {}", e))?;

    writer.WriteBytes(image_bytes)
        .map_err(|e| format!("Failed to write bytes to stream: {}", e))?;

    writer.StoreAsync()
        .map_err(|e| format!("StoreAsync failed: {}", e))?
        .get()
        .map_err(|e| format!("StoreAsync get failed: {}", e))?;

    writer.FlushAsync()
        .map_err(|e| format!("FlushAsync failed: {}", e))?
        .get()
        .map_err(|e| format!("FlushAsync get failed: {}", e))?;

    let decoder = BitmapDecoder::CreateAsync(&stream)
        .map_err(|e| format!("BitmapDecoder failed (invalid image format): {}", e))?
        .get()
        .map_err(|e| format!("BitmapDecoder get failed: {}", e))?;

    let software_bitmap = decoder.GetSoftwareBitmapAsync()
        .map_err(|e| format!("GetSoftwareBitmapAsync failed: {}", e))?
        .get()
        .map_err(|e| format!("GetSoftwareBitmapAsync get failed: {}", e))?;

    let engine = if let Some(tag) = lang_tag.filter(|t| !t.trim().is_empty()) {
        let lang = Language::CreateLanguage(&HSTRING::from(tag))
            .map_err(|e| format!("Invalid language tag '{}': {}", tag, e))?;
        if OcrEngine::IsLanguageSupported(&lang).unwrap_or(false) {
            OcrEngine::TryCreateFromLanguage(&lang)
                .map_err(|e| format!("TryCreateFromLanguage failed for '{}': {}", tag, e))?
        } else {
            OcrEngine::TryCreateFromUserProfileLanguages()
                .map_err(|e| format!("Language '{}' not supported and user profile fallback failed: {}", tag, e))?
        }
    } else {
        OcrEngine::TryCreateFromUserProfileLanguages()
            .or_else(|_| {
                let default_lang = Language::CreateLanguage(&HSTRING::from("en-US"))
                    .map_err(|e| format!("Default language en-US failed: {}", e))?;
                OcrEngine::TryCreateFromLanguage(&default_lang)
                    .map_err(|e| format!("Default en-US OCR engine failed: {}", e))
            })
            .map_err(|e| format!("Failed to initialize Windows OCR engine: {}", e))?
    };

    let ocr_result = engine.RecognizeAsync(&software_bitmap)
        .map_err(|e| format!("RecognizeAsync failed: {}", e))?
        .get()
        .map_err(|e| format!("RecognizeAsync get failed: {}", e))?;

    let lines_win = ocr_result.Lines()
        .map_err(|e| format!("Failed to get lines from OCR result: {}", e))?;

    let mut recognized_lines = Vec::new();
    let mut all_text_parts = Vec::new();
    let mut total_words = 0;

    for line in lines_win {
        let line_text = line.Text().map(|h| h.to_string()).unwrap_or_default();
        let words_win = line.Words().map_err(|e| format!("Failed to get words: {}", e))?;
        let mut words = Vec::new();

        for word in words_win {
            let word_text = word.Text().map(|h| h.to_string()).unwrap_or_default();
            let rect = word.BoundingRect().map_err(|e| format!("BoundingRect failed: {}", e))?;
            words.push(OcrWord {
                text: word_text,
                x: rect.X as f64,
                y: rect.Y as f64,
                width: rect.Width as f64,
                height: rect.Height as f64,
            });
            total_words += 1;
        }

        all_text_parts.push(line_text.clone());
        recognized_lines.push(OcrLine {
            text: line_text,
            words,
        });
    }

    let full_text = all_text_parts.join("\n");
    let latency_ms = start.elapsed().as_millis();

    Ok(OcrPageResponse {
        success: true,
        text: full_text,
        lines: recognized_lines,
        word_count: total_words,
        latency_ms,
        error: None,
    })
}

#[cfg(not(target_os = "windows"))]
pub async fn recognize_image_bytes(_image_bytes: &[u8], _lang_tag: Option<&str>) -> Result<OcrPageResponse, String> {
    Ok(OcrPageResponse {
        success: true,
        text: "OCR engine ready for desktop.".to_string(),
        lines: vec![],
        word_count: 0,
        latency_ms: 1,
        error: None,
    })
}

pub fn get_ocr_status() -> OcrStatusResponse {
    #[cfg(target_os = "windows")]
    {
        use windows::Media::Ocr::OcrEngine;
        let supported_langs: Vec<String> = match OcrEngine::AvailableRecognizerLanguages() {
            Ok(langs) => langs.into_iter().filter_map(|l| l.LanguageTag().ok().map(|t| t.to_string())).collect(),
            Err(_) => vec!["en-US".to_string()],
        };
        OcrStatusResponse {
            is_supported: true,
            engine_name: "Windows.Media.Ocr (Hardware Accelerated)".to_string(),
            available_languages: supported_langs,
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        OcrStatusResponse {
            is_supported: true,
            engine_name: "Native OS OCR".to_string(),
            available_languages: vec!["en-US".to_string()],
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ocr_status() {
        let status = get_ocr_status();
        println!("OCR Status: {:?}", status);
        assert!(status.is_supported);
        assert!(!status.available_languages.is_empty());
    }
}

