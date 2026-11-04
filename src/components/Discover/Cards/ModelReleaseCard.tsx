'use client';

import React from 'react';
import {
  ExternalLink,
  Download,
  Tag,
  Sparkles,
  BookOpen,
  Bookmark,
  MessageSquare,
  Layers,
  Heart,
} from 'lucide-react';
import { toast } from 'sonner';
import { openExternalLink } from '@/lib/openExternal';
import { cn } from '@/lib/utils';

interface ModelReleaseCardProps {
  item: {
    id: string;
    modelId?: string;
    author?: string;
    description?: string;
    pipeline_tag?: string;
    downloads?: number;
    likes?: number;
    tags?: string[];
    createdAt?: string;
    isDataset?: boolean;
  };
  onDiscuss?: (modelName: string) => void;
  onSave?: (id: string) => void;
  isSaved?: boolean;
}

export const ModelReleaseCard: React.FC<ModelReleaseCardProps> = ({
  item,
  onDiscuss,
  onSave,
  isSaved,
}) => {
  const modelName = item.id || item.modelId || 'Unnamed Model';
  const repoUrl = `https://huggingface.co/${modelName}`;

  const handleOpenRepo = (e: React.MouseEvent) => {
    e.stopPropagation();
    openExternalLink(repoUrl, e);
  };

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(modelName);
    toast.success('Model repository ID copied to clipboard');
  };

  return (
    <div className="flex flex-col rounded-2xl bg-white/80 dark:bg-[#0f1420]/80 backdrop-blur-md border border-slate-200/80 dark:border-white/[0.08] hover:border-amber-500/40 dark:hover:border-amber-500/35 p-5 transition-all duration-200 shadow-sm hover:shadow-md group">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25 inline-flex items-center gap-1">
            <span>🤗</span>
            <span>{item.isDataset ? 'Hugging Face Dataset' : 'Hugging Face Model'}</span>
          </span>

          {item.pipeline_tag && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 border border-black/5 dark:border-white/10">
              {item.pipeline_tag}
            </span>
          )}
        </div>

        {item.downloads !== undefined && (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-500 dark:text-slate-400">
            <Download size={12} />
            <span>{item.downloads.toLocaleString()}</span>
          </span>
        )}
      </div>

      {/* Model Name */}
      <h3
        onClick={handleOpenRepo}
        className="text-base sm:text-lg font-mono font-medium text-slate-900 dark:text-white mb-2 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors cursor-pointer break-all"
      >
        <span className="hover:underline inline-flex items-center gap-1.5">
          <span>{modelName}</span>
          <ExternalLink
            size={13}
            className="opacity-0 group-hover:opacity-70 transition-opacity flex-shrink-0"
          />
        </span>
      </h3>

      {/* Description or Pipeline */}
      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4 line-clamp-2 flex-1">
        {item.description ||
          `Open-source release hosted on Hugging Face Hub. Available for inference, fine-tuning, and research reproducibility.`}
      </p>

      {/* Tags */}
      {item.tags && item.tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 mb-4">
          {item.tags.slice(0, 4).map((tag, idx) => (
            <span
              key={idx}
              className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 border border-black/5 dark:border-white/5"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer Action Row */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-200/70 dark:border-white/10 text-xs">
        <div className="flex items-center gap-2">
          {onDiscuss && (
            <button
              type="button"
              onClick={() => onDiscuss(modelName)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/20 transition-colors active:scale-95"
            >
              <MessageSquare size={12} />
              <span>Discuss Architecture</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopyId}
            className="px-2 py-1 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-black dark:hover:text-white transition-colors"
          >
            Copy ID
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {item.likes !== undefined && item.likes > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-rose-500 mr-1">
              <Heart size={11} fill="currentColor" />
              <span>{item.likes}</span>
            </span>
          )}

          <button
            type="button"
            title="Open on Hugging Face"
            onClick={handleOpenRepo}
            className="p-1.5 rounded-lg hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-500/10 transition-colors text-slate-500 dark:text-slate-400"
          >
            <ExternalLink size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModelReleaseCard;

