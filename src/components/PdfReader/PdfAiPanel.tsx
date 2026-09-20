import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  Lightbulb,
  FileText,
  Languages,
  BookOpen,
  Plus,
  History,
  Trash2,
  Download,
  Brain,
  Layers,
  ChevronDown,
  Search,
  Volume2,
  VolumeX,
  AlertTriangle,
  Play,
  Loader2,
} from 'lucide-react';
import { AiChatMessage, PdfDocumentMeta, PdfChatSession } from './types';
import { MinimalProvider } from '@/lib/models/types';
import { toast } from 'sonner';
import Markdown from 'markdown-to-jsx';
import { searchDocument, formatRagContextForPrompt } from '@/lib/rag/ragEngine';
import { soundService } from '@/lib/sound/soundService';
import ThinkBox from '@/components/ThinkBox';
import ModelProviderIcon from '@/components/ui/ModelProviderIcon';

interface PdfAiPanelProps {
  isOpen: boolean;
  meta: PdfDocumentMeta | null;
  currentPage: number;
  pageText?: string;
  activeExcerpt: string | null;
  onClearExcerpt: () => void;
  onClose?: () => void;
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
  pageText = '',
  activeExcerpt,
  onClearExcerpt,
  onClose,
  initialPrompt,
  onJumpToCitation,
  isIndexed,
  indexingProgress,
  onReindex,
}) => {
  // --- 1. Multi-Session History State ---
  const [sessions, setSessions] = useState<PdfChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState('');

  // --- 2. Model Selector State ---
  const [providers, setProviders] = useState<MinimalProvider[]>([]);
  const [selectedModel, setSelectedModel] = useState<{ providerId: string; key: string }>(() => {
    return {
      providerId: localStorage.getItem('chatModelProviderId') || 'google',
      key: localStorage.getItem('chatModelKey') || 'gemini-2.0-flash',
    };
  });
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [modelSearch, setModelSearch] = useState('');

  // 9Router awareness in PDF reader
  const selectedProvider = providers.find((p) => p.id === selectedModel.providerId);
  const is9RouterSelected =
    selectedProvider?.type === '9router' ||
    selectedProvider?.name.toLowerCase().includes('9router') ||
    (selectedProvider?.type === 'custom' &&
      (selectedProvider?.id.includes('9router') || (selectedProvider as any).baseUrl?.includes('20128')));

  const [nineRouterOnline, setNineRouterOnline] = useState<boolean | null>(null);
  const [isStarting9Router, setIsStarting9Router] = useState(false);

  const check9RouterStatus = async () => {
    try {
      const res = await fetch('/api/9router/status');
      if (res.ok) {
        const data = await res.json();
        setNineRouterOnline(Boolean(data.isRunning));
      }
    } catch {
      setNineRouterOnline(false);
    }
  };

  useEffect(() => {
    if (is9RouterSelected) {
      check9RouterStatus();
    }
  }, [is9RouterSelected]);

  const handleStart9Router = async () => {
    setIsStarting9Router(true);
    try {
      const res = await fetch('/api/9router/start', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || '9Router started successfully!');
        setNineRouterOnline(true);
      } else {
        toast.error('Failed to start 9Router', {
          description: data.error || 'Please run "9router" in CMD.',
          duration: 8000,
        });
        setNineRouterOnline(false);
      }
    } catch (err: any) {
      toast.error('Error starting 9Router', { description: err.message });
      setNineRouterOnline(false);
    } finally {
      setIsStarting9Router(false);
    }
  };

  // --- 3. Deep Thinking & Scope State ---
  const [thinkingEnabled, setThinkingEnabled] = useState<boolean>(() => {
    return localStorage.getItem('pdf_thinking_enabled') === 'true';
  });
  const [scope, setScope] = useState<'page' | 'document'>('page');

  // --- 4. Input & Stream State ---
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const modelPickerRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);

  // Fetch available AI providers dynamically
  useEffect(() => {
    fetch('/api/providers')
      .then((res) => res.json())
      .then((data: { providers: MinimalProvider[] }) => {
        if (data?.providers) {
          setProviders(data.providers);
        }
      })
      .catch((err) => console.warn('Could not load AI providers in PdfAiPanel:', err));
  }, []);

  // Close popovers on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (modelPickerRef.current && !modelPickerRef.current.contains(target)) {
        setModelPickerOpen(false);
      }
      if (historyRef.current && !historyRef.current.contains(target)) {
        setHistoryOpen(false);
      }
    };
    if (modelPickerOpen || historyOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [modelPickerOpen, historyOpen]);

  // Load and migrate multi-session history for current document
  useEffect(() => {
    if (!meta?.id) {
      setSessions([]);
      setActiveSessionId('');
      return;
    }

    const storageKey = `pdf_sessions_${meta.id}`;
    const rawSessions = localStorage.getItem(storageKey);
    let loaded: PdfChatSession[] = [];

    if (rawSessions) {
      try {
        loaded = JSON.parse(rawSessions);
      } catch {
        loaded = [];
      }
    }

    // Auto-migrate legacy single-chat storage if present
    if (loaded.length === 0) {
      const legacyRaw = localStorage.getItem(`pdf_chat_${meta.id}`);
      let legacyMessages: AiChatMessage[] = [];
      if (legacyRaw) {
        try {
          legacyMessages = JSON.parse(legacyRaw);
        } catch {}
      }
      const initialSession: PdfChatSession = {
        id: `session_${Date.now()}`,
        documentId: meta.id,
        title: legacyMessages.length > 0 ? 'Initial Research Chat' : 'Session 1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: legacyMessages,
      };
      loaded = [initialSession];
      localStorage.setItem(storageKey, JSON.stringify(loaded));
    }

    setSessions(loaded);
    setActiveSessionId(loaded[0]?.id || '');
  }, [meta?.id]);

  // Current active session
  const activeSession = useMemo(() => {
    return sessions.find((s) => s.id === activeSessionId) || sessions[0] || null;
  }, [sessions, activeSessionId]);

  const messages = activeSession?.messages || [];

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Handle initialPrompt triggered from text selection popup
  useEffect(() => {
    if (initialPrompt && isOpen) {
      handleSendMessage(initialPrompt);
    }
  }, [initialPrompt, isOpen]);

  // Save session messages to state & localStorage
  const saveSessionMessages = (newMessages: AiChatMessage[]) => {
    if (!meta?.id || !activeSessionId) return;

    setSessions((prevSessions) => {
      const updated = prevSessions.map((s) => {
        if (s.id === activeSessionId) {
          let title = s.title;
          if (s.title === 'Session 1' || s.title.startsWith('Session')) {
            const firstUser = newMessages.find((m) => m.role === 'user');
            if (firstUser) {
              title = firstUser.content.slice(0, 30) + (firstUser.content.length > 30 ? '...' : '');
            }
          }
          return {
            ...s,
            messages: newMessages.map((m) => ({ ...m, isStreaming: false })),
            updatedAt: Date.now(),
            title,
          };
        }
        return s;
      });
      localStorage.setItem(`pdf_sessions_${meta.id}`, JSON.stringify(updated));
      return updated;
    });
  };

  // Start a new research chat session
  const handleStartNewChat = () => {
    if (!meta?.id) return;
    const newSession: PdfChatSession = {
      id: `session_${Date.now()}`,
      documentId: meta.id,
      title: `Session ${sessions.length + 1}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
      scope,
      thinkingEnabled,
    };
    const updated = [newSession, ...sessions];
    setSessions(updated);
    setActiveSessionId(newSession.id);
    setHistoryOpen(false);
    localStorage.setItem(`pdf_sessions_${meta.id}`, JSON.stringify(updated));
    soundService.play('pop');
    toast.success('Started new research session');
  };

  // Delete a session
  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!meta?.id) return;
    let filtered = sessions.filter((s) => s.id !== sessionId);
    if (filtered.length === 0) {
      const fresh: PdfChatSession = {
        id: `session_${Date.now()}`,
        documentId: meta.id,
        title: 'Session 1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
      };
      filtered = [fresh];
    }
    setSessions(filtered);
    if (activeSessionId === sessionId) {
      setActiveSessionId(filtered[0].id);
    }
    localStorage.setItem(`pdf_sessions_${meta.id}`, JSON.stringify(filtered));
    toast.success('Deleted chat session');
  };

  // Export session to Markdown
  const handleExportSession = (session: PdfChatSession, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const docTitle = meta?.title || meta?.name || 'Document';
    let md = `# Research Chat: ${docTitle}\n\n`;
    md += `- **Session:** ${session.title}\n`;
    md += `- **Created:** ${new Date(session.createdAt).toLocaleString()}\n`;
    md += `- **Messages:** ${session.messages.length}\n\n---\n\n`;

    for (const msg of session.messages) {
      if (msg.role === 'user') {
        md += `### 👤 Question (Page ${msg.pageNumber || '?'})\n\n`;
        if (msg.excerpt) {
          md += `> **Referenced Excerpt:**\n> "${msg.excerpt}"\n\n`;
        }
        md += `${msg.content}\n\n`;
      } else {
        md += `### 🤖 Assistant\n\n`;
        if (msg.thinking) {
          md += `<details><summary>Thinking Process</summary>\n\n${msg.thinking}\n\n</details>\n\n`;
        }
        md += `${msg.content}\n\n---\n\n`;
      }
    }

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(meta?.name || 'document').replace(/\.[^/.]+$/, '')}_${session.title.replace(/[^a-zA-Z0-9]/g, '_')}.md`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Exported to Markdown');
  };

  // Select AI Model
  const handleSelectModel = (providerId: string, modelKey: string) => {
    setSelectedModel({ providerId, key: modelKey });
    localStorage.setItem('chatModelProviderId', providerId);
    localStorage.setItem('chatModelKey', modelKey);
    setModelPickerOpen(false);
    soundService.play('tick');
    toast.success(`Active Model: ${modelKey}`);
  };

  // Active Model Name Display
  const currentModelDisplayName = useMemo(() => {
    const p = providers.find((prov) => prov.id === selectedModel.providerId);
    const m = p?.chatModels?.find((mod) => mod.key === selectedModel.key);
    return m?.name || selectedModel.key;
  }, [providers, selectedModel]);

  // Send Message Logic with Deep Thinking & Grounding
  const handleSendMessage = async (customPrompt?: string) => {
    if (is9RouterSelected && nineRouterOnline === false) {
      toast.warning('9Router service is offline', {
        description: 'Please click "Start 9Router" to launch the gateway before sending prompts.',
        action: {
          label: 'Start Now',
          onClick: () => handleStart9Router(),
        },
      });
      return;
    }

    const textToSend = (customPrompt || input).trim();
    if (!textToSend && !activeExcerpt) return;

    const userMessageContent = textToSend || 'Please analyze the referenced excerpt from the PDF.';
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
      thinking: '',
      thinkingEnded: false,
      isStreaming: true,
      modelName: currentModelDisplayName,
      timestamp: Date.now(),
    };

    const nextMessages = [...messages, userMsg, assistantMsg];
    saveSessionMessages(nextMessages);
    setInput('');
    setLoading(true);
    soundService.play('dispatch');

    try {
      // 1. Context Construction
      let fullPrompt = '';
      if (meta?.title || meta?.name) {
        fullPrompt += `[Context: Document "${meta.title || meta.name}", Page ${currentPage} of ${meta.pageCount || 1}]\n\n`;
      }

      if (excerptToUse) {
        fullPrompt += `[Focused Selected Excerpt from Page ${currentPage}]:\n"${excerptToUse}"\n\n`;
      }

      if (scope === 'page' && pageText) {
        fullPrompt += `[Full Text of Current Page ${currentPage}]:\n${pageText.slice(0, 3000)}\n\n`;
      } else if (scope === 'document' && meta?.id) {
        try {
          const ragResults = await searchDocument(meta.id, userMessageContent, 5);
          if (ragResults && ragResults.length > 0) {
            fullPrompt += formatRagContextForPrompt(ragResults);
          }
        } catch (err) {
          console.warn('RAG vector retrieval skipped:', err);
        }
      }

      // 2. Deep Thinking / Reasoning Instruction
      if (thinkingEnabled) {
        fullPrompt += `[Instruction: Perform deep, rigorous chain-of-thought analysis. Enclose your internal reasoning and step-by-step thinking process inside <think>...</think> tags before providing your final response.]\n\n`;
      }

      fullPrompt += `[User Query]:\n${userMessageContent}\n\n[Instruction]: Provide clear, grounded academic answers. Cite specific pages in the format [Page X] or [[Page:X | "exact quote"]] whenever referencing document claims.`;

      // 3. API Execution
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: fullPrompt,
          message: {
            messageId: userMsg.id,
            chatId: activeSessionId,
            content: fullPrompt,
          },
          chatId: activeSessionId,
          history: messages.slice(-8).map((m) => [m.role, m.content]),
          chatModel: {
            providerId: selectedModel.providerId,
            key: selectedModel.key,
          },
        }),
      });

      if (!res.ok) {
        throw new Error(`Chat request failed with status ${res.status}`);
      }

      if (res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedRaw = '';

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
                accumulatedRaw += data.data;
              }
            } catch {
              accumulatedRaw += line;
            }

            // Parse <think>...</think> and final answer
            let thinkText = '';
            let answerText = accumulatedRaw;
            let thinkingEnded = false;

            const thinkStart = accumulatedRaw.indexOf('<think>');
            const thinkEnd = accumulatedRaw.indexOf('</think>');

            if (thinkStart !== -1) {
              if (thinkEnd !== -1) {
                thinkText = accumulatedRaw.substring(thinkStart + 7, thinkEnd).trim();
                answerText = accumulatedRaw.substring(thinkEnd + 8).trim();
                thinkingEnded = true;
              } else {
                thinkText = accumulatedRaw.substring(thinkStart + 7).trim();
                answerText = '';
                thinkingEnded = false;
              }
            }

            setSessions((prev) =>
              prev.map((s) => {
                if (s.id === activeSessionId) {
                  return {
                    ...s,
                    messages: s.messages.map((m) =>
                      m.id === assistantMsgId
                        ? {
                            ...m,
                            content: answerText,
                            thinking: thinkText,
                            thinkingEnded,
                            isStreaming: true,
                          }
                        : m
                    ),
                  };
                }
                return s;
              })
            );
          }
        }

        // Finalize streaming
        let finalThink = '';
        let finalAnswer = accumulatedRaw;
        const thinkStart = accumulatedRaw.indexOf('<think>');
        const thinkEnd = accumulatedRaw.indexOf('</think>');
        if (thinkStart !== -1) {
          if (thinkEnd !== -1) {
            finalThink = accumulatedRaw.substring(thinkStart + 7, thinkEnd).trim();
            finalAnswer = accumulatedRaw.substring(thinkEnd + 8).trim();
          } else {
            finalThink = accumulatedRaw.substring(thinkStart + 7).trim();
            finalAnswer = 'Completed thinking.';
          }
        }

        const finalMessages = (activeSession?.messages || nextMessages).map((m) =>
          m.id === assistantMsgId
            ? {
                ...m,
                content: finalAnswer || 'Analysis complete.',
                thinking: finalThink,
                thinkingEnded: true,
                isStreaming: false,
              }
            : m
        );
        saveSessionMessages(finalMessages);
        soundService.play('complete');
      }
    } catch (err: any) {
      console.error('PDF AI Copilot error:', err);
      const fallbackMsg = `Could not reach ${selectedModel.key}. Please check your API key in Settings or ensure the model provider is operational.`;
      const fallbackMessages = nextMessages.map((m) =>
        m.id === assistantMsgId
          ? { ...m, content: fallbackMsg, isStreaming: false }
          : m
      );
      saveSessionMessages(fallbackMessages);
    } finally {
      setLoading(false);
    }
  };

  // Copy text helper
  const handleCopy = (content: string, id: string) => {
    soundService.play('copy');
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedId(null), 1800);
  };

  // Text to Speech (TTS) narration helper
  const handleToggleSpeak = (text: string, id: string) => {
    if (speakingMsgId === id) {
      window.speechSynthesis?.cancel();
      setSpeakingMsgId(null);
      return;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text.slice(0, 800));
      utterance.onend = () => setSpeakingMsgId(null);
      utterance.onerror = () => setSpeakingMsgId(null);
      setSpeakingMsgId(id);
      window.speechSynthesis.speak(utterance);
    } else {
      toast.error('Text-to-speech not supported in this environment');
    }
  };

  // Render clickable citation tags: e.g. [Page 4] or [[Page:4 | "quote"]]
  const renderMessageContent = (content: string) => {
    const citationRegex = /\[\[Page:(\d+)(?:\s*\|\s*"([^"]*)")?\]\]|\[Page\s+(\d+)\]/gi;

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = citationRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <Markdown key={`text-${lastIndex}`}>{content.substring(lastIndex, match.index)}</Markdown>
        );
      }

      const pageNum = parseInt(match[1] || match[3], 10);
      const quote = match[2] || undefined;

      parts.push(
        <button
          key={`cite-${match.index}`}
          type="button"
          onClick={() => onJumpToCitation?.(pageNum, quote)}
          title={`Jump to Page ${pageNum}${quote ? ` ("${quote}")` : ''}`}
          className="inline-flex items-center gap-1 px-1.5 py-0.2 mx-1 my-0.5 rounded-md bg-sky-500/15 hover:bg-sky-500/25 text-sky-600 dark:text-sky-400 font-mono text-[10.5px] font-semibold border border-sky-500/25 transition-all hover:scale-105 active:scale-95"
        >
          <span>Page {pageNum}</span>
        </button>
      );

      lastIndex = citationRegex.lastIndex;
    }

    if (lastIndex < content.length) {
      parts.push(<Markdown key={`text-${lastIndex}`}>{content.substring(lastIndex)}</Markdown>);
    }

    return parts.length > 0 ? <>{parts}</> : <Markdown>{content}</Markdown>;
  };

  // Filtered providers for model selector search
  const filteredProviders = useMemo(() => {
    if (!modelSearch.trim()) return providers;
    return providers
      .map((p) => ({
        ...p,
        chatModels: p.chatModels.filter(
          (m) =>
            m.name.toLowerCase().includes(modelSearch.toLowerCase()) ||
            m.key.toLowerCase().includes(modelSearch.toLowerCase()) ||
            p.name.toLowerCase().includes(modelSearch.toLowerCase())
        ),
      }))
      .filter((p) => p.chatModels.length > 0);
  }, [providers, modelSearch]);

  // Filtered sessions for history search
  const filteredSessions = useMemo(() => {
    if (!historySearch.trim()) return sessions;
    return sessions.filter(
      (s) =>
        s.title.toLowerCase().includes(historySearch.toLowerCase()) ||
        s.messages.some((m) => m.content.toLowerCase().includes(historySearch.toLowerCase()))
    );
  }, [sessions, historySearch]);

  const quickPrompts = [
    {
      icon: Lightbulb,
      label: 'Explain simply',
      prompt: 'Explain the core concepts of this page in simple, straightforward language:',
    },
    {
      icon: FileText,
      label: 'Summarize page',
      prompt: 'Provide a structured bullet-point summary with key takeaways from this page:',
    },
    {
      icon: BookOpen,
      label: 'Methodology',
      prompt: 'What research methodologies, formulas, or empirical frameworks are utilized here?',
    },
    {
      icon: Languages,
      label: 'Translate to Persian',
      prompt: 'Translate the main insights and scientific terms of this page accurately into Persian (فارسی):',
    },
  ];

  if (!isOpen) return null;

  return (
    <div className="w-full h-full flex flex-col bg-light-primary dark:bg-[#0c0f16] text-slate-900 dark:text-white select-none overflow-hidden">
      {/* ================= HEADER TIER 1: BRAND TITLE & SESSION ACTIONS ================= */}
      <div className="h-12 border-b border-light-200 dark:border-white/10 px-3.5 flex items-center justify-between bg-light-secondary/60 dark:bg-white/[0.02] shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-tr from-purple-500 to-indigo-600 text-white shadow-xs">
            <Sparkles size={14} className={loading ? 'animate-pulse' : ''} />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-slate-900 dark:text-white/95 flex items-center gap-1.5">
              <span>AI Copilot</span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  loading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
                }`}
              />
            </h3>
          </div>
        </div>

        {/* Top Session Actions: History, New Chat, Close */}
        <div className="flex items-center gap-1">
          {/* History Popover Trigger */}
          <div className="relative" ref={historyRef}>
            <button
              type="button"
              onClick={() => setHistoryOpen((v) => !v)}
              title="Chat History & Past Sessions"
              className={`p-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                historyOpen
                  ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white hover:bg-light-200 dark:hover:bg-white/5'
              }`}
            >
              <History size={14} />
              <span className="text-[11px] font-mono">{sessions.length}</span>
            </button>

            {/* History Drawer Popover */}
            {historyOpen && (
              <div className="absolute right-0 mt-2 w-72 p-2 rounded-2xl bg-light-primary/95 dark:bg-[#121622]/95 backdrop-blur-2xl border border-light-200 dark:border-white/10 shadow-2xl z-50 animate-in fade-in zoom-in-95 space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Document Sessions
                  </span>
                  <button
                    type="button"
                    onClick={handleStartNewChat}
                    className="flex items-center gap-1 text-[11px] font-medium text-sky-600 dark:text-sky-400 hover:underline"
                  >
                    <Plus size={12} />
                    <span>New Chat</span>
                  </button>
                </div>

                {/* Search Sessions */}
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Search past conversations..."
                    className="w-full pl-7 pr-2 py-1.5 text-xs rounded-xl bg-light-secondary dark:bg-white/5 border border-light-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Sessions List */}
                <div className="max-h-60 overflow-y-auto space-y-1 custom-scrollbar pr-1">
                  {filteredSessions.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">No sessions found</div>
                  ) : (
                    filteredSessions.map((s) => {
                      const isActive = s.id === activeSessionId;
                      return (
                        <div
                          key={s.id}
                          onClick={() => {
                            setActiveSessionId(s.id);
                            setHistoryOpen(false);
                            soundService.play('tick');
                          }}
                          className={`group w-full text-left p-2 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-between gap-2 ${
                            isActive
                              ? 'bg-purple-500/15 border border-purple-500/30 text-purple-600 dark:text-purple-300 font-medium'
                              : 'hover:bg-light-200 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold">{s.title}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                              {new Date(s.updatedAt).toLocaleDateString()} · {s.messages.length} msgs
                            </p>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={(e) => handleExportSession(s, e)}
                              title="Export Markdown"
                              className="p-1 rounded hover:bg-light-300 dark:hover:bg-white/10 text-slate-400 hover:text-black dark:hover:text-white"
                            >
                              <Download size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteSession(s.id, e)}
                              title="Delete Session"
                              className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-500"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* New Chat Button */}
          <button
            type="button"
            onClick={handleStartNewChat}
            title="Start New Research Chat Session"
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white hover:bg-light-200 dark:hover:bg-white/5 transition-colors"
          >
            <Plus size={14} />
          </button>

          {/* Close Panel Button */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              title="Close Copilot Panel"
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white hover:bg-light-200 dark:hover:bg-white/5 transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ================= HEADER TIER 2: MODEL SELECTOR, THINKING & SCOPE PILLS ================= */}
      <div className="px-3 py-2 border-b border-light-200 dark:border-white/10 bg-light-secondary/30 dark:bg-white/[0.01] flex items-center justify-between gap-1.5 shrink-0">
        {/* Model Selector Popover */}
        <div className="relative" ref={modelPickerRef}>
          <button
            type="button"
            onClick={() => setModelPickerOpen((v) => !v)}
            title={`Active Model: ${currentModelDisplayName}`}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-light-secondary dark:bg-white/5 hover:bg-light-200 dark:hover:bg-white/10 border border-light-200 dark:border-white/10 text-xs font-medium text-slate-800 dark:text-slate-200 transition-all max-w-[155px]"
          >
            <ModelProviderIcon provider={selectedModel.providerId} size={13} />
            <span className="truncate text-[11px] font-semibold">{currentModelDisplayName}</span>
            <ChevronDown size={11} className="opacity-50 shrink-0" />
          </button>

          {/* Searchable Model Picker Dropdown */}
          {modelPickerOpen && (
            <div className="absolute left-0 mt-1.5 w-72 p-2 rounded-2xl bg-light-primary/95 dark:bg-[#121622]/95 backdrop-blur-2xl border border-light-200 dark:border-white/10 shadow-2xl z-50 animate-in fade-in zoom-in-95 space-y-2">
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={modelSearch}
                  onChange={(e) => setModelSearch(e.target.value)}
                  placeholder="Search model or provider..."
                  className="w-full pl-7 pr-2 py-1.5 text-xs rounded-xl bg-light-secondary dark:bg-white/5 border border-light-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                {filteredProviders.length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-400">No models found</div>
                ) : (
                  filteredProviders.map((prov) => (
                    <div key={prov.id} className="space-y-1">
                      <div className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <ModelProviderIcon provider={prov.id} size={11} />
                        <span>{prov.name}</span>
                      </div>
                      {prov.chatModels.map((m) => {
                        const isSelected =
                          selectedModel.providerId === prov.id && selectedModel.key === m.key;
                        return (
                          <button
                            key={m.key}
                            type="button"
                            onClick={() => handleSelectModel(prov.id, m.key)}
                            className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs transition-colors flex items-center justify-between ${
                              isSelected
                                ? 'bg-purple-500 text-white font-semibold shadow-xs'
                                : 'text-slate-700 dark:text-slate-300 hover:bg-light-200 dark:hover:bg-white/5'
                            }`}
                          >
                            <span className="truncate">{m.name}</span>
                            {isSelected && <Check size={12} />}
                          </button>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right side pills: Thinking Toggle & Scope Toggle */}
        <div className="flex items-center gap-1">
          {/* Deep Thinking Mode Toggle Pill (🧠) */}
          <button
            type="button"
            onClick={() => {
              const next = !thinkingEnabled;
              setThinkingEnabled(next);
              localStorage.setItem('pdf_thinking_enabled', String(next));
              soundService.play('tick');
              toast(next ? 'Deep Thinking Mode: ON' : 'Deep Thinking Mode: OFF');
            }}
            title={
              thinkingEnabled
                ? 'Deep Reasoning & Thinking Mode: Active'
                : 'Enable Deep Step-by-Step Thinking'
            }
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-all border ${
              thinkingEnabled
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400 shadow-xs'
                : 'bg-light-secondary dark:bg-white/5 border-light-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
            }`}
          >
            <Brain size={12} className={thinkingEnabled ? 'text-amber-500 animate-pulse' : ''} />
            <span>Think</span>
          </button>

          {/* Context Scope Pill (Page vs Document) */}
          <div className="flex items-center bg-light-secondary dark:bg-white/5 border border-light-200 dark:border-white/10 rounded-lg p-0.5 text-[10.5px]">
            <button
              type="button"
              onClick={() => setScope('page')}
              title={`Context: Focus on Page ${currentPage}`}
              className={`px-1.5 py-0.5 rounded-md transition-all ${
                scope === 'page'
                  ? 'bg-sky-500 text-white font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
              }`}
            >
              Page {currentPage}
            </button>
            <button
              type="button"
              onClick={() => setScope('document')}
              title="Context: Query entire document via vector embeddings"
              className={`px-1.5 py-0.5 rounded-md transition-all ${
                scope === 'document'
                  ? 'bg-purple-500 text-white font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
              }`}
            >
              Doc RAG
            </button>
          </div>
        </div>
      </div>

      {/* ================= ACTIVE EXCERPT CHIP ================= */}
      {activeExcerpt && (
        <div className="mx-3 mt-2.5 p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-start justify-between gap-2 shrink-0 animate-in fade-in duration-150">
          <div className="flex items-start gap-1.5 min-w-0">
            <Quote size={12} className="text-purple-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-800 dark:text-purple-200 line-clamp-2 italic">
              "{activeExcerpt}"
            </p>
          </div>
          <button
            type="button"
            onClick={onClearExcerpt}
            title="Detach excerpt"
            className="p-0.5 rounded text-slate-400 hover:text-black dark:hover:text-white shrink-0"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* ================= CHAT MESSAGES SCROLL VIEW ================= */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 custom-scrollbar select-text">
        {messages.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 select-none text-slate-400">
            <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-500">
              <Sparkles size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {activeSession?.title || 'Research Dialogue'}
              </p>
              <p className="text-[11px] text-slate-400 max-w-xs mt-1 leading-relaxed">
                Ask targeted questions about Page {currentPage} or the entire publication.
              </p>
            </div>

            {/* Quick Prompt Chips */}
            <div className="grid grid-cols-1 gap-1.5 w-full pt-3">
              {quickPrompts.map((qp, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(qp.prompt)}
                  className="w-full text-left p-2 rounded-xl bg-light-secondary/60 dark:bg-white/[0.02] border border-light-200 dark:border-white/5 hover:border-purple-500/30 hover:bg-purple-500/5 transition-all text-xs text-slate-700 dark:text-slate-300 flex items-center gap-2 group"
                >
                  <qp.icon size={13} className="text-purple-500 shrink-0" />
                  <span className="truncate">{qp.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => {
            const isUser = m.role === 'user';
            return (
              <div
                key={m.id}
                className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`flex gap-2 max-w-[92%] ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-white shrink-0 mt-0.5">
                      <Bot size={11} />
                    </div>
                  )}
                  <div
                    className={`rounded-2xl p-3 text-xs leading-relaxed ${
                      isUser
                        ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-tr-xs shadow-xs'
                        : 'bg-light-secondary/80 dark:bg-white/[0.04] border border-light-200 dark:border-white/10 text-slate-900 dark:text-slate-100 rounded-tl-xs shadow-xs'
                    }`}
                  >
                    {/* Render Collapsible ThinkBox if thinking content exists */}
                    {!isUser && m.thinking && (
                      <ThinkBox content={m.thinking} thinkingEnded={m.thinkingEnded ?? true} />
                    )}

                    {/* Excerpt Reference inside User Bubble */}
                    {isUser && m.excerpt && (
                      <div className="mb-2 p-2 rounded-lg bg-white/15 border border-white/20 text-[11px] italic line-clamp-2">
                        "{m.excerpt}"
                      </div>
                    )}

                    {/* Message Body with Interactive Citations */}
                    <div className="prose dark:prose-invert max-w-none text-xs leading-relaxed break-words">
                      {isUser ? m.content : renderMessageContent(m.content)}
                    </div>
                  </div>
                </div>

                {/* Assistant Message Actions Toolbar */}
                {!isUser && !m.isStreaming && (
                  <div className="flex items-center gap-1 pl-7 text-[10px] text-slate-400">
                    <button
                      type="button"
                      onClick={() => handleCopy(m.content, m.id)}
                      title="Copy response"
                      className="p-1 rounded hover:bg-light-200 dark:hover:bg-white/10 transition-colors flex items-center gap-1"
                    >
                      {copiedId === m.id ? (
                        <Check size={11} className="text-emerald-500" />
                      ) : (
                        <Copy size={11} />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleSpeak(m.content, m.id)}
                      title="Read aloud"
                      className="p-1 rounded hover:bg-light-200 dark:hover:bg-white/10 transition-colors"
                    >
                      {speakingMsgId === m.id ? (
                        <VolumeX size={11} className="text-purple-500 animate-pulse" />
                      ) : (
                        <Volume2 size={11} />
                      )}
                    </button>
                    {m.modelName && (
                      <span className="font-mono text-[9.5px] opacity-60">· {m.modelName}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 9Router Status Warning & Instant Launcher */}
      {is9RouterSelected && nineRouterOnline === false && (
        <div className="mx-3 mb-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between gap-2 text-xs select-none">
          <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 min-w-0">
            <AlertTriangle size={13} className="shrink-0 text-amber-500" />
            <span className="text-[11px] truncate">9Router service is offline (:20128)</span>
          </div>
          <button
            type="button"
            onClick={handleStart9Router}
            disabled={isStarting9Router}
            className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium text-[10px] shadow-xs flex items-center gap-1 transition-all shrink-0 active:scale-95 disabled:opacity-50"
          >
            {isStarting9Router ? (
              <Loader2 size={11} className="animate-spin" />
            ) : (
              <Play size={11} className="fill-current" />
            )}
            <span>{isStarting9Router ? 'Starting...' : 'Start 9Router'}</span>
          </button>
        </div>
      )}

      {/* ================= INPUT FORM ================= */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="p-2.5 border-t border-light-200 dark:border-white/10 bg-light-primary dark:bg-[#0c0f16] flex items-center gap-2 shrink-0 select-none"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask about Page ${currentPage} or the whole paper...`}
          className="flex-1 px-3 py-2 text-xs rounded-xl bg-light-secondary dark:bg-white/5 border border-light-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-purple-500"
        />
        <button
          type="submit"
          disabled={loading || (!input.trim() && !activeExcerpt)}
          title="Send query (Enter)"
          className="p-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white shadow-md disabled:opacity-40 transition-all hover:scale-105 active:scale-95 shrink-0"
        >
          <Send size={13} />
        </button>
      </form>
    </div>
  );
};

export default PdfAiPanel;
