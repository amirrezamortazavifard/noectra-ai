'use client';

import { Check, Cloud, Cpu, Loader2, Search, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { MinimalProvider } from '@/lib/models/types';
import { useChat } from '@/lib/hooks/useChat';
import { AnimatePresence, motion } from 'motion/react';
import ModelProviderIcon from '@/components/ui/ModelProviderIcon';

interface ModelSelectorProps {
  placement?: 'top' | 'bottom';
}

function formatModelFallback(key: string): string {
  const base = key.split(/[\\/]/).pop() || key;
  return base.replace(/\.gguf$/i, '');
}

function resolveProviderMode(provider: MinimalProvider): 'offline' | 'online' {
  const nameLow = (provider.name || '').toLowerCase();
  const typeLow = (provider.type || '').toLowerCase();
  if (typeLow === '9router' || nameLow.includes('9router') || provider.baseUrl?.includes('20128')) {
    return 'online';
  }
  if (provider.mode === 'offline' || provider.mode === 'online') {
    return provider.mode;
  }
  if (provider.id === 'local-gguf' || typeLow === 'ollama' || typeLow === 'lmstudio') {
    return 'offline';
  }
  return 'online';
}

const ModelSelector = ({ placement = 'bottom' }: ModelSelectorProps) => {
  const [providers, setProviders] = useState<MinimalProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [localServerStatus, setLocalServerStatus] = useState<{
    type: string;
    port?: number;
    loadedModelPath?: string | null;
  }>({ type: 'stopped' });

  const { setChatModelProvider, chatModelProvider, modelMode, setModelMode } = useChat();

  const loadProviders = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const [res, srvRes] = await Promise.all([
        fetch('/api/providers'),
        fetch('/api/local-llm/server/status').catch(() => null),
      ]);
      if (!res.ok) throw new Error('Failed to fetch providers');
      const data: { providers: MinimalProvider[] } = await res.json();
      setProviders(data.providers);
      if (srvRes && srvRes.ok) {
        const snap = await srvRes.json();
        setLocalServerStatus({
          type: snap?.status?.type || 'stopped',
          port: snap?.status?.port,
          loadedModelPath: snap?.loaded_model_path ?? null,
        });
      }
    } catch (error) {
      console.error('Error loading providers:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProviders();
    const onUpdated = () => loadProviders(true);
    window.addEventListener('providers-updated', onUpdated);
    window.addEventListener('local-llm-status-changed', onUpdated);
    return () => {
      window.removeEventListener('providers-updated', onUpdated);
      window.removeEventListener('local-llm-status-changed', onUpdated);
    };
  }, [loadProviders]);

  const currentModelName = useMemo(() => {
    if (!chatModelProvider?.key) return null;
    const provider = providers.find((p) => p.id === chatModelProvider.providerId);
    const model = provider?.chatModels.find((m) => m.key === chatModelProvider.key);
    return model?.name || formatModelFallback(chatModelProvider.key);
  }, [providers, chatModelProvider]);

  const orderedProviders = useMemo(() => {
    if (!chatModelProvider?.providerId) return providers;
    const currentProviderIndex = providers.findIndex(
      (p) => p.id === chatModelProvider.providerId,
    );
    if (currentProviderIndex === -1) return providers;
    const selectedProvider = providers[currentProviderIndex];
    const remainingProviders = providers.filter(
      (_, index) => index !== currentProviderIndex,
    );
    return [selectedProvider, ...remainingProviders];
  }, [providers, chatModelProvider]);

  const handleModelSelect = (
    providerId: string,
    modelKey: string,
    providerMode: 'offline' | 'online',
    close?: () => void,
  ) => {
    setChatModelProvider({ providerId, key: modelKey });
    localStorage.setItem('chatModelProviderId', providerId);
    localStorage.setItem('chatModelKey', modelKey);
    setModelMode(providerMode);
    close?.();
  };

  const openModelSettings = (close?: () => void) => {
    close?.();
    const targetTab = modelMode === 'offline' ? 'offline' : 'online';
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent('open-settings', {
          detail: { section: 'models', tab: targetTab },
        }),
      );
    }, 50);
  };

  const filteredProviders = orderedProviders
    .filter((provider) => resolveProviderMode(provider) === modelMode)
    .map((provider) => ({
      ...provider,
      chatModels: provider.chatModels.filter(
        (model) =>
          model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          model.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
          provider.name.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    }))
    .filter((provider) => provider.chatModels.length > 0);

  return (
    <Popover className="relative">
      {({ open, close }) => (
        <>
          <PopoverButton
            type="button"
            onClick={() => loadProviders(true)}
            title={currentModelName ? `Active Model: ${currentModelName}` : 'Select Model'}
            className="h-8 px-2.5 rounded-xl border border-light-200/80 dark:border-white/10 bg-white/80 dark:bg-white/[0.04] hover:bg-light-200/80 dark:hover:bg-white/10 focus:outline-none text-slate-800 dark:text-white/90 active:scale-95 transition duration-200 flex items-center gap-1.5"
          >
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full shrink-0',
                modelMode === 'offline' ? 'bg-emerald-500' : 'bg-sky-500',
              )}
            />
            <ModelProviderIcon
              provider={chatModelProvider?.providerId}
              modelKey={chatModelProvider?.key}
              size={14}
              className="shrink-0"
            />
            {currentModelName ? (
              <span className="text-xs font-medium max-w-[110px] sm:max-w-[155px] truncate">
                {currentModelName}
              </span>
            ) : (
              <span className="text-xs font-medium text-slate-500 dark:text-white/50">
                Select model
              </span>
            )}
          </PopoverButton>
          <AnimatePresence>
            {open && (
              <PopoverPanel
                className={cn(
                  'absolute z-50 w-[280px] sm:w-[330px] right-0',
                  placement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
                )}
                static
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  transition={{ duration: 0.12, ease: 'easeOut' }}
                  className={cn(
                    'bg-light-primary dark:bg-dark-primary max-h-[370px] border rounded-xl border-light-200 dark:border-dark-200 w-full flex flex-col shadow-2xl overflow-hidden',
                    placement === 'top' ? 'origin-bottom-right' : 'origin-top-right',
                  )}
                >
                  <div className="p-2 border-b border-light-200 dark:border-dark-200 space-y-2">
                    <div className="grid grid-cols-2 gap-1 p-0.5 rounded-lg bg-light-secondary dark:bg-dark-secondary border border-light-200/70 dark:border-white/10">
                      <button
                        type="button"
                        onClick={() => setModelMode('offline')}
                        className={cn(
                          'flex items-center justify-center gap-1.5 py-1 rounded-md text-xs font-medium transition',
                          modelMode === 'offline'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-slate-700 dark:text-white/70 hover:text-slate-950 dark:hover:text-white',
                        )}
                      >
                        <Cpu size={13} /> Offline
                      </button>
                      <button
                        type="button"
                        onClick={() => setModelMode('online')}
                        className={cn(
                          'flex items-center justify-center gap-1.5 py-1 rounded-md text-xs font-medium transition',
                          modelMode === 'online'
                            ? 'bg-sky-600 text-white shadow-sm'
                            : 'text-slate-700 dark:text-white/70 hover:text-slate-950 dark:hover:text-white',
                        )}
                      >
                        <Cloud size={13} /> Online
                      </button>
                    </div>
                    <div className="relative">
                      <Search
                        size={15}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40"
                      />
                      <input
                        type="text"
                        placeholder={`Search ${modelMode} models...`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-light-secondary dark:bg-dark-secondary rounded-lg text-xs text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="max-h-[250px] overflow-y-auto">
                    {isLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2
                          className="animate-spin text-black/40 dark:text-white/40"
                          size={22}
                        />
                      </div>
                    ) : filteredProviders.length === 0 ? (
                      <div className="text-center py-8 px-4 text-slate-600 dark:text-white/65 text-xs space-y-2.5">
                        <p>
                          {searchQuery
                            ? 'No models match your search.'
                            : modelMode === 'offline'
                            ? 'No offline GGUF, Ollama, or LM Studio models found in configured folders.'
                            : 'No online AI providers configured yet.'}
                        </p>
                        <button
                          type="button"
                          onClick={() => openModelSettings(close)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-medium text-xs transition"
                        >
                          <Settings2 size={12} /> Configure in Settings
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        {filteredProviders.map((provider, providerIndex) => (
                          <div key={provider.id}>
                            <div className="px-3.5 py-2 sticky top-0 bg-light-primary/95 dark:bg-dark-primary/95 backdrop-blur-md border-b border-light-200/50 dark:border-dark-200/50 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <ModelProviderIcon provider={provider.id || provider.name} size={13} showBackground />
                                <p className="text-xs font-semibold text-black/75 dark:text-white/75 tracking-wide truncate">
                                  {provider.name}
                                </p>
                              </div>
                              {provider.id === 'local-gguf' ? (
                                localServerStatus.type === 'running' ? (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-medium">
                                    Ready · :{localServerStatus.port}
                                  </span>
                                ) : localServerStatus.type === 'starting' ? (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 font-medium">
                                    Loading...
                                  </span>
                                ) : (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-white/10 text-slate-600 dark:text-white/65">
                                    Auto-load
                                  </span>
                                )
                              ) : (
                                provider.serverStatus?.running && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                                    Running
                                  </span>
                                )
                              )}
                            </div>

                            <div className="flex flex-col px-2 py-1.5 space-y-0.5">
                              {provider.chatModels.map((model) => {
                                const isSelected =
                                  chatModelProvider?.providerId === provider.id &&
                                  chatModelProvider?.key === model.key;
                                const isLoadedModel =
                                  provider.id === 'local-gguf' &&
                                  localServerStatus.type === 'running' &&
                                  localServerStatus.loadedModelPath === model.key;
                                return (
                                  <button
                                    key={model.key}
                                    onClick={() =>
                                      handleModelSelect(
                                        provider.id,
                                        model.key,
                                        resolveProviderMode(provider),
                                        close,
                                      )
                                    }
                                    type="button"
                                    className={cn(
                                      'px-2.5 py-2 flex items-center justify-between text-start duration-150 cursor-pointer transition rounded-lg group',
                                      isSelected
                                        ? 'bg-sky-500/10 dark:bg-sky-500/15'
                                        : 'hover:bg-light-secondary dark:hover:bg-dark-secondary',
                                    )}
                                  >
                                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                                      <ModelProviderIcon
                                        provider={provider.id}
                                        modelKey={model.key}
                                        size={14}
                                        className="shrink-0"
                                      />
                                      <p
                                        className={cn(
                                          'text-xs truncate',
                                          isSelected
                                            ? 'text-sky-600 dark:text-sky-400 font-medium'
                                            : 'text-slate-800 dark:text-white/80 group-hover:text-black dark:group-hover:text-white',
                                        )}
                                      >
                                        {model.name}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0 ml-1">
                                      {isLoadedModel && (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-medium">
                                          Ready
                                        </span>
                                      )}
                                      {isSelected && (
                                        <Check size={13} className="text-sky-600 dark:text-sky-400" />
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>

                            {providerIndex < filteredProviders.length - 1 && (
                              <div className="h-px bg-light-200 dark:bg-dark-200" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="p-2 border-t border-light-200 dark:border-dark-200 bg-light-secondary/40 dark:bg-dark-secondary/40 space-y-1.5">
                    {modelMode === 'offline' && (
                      <p className="text-[10px] text-center text-slate-500 dark:text-white/55 px-1">
                        Just pick a model and send — engine starts automatically.
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => openModelSettings(close)}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-white/85 hover:bg-light-200 dark:hover:bg-white/10 transition"
                    >
                      <Settings2 size={13} /> Manage All Models in Settings
                    </button>
                  </div>
                </motion.div>
              </PopoverPanel>
            )}
          </AnimatePresence>
        </>
      )}
    </Popover>
  );
};

export default ModelSelector;
