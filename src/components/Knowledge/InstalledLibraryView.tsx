import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ZimLibraryItem, KnowledgeService } from '@/lib/services/knowledge';
import {
  BookOpen,
  Trash2,
  Plus,
  HardDrive,
  FileText,
  Search,
  CheckCircle2,
  FolderOpen,
  AlertCircle,
  Copy,
  Check,
  ArrowUpDown,
  Filter,
  ExternalLink,
  Layers,
  Sparkles,
  Database,
  Globe2,
  X,
  UploadCloud,
  FileQuestion,
  HelpCircle,
  DownloadCloud,
} from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  archives: ZimLibraryItem[];
  onRefresh: () => void;
  onOpenReader: (archiveId: string) => void;
  onSwitchToCatalog?: () => void;
}

type SortOption = 'date_desc' | 'date_asc' | 'title_asc' | 'title_desc' | 'size_desc' | 'articles_desc';
type StatusFilter = 'all' | 'downloaded' | 'linked' | 'missing';

export const InstalledLibraryView: React.FC<Props> = ({
  archives,
  onRefresh,
  onOpenReader,
  onSwitchToCatalog,
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('date_desc');

  // Modals state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPath, setImportPath] = useState('');
  const [copyToLibrary, setCopyToLibrary] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Delete modal state
  const [archiveToDelete, setArchiveToDelete] = useState<ZimLibraryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Drag and drop state
  const [isDragOver, setIsDragOver] = useState(false);
  const [copiedPathId, setCopiedPathId] = useState<string | null>(null);

  // Calculate library summary statistics
  const stats = useMemo(() => {
    const totalArchives = archives.length;
    const totalBytes = archives.reduce((acc, a) => acc + (a.file_size || 0), 0);
    const totalArticles = archives.reduce((acc, a) => acc + (a.article_count || 0), 0);
    const linkedCount = archives.filter((a) => a.is_external).length;
    const downloadedCount = archives.filter((a) => !a.is_external).length;
    const missingCount = archives.filter((a) => a.status === 'missing' || a.is_valid === false).length;

    return {
      totalArchives,
      totalBytes,
      totalArticles,
      linkedCount,
      downloadedCount,
      missingCount,
    };
  }, [archives]);

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleCopyPath = (path: string, id: string) => {
    navigator.clipboard.writeText(path);
    setCopiedPathId(id);
    toast.success('File path copied to clipboard');
    setTimeout(() => setCopiedPathId(null), 2000);
  };

  const handleRevealArchive = async (archive: ZimLibraryItem) => {
    try {
      const ok = await KnowledgeService.revealArchive(archive.id || archive.file_name);
      if (ok) {
        toast.success(`Revealed in Explorer`);
      } else {
        toast.error('Could not locate file on disk');
      }
    } catch (e: any) {
      toast.error(`Error revealing file: ${e.message}`);
    }
  };

  const handleExecuteDelete = async (deleteFileFromDisk: boolean) => {
    if (!archiveToDelete) return;
    setIsDeleting(true);
    try {
      const ok = await KnowledgeService.deleteArchive(
        archiveToDelete.id || archiveToDelete.file_name,
        deleteFileFromDisk
      );
      if (ok) {
        toast.success(
          deleteFileFromDisk
            ? `Permanently deleted "${archiveToDelete.title}" from disk`
            : `Removed "${archiveToDelete.title}" from library`
        );
        setArchiveToDelete(null);
        onRefresh();
      } else {
        toast.error('Failed to remove archive');
      }
    } catch (e: any) {
      toast.error(`Error deleting archive: ${e.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importPath.trim()) return;

    setIsImporting(true);
    try {
      toast.info('Validating and indexing ZIM archive clusters...');
      const item = await KnowledgeService.importLocalZim(importPath.trim(), copyToLibrary);
      toast.success(
        `Successfully imported "${item.title}" (${(item.article_count || 0).toLocaleString()} articles)!`
      );
      setShowImportModal(false);
      setImportPath('');
      onRefresh();
    } catch (err: any) {
      toast.error(`Failed to import ZIM: ${err.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  // Drag and drop event handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      const filePath = (droppedFile as any).path || droppedFile.name;
      if (filePath) {
        setImportPath(filePath);
        setShowImportModal(true);
      }
    }
  };

  // Filter and sort archives
  const filteredAndSortedArchives = useMemo(() => {
    let result = [...archives];

    // Status filter
    if (statusFilter === 'downloaded') {
      result = result.filter((a) => !a.is_external && a.status !== 'missing');
    } else if (statusFilter === 'linked') {
      result = result.filter((a) => a.is_external && a.status !== 'missing');
    } else if (statusFilter === 'missing') {
      result = result.filter((a) => a.status === 'missing' || a.is_valid === false);
    }

    // Search query
    if (filterQuery.trim()) {
      const q = filterQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.file_name.toLowerCase().includes(q) ||
          a.file_path.toLowerCase().includes(q) ||
          (a.language && a.language.toLowerCase().includes(q))
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortOption) {
        case 'title_asc':
          return a.title.localeCompare(b.title);
        case 'title_desc':
          return b.title.localeCompare(a.title);
        case 'size_desc':
          return (b.file_size || 0) - (a.file_size || 0);
        case 'articles_desc':
          return (b.article_count || 0) - (a.article_count || 0);
        case 'date_asc':
          return (a.modified_at || '').localeCompare(b.modified_at || '');
        case 'date_desc':
        default:
          return (b.modified_at || '').localeCompare(a.modified_at || '');
      }
    });

    return result;
  }, [archives, filterQuery, statusFilter, sortOption]);

  return (
    <div
      className="w-full space-y-6"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag & Drop Overlay Indicator */}
      {isDragOver && (
        <div className="fixed inset-0 z-50 bg-sky-500/10 dark:bg-sky-500/20 backdrop-blur-sm border-2 border-dashed border-sky-500 flex flex-col items-center justify-center p-6 text-center animate-fadeIn pointer-events-none">
          <UploadCloud className="w-16 h-16 text-sky-500 animate-bounce mb-3" />
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            Drop ZIM Archive Here
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            Release file to import it into your Noectra AI offline library
          </p>
        </div>
      )}

      {/* Top 4 Stat Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Archives */}
        <div className="p-4 rounded-2xl bg-white/80 dark:bg-[#0c1017]/80 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.08] shadow-sm hover:border-sky-500/30 transition-all flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Total Archives
            </p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {stats.totalArchives.toLocaleString()}
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              {stats.linkedCount} linked • {stats.downloadedCount} managed
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-500/15 to-blue-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 flex items-center justify-center shrink-0">
            <Database className="w-5 h-5" />
          </div>
        </div>

        {/* Total Storage */}
        <div className="p-4 rounded-2xl bg-white/80 dark:bg-[#0c1017]/80 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.08] shadow-sm hover:border-emerald-500/30 transition-all flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Total Storage Used
            </p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {formatBytes(stats.totalBytes)}
            </h3>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
              High-efficiency Zstandard / LZMA
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500/15 to-teal-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <HardDrive className="w-5 h-5" />
          </div>
        </div>

        {/* Total Articles */}
        <div className="p-4 rounded-2xl bg-white/80 dark:bg-[#0c1017]/80 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.08] shadow-sm hover:border-purple-500/30 transition-all flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Articles Indexed
            </p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {stats.totalArticles.toLocaleString()}
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              Full-text searchable offline
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500/15 to-indigo-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        {/* Library Health */}
        <div className="p-4 rounded-2xl bg-white/80 dark:bg-[#0c1017]/80 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.08] shadow-sm hover:border-amber-500/30 transition-all flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Library Health
            </p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {stats.missingCount > 0 ? (
                <span className="text-rose-500">{stats.missingCount} Missing</span>
              ) : (
                <span className="text-emerald-500">100% Ready</span>
              )}
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              {stats.totalArchives === 0 ? 'No archives registered' : 'All local files verified'}
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500/15 to-orange-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Control & Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-white/80 dark:bg-[#0c1017]/80 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.08] shadow-sm flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 w-full lg:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter installed archives by title or path..."
            className="w-full pl-10 pr-9 py-2 rounded-xl bg-slate-100/80 dark:bg-white/[0.05] border border-black/[0.04] dark:border-white/[0.08] text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40 transition-all"
          />
          {filterQuery && (
            <button
              onClick={() => setFilterQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter & Sort Controls */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-start lg:justify-end">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100/80 dark:bg-white/[0.05] border border-black/[0.04] dark:border-white/[0.06] text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All ({archives.length})
            </button>
            <button
              onClick={() => setStatusFilter('downloaded')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                statusFilter === 'downloaded'
                  ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Managed ({stats.downloadedCount})
            </button>
            <button
              onClick={() => setStatusFilter('linked')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                statusFilter === 'linked'
                  ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Linked ({stats.linkedCount})
            </button>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100/80 dark:bg-white/[0.05] border border-black/[0.04] dark:border-white/[0.06] text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="bg-transparent text-slate-900 dark:text-white font-medium focus:outline-none cursor-pointer pr-1"
            >
              <option value="date_desc" className="bg-white dark:bg-[#0c1017]">Newest First</option>
              <option value="date_asc" className="bg-white dark:bg-[#0c1017]">Oldest First</option>
              <option value="title_asc" className="bg-white dark:bg-[#0c1017]">Title (A-Z)</option>
              <option value="title_desc" className="bg-white dark:bg-[#0c1017]">Title (Z-A)</option>
              <option value="size_desc" className="bg-white dark:bg-[#0c1017]">Size (Largest)</option>
              <option value="articles_desc" className="bg-white dark:bg-[#0c1017]">Articles (Most)</option>
            </select>
          </div>

          {/* Import Action Button */}
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 active:scale-98 text-white text-xs font-semibold shadow-md shadow-sky-500/20 transition-all flex items-center gap-2 shrink-0 ml-auto lg:ml-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Import Local .zim File</span>
          </button>
        </div>
      </div>

      {/* Archives Grid or Empty State */}
      {filteredAndSortedArchives.length === 0 ? (
        <div className="p-12 md:p-16 text-center rounded-3xl bg-white/50 dark:bg-[#0c1017]/50 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.06] space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500/10 to-indigo-500/10 border border-sky-500/20 flex items-center justify-center mx-auto text-sky-500">
            <FolderOpen className="w-8 h-8 opacity-75" />
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {archives.length === 0 ? 'Your Offline Library is Empty' : 'No Archives Matched Your Filter'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {archives.length === 0
                ? 'Discover and download world-class offline encyclopedias, medical libraries, and textbooks from the Kiwix Catalog, or import any existing .zim file directly from your disk.'
                : 'Try adjusting your search query, clearing filters, or switching the status filter back to "All".'}
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            {onSwitchToCatalog && archives.length === 0 && (
              <button
                onClick={onSwitchToCatalog}
                className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold shadow-md shadow-sky-500/20 transition-all flex items-center gap-2"
              >
                <Globe2 className="w-4 h-4" />
                <span>Explore Kiwix Catalog</span>
              </button>
            )}
            <button
              onClick={() => setShowImportModal(true)}
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-white text-xs font-semibold border border-black/[0.06] dark:border-white/[0.08] transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Import Existing .zim File</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredAndSortedArchives.map((archive) => {
            const isMissing = archive.status === 'missing' || archive.is_valid === false;
            const archiveKey = archive.id || archive.file_name;

            return (
              <div
                key={archiveKey}
                className="group relative rounded-2xl bg-white/80 dark:bg-[#0c1017]/80 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.08] hover:border-sky-500/40 dark:hover:border-sky-500/30 transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between overflow-hidden"
              >
                {/* Top Card Body */}
                <div className="p-5 space-y-4">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                          isMissing
                            ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                            : archive.is_external
                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                        }`}
                      >
                        {isMissing ? (
                          <AlertCircle className="w-5 h-5" />
                        ) : (
                          <Database className="w-5 h-5" />
                        )}
                      </div>

                      <div className="space-y-0.5">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isMissing
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                              : archive.is_external
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isMissing
                                ? 'bg-rose-500'
                                : archive.is_external
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                          />
                          {isMissing ? 'File Missing' : archive.is_external ? 'Linked Storage' : 'Managed Library'}
                        </span>
                      </div>
                    </div>

                    {/* Delete / Remove Action Button */}
                    <button
                      onClick={() => setArchiveToDelete(archive)}
                      title="Remove from library or delete file"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h4
                      className="text-base font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-sky-500 transition-colors"
                      title={archive.title}
                    >
                      {archive.title}
                    </h4>
                    {archive.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                        {archive.description}
                      </p>
                    )}
                  </div>

                  {/* Metric Badges */}
                  <div className="grid grid-cols-2 gap-2 text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06]">
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                      <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold">{formatBytes(archive.file_size)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold">
                        {(archive.article_count || 0).toLocaleString()} Articles
                      </span>
                    </div>
                  </div>

                  {/* Path Preview with Copy Button */}
                  <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-100/60 dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.04] text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    <span className="truncate flex-1" title={archive.file_path}>
                      {archive.file_path}
                    </span>
                    <button
                      onClick={() => handleCopyPath(archive.file_path, archiveKey)}
                      title="Copy absolute path"
                      className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors shrink-0"
                    >
                      {copiedPathId === archiveKey ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="px-5 py-3.5 bg-slate-50/70 dark:bg-white/[0.02] border-t border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleRevealArchive(archive)}
                    title="Show in File Explorer"
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-black/[0.06] dark:border-white/[0.08] transition-all flex items-center gap-1.5"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
                    <span>Reveal in Explorer</span>
                  </button>

                  <button
                    onClick={() => onOpenReader(archiveKey)}
                    disabled={isMissing}
                    className="flex-1 py-2 px-4 rounded-xl bg-sky-500 hover:bg-sky-600 active:scale-98 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm shadow-sky-500/20 transition-all disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Browse & Read</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Import Archive Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg p-6 rounded-3xl bg-white dark:bg-[#0c1017] border border-black/[0.08] dark:border-white/[0.1] shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Import Local ZIM Archive
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Connect an existing .zim encyclopedia to your library
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleImportSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Absolute File Path (.zim):
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={importPath}
                    onChange={(e) => setImportPath(e.target.value)}
                    placeholder="e.g. C:\Users\Downloads\wikipedia_en_all_maxi.zim"
                    className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-slate-100/90 dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.08] text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/40 transition-all"
                    required
                  />
                  {importPath && (
                    <button
                      type="button"
                      onClick={() => setImportPath('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">
                  Tip: You can also drag and drop any .zim file directly into this window.
                </p>
              </div>

              {/* Copy file toggle */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06] flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="copyToApp"
                  checked={copyToLibrary}
                  onChange={(e) => setCopyToLibrary(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-sky-500 focus:ring-sky-500/40 cursor-pointer"
                />
                <label htmlFor="copyToApp" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer space-y-0.5">
                  <span className="font-semibold block">
                    Copy to Application Storage
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block leading-relaxed">
                    Recommended if file is in your Downloads folder. Ensures the archive is never accidentally deleted when clearing temporary files.
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end space-x-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isImporting || !importPath.trim()}
                  className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 active:scale-98 text-white text-xs font-bold shadow-md shadow-sky-500/20 disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center gap-2"
                >
                  {isImporting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Reading ZIM Archive...</span>
                    </>
                  ) : (
                    <span>Import Archive</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete / Unlink Confirmation Modal */}
      {archiveToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-[#0c1017] border border-black/[0.08] dark:border-white/[0.1] shadow-2xl space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Remove Archive
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select how you want to handle this archive
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06] text-xs">
              <span className="font-semibold text-slate-900 dark:text-white block truncate">
                {archiveToDelete.title}
              </span>
              <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 block truncate mt-0.5">
                {archiveToDelete.file_path}
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              You can simply <strong>unlink</strong> this archive from Noectra AI (leaving the actual file on your disk), or <strong>permanently delete</strong> the file from your computer.
            </p>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => handleExecuteDelete(false)}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-white text-xs font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <span>Remove from Library Only (Keep File on Disk)</span>
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={() => handleExecuteDelete(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold shadow-md shadow-rose-500/20 transition-all flex items-center justify-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Permanently Delete File from Disk</span>
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setArchiveToDelete(null)}
                className="w-full py-2 px-4 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
