import React, { useState, useEffect, useMemo } from 'react';
import {
  ZimArchive,
  KnowledgeService,
  CatalogFilterParams,
  DownloadTask,
  CatalogLanguage,
} from '@/lib/services/knowledge';
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
  X,
  Info,
  Calendar,
  Sparkles,
  ExternalLink,
  RotateCcw,
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
  const [languages, setLanguages] = useState<CatalogLanguage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('medicine');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLang, setSelectedLang] = useState<string>('all');
  const [selectedSize, setSelectedSize] = useState<number | undefined>(undefined);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Selected archive for Details Modal
  const [selectedDetailsArchive, setSelectedDetailsArchive] = useState<ZimArchive | null>(null);

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getCategoryLabel = (cat: string) => {
    const map: Record<string, string> = {
      wikipedia: 'Wikipedia',
      wikimed: 'WikiMed (Medical)',
      wikibooks: 'WikiBooks',
      wikisource: 'WikiSource',
      wiktionary: 'Wiktionary (Dictionary)',
      wikivoyage: 'WikiVoyage (Travel)',
      wikiversity: 'WikiVersity',
      wikiquote: 'WikiQuote',
      gutenberg: 'Project Gutenberg (Books)',
      ted: 'TED Talks (Videos)',
      phet: 'PhET Science Simulations',
      ifixit: 'iFixit Repair Manuals',
      stack_exchange: 'Stack Exchange Q&A',
      mooc: 'MOOC & Online Courses',
      psiram: 'Psiram Science Wiki',
      other: 'Other Collections',
    };
    return map[cat.toLowerCase()] || cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const getLanguageLabel = (code: string) => {
    const cleanCode = code.trim().toLowerCase();
    const map: Record<string, string> = {
      fas: 'Persian (فارسی)',
      fa: 'Persian (فارسی)',
      per: 'Persian (فارسی)',
      eng: 'English',
      en: 'English',
      ara: 'Arabic (العربية)',
      ar: 'Arabic (العربية)',
      fra: 'French (Français)',
      fr: 'French (Français)',
      deu: 'German (Deutsch)',
      de: 'German (Deutsch)',
      spa: 'Spanish (Español)',
      es: 'Spanish (Español)',
      ita: 'Italian (Italiano)',
      it: 'Italian (Italiano)',
      rus: 'Russian (Русский)',
      ru: 'Russian (Русский)',
      zho: 'Chinese (中文)',
      zh: 'Chinese (中文)',
      tur: 'Turkish (Türkçe)',
      tr: 'Turkish (Türkçe)',
      por: 'Portuguese (Português)',
      pt: 'Portuguese (Português)',
      hin: 'Hindi (हिन्दी)',
      hi: 'Hindi (हिन्दी)',
      jpn: 'Japanese (日本語)',
      ja: 'Japanese (日本語)',
      kor: 'Korean (한국어)',
      ko: 'Korean (한국어)',
      nld: 'Dutch (Nederlands)',
      nl: 'Dutch (Nederlands)',
      pol: 'Polish (Polski)',
      pl: 'Polish (Polski)',
      ukr: 'Ukrainian (Українська)',
      uk: 'Ukrainian (Українська)',
      vie: 'Vietnamese (Tiếng Việt)',
      vi: 'Vietnamese (Tiếng Việt)',
      swe: 'Swedish (Svenska)',
      sv: 'Swedish (Svenska)',
    };

    if (map[cleanCode]) return map[cleanCode];

    const found = languages.find((l) => l.code === cleanCode);
    if (found) return found.name;

    return code.toUpperCase();
  };

  // Sort and prioritize languages list
  const sortedLanguages = useMemo(() => {
    const priorityCodes = ['eng', 'fas', 'ara', 'spa', 'fra', 'deu', 'zho', 'rus', 'tur', 'ita'];
    const priorityList: CatalogLanguage[] = [];
    const othersList: CatalogLanguage[] = [];

    // Pre-seed priority languages if not fetched yet
    const knownPriority: CatalogLanguage[] = [
      { code: 'eng', name: 'English' },
      { code: 'fas', name: 'Persian (فارسی)' },
      { code: 'ara', name: 'Arabic (العربية)' },
      { code: 'spa', name: 'Spanish (Español)' },
      { code: 'fra', name: 'French (Français)' },
      { code: 'deu', name: 'German (Deutsch)' },
      { code: 'zho', name: 'Chinese (中文)' },
      { code: 'rus', name: 'Russian (Русский)' },
      { code: 'tur', name: 'Turkish (Türkçe)' },
      { code: 'ita', name: 'Italian (Italiano)' },
    ];

    const source = languages.length > 0 ? languages : knownPriority;

    for (const item of source) {
      if (priorityCodes.includes(item.code)) {
        priorityList.push(item);
      } else {
        othersList.push(item);
      }
    }

    // Sort priority in the order of priorityCodes
    priorityList.sort((a, b) => priorityCodes.indexOf(a.code) - priorityCodes.indexOf(b.code));
    othersList.sort((a, b) => a.name.localeCompare(b.name));

    return [...priorityList, ...othersList];
  }, [languages]);

  const renderLanguageBadges = (langStr: string) => {
    if (!langStr) return null;
    const codes = langStr
      .split(',')
      .map((c) => c.trim().toLowerCase())
      .filter(Boolean);

    if (codes.length === 0) return null;

    if (codes.length === 1) {
      const code = codes[0];
      const label = getLanguageLabel(code);
      return (
        <span
          className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 truncate max-w-[120px]"
          title={label}
        >
          {label}
        </span>
      );
    }

    // Multi-language archive (e.g. TED talks with 20+ subtitles)
    const primary = getLanguageLabel(codes[0]);
    const remainingCount = codes.length - 1;
    const allLabels = codes.map((c) => getLanguageLabel(c)).join(', ');

    return (
      <div
        className="inline-flex items-center gap-1 cursor-help"
        title={`Supported languages (${codes.length}): ${allLabels}`}
      >
        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 truncate max-w-[80px]">
          {primary}
        </span>
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
          +{remainingCount}
        </span>
      </div>
    );
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
    setErrorMessage(null);
    try {
      const params: CatalogFilterParams = {
        q: searchQuery.trim() || undefined,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        lang: selectedLang !== 'all' ? selectedLang : undefined,
        maxsize: selectedSize,
        count: 48,
      };
      const res = await KnowledgeService.fetchCatalog(params);
      setArchives(res.entries);
      setTotalCount(res.total);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load catalog');
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

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedLang('all');
    setSelectedSize(undefined);
  };

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    selectedCategory !== 'all' ||
    selectedLang !== 'all' ||
    selectedSize !== undefined;

  const handleStartDownload = async (archive: ZimArchive) => {
    try {
      toast.info(`Preparing download for "${archive.title}"...`);
      await KnowledgeService.startDownload(archive);
      toast.success(`Download started: ${archive.title}`);
      if (onDownloadStarted) onDownloadStarted();
    } catch (e: any) {
      toast.error(`Download failed: ${e.message}`);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Search & Filter Command Panel */}
      <div className="p-5 rounded-2xl bg-white/70 dark:bg-[#0c1017]/85 backdrop-blur-2xl border border-black/[0.06] dark:border-white/[0.08] shadow-[0_4px_20px_rgb(0,0,0,0.06)] dark:shadow-[0_4px_25px_rgb(0,0,0,0.25)] space-y-4">
        {/* Search Input Bar */}
        <form onSubmit={handleSearchSubmit} className="relative flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search offline encyclopedias, medical libraries, guides (e.g. medicine, wikipedia, stackexchange)..."
              className="w-full pl-11 pr-10 py-3 rounded-xl bg-slate-100/80 dark:bg-[#131823]/90 border border-black/[0.06] dark:border-white/[0.08] text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500/50 transition-all font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                title="Clear query"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold uppercase tracking-wider shadow-md shadow-sky-500/25 transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            <span>Search</span>
          </button>
        </form>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-black/[0.04] dark:border-white/[0.06]">
          <div className="flex flex-wrap items-center gap-3">
            {/* Category Dropdown */}
            <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-medium">Category:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="max-w-[200px] px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-[#131823] border border-black/[0.06] dark:border-white/[0.08] text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
              >
                <option value="all">All Categories</option>
                {categories
                  .filter((c) => !c.includes('<') && !c.includes('>'))
                  .map((c) => (
                    <option key={c} value={c}>
                      {getCategoryLabel(c)}
                    </option>
                  ))}
              </select>
            </div>

            {/* Language Dropdown */}
            <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Globe2 className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-medium">Language:</span>
              <select
                value={selectedLang}
                onChange={(e) => setSelectedLang(e.target.value)}
                className="max-w-[220px] px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-[#131823] border border-black/[0.06] dark:border-white/[0.08] text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
              >
                <option value="all">All Languages</option>
                {sortedLanguages.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name} ({l.code.toUpperCase()})
                    {l.count ? ` • ${l.count.toLocaleString()}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Max Size Dropdown */}
            <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400">
              <HardDrive className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-medium">Max Size:</span>
              <select
                value={selectedSize ?? ''}
                onChange={(e) => {
                  const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                  setSelectedSize(val);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-[#131823] border border-black/[0.06] dark:border-white/[0.08] text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
              >
                <option value="">Any Size</option>
                <option value="524288000">&lt; 500 MB</option>
                <option value="2147483648">&lt; 2 GB</option>
                <option value="5368709120">&lt; 5 GB</option>
                <option value="10737418240">&lt; 10 GB</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 transition-colors"
                title="Reset all search & filters"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}

            <button
              onClick={searchCatalog}
              className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.10] text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors"
            >
              <Filter className="w-3 h-3" />
              <span>Apply Filters</span>
            </button>
          </div>
        </div>

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
              Active filters:
            </span>
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                Query: "{searchQuery}"
                <button onClick={() => setSearchQuery('')} className="hover:opacity-75">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedCategory !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                Category: {selectedCategory}
                <button onClick={() => setSelectedCategory('all')} className="hover:opacity-75">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedLang !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                Lang: {selectedLang.toUpperCase()}
                <button onClick={() => setSelectedLang('all')} className="hover:opacity-75">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedSize !== undefined && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                Max: {formatBytes(selectedSize)}
                <button onClick={() => setSelectedSize(undefined)} className="hover:opacity-75">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Results Header Info */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
        <span>
          Showing <strong>{archives.length}</strong> of <strong>{totalCount}</strong> matching archives
        </span>
      </div>

      {/* Catalog Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="h-64 rounded-2xl bg-slate-100/70 dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06] animate-pulse p-4 flex flex-col justify-between"
            >
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-xl bg-black/5 dark:bg-white/5" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3.5 bg-black/10 dark:bg-white/10 rounded w-2/3" />
                  <div className="h-2.5 bg-black/5 dark:bg-white/5 rounded w-1/3" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-2.5 bg-black/5 dark:bg-white/5 rounded w-full" />
                <div className="h-2.5 bg-black/5 dark:bg-white/5 rounded w-4/5" />
              </div>
              <div className="h-8 bg-black/5 dark:bg-white/5 rounded-xl w-full" />
            </div>
          ))}
        </div>
      ) : errorMessage ? (
        <div className="p-8 text-center rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-3">
          <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">
            {errorMessage}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Please make sure the Noectra AI backend server is active on port 3001.
          </p>
          <button
            onClick={searchCatalog}
            className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold shadow-md shadow-sky-500/20"
          >
            Retry Connection
          </button>
        </div>
      ) : archives.length === 0 ? (
        <div className="p-16 text-center rounded-2xl bg-white/40 dark:bg-[#0c1017]/40 border border-black/[0.06] dark:border-white/[0.06] space-y-3">
          <BookOpen className="w-12 h-12 text-slate-400 mx-auto opacity-40" />
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
            No archives found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            No Kiwix ZIM archives matched your filter criteria. Try searching for a broader term like "wikipedia", "medicine", or reset active filters.
          </p>
          <div className="pt-2">
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {archives.map((archive) => {
            const downloadTask = activeDownloads.find(
              (t) =>
                t.id === archive.id ||
                t.file_name === archive.name ||
                t.download_url === archive.download_url
            );
            const isDownloading = downloadTask?.status === 'downloading';
            const isPaused = downloadTask?.status === 'paused';

            return (
              <div
                key={archive.id}
                className="group relative p-4 rounded-2xl bg-white/70 dark:bg-[#0c1017]/80 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.07] hover:border-sky-500/40 dark:hover:border-sky-500/40 transition-all flex flex-col justify-between shadow-[0_2px_12px_rgb(0,0,0,0.04)] dark:shadow-[0_2px_12px_rgb(0,0,0,0.2)] hover:shadow-lg"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start space-x-3 mb-3">
                    {archive.illustration_url ? (
                      <img
                        src={archive.illustration_url}
                        alt={archive.title}
                        className="w-12 h-12 rounded-xl object-contain bg-slate-100 dark:bg-[#131823] p-1.5 shrink-0 border border-black/[0.04] dark:border-white/[0.08]"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500/10 to-indigo-500/10 dark:from-sky-500/20 dark:to-indigo-500/20 border border-sky-500/20 flex items-center justify-center shrink-0">
                        <BookOpen className="w-5 h-5 text-sky-500" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        {renderLanguageBadges(archive.language)}
                        {archive.category && archive.category !== 'all' && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                            {getCategoryLabel(archive.category)}
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

                  {/* Description */}
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 mb-4 leading-relaxed min-h-[3rem]">
                    {archive.description || 'No description provided for this archive.'}
                  </p>
                </div>

                {/* Card Meta & Bottom Controls */}
                <div className="space-y-3 pt-3 border-t border-black/[0.04] dark:border-white/[0.06]">
                  {/* Meta Details */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                      <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                      {formatBytes(archive.size_bytes)}
                    </span>

                    {archive.article_count !== undefined && archive.article_count !== null ? (
                      <span className="flex items-center gap-1 text-right justify-end font-sans">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        {archive.article_count.toLocaleString()} Articles
                      </span>
                    ) : (
                      <span className="text-right text-slate-400">Standard Pack</span>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedDetailsArchive(archive)}
                      className="px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center justify-center transition-colors shrink-0"
                      title="View complete archive details"
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex-1">
                      {archive.is_installed ? (
                        <button
                          onClick={() => {
                            const archiveId = archive.name || archive.id;
                            if (onOpenArchiveReader) onOpenArchiveReader(archiveId);
                          }}
                          className="w-full py-2 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-emerald-500/20"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Browse in Library</span>
                        </button>
                      ) : isDownloading ? (
                        <button
                          disabled
                          className="w-full py-2 px-3 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 text-xs font-semibold flex items-center justify-center gap-2 cursor-wait border border-sky-500/20"
                        >
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>
                            {downloadTask?.progress_pct ? `${downloadTask.progress_pct.toFixed(0)}%` : 'Downloading'}
                          </span>
                        </button>
                      ) : isPaused ? (
                        <button
                          disabled
                          className="w-full py-2 px-3 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xs font-semibold flex items-center justify-center gap-2 border border-amber-500/20"
                        >
                          <span>Paused</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStartDownload(archive)}
                          className="w-full py-2 px-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm shadow-sky-500/25 transition-all"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download Archive</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Archive Details Modal */}
      {selectedDetailsArchive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-xl p-6 rounded-2xl bg-white dark:bg-[#0c1017] border border-black/[0.08] dark:border-white/[0.08] shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white line-clamp-1">
                    {selectedDetailsArchive.title}
                  </h3>
                  <p className="text-xs font-mono text-slate-400">
                    ID: {selectedDetailsArchive.id}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedDetailsArchive(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-h-40 overflow-y-auto pr-1">
              {selectedDetailsArchive.description || 'No description provided.'}
            </p>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#131823] border border-black/[0.04] dark:border-white/[0.06] space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Category:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {getCategoryLabel(selectedDetailsArchive.category)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Language:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200 text-right max-w-[260px] truncate" title={selectedDetailsArchive.language}>
                  {selectedDetailsArchive.language.split(',').map((c) => getLanguageLabel(c)).join(', ')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Archive Size:</span>
                <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">
                  {formatBytes(selectedDetailsArchive.size_bytes)}
                </span>
              </div>
              {selectedDetailsArchive.article_count !== undefined && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Article Count:</span>
                  <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">
                    {selectedDetailsArchive.article_count.toLocaleString()} Articles
                  </span>
                </div>
              )}
              {selectedDetailsArchive.updated_at && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Published / Updated:</span>
                  <span className="text-slate-700 dark:text-slate-200">
                    {selectedDetailsArchive.updated_at.split('T')[0]}
                  </span>
                </div>
              )}
              {selectedDetailsArchive.tags && selectedDetailsArchive.tags.length > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Tags:</span>
                  <div className="flex gap-1 flex-wrap justify-end">
                    {selectedDetailsArchive.tags.slice(0, 4).map((t) => (
                      <span
                        key={t}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-slate-600 dark:text-slate-300"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedDetailsArchive(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5"
              >
                Close
              </button>
              {!selectedDetailsArchive.is_installed && (
                <button
                  type="button"
                  onClick={() => {
                    handleStartDownload(selectedDetailsArchive);
                    setSelectedDetailsArchive(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-sky-500/20"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Archive</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
