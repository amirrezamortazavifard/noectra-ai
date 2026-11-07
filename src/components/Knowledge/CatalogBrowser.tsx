import React, { useState, useEffect, useMemo } from 'react';
import {
  ZimArchive,
  KnowledgeService,
  CatalogFilterParams,
  DownloadTask,
  CatalogLanguage,
  SavedCatalogSearch,
  DiskSpaceInfo,
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
  Bookmark,
  BookmarkPlus,
  ArrowUpDown,
  ChevronDown,
  Trash2,
  AlertTriangle,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  onOpenArchiveReader?: (archiveId: string) => void;
  onDownloadStarted?: () => void;
  activeDownloads: DownloadTask[];
}

type SortOption =
  | 'relevance'
  | 'title_asc'
  | 'title_desc'
  | 'size_desc'
  | 'size_asc'
  | 'updated_desc';

export const CatalogBrowser: React.FC<Props> = ({
  onOpenArchiveReader,
  onDownloadStarted,
  activeDownloads,
}) => {
  const [archives, setArchives] = useState<ZimArchive[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [languages, setLanguages] = useState<CatalogLanguage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('medicine');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLang, setSelectedLang] = useState<string>('all');
  const [selectedSize, setSelectedSize] = useState<number | undefined>(undefined);
  const [sortOption, setSortOption] = useState<SortOption>('relevance');
  const [totalCount, setTotalCount] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Saved Searches state (CAT-004)
  const [savedSearches, setSavedSearches] = useState<SavedCatalogSearch[]>([]);
  const [isSavedSearchesOpen, setIsSavedSearchesOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState('');

  // Selected archive for Details Modal & Disk Space (CAT-005)
  const [selectedDetailsArchive, setSelectedDetailsArchive] = useState<ZimArchive | null>(null);
  const [diskSpace, setDiskSpace] = useState<DiskSpaceInfo | null>(null);
  const [loadingDiskSpace, setLoadingDiskSpace] = useState(false);

  const PAGE_SIZE = 48;

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

    priorityList.sort((a, b) => priorityCodes.indexOf(a.code) - priorityCodes.indexOf(b.code));
    othersList.sort((a, b) => a.name.localeCompare(b.name));

    return [...priorityList, ...othersList];
  }, [languages]);

  const loadSavedSearches = async () => {
    try {
      const items = await KnowledgeService.fetchSavedSearches();
      setSavedSearches(items);
    } catch (e) {
      console.warn('Failed to fetch saved searches:', e);
    }
  };

  const loadDiskSpace = async () => {
    setLoadingDiskSpace(true);
    try {
      const info = await KnowledgeService.fetchDiskSpace();
      setDiskSpace(info);
    } catch (e) {
      console.warn('Failed to check disk space:', e);
    } finally {
      setLoadingDiskSpace(false);
    }
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

  const searchCatalog = async (resetPage = true) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const params: CatalogFilterParams = {
        q: searchQuery.trim() || undefined,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        lang: selectedLang !== 'all' ? selectedLang : undefined,
        maxsize: selectedSize,
        start: 0,
        count: PAGE_SIZE,
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

  const handleLoadMore = async () => {
    if (loadingMore || archives.length >= totalCount) return;
    setLoadingMore(true);
    try {
      const params: CatalogFilterParams = {
        q: searchQuery.trim() || undefined,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        lang: selectedLang !== 'all' ? selectedLang : undefined,
        maxsize: selectedSize,
        start: archives.length,
        count: PAGE_SIZE,
      };
      const res = await KnowledgeService.fetchCatalog(params);
      setArchives((prev) => {
        const existingIds = new Set(prev.map((a) => a.id));
        const uniqueNew = res.entries.filter((a) => !existingIds.has(a.id));
        return [...prev, ...uniqueNew];
      });
      setTotalCount(res.total);
    } catch (err: any) {
      toast.error(`Failed to load more archives: ${err.message}`);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadCategoriesAndLangs();
    loadSavedSearches();
    loadDiskSpace();
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
      // Disk space pre-check (CAT-005)
      if (diskSpace && diskSpace.free_bytes > 0 && archive.size_bytes > 0) {
        const bufferRequired = archive.size_bytes * 1.05; // 5% buffer
        if (diskSpace.free_bytes < bufferRequired) {
          const neededStr = formatBytes(archive.size_bytes);
          const freeStr = formatBytes(diskSpace.free_bytes);
          toast.error(
            `Insufficient disk space! Requires ${neededStr}, but only ${freeStr} is free on destination drive.`
          );
          return;
        }
      }

      toast.info(`Preparing download for "${archive.title}"...`);
      await KnowledgeService.startDownload(archive);
      toast.success(`Download started: ${archive.title}`);
      if (onDownloadStarted) onDownloadStarted();
    } catch (e: any) {
      toast.error(`Download failed: ${e.message}`);
    }
  };

  // Saved Searches Actions (CAT-004)
  const handleSaveSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveSearchName.trim()) {
      toast.error('Please enter a name for the search preset');
      return;
    }

    try {
      const filters: CatalogFilterParams = {
        category: selectedCategory,
        lang: selectedLang,
        maxsize: selectedSize,
      };
      await KnowledgeService.saveSearch(saveSearchName.trim(), searchQuery.trim(), filters);
      toast.success(`Search preset "${saveSearchName.trim()}" saved!`);
      setSaveSearchName('');
      setIsSaveModalOpen(false);
      loadSavedSearches();
    } catch (e: any) {
      toast.error(`Failed to save search: ${e.message}`);
    }
  };

  const handleApplySavedSearch = (saved: SavedCatalogSearch) => {
    setSearchQuery(saved.query || '');
    setSelectedCategory(saved.filtersJson.category || 'all');
    setSelectedLang(saved.filtersJson.lang || 'all');
    setSelectedSize(saved.filtersJson.maxsize);
    setIsSavedSearchesOpen(false);
    toast.info(`Applied search preset: "${saved.name}"`);

    // Trigger immediate search
    setTimeout(() => {
      searchCatalog();
    }, 50);
  };

  const handleDeleteSavedSearch = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await KnowledgeService.deleteSavedSearch(id);
      toast.success('Search preset removed');
      loadSavedSearches();
    } catch (e: any) {
      toast.error(`Failed to delete preset: ${e.message}`);
    }
  };

  // Relevance Ranking & Sorting (CAT-003)
  const rankedAndSortedArchives = useMemo(() => {
    const qLower = searchQuery.trim().toLowerCase();

    // Calculate score & assign match quality
    const scored = archives.map((archive) => {
      let score = 0;
      let matchLabel: 'Best Match' | 'Title Match' | null = null;

      if (qLower) {
        const titleLower = archive.title.toLowerCase();
        const descLower = (archive.description || '').toLowerCase();
        const tagsJoined = (archive.tags || []).join(' ').toLowerCase();

        if (titleLower === qLower) {
          score += 100;
          matchLabel = 'Best Match';
        } else if (titleLower.startsWith(qLower)) {
          score += 80;
          matchLabel = 'Best Match';
        } else if (titleLower.includes(qLower)) {
          score += 60;
          matchLabel = 'Title Match';
        } else if (tagsJoined.includes(qLower)) {
          score += 40;
        } else if (descLower.includes(qLower)) {
          score += 20;
        }
      }

      return {
        archive,
        score,
        matchLabel,
      };
    });

    // Apply Sort Selection
    scored.sort((a, b) => {
      if (sortOption === 'relevance') {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return b.archive.size_bytes - a.archive.size_bytes;
      }
      if (sortOption === 'title_asc') {
        return a.archive.title.localeCompare(b.archive.title);
      }
      if (sortOption === 'title_desc') {
        return b.archive.title.localeCompare(a.archive.title);
      }
      if (sortOption === 'size_desc') {
        return b.archive.size_bytes - a.archive.size_bytes;
      }
      if (sortOption === 'size_asc') {
        return a.archive.size_bytes - b.archive.size_bytes;
      }
      if (sortOption === 'updated_desc') {
        const dateA = a.archive.updated_at ? new Date(a.archive.updated_at).getTime() : 0;
        const dateB = b.archive.updated_at ? new Date(b.archive.updated_at).getTime() : 0;
        return dateB - dateA;
      }
      return 0;
    });

    return scored;
  }, [archives, searchQuery, sortOption]);

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
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                title="Clear query"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Save Search Button (CAT-004) */}
          <button
            type="button"
            onClick={() => setIsSaveModalOpen(true)}
            className="px-3.5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#131823] dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-black/[0.06] dark:border-white/[0.08] text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
            title="Save current search criteria preset"
          >
            <BookmarkPlus className="w-3.5 h-3.5 text-sky-500" />
            <span className="hidden sm:inline">Save Search</span>
          </button>

          {/* Saved Searches Dropdown Trigger (CAT-004) */}
          {savedSearches.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsSavedSearchesOpen((prev) => !prev)}
                className="px-3.5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#131823] dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-black/[0.06] dark:border-white/[0.08] text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
                title="View saved search presets"
              >
                <Bookmark className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden sm:inline">Saved ({savedSearches.length})</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {isSavedSearchesOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-white dark:bg-[#0c1017] border border-black/[0.08] dark:border-white/[0.08] shadow-2xl p-2 z-50 animate-fadeIn">
                  <div className="px-3 py-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between">
                    <span>Saved Presets</span>
                    <span className="font-normal text-[10px]">{savedSearches.length} items</span>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-1 py-1">
                    {savedSearches.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => handleApplySavedSearch(s)}
                        className="group flex items-center justify-between p-2 rounded-xl text-xs hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {s.name}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {s.query ? `"${s.query}"` : 'All'} • {s.filtersJson.category || 'All categories'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSavedSearch(s.id, e)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                          title="Delete saved preset"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

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

            {/* Sorting Dropdown (CAT-003) */}
            <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-medium">Sort By:</span>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-[#131823] border border-black/[0.06] dark:border-white/[0.08] text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
              >
                <option value="relevance">Best Match (Relevance)</option>
                <option value="title_asc">Title (A-Z)</option>
                <option value="title_desc">Title (Z-A)</option>
                <option value="size_desc">Size (Largest First)</option>
                <option value="size_asc">Size (Smallest First)</option>
                <option value="updated_desc">Recently Updated</option>
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
                <span>Reset All</span>
              </button>
            )}

            <button
              onClick={() => searchCatalog()}
              className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.10] text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors"
            >
              <Filter className="w-3 h-3" />
              <span>Apply Filters</span>
            </button>
          </div>
        </div>

        {/* Active Filter Chips (CAT-001) */}
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
                Category: {getCategoryLabel(selectedCategory)}
                <button onClick={() => setSelectedCategory('all')} className="hover:opacity-75">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedLang !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                Lang: {getLanguageLabel(selectedLang)}
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

      {/* Results Header Info & Disk Space overview */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 px-1">
        <span>
          Showing <strong>{archives.length}</strong> of <strong>{totalCount}</strong> matching archives
        </span>

        {diskSpace && diskSpace.free_bytes > 0 && (
          <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
            <HardDrive className="w-3.5 h-3.5 text-slate-400" />
            <span>Target Drive Free: <strong>{formatBytes(diskSpace.free_bytes)}</strong></span>
          </div>
        )}
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
            onClick={() => searchCatalog()}
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
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {rankedAndSortedArchives.map(({ archive, matchLabel }) => {
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
                          {matchLabel && (
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-sky-500 text-white shadow-xs">
                              {matchLabel}
                            </span>
                          )}
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
                        title="View complete archive details & disk check"
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

          {/* Pagination: Load More Button (CAT-002) */}
          {archives.length < totalCount && (
            <div className="flex flex-col items-center justify-center pt-4 pb-2 space-y-2">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-8 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] text-xs font-bold text-slate-800 dark:text-white border border-black/[0.06] dark:border-white/[0.08] shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
                    <span>Loading more archives from catalog...</span>
                  </>
                ) : (
                  <>
                    <span>Load More Results</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      ({totalCount - archives.length} remaining)
                    </span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Save Search Preset Modal (CAT-004) */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-[#0c1017] border border-black/[0.08] dark:border-white/[0.08] shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <BookmarkPlus className="w-5 h-5 text-sky-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Save Search Preset
                </h3>
              </div>
              <button
                onClick={() => setIsSaveModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Save your current search query and active filters for 1-click execution anytime.
            </p>

            <form onSubmit={handleSaveSearchSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Preset Name
                </label>
                <input
                  type="text"
                  required
                  value={saveSearchName}
                  onChange={(e) => setSaveSearchName(e.target.value)}
                  placeholder="e.g. Medical Persian Encyclopedias"
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-[#131823] border border-black/[0.06] dark:border-white/[0.08] text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.06] text-[11px] space-y-1 text-slate-500">
                <div>Query: <strong className="text-slate-700 dark:text-slate-300">{searchQuery || '(Empty)'}</strong></div>
                <div>Category: <strong className="text-slate-700 dark:text-slate-300">{selectedCategory}</strong></div>
                <div>Language: <strong className="text-slate-700 dark:text-slate-300">{selectedLang}</strong></div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSaveModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold shadow-md shadow-sky-500/20"
                >
                  Save Preset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Archive Details & Space Pre-Check Modal (CAT-005) */}
      {selectedDetailsArchive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-xl p-6 rounded-2xl bg-white dark:bg-[#0c1017] border border-black/[0.08] dark:border-white/[0.08] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold shrink-0">
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

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-h-36 overflow-y-auto pr-1">
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
                  {formatBytes(selectedDetailsArchive.size_bytes)} ({selectedDetailsArchive.size_bytes.toLocaleString()} bytes)
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
                  <div className="flex gap-1 flex-wrap justify-end max-w-xs">
                    {selectedDetailsArchive.tags.slice(0, 6).map((t) => (
                      <span
                        key={t}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-slate-600 dark:text-slate-300 font-mono"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Target Disk Space Assessment (CAT-005) */}
            {diskSpace && diskSpace.free_bytes > 0 && (
              <div className="p-3.5 rounded-xl border space-y-2 bg-slate-50/70 dark:bg-white/[0.02] border-black/[0.06] dark:border-white/[0.06]">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                    Destination Storage:
                  </span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {formatBytes(diskSpace.free_bytes)} free of {formatBytes(diskSpace.total_bytes)}
                  </span>
                </div>

                {diskSpace.free_bytes < selectedDetailsArchive.size_bytes * 1.1 ? (
                  <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 font-medium">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      Caution: Drive free space is very low. You need at least{' '}
                      {formatBytes(selectedDetailsArchive.size_bytes)} to store this archive.
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Sufficient disk space available for download and unpacking.</span>
                  </div>
                )}
              </div>
            )}

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
