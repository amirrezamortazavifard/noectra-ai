import React, { useState, useEffect } from 'react';
import { X, Key, ExternalLink, ShieldCheck, Check } from 'lucide-react';
import { DiscoverApiKeys } from '@/lib/services/discover/types';
import { getStoredApiKeys, saveStoredApiKeys } from '@/lib/services/discover/newsApi';
import { openExternalLink } from '@/lib/openExternal';
import { toast } from 'sonner';

interface DiscoverApiKeysModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const DiscoverApiKeysModal: React.FC<DiscoverApiKeysModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const [keys, setKeys] = useState<DiscoverApiKeys>({
    gnews: '',
    newsdata: '',
    currents: '',
    newsapi: '',
  });

  useEffect(() => {
    if (isOpen) {
      setKeys(getStoredApiKeys());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    saveStoredApiKeys(keys);
    toast.success('News API Keys saved successfully');
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-light-primary dark:bg-[#111215] border border-light-200 dark:border-white/10 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-light-200/60 dark:border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
              <Key size={18} />
            </div>
            <div>
              <h2 className="font-semibold text-base text-black dark:text-white">
                Discover API Settings
              </h2>
              <p className="text-xs text-black/50 dark:text-white/50">
                Optional custom API keys for global news providers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Info Banner */}
        <div className="px-6 py-3 bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
          <ShieldCheck size={16} className="flex-shrink-0" />
          <span>
            <strong>Academic APIs are 100% free:</strong> OpenAlex, Semantic Scholar, Crossref, and PubMed require no API keys.
          </span>
        </div>

        {/* Body Form */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* GNews */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-medium text-black/80 dark:text-white/80">
                GNews API Key
              </label>
              <button
                type="button"
                onClick={(e) => openExternalLink('https://gnews.io/', e)}
                className="text-cyan-600 dark:text-cyan-400 hover:underline inline-flex items-center gap-1"
              >
                Get Free Key <ExternalLink size={11} />
              </button>
            </div>
            <input
              type="text"
              placeholder="e.g. 5a1b2c3d..."
              value={keys.gnews || ''}
              onChange={(e) => setKeys({ ...keys, gnews: e.target.value.trim() })}
              className="w-full px-3 py-2 rounded-xl bg-light-secondary dark:bg-[#18191d] border border-light-200 dark:border-white/10 text-sm text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* NewsData.io */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-medium text-black/80 dark:text-white/80">
                NewsData.io API Key
              </label>
              <button
                type="button"
                onClick={(e) => openExternalLink('https://newsdata.io/', e)}
                className="text-cyan-600 dark:text-cyan-400 hover:underline inline-flex items-center gap-1"
              >
                Get Free Key <ExternalLink size={11} />
              </button>
            </div>
            <input
              type="text"
              placeholder="e.g. pub_12345..."
              value={keys.newsdata || ''}
              onChange={(e) => setKeys({ ...keys, newsdata: e.target.value.trim() })}
              className="w-full px-3 py-2 rounded-xl bg-light-secondary dark:bg-[#18191d] border border-light-200 dark:border-white/10 text-sm text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Currents API */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-medium text-black/80 dark:text-white/80">
                Currents API Key
              </label>
              <button
                type="button"
                onClick={(e) => openExternalLink('https://currentsapi.services/en', e)}
                className="text-cyan-600 dark:text-cyan-400 hover:underline inline-flex items-center gap-1"
              >
                Get Free Key <ExternalLink size={11} />
              </button>
            </div>
            <input
              type="text"
              placeholder="e.g. your-currents-api-key..."
              value={keys.currents || ''}
              onChange={(e) => setKeys({ ...keys, currents: e.target.value.trim() })}
              className="w-full px-3 py-2 rounded-xl bg-light-secondary dark:bg-[#18191d] border border-light-200 dark:border-white/10 text-sm text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* NewsAPI.org */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-medium text-black/80 dark:text-white/80">
                NewsAPI.org Key
              </label>
              <button
                type="button"
                onClick={(e) => openExternalLink('https://newsapi.org/', e)}
                className="text-cyan-600 dark:text-cyan-400 hover:underline inline-flex items-center gap-1"
              >
                Get Free Key <ExternalLink size={11} />
              </button>
            </div>
            <input
              type="text"
              placeholder="e.g. 1a2b3c4d5e6f..."
              value={keys.newsapi || ''}
              onChange={(e) => setKeys({ ...keys, newsapi: e.target.value.trim() })}
              className="w-full px-3 py-2 rounded-xl bg-light-secondary dark:bg-[#18191d] border border-light-200 dark:border-white/10 text-sm text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <p className="text-[11px] text-black/40 dark:text-white/40 leading-relaxed pt-2">
            Keys are securely stored in your local application storage. If left blank, curated high-quality RSS news feeds (TechCrunch, The Verge, Wired, Ars Technica, Nature, etc.) are used automatically.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-light-200/60 dark:border-white/[0.08] bg-light-secondary/30 dark:bg-black/20">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm transition-colors"
          >
            <Check size={14} />
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default DiscoverApiKeysModal;
