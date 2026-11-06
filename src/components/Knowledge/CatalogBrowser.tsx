import React, { useState, useEffect } from 'react';
import { ZimArchive, KnowledgeService, CatalogFilterParams, DownloadTask } from '@/lib/services/knowledge';
import {
  Search,
  Download,
  CheckCircle2,
  BookOpen,
  Filter,
  HardDrive,
  FileText,
  Loader2,
  Layers,
  Globe2,
} from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  onOpenArchiveReader?: (archiveId: string) => void;
  onDownloadStarted?: () => void;
  activeDownloads: DownloadTask[];
}

export const CatalogBrowser: React.FC<Props> = ({
  onOpenArchiveReader,
  onDownloadStarted,
  activeDownloads,
}) => {
  const [archives, setArchives] = useState<ZimArchive[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('medicine');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLang, setSelectedLang] = useState<string>('all');
  const [selectedSize, setSelectedSize] = useState<number | undefined>(undefined);
  const [totalCount, setTotalCount] = useState<number>(0);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const loadCategoriesAndLangs = async () => {
    try {
      const [cats, langs] = await Promise.all([
        KnowledgeService.fetchCategories(),
        KnowledgeService.fetchLanguages(),
      ]);
      setCategories(cats);
      setLanguages(langs);
    } catch (e) {
      console.warn('Failed to fetch categories/langs:', e);
    }
  };

  const searchCatalog = async () => {
    setLoading(true);
    try {
      const params: CatalogFilterParams = {
        q: searchQuery.trim() || undefined,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        lang: selectedLang !== 'all' ? selectedLang : undefined,
        maxsize: selectedSize,
        count: 40,
      };
      const res = await KnowledgeService.fetchCatalog(params);
      setArchives(res.entries);
      setTotalCount(res.total);
    } catch (err: any) {
      toast.error(`Error loading catalog: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategoriesAndLangs();
    searchCatalog();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    searchCatalog();
  };

  const handleStartDownload = async (archive: ZimArchive) => {
    try {
      toast.info(`Starting download for ${archive.title}...`);
      await KnowledgeService.startDownload(archive);
      toast.success(`Download started: ${archive.title}`);
      if (onDownloadStarted) onDownloadStarted();
    } catch (e: any) {
      toast.error(`Download failed: ${e.message}`);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Search & Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-white/70 dark:bg-[#0c1017]/75 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.06] shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Kiwix ZIM archives (e.g. medicine, wikipedia, stackexchange, science)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-100/80 dark:bg-white/[0.05] border border-black/[0.04] dark:border-white/[0.08] text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40 transition-all"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold shadow-md shadow-sky-500/20 transition-all flex items-center justify-center gap-2 shrink-0"
          >
            <Search className="w-4 h-4" />
            Search
          </button>
        </form>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-black/[0.04] dark:border-white/[0.06]">
          {/* Category Selector */}
          <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Layers className="w-3.5 h-3.5" />
            <span>Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
              }}
              className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] text-xs font-medium text-slate-900 dark:text-white focus:outline-none"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Language Selector */}
          <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Globe2 className="w-3.5 h-3.5" />
            <span>Language:</span>
            <select
              value={selectedLang}
              onChange={(e) => {
                setSelectedLang(e.target.value);
              }}
              className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] text-xs font-medium text-slate-900 dark:text-white focus:outline-none"
            >
              <option value="all">All Languages</option>
              <option value="fas">Persian (فارسی)</option>
              <option value="eng">English</option>
              <option value="ara">Arabic (العربية)</option>
              <option value="fra">French (Français)</option>
              <option value="deu">German (Deutsch)</option>
              <option value="spa">Spanish (Español)</option>
              {languages
                .filter((l) => !['fas', 'eng', 'ara', 'fra', 'deu', 'spa'].includes(l))
                .map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
            </select>
          </div>

          {/* Max Size Selector */}
          <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400">
            <HardDrive className="w-3.5 h-3.5" />
            <span>Max Size:</span>
            <select
              value={selectedSize ?? ''}
              onChange={(e) => {
                const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                setSelectedSize(val);
              }}
              className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] text-xs font-medium text-slate-900 dark:text-white focus:outline-none"
            >
              <option value="">Any Size</option>
              <option value="524288000">&lt; 500 MB</option>
              <option value="2147483648">&lt; 2 GB</option>
              <option value="5368709120">&lt; 5 GB</option>
              <option value="10737418240">&lt; 10 GB</option>
            </select>
          </div>

          <button
            onClick={searchCatalog}
            className="ml-auto text-xs font-medium text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
          >
            <Filter className="w-3 h-3" />
            Apply Filters
          </button>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
        <span>
          Found <strong>{totalCount}</strong> archive{totalCount === 1 ? '' : 's'} matching query
        </span>
      </div>

      {/* Catalog Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Fetching OPDS Catalog from Kiwix Library...
          </p>
        </div>
      ) : archives.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] space-y-2">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            No archives found matching your search.
          </p>
          <p className="text-xs text-slate-400">
            Try a different search keyword (e.g. "wikipedia", "medicine", "history") or change language filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {archives.map((archive) => {
            const isDownloading = activeDownloads.some(
              (t) =>
                (t.id === archive.id || t.file_name === archive.name || t.download_url === archive.download_url) &&
                t.status === 'downloading'
            );

            return (
              <div
                key={archive.id}
                className="group relative p-4 rounded-2xl bg-white/70 dark:bg-[#0c1017]/75 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.06] hover:border-sky-500/30 dark:hover:border-sky-500/30 transition-all flex flex-col justify-between shadow-sm hover:shadow-md"
              >
                <div>
                  {/* Top Bar with Icon & Language Badge */}
                  <div className="flex items-start space-x-3 mb-3">
                    {archive.illustration_url ? (
                      <img
                        src={archive.illustration_url}
                        alt={archive.title}
                        className="w-11 h-11 rounded-xl object-contain bg-slate-100 dark:bg-white/5 p-1 shrink-0 border border-black/[0.04] dark:border-white/[0.08]"
                        onError={(e) => {
                          // Hide broken image
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-500/10 to-indigo-500/10 dark:from-sky-500/20 dark:to-indigo-500/20 border border-sky-500/20 flex items-center justify-center shrink-0">
                        <BookOpen className="w-5 h-5 text-sky-500" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400">
                          {archive.language}
                        </span>
                        {archive.category && archive.category !== 'all' && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                            {archive.category}
                          </span>
                        )}
                        {archive.is_installed && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3" />
                            Installed
                          </span>
                        )}
                      </div>
                      <h4
                        className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-1"
                        title={archive.title}
                      >
                        {archive.title}
                      </h4>
                    </div>
                  </div>

                  {/* Summary */}
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 mb-4 leading-relaxed">
                    {archive.description || 'No description provided for this archive.'}
                  </p>
                </div>

                {/* Footer with Metadata & Actions */}
                <div className="pt-3 border-t border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center space-x-3 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                      <HardDrive className="w-3 h-3 text-slate-400" />
                      {formatBytes(archive.size_bytes)}
                    </span>
                    {archive.article_count !== undefined && archive.article_count !== null && (
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3 text-slate-400" />
                        {archive.article_count.toLocaleString()} arts
                      </span>
                    )}
                  </div>

                  {/* Button */}
                  <div>
                    {archive.is_installed ? (
                      <button
                        onClick={() => {
                          const archiveId = archive.name || archive.id;
                          if (onOpenArchiveReader) onOpenArchiveReader(archiveId);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        Read
                      </button>
                    ) : isDownloading ? (
                      <button
                        disabled
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-400 text-xs font-semibold flex items-center gap-1.5 cursor-not-allowed"
                      >
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Downloading
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStartDownload(archive)}
                        className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-sky-500/20 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
