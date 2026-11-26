import React, { useCallback, useEffect, useState } from 'react';
import { Cloud, Cpu, Layers } from 'lucide-react';
import AddProvider from './AddProviderDialog';
import {
  ConfigModelProvider,
  ModelProviderUISection,
  UIConfigField,
} from '@/lib/config/types';
import ModelProvider from './ModelProvider';
import ModelSelect from './ModelSelect';
import OfflineGgufPanel from './OfflineGgufPanel';
import { useChat } from '@/lib/hooks/useChat';

type ModelSettingsTab = 'overview' | 'offline' | 'online';

const Models = ({
  fields,
  values,
}: {
  fields: ModelProviderUISection[];
  values: ConfigModelProvider[];
}) => {
  const [providers, setProviders] = useState<ConfigModelProvider[]>(values);
  const [liveProviders, setLiveProviders] = useState<ConfigModelProvider[]>(values);
  const [activeTab, setActiveTab] = useState<ModelSettingsTab>('overview');
  const { modelMode, setModelMode } = useChat();

  const refreshLiveProviders = useCallback(async () => {
    try {
      const res = await fetch('/api/providers');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.providers)) {
          setLiveProviders(data.providers);
        }
      }
    } catch {
      // fall back to initial values
    }
  }, []);

  useEffect(() => {
    refreshLiveProviders();
  }, [refreshLiveProviders, providers]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Unified Sub-navigation: Active Models | Offline GGUF Engine | Online Providers */}
      <div className="px-6 pt-4 pb-3 border-b border-light-200 dark:border-dark-200 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl p-1 bg-light-secondary dark:bg-dark-secondary border border-light-200 dark:border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'overview'
                ? 'bg-white dark:bg-[#0c1017] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-white/65 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers size={14} />
            Active Models & Mode
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('offline')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'offline'
                ? 'bg-white dark:bg-[#0c1017] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-white/65 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Cpu size={14} />
            Offline Engine & GGUF
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('online')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'online'
                ? 'bg-white dark:bg-[#0c1017] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-white/65 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Cloud size={14} />
            Online & API Providers
          </button>
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 border border-light-200 dark:border-white/10 bg-white dark:bg-[#0c1017]">
          <span className="text-[11px] font-medium text-slate-600 dark:text-white/65 px-1">
            Default Mode:
          </span>
          <button
            type="button"
            onClick={() => setModelMode('offline')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
              modelMode === 'offline'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-700 dark:text-white/75 hover:bg-light-200 dark:hover:bg-white/10'
            }`}
          >
            Offline
          </button>
          <button
            type="button"
            onClick={() => setModelMode('online')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
              modelMode === 'online'
                ? 'bg-sky-600 text-white'
                : 'text-slate-700 dark:text-white/75 hover:bg-light-200 dark:hover:bg-white/10'
            }`}
          >
            Online
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-5 space-y-6">
        {activeTab === 'overview' && (
          <>
            <div className="flex flex-col px-6 gap-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Active Models
                </h3>
                <p className="text-xs text-slate-600 dark:text-white/65 mt-0.5">
                  Choose any installed offline GGUF model, local server (Ollama / LM Studio), or online cloud API provider.
                </p>
              </div>
              <ModelSelect
                providers={liveProviders.filter((p) =>
                  p.chatModels.some((m) => m.key !== 'error'),
                )}
                type="chat"
              />
              <ModelSelect
                providers={liveProviders.filter((p) =>
                  p.embeddingModels.some((m) => m.key !== 'error'),
                )}
                type="embedding"
              />
            </div>

            <div className="border-t border-light-200 dark:border-dark-200" />

            <div className="px-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setActiveTab('offline')}
                className="text-left p-4 rounded-xl border border-light-200 dark:border-white/10 bg-white dark:bg-[#0c1017] hover:border-emerald-500/50 transition"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                  <Cpu size={16} className="text-emerald-500" />
                  Manage Offline GGUF Engine & Models
                </div>
                <p className="text-xs text-slate-600 dark:text-white/60 mt-1">
                  Install llama.cpp, add or download HuggingFace GGUF models, configure GPU layers & context length.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('online')}
                className="text-left p-4 rounded-xl border border-light-200 dark:border-white/10 bg-white dark:bg-[#0c1017] hover:border-sky-500/50 transition"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                  <Cloud size={16} className="text-sky-500" />
                  Manage Online & External Providers
                </div>
                <p className="text-xs text-slate-600 dark:text-white/60 mt-1">
                  Configure OpenAI, Anthropic, Gemini, Groq, OpenRouter, Ollama, or custom OpenAI endpoints.
                </p>
              </button>
            </div>
          </>
        )}

        {activeTab === 'offline' && (
          <OfflineGgufPanel onModelsUpdated={refreshLiveProviders} />
        )}

        {activeTab === 'online' && (
          <>
            <div className="flex flex-row justify-between items-center px-6">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Configured Connections
                </p>
                <p className="text-xs text-slate-600 dark:text-white/65">
                  Manage API keys and endpoints for online providers or local servers (Ollama / LM Studio).
                </p>
              </div>
              <AddProvider modelProviders={fields} setProviders={setProviders} />
            </div>
            <div className="flex flex-col px-6 gap-y-4 pb-6">
              {providers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 rounded-lg border-2 border-dashed border-light-200 dark:border-dark-200 bg-light-secondary/10 dark:bg-dark-secondary/10">
                  <p className="text-sm font-medium text-slate-800 dark:text-white/80 mb-1">
                    No connections yet
                  </p>
                  <p className="text-xs text-slate-600 dark:text-white/60 text-center max-w-sm">
                    Add a connection for OpenAI, Anthropic, Gemini, Ollama, or use the Offline Engine & GGUF tab.
                  </p>
                </div>
              ) : (
                providers.map((provider) => (
                  <ModelProvider
                    key={`provider-${provider.id}`}
                    fields={
                      (fields.find((f) => f.key === provider.type)?.fields ??
                        []) as UIConfigField[]
                    }
                    modelProvider={provider}
                    setProviders={setProviders}
                  />
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Models;
