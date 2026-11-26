//! Persistent plain-text Memory (`survival-memory.txt`) + Survival settings (`survival-settings.json`).

use chrono::{Datelike, Local};
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex, OnceLock};

pub const MAX_CHARS: usize = 6000;
pub const MAX_NOTE: usize = 300;
pub const MAX_FILES_LISTED: usize = 20;

const HEADER: &str = "# Noectra AI Personal Memory (one note per line; safe to edit directly)\n";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SurvivalSettings {
    #[serde(default = "default_true")]
    pub memory_ai_writes: bool,
    #[serde(default)]
    pub custom_instructions: Option<String>,
    #[serde(default = "default_reasoning_budget")]
    pub reasoning_budget: String,
    #[serde(default = "default_length_limit")]
    pub length_limit: String,
    #[serde(default)]
    pub files_dir: Option<String>,
    #[serde(default = "default_true")]
    pub offline_library_enabled: bool,
    #[serde(default = "default_model_mode")]
    pub model_mode: String,
}

fn default_true() -> bool {
    true
}
fn default_reasoning_budget() -> String {
    "medium".to_string()
}
fn default_length_limit() -> String {
    "normal".to_string()
}
fn default_model_mode() -> String {
    "online".to_string()
}

impl Default for SurvivalSettings {
    fn default() -> Self {
        Self {
            memory_ai_writes: true,
            custom_instructions: None,
            reasoning_budget: default_reasoning_budget(),
            length_limit: default_length_limit(),
            files_dir: None,
            offline_library_enabled: true,
            model_mode: default_model_mode(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct MemoryChangeItem {
    pub old: String,
    pub new: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct MemoryPlan {
    #[serde(default)]
    pub forget: Vec<String>,
    #[serde(default)]
    pub change: Vec<MemoryChangeItem>,
    #[serde(default)]
    pub remember: Vec<String>,
    #[serde(default)]
    pub asked_forget: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MemoryEvent {
    #[serde(rename = "type")]
    pub kind: String,
    pub action: String, // "add" | "change" | "delete" | "full"
    #[serde(default)]
    pub note: String,
    #[serde(default)]
    pub old: String,
    #[serde(default)]
    pub at: Option<usize>,
    #[serde(default)]
    pub before: Vec<String>,
    #[serde(default)]
    pub after: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveTextResult {
    pub notes: Vec<String>,
    pub kept: Vec<String>,
    pub dropped: Vec<String>,
    pub text: String,
}

#[derive(Clone)]
pub struct MemoryStore {
    memory_path: PathBuf,
    settings_path: PathBuf,
    lock: Arc<Mutex<()>>,
}

impl MemoryStore {
    pub fn new(data_dir: &Path) -> Self {
        Self {
            memory_path: data_dir.join("survival-memory.txt"),
            settings_path: data_dir.join("survival-settings.json"),
            lock: Arc::new(Mutex::new(())),
        }
    }

    pub fn load_settings(&self) -> SurvivalSettings {
        let _g = self.lock.lock().unwrap();
        self.read_settings_unlocked()
    }

    pub fn save_settings(&self, settings: &SurvivalSettings) -> anyhow::Result<()> {
        let _g = self.lock.lock().unwrap();
        self.write_settings_unlocked(settings)
    }

    pub fn update_settings<F>(&self, f: F) -> anyhow::Result<SurvivalSettings>
    where
        F: FnOnce(&mut SurvivalSettings),
    {
        let _g = self.lock.lock().unwrap();
        let mut current = self.read_settings_unlocked();
        f(&mut current);
        self.write_settings_unlocked(&current)?;
        Ok(current)
    }

    fn read_settings_unlocked(&self) -> SurvivalSettings {
        match fs::read_to_string(&self.settings_path) {
            Ok(raw) => serde_json::from_str::<SurvivalSettings>(&raw).unwrap_or_default(),
            Err(_) => SurvivalSettings::default(),
        }
    }

    fn write_settings_unlocked(&self, settings: &SurvivalSettings) -> anyhow::Result<()> {
        if let Some(parent) = self.settings_path.parent() {
            fs::create_dir_all(parent)?;
        }
        let body = serde_json::to_string_pretty(settings)?;
        atomic_write(&self.settings_path, body.as_bytes())
    }

    pub fn ai_writes(&self) -> bool {
        self.load_settings().memory_ai_writes
    }

    pub fn notes(&self) -> Vec<String> {
        let _g = self.lock.lock().unwrap();
        self.read_notes_unlocked()
    }

    pub fn raw_text(&self) -> String {
        self.notes().join("\n")
    }

    pub fn clear(&self) -> anyhow::Result<()> {
        let _g = self.lock.lock().unwrap();
        self.write_notes_unlocked(&[])
    }

    pub fn save_text(&self, text: &str, base: Option<&str>) -> anyhow::Result<SaveTextResult> {
        let mut mine = parse_notes(text, false);
        let _g = self.lock.lock().unwrap();
        let current = self.read_notes_unlocked();
        let mut kept = Vec::new();
        let mut dropped = Vec::new();

        if let Some(base_str) = base {
            let was: HashSet<String> = parse_notes(base_str, false)
                .into_iter()
                .map(|n| n.to_lowercase())
                .collect();
            let now: HashSet<String> = current.iter().map(|n| n.to_lowercase()).collect();

            for n in &mine {
                let low = n.to_lowercase();
                if was.contains(&low) && !now.contains(&low) {
                    dropped.push(n.clone());
                }
            }
            let dropped_set: HashSet<String> = dropped.iter().map(|d| d.to_lowercase()).collect();
            mine.retain(|n| !dropped_set.contains(&n.to_lowercase()));

            let theirs: HashSet<String> = mine
                .iter()
                .map(|n| n.to_lowercase())
                .chain(dropped_set)
                .collect();

            for n in &current {
                let low = n.to_lowercase();
                if !was.contains(&low) && !theirs.contains(&low) {
                    kept.push(n.clone());
                }
            }
        }

        let mut notes = mine;
        notes.extend(kept.clone());
        let final_notes = parse_notes(&notes.join("\n"), false);
        self.write_notes_unlocked(&final_notes)?;
        Ok(SaveTextResult {
            text: final_notes.join("\n"),
            notes: final_notes,
            kept,
            dropped,
        })
    }

    pub fn undo(&self, event: &MemoryEvent) -> anyhow::Result<bool> {
        let note = clean_note(&event.note);
        let old = clean_note(&event.old);
        let _g = self.lock.lock().unwrap();
        let mut notes = self.read_notes_unlocked();
        let keys: Vec<String> = notes.iter().map(|n| n.to_lowercase()).collect();

        match event.action.as_str() {
            "add" if !note.is_empty() => {
                if let Some(idx) = keys.iter().position(|k| k == &note.to_lowercase()) {
                    notes.remove(idx);
                } else {
                    return Ok(false);
                }
            }
            "change" if !note.is_empty() && !old.is_empty() => {
                if let Some(idx) = keys.iter().position(|k| k == &note.to_lowercase()) {
                    if keys.iter().any(|k| k == &old.to_lowercase()) {
                        notes.remove(idx);
                    } else {
                        notes[idx] = old;
                    }
                } else {
                    return Ok(false);
                }
            }
            "delete" if !old.is_empty() && !keys.iter().any(|k| k == &old.to_lowercase()) => {
                let max_k = event.before.len().max(event.after.len());
                let mut where_idx: Option<usize> = None;
                for k in 0..max_k {
                    if let Some(b) = event.before.get(k) {
                        let bk = clean_note(b).to_lowercase();
                        if let Some(pos) = keys.iter().position(|x| x == &bk) {
                            where_idx = Some(pos);
                            break;
                        }
                    }
                    if let Some(a_idx) = event.after.len().checked_sub(1 + k) {
                        let ak = clean_note(&event.after[a_idx]).to_lowercase();
                        if let Some(pos) = keys.iter().position(|x| x == &ak) {
                            where_idx = Some(pos + 1);
                            break;
                        }
                    }
                }
                let insert_at = where_idx.unwrap_or_else(|| {
                    event
                        .at
                        .filter(|&at| at <= notes.len())
                        .unwrap_or(notes.len())
                });
                notes.insert(insert_at, old);
            }
            _ => return Ok(false),
        }

        let normalized = parse_notes(&notes.join("\n"), false);
        self.write_notes_unlocked(&normalized)?;
        Ok(true)
    }

    pub fn apply(&self, plan: &MemoryPlan) -> Vec<MemoryEvent> {
        if !self.ai_writes() {
            return Vec::new();
        }
        let snapshot = self.notes();
        let key_of = |text: &str| -> String {
            let cleaned = clean_note(text);
            if let Some(i) = find_note_index(&cleaned, &snapshot) {
                snapshot[i].to_lowercase()
            } else {
                cleaned.trim_end_matches(&[' ', '.'][..]).to_lowercase()
            }
        };

        let mut events = Vec::new();
        let mut gone: Vec<(String, String)> = Vec::new();
        let mut rewritten: HashSet<String> = HashSet::new();
        for c in &plan.change {
            if is_rewrite(c) {
                rewritten.insert(key_of(&c.old));
            }
        }
        let mut handled: HashSet<String> = HashSet::new();

        for note in &plan.forget {
            let k = key_of(note);
            if handled.contains(&k) || rewritten.contains(&k) {
                continue;
            }
            handled.insert(k);
            if let Some(ev) = self.change(note, "", Some(&snapshot), false) {
                gone.push((ev.old.clone(), ev.note.clone()));
                events.push(ev);
            }
        }

        for c in &plan.change {
            let k = key_of(&c.old);
            let extra = tacked_on(&c.old, &c.new);
            let ev = if handled.contains(&k) {
                extra.and_then(|e| self.add(&e))
            } else if let Some(e) = extra {
                handled.insert(k);
                self.add(&e)
            } else {
                handled.insert(k);
                let mut res = self.change(&c.old, &c.new, Some(&snapshot), !plan.asked_forget);
                if res.is_none() && !is_nothing(&tidy_note(&clean_note(&c.new))) {
                    res = self.add(&c.new);
                }
                res
            };
            if let Some(ev) = ev {
                if !ev.old.is_empty() {
                    gone.push((ev.old.clone(), ev.note.clone()));
                }
                events.push(ev);
            }
        }

        for note in &plan.remember {
            if gone.iter().any(|(g, rw)| repeats_deleted(note, g, rw)) {
                continue;
            }
            if let Some(ev) = self.add(note) {
                events.push(ev);
            }
        }

        events
    }

    pub fn add(&self, raw_note: &str) -> Option<MemoryEvent> {
        let note = tidy_note(&clean_note(raw_note));
        if !usable_note(&note) {
            return None;
        }
        let new_words = words_set(&note);
        let _g = self.lock.lock().unwrap();
        let mut notes = self.read_notes_unlocked();

        for (i, n) in notes.iter().enumerate() {
            if n.eq_ignore_ascii_case(&note) {
                return None;
            }
            if !same_person(n, &note) {
                continue;
            }
            let old_words = words_set(n);
            if !same_shape(n, &note) {
                if old_words.is_empty() || old_words != new_words {
                    continue;
                }
            } else if !new_words.is_empty() && new_words.is_subset(&old_words) {
                return None;
            }

            if !old_words.is_empty() && old_words.is_subset(&new_words) {
                if total_chars(&notes) - n.len() + note.len() > MAX_CHARS {
                    return Some(MemoryEvent {
                        kind: "memory".to_string(),
                        action: "full".to_string(),
                        note,
                        old: String::new(),
                        at: None,
                        before: Vec::new(),
                        after: Vec::new(),
                    });
                }
                let old_text = n.clone();
                notes[i] = note.clone();
                let normalized = parse_notes(&notes.join("\n"), false);
                let _ = self.write_notes_unlocked(&normalized);
                return Some(MemoryEvent {
                    kind: "memory".to_string(),
                    action: "change".to_string(),
                    note,
                    old: old_text,
                    at: None,
                    before: Vec::new(),
                    after: Vec::new(),
                });
            }
        }

        if total_chars(&notes) + note.len() + 1 > MAX_CHARS {
            return Some(MemoryEvent {
                kind: "memory".to_string(),
                action: "full".to_string(),
                note,
                old: String::new(),
                at: None,
                before: Vec::new(),
                after: Vec::new(),
            });
        }
        notes.push(note.clone());
        let _ = self.write_notes_unlocked(&notes);
        Some(MemoryEvent {
            kind: "memory".to_string(),
            action: "add".to_string(),
            note,
            old: String::new(),
            at: None,
            before: Vec::new(),
            after: Vec::new(),
        })
    }

    pub fn change(
        &self,
        raw_old: &str,
        raw_new: &str,
        snapshot: Option<&[String]>,
        keep: bool,
    ) -> Option<MemoryEvent> {
        let old = clean_note(raw_old);
        let mut new_val = tidy_note(&clean_note(raw_new));
        if is_nothing(&new_val) {
            new_val.clear();
        }
        if old.is_empty() || (!new_val.is_empty() && !usable_note(&new_val)) {
            return None;
        }

        let mut beside_note: Option<String> = None;
        let event = {
            let _g = self.lock.lock().unwrap();
            let mut notes = self.read_notes_unlocked();
            let i = find_note_index(&old, &notes)?;
            let was = notes[i].clone();
            let (narrowed, beside) = narrowed_rewrite(&was, &old, &new_val);
            let mut candidate = narrowed?;
            if keep && !candidate.is_empty() && !beside {
                candidate = with_kept(&was, &candidate);
            }
            if candidate.trim_end_matches(&[' ', '.'][..]).to_lowercase()
                == was.trim_end_matches(&[' ', '.'][..]).to_lowercase()
            {
                return None;
            }
            if beside {
                beside_note = Some(candidate);
                None
            } else {
                if !candidate.is_empty() && notes.iter().any(|n| n.eq_ignore_ascii_case(&candidate))
                {
                    candidate.clear();
                }
                if !candidate.is_empty()
                    && total_chars(&notes) - was.len() + candidate.len() > MAX_CHARS
                {
                    return Some(MemoryEvent {
                        kind: "memory".to_string(),
                        action: "full".to_string(),
                        note: candidate,
                        old: String::new(),
                        at: None,
                        before: Vec::new(),
                        after: Vec::new(),
                    });
                }

                let ref_list = snapshot
                    .map(|s| s.to_vec())
                    .unwrap_or_else(|| notes.clone());
                let (before, after) = if let Some(j) =
                    ref_list.iter().position(|n| n.eq_ignore_ascii_case(&was))
                {
                    (ref_list[j + 1..].to_vec(), ref_list[..j].to_vec())
                } else {
                    (notes[i + 1..].to_vec(), notes[..i].to_vec())
                };

                if !candidate.is_empty() {
                    notes[i] = candidate.clone();
                } else {
                    notes.remove(i);
                }
                let _ = self.write_notes_unlocked(&notes);

                if !candidate.is_empty() {
                    Some(MemoryEvent {
                        kind: "memory".to_string(),
                        action: "change".to_string(),
                        note: candidate,
                        old: was,
                        at: None,
                        before: Vec::new(),
                        after: Vec::new(),
                    })
                } else {
                    Some(MemoryEvent {
                        kind: "memory".to_string(),
                        action: "delete".to_string(),
                        note: String::new(),
                        old: was,
                        at: Some(i),
                        before,
                        after,
                    })
                }
            }
        };

        if let Some(bn) = beside_note {
            return self.add(&bn);
        }
        event
    }

    fn read_notes_unlocked(&self) -> Vec<String> {
        match fs::read_to_string(&self.memory_path) {
            Ok(raw) => parse_notes(&raw, true),
            Err(_) => Vec::new(),
        }
    }

    fn write_notes_unlocked(&self, notes: &[String]) -> anyhow::Result<()> {
        if let Some(parent) = self.memory_path.parent() {
            fs::create_dir_all(parent)?;
        }
        let mut body = String::from(HEADER);
        for n in notes {
            body.push_str(n);
            body.push('\n');
        }
        atomic_write(&self.memory_path, body.as_bytes())
    }
}

pub fn build_prompt_section(
    notes: &[String],
    ai_writes: bool,
    files: &[(String, String)],
    include_today: bool,
) -> String {
    let mut out: Vec<String> = Vec::new();
    if include_today {
        let now = Local::now();
        out.push(format!(
            "Today is {}, {} {}, {}.",
            now.format("%A"),
            now.format("%B"),
            now.day(),
            now.year()
        ));
    }
    if !files.is_empty() {
        let shown: Vec<String> = files
            .iter()
            .take(MAX_FILES_LISTED)
            .map(|(name, title)| {
                if !title.is_empty() && title != name && title.len() < 80 {
                    format!("{name} (\"{title}\")")
                } else {
                    name.clone()
                }
            })
            .collect();
        let more = if files.len() > MAX_FILES_LISTED {
            format!(", and {} more", files.len() - MAX_FILES_LISTED)
        } else {
            String::new()
        };
        out.push(format!(
            "The user's own files, searched alongside the offline library: {}{}.",
            shown.join("; "),
            more
        ));
    }
    if !notes.is_empty() || ai_writes {
        let listing = if notes.is_empty() {
            "(none yet)".to_string()
        } else {
            notes
                .iter()
                .map(|n| format!("- {n}"))
                .collect::<Vec<_>>()
                .join("\n")
        };
        out.push(format!(
            "Memory: your persistent notes about this user, kept between chats (editable via Memory in the chat toolbar). These are your notes, not part of their files or the library, so never claim a file or article states something that only comes from a Memory note.\n{listing}"
        ));
        let mut rules = vec![
            "Use a note when it bears on the question (an allergy, medicine, household, equipment), and leave unrelated notes alone.".to_string(),
        ];
        if ai_writes {
            rules.push("After each answer, the app automatically updates Memory from durable personal facts the user shared. If the user only asks you to remember or forget something, don't search: just reply \"OK, I'll remember that.\" or \"OK, I'll forget that.\"".to_string());
        } else {
            rules.push("The user manages Memory manually; AI automatic writes are turned off.".to_string());
        }
        out.push(
            rules
                .into_iter()
                .map(|r| format!("- {r}"))
                .collect::<Vec<_>>()
                .join("\n"),
        );
    }
    out.join("\n\n")
}

/// Parse JSON output from `MEMORY_CHECK_PROMPT` cleanly (tolerating surrounding prose or markdown fences).
pub fn parse_ai_memory_plan(raw: &str, user_message: &str) -> MemoryPlan {
    let trimmed = raw
        .trim()
        .trim_start_matches("```json")
        .trim_start_matches("```")
        .trim_end_matches("```")
        .trim();

    let json_slice = if let (Some(s), Some(e)) = (trimmed.find('{'), trimmed.rfind('}')) {
        &trimmed[s..=e]
    } else {
        trimmed
    };

    let mut plan = serde_json::from_str::<MemoryPlan>(json_slice).unwrap_or_default();
    let lower_msg = user_message.to_ascii_lowercase();
    plan.asked_forget = lower_msg.contains("forget")
        || lower_msg.contains("remove")
        || lower_msg.contains("delete")
        || lower_msg.contains("فراموش");
    plan
}

fn atomic_write(path: &Path, bytes: &[u8]) -> anyhow::Result<()> {
    let tmp = path.with_extension("tmp");
    fs::write(&tmp, bytes)?;
    if fs::rename(&tmp, path).is_err() {
        fs::write(path, bytes)?;
        let _ = fs::remove_file(&tmp);
    }
    Ok(())
}

pub fn clean_note(raw: &str) -> String {
    let single_line = raw.replace(['\r', '\n'], " ");
    let mut s = single_line.trim().to_string();
    loop {
        let stripped = s
            .trim_start_matches(|c: char| c == '-' || c == '*' || c == '•' || c.is_whitespace())
            .to_string();
        if stripped.len() == s.len() {
            break;
        }
        s = stripped;
    }
    let s = s.split_whitespace().collect::<Vec<_>>().join(" ");
    if s.chars().count() > MAX_NOTE {
        s.chars().take(MAX_NOTE).collect()
    } else {
        s
    }
}

pub fn tidy_note(s: &str) -> String {
    let mut out = s.trim().to_string();
    if out.is_empty() {
        return out;
    }
    if let Some(first) = out.chars().next() {
        if first.is_lowercase() {
            let rest: String = out.chars().skip(1).collect();
            out = format!("{}{}", first.to_uppercase(), rest);
        }
    }
    if !out.ends_with('.') && !out.ends_with('!') && !out.ends_with('?') {
        out.push('.');
    }
    out
}

pub fn parse_notes(text: &str, skip_header: bool) -> Vec<String> {
    let mut seen: HashSet<String> = HashSet::new();
    let mut out = Vec::new();
    let mut total = 0usize;
    for raw_line in text.lines() {
        let t = raw_line.trim();
        if t.is_empty() || (skip_header && t.starts_with('#')) {
            continue;
        }
        let cleaned = clean_note(t);
        if cleaned.is_empty() {
            continue;
        }
        let key = cleaned.to_lowercase();
        if seen.contains(&key) {
            continue;
        }
        if total + cleaned.len() + 1 > MAX_CHARS {
            break;
        }
        seen.insert(key);
        total += cleaned.len() + 1;
        out.push(cleaned);
    }
    out
}

fn total_chars(notes: &[String]) -> usize {
    notes.iter().map(|n| n.len() + 1).sum()
}

fn usable_note(note: &str) -> bool {
    if note.is_empty() || is_nothing(note) {
        return false;
    }
    let words = words_set(note);
    !words.is_empty()
}

fn is_nothing(s: &str) -> bool {
    static RE: OnceLock<Regex> = OnceLock::new();
    let re = RE.get_or_init(|| {
        Regex::new(r"(?i)^(none|nothing|no\s+\w+(\s+stored)?|n/?a|empty)\.?$").unwrap()
    });
    re.is_match(s.trim())
}

fn words_set(s: &str) -> HashSet<String> {
    static STOP: &[&str] = &[
        "the", "a", "an", "and", "or", "is", "are", "has", "have", "to", "of", "in", "on", "for",
        "with", "user",
    ];
    s.to_lowercase()
        .split(|c: char| !c.is_alphanumeric())
        .filter(|w| !w.is_empty() && !STOP.contains(w))
        .map(|w| w.to_string())
        .collect()
}

fn has_negation(s: &str) -> bool {
    let lower = format!(" {} ", s.to_lowercase());
    [" not ", " n't", "never", " no "]
        .iter()
        .any(|m| lower.contains(m))
}

fn same_shape(a: &str, b: &str) -> bool {
    has_negation(a) == has_negation(b)
}

fn same_person(a: &str, b: &str) -> bool {
    let family = [
        "wife", "husband", "partner", "daughter", "son", "child", "children", "baby", "mother",
        "father", "dog", "cat", "pet",
    ];
    let fa: Vec<&&str> = family
        .iter()
        .filter(|f| a.to_lowercase().contains(**f))
        .collect();
    let fb: Vec<&&str> = family
        .iter()
        .filter(|f| b.to_lowercase().contains(**f))
        .collect();
    fa == fb
}

fn find_note_index(needle: &str, notes: &[String]) -> Option<usize> {
    let target = needle.trim_end_matches(&[' ', '.'][..]).to_lowercase();
    if let Some(exact) = notes
        .iter()
        .position(|n| n.trim_end_matches(&[' ', '.'][..]).to_lowercase() == target)
    {
        return Some(exact);
    }
    // Partial word overlap fallback (>= 70% overlap with at least 2 words)
    let nw = words_set(needle);
    if nw.is_empty() {
        return None;
    }
    let mut best: Option<(usize, usize)> = None;
    for (idx, n) in notes.iter().enumerate() {
        if n.to_lowercase().contains(&target) {
            return Some(idx);
        }
        let w = words_set(n);
        let shared = nw.intersection(&w).count();
        if shared >= 2 && shared * 10 >= nw.len() * 7 {
            if best.map_or(true, |(_, bs)| shared > bs) {
                best = Some((idx, shared));
            }
        }
    }
    best.map(|(i, _)| i)
}

fn is_rewrite(c: &MemoryChangeItem) -> bool {
    !is_nothing(&tidy_note(&clean_note(&c.new)))
        && words_set(&c.old)
            .intersection(&words_set(&c.new))
            .next()
            .is_some()
}

fn tacked_on(old: &str, new_val: &str) -> Option<String> {
    let ow = words_set(old);
    let nw = words_set(new_val);
    if ow.is_empty() || nw.is_empty() {
        return None;
    }
    // Only split if there's an explicit separator and the first clause reproduces old while second doesn't overlap
    if let Some(idx) = new_val.find("; ").or_else(|| new_val.find(" and ")) {
        let first = &new_val[..idx];
        let rest = new_val[idx..]
            .trim_start_matches("; ")
            .trim_start_matches(" and ");
        let fw = words_set(first);
        let rw = words_set(rest);
        if ow.is_subset(&fw) && !rw.is_empty() && rw.is_disjoint(&ow) {
            return Some(rest.to_string());
        }
    }
    None
}

fn repeats_deleted(note: &str, gone: &str, rewrite: &str) -> bool {
    let words = words_set(note);
    let had = words_set(gone);
    if words.is_empty() || !words.is_subset(&had) || !same_shape(note, gone) {
        return false;
    }
    rewrite.is_empty() || words == had || words.is_subset(&words_set(rewrite))
}

fn narrowed_rewrite(was: &str, old: &str, new_val: &str) -> (Option<String>, bool) {
    let part = old.trim_end_matches(&[' ', '.'][..]);
    if was
        .trim_end_matches(&[' ', '.'][..])
        .eq_ignore_ascii_case(part)
    {
        return (Some(new_val.to_string()), false);
    }
    if !new_val.is_empty() {
        let lower_was = was.to_lowercase();
        let lower_part = part.to_lowercase();
        if let Some(k) = lower_was.find(&lower_part) {
            let rest = was[k + lower_part.len()..].trim_matches(&[' ', '.'][..]);
            if !rest.is_empty() && new_val.to_lowercase().contains(&rest.to_lowercase()) {
                return (Some(new_val.to_string()), false);
            }
            let replaced = format!(
                "{}{}{}",
                &was[..k],
                new_val.trim_end_matches(&[' ', '.'][..]),
                &was[k + lower_part.len()..]
            )
            .trim()
            .replace("..", ".");
            return (Some(replaced), false);
        }
        return (Some(new_val.to_string()), true);
    }
    (None, false)
}

fn with_kept(was: &str, new_val: &str) -> String {
    let trimmed_was = was.trim_end_matches(&[' ', '.'][..]);
    let parts: Vec<&str> = trimmed_was.split(&[';'][..]).collect();
    if parts.len() <= 1 {
        return new_val.to_string();
    }
    let nw = words_set(new_val);
    let kept: Vec<&str> = parts[1..]
        .iter()
        .map(|p| p.trim())
        .filter(|p| words_set(p).len() >= 2 && words_set(p).is_disjoint(&nw))
        .collect();
    if kept.is_empty() {
        new_val.to_string()
    } else {
        format!(
            "{}; {}.",
            new_val.trim_end_matches(&[' ', '.'][..]),
            kept.join("; ")
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_dir(label: &str) -> PathBuf {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let dir = std::env::temp_dir().join(format!("noectra_mem_{label}_{nanos}"));
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn memory_add_change_undo_and_save_merge() {
        let dir = temp_dir("crud");
        let store = MemoryStore::new(&dir);

        let ev = store.add("allergic to penicillin").unwrap();
        assert_eq!(ev.action, "add");
        assert_eq!(ev.note, "Allergic to penicillin.");

        // Duplicate ignored
        assert!(store.add("Allergic to penicillin.").is_none());

        // Add alongside without overwriting daughter's allergy
        let ev2 = store.add("Daughter Maya is allergic to peanuts").unwrap();
        assert_eq!(ev2.action, "add");
        assert_eq!(store.notes().len(), 2);

        // Undo add
        assert!(store.undo(&ev2).unwrap());
        assert_eq!(store.notes().len(), 1);

        // Concurrent save_text preserves AI note added since base
        let base = store.raw_text();
        store.add("Has a 2000W inverter generator.").unwrap();
        let res = store
            .save_text("Allergic to penicillin.\nLives in mountain cabin.", Some(&base))
            .unwrap();
        assert_eq!(res.kept.len(), 1);
        assert_eq!(res.notes.len(), 3);

        let _ = fs::remove_dir_all(&dir);
    }
}
