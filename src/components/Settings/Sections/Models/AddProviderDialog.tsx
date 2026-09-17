import {
  Dialog,
  DialogPanel,
} from '@headlessui/react';
import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronRight, ExternalLink, Globe, Loader2, Plus, Sparkles, Zap } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ConfigModelProvider,
  ModelProviderUISection,
  StringUIConfigField,
  UIConfigField,
} from '@/lib/config/types';
import { PREDEFINED_PROVIDERS, PredefinedProviderDef } from '@/lib/constants/predefinedProviders';
import { toast } from 'sonner';
import ModelProviderIcon from '@/components/ui/ModelProviderIcon';

const AddProvider = ({
  modelProviders = [],
  setProviders,
}: {
  modelProviders?: ModelProviderUISection[];
  setProviders: React.Dispatch<React.SetStateAction<ConfigModelProvider[]>>;
}) => {
  const [open, setOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string>('openai');
  const [config, setConfig] = useState<Record<string, any>>({});
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Map of UI fields coming from backend
  const backendFieldsMap = useMemo(() => {
    const map: Record<string, { name: string; fields: UIConfigField[] }> = {};
    (modelProviders || []).forEach((p) => {
      map[p.key] = {
        name: p.name,
        fields: p.fields,
      };
    });
    return map;
  }, [modelProviders]);

  const currentPredefined: PredefinedProviderDef | undefined = useMemo(() => {
    return PREDEFINED_PROVIDERS.find((p) => p.key === selectedKey);
  }, [selectedKey]);

  // When selected provider changes, initialize name & default fields
  useEffect(() => {
    if (!currentPredefined) return;

    setName(currentPredefined.name);

    const backendFields = backendFieldsMap[selectedKey]?.fields || [];
    const nextConfig: Record<string, any> = {};

    backendFields.forEach((f) => {
      nextConfig[f.key] = f.default ?? '';
    });

    // Provide sensible defaults if not set
    if (!nextConfig['baseURL'] && currentPredefined.baseUrl) {
      nextConfig['baseURL'] = currentPredefined.baseUrl;
    }
    if (!nextConfig['baseUrl'] && currentPredefined.baseUrl) {
      nextConfig['baseUrl'] = currentPredefined.baseUrl;
    }

    setConfig(nextConfig);
  }, [selectedKey, currentPredefined, backendFieldsMap]);

  const activeFields = useMemo(() => {
    return backendFieldsMap[selectedKey]?.fields || [];
  }, [selectedKey, backendFieldsMap]);

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      const res = await fetch('/api/providers/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedKey,
          config: config,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Connection successful! (${data.latencyMs}ms)`, {
          description: data.model ? `Model response: ${data.model}` : undefined,
        });
      } else {
        toast.error(`Connection test failed`, {
          description: data.error || 'No response received from provider',
          duration: 8000,
        });
      }
    } catch (err: any) {
      toast.error(`Network error during connection test`, {
        description: err.message,
        duration: 8000,
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/providers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: selectedKey,
          name: name.trim() || currentPredefined?.name || 'AI Provider',
          config: config,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Failed to add provider');
      }

      const resData = await res.json();
      const data: ConfigModelProvider = resData.provider || resData;

      setProviders((prev) => [...prev, data]);
      toast.success(`Service ${name} added successfully.`);
      setOpen(false);
    } catch (error: any) {
      console.error('Error adding provider:', error);
      toast.error(error.message || 'Failed to add connection.');
    } finally {
      setLoading(false);
    }
  };

  const filteredProviders = useMemo(() => {
    if (!searchQuery.trim()) return PREDEFINED_PROVIDERS;
    const q = searchQuery.toLowerCase();
    return PREDEFINED_PROVIDERS.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.key.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-xs font-medium border border-light-200 dark:border-dark-200 text-black dark:text-white bg-light-secondary/50 dark:bg-dark-secondary/50 hover:bg-light-secondary hover:dark:bg-dark-secondary hover:border-light-300 hover:dark:border-dark-300 flex flex-row items-center space-x-1.5 active:scale-95 transition duration-200"
      >
        <Plus className="w-3.5 h-3.5 md:w-4 md:h-4 text-sky-500" />
        <span>Add Connection</span>
      </button>

      <AnimatePresence>
        {open && (
          <Dialog
            static
            open={open}
            onClose={() => setOpen(false)}
            className="relative z-[60]"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 flex w-screen items-center justify-center p-4 bg-black/50 backdrop-blur-md"
            >
              <DialogPanel className="w-full max-w-4xl h-[620px] flex flex-col border bg-light-primary dark:bg-[#0d1117] border-light-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden text-black dark:text-white">
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-light-200 dark:border-white/10 bg-light-secondary/20 dark:bg-white/[0.02]">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-500">
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold tracking-tight">
                        Add AI Model Connection
                      </h3>
                      <p className="text-[11px] text-black/50 dark:text-white/40">
                        Choose from 14 global cloud providers and offline local engines
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="text-xs text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white px-2 py-1 rounded-md transition"
                  >
                    Close
                  </button>
                </div>

                {/* 2-Column Body */}
                <div className="flex flex-1 overflow-hidden">
                  
                  {/* Left Column: Provider Selection Grid / List */}
                  <div className="w-[300px] border-r border-light-200 dark:border-white/10 flex flex-col bg-light-secondary/10 dark:bg-black/20">
                    <div className="p-3 border-b border-light-200 dark:border-white/10">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search providers..."
                        className="w-full px-3 py-1.5 text-xs rounded-lg bg-light-primary dark:bg-white/5 border border-light-200 dark:border-white/10 placeholder:text-black/30 dark:placeholder:text-white/30 focus:outline-none focus:border-sky-500 transition"
                      />
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                      {filteredProviders.map((p) => {
                        const isSelected = p.key === selectedKey;
                        return (
                          <button
                            key={p.key}
                            type="button"
                            onClick={() => setSelectedKey(p.key)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition duration-150 ${
                              isSelected
                                ? 'bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-300 font-medium border border-sky-500/30'
                                : 'hover:bg-light-200/60 hover:dark:bg-white/5 text-black/70 dark:text-white/70 border border-transparent'
                            }`}
                          >
                            <div className="flex items-center space-x-2.5 overflow-hidden">
                              <ModelProviderIcon provider={p.key} size={15} showBackground />
                              <span className="truncate">{p.name}</span>
                            </div>
                            {isSelected && <ChevronRight size={14} className="shrink-0 text-sky-500" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Column: Configuration & Documentation */}
                  <div className="flex-1 flex flex-col overflow-hidden bg-light-primary dark:bg-[#0d1117]">
                    <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                      
                      {/* Provider info card */}
                      {currentPredefined && (
                        <div className="px-6 py-4 border-b border-light-200 dark:border-white/5 bg-light-secondary/20 dark:bg-white/[0.01] flex items-center justify-between">
                          <div>
                            <div className="flex items-center space-x-2.5">
                              <ModelProviderIcon provider={currentPredefined.key} size={18} showBackground />
                              <h4 className="text-sm font-semibold text-black dark:text-white">
                                {currentPredefined.name}
                              </h4>
                            </div>
                            <p className="text-xs text-black/60 dark:text-white/50 mt-1">
                              {currentPredefined.description}
                            </p>
                          </div>

                          {currentPredefined.docsUrl && (
                            <a
                              href={currentPredefined.docsUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-sky-500 hover:underline flex items-center space-x-1 shrink-0 bg-sky-500/10 px-2.5 py-1 rounded-lg"
                            >
                              <span>Get API Key</span>
                              <ExternalLink size={11} />
                            </a>
                          )}
                        </div>
                      )}

                      {/* Fields */}
                      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                        {/* Name field */}
                        <div className="flex flex-col space-y-1.5">
                          <label className="text-xs font-medium text-black/80 dark:text-white/80">
                            Connection Name*
                          </label>
                          <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full rounded-xl border border-light-200 dark:border-white/10 bg-light-secondary/30 dark:bg-white/5 px-3.5 py-2.5 text-xs text-black/90 dark:text-white/90 placeholder:text-black/30 dark:placeholder:text-white/30 focus-visible:outline-none focus-visible:border-sky-500 transition"
                            placeholder="e.g. My Primary OpenAI"
                            required
                          />
                        </div>

                        {/* Dynamic fields from backend config */}
                        {activeFields.map((field) => (
                          <div key={field.key} className="flex flex-col space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-medium text-black/80 dark:text-white/80">
                                {field.name}
                                {field.required && ' *'}
                              </label>
                              <span className="text-[10px] text-black/40 dark:text-white/30">
                                {field.key}
                              </span>
                            </div>
                            <input
                              type={field.type === 'password' ? 'password' : 'text'}
                              value={config[field.key] ?? field.default ?? ''}
                              onChange={(e) =>
                                setConfig((prev) => ({
                                  ...prev,
                                  [field.key]: e.target.value,
                                }))
                              }
                              placeholder={
                                (field as StringUIConfigField).placeholder ||
                                (field.key === 'apiKey'
                                  ? currentPredefined?.apiKeyPlaceholder
                                  : undefined)
                              }
                              required={field.required}
                              className="w-full rounded-xl border border-light-200 dark:border-white/10 bg-light-secondary/30 dark:bg-white/5 px-3.5 py-2.5 text-xs text-black/90 dark:text-white/90 placeholder:text-black/30 dark:placeholder:text-white/30 focus-visible:outline-none focus-visible:border-sky-500 transition font-mono"
                            />
                            {field.description && (
                              <p className="text-[11px] text-black/50 dark:text-white/40">
                                {field.description}
                              </p>
                            )}
                          </div>
                        ))}

                        {/* Preloaded models info preview */}
                        {currentPredefined && currentPredefined.defaultChatModels.length > 0 && (
                          <div className="pt-2">
                            <label className="text-[11px] font-medium text-black/60 dark:text-white/50 mb-1.5 block">
                              Default models loaded after connection:
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                              {currentPredefined.defaultChatModels.map((m) => (
                                <span
                                  key={m.key}
                                  className="text-[10px] font-mono px-2 py-1 rounded-md bg-light-secondary/60 dark:bg-white/5 text-black/70 dark:text-white/70 border border-light-200 dark:border-white/10"
                                >
                                  {m.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Footer Actions */}
                      <div className="px-6 py-4 border-t border-light-200 dark:border-white/10 bg-light-secondary/10 dark:bg-black/20 flex justify-between items-center">
                        <button
                          type="button"
                          disabled={testing || loading}
                          onClick={handleTestConnection}
                          className="px-3.5 py-2 rounded-xl text-xs font-medium border border-light-200 dark:border-white/15 text-black/80 dark:text-white/80 hover:bg-light-200 hover:dark:bg-white/5 flex items-center space-x-1.5 active:scale-95 transition disabled:opacity-50"
                        >
                          {testing ? (
                            <Loader2 className="animate-spin text-sky-500" size={14} />
                          ) : (
                            <Zap size={14} className="text-sky-500" />
                          )}
                          <span>Test Connection (Ping)</span>
                        </button>

                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => setOpen(false)}
                            className="px-3.5 py-2 rounded-xl text-xs text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 rounded-xl text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-white shadow-md active:scale-95 transition disabled:opacity-50 flex items-center space-x-1.5"
                          >
                            {loading ? (
                              <Loader2 className="animate-spin" size={14} />
                            ) : (
                              <Check size={14} />
                            )}
                            <span>Save Connection</span>
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              </DialogPanel>
            </motion.div>
          </Dialog>
        )}
      </AnimatePresence>
    </>
  );
};

export default AddProvider;
