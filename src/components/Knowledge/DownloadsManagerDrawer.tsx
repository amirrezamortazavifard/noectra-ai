import React from 'react';
import { DownloadTask, KnowledgeService } from '@/lib/services/knowledge';
import { Play, Pause, X, CheckCircle, AlertCircle, ArrowDownCircle, HardDrive } from 'lucide-react';

interface Props {
  tasks: DownloadTask[];
  onTasksChanged: () => void;
  onOpenInstalled?: () => void;
}

export const DownloadsManagerDrawer: React.FC<Props> = ({ tasks, onTasksChanged, onOpenInstalled }) => {
  if (tasks.length === 0) return null;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatSpeed = (bps: number) => {
    return `${formatBytes(bps)}/s`;
  };

  const handlePause = async (id: string) => {
    await KnowledgeService.pauseDownload(id);
    onTasksChanged();
  };

  const handleResume = async (id: string) => {
    await KnowledgeService.resumeDownload(id);
    onTasksChanged();
  };

  const handleCancel = async (id: string) => {
    await KnowledgeService.cancelDownload(id);
    onTasksChanged();
  };

  return (
    <div className="w-full mb-6 p-4 rounded-2xl bg-white/80 dark:bg-[#0c1017]/80 backdrop-blur-xl border border-black/[0.08] dark:border-white/[0.08] shadow-lg transition-all">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <ArrowDownCircle className="w-5 h-5 text-sky-500 animate-pulse" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Active & Recent Downloads ({tasks.length})
          </h3>
        </div>
        {onOpenInstalled && (
          <button
            onClick={onOpenInstalled}
            className="text-xs font-medium text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
          >
            <HardDrive className="w-3.5 h-3.5" />
            View Installed Archives
          </button>
        )}
      </div>

      <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
        {tasks.map((task) => {
          const isDownloading = task.status === 'downloading';
          const isPaused = task.status === 'paused';
          const isCompleted = task.status === 'completed';
          const isFailed = task.status === 'failed';

          return (
            <div
              key={task.id}
              className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06] flex flex-col space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 min-w-0 pr-2">
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                    {task.title || task.file_name}
                  </span>
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-slate-600 dark:text-slate-400">
                    {task.status}
                  </span>
                </div>

                <div className="flex items-center space-x-1.5 shrink-0">
                  {isDownloading && (
                    <button
                      onClick={() => handlePause(task.id)}
                      title="Pause download"
                      className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors"
                    >
                      <Pause className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {isPaused && (
                    <button
                      onClick={() => handleResume(task.id)}
                      title="Resume download"
                      className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-sky-600 dark:text-sky-400 transition-colors"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {!isCompleted && (
                    <button
                      onClick={() => handleCancel(task.id)}
                      title="Cancel download"
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {isCompleted && (
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  )}
                  {isFailed && (
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-black/5 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    isCompleted
                      ? 'bg-emerald-500'
                      : isFailed
                      ? 'bg-rose-500'
                      : isPaused
                      ? 'bg-amber-500'
                      : 'bg-gradient-to-r from-sky-500 to-indigo-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, task.progress_pct))}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                <span>
                  {formatBytes(task.downloaded_bytes)} / {task.total_bytes > 0 ? formatBytes(task.total_bytes) : 'Unknown'}
                  {task.total_bytes > 0 && ` (${task.progress_pct.toFixed(1)}%)`}
                </span>
                {isDownloading && task.speed_bps > 0 && (
                  <span className="text-sky-600 dark:text-sky-400 font-semibold">
                    {formatSpeed(task.speed_bps)}
                  </span>
                )}
                {task.error_message && (
                  <span className="text-rose-500 truncate max-w-[200px]" title={task.error_message}>
                    {task.error_message}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

