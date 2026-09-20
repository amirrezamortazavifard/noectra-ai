import { CanvasCard } from '@/components/PdfReader/types';

/**
 * Helper to call the app's /api/chat endpoint for targeted note transformations
 */
async function callChatCompletion(prompt: string): Promise<string> {
  const chatModel = localStorage.getItem('chatModelKey');
  const chatModelProvider = localStorage.getItem('chatModelProviderId');

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: prompt,
      message: {
        messageId: Date.now().toString(),
        chatId: 'pdf-note-inline-helper',
        content: prompt,
      },
      chatId: 'pdf-note-inline-helper',
      history: [],
      chatModel: {
        providerId: chatModelProvider,
        key: chatModel,
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`AI Service error: ${res.statusText}`);
  }

  if (!res.body) {
    const json = await res.json().catch(() => null);
    return json?.data || json?.content || '';
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let result = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const data = JSON.parse(line);
        if (data.type === 'message' && data.data) {
          result += data.data;
        }
      } catch {
        result += line;
      }
    }
  }

  return result.trim();
}

/**
 * Summarize a highlighted quote + note into a punchy 1-2 sentence takeaway
 */
export async function summarizeNote(quote: string, currentNote?: string): Promise<string> {
  const prompt = `You are an expert academic research assistant. Summarize the following excerpt and user thoughts into a punchy, highly insightful 1-2 sentence key takeaway for study notes.

Excerpt: "${quote}"
${currentNote ? `User Note: "${currentNote}"` : ''}

Output ONLY the distilled 1-2 sentence summary, without preamble or conversational filler.`;

  return await callChatCompletion(prompt);
}

/**
 * Extract the key concept or technical definition from an excerpt
 */
export async function extractConcept(quote: string): Promise<string> {
  const prompt = `You are an expert academic research assistant. Identify and define the single most important concept, methodology, or term described in this excerpt.

Excerpt: "${quote}"

Format your output strictly as:
**[Concept Name]**: [Concise 1-2 sentence definition and its significance].
Do not include any conversational filler.`;

  return await callChatCompletion(prompt);
}

/**
 * Synthesize multiple canvas cards and notes into an executive study guide / literature review
 */
export async function synthesizeCards(cards: CanvasCard[], documentTitle?: string): Promise<string> {
  const cardsText = cards
    .map(
      (c, idx) =>
        `### Note ${idx + 1} (${c.type.toUpperCase()}) - Page ${c.pageNumber || 'N/A'}\n` +
        (c.quote ? `> "${c.quote}"\n\n` : '') +
        (c.content ? `**Analysis/Note**: ${c.content}\n` : '') +
        (c.tags && c.tags.length ? `**Tags**: ${c.tags.join(', ')}\n` : '')
    )
    .join('\n---\n\n');

  const prompt = `You are an elite academic research assistant. Synthesize the following collection of notes, quotes, and research cards from the document "${documentTitle || 'Research Document'}" into a cohesive, structured study guide and literature review.

Include:
1. **Executive Thesis & Central Themes**
2. **Core Methodologies & Empirical Findings** (cite page numbers where notes originated)
3. **Open Questions & Future Research Implications**
4. **Actionable Takeaways**

Here are the collected notes:
${cardsText}

Produce a well-structured, publication-grade Markdown synthesis.`;

  return await callChatCompletion(prompt);
}
