import React, { useState } from 'react';
import { ZimLibraryItem, KnowledgeService } from '@/lib/services/knowledge';
import {
  BookOpen,
  Trash2,
  Plus,
  HardDrive,
  FileText,
  ExternalLink,
  Search,
  CheckCircle2,
  FolderOpen,
} from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  archives: ZimLibraryItem[];
  onRefresh: () => void;
  onOpenReader: (archiveId: string) => void;
}

export const InstalledLibraryView: React.FC<Props> = ({
  archives,
  onRefresh,
  onOpenReader,
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPath, setImportPath] = useState(
    'C:\\Users\\Fard\\Downloads\\wikipedia_fa_medicine_nopic_2026-10.zim'
  );
  const [copyToLibrary, setCopyToLibrary] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleDelete = async (archive: ZimLibraryItem) => {
    if (confirm(`Are you sure you want to remove "${archive.title}" from your library?`)) {
      try {
        const ok = await KnowledgeService.deleteArchive(archive.file_name);
        if (ok) {
          toast.success(`Removed "${archive.title}"`);
          onRefresh();
        } else {
          toast.error('Failed to remove archive');
        }
      } catch (e: any) {
        toast.error(`Error deleting archive: ${e.message}`);
      }
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importPath.trim()) return;

    setIsImporting(true);
    try {
      toast.info('Validating and reading ZIM archive...');
      const item = await KnowledgeService.importLocalZim(importPath.trim(), copyToLibrary);
      toast.success(`Successfully imported "${item.title}" (${item.article_count} articles)!`);
      setShowImportModal(false);
      onRefresh();
    } catch (err: any) {
      toast.error(`Failed to import ZIM: ${err.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const filteredArchives = archives.filter(
    (a) =>
      a.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
      a.file_name.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="w-full space-y-6">
      {/* Top Header & Actions */}
      <div className="p-4 rounded-2xl bg-white/70 dark:bg-[#0c1017]/75 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter installed archives..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-100/80 dark:bg-white/[0.05] border border-black/[0.04] dark:border-white/[0.08] text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
          />
        </div>

        <button
          onClick={() => setShowImportModal(true)}
          className="w-full sm:w-auto px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold shadow-md shadow-sky-500/20 transition-all flex items-center justify-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Import Local .zim File
        </button>
      </div>

      {/* Archives Grid */}
      {filteredArchives.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] space-y-3">
          <HardDrive className="w-12 h-12 text-slate-400 mx-auto opacity-50" />
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
            No ZIM archives installed yet
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            You can search and download archives directly from the <strong>Discover Catalog</strong> tab, or click "Import Local .zim File" to add any existing .zim file from your computer.
          </p>
          <div className="pt-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
            >
              <FolderOpen className="w-4 h-4" />
              Import existing .zim file
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredArchives.map((archive) => (
            <div
              key={archive.file_name}
              className="group p-5 rounded-2xl bg-white/70 dark:bg-[#0c1017]/75 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.06] hover:border-sky-500/30 transition-all flex flex-col justify-between shadow-sm hover:shadow-md"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/20 dark:to-teal-500/20 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    {archive.is_external && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        Linked File
                      </span>
                    )}
                    <button
                      onClick={() => handleDelete(archive)}
                      title="Delete / Unlink archive"
                      className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h4
                  className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-1 mb-1"
                  title={archive.title}
                >
                  {archive.title}
                </h4>
                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate mb-3" title={archive.file_path}>
                  {archive.file_path}
                </p>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-600 dark:text-slate-400 p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.04] mb-4">
                  <div className="flex items-center gap-1.5">
                    <HardDrive className="w-3 h-3 text-slate-400" />
                    <span>{formatBytes(archive.file_size)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3 h-3 text-slate-400" />
                    <span>{archive.article_count.toLocaleString()} articles</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onOpenReader(archive.id || archive.file_name)}
                className="w-full py-2 px-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm shadow-sky-500/20 transition-all"
              >
                <BookOpen className="w-3.5 h-3.5" />
                Browse & Read Articles
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-white dark:bg-[#0c1017] border border-black/[0.08] dark:border-white/[0.08] shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-sky-500" />
                Import Existing ZIM Archive
              </h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Provide the absolute path to a .zim file on your computer. The engine will inspect its metadata, read article listings, and make it available in your offline library.
            </p>

            <form onSubmit={handleImportSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Local File Path:
                </label>
                <input
                  type="text"
                  value={importPath}
                  onChange={(e) => setImportPath(e.target.value)}
                  placeholder="e.g. C:\Users\YourName\Downloads\archive.zim"
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.08] text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  required
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="copyZim"
                  checked={copyToLibrary}
                  onChange={(e) => setCopyToLibrary(e.target.checked)}
                  className="rounded border-slate-300 text-sky-500 focus:ring-sky-500/40"
                />
                <label htmlFor="copyZim" className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                  Copy file into application's AppData directory (recommended if file is in Downloads)
                </label>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isImporting}
                  className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold shadow-md shadow-sky-500/20 disabled:opacity-50"
                >
                  {isImporting ? 'Reading ZIM Archive...' : 'Import Archive'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

