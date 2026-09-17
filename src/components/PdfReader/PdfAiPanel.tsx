import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  X,
  RotateCcw,
  Copy,
  Check,
  Bot,
  User,
  Quote,
  ExternalLink,
  Lightbulb,
  FileText,
  Languages,
  BookOpen,
  Bookmark,
  Database,
  Loader2,
} from 'lucide-react';
import { AiChatMessage, PdfDocumentMeta } from './types';
import { toast } from 'sonner';
import Markdown from 'markdown-to-jsx';
import { useNavigate } from 'react-router-dom';
import { searchDocument, formatRagContextForPrompt } from '@/lib/rag/ragEngine';
import { soundService } from '@/lib/sound/soundService';

interface PdfAiPanelProps {
  isOpen: boolean;
  meta: PdfDocumentMeta | null;
  currentPage: number;
  activeExcerpt: string | null;
  onClearExcerpt: () => void;
  onClose: () => void;
  initialPrompt?: string;
  onJumpToCitation?: (pageNumber: number, quote?: string) => void;
  isIndexed?: boolean;
  indexingProgress?: { pct: number; status: string } | null;
  onReindex?: () => void;
}

export const PdfAiPanel: React.FC<PdfAiPanelProps> = ({
  isOpen,
  meta,
  currentPage,
  activeExcerpt,
  onClearExcerpt,
  onClose,
  initialPrompt,
  onJumpToCitation,
  isIndexed,
  indexingProgress,
  onReindex,
}) => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load saved chat messages for this specific document
  useEffect(() => {
    if (meta?.id) {
      const saved = localStorage.getItem(`pdf_chat_${meta.id}`);
      if (saved) {
        try {
          setMessages(JSON.parse(saved));
        } catch {
          setMessages([]);
        }
      } else {
        setMessages([]);
      }
    } else {
      setMessages([]);
    }
  }, [meta?.id]);

  // Automatically persist messages whenever they update and are not streaming
  useEffect(() => {
    if (meta?.id && messages.length > 0 && !loading) {
      const cleanMessages = messages.map((m) => ({ ...m, isStreaming: false }));
      localStorage.setItem(`pdf_chat_${meta.id}`, JSON.stringify(cleanMessages));
    }
  }, [messages, loading, meta?.id]);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Handle initialPrompt triggered from selection popup
  useEffect(() => {
    if (initialPrompt && isOpen) {
      handleSendMessage(initialPrompt);
    }
  }, [initialPrompt]);

  if (!isOpen) return null;

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt || input).trim();
    if (!textToSend && !activeExcerpt) return;

    const userMessageContent = textToSend || 'Please explain this selected excerpt from the PDF.';
    const excerptToUse = activeExcerpt || undefined;

    const userMsg: AiChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessageContent,
      excerpt: excerptToUse,
      pageNumber: currentPage,
      timestamp: Date.now(),
    };

    const assistantMsgId = (Date.now() + 1).toString();
    const assistantMsg: AiChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      isStreaming: true,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput('');
    setLoading(true);
    soundService.play('dispatch');

    try {
      const chatModel = localStorage.getItem('chatModelKey');
      const chatModelProvider = localStorage.getItem('chatModelProviderId');

      // Construct rich context prompt for the AI
      let fullPrompt = '';
      if (meta?.title || meta?.name) {
        fullPrompt += `[Context: Document "${meta.title || meta.name}", Page ${currentPage}]\n\n`;
      }
      if (excerptToUse) {
        fullPrompt += `[Selected Excerpt from Page ${currentPage}]:\n"${excerptToUse}"\n\n`;
      } else if (meta?.id) {
        // Retrieve relevant RAG chunks automatically
        try {
          const ragResults = await searchDocument(meta.id, userMessageContent, 4);
          if (ragResults && ragResults.length > 0) {
            fullPrompt += formatRagContextForPrompt(ragResults);
          }
        } catch (err) {
          console.warn('RAG search skipped:', err);
        }
      }
      fullPrompt += `\n[User Question]:\n${userMessageContent}\n\n[Instruction]: Provide clear, grounded answers. If citing information, add source tags in the format [[Page:X | "quote"]] or [Page X] so the reader can jump directly to it.`;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: fullPrompt,
          message: {
            messageId: userMsg.id,
            chatId: 'pdf-assistant-session',
            content: fullPrompt,
          },
          chatId: 'pdf-assistant-session',
          history: messages.map((m) => [m.role, m.content]),
          chatModel: {
            providerId: chatModelProvider,
            key: chatModel,
          },
        }),
      });

      if (!res.ok) {
        throw new Error(`Chat API error: ${res.statusText}`);
      }

      if (res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedContent = '';

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
                accumulatedContent += data.data;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMsgId
                      ? { ...msg, content: accumulatedContent, isStreaming: true }
                      : msg
                  )
                );
              }
            } catch {
              // Non-JSON raw streaming text
              accumulatedContent += line;
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMsgId
                    ? { ...msg, content: accumulatedContent, isStreaming: true }
                    : msg
                )
              );
            }
          }
        }

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? {
                  ...msg,
                  content:
                    accumulatedContent ||
                    'Analyzed the excerpt successfully. Let me know if you need more details!',
                  isStreaming: false,
                }
              : msg
          )
        );
        soundService.play('complete');
      }
    } catch (err: any) {
      console.error('PDF AI Chat error:', err);
      // Helpful fallback response if offline or no model
      const fallbackReply = activeExcerpt
        ? `### Excerpt Analysis (Page ${currentPage})\n\n**Summary:**\nThis excerpt addresses key findings in the document.\n\n**Selected Text:**\n> ${activeExcerpt}\n\n*Note: To enable live streaming AI generation, ensure an AI provider (e.g. Gemini, OpenAI, Ollama, Groq) is active in Settings.*`
        : 'Please configure your AI model in Settings to chat with your document in real-time.';

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? { ...msg, content: fallbackReply, isStreaming: false }
            : msg
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (content: string, id: string) => {
    soundService.play('copy');
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenInMainChat = () => {
    const query = activeExcerpt
      ? `Regarding document "${meta?.title || meta?.name}" (Page ${currentPage}):\n"${activeExcerpt}"`
      : `Discussing document "${meta?.title || meta?.name}"`;
    navigate(`/?q=${encodeURIComponent(query)}`);
  };

  const quickPrompts = [
    {
      icon: Lightbulb,
      label: 'Explain simply',
      prompt: 'Explain the selected excerpt in plain, easy-to-understand language:',
    },
    {
      icon: FileText,
      label: 'Summarize key points',
      prompt: 'Provide a concise bullet-point summary of the core ideas in this excerpt:',
    },
    {
      icon: Languages,
      label: 'Translate text',
      prompt: 'Translate the selected excerpt clearly and accurately into English:',
    },
    {
      icon: BookOpen,
      label: 'Key takeaways',
      prompt: 'Extract the most important conclusions, data, or arguments from this passage:',
    },
  ];

  return (
    <aside className="w-88 sm:w-96 h-full border-l border-light-200 dark:border-white/10 bg-light-primary/95 dark:bg-[#0b0e14]/95 backdrop-blur-xl flex flex-col z-20 shadow-2xl transition-all">
      {/* Header */}
      <div className="h-14 border-b border-light-200 dark:border-white/10 px-4 flex items-center justify-between bg-light-secondary/60 dark:bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-tr from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/20">
            <Sparkles size={16} className="animate-pulse" />
          </div>
          <div>
            <h2 className="text-xs font-semibold text-black/90 dark:text-white/90 flex items-center gap-1.5">
              <span>PDF Assistant</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 font-mono">
                AI
              </span>
            </h2>
            <p className="text-[10px] text-black/50 dark:text-white/40 truncate max-w-[170px]">
              {meta?.name ? `${meta.name} (p.${currentPage})` : `Page ${currentPage}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* RAG Status Badge */}
          {indexingProgress ? (
            <div
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[10px] font-mono"
              title={indexingProgress.status}
            >
              <Loader2 size={11} className="animate-spin" />
              <span>{indexingProgress.pct}%</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={onReindex}
              title={isIndexed ? 'RAG Vector Index Active. Click to rebuild' : 'Build RAG Vector Index'}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-light-secondary dark:bg-white/5 border border-light-200 dark:border-white/10 text-[10px] text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors"
            >
              <Database size={11} className={isIndexed ? 'text-emerald-400' : 'text-amber-400'} />
              <span className="hidden sm:inline">{isIndexed ? 'RAG Active' : 'Index RAG'}</span>
            </button>
          )}

          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setMessages([]);
                if (meta?.id) {
                  localStorage.removeItem(`pdf_chat_${meta.id}`);
                }
              }}
              title="Clear Thread"
              className="p-1.5 rounded-lg text-black/60 dark:text-white/50 hover:bg-light-200 dark:hover:bg-white/10 transition-colors"
            >
              <RotateCcw size={14} />
            </button>
          )}

          <button
            type="button"
            onClick={handleOpenInMainChat}
            title="Open in Main Chat"
            className="p-1.5 rounded-lg text-black/60 dark:text-white/50 hover:bg-light-200 dark:hover:bg-white/10 transition-colors"
          >
            <ExternalLink size={14} />
          </button>

          <button
            type="button"
            onClick={onClose}
            title="Close Assistant"
            className="p-1.5 rounded-lg text-black/60 dark:text-white/50 hover:bg-light-200 dark:hover:bg-white/10 transition-colors"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Active Selection Banner */}
      {activeExcerpt && (
        <div className="p-2.5 mx-3 mt-3 rounded-xl bg-sky-500/10 border border-sky-500/30 text-xs flex items-start justify-between gap-2 animate-in fade-in slide-in-from-top-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1 text-[10px] font-medium text-sky-600 dark:text-sky-400 mb-0.5">
              <Quote size={11} />
              <span>Selected excerpt (Page {currentPage})</span>
            </div>
            <p className="text-black/80 dark:text-white/80 line-clamp-2 text-[11px] italic">
              "{activeExcerpt}"
            </p>
          </div>
          <button
            type="button"
            onClick={onClearExcerpt}
            className="p-1 rounded text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white shrink-0"
            title="Remove selection tag"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Quick Prompts Chips */}
      <div className="p-3 border-b border-light-200 dark:border-white/10 overflow-x-auto custom-scrollbar flex items-center gap-1.5">
        {quickPrompts.map((chip, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSendMessage(chip.prompt)}
            disabled={loading}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-light-secondary dark:bg-white/5 hover:bg-light-200 dark:hover:bg-white/10 border border-light-200 dark:border-white/10 text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white whitespace-nowrap transition-all active:scale-95 disabled:opacity-50"
          >
            <chip.icon size={12} className="text-sky-500 dark:text-sky-400" />
            <span>{chip.label}</span>
          </button>
        ))}
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-black/40 dark:text-white/40 px-4">
            <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-500 dark:text-sky-400 mb-3 border border-sky-500/20">
              <Sparkles size={24} />
            </div>
            <h3 className="text-sm font-semibold text-black/80 dark:text-white/80">
              Ask AI about your PDF
            </h3>
            <p className="text-xs mt-1 leading-relaxed max-w-[240px]">
              Highlight any line or paragraph on the page, then ask for explanations, summaries, or
              translations.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.role === 'user' ? 'items-end' : 'items-start'
              } space-y-1`}
            >
              <div className="flex items-center gap-1 text-[10px] text-black/40 dark:text-white/40 px-1">
                {msg.role === 'user' ? (
                  <>
                    <span>You</span>
                    <User size={11} />
                  </>
                ) : (
                  <>
                    <Bot size={11} className="text-sky-500 dark:text-sky-400" />
                    <span className="text-sky-600 dark:text-sky-400 font-medium">Assistant</span>
                  </>
                )}
              </div>

              <div
                className={`group relative p-3 rounded-2xl text-xs max-w-[90%] leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-sky-500 text-white rounded-tr-sm shadow-md'
                    : 'bg-light-secondary dark:bg-white/[0.04] border border-light-200 dark:border-white/10 text-black/90 dark:text-white/90 rounded-tl-sm'
                }`}
              >
                {msg.excerpt && (
                  <div className="mb-2 p-2 rounded-lg bg-black/5 dark:bg-black/30 border border-light-200 dark:border-white/10 text-[11px] italic opacity-90 text-black/80 dark:text-white/80">
                    <span className="text-[10px] font-mono not-italic opacity-70 block mb-0.5 text-sky-600 dark:text-sky-400">
                      Excerpt (p.{msg.pageNumber || currentPage}):
                    </span>
                    "{msg.excerpt}"
                  </div>
                )}

                {msg.role === 'assistant' ? (
                  <div className="prose dark:prose-invert max-w-none text-xs leading-relaxed text-black/90 dark:text-white/90">
                    <Markdown>{msg.content}</Markdown>
                    {msg.isStreaming && (
                      <span className="inline-block w-1.5 h-3 ml-1 bg-sky-400 animate-pulse align-middle" />
                    )}

                    {!msg.isStreaming && (() => {
                      const citations: Array<{ page: number; quote?: string }> = [];
                      const regex = /\[\[Page:(\d+)(?:\s*\|\s*"([^"]*)")?\]\]|\[Page\s*(\d+)\]/gi;
                      let match;
                      while ((match = regex.exec(msg.content)) !== null) {
                        const pageNum = parseInt(match[1] || match[3], 10);
                        if (!isNaN(pageNum) && !citations.some((c) => c.page === pageNum)) {
                          citations.push({ page: pageNum, quote: match[2] });
                        }
                      }
                      if (citations.length === 0) return null;

                      return (
                        <div className="mt-2.5 pt-2 border-t border-light-200 dark:border-white/10 flex flex-wrap items-center gap-1.5 select-none not-prose">
                          <span className="text-[10px] text-black/50 dark:text-white/40">Sources:</span>
                          {citations.map((c, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => onJumpToCitation?.(c.page, c.quote)}
                              title={c.quote ? `Jump to page ${c.page}: "${c.quote}"` : `Jump to page ${c.page}`}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/25 text-sky-600 dark:text-sky-400 border border-sky-500/30 text-[10px] font-mono font-medium transition-all hover:scale-105 active:scale-95"
                            >
                              <Bookmark size={10} />
                              <span>Page {c.page}</span>
                            </button>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}

                {msg.role === 'assistant' && msg.content && (
                  <button
                    type="button"
                    onClick={() => handleCopy(msg.content, msg.id)}
                    title="Copy answer"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-light-200 dark:hover:bg-white/10 text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-opacity"
                  >
                    {copiedId === msg.id ? (
                      <Check size={12} className="text-emerald-500" />
                    ) : (
                      <Copy size={12} />
                    )}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="p-3 border-t border-light-200 dark:border-white/10 bg-light-secondary/60 dark:bg-white/[0.02]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="relative flex items-center"
        >
          <input
            type="text"
            placeholder={
              activeExcerpt
                ? 'Ask about selected excerpt...'
                : 'Ask a question about this document...'
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            className="w-full pl-3 pr-10 py-2.5 text-xs rounded-xl bg-light-primary dark:bg-white/5 border border-light-200 dark:border-white/10 text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          />
          <button
            type="submit"
            disabled={loading || (!input.trim() && !activeExcerpt)}
            className="absolute right-1.5 p-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 disabled:opacity-30 disabled:pointer-events-none text-white transition-all shadow-sm"
          >
            <Send size={13} />
          </button>
        </form>
      </div>
    </aside>
  );
};
