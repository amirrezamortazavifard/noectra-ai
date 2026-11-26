import React, { useCallback, useEffect, useState } from 'react';
import { Cloud, Cpu, Download, HardDrive, Layers, Sliders } from 'lucide-react';
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

export type ModelSettingsTab = 'overview' | 'models' | 'download' | 'engine' | 'online';

function normalizeModelsTab(tab: string | null | undefined): ModelSettingsTab {
  if (!tab) return 'overview';
  if (tab === 'offline') return 'models';
  if (['overview', 'models', 'download', 'engine', 'online'].includes(tab)) {
    return tab as ModelSettingsTab;
  }
  return 'overview';
}

const Models = ({
  fields,
  values,
}: {
  fields: ModelProviderUISection[];
  values: ConfigModelProvider[];
}) => {
  const [providers, setProviders] = useState<ConfigModelProvider[]>(values);
  const [liveProviders, setLiveProviders] = useState<ConfigModelProvider[]>(values);
  const [activeTab, setActiveTab] = useState<ModelSettingsTab>(() => {
    const saved = sessionStorage.getItem('settingsModelsTab');
    if (saved) sessionStorage.removeItem('settingsModelsTab');
    return normalizeModelsTab(saved);
  });
  const { modelMode, setModelMode } = useChat();

  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail) {
        setActiveTab(normalizeModelsTab(e.detail));
      }
    };
    window.addEventListener('models-tab-change', handler);
    return () => window.removeEventListener('models-tab-change', handler);
  }, []);

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

  const tabs: { id: ModelSettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <Layers size={14} /> },
    { id: 'models', label: 'My GGUF Models', icon: <HardDrive size={14} /> },
    { id: 'download', label: 'Download Models', icon: <Download size={14} /> },
    { id: 'engine', label: 'Engine & Hardware', icon: <Sliders size={14} /> },
    { id: 'online', label: 'Online APIs', icon: <Cloud size={14} /> },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Structured 5-tab navigation + Default Chat Mode switch */}
      <div className="px-6 pt-4 pb-3 border-b border-light-200 dark:border-dark-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 rounded-xl p-1 bg-light-secondary dark:bg-dark-secondary border border-light-200 dark:border-white/10">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-[#0c1017] text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-white/65 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
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
            <OfflineGgufPanel
              view="overview-status"
              onModelsUpdated={refreshLiveProviders}
              onNavigateTab={setActiveTab}
            />

            <div className="flex flex-col px-6 gap-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Active Models
                </h3>
                <p className="text-xs text-slate-600 dark:text-white/65 mt-0.5">
                  Choose your default Offline GGUF model, local server (Ollama / LM Studio), or Online API provider. In Chat, Offline models load automatically when you send a prompt.
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

            <div className="px-6 grid grid-cols-1 sm:grid-cols-2 gap-3 pb-4">
              <button
                type="button"
                onClick={() => setActiveTab('models')}
                className="text-left p-4 rounded-xl border border-light-200 dark:border-white/10 bg-white dark:bg-[#0c1017] hover:border-emerald-500/50 transition"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                  <HardDrive size={16} className="text-emerald-500" />
                  My GGUF Models
                </div>
                <p className="text-xs text-slate-600 dark:text-white/60 mt-1">
                  Browse scanned local folders, add `.gguf` files, select models for chat, or warm-start the engine.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('download')}
                className="text-left p-4 rounded-xl border border-light-200 dark:border-white/10 bg-white dark:bg-[#0c1017] hover:border-sky-500/50 transition"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                  <Download size={16} className="text-sky-500" />
                  Download Offline Models
                </div>
                <p className="text-xs text-slate-600 dark:text-white/60 mt-1">
                  Search HuggingFace GGUF repositories or install recommended offline models with one click.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('engine')}
                className="text-left p-4 rounded-xl border border-light-200 dark:border-white/10 bg-white dark:bg-[#0c1017] hover:border-amber-500/50 transition"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                  <Cpu size={16} className="text-amber-500" />
                  Engine & Hardware
                </div>
                <p className="text-xs text-slate-600 dark:text-white/60 mt-1">
                  Manage llama.cpp CUDA / Vulkan runtimes, GPU layer offload, context size, and server logs.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('online')}
                className="text-left p-4 rounded-xl border border-light-200 dark:border-white/10 bg-white dark:bg-[#0c1017] hover:border-indigo-500/50 transition"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                  <Cloud size={16} className="text-indigo-500" />
                  Online & External Providers
                </div>
                <p className="text-xs text-slate-600 dark:text-white/60 mt-1">
                  Configure OpenAI, Anthropic, Gemini, Groq, OpenRouter, Ollama, or custom endpoints.
                </p>
              </button>
            </div>
          </>
        )}

        {activeTab === 'models' && (
          <OfflineGgufPanel
            view="models"
            onModelsUpdated={refreshLiveProviders}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'download' && (
          <OfflineGgufPanel
            view="download"
            onModelsUpdated={refreshLiveProviders}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'engine' && (
          <OfflineGgufPanel
            view="engine"
            onModelsUpdated={refreshLiveProviders}
            onNavigateTab={setActiveTab}
          />
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
