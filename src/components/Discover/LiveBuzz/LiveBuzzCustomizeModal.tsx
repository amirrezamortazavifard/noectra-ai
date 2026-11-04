import React from 'react';
import { X, Check, Plus, Layers, GripVertical } from 'lucide-react';
import { LiveBuzzSourceMeta } from '@/lib/services/discover/liveBuzzApi';

interface LiveBuzzCustomizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableSources: LiveBuzzSourceMeta[];
  activeColumnIds: string[];
  onToggleColumn: (id: string) => void;
  onResetDefault: () => void;
}

export const LiveBuzzCustomizeModal: React.FC<LiveBuzzCustomizeModalProps> = ({
  isOpen,
  onClose,
  availableSources,
  activeColumnIds,
  onToggleColumn,
  onResetDefault,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm select-none text-xs">
      <div className="relative w-[500px] max-w-[95vw] bg-white dark:bg-[#121721] rounded-3xl border border-black/10 dark:border-white/10 shadow-2xl p-6 flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.08] pb-3">
          <div className="flex items-center space-x-2">
            <Layers size={18} className="text-sky-500" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Customize Live Buzz Dashboard
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-[11px] text-black/60 dark:text-white/60">
          Pin or unpin real-time streaming columns. In the dashboard, you can also drag and drop columns to reorder your view.
        </p>

        {/* Sources List */}
        <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
          {availableSources.map((source) => {
            const isActive = activeColumnIds.includes(source.id);
            return (
              <div
                key={source.id}
                onClick={() => onToggleColumn(source.id)}
                className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                  isActive
                    ? 'bg-sky-500/10 border-sky-500/30 text-sky-600 dark:text-sky-300 font-semibold shadow-sm'
                    : 'bg-black/[0.02] dark:bg-white/[0.02] border-black/5 dark:border-white/5 text-slate-700 dark:text-slate-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.04]'
                }`}
              >
                <div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center space-x-2">
                    <span>{source.name}</span>
                    <span className="text-[9px] font-normal uppercase px-1.5 py-0.2 rounded-full bg-black/[0.05] dark:bg-white/[0.06] text-black/60 dark:text-white/60">
                      {source.category}
                    </span>
                  </div>
                  <div className="text-[11px] text-black/50 dark:text-white/50 font-normal mt-0.5">
                    {source.description}
                  </div>
                </div>

                <div
                  className={`w-6 h-6 rounded-xl flex items-center justify-center transition-all ${
                    isActive
                      ? 'bg-sky-500 text-white'
                      : 'border border-black/20 dark:border-white/20'
                  }`}
                >
                  {isActive && <Check size={14} className="stroke-[2.5]" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
          <button
            onClick={onResetDefault}
            className="text-[11px] text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white underline transition-colors"
          >
            Reset to default columns
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-sky-500 text-white font-semibold hover:bg-sky-600 transition-all shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

