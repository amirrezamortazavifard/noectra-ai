import Select from '@/components/ui/Select';
import { ConfigModelProvider } from '@/lib/config/types';
import { useChat } from '@/lib/hooks/useChat';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, Loader2, Play } from 'lucide-react';

const ModelSelect = ({
  providers,
  type,
}: {
  providers: ConfigModelProvider[];
  type: 'chat' | 'embedding';
}) => {
  const [selectedModel, setSelectedModel] = useState<string>(
    type === 'chat'
      ? `${localStorage.getItem('chatModelProviderId')}/${localStorage.getItem('chatModelKey')}`
      : `${localStorage.getItem('embeddingModelProviderId')}/${localStorage.getItem('embeddingModelKey')}`,
  );
  const [loading, setLoading] = useState(false);
  const [nineRouterOnline, setNineRouterOnline] = useState<boolean | null>(null);
  const [isStarting9Router, setIsStarting9Router] = useState(false);
  const { setChatModelProvider, setEmbeddingModelProvider } = useChat();

  const selectedProviderId = selectedModel.split('/')[0];
  const selectedProvider = providers.find((p) => p.id === selectedProviderId);
  const is9RouterSelected =
    selectedProvider?.type === '9router' ||
    selectedProvider?.name.toLowerCase().includes('9router') ||
    (selectedProvider?.type === 'custom' &&
      (selectedProvider?.id.includes('9router') || (selectedProvider as any).baseUrl?.includes('20128')));

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
      toast.error('Error launching 9Router', { description: err.message });
      setNineRouterOnline(false);
    } finally {
      setIsStarting9Router(false);
    }
  };

  const handleSave = async (newValue: string) => {
    setLoading(true);
    setSelectedModel(newValue);

    try {
      const providerId = newValue.split('/')[0];
      const modelKey = newValue.split('/').slice(1).join('/');

      const prov = providers.find((p) => p.id === providerId);
      const is9R =
        prov?.type === '9router' ||
        prov?.name.toLowerCase().includes('9router') ||
        (prov?.type === 'custom' && (prov?.id.includes('9router') || (prov as any).baseUrl?.includes('20128')));

      if (is9R) {
        check9RouterStatus();
      }

      if (type === 'chat') {
        localStorage.setItem('chatModelProviderId', providerId);
        localStorage.setItem('chatModelKey', modelKey);

        setChatModelProvider({
          providerId: providerId,
          key: modelKey,
        });
      } else {
        localStorage.setItem('embeddingModelProviderId', providerId);
        localStorage.setItem('embeddingModelKey', modelKey);

        setEmbeddingModelProvider({
          providerId: providerId,
          key: modelKey,
        });
      }
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Failed to save configuration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-xl border border-light-200 bg-light-primary/80 p-4 lg:p-6 transition-colors dark:border-dark-200 dark:bg-dark-primary/80 space-y-3 lg:space-y-4">
      <div>
        <h4 className="text-sm lg:text-sm text-black dark:text-white">
          Select {type === 'chat' ? 'Chat Model' : 'Embedding Model'}
        </h4>
        <p className="text-[11px] lg:text-xs text-black/50 dark:text-white/50">
          {type === 'chat'
            ? 'Choose which model to use for generating responses'
            : 'Choose which model to use for generating embeddings'}
        </p>
      </div>

      <Select
        value={selectedModel}
        onChange={(event) => handleSave(event.target.value)}
        options={
          type === 'chat'
            ? providers.flatMap((provider) =>
                provider.chatModels.map((model) => ({
                  value: `${provider.id}/${model.key}`,
                  label: `${provider.name} - ${model.name}`,
                })),
              )
            : providers.flatMap((provider) =>
                provider.embeddingModels.map((model) => ({
                  value: `${provider.id}/${model.key}`,
                  label: `${provider.name} - ${model.name}`,
                })),
              )
        }
        className="!text-xs lg:!text-[13px]"
        loading={loading}
        disabled={loading}
      />

      {/* 9Router Status Warning & Instant Launcher */}
      {is9RouterSelected && (
        <div>
          {nineRouterOnline === false && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                <AlertTriangle size={15} className="shrink-0 text-amber-500" />
                <span className="leading-tight">
                  9Router service is offline on localhost:20128. Launch it before querying this model.
                </span>
              </div>
              <button
                type="button"
                onClick={handleStart9Router}
                disabled={isStarting9Router}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium text-[11px] shadow-xs flex items-center gap-1.5 transition-all shrink-0 active:scale-95 disabled:opacity-50"
              >
                {isStarting9Router ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Play size={12} className="fill-current" />
                )}
                <span>{isStarting9Router ? 'Starting...' : 'Start 9Router'}</span>
              </button>
            </div>
          )}

          {nineRouterOnline === true && (
            <div className="flex items-center gap-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium px-1">
              <CheckCircle2 size={13} className="shrink-0" />
              <span>9Router gateway service is running and ready on port 20128</span>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default ModelSelect;
