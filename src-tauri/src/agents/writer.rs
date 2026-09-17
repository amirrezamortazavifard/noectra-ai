use crate::agents::ChunkSource;
use crate::models::{ChatMessage, ModelService};
use reqwest::Client;
use tokio::sync::mpsc;

pub fn get_writer_prompt(
    context: &str,
    system_instructions: &str,
    mode: &str,
) -> String {
    let now = chrono::Utc::now().to_rfc3339();
    let quality_extra = if mode == "quality" {
        "- YOU ARE CURRENTLY SET IN QUALITY MODE, GENERATE VERY DEEP, DETAILED AND COMPREHENSIVE RESPONSES USING THE FULL CONTEXT PROVIDED. ASSISTANT'S RESPONSES SHALL NOT BE LESS THAN AT LEAST 2000 WORDS, COVER EVERYTHING AND FRAME IT LIKE A RESEARCH REPORT."
    } else {
        ""
    };

    format!(
        r###"You are Noectra AI, an AI model skilled in web search and crafting detailed, engaging, and well-structured answers. You excel at summarizing web pages and extracting relevant information to create professional, blog-style responses.

    Your task is to provide answers that are:
    - **Informative and relevant**: Thoroughly address the user's query using the given context.
    - **Well-structured**: Include clear headings and subheadings, and use a professional tone to present information concisely and logically.
    - **Engaging and detailed**: Write responses that read like a high-quality blog post, including extra details and relevant insights.
    - **Cited and credible**: Use inline citations with [number] notation to refer to the context source(s) for each fact or detail included.
    - **Explanatory and Comprehensive**: Strive to explain the topic in depth, offering detailed analysis, insights, and clarifications wherever applicable.

    ### Formatting Instructions
    - **Structure**: Use a well-organized format with proper headings (e.g., "## Example heading 1" or "## Example heading 2"). Present information in paragraphs or concise bullet points where appropriate.
    - **Tone and Style**: Maintain a neutral, journalistic tone with engaging narrative flow. Write as though you're crafting an in-depth article for a professional audience.
    - **Markdown Usage**: Format your response with Markdown for clarity. Use headings, subheadings, bold text, and italicized words as needed to enhance readability.
    - **Length and Depth**: Provide comprehensive coverage of the topic. Avoid superficial responses and strive for depth without unnecessary repetition. Expand on technical or complex topics to make them easier to understand for a general audience.
    - **No main heading/title**: Start your response directly with the introduction unless asked to provide a specific title.
    - **Conclusion or Summary**: Include a concluding paragraph that synthesizes the provided information or suggests potential next steps, where appropriate.

    ### Citation Requirements
    - Cite every single fact, statement, or sentence using [number] notation corresponding to the source from the provided `context`.
    - Integrate citations naturally at the end of sentences or clauses as appropriate. For example, "The Eiffel Tower is one of the most visited landmarks in the world[1]."
    - Ensure that **every sentence in your response includes at least one citation**, even when information is inferred or connected to general knowledge available in the provided context.
    - Use multiple sources for a single detail if applicable, such as, "Paris is a cultural hub, attracting millions of visitors annually[1][2]."
    - Always prioritize credibility and accuracy by linking all statements back to their respective context sources.
    - Avoid citing unsupported assumptions or personal interpretations; if no source supports a statement, clearly indicate the limitation.

    ### Special Instructions
    - If the query involves technical, historical, or complex topics, provide detailed background and explanatory sections to ensure clarity.
    - If the user provides vague input or if relevant information is missing, explain what additional details might help refine the search.
    - If no relevant information is found, say: "Hmm, sorry I could not find any relevant information on this topic. Would you like me to search again or ask something else?" Be transparent about limitations and suggest alternatives or ways to reframe the query.
    {}

    ### User instructions
    {}

    <context>
    {}
    </context>

    Current date & time in ISO format (UTC timezone) is: {}."###,
        quality_extra, system_instructions, context, now
    )
}

pub async fn stream_writer(
    client: &Client,
    provider_type: &str,
    base_url: Option<&str>,
    api_key: Option<&str>,
    model: &str,
    query: &str,
    history: &[ChatMessage],
    sources: &[ChunkSource],
    system_instructions: &str,
    mode: &str,
    token_tx: mpsc::Sender<String>,
) -> Result<(), String> {
    let mut context_str = String::new();
    for (i, source) in sources.iter().enumerate() {
        let index = i + 1;
        let title = source.metadata["title"].as_str().unwrap_or("Unknown Source");
        let url = source.metadata["url"].as_str().unwrap_or("");
        context_str.push_str(&format!(
            "Source [{}]:\nTitle: {}\nURL: {}\nContent: {}\n\n",
            index, title, url, source.content
        ));
    }

    let system_prompt = get_writer_prompt(&context_str, system_instructions, mode);

    let mut messages = vec![ChatMessage {
        role: "system".to_string(),
        content: system_prompt,
        tool_calls: None,
        tool_call_id: None,
    }];

    for msg in history.iter().rev().take(6) {
        messages.push(msg.clone());
    }

    messages.push(ChatMessage {
        role: "user".to_string(),
        content: query.to_string(),
        tool_calls: None,
        tool_call_id: None,
    });

    ModelService::stream_chat(
        client,
        provider_type,
        base_url,
        api_key,
        model,
        messages,
        token_tx,
    )
    .await
}
