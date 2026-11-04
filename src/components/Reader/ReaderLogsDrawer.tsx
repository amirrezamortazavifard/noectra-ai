import React from 'react';
import { X, Trash2, Bell, AlertCircle, AlertTriangle, Info, Newspaper } from 'lucide-react';
import { FeedLog } from '@/lib/reader/types';

interface ReaderLogsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  logs: FeedLog[];
  onClearLogs: () => void;
}

export default function ReaderLogsDrawer({
  isOpen,
  onClose,
  logs,
  onClearLogs,
}: ReaderLogsDrawerProps) {
  if (!isOpen) return null;

  const renderIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'failure':
        return <AlertCircle size={15} className="text-rose-500 shrink-0" />;
      case 'warning':
        return <AlertTriangle size={15} className="text-amber-500 shrink-0" />;
      case 'article':
        return <Newspaper size={15} className="text-sky-500 shrink-0" />;
      default:
        return <Info size={15} className="text-emerald-500 shrink-0" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm transition-opacity">
      <div className="w-96 h-full bg-white dark:bg-[#10141d] border-l border-black/10 dark:border-white/10 shadow-2xl flex flex-col text-xs">
        {/* Header */}
        <div className="p-4 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell size={16} className="text-sky-500" />
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
              Activity & Diagnostic Logs
            </h3>
          </div>
          <div className="flex items-center space-x-1">
            {logs.length > 0 && (
              <button
                onClick={onClearLogs}
                title="Clear all logs"
                className="p-1.5 rounded-lg text-black/50 dark:text-white/50 hover:text-rose-500 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
              >
                <Trash2 size={14} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-all"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* List of logs */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-black/40 dark:text-white/40 py-20">
              <Bell size={36} className="mb-2 stroke-1 opacity-50" />
              <p className="font-medium">No activity logged yet</p>
            </div>
          ) : (
            logs.map((log, index) => (
              <div
                key={log.id || index}
                className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.06] space-y-1"
              >
                <div className="flex items-start justify-between space-x-2">
                  <div className="flex items-center space-x-1.5">
                    {renderIcon(log.logType)}
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {log.title}
                    </span>
                  </div>
                  <span className="text-[10px] text-black/40 dark:text-white/40 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                {log.details && (
                  <p className="text-[11px] text-black/60 dark:text-white/60 pl-5 leading-relaxed">
                    {log.details}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

