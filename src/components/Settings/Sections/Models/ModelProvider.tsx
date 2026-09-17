import { UIConfigField, ConfigModelProvider } from '@/lib/config/types';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Loader2, Play, Plug2, Plus, Pencil, Trash2, X, Zap } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import AddModel from './AddModelDialog';
import UpdateProvider from './UpdateProviderDialog';
import DeleteProvider from './DeleteProviderDialog';

import { PREDEFINED_PROVIDERS } from '@/lib/constants/predefinedProviders';
import ModelProviderIcon from '@/components/ui/ModelProviderIcon';

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

  const providerMeta = PREDEFINED_PROVIDERS.find((p) => p.key === modelProvider.type);

  const handleTestModel = async (modelKey: string) => {
    try {
      setTestingModel(modelKey);
      const res = await fetch(`/api/providers/${modelProvider.id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelKey }),
      });
      const data = await res.json();
      setTestResults((prev) => ({ ...prev, [modelKey]: data }));
      if (data.success) {
        toast.success(`Connection to model ${modelKey} was successful`, {
          description: `Latency: ${data.latencyMs}ms`,
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
    try {
      setIsTestingProvider(true);
      const firstModel = modelProvider.chatModels[0]?.key;
      const res = await fetch(`/api/providers/${modelProvider.id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(firstModel ? { model: firstModel } : {}),
      });
      const data = await res.json();
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
