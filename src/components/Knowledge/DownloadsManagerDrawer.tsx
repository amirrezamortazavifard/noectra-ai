import React, { useState, useMemo } from 'react';
import { DownloadTask, KnowledgeService } from '@/lib/services/knowledge';
import {
  Play,
  Pause,
  X,
  CheckCircle2,
  AlertCircle,
  ArrowDownCircle,
  HardDrive,
  Clock,
  Zap,
  RotateCcw,
  Trash2,
  CheckCheck,
} from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  tasks: DownloadTask[];
  onTasksChanged: () => void;
  onOpenInstalled?: () => void;
}

type FilterTab = 'all' | 'active' | 'paused' | 'completed' | 'failed';

export const DownloadsManagerDrawer: React.FC<Props> = ({
  tasks,
  onTasksChanged,
  onOpenInstalled,
}) => {
  const [filterTab, setFilterTab] = useState<FilterTab>('all');

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

  const calculateEta = (task: DownloadTask) => {
    if (task.status !== 'downloading' || task.speed_bps === 0 || task.total_bytes === 0) {
      return null;
    }
    const remainingBytes = task.total_bytes - task.downloaded_bytes;
    if (remainingBytes <= 0) return null;
    const seconds = Math.ceil(remainingBytes / task.speed_bps);
    if (seconds < 60) return `${seconds}s left`;
    const minutes = Math.ceil(seconds / 60);
    return `${minutes}m left`;
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

  const handlePauseAll = async () => {
    await KnowledgeService.pauseAllDownloads();
    toast.info('Paused all active downloads');
    onTasksChanged();
  };

  const handleResumeAll = async () => {
    await KnowledgeService.resumeAllDownloads();
    toast.info('Resumed all paused downloads');
    onTasksChanged();
  };

  const handleClearCompleted = async () => {
    await KnowledgeService.clearCompletedDownloads();
    toast.success('Cleared completed transfers');
    onTasksChanged();
  };

  const activeCount = tasks.filter(
    (t) => t.status === 'downloading' || t.status === 'queued'
  ).length;
  const pausedCount = tasks.filter((t) => t.status === 'paused').length;
  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const failedCount = tasks.filter((t) => t.status === 'failed').length;

  const filteredTasks = useMemo(() => {
    if (filterTab === 'active') return tasks.filter((t) => t.status === 'downloading' || t.status === 'queued');
    if (filterTab === 'paused') return tasks.filter((t) => t.status === 'paused');
    if (filterTab === 'completed') return tasks.filter((t) => t.status === 'completed');
    if (filterTab === 'failed') return tasks.filter((t) => t.status === 'failed');
    return tasks;
  }, [tasks, filterTab]);

  if (tasks.length === 0) return null;

  return (
    <div className="w-full mb-6 p-4 rounded-2xl bg-white/80 dark:bg-[#0c1017]/85 backdrop-blur-2xl border border-black/[0.08] dark:border-white/[0.08] shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] transition-all space-y-3">
      {/* Drawer Header with Title and Global Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-1 border-b border-black/[0.04] dark:border-white/[0.06] pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center">
            <ArrowDownCircle className={`w-4 h-4 ${activeCount > 0 ? 'animate-pulse' : ''}`} />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <span>Transfer Manager</span>
              <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400">
                {tasks.length} tasks
              </span>
            </h3>
          </div>
        </div>

        {/* Global Bulk Controls (DL-003, DL-009) */}
        <div className="flex items-center gap-2 flex-wrap">
          {activeCount > 0 && (
            <button
              onClick={handlePauseAll}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1 transition-colors"
              title="Pause all ongoing transfers"
            >
              <Pause className="w-3 h-3 text-amber-500" />
              <span>Pause All</span>
            </button>
          )}

          {pausedCount > 0 && (
            <button
              onClick={handleResumeAll}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1 transition-colors"
              title="Resume all paused transfers"
            >
              <Play className="w-3 h-3 text-emerald-500" />
              <span>Resume All</span>
            </button>
          )}

          {completedCount > 0 && (
            <button
              onClick={handleClearCompleted}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1 transition-colors"
              title="Clear completed tasks from queue"
            >
              <CheckCheck className="w-3 h-3 text-sky-500" />
              <span>Clear Done</span>
            </button>
          )}

          {onOpenInstalled && (
            <button
              onClick={onOpenInstalled}
              className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 flex items-center gap-1.5 transition-colors pl-2 border-l border-black/[0.06] dark:border-white/[0.08]"
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>Library</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 px-1 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setFilterTab('all')}
          className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
            filterTab === 'all'
              ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          All ({tasks.length})
        </button>
        <button
          onClick={() => setFilterTab('active')}
          className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
            filterTab === 'active'
              ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Active ({activeCount})
        </button>
        <button
          onClick={() => setFilterTab('paused')}
          className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
            filterTab === 'paused'
              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Paused ({pausedCount})
        </button>
        <button
          onClick={() => setFilterTab('completed')}
          className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
            filterTab === 'completed'
              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Completed ({completedCount})
        </button>
        {failedCount > 0 && (
          <button
            onClick={() => setFilterTab('failed')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
              filterTab === 'failed'
                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Failed ({failedCount})
          </button>
        )}
      </div>

      {/* Task List */}
      <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
        {filteredTasks.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            No transfers in this view.
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isDownloading = task.status === 'downloading';
            const isPaused = task.status === 'paused';
            const isCompleted = task.status === 'completed';
            const isFailed = task.status === 'failed';
            const eta = calculateEta(task);

            return (
              <div
                key={task.id}
                className="p-3 rounded-xl bg-slate-50/80 dark:bg-[#131823]/80 border border-black/[0.05] dark:border-white/[0.06] flex flex-col space-y-2 transition-all"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                    <span
                      className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate"
                      title={task.title || task.file_name}
                    >
                      {task.title || task.file_name}
                    </span>
                    <span
                      className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-md tracking-wider ${
                        isCompleted
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : isFailed
                          ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                          : isPaused
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                          : 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
                      }`}
                    >
                      {task.status}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0">
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
                        className="p-1.5 rounded-lg hover:bg-sky-500/10 text-sky-600 dark:text-sky-400 transition-colors"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {isFailed && (
                      <button
                        onClick={() => handleResume(task.id)}
                        title="Retry download"
                        className="p-1.5 rounded-lg hover:bg-sky-500/10 text-sky-600 dark:text-sky-400 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {!isCompleted && (
                      <button
                        onClick={() => handleCancel(task.id)}
                        title="Cancel download"
                        className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {isCompleted && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    )}
                    {isFailed && (
                      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    )}
                  </div>
                </div>

                {/* Progress Bar with smooth transition */}
                <div className="w-full bg-slate-200/80 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isCompleted
                        ? 'bg-emerald-500'
                        : isFailed
                        ? 'bg-rose-500'
                        : isPaused
                        ? 'bg-amber-500'
                        : 'bg-gradient-to-r from-sky-400 via-sky-500 to-indigo-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, task.progress_pct))}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  <span className="flex items-center gap-1.5">
                    <HardDrive className="w-3 h-3 text-slate-400" />
                    {formatBytes(task.downloaded_bytes)} /{' '}
                    {task.total_bytes > 0 ? formatBytes(task.total_bytes) : 'Unknown'}
                    {task.total_bytes > 0 && ` (${task.progress_pct.toFixed(1)}%)`}
                  </span>

                  <div className="flex items-center gap-3">
                    {isDownloading && task.speed_bps > 0 && (
                      <span className="flex items-center gap-1 text-sky-600 dark:text-sky-400 font-semibold">
                        <Zap className="w-3 h-3" />
                        {formatSpeed(task.speed_bps)}
                      </span>
                    )}
                    {eta && (
                      <span className="flex items-center gap-1 text-slate-400">
                        <Clock className="w-3 h-3" />
                        {eta}
                      </span>
                    )}
                    {task.error_message && (
                      <span className="text-rose-500 font-sans truncate max-w-[220px]" title={task.error_message}>
                        {task.error_message}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
