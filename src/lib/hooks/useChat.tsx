'use client';

import { Message } from '@/components/ChatWindow';
import { Block } from '@/lib/types';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocation, useNavigate } from 'react-router-dom';

const randomHex = (bytes: number) => {
  const arr = new Uint8Array(bytes);
  window.crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
};
import { toast } from 'sonner';
import { getSuggestions } from '../actions';
import { MinimalProvider } from '../models/types';
import { getAutoMediaSearch } from '../config/clientRegistry';
import { applyPatch } from 'rfc6902';
import { soundService } from '../sound/soundService';
import { Widget } from '@/components/ChatWindow';
import {
  LengthLimit,
  MemoryEvent,
  ModelMode,
  ReasoningBudget,
} from '../localLlm/types';

export type Section = {
  message: Message;
  widgets: Widget[];
  parsedTextBlocks: string[];
  speechMessage: string;
  thinkingEnded: boolean;
  suggestions?: string[];
};

type ChatContext = {
  messages: Message[];
  sections: Section[];
  chatHistory: [string, string][];
  files: File[];
  fileIds: string[];
  sources: string[];
  chatId: string | undefined;
  optimizationMode: string;
  isMessagesLoaded: boolean;
  loading: boolean;
  notFound: boolean;
  messageAppeared: boolean;
  isReady: boolean;
  hasError: boolean;
  chatModelProvider: ChatModelProvider;
  embeddingModelProvider: EmbeddingModelProvider;
  researchEnded: boolean;
  modelMode: ModelMode;
  useOfflineLibrary: boolean;
  reasoningBudget: ReasoningBudget;
  lengthLimit: LengthLimit;
  memoryEvents: Record<string, MemoryEvent[]>;
  activeOfflineDocId: string | null;
  setResearchEnded: (ended: boolean) => void;
  setOptimizationMode: (mode: string) => void;
  setSources: (sources: string[]) => void;
  setFiles: (files: File[]) => void;
  setFileIds: (fileIds: string[]) => void;
  setModelMode: (mode: ModelMode) => void;
  setUseOfflineLibrary: (enabled: boolean) => void;
  setReasoningBudget: (budget: ReasoningBudget) => void;
  setLengthLimit: (limit: LengthLimit) => void;
  setActiveOfflineDocId: (id: string | null) => void;
  undoMemoryEvent: (messageId: string, idx: number, event: MemoryEvent) => Promise<void>;
  stopGeneration: () => void;
  sendMessage: (
    message: string,
    messageId?: string,
    rewrite?: boolean,
  ) => Promise<void>;
  rewrite: (messageId: string) => void;
  setChatModelProvider: (provider: ChatModelProvider) => void;
  setEmbeddingModelProvider: (provider: EmbeddingModelProvider) => void;
};

export interface File {
  fileName: string;
  fileExtension: string;
  fileId: string;
}

interface ChatModelProvider {
  key: string;
  providerId: string;
}

interface EmbeddingModelProvider {
  key: string;
  providerId: string;
}

