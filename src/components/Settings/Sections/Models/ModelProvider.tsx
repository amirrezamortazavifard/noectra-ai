import { UIConfigField, ConfigModelProvider } from '@/lib/config/types';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Play,
  Plug2,
  Plus,
  Pencil,
  Trash2,
  X,
  Zap,
  ExternalLink,
  RefreshCw,
  RotateCcw,
  Terminal,
  Activity,
  Key,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import AddModel from './AddModelDialog';
import UpdateProvider from './UpdateProviderDialog';
import DeleteProvider from './DeleteProviderDialog';
import { openExternalLink } from '@/lib/openExternal';

import { PREDEFINED_PROVIDERS } from '@/lib/constants/predefinedProviders';
import ModelProviderIcon from '@/components/ui/ModelProviderIcon';

interface NineRouterStatus {
  isRunning: boolean;
  isInstalled: boolean;
  version: string;
  port: number;
  baseUrl: string;
  dashboardUrl: string;
  modelsCount: number;
  latencyMs?: number;
  apiKey?: string | null;
}

const ModelProvider = ({
  modelProvider,
  setProviders,
  fields,
}: {
  modelProvider: ConfigModelProvider;
  fields: UIConfigField[];
  setProviders: React.Dispatch<React.SetStateAction<ConfigModelProvider[]>>;
}) => {
  const [open, setOpen] = useState(true);
  const [testingModel, setTestingModel] = useState<string | null>(null);
  const [isTestingProvider, setIsTestingProvider] = useState(false);
  const [testResults, setTestResults] = useState<
    Record<string, { success: boolean; latencyMs?: number; error?: string }>
  >({});

  // 9Router exclusive state & helpers
  const is9Router =
    modelProvider.type === '9router' ||
    modelProvider.name.toLowerCase().includes('9router') ||
    (modelProvider.type === 'custom' &&
      (modelProvider.id.includes('9router') ||
        (modelProvider as any).baseUrl?.includes('20128')));

  const [nineRouterStatus, setNineRouterStatus] = useState<NineRouterStatus | null>(null);
  const [isStarting9Router, setIsStarting9Router] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  const check9RouterStatus = async () => {
    if (!is9Router) return;
    setIsCheckingStatus(true);
    try {
      const res = await fetch('/api/9router/status');
      if (res.ok) {
        const data = await res.json();
        setNineRouterStatus(data);
        if (data.apiKey && !modelProvider.config?.apiKey) {
          setProviders((prev) =>
            prev.map((p) =>
              p.id === modelProvider.id
                ? {
                    ...p,
                    config: { ...p.config, apiKey: p.config?.apiKey || data.apiKey },
                  }
                : p
            )
          );
        }
      }
    } catch (err) {
      console.error('Failed to fetch 9Router status:', err);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  useEffect(() => {
    if (is9Router) {
      check9RouterStatus();
    }
  }, [is9Router]);

  const handleStart9Router = async () => {
    setIsStarting9Router(true);
    try {
      toast.info('Starting 9Router background service...', {
        description: 'Listening on http://localhost:20128',
      });
      const res = await fetch('/api/9router/start', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || '9Router started successfully!');
        await check9RouterStatus();
        await handleSync9RouterModels();
      } else {
        if (data.notInstalled) {
          toast.error('9Router is not installed!', {
            description: data.error || 'Please run: npm install -g 9router in terminal.',
            duration: 10000,
          });
        } else {
          toast.error('Failed to start 9Router', {
            description: data.error || 'Please inspect logs or run 9router in terminal.',
            duration: 10000,
          });
        }
        await check9RouterStatus();
      }
    } catch (err: any) {
      toast.error('Error starting 9Router', { description: err.message });
    } finally {
      setIsStarting9Router(false);
    }
  };

  const handleSync9RouterModels = async () => {
    try {
      const res = await fetch(`/api/providers/${modelProvider.id}/models`);
      if (res.ok) {
        const data = await res.json();
        if (data.chatModels && data.chatModels.length > 0) {
          setProviders((prev) =>
            prev.map((p) =>
              p.id === modelProvider.id
                ? { ...p, chatModels: data.chatModels }
                : p
            )
          );
          toast.success(`Synced ${data.chatModels.length} models from 9Router!`);
        } else {
          toast.info('No active models reported by 9Router.');
        }
      }
    } catch (err: any) {
      toast.error('Failed to sync models from 9Router', { description: err.message });
    }
  };

  const handleOpenDashboard = () => {
    openExternalLink('http://localhost:20128');
  };

  const providerMeta = PREDEFINED_PROVIDERS.find((p) => p.key === modelProvider.type);

  const handleTestModel = async (modelKey: string) => {
    if (is9Router && nineRouterStatus && !nineRouterStatus.isRunning) {
      toast.warning('9Router is not running', {
        description: 'Please click "Start 9Router Service" to launch the local gateway first.',
        action: {
          label: 'Start Now',
          onClick: () => handleStart9Router(),
        },
      });
      return;
    }

    try {
      setTestingModel(modelKey);
      let data;
      if (is9Router) {
        const res = await fetch('/api/9router/ping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: modelKey }),
        });
        data = await res.json();
      } else {
        const res = await fetch(`/api/providers/${modelProvider.id}/test`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: modelKey }),
        });
        data = await res.json();
      }

      setTestResults((prev) => ({ ...prev, [modelKey]: data }));
      if (data.success) {
        toast.success(`Connection to model ${modelKey} was successful`, {
          description: `Latency: ${data.latencyMs}ms${data.reply ? ` • Reply: "${data.reply}"` : ''}`,
        });
      } else {
        toast.error(`Model test failed: ${modelKey}`, {
          description: data.error || 'No response received from provider',
          duration: 8000,
        });
      }
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [modelKey]: { success: false, error: err.message },
      }));
      toast.error(`Error testing model ${modelKey}`, {
        description: err.message,
        duration: 8000,
      });
    } finally {
      setTestingModel(null);
    }
  };

  const handleTestProvider = async () => {
    if (is9Router) {
      await check9RouterStatus();
    }

    try {
      setIsTestingProvider(true);
      const firstModel = modelProvider.chatModels[0]?.key;
      let data;
      if (is9Router) {
        const res = await fetch('/api/9router/ping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(firstModel ? { model: firstModel } : {}),
        });
        data = await res.json();
      } else {
        const res = await fetch(`/api/providers/${modelProvider.id}/test`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(firstModel ? { model: firstModel } : {}),
        });
        data = await res.json();
      }

      if (data.success) {
        toast.success(
          `Connected to ${modelProvider.name} (${data.latencyMs}ms)`,
          {
            description: data.model ? `Model: ${data.model}` : undefined,
          }
        );
      } else {
        toast.error(`Connection test failed for ${modelProvider.name}`, {
          description: data.error || 'No response from server',
          duration: 8000,
        });
      }
    } catch (err: any) {
      toast.error(`Error testing ${modelProvider.name}`, {
        description: err.message,
        duration: 8000,
      });
    } finally {
      setIsTestingProvider(false);
    }
  };

  const handleModelDelete = async (
    type: 'chat' | 'embedding',
    modelKey: string,
  ) => {
    try {
      const res = await fetch(`/api/providers/${modelProvider.id}/models`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key: modelKey, type: type }),
      });

      if (!res.ok) {
        throw new Error('Failed to delete model: ' + (await res.text()));
      }

      setProviders(
        (prev) =>
          prev.map((provider) => {
            if (provider.id === modelProvider.id) {
              return {
                ...provider,
                ...(type === 'chat'
                  ? {
                      chatModels: provider.chatModels.filter(
                        (m) => m.key !== modelKey,
                      ),
                    }
                  : {
                      embeddingModels: provider.embeddingModels.filter(
                        (m) => m.key !== modelKey,
                      ),
                    }),
              };
            }
            return provider;
          }) as ConfigModelProvider[],
      );

      toast.success('Model deleted successfully.');
    } catch (err) {
      console.error('Failed to delete model', err);
      toast.error('Failed to delete model.');
    }
  };

  const modelCount =
    modelProvider.chatModels.filter((m) => m.key !== 'error').length +
    modelProvider.embeddingModels.filter((m) => m.key !== 'error').length;
  const hasError =
    modelProvider.chatModels.some((m) => m.key === 'error') ||
    modelProvider.embeddingModels.some((m) => m.key === 'error');

  return (
    <div
      key={modelProvider.id}
      className="border border-light-200 dark:border-dark-200 rounded-lg overflow-hidden bg-light-primary dark:bg-dark-primary"
    >
      <div className="px-5 py-3.5 flex flex-row justify-between w-full items-center border-b border-light-200 dark:border-dark-200 bg-light-secondary/30 dark:bg-dark-secondary/30">
        <div className="flex items-center gap-2.5">
          <ModelProviderIcon
            provider={modelProvider.type}
            size={16}
            showBackground
          />
          <div className="flex flex-col">
            <div className="flex items-center space-x-2">
              <p className="text-sm lg:text-sm text-black dark:text-white font-medium">
                {modelProvider.name}
              </p>
              {providerMeta && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-light-200 dark:bg-white/10 text-black/60 dark:text-white/60 font-mono">
                  {providerMeta.key}
                </span>
              )}
            </div>
            {modelCount > 0 && (
              <p className="text-[10px] lg:text-[11px] text-black/50 dark:text-white/50">
                {modelCount} model{modelCount !== 1 ? 's' : ''} configured
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-row items-center gap-1.5">
          <button
            onClick={handleTestProvider}
            disabled={isTestingProvider}
            title="Test connection to this provider"
            className="px-2.5 py-1 rounded-md text-xs font-medium border border-light-200 dark:border-dark-200 hover:bg-light-200 hover:dark:bg-dark-200 transition-colors flex items-center space-x-1 text-black/70 dark:text-white/70 active:scale-95"
          >
            {isTestingProvider ? (
              <Loader2 size={13} className="animate-spin text-sky-500" />
            ) : (
              <Zap size={13} className="text-sky-500" />
            )}
            <span className="text-[11px]">Test Connection</span>
          </button>
          <UpdateProvider
            fields={fields}
            modelProvider={modelProvider}
            setProviders={setProviders}
          />
          <DeleteProvider
            modelProvider={modelProvider}
            setProviders={setProviders}
          />
        </div>
      </div>
      <div className="flex flex-col gap-y-4 px-5 py-4">
        {/* 9Router Dedicated Service Control Banner */}
        {is9Router && (
          <div className="p-4 rounded-xl border border-indigo-500/25 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent space-y-3 shadow-xs">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="relative flex items-center justify-center">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      nineRouterStatus?.isRunning
                        ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.7)]'
                        : 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]'
                    }`}
                  />
                  {nineRouterStatus?.isRunning && (
                    <span className="absolute w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping opacity-75" />
                  )}
                </div>
                <span className="text-xs font-semibold text-black dark:text-white">
                  {nineRouterStatus?.isRunning
                    ? '9Router Gateway Online'
                    : '9Router Gateway Offline'}
                </span>
                {nineRouterStatus?.version && nineRouterStatus.version !== 'Unknown' && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-mono font-medium">
                    v{nineRouterStatus.version}
                  </span>
                )}
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-light-200 dark:bg-white/10 text-black/60 dark:text-white/60 font-mono">
                  :20128
                </span>
                {nineRouterStatus?.apiKey && (
                  <span
                    title={`Auto-detected 9Router API Key: ${nineRouterStatus.apiKey}`}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono font-medium flex items-center gap-1"
                  >
                    <Key size={10} />
                    Auto-Key: {nineRouterStatus.apiKey.slice(0, 5)}...{nineRouterStatus.apiKey.slice(-4)}
                  </span>
                )}
              </div>

              {nineRouterStatus?.latencyMs !== undefined &&
                nineRouterStatus.latencyMs !== null && (
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-medium">
                    Ping: {nineRouterStatus.latencyMs}ms
                  </span>
                )}
            </div>

            <p className="text-xs text-black/60 dark:text-white/60 leading-relaxed">
              {nineRouterStatus?.isRunning
                ? 'Local smart router is active on localhost:20128. Prompts to 9router models are routed with RTK token savings and auto-fallback.'
                : nineRouterStatus?.isInstalled === false
                ? 'The 9router CLI is not installed or not found in system PATH. Please install it globally via npm.'
                : 'The 9Router local service is required to communicate with 9router models. Click "Start 9Router" to run it in background.'}
            </p>

            {nineRouterStatus && !nineRouterStatus.isInstalled && (
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-xs text-amber-700 dark:text-amber-300 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Terminal size={14} className="shrink-0 text-amber-500" />
                  <code className="font-mono text-[11px] bg-amber-500/20 px-1.5 py-0.5 rounded select-all">
                    npm install -g 9router
                  </code>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText('npm install -g 9router');
                    toast.success('Copied install command to clipboard');
                  }}
                  className="text-[10px] font-medium px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 transition-colors"
                >
                  Copy Command
                </button>
              </div>
            )}

            <div className="flex items-center flex-wrap gap-2 pt-1">
              {!nineRouterStatus?.isRunning ? (
                <button
                  type="button"
                  onClick={handleStart9Router}
                  disabled={isStarting9Router}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-medium text-xs shadow-md shadow-indigo-500/20 flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                >
                  {isStarting9Router ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Play size={13} className="fill-current" />
                  )}
                  <span>{isStarting9Router ? 'Starting 9Router...' : 'Start 9Router Service'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={check9RouterStatus}
                  disabled={isCheckingStatus}
                  className="px-3 py-1.5 rounded-xl bg-light-secondary dark:bg-white/10 hover:bg-light-200 dark:hover:bg-white/15 text-black/80 dark:text-white text-xs font-medium border border-light-200 dark:border-white/10 flex items-center gap-1.5 transition-all"
                >
                  {isCheckingStatus ? (
                    <Loader2 size={13} className="animate-spin text-indigo-500" />
                  ) : (
                    <Zap size={13} className="text-indigo-500" />
                  )}
                  <span>Ping Gateway</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleSync9RouterModels}
                className="px-3 py-1.5 rounded-xl bg-light-secondary dark:bg-white/5 hover:bg-light-200 dark:hover:bg-white/10 text-black/80 dark:text-white text-xs font-medium border border-light-200 dark:border-white/10 flex items-center gap-1.5 transition-all"
                title="Fetch models list from 9router localhost:20128"
              >
                <RotateCcw size={12} className="text-black/50 dark:text-white/50" />
                <span>Sync Models</span>
              </button>

              <button
                type="button"
                onClick={handleOpenDashboard}
                className="px-3 py-1.5 rounded-xl bg-light-secondary dark:bg-white/5 hover:bg-light-200 dark:hover:bg-white/10 text-black/80 dark:text-white text-xs font-medium border border-light-200 dark:border-white/10 flex items-center gap-1.5 transition-all"
              >
                <ExternalLink size={12} className="text-black/50 dark:text-white/50" />
                <span>Open Dashboard</span>
              </button>

              <button
                type="button"
                onClick={check9RouterStatus}
                disabled={isCheckingStatus}
                className="p-1.5 rounded-xl text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white hover:bg-light-200 dark:hover:bg-white/10 transition-colors"
                title="Refresh Status"
              >
                <RefreshCw size={13} className={isCheckingStatus ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-y-2">
          <div className="flex flex-row w-full justify-between items-center">
            <p className="text-[11px] lg:text-[11px] font-medium text-black/70 dark:text-white/70 uppercase tracking-wide">
              Chat Models
            </p>
            {!modelProvider.chatModels.some((m) => m.key === 'error') && (
              <AddModel
                providerId={modelProvider.id}
                setProviders={setProviders}
                type="chat"
              />
            )}
          </div>
          <div className="flex flex-col gap-2">
            {modelProvider.chatModels.some((m) => m.key === 'error') ? (
              <div className="flex flex-row items-center gap-2 text-xs lg:text-xs text-red-500 dark:text-red-400 rounded-lg bg-red-50 dark:bg-red-950/20 px-3 py-2 border border-red-200 dark:border-red-900/30">
                <AlertCircle size={16} className="shrink-0" />
                <span className="break-words">
                  {
                    modelProvider.chatModels.find((m) => m.key === 'error')
                      ?.name
                  }
                </span>
              </div>
            ) : modelProvider.chatModels.filter((m) => m.key !== 'error')
                .length === 0 && !hasError ? (
              <div className="flex flex-col items-center justify-center py-4 px-4 rounded-lg border-2 border-dashed border-light-200 dark:border-dark-200 bg-light-secondary/20 dark:bg-dark-secondary/20">
                <p className="text-xs text-black/50 dark:text-white/50 text-center">
                  No chat models configured
                </p>
              </div>
            ) : modelProvider.chatModels.filter((m) => m.key !== 'error')
                .length > 0 ? (
              <div className="flex flex-row flex-wrap gap-2">
                {modelProvider.chatModels.map((model, index) => {
                  const result = testResults[model.key];
                  const isTesting = testingModel === model.key;
                  return (
                    <div
                      key={`${modelProvider.id}-chat-${model.key}-${index}`}
                      className="flex flex-row items-center space-x-2 text-xs lg:text-xs text-black/70 dark:text-white/70 rounded-lg bg-light-secondary dark:bg-dark-secondary px-3 py-1.5 border border-light-200 dark:border-dark-200"
                    >
                      <ModelProviderIcon
                        provider={modelProvider.type}
                        modelKey={model.key}
                        size={13}
                        className="shrink-0"
                      />
                      <span className="font-medium">{model.name}</span>

                      {/* Test status indicator */}
                      {isTesting && (
                        <Loader2 size={12} className="animate-spin text-sky-500 flex-shrink-0" />
                      )}
                      {!isTesting && result?.success && (
                        <span className="flex items-center space-x-1 text-[10px] text-emerald-500 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          <CheckCircle2 size={11} />
                          <span>{result.latencyMs}ms</span>
                        </span>
                      )}
                      {!isTesting && result && !result.success && (
                        <span
                          title={result.error}
                          className="flex items-center space-x-1 text-[10px] text-red-400 font-mono bg-red-500/10 px-1.5 py-0.5 rounded cursor-help"
                        >
                          <AlertCircle size={11} />
                          <span>
                            {result.error?.match(/HTTP\s+(\d+)/i)?.[0] || 'Error'}
                          </span>
                        </span>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center space-x-1 border-l border-light-200 dark:border-dark-200 pl-1.5 ml-1">
                        <button
                          onClick={() => handleTestModel(model.key)}
                          disabled={isTesting}
                          title={`Test connection with model ${model.key}`}
                          className="hover:text-sky-500 text-black/40 dark:text-white/40 transition-colors p-0.5"
                        >
                          <Play size={10} className="fill-current" />
                        </button>
                        <button
                          onClick={() => {
                            handleModelDelete('chat', model.key);
                          }}
                          className="hover:text-red-500 dark:hover:text-red-400 transition-colors p-0.5"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-y-2">
          <div className="flex flex-row w-full justify-between items-center">
            <p className="text-[11px] lg:text-[11px] font-medium text-black/70 dark:text-white/70 uppercase tracking-wide">
              Embedding Models
            </p>
            {!modelProvider.embeddingModels.some((m) => m.key === 'error') && (
              <AddModel
                providerId={modelProvider.id}
                setProviders={setProviders}
                type="embedding"
              />
            )}
          </div>
          <div className="flex flex-col gap-2">
            {modelProvider.embeddingModels.some((m) => m.key === 'error') ? (
              <div className="flex flex-row items-center gap-2 text-xs lg:text-xs text-red-500 dark:text-red-400 rounded-lg bg-red-50 dark:bg-red-950/20 px-3 py-2 border border-red-200 dark:border-red-900/30">
                <AlertCircle size={16} className="shrink-0" />
                <span className="break-words">
                  {
                    modelProvider.embeddingModels.find((m) => m.key === 'error')
                      ?.name
                  }
                </span>
              </div>
            ) : modelProvider.embeddingModels.filter((m) => m.key !== 'error')
                .length === 0 && !hasError ? (
              <div className="flex flex-col items-center justify-center py-4 px-4 rounded-lg border-2 border-dashed border-light-200 dark:border-dark-200 bg-light-secondary/20 dark:bg-dark-secondary/20">
                <p className="text-xs text-black/50 dark:text-white/50 text-center">
                  No embedding models configured
                </p>
              </div>
            ) : modelProvider.embeddingModels.filter((m) => m.key !== 'error')
                .length > 0 ? (
              <div className="flex flex-row flex-wrap gap-2">
                {modelProvider.embeddingModels.map((model, index) => (
                  <div
                    key={`${modelProvider.id}-embedding-${model.key}-${index}`}
                    className="flex flex-row items-center space-x-1.5 text-xs lg:text-xs text-black/70 dark:text-white/70 rounded-lg bg-light-secondary dark:bg-dark-secondary px-3 py-1.5 border border-light-200 dark:border-dark-200"
                  >
                    <ModelProviderIcon
                      provider={modelProvider.type}
                      modelKey={model.key}
                      size={12}
                      className="shrink-0"
                    />
                    <span>{model.name}</span>
                    <button
                      onClick={() => {
                        handleModelDelete('embedding', model.key);
                      }}
                      className="hover:text-red-500 dark:hover:text-red-400 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelProvider;
