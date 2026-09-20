import { ParagraphTranslation, DictionaryLookupResult } from '@/components/PdfReader/types';

export type TranslationEngine = 'ai' | 'google';

const LANGUAGE_CODE_MAP: Record<string, string> = {
  Persian: 'fa',
  Spanish: 'es',
  French: 'fr',
  German: 'de',
  Chinese: 'zh-CN',
  Arabic: 'ar',
  Turkish: 'tr',
  Russian: 'ru',
  English: 'en',
  Italian: 'it',
  Japanese: 'ja',
  Korean: 'ko',
};

/**
 * Translate a single text string using Google Translate API
 */
export async function translateWithGoogle(
  text: string,
  targetLang: string = 'Persian'
): Promise<string> {
  const targetCode = LANGUAGE_CODE_MAP[targetLang] || targetLang.toLowerCase().slice(0, 2) || 'fa';
  const clean = text.trim();
  if (!clean) return '';

  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetCode}&dt=t&q=${encodeURIComponent(clean)}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Google Translate error: ${res.statusText}`);
  }

  const json = await res.json();
  if (!Array.isArray(json) || !Array.isArray(json[0])) {
    return clean;
  }

  return json[0]
    .map((item: any) => (Array.isArray(item) && item[0] ? item[0] : ''))
    .join('')
    .trim();
}

/**
 * Call the application's /api/chat endpoint
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
        chatId: 'bilingual-service-session',
        content: prompt,
      },
      chatId: 'bilingual-service-session',
      history: [],
      chatModel: {
        providerId: chatModelProvider,
        key: chatModel,
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Translation API error: ${res.statusText}`);
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
 * Translate an array of paragraphs from the current page into the target language.
 * Supports both AI Model (deep ISI context) and Google Translate (instant neural).
 */
export async function translatePageContent(
  paragraphs: string[],
  targetLang: string = 'Persian',
  docTitle?: string,
  engine: TranslationEngine = 'ai'
): Promise<ParagraphTranslation[]> {
  if (paragraphs.length === 0) return [];

  // 1. Google Translate engine (Instant parallel execution)
  if (engine === 'google') {
    try {
      const translatedList = await Promise.all(
        paragraphs.map(async (p, idx) => {
          try {
            const translated = await translateWithGoogle(p, targetLang);
            return {
              id: `para-${idx}`,
              index: idx + 1,
              original: p,
              translated: translated || p,
            };
          } catch {
            return {
              id: `para-${idx}`,
              index: idx + 1,
              original: p,
              translated: p,
            };
          }
        })
      );
      return translatedList;
    } catch (err) {
      console.warn('Google Translate batch failed, falling back to AI model:', err);
    }
  }

  // 2. AI Model engine (Academic translation)
  const numberedText = paragraphs
    .map((p, idx) => `[P${idx + 1}] ${p.trim()}`)
    .join('\n\n');

  const prompt = `You are an elite academic translator specializing in scientific literature. Translate the following numbered paragraphs into natural, highly fluent, publication-grade ${targetLang}.
Preserve technical accuracy and academic tone. Maintain the numbering format strictly.

${docTitle ? `Document Title: "${docTitle}"\n` : ''}
Input Paragraphs:
${numberedText}

Format your output strictly with matching tags for each paragraph:
[P1] Translation here...
[P2] Translation here...
Do not include any conversational preamble or outro.`;

  const rawOutput = await callChatCompletion(prompt);

  const results: ParagraphTranslation[] = [];
  const lines = rawOutput.split(/\[P\d+\]/i);

  // If regex splitting matched properly
  if (lines.length > 1) {
    for (let i = 0; i < paragraphs.length; i++) {
      const translatedChunk = lines[i + 1]?.trim() || '';
      results.push({
        id: `para-${i}`,
        index: i + 1,
        original: paragraphs[i],
        translated: translatedChunk || paragraphs[i],
      });
    }
  } else {
    // Fallback: split by double newlines
    const fallbackLines = rawOutput
      .split('\n\n')
      .map((l) => l.replace(/^\[P\d+\]\s*/i, '').trim())
      .filter(Boolean);

    for (let i = 0; i < paragraphs.length; i++) {
      results.push({
        id: `para-${i}`,
        index: i + 1,
        original: paragraphs[i],
        translated: fallbackLines[i] || rawOutput || paragraphs[i],
      });
    }
  }

  return results;
}

/**
 * Look up an academic term in the context of its sentence.
 * Supports both AI Model (deep concept analysis) and Google Translate (instant).
 */
export async function lookupAcademicTerm(
  term: string,
  contextSentence: string,
  docTitle?: string,
  targetLang: string = 'Persian',
  engine: TranslationEngine = 'ai'
): Promise<DictionaryLookupResult> {
  const cleanTerm = term.trim().replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '');

  // 1. Google Translate engine (Instant term + context translation)
  if (engine === 'google') {
    try {
      const [transTerm, transContext] = await Promise.all([
        translateWithGoogle(cleanTerm, targetLang),
        contextSentence ? translateWithGoogle(contextSentence, targetLang) : Promise.resolve(''),
      ]);

      return {
        term: cleanTerm,
        partOfSpeech: 'term',
        definition: `Google Translation: ${transTerm}`,
        translation: transTerm,
        academicContext: transContext ? `Sentence Translation: "${transContext}"` : undefined,
      };
    } catch (err) {
      console.warn('Google Translate term lookup failed, falling back to AI model:', err);
    }
  }

  // 2. AI Model engine (Full domain dictionary analysis)
  const prompt = `You are an expert academic dictionary and linguistic specialist. Analyze the following term in the specific domain context of this academic paper sentence:

Term: "${cleanTerm}"
Sentence Context: "${contextSentence.slice(0, 300)}"
${docTitle ? `Document: "${docTitle}"` : ''}
Target Translation Language: "${targetLang}"

Provide a JSON object strictly formatted as:
{
  "term": "${cleanTerm}",
  "phonetic": "/.../ or phonetic approximation",
  "partOfSpeech": "noun / verb / adjective / technical term",
  "definition": "Precise, concise academic definition in English (1-2 sentences)",
  "translation": "Natural, accurate translation and brief explanation in ${targetLang}",
  "academicContext": "How this concept is specifically applied in the context of this paper"
}

Do NOT wrap in markdown backticks other than raw json. Respond strictly with valid JSON.`;

  const raw = await callChatCompletion(prompt);
  let cleaned = raw.trim();

  // Strip potential markdown code fences
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  try {
    const parsed = JSON.parse(cleaned);
    return {
      term: parsed.term || cleanTerm,
      phonetic: parsed.phonetic,
      partOfSpeech: parsed.partOfSpeech || 'term',
      definition: parsed.definition || 'Academic concept in scientific literature.',
      translation: parsed.translation || cleanTerm,
      academicContext: parsed.academicContext,
    };
  } catch {
    // Fallback if model didn't return perfect JSON
    return {
      term: cleanTerm,
      partOfSpeech: 'term',
      definition: raw.slice(0, 160),
      translation: cleanTerm,
      academicContext: 'Used in this research document.',
    };
  }
}

/**
 * Native Speech Synthesis pronunciation helper
 */
export function speakTerm(text: string): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }
}