const checkConfig = async (
  setChatModelProvider: (provider: ChatModelProvider) => void,
  setEmbeddingModelProvider: (provider: EmbeddingModelProvider) => void,
  setIsConfigReady: (ready: boolean) => void,
  setHasError: (hasError: boolean) => void,
) => {
  try {
    let chatModelKey = localStorage.getItem('chatModelKey');
    let chatModelProviderId = localStorage.getItem('chatModelProviderId');
    let embeddingModelKey = localStorage.getItem('embeddingModelKey');
    let embeddingModelProviderId = localStorage.getItem(
      'embeddingModelProviderId',
    );

    const res = await fetch(`/api/providers`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(
        `Provider fetching failed with status code ${res.status}`,
      );
    }

    const data = await res.json();
    const providers: MinimalProvider[] = data.providers;

    if (providers.length === 0) {
      throw new Error(
        'No chat model providers found, please configure them in the settings page.',
      );
    }

    const chatModelProvider =
      providers.find((p) => p.id === chatModelProviderId) ??
      providers.find((p) => p.chatModels.length > 0) ??
      providers[0];

    chatModelProviderId = chatModelProvider.id;

    const chatModel =
      chatModelProvider.chatModels.find((m) => m.key === chatModelKey) ??
      chatModelProvider.chatModels[0];
    chatModelKey = chatModel?.key ?? '';

    const embeddingModelProvider =
      providers.find((p) => p.id === embeddingModelProviderId) ??
      providers.find((p) => p.embeddingModels.length > 0);

    if (embeddingModelProvider) {
      embeddingModelProviderId = embeddingModelProvider.id;
      const embeddingModel =
        embeddingModelProvider.embeddingModels.find(
          (m) => m.key === embeddingModelKey,
        ) ?? embeddingModelProvider.embeddingModels[0];
      embeddingModelKey = embeddingModel?.key ?? '';
    } else {
      embeddingModelProviderId = embeddingModelProviderId ?? '';
      embeddingModelKey = embeddingModelKey ?? '';
    }

    localStorage.setItem('chatModelKey', chatModelKey);
    localStorage.setItem('chatModelProviderId', chatModelProviderId);
    if (embeddingModelKey) {
      localStorage.setItem('embeddingModelKey', embeddingModelKey);
    }
    if (embeddingModelProviderId) {
      localStorage.setItem('embeddingModelProviderId', embeddingModelProviderId);
    }

    setChatModelProvider({
      key: chatModelKey,
      providerId: chatModelProviderId,
    });

    setEmbeddingModelProvider({
      key: embeddingModelKey,
      providerId: embeddingModelProviderId,
    });

    setIsConfigReady(true);
  } catch (err: any) {
    console.error('An error occurred while checking the configuration:', err);
    toast.error(err.message);
    setIsConfigReady(false);
    setHasError(true);
  }
};

