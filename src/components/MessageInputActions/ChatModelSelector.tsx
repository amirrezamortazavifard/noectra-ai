'use client';

import { Cpu, Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { useEffect, useMemo, useState } from 'react';
import { MinimalProvider } from '@/lib/models/types';
import { useChat } from '@/lib/hooks/useChat';
import { AnimatePresence, motion } from 'motion/react';
import ModelProviderIcon from '@/components/ui/ModelProviderIcon';

interface ModelSelectorProps {
  placement?: 'top' | 'bottom';
}

const ModelSelector = ({ placement = 'bottom' }: ModelSelectorProps) => {
  const [providers, setProviders] = useState<MinimalProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const { setChatModelProvider, chatModelProvider } = useChat();

  useEffect(() => {
    const loadProviders = async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/api/providers');

        if (!res.ok) {
          throw new Error('Failed to fetch providers');
        }

        const data: { providers: MinimalProvider[] } = await res.json();
        setProviders(data.providers);
      } catch (error) {
        console.error('Error loading providers:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProviders();
  }, []);

  const currentModelName = useMemo(() => {
    if (!chatModelProvider?.key) return null;
    const provider = providers.find((p) => p.id === chatModelProvider.providerId);
    const model = provider?.chatModels.find((m) => m.key === chatModelProvider.key);
    return model?.name || chatModelProvider.key;
  }, [providers, chatModelProvider]);

  const orderedProviders = useMemo(() => {
    if (!chatModelProvider?.providerId) return providers;

    const currentProviderIndex = providers.findIndex(
      (p) => p.id === chatModelProvider.providerId,
    );

    if (currentProviderIndex === -1) {
      return providers;
    }

    const selectedProvider = providers[currentProviderIndex];
    const remainingProviders = providers.filter(
      (_, index) => index !== currentProviderIndex,
    );

    return [selectedProvider, ...remainingProviders];
  }, [providers, chatModelProvider]);

  const handleModelSelect = (
    providerId: string,
    modelKey: string,
    close?: () => void,
  ) => {
    setChatModelProvider({ providerId, key: modelKey });
    localStorage.setItem('chatModelProviderId', providerId);
    localStorage.setItem('chatModelKey', modelKey);
    close?.();
  };

  const filteredProviders = orderedProviders
    .map((provider) => ({
      ...provider,
      chatModels: provider.chatModels.filter(
        (model) =>
          model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
            title={currentModelName ? `Active Model: ${currentModelName}` : 'Select Model'}
            className="active:border-none hover:bg-light-200 hover:dark:bg-dark-200 px-2 py-1.5 rounded-lg focus:outline-none headless-open:text-black dark:headless-open:text-white text-black/60 dark:text-white/60 active:scale-95 transition duration-200 hover:text-black dark:hover:text-white flex items-center gap-1.5"
          >
            <ModelProviderIcon
              provider={chatModelProvider?.providerId}
              modelKey={chatModelProvider?.key}
              size={15}
              className="shrink-0"
            />
            {currentModelName && (
              <span className="text-xs font-medium max-w-[90px] sm:max-w-[130px] truncate">
                {currentModelName}
              </span>
            )}
          </PopoverButton>
          <AnimatePresence>
            {open && (
              <PopoverPanel
                className={cn(
                  'absolute z-50 w-[260px] sm:w-[300px] right-0',
                  placement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
                )}
                static
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.1, ease: 'easeOut' }}
                  className={cn(
                    'bg-light-primary dark:bg-dark-primary max-h-[320px] sm:max-w-none border rounded-xl border-light-200 dark:border-dark-200 w-full flex flex-col shadow-2xl overflow-hidden',
                    placement === 'top' ? 'origin-bottom-right' : 'origin-top-right',
                  )}
                >
                  <div className="p-2 border-b border-light-200 dark:border-dark-200">
                    <div className="relative">
                      <Search
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40"
                      />
                      <input
                        type="text"
                        placeholder="Search models..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 bg-light-secondary dark:bg-dark-secondary rounded-lg placeholder:text-xs placeholder:-translate-y-[1.5px] text-xs text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40 focus:outline-none border border-transparent transition duration-200"
                      />
                    </div>
                  </div>

                  <div className="max-h-[320px] overflow-y-auto">
                    {isLoading ? (
                      <div className="flex items-center justify-center py-16">
                        <Loader2
                          className="animate-spin text-black/40 dark:text-white/40"
                          size={24}
                        />
                      </div>
                    ) : filteredProviders.length === 0 ? (
                      <div className="text-center py-16 px-4 text-black/60 dark:text-white/60 text-sm">
                        {searchQuery
                          ? 'No models found'
                          : 'No chat models configured'}
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        {filteredProviders.map((provider, providerIndex) => (
                          <div key={provider.id}>
                            <div className="px-3.5 py-2 sticky top-0 bg-light-primary/95 dark:bg-dark-primary/95 backdrop-blur-md border-b border-light-200/50 dark:border-dark-200/50 flex items-center gap-2">
                              <ModelProviderIcon provider={provider.id || provider.name} size={13} showBackground />
                              <p className="text-xs font-semibold text-black/70 dark:text-white/70 tracking-wide">
                                {provider.name}
                              </p>
                            </div>

                            <div className="flex flex-col px-2 py-2 space-y-0.5">
                              {provider.chatModels.map((model) => (
                                <button
                                  key={model.key}
                                  onClick={() =>
                                    handleModelSelect(
                                      provider.id,
                                      model.key,
                                      close,
                                    )
                                  }
                                  type="button"
                                  className={cn(
                                    'px-3 py-2 flex items-center justify-between text-start duration-200 cursor-pointer transition rounded-lg group',
                                    chatModelProvider?.providerId ===
                                      provider.id &&
                                      chatModelProvider?.key === model.key
                                      ? 'bg-light-secondary dark:bg-dark-secondary'
                                      : 'hover:bg-light-secondary dark:hover:bg-dark-secondary',
                                  )}
                                >
                                  <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                                    <ModelProviderIcon
                                      provider={provider.id}
                                      modelKey={model.key}
                                      size={14}
                                      className="shrink-0"
                                    />
                                    <p
                                      className={cn(
                                        'text-xs truncate',
                                        chatModelProvider?.providerId ===
                                          provider.id &&
                                          chatModelProvider?.key === model.key
                                          ? 'text-sky-500 font-medium'
                                          : 'text-black/70 dark:text-white/70 group-hover:text-black dark:group-hover:text-white',
                                      )}
                                    >
                                      {model.name}
                                    </p>
                                  </div>
                                </button>
                              ))}
                            </div>

                            {providerIndex < filteredProviders.length - 1 && (
                              <div className="h-px bg-light-200 dark:bg-dark-200" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
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
