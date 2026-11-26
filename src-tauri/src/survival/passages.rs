//! Cuts long articles and personal documents into ~1,500-character passages on paragraph boundaries.

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PassageChunk {
    pub heading: String,
    pub text: String,
}

/// Split markdown/plain text into ~1,500-character chunks (up to `hard` max per single paragraph),
/// preserving headings and keeping paragraph boundaries intact.
pub fn split_passages(text: &str, target: usize, hard: usize) -> Vec<PassageChunk> {
    let mut out: Vec<PassageChunk> = Vec::new();
    let mut buf: Vec<String> = Vec::new();
    let mut size: usize = 0;
    let mut heading = String::new();
    let mut buf_heading = String::new();

    for raw_para in text.split("\n\n") {
        // Also collapse >2 newlines cleanly since split("\n\n") may yield leading newlines
        let para = raw_para.trim();
        if para.is_empty() {
            continue;
        }
        if para.starts_with('#') {
            if !buf.is_empty() && size > 200 {
                out.push(PassageChunk {
                    heading: buf_heading.clone(),
                    text: buf.join("\n\n"),
                });
                buf.clear();
                size = 0;
            }
            heading = para.trim_start_matches('#').trim().to_string();
            if buf.is_empty() {
                buf_heading = heading.clone();
            }
            size += para.len() + 2;
            buf.push(para.to_string());
            continue;
        }

        let mut remaining = para;
        let mut pieces: Vec<String> = Vec::new();
        while remaining.chars().count() > hard {
            let byte_min = char_to_byte_idx(remaining, target / 2);
            let byte_max = char_to_byte_idx(remaining, hard);
            let slice = &remaining[..byte_max];
            let cut = slice[byte_min..]
                .rfind(". ")
                .map(|rel| byte_min + rel + 1)
                .unwrap_or_else(|| {
                    slice[byte_min..]
                        .rfind(' ')
                        .map(|rel| byte_min + rel)
                        .unwrap_or(byte_max)
                });
            let (head, tail) = remaining.split_at(cut);
            let head_trimmed = head.trim();
            if !head_trimmed.is_empty() {
                pieces.push(head_trimmed.to_string());
            }
            remaining = tail.trim();
        }
        if !remaining.is_empty() {
            pieces.push(remaining.to_string());
        }

        for piece in pieces {
            if !buf.is_empty() && size + piece.len() > target {
                out.push(PassageChunk {
                    heading: buf_heading.clone(),
                    text: buf.join("\n\n"),
                });
                buf.clear();
                size = 0;
                buf_heading = heading.clone();
            } else if buf.is_empty() {
                buf_heading = heading.clone();
            }
            size += piece.len() + 2;
            buf.push(piece);
        }
    }

    if !buf.is_empty() {
        out.push(PassageChunk {
            heading: buf_heading,
            text: buf.join("\n\n"),
        });
    }

    out
}

fn char_to_byte_idx(s: &str, char_idx: usize) -> usize {
    s.char_indices()
        .nth(char_idx)
        .map(|(b, _)| b)
        .unwrap_or(s.len())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn splits_headings_and_paragraphs() {
        let doc = "# Water Purification\n\nBoiling water kills pathogens.\n\n".to_string()
            + &"A ".repeat(900)
            + "\n\n# Shelter\n\nBuild away from dry riverbeds.";
        let chunks = split_passages(&doc, 1500, 3000);
        assert!(chunks.len() >= 2);
        assert_eq!(chunks[0].heading, "Water Purification");
        assert!(chunks.last().unwrap().heading == "Shelter");
    }

    #[test]
    fn splits_oversized_paragraph_safely_on_utf8() {
        let text = "سلام دنیا. ".repeat(400);
        let chunks = split_passages(&text, 500, 900);
        assert!(chunks.len() >= 2);
        assert!(chunks.iter().all(|c| !c.text.is_empty()));
    }
}
