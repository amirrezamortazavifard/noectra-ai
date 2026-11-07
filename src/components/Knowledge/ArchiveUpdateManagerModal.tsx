import React, { useState, useEffect } from 'react';
import {
  KnowledgeService,
  ArchiveVersionItem,
  ArchiveUpdateCheckResult,
} from '@/lib/services/knowledge';
import {
  RefreshCw,
  X,
  History,
  Download,
  AlertCircle,
  CheckCircle2,
  HardDrive,
  Calendar,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  onClose: () => void;
}

export const ArchiveUpdateManagerModal: React.FC<Props> = ({ onClose }) => {
  const [loading, setLoading] = useState(false);
  const [updateResults, setUpdateResults] = useState<ArchiveUpdateCheckResult | null>(null);
  const [versionHistory, setVersionHistory] = useState<ArchiveVersionItem[]>([]);
  const [activeTab, setActiveTab] = useState<'available' | 'history'>('available');

  useEffect(() => {
    checkUpdates();
    loadVersionHistory();
  }, []);

  const checkUpdates = async () => {
    setLoading(true);
    try {
      const res = await KnowledgeService.checkArchiveUpdates();
      setUpdateResults(res);
    } catch (e: any) {
      toast.error(`Update check failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadVersionHistory = async () => {
    try {
      const hist = await KnowledgeService.fetchArchiveVersionHistory();
      setVersionHistory(hist);
    } catch {
      setVersionHistory([]);
    }
  };

  const handleStartUpdateDownload = async (update: any) => {
    if (!update.download_url) {
      toast.error('No download URL available for this archive version');
      return;
    }
    try {
      await KnowledgeService.startDownload({
        id: update.archive_id,
        title: update.title,
        download_url: update.download_url,
        description: '',
        language: '',
        category: '',
        size_bytes: Math.round(update.size_mb * 1024 * 1024),
        tags: [],
        is_installed: false,
      });
      toast.success(`Download started for new version of ${update.title}`);
      onClose();
    } catch (e: any) {
      toast.error(`Failed to initiate download: ${e.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white dark:bg-[#121620] rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden max-h-[85vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-sky-50 dark:bg-sky-500/10 text-sky-500">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Archive Update Manager (UPD-001 to UPD-003)
              </h3>
              <p className="text-xs text-slate-500">
                Check Kiwix OPDS catalogs for newer releases and manage archive backup retention.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center space-x-2 px-6 pt-3 border-b border-slate-200 dark:border-white/10">
          <button
            onClick={() => setActiveTab('available')}
            className={`pb-2.5 text-xs font-semibold border-b-2 transition ${
              activeTab === 'available'
                ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Available Updates ({updateResults?.updates_found || 0})
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`pb-2.5 text-xs font-semibold border-b-2 transition ${
              activeTab === 'history'
                ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Version History & Retention ({versionHistory.length})
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === 'available' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  {updateResults?.checked_at
                    ? `Last checked: ${new Date(updateResults.checked_at).toLocaleTimeString()}`
                    : 'Checking remote catalog...'}
                </span>
                <button
                  onClick={checkUpdates}
                  disabled={loading}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center space-x-1.5 transition disabled:opacity-40"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Re-check Now</span>
                </button>
              </div>

              {loading ? (
                <div className="py-16 text-center text-xs text-slate-400 space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-sky-500" />
                  <p>Comparing installed library archives against remote OPDS catalog...</p>
                </div>
              ) : !updateResults || updateResults.updates_found === 0 ? (
                <div className="py-16 text-center text-xs text-slate-400 space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    All Archives are Up to Date
                  </h4>
                  <p className="max-w-xs mx-auto">
                    Your installed ZIM knowledge bases match the latest editions available in the Kiwix repository.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {updateResults.updates.map((upd, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-between gap-4"
                    >
                      <div className="space-y-1 truncate">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {upd.title}
                        </h4>
                        <p className="text-xs text-slate-500">
                          Current: {upd.current_date || 'Unknown'} → <strong className="text-emerald-500">New: {upd.new_version_date}</strong> ({upd.size_mb.toFixed(1)} MB)
                        </p>
                      </div>

                      <button
                        onClick={() => handleStartUpdateDownload(upd)}
                        className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold flex items-center space-x-1.5 transition shadow-sm shrink-0"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Update & Replace</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {versionHistory.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No previous archive versions recorded.
                </div>
              ) : (
                versionHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-between text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {item.archiveId}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                          {item.versionTag}
                        </span>
                        {item.isCurrent && (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 font-semibold">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Released: {item.releaseDate} • Retention: {item.retentionStatus}
                      </p>
                    </div>

                    <div className="text-[11px] font-mono text-slate-500">
                      {(item.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

