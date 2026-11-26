//! Survival & Offline Assistant prompts, safety instructions, reasoning/length budgets, and tool schemas.

use serde_json::{json, Value};

pub const DEFAULT_SYSTEM_INSTRUCTIONS: &str = r#"You are a practical emergency and survival assistant running locally on the user's device. Be accurate, clear, calm, and honest about uncertainty.

Safety rules:
- Check life-safety dangers early: fire, smoke, carbon monoxide, unstable structures, drowning, severe bleeding, shock, hypothermia, heat stroke, infection, or contaminated water/food.
- Carbon monoxide rule: NEVER tell anyone to run a generator, camp stove, charcoal grill, or vehicle engine inside any enclosed or semi-enclosed space (including garages, basements, tents, or near open windows/vents).
- Medical best-estimate rule: When someone needs urgent first aid or medical care and professional help is unavailable, do not refuse to help; explain emergency stabilization clearly, state red-flag warning signs, and advise seeking professional medical care as soon as possible.
- Never invent dosages, toxic plant identifications, radio frequencies, or chemical ratios when unsure. State what you are uncertain about instead of guessing.
- Structure answers clearly for stressed readers using short steps, bullet lists, and warnings first."#;

pub const LIBRARY_PROMPT: &str = r#"You have an offline reference library (installed ZIM archives and the user's personal files). Always check relevant references before giving factual technical, medical, botanical, mechanical, or procedural advice."#;

pub const RULES: &str = r#"Tool & citation rules:
- Use `search_library` with short, focused keywords (2-4 words) to find relevant articles or personal files.
- Use `read_article` with a passage ID (e.g. `zim_passage://...` or `myfile://...`) when a snippet looks incomplete or cuts off mid-step.
- Use `show_article` if the user wants to open/read a full source in the reader drawer.
- Only cite sources you actually retrieved or read in this conversation. Never fabricate titles, URLs, or passage IDs.
- End factual answers that used the library with a `Sources:` section listing only the exact retrieved sources you relied on."#;

pub const FINAL_NUDGE: &str = "You have used the maximum number of tool calls. Write the clearest, most complete answer possible now using the retrieved passages and your verified safety knowledge.";

pub const THINK_NUDGE: &str = "You have reached the thinking budget. Stop reasoning and write your final, clear response for the user now.";

pub const RESCUE_NOTE: &str = "\n\nNote: Retrieved reference passages are attached below for context. Answer the user's question directly and cite only the sources provided.";

pub const MEMORY_CHECK_PROMPT: &str = r#"Review the user's latest message and your existing Memory notes. Decide whether to remember, change, or forget persistent facts about the user (allergies, medical conditions, medications, household members/pets, location/climate, equipment/supplies, skills, preferences).
Only store durable personal facts — NEVER store temporary chat questions or assistant instructions.
Output ONLY a valid JSON object with this exact shape:
{
  "forget": ["existing note text to delete"],
  "change": [{"old": "existing note text", "new": "updated note text"}],
  "remember": ["concise third-person or bullet note ending with a period."]
}
If nothing should change, output: {"forget": [], "change": [], "remember": []}"#;

/// Map reasoning budget key -> soft character/token cap for `<think>` content (`None` = unlimited, `Some(0)` = off).
pub fn reasoning_budget_tokens(key: &str) -> Option<usize> {
    match key.trim().to_ascii_lowercase().as_str() {
        "off" => Some(0),
        "short" => Some(1024),
        "medium" | "" => Some(4096),
        "long" => Some(16384),
        "none" | "unlimited" => None,
        _ => Some(4096),
    }
}

/// Map length limit key -> max completion tokens (`None` = unlimited / server default).
pub fn length_limit_tokens(key: &str) -> Option<u32> {
    match key.trim().to_ascii_lowercase().as_str() {
        "short" => Some(2048),
        "normal" | "" => Some(8192),
        "long" => Some(32768),
        "none" | "unlimited" => None,
        _ => Some(8192),
    }
}

/// Heuristic: does the user message mention personal details, allergies, equipment, household, or ask to remember/forget?
pub fn has_about_them(text: &str) -> bool {
    let lower = text.to_ascii_lowercase();
    let markers = [
        "i am ",
        "i'm ",
        "i have ",
        "i take ",
        "i use ",
        "i live ",
        "my ",
        "we have ",
        "we live ",
        "our ",
        "allergic",
        "allergy",
        "medication",
        "insulin",
        "epipen",
        "pregnant",
        "asthma",
        "diabetes",
        "remember ",
        "forget ",
        "don't forget",
        "generator",
        "filter",
        "husband",
        "wife",
        "partner",
        "daughter",
        "son",
        "child",
        "baby",
        "dog",
        "cat",
        // Persian equivalents so bilingual users also get personal memory detection
        "من ",
        "دارم",
        "حساسیت",
        "دارو",
        "یادت باشه",
        "به یاد بسپار",
        "فراموش کن",
    ];
    markers.iter().any(|m| lower.contains(m))
}

/// Tool definitions passed to chat completions when Offline Library RAG is enabled.
pub fn survival_tool_defs() -> Vec<Value> {
    vec![
        json!({
            "type": "function",
            "function": {
                "name": "search_library",
                "description": "Search installed offline ZIM archives and the user's personal files using keywords. Returns top matching passage snippets with IDs.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "2 to 5 focused keywords for full-text search."
                        }
                    },
                    "required": ["query"]
                }
            }
        }),
        json!({
            "type": "function",
            "function": {
                "name": "read_article",
                "description": "Read the full passage and surrounding context for a retrieved passage ID from search_library.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "id": {
                            "type": "string",
                            "description": "The exact passage/source ID returned by search_library."
                        }
                    },
                    "required": ["id"]
                }
            }
        }),
        json!({
            "type": "function",
            "function": {
                "name": "show_article",
                "description": "Mark a retrieved article or personal file to be highlighted and opened in the user's offline reader drawer.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "id": {
                            "type": "string",
                            "description": "The exact passage/source ID returned by search_library or read_article."
                        }
                    },
                    "required": ["id"]
                }
            }
        }),
    ]
}