const loadMessages = async (
  chatId: string,
  setMessages: (messages: Message[]) => void,
  setIsMessagesLoaded: (loaded: boolean) => void,
  chatHistory: React.MutableRefObject<[string, string][]>,
  setSources: (sources: string[]) => void,
  setNotFound: (notFound: boolean) => void,
  setFiles: (files: File[]) => void,
  setFileIds: (fileIds: string[]) => void,
) => {
  const res = await fetch(`/api/chats/${chatId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (res.status === 404) {
    setNotFound(true);
    setIsMessagesLoaded(true);
    return;
  }

  const data = await res.json();

  const messages = data.messages as Message[];

  setMessages(messages);

  const history: [string, string][] = [];
  messages.forEach((msg) => {
    history.push(['human', msg.query]);

    const textBlocks = msg.responseBlocks
      .filter(
        (block): block is Block & { type: 'text' } => block.type === 'text',
      )
      .map((block) => block.data)
      .join('\n');

    if (textBlocks) {
      history.push(['assistant', textBlocks]);
    }
  });

  console.debug(new Date(), 'app:messages_loaded');

  if (messages.length > 0) {
    document.title = messages[0].query;
  }

  const files = data.chat.files.map((file: any) => {
    return {
      fileName: file.name,
      fileExtension: file.name.split('.').pop(),
      fileId: file.fileId,
    };
  });

  setFiles(files);
  setFileIds(files.map((file: File) => file.fileId));

  chatHistory.current = history;
  setSources(data.chat.sources);
  setIsMessagesLoaded(true);
};

export const chatContext = createContext<ChatContext>({
  chatHistory: [],
  chatId: '',
  fileIds: [],
  files: [],
  sources: [],
  hasError: false,
  isMessagesLoaded: false,
  isReady: false,
  loading: false,
  messageAppeared: false,
  messages: [],
  sections: [],
  notFound: false,
  optimizationMode: '',
  chatModelProvider: { key: '', providerId: '' },
  embeddingModelProvider: { key: '', providerId: '' },
  researchEnded: false,
  modelMode: 'online',
  useOfflineLibrary: true,
  reasoningBudget: 'medium',
  lengthLimit: 'normal',
  memoryEvents: {},
  activeOfflineDocId: null,
  rewrite: () => {},
  sendMessage: async () => {},
  setFileIds: () => {},
  setFiles: () => {},
  setSources: () => {},
  setOptimizationMode: () => {},
  setChatModelProvider: () => {},
  setEmbeddingModelProvider: () => {},
  setResearchEnded: () => {},
  setModelMode: () => {},
  setUseOfflineLibrary: () => {},
  setReasoningBudget: () => {},
  setLengthLimit: () => {},
  setActiveOfflineDocId: () => {},
  undoMemoryEvent: async () => {},
  stopGeneration: () => {},
});

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const searchParams = useSearchParams();
  const initialMessage = searchParams.get('q');

  const pathMatch = location.pathname.match(/^\/c\/([^/?#]+)/);
  const routeChatId = pathMatch ? pathMatch[1] : undefined;

  const [chatId, setChatId] = useState<string | undefined>(routeChatId || randomHex(20));
  const [newChatCreated, setNewChatCreated] = useState<boolean>(!routeChatId);

  const [loading, setLoading] = useState(false);
  const [messageAppeared, setMessageAppeared] = useState(false);

  useEffect(() => {
    import('@tauri-apps/api/core')
      .then(({ invoke }) => {
        invoke('update_tray_status', {
          status: loading ? 'Processing & Synthesizing...' : 'Idle & Ready',
        }).catch(() => {});
      })
      .catch(() => {});

    import('@tauri-apps/api/event')
      .then(({ emit }) => {
        emit('pet-state-update', { mood: loading ? 'thinking' : 'idle' }).catch(() => {});
      })
      .catch(() => {});
  }, [loading]);

  const [researchEnded, setResearchEnded] = useState(false);

  const chatHistory = useRef<[string, string][]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  const [files, setFiles] = useState<File[]>([]);
  const [fileIds, setFileIds] = useState<string[]>([]);

  const [sources, setSources] = useState<string[]>([]);
  const [optimizationMode, setOptimizationMode] = useState('speed');

  const [isMessagesLoaded, setIsMessagesLoaded] = useState(!routeChatId);

  const [notFound, setNotFound] = useState(false);

  const [chatModelProvider, setChatModelProvider] = useState<ChatModelProvider>(
    {
      key: '',
      providerId: '',
    },
  );

  const [embeddingModelProvider, setEmbeddingModelProvider] =
    useState<EmbeddingModelProvider>({
      key: '',
      providerId: '',
    });

  const [isConfigReady, setIsConfigReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const [modelMode, setModelModeState] = useState<ModelMode>(() => {
    const saved = localStorage.getItem('modelMode');
    return saved === 'offline' ? 'offline' : 'online';
  });
  const [useOfflineLibrary, setUseOfflineLibraryState] = useState<boolean>(() => {
    const saved = localStorage.getItem('useOfflineLibrary');
    return saved === null ? true : saved === 'true';
  });
  const [reasoningBudget, setReasoningBudgetState] = useState<ReasoningBudget>(() => {
    return (localStorage.getItem('reasoningBudget') as ReasoningBudget) || 'medium';
  });
  const [lengthLimit, setLengthLimitState] = useState<LengthLimit>(() => {
    return (localStorage.getItem('lengthLimit') as LengthLimit) || 'normal';
  });
  const [memoryEvents, setMemoryEvents] = useState<Record<string, MemoryEvent[]>>({});
  const [activeOfflineDocId, setActiveOfflineDocId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const syncSurvivalSetting = (patch: Record<string, any>) => {
    fetch('/api/survival/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }).catch(() => {});
  };

  const setModelMode = (mode: ModelMode) => {
    setModelModeState(mode);
    localStorage.setItem('modelMode', mode);
    syncSurvivalSetting({ modelMode: mode });

    // Save current model under its previous mode and auto-switch if current provider belongs to the other mode
    fetch('/api/providers')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { providers?: MinimalProvider[] } | null) => {
        const list = data?.providers ?? [];
        const isProvOffline = (p: MinimalProvider) => {
          const t = (p.type || '').toLowerCase();
          const n = (p.name || '').toLowerCase();
          if (t === '9router' || n.includes('9router') || p.baseUrl?.includes('20128')) {
            return false;
          }
          if (p.mode === 'offline' || p.mode === 'online') return p.mode === 'offline';
          return p.id === 'local-gguf' || t === 'ollama' || t === 'lmstudio';
        };

        const currentProv = list.find((p) => p.id === chatModelProvider.providerId);
        const currentlyOffline = currentProv
          ? isProvOffline(currentProv)
          : chatModelProvider.providerId === 'local-gguf';

        if (chatModelProvider.providerId && chatModelProvider.key) {
          localStorage.setItem(
            currentlyOffline ? 'lastOfflineModel' : 'lastOnlineModel',
            JSON.stringify(chatModelProvider),
          );
        }

        const wantOffline = mode === 'offline';
        if (currentlyOffline === wantOffline && currentProv && currentProv.chatModels.length > 0) {
          return;
        }

        // Restore last used model for target mode if valid, else pick first available in that mode
        const savedRaw = localStorage.getItem(wantOffline ? 'lastOfflineModel' : 'lastOnlineModel');
        let chosen: { providerId: string; key: string } | null = null;
        if (savedRaw) {
          try {
            const parsed = JSON.parse(savedRaw);
            const p = list.find((x) => x.id === parsed.providerId && isProvOffline(x) === wantOffline);
            if (p && p.chatModels.some((m) => m.key === parsed.key)) {
              chosen = parsed;
            }
          } catch {}
        }
        if (!chosen) {
          const matchProv = list.find((p) => isProvOffline(p) === wantOffline && p.chatModels.length > 0);
          if (matchProv) {
            chosen = { providerId: matchProv.id, key: matchProv.chatModels[0].key };
          }
        }

        if (chosen) {
          setChatModelProvider(chosen);
          localStorage.setItem('chatModelProviderId', chosen.providerId);
          localStorage.setItem('chatModelKey', chosen.key);
        }
      })
      .catch(() => {});
  };
  const setUseOfflineLibrary = (enabled: boolean) => {
    setUseOfflineLibraryState(enabled);
    localStorage.setItem('useOfflineLibrary', String(enabled));
    syncSurvivalSetting({ offlineLibraryEnabled: enabled });
  };
  const setReasoningBudget = (budget: ReasoningBudget) => {
    setReasoningBudgetState(budget);
    localStorage.setItem('reasoningBudget', budget);
    syncSurvivalSetting({ reasoningBudget: budget });
  };
  const setLengthLimit = (limit: LengthLimit) => {
    setLengthLimitState(limit);
    localStorage.setItem('lengthLimit', limit);
    syncSurvivalSetting({ lengthLimit: limit });
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
    setResearchEnded(true);
    setMessages((prev) =>
      prev.map((m) => (m.status === 'answering' ? { ...m, status: 'completed' } : m)),
    );
  };

  const undoMemoryEvent = async (
    messageId: string,
    idx: number,
    event: MemoryEvent,
  ) => {
    try {
      const res = await fetch('/api/survival/memory/undo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      });
      if (res.ok) {
        setMemoryEvents((prev) => ({
          ...prev,
          [messageId]: (prev[messageId] ?? []).filter((_, i) => i !== idx),
        }));
        toast.success('Memory change undone.');
      }
    } catch {
      toast.error('Failed to undo memory change.');
    }
  };

  const messagesRef = useRef<Message[]>([]);
  const initialMessageSentRef = useRef<string | null>(null);

  const sections = useMemo<Section[]>(() => {
    return messages.map((msg) => {
      const textBlocks: string[] = [];
      let speechMessage = '';
      let thinkingEnded = false;
      let suggestions: string[] = [];

      const sourceBlocks = msg.responseBlocks.filter(
        (block): block is Block & { type: 'source' } => block.type === 'source',
      );
      const sources = sourceBlocks.flatMap((block) => block.data);

      const widgetBlocks = msg.responseBlocks
        .filter((b) => b.type === 'widget')
        .map((b) => b.data) as Widget[];

      msg.responseBlocks.forEach((block) => {
        if (block.type === 'text') {
          let processedText = block.data;
          const citationRegex = /\[([^\]]+)\]/g;
          const regex = /\[(\d+)\]/g;

          if (processedText.includes('<think>')) {
            const openThinkTag = processedText.match(/<think>/g)?.length || 0;
            const closeThinkTag =
              processedText.match(/<\/think>/g)?.length || 0;

            if (openThinkTag && !closeThinkTag) {
              processedText += '</think> <a> </a>';
            }
          }

          if (block.data.includes('</think>')) {
            thinkingEnded = true;
          }

          if (sources.length > 0) {
            processedText = processedText.replace(
              citationRegex,
              (_, capturedContent: string) => {
                const numbers = capturedContent
                  .split(',')
                  .map((numStr) => numStr.trim());

                const linksHtml = numbers
                  .map((numStr) => {
                    const number = parseInt(numStr);

                    if (isNaN(number) || number <= 0) {
                      return `[${numStr}]`;
                    }

                    const source = sources[number - 1];
                    const url = source?.metadata?.url;

                    if (url) {
                      return `<citation href="${url}">${numStr}</citation>`;
                    } else {
                      return ``;
                    }
                  })
                  .join('');

                return linksHtml;
              },
            );
            speechMessage += block.data.replace(regex, '');
          } else {
            processedText = processedText.replace(regex, '');
            speechMessage += block.data.replace(regex, '');
          }

          textBlocks.push(processedText);
        } else if (block.type === 'suggestion') {
          suggestions = block.data;
        }
      });

      return {
        message: msg,
        parsedTextBlocks: textBlocks,
        speechMessage,
        thinkingEnded,
        suggestions,
        widgets: widgetBlocks,
      };
    });
  }, [messages]);

  const isReconnectingRef = useRef(false);
  const handledMessageEndRef = useRef<Set<string>>(new Set());

  const checkReconnect = async () => {
    if (isReconnectingRef.current) return;

    setIsReady(true);
    console.debug(new Date(), 'app:ready');

    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];

      if (lastMsg.status === 'answering') {
        setLoading(true);
        setResearchEnded(false);
        setMessageAppeared(false);

        isReconnectingRef.current = true;

        const res = await fetch(`/api/reconnect/${lastMsg.backendId}`, {
          method: 'POST',
        });

        if (!res.body) throw new Error('No response body');

        const reader = res.body?.getReader();
        const decoder = new TextDecoder('utf-8');

        let partialChunk = '';

        const messageHandler = getMessageHandler(lastMsg);

        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            partialChunk += decoder.decode(value, { stream: true });

            try {
              const messages = partialChunk.split('\n');
              for (const msg of messages) {
                if (!msg.trim()) continue;
                const json = JSON.parse(msg);
                messageHandler(json);
              }
              partialChunk = '';
            } catch (error) {
              console.warn('Incomplete JSON, waiting for next chunk...');
            }
          }
        } finally {
          isReconnectingRef.current = false;
        }
      }
    }
  };

  useEffect(() => {
    checkConfig(
      setChatModelProvider,
      setEmbeddingModelProvider,
      setIsConfigReady,
      setHasError,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (routeChatId) {
      if (routeChatId !== chatId) {
        setChatId(routeChatId);
        setMessages([]);
        chatHistory.current = [];
        setFiles([]);
        setFileIds([]);
        setIsMessagesLoaded(false);
        setNotFound(false);
        setNewChatCreated(false);
      }
    } else if (location.pathname === '/' || location.pathname === '/chat') {
      if (!newChatCreated || messages.length > 0) {
        setChatId(randomHex(20));
        setMessages([]);
        chatHistory.current = [];
        setFiles([]);
        setFileIds([]);
        setIsMessagesLoaded(true);
        setNotFound(false);
        setNewChatCreated(true);
      }
    }
  }, [routeChatId, location.pathname]);

  useEffect(() => {
    if (
      chatId &&
      !newChatCreated &&
      !isMessagesLoaded &&
      messages.length === 0
    ) {
      loadMessages(
        chatId,
        setMessages,
        setIsMessagesLoaded,
        chatHistory,
        setSources,
        setNotFound,
        setFiles,
        setFileIds,
      );
    }
  }, [chatId, isMessagesLoaded, newChatCreated, messages.length]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (isMessagesLoaded && isConfigReady && newChatCreated) {
      setIsReady(true);
      console.debug(new Date(), 'app:ready');
    } else if (isMessagesLoaded && isConfigReady && !newChatCreated) {
      checkReconnect();
    } else {
      setIsReady(false);
    }
  }, [isMessagesLoaded, isConfigReady, newChatCreated]);

  const rewrite = (messageId: string) => {
    const index = messages.findIndex((msg) => msg.messageId === messageId);

    if (index === -1) return;

    setMessages((prev) => prev.slice(0, index));

    chatHistory.current = chatHistory.current.slice(0, index * 2);

    const messageToRewrite = messages[index];
    sendMessage(messageToRewrite.query, messageToRewrite.messageId, true);
  };

  useEffect(() => {
    if (isReady && initialMessage && isConfigReady && initialMessageSentRef.current !== initialMessage) {
      if (!isConfigReady) {
        toast.error('Cannot send message before the configuration is ready');
        return;
      }
      initialMessageSentRef.current = initialMessage;
      sendMessage(initialMessage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConfigReady, isReady, initialMessage]);

  const getMessageHandler = (message: Message) => {
    const messageId = message.messageId;

    return async (data: any) => {
      if (data.type === 'error') {
        toast.error(data.data);
        setLoading(false);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.messageId === messageId
              ? { ...msg, status: 'error' as const }
              : msg,
          ),
        );
        return;
      }

      if (data.type === 'memoryUpdate' && data.event) {
        setMemoryEvents((prev) => ({
          ...prev,
          [messageId]: [...(prev[messageId] ?? []), data.event],
        }));
        return;
      }

      if (data.type === 'researchComplete') {
        setResearchEnded(true);
        if (
          message.responseBlocks.find(
            (b) => b.type === 'source' && b.data.length > 0,
          )
        ) {
          setMessageAppeared(true);
        }
      }

      if (data.type === 'block') {
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.messageId === messageId) {
              const exists = msg.responseBlocks.findIndex(
                (b) => b.id === data.block.id,
              );

              if (exists !== -1) {
                const existingBlocks = [...msg.responseBlocks];
                existingBlocks[exists] = data.block;

                return {
                  ...msg,
                  responseBlocks: existingBlocks,
                };
              }

              return {
                ...msg,
                responseBlocks: [...msg.responseBlocks, data.block],
              };
            }
            return msg;
          }),
        );

        if (data.block.type === 'source' && data.block.data.length > 0) {
          soundService.play('tick');
          setMessageAppeared(true);
        } else if (data.block.type === 'text') {
          setMessageAppeared(true);
        }
      }

      if (data.type === 'updateBlock') {
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.messageId === messageId) {
              const updatedBlocks = msg.responseBlocks.map((block) => {
                if (block.id === data.blockId) {
                  const updatedBlock = { ...block };
                  applyPatch(updatedBlock, data.patch);
                  return updatedBlock;
                }
                return block;
              });
              return { ...msg, responseBlocks: updatedBlocks };
            }
            return msg;
          }),
        );
      }

      if (data.type === 'messageEnd') {
        if (handledMessageEndRef.current.has(messageId)) {
          return;
        }

        handledMessageEndRef.current.add(messageId);
        soundService.play('complete');

        const currentMsg = messagesRef.current.find(
          (msg) => msg.messageId === messageId,
        );

        const newHistory: [string, string][] = [
          ...chatHistory.current,
          ['human', message.query],
          [
            'assistant',
            currentMsg?.responseBlocks.find((b) => b.type === 'text')?.data ||
              '',
          ],
        ];

        chatHistory.current = newHistory;

        setMessages((prev) =>
          prev.map((msg) =>
            msg.messageId === messageId
              ? { ...msg, status: 'completed' as const }
              : msg,
          ),
        );

        setLoading(false);

        const lastMsg = messagesRef.current[messagesRef.current.length - 1];

        const autoMediaSearch = getAutoMediaSearch();

        if (autoMediaSearch) {
          setTimeout(() => {
            document
              .getElementById(`search-images-${lastMsg.messageId}`)
              ?.click();

            document
              .getElementById(`search-videos-${lastMsg.messageId}`)
              ?.click();
          }, 200);
        }

        // Check if there are sources and no suggestions

        const hasSourceBlocks = currentMsg?.responseBlocks.some(
          (block) => block.type === 'source' && block.data.length > 0,
        );
        const hasSuggestions = currentMsg?.responseBlocks.some(
          (block) => block.type === 'suggestion',
        );

        if (hasSourceBlocks && !hasSuggestions) {
          const suggestions = await getSuggestions(newHistory);
          const suggestionBlock: Block = {
            id: randomHex(7),
            type: 'suggestion',
            data: suggestions,
          };

          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.messageId === messageId) {
                return {
                  ...msg,
                  responseBlocks: [...msg.responseBlocks, suggestionBlock],
                };
              }
              return msg;
            }),
          );
        }
      }
    };
  };

  const sendMessage: ChatContext['sendMessage'] = async (
    message,
    messageId,
    rewrite = false,
  ) => {
    if (loading || !message) return;
    setLoading(true);
    setResearchEnded(false);
    setMessageAppeared(false);

    if (messages.length <= 1) {
      navigate(`/c/${chatId}`, { replace: true });
    }

    messageId = messageId ?? randomHex(7);
    const backendId = randomHex(20);

    const newMessage: Message = {
      messageId,
      chatId: chatId!,
      backendId,
      query: message,
      responseBlocks: [],
      status: 'answering',
      createdAt: new Date(),
    };

    setMessages((prevMessages) => [...prevMessages, newMessage]);

    const messageIndex = messages.findIndex((m) => m.messageId === messageId);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: message,
          message: {
            messageId: messageId,
            chatId: chatId!,
            content: message,
          },
          chatId: chatId!,
          files: fileIds,
          sources: sources,
          optimizationMode: optimizationMode,
          modelMode,
          useOfflineLibrary,
          reasoningBudget,
          lengthLimit,
          history: rewrite
            ? chatHistory.current.slice(
                0,
                messageIndex === -1 ? undefined : messageIndex,
              )
            : chatHistory.current,
          chatModel: {
            key: chatModelProvider.key,
            providerId: chatModelProvider.providerId,
          },
          embeddingModel: {
            key: embeddingModelProvider.key,
            providerId: embeddingModelProvider.providerId,
          },
          systemInstructions: localStorage.getItem('systemInstructions'),
        }),
      });

      if (!res.body) throw new Error('No response body');

      const reader = res.body?.getReader();
      const decoder = new TextDecoder('utf-8');

      let partialChunk = '';

      const messageHandler = getMessageHandler(newMessage);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        partialChunk += decoder.decode(value, { stream: true });

        try {
          const lines = partialChunk.split('\n');
          for (const msg of lines) {
            if (!msg.trim()) continue;
            const parsed = JSON.parse(msg);
            messageHandler(parsed);
          }
          partialChunk = '';
        } catch {
          console.warn('Incomplete JSON, waiting for next chunk...');
        }
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('Chat stream error:', err);
        toast.error(err?.message || 'Stream connection error');
        setLoading(false);
      }
    } finally {
      abortControllerRef.current = null;
    }
  };

  return (
    <chatContext.Provider
      value={{
        messages,
        sections,
        chatHistory: chatHistory.current,
        files,
        fileIds,
        sources,
        chatId,
        hasError,
        isMessagesLoaded,
        isReady,
        loading,
        messageAppeared,
        notFound,
        optimizationMode,
        modelMode,
        useOfflineLibrary,
        reasoningBudget,
        lengthLimit,
        memoryEvents,
        activeOfflineDocId,
        setFileIds,
        setFiles,
        setSources,
        setOptimizationMode,
        setModelMode,
        setUseOfflineLibrary,
        setReasoningBudget,
        setLengthLimit,
        setActiveOfflineDocId,
        undoMemoryEvent,
        stopGeneration,
        rewrite,
        sendMessage,
        setChatModelProvider,
        chatModelProvider,
        embeddingModelProvider,
        setEmbeddingModelProvider,
        researchEnded,
        setResearchEnded,
      }}
    >
      {children}
    </chatContext.Provider>
  );
};

export const useChat = () => {
  const ctx = useContext(chatContext);
  return ctx;
};
