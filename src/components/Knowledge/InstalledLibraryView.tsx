import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ZimLibraryItem,
  KnowledgeService,
  LibraryCollection,
  ArchiveUserMetadata,
  StorageRoot,
  ScanDirectory,
  DuplicateGroup,
} from '@/lib/services/knowledge';
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
  RefreshCw,
  FolderSearch,
  ShieldCheck,
  Tag,
  Star,
  Bookmark,
  Boxes,
  Activity,
  Download,
  Upload,
  Edit3,
  Link2,
  FolderPlus,
  Radio,
  FileCheck,
  Sliders,
  FolderSync,
} from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  archives: ZimLibraryItem[];
  onRefresh: () => void;
  onOpenReader: (archiveId: string) => void;
  onSwitchToCatalog?: () => void;
}

type SortOption =
  | 'date_desc'
  | 'date_asc'
  | 'title_asc'
  | 'title_desc'
  | 'size_desc'
  | 'articles_desc'
  | 'favorites';
type StatusFilter = 'all' | 'downloaded' | 'linked' | 'missing' | 'favorites';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Collections (LIB-003)
  const [collections, setCollections] = useState<LibraryCollection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [showCollectionsModal, setShowCollectionsModal] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDesc, setNewCollectionDesc] = useState('');
  const [archiveCollectionMemberships, setArchiveCollectionMemberships] = useState<Record<string, string[]>>({});

  // Auto Scanner (LIB-004)
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [scanFolders, setScanFolders] = useState<ScanDirectory[]>([]);
  const [newScanPath, setNewScanPath] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [discoveredFiles, setDiscoveredFiles] = useState<
    Array<{ file_name: string; file_path: string; is_already_imported: boolean }>
  >([]);

  // Duplicate Detection (LIB-005)
  const [showDuplicatesModal, setShowDuplicatesModal] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);

  // Relink Archive (LIB-006)
  const [archiveToRelink, setArchiveToRelink] = useState<ZimLibraryItem | null>(null);
  const [newRelinkPath, setNewRelinkPath] = useState('');
  const [isRelinking, setIsRelinking] = useState(false);

  // Archive Health Check (LIB-007)
  const [healthCheckingId, setHealthCheckingId] = useState<string | null>(null);
  const [healthStatusMap, setHealthStatusMap] = useState<Record<string, { valid: boolean; message: string }>>({});

  // Storage Roots (LIB-008)
  const [showStorageModal, setShowStorageModal] = useState(false);
  const [storageRoots, setStorageRoots] = useState<StorageRoot[]>([]);
  const [newStoragePath, setNewStoragePath] = useState('');

  // User Metadata / Notes / Tags / Favorites (LIB-009)
  const [archiveForMeta, setArchiveForMeta] = useState<ZimLibraryItem | null>(null);
  const [metaMap, setMetaMap] = useState<Record<string, ArchiveUserMetadata>>({});
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editFavorite, setEditFavorite] = useState(false);

  // Backup & Restore (LIB-010)
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [backupJsonString, setBackupJsonString] = useState('');
  const [restoreInputText, setRestoreInputText] = useState('');
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Delete modal state
  const [archiveToDelete, setArchiveToDelete] = useState<ZimLibraryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Drag and drop state
  const [isDragOver, setIsDragOver] = useState(false);
  const [copiedPathId, setCopiedPathId] = useState<string | null>(null);

  // Loaders
  const loadCollections = async () => {
    try {
      const list = await KnowledgeService.fetchCollections();
      setCollections(list);
    } catch (e) {
      console.warn('Failed to fetch collections', e);
    }
  };

  const loadScanFolders = async () => {
    try {
      const list = await KnowledgeService.fetchScanFolders();
      setScanFolders(list);
    } catch (e) {
      console.warn('Failed to fetch scan folders', e);
    }
  };

  const loadStorageRoots = async () => {
    try {
      const list = await KnowledgeService.fetchStorageRoots();
      setStorageRoots(list);
    } catch (e) {
      console.warn('Failed to fetch storage roots', e);
    }
  };

  const loadAllMetadata = async () => {
    const map: Record<string, ArchiveUserMetadata> = {};
    for (const a of archives) {
      const archiveId = a.id || a.file_name;
      try {
        const meta = await KnowledgeService.fetchArchiveMeta(archiveId);
        if (meta) {
          map[archiveId] = meta;
        }
      } catch {}
    }
    setMetaMap(map);
  };

  const loadArchiveMemberships = async () => {
    const memberships: Record<string, string[]> = {};
    for (const a of archives) {
      const archiveId = a.id || a.file_name;
      try {
        const cols = await KnowledgeService.fetchArchiveCollections(archiveId);
        memberships[archiveId] = cols;
      } catch {}
    }
    setArchiveCollectionMemberships(memberships);
  };

  useEffect(() => {
    loadCollections();
    loadScanFolders();
    loadStorageRoots();
    loadAllMetadata();
    loadArchiveMemberships();
  }, [archives]);

  const handleBrowseFile = async () => {
    try {
      const selected = await KnowledgeService.browseLocalZimFile();
      if (selected) {
        setImportPath(selected);
        setShowImportModal(true);
        toast.success(`Selected: ${selected.split(/[\\/]/).pop()}`);
        return;
      }
    } catch (e) {
      console.warn('Native dialog error, falling back to input:', e);
    }

    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const path = (file as any).path || file.name;
      if (path) {
        setImportPath(path);
        setShowImportModal(true);
        toast.success(`Selected: ${file.name}`);
      }
    }
  };

  // Calculate library summary statistics (LIB-002)
  const stats = useMemo(() => {
    const totalArchives = archives.length;
    const totalBytes = archives.reduce((acc, a) => acc + (a.file_size || 0), 0);
    const totalArticles = archives.reduce((acc, a) => acc + (a.article_count || 0), 0);
    const linkedCount = archives.filter((a) => a.is_external).length;
    const downloadedCount = archives.filter((a) => !a.is_external).length;
    const missingCount = archives.filter((a) => a.status === 'missing' || a.is_valid === false).length;
    const favoriteCount = archives.filter((a) => {
      const key = a.id || a.file_name;
      return metaMap[key]?.is_favorite;
    }).length;

    return {
      totalArchives,
      totalBytes,
      totalArticles,
      linkedCount,
      downloadedCount,
      missingCount,
      favoriteCount,
    };
  }, [archives, metaMap]);

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

  // LIB-006: Relink Archive Handler
  const handleRelinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!archiveToRelink || !newRelinkPath.trim()) return;

    setIsRelinking(true);
    try {
      const archiveKey = archiveToRelink.id || archiveToRelink.file_name;
      const updated = await KnowledgeService.relinkArchive(archiveKey, newRelinkPath.trim());
      toast.success(`Archive "${updated.title}" successfully relinked!`);
      setArchiveToRelink(null);
      setNewRelinkPath('');
      onRefresh();
    } catch (err: any) {
      toast.error(`Failed to relink archive: ${err.message}`);
    } finally {
      setIsRelinking(false);
    }
  };

  // LIB-007: Health Check Handler
  const handleHealthCheck = async (archive: ZimLibraryItem) => {
    const archiveKey = archive.id || archive.file_name;
    setHealthCheckingId(archiveKey);
    try {
      const res = await KnowledgeService.healthCheckArchive(archiveKey);
      const isValid = Boolean(res.valid ?? (res.status === 'ok'));
      setHealthStatusMap((prev) => ({
        ...prev,
        [archiveKey]: { valid: isValid, message: res.message },
      }));
      if (isValid) {
        toast.success(`Health Check Passed: "${archive.title}" is 100% readable.`);
      } else {
        toast.error(`Health Warning: ${res.message}`);
      }
    } catch (err: any) {
      toast.error(`Health check failed: ${err.message}`);
    } finally {
      setHealthCheckingId(null);
    }
  };

  // LIB-005: Duplicates Handler
  const handleOpenDuplicates = async () => {
    setIsCheckingDuplicates(true);
    setShowDuplicatesModal(true);
    try {
      const groups = await KnowledgeService.fetchDuplicates();
      setDuplicateGroups(groups);
    } catch (err: any) {
      toast.error(`Failed to analyze duplicates: ${err.message}`);
    } finally {
      setIsCheckingDuplicates(false);
    }
  };

  // LIB-004: Scanner Handlers
  const handleTriggerScan = async () => {
    setIsScanning(true);
    try {
      toast.info('Scanning directories recursively for .zim archives...');
      const discovered = await KnowledgeService.runScan();
      setDiscoveredFiles(discovered);
      const newItems = discovered.filter((d) => !d.is_already_imported);
      toast.success(`Scan complete! Found ${discovered.length} archives (${newItems.length} new).`);
    } catch (err: any) {
      toast.error(`Scan failed: ${err.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  // LIB-009: Favorite Toggle Handler
  const handleToggleFavorite = async (archive: ZimLibraryItem) => {
    const archiveKey = archive.id || archive.file_name;
    const current = metaMap[archiveKey]?.isFavorite || metaMap[archiveKey]?.is_favorite || false;
    const nextVal = !current;
    try {
      await KnowledgeService.saveArchiveMeta(archiveKey, {
        isFavorite: nextVal,
        is_favorite: nextVal,
      });
      setMetaMap((prev) => ({
        ...prev,
        [archiveKey]: {
          ...(prev[archiveKey] || {
            archiveId: archiveKey,
            customTags: [],
            isFavorite: false,
          }),
          is_favorite: nextVal,
          isFavorite: nextVal,
        },
      }));
      toast.success(nextVal ? `Added "${archive.title}" to favorites` : `Removed from favorites`);
    } catch (e: any) {
      toast.error(`Failed to update favorite: ${e.message}`);
    }
  };

  // LIB-009: Open Metadata Editor
  const handleOpenMetaEditor = (archive: ZimLibraryItem) => {
    const archiveKey = archive.id || archive.file_name;
    const existing = metaMap[archiveKey];
    setArchiveForMeta(archive);
    setEditDisplayName(existing?.displayName || existing?.custom_display_name || '');
    setEditNotes(existing?.customNotes || existing?.notes || '');
    setEditTags(
      existing?.customTags
        ? existing.customTags.join(', ')
        : existing?.tags
        ? existing.tags.join(', ')
        : ''
    );
    setEditFavorite(existing?.isFavorite ?? existing?.is_favorite ?? false);
  };

  const handleSaveMetaEditor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!archiveForMeta) return;
    const archiveKey = archiveForMeta.id || archiveForMeta.file_name;
    const parsedTags = editTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      const saved = await KnowledgeService.saveArchiveMeta(archiveKey, {
        displayName: editDisplayName.trim() || undefined,
        customNotes: editNotes.trim() || undefined,
        customTags: parsedTags,
        isFavorite: editFavorite,
        custom_display_name: editDisplayName.trim() || undefined,
        notes: editNotes.trim() || undefined,
        tags: parsedTags,
        is_favorite: editFavorite,
      });
      setMetaMap((prev) => ({ ...prev, [archiveKey]: saved }));
      toast.success(`Metadata updated for "${archiveForMeta.title}"`);
      setArchiveForMeta(null);
    } catch (e: any) {
      toast.error(`Failed to save metadata: ${e.message}`);
    }
  };

  // LIB-010: Backup and Restore Handlers
  const handleGenerateBackup = async () => {
    setIsBackingUp(true);
    try {
      const snap = await KnowledgeService.fetchBackupSnapshot();
      const jsonStr = JSON.stringify(snap, null, 2);
      setBackupJsonString(jsonStr);
      toast.success('Generated library backup snapshot');
    } catch (e: any) {
      toast.error(`Failed to generate backup: ${e.message}`);
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleDownloadBackupFile = () => {
    if (!backupJsonString) return;
    const blob = new Blob([backupJsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `noectra-library-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Backup file downloaded');
  };

  const handleRestoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restoreInputText.trim()) return;

    setIsRestoring(true);
    try {
      const parsed = JSON.parse(restoreInputText.trim());
      const res = await KnowledgeService.restoreBackupSnapshot(parsed);
      toast.success(`Successfully restored ${res.restored_items} archives from backup!`);
      setShowBackupModal(false);
      setRestoreInputText('');
      onRefresh();
    } catch (e: any) {
      toast.error(`Restore failed: ${e.message}`);
    } finally {
      setIsRestoring(false);
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
    } else if (statusFilter === 'favorites') {
      result = result.filter((a) => {
        const key = a.id || a.file_name;
        return metaMap[key]?.is_favorite;
      });
    }

    // Collection filter (LIB-003)
    if (selectedCollectionId) {
      result = result.filter((a) => {
        const key = a.id || a.file_name;
        const memberCols = archiveCollectionMemberships[key] || [];
        return memberCols.includes(selectedCollectionId);
      });
    }

    // Search query
    if (filterQuery.trim()) {
      const q = filterQuery.toLowerCase();
      result = result.filter((a) => {
        const key = a.id || a.file_name;
        const meta = metaMap[key];
        const titleMatch = a.title.toLowerCase().includes(q);
        const nameMatch = a.file_name.toLowerCase().includes(q);
        const pathMatch = a.file_path.toLowerCase().includes(q);
        const langMatch = a.language && a.language.toLowerCase().includes(q);
        const customTitleMatch = meta?.custom_display_name?.toLowerCase().includes(q);
        const notesMatch = meta?.notes?.toLowerCase().includes(q);
        const tagsMatch = meta?.tags?.some((t) => t.toLowerCase().includes(q));

        return Boolean(
          titleMatch ||
          nameMatch ||
          pathMatch ||
          langMatch ||
          customTitleMatch ||
          notesMatch ||
          tagsMatch
        );
      });
    }

    // Sort
    result.sort((a, b) => {
      const keyA = a.id || a.file_name;
      const keyB = b.id || b.file_name;

      switch (sortOption) {
        case 'favorites': {
          const favA = metaMap[keyA]?.is_favorite ? 1 : 0;
          const favB = metaMap[keyB]?.is_favorite ? 1 : 0;
          if (favB !== favA) return favB - favA;
          return a.title.localeCompare(b.title);
        }
        case 'title_asc':
          return (metaMap[keyA]?.custom_display_name || a.title).localeCompare(
            metaMap[keyB]?.custom_display_name || b.title
          );
        case 'title_desc':
          return (metaMap[keyB]?.custom_display_name || b.title).localeCompare(
            metaMap[keyA]?.custom_display_name || a.title
          );
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
  }, [archives, filterQuery, statusFilter, sortOption, selectedCollectionId, archiveCollectionMemberships, metaMap]);

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

      {/* Control & Filter Toolbar (Optimized 2-Row Balanced Layout) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0a0a0c]/90 backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-sm space-y-3">
        {/* Row 1: Primary Search + Scope Filter + Sort + Primary Import CTA */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Search local library by title, category, or path..."
              className="w-full pl-10 pr-9 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-sky-500/40 transition-all font-medium"
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

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Status Filter Segmented Control */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-medium">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  statusFilter === 'all'
                    ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                All ({archives.length})
              </button>
              <button
                onClick={() => setStatusFilter('downloaded')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  statusFilter === 'downloaded'
                    ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Managed ({stats.downloadedCount})
              </button>
              <button
                onClick={() => setStatusFilter('linked')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  statusFilter === 'linked'
                    ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Linked ({stats.linkedCount})
              </button>
            </div>

            {/* Sort Selector */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                className="bg-transparent text-slate-900 dark:text-white font-medium focus:outline-none cursor-pointer pr-1"
              >
                <option value="date_desc" className="bg-white dark:bg-[#0c1017]">Newest First</option>
                <option value="date_asc" className="bg-white dark:bg-[#0c1017]">Oldest First</option>
                <option value="favorites" className="bg-white dark:bg-[#0c1017]">Starred Favorites First</option>
                <option value="title_asc" className="bg-white dark:bg-[#0c1017]">Title (A-Z)</option>
                <option value="title_desc" className="bg-white dark:bg-[#0c1017]">Title (Z-A)</option>
                <option value="size_desc" className="bg-white dark:bg-[#0c1017]">Size (Largest)</option>
                <option value="articles_desc" className="bg-white dark:bg-[#0c1017]">Articles (Most)</option>
              </select>
            </div>

            {/* Import Action CTA Button */}
            <button
              onClick={handleBrowseFile}
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 active:scale-98 text-slate-950 text-xs font-bold uppercase tracking-wider shadow-sm transition-all flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Import .zim</span>
            </button>
          </div>
        </div>

        {/* Row 2: Secondary Utility Tools Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400 font-medium">
            <span>Tools:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowCollectionsModal(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300 text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-200 dark:border-white/10"
              title="Manage Collections (LIB-003)"
            >
              <Boxes className="w-3.5 h-3.5 text-indigo-500" />
              <span>Collections ({collections.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setShowScannerModal(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300 text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-200 dark:border-white/10"
              title="Directory Auto Scanner (LIB-004)"
            >
              <FolderSearch className="w-3.5 h-3.5 text-sky-500" />
              <span>Scanner</span>
            </button>

            <button
              type="button"
              onClick={handleOpenDuplicates}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300 text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-200 dark:border-white/10"
              title="Detect Duplicate Archives (LIB-005)"
            >
              <Copy className="w-3.5 h-3.5 text-amber-500" />
              <span>Duplicates</span>
            </button>

            <button
              type="button"
              onClick={() => setShowStorageModal(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300 text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-200 dark:border-white/10"
              title="Storage Roots & Drive Manager (LIB-008)"
            >
              <HardDrive className="w-3.5 h-3.5 text-emerald-500" />
              <span>Storage</span>
            </button>

            <button
              type="button"
              onClick={() => {
                handleGenerateBackup();
                setShowBackupModal(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300 text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-200 dark:border-white/10"
              title="Backup & Restore Library Snapshot (LIB-010)"
            >
              <FolderSync className="w-3.5 h-3.5 text-purple-500" />
              <span>Backup</span>
            </button>
          </div>
        </div>
      </div>

      {/* Collections filter chips row (LIB-003) */}
      {collections.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 font-semibold shrink-0">Collection:</span>
          <button
            onClick={() => setSelectedCollectionId(null)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all shrink-0 ${
              selectedCollectionId === null
                ? 'bg-sky-500 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All Collections
          </button>
          {collections.map((c) => {
            const isSelected = selectedCollectionId === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedCollectionId(isSelected ? null : c.id)}
                className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: c.color || '#6366f1' }}
                />
                <span>{c.name}</span>
                <span className="text-[10px] opacity-75">
                  ({c.itemCount || c.archive_count || 0})
                </span>
              </button>
            );
          })}
        </div>
      )}

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

                    {/* Action Buttons Header */}
                    <div className="flex items-center gap-1">
                      {/* Star / Favorite (LIB-009) */}
                      <button
                        onClick={() => handleToggleFavorite(archive)}
                        title={
                          metaMap[archiveKey]?.is_favorite
                            ? 'Remove star'
                            : 'Star as favorite archive'
                        }
                        className={`p-1.5 rounded-lg transition-colors ${
                          metaMap[archiveKey]?.is_favorite
                            ? 'text-amber-500 hover:bg-amber-500/10'
                            : 'text-slate-400 hover:text-amber-500 hover:bg-amber-500/10'
                        }`}
                      >
                        <Star
                          className={`w-4 h-4 ${
                            metaMap[archiveKey]?.is_favorite ? 'fill-current' : ''
                          }`}
                        />
                      </button>

                      {/* Edit Metadata & Notes (LIB-009) */}
                      <button
                        onClick={() => handleOpenMetaEditor(archive)}
                        title="Edit personal notes, custom tags, or display name"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-sky-500 hover:bg-sky-500/10 transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      {/* Integrity Health Check (LIB-007) */}
                      <button
                        onClick={() => handleHealthCheck(archive)}
                        disabled={healthCheckingId === archiveKey}
                        title="Run integrity health check"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                      >
                        {healthCheckingId === archiveKey ? (
                          <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                        ) : healthStatusMap[archiveKey]?.valid ? (
                          <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Activity className="w-4 h-4" />
                        )}
                      </button>

                      {/* Delete / Remove Action Button */}
                      <button
                        onClick={() => setArchiveToDelete(archive)}
                        title="Remove from library or delete file"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Description with RTL auto-detection */}
                  <div>
                    <h4
                      className="text-base font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug group-hover:text-sky-500 transition-colors"
                      title={
                        metaMap[archiveKey]?.custom_display_name ||
                        metaMap[archiveKey]?.displayName ||
                        archive.title
                      }
                      dir="auto"
                    >
                      {metaMap[archiveKey]?.custom_display_name ||
                        metaMap[archiveKey]?.displayName ||
                        archive.title}
                    </h4>
                    {(metaMap[archiveKey]?.custom_display_name ||
                      metaMap[archiveKey]?.displayName) && (
                      <p className="text-[10px] text-slate-400 italic truncate mt-0.5" dir="auto">
                        Original: {archive.title}
                      </p>
                    )}
                    {archive.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed" dir="auto">
                        {archive.description}
                      </p>
                    )}
                  </div>

                  {/* User Personal Notes & Tags Preview (LIB-009) */}
                  {(metaMap[archiveKey]?.notes || metaMap[archiveKey]?.customNotes) && (
                    <div className="p-2.5 rounded-xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200">
                      <span className="font-bold text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400 block mb-0.5">
                        Personal Note
                      </span>
                      <p className="line-clamp-2 italic text-[11px] leading-relaxed">
                        "{metaMap[archiveKey]?.notes || metaMap[archiveKey]?.customNotes}"
                      </p>
                    </div>
                  )}

                  {(metaMap[archiveKey]?.tags || metaMap[archiveKey]?.customTags) &&
                    (metaMap[archiveKey]?.tags?.length ||
                      metaMap[archiveKey]?.customTags?.length) ? (
                    <div className="flex flex-wrap gap-1">
                      {(metaMap[archiveKey]?.customTags || metaMap[archiveKey]?.tags || []).map(
                        (t) => (
                          <span
                            key={t}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300"
                          >
                            <Tag className="w-2.5 h-2.5 opacity-60" />
                            {t}
                          </span>
                        )
                      )}
                    </div>
                  ) : null}

                  {/* Missing File Warning & Relink Action (LIB-006) */}
                  {isMissing && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 flex flex-col gap-2 text-xs">
                      <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-semibold">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>File not found at registered disk path.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setArchiveToRelink(archive);
                          setNewRelinkPath(archive.file_path);
                        }}
                        className="w-full py-1.5 px-3 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-all"
                      >
                        <Link2 className="w-3.5 h-3.5" />
                        <span>Relink File Path (LIB-006)</span>
                      </button>
                    </div>
                  )}

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
              {/* Clickable Browse & Drop Zone */}
              <div
                onClick={handleBrowseFile}
                className="p-5 rounded-2xl border-2 border-dashed border-sky-500/30 dark:border-sky-500/20 hover:border-sky-500/60 bg-sky-500/[0.03] hover:bg-sky-500/[0.08] transition-all cursor-pointer flex flex-col items-center justify-center text-center space-y-2 group"
              >
                <div className="w-12 h-12 rounded-xl bg-sky-500/10 text-sky-500 group-hover:scale-105 flex items-center justify-center transition-transform">
                  <FolderOpen className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Click to Browse & Select .zim File
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                    or drag & drop your archive directly into this area
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBrowseFile();
                  }}
                  className="mt-1 px-4 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-600 dark:text-sky-400 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>Choose File with Explorer</span>
                </button>
              </div>

              {/* Hidden HTML5 File Input Fallback */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".zim"
                className="hidden"
                onChange={handleFileInputChange}
              />

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Selected File Path:
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={importPath}
                      onChange={(e) => setImportPath(e.target.value)}
                      placeholder="Browse a file above or enter path..."
                      className="w-full pl-3 pr-8 py-2.5 rounded-xl bg-slate-100/90 dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.08] text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/40 transition-all"
                      required
                    />
                    {importPath && (
                      <button
                        type="button"
                        onClick={() => setImportPath('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleBrowseFile}
                    className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-white text-xs font-bold flex items-center gap-1.5 border border-black/[0.06] dark:border-white/[0.08] transition-all shrink-0"
                    title="Open native file explorer"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-sky-500" />
                    <span>Browse</span>
                  </button>
                </div>
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

      {/* Relink Missing Archive Modal (LIB-006) */}
      {archiveToRelink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg p-6 rounded-3xl bg-white dark:bg-[#0c1017] border border-black/[0.08] dark:border-white/[0.1] shadow-2xl space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center shrink-0">
                <Link2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Relink Missing Archive (LIB-006)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Restore link to moved or renamed .zim archive on disk
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06] text-xs space-y-1">
              <div>
                <span className="text-slate-400">Archive Title: </span>
                <strong className="text-slate-800 dark:text-slate-200">{archiveToRelink.title}</strong>
              </div>
              <div>
                <span className="text-slate-400">Old File Path: </span>
                <span className="font-mono text-rose-500 line-through text-[11px] block truncate">
                  {archiveToRelink.file_path}
                </span>
              </div>
            </div>

            <form onSubmit={handleRelinkSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Select New .zim Location on Disk:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    value={newRelinkPath}
                    onChange={(e) => setNewRelinkPath(e.target.value)}
                    placeholder="Enter full path to .zim file on your computer..."
                    className="flex-1 px-3 py-2.5 rounded-xl bg-slate-100/90 dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.08] text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const sel = await KnowledgeService.browseLocalZimFile();
                      if (sel) setNewRelinkPath(sel);
                    }}
                    className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-white text-xs font-bold border border-black/[0.06] dark:border-white/[0.08]"
                  >
                    Browse
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setArchiveToRelink(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRelinking || !newRelinkPath.trim()}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md shadow-amber-500/20 disabled:opacity-50"
                >
                  {isRelinking ? 'Relinking...' : 'Relink Archive'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Duplicate Detection Modal (LIB-005) */}
      {showDuplicatesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-xl p-6 rounded-3xl bg-white dark:bg-[#0c1017] border border-black/[0.08] dark:border-white/[0.1] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center shrink-0">
                  <Copy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Duplicate Archive Detection (LIB-005)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Find identical archives registered across multiple paths or drives
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDuplicatesModal(false)}
                className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isCheckingDuplicates ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-slate-400">Inspecting hashes and archive sizes...</p>
              </div>
            ) : duplicateGroups.length === 0 ? (
              <div className="p-8 text-center space-y-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto" />
                <h4 className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  Zero Duplicate Archives Found!
                </h4>
                <p className="text-xs text-slate-500">
                  Every registered archive in your library has a unique identifier and file size.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  Found {duplicateGroups.length} duplicate archive group(s):
                </p>
                {duplicateGroups.map((group, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.08] space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                      <span>Group {idx + 1}: {group.title}</span>
                      <span className="font-mono text-slate-400">{formatBytes(group.file_size)}</span>
                    </div>
                    <div className="space-y-1.5 pt-1">
                      {(group.items || group.archives || []).map((a, aIdx) => (
                        <div
                          key={a.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-[#131823] border border-black/[0.04] dark:border-white/[0.06]"
                        >
                          <div className="min-w-0 pr-2">
                            <span className="font-mono text-[11px] truncate block text-slate-600 dark:text-slate-400">
                              {a.file_path}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {a.is_external ? 'Linked Storage' : 'Managed Library'} • Added{' '}
                              {a.modified_at?.split('T')[0]}
                            </span>
                          </div>
                          {aIdx > 0 && (
                            <button
                              type="button"
                              onClick={async () => {
                                await KnowledgeService.deleteArchive(a.id, false);
                                toast.success('Duplicate link removed');
                                const updated = await KnowledgeService.fetchDuplicates();
                                setDuplicateGroups(updated);
                                onRefresh();
                              }}
                              className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 text-xs font-semibold shrink-0"
                            >
                              Unlink
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowDuplicatesModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto Scanner Modal (LIB-004) */}
      {showScannerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-xl p-6 rounded-3xl bg-white dark:bg-[#0c1017] border border-black/[0.08] dark:border-white/[0.1] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-500 border border-sky-500/20 flex items-center justify-center shrink-0">
                  <FolderSearch className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Directory Auto Scanner (LIB-004)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Watch and scan local directories for offline .zim archives
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowScannerModal(false)}
                className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Add Watched Folder */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06] space-y-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Add Watch Directory
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newScanPath}
                  onChange={(e) => setNewScanPath(e.target.value)}
                  placeholder="e.g. D:\KnowledgeArchives or E:\ZimDumps"
                  className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-[#131823] border border-black/[0.06] dark:border-white/[0.08] text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!newScanPath.trim()) return;
                    try {
                      await KnowledgeService.saveScanFolder(newScanPath.trim(), true);
                      toast.success('Scanner directory saved');
                      setNewScanPath('');
                      loadScanFolders();
                    } catch (e: any) {
                      toast.error(`Error saving folder: ${e.message}`);
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold shrink-0"
                >
                  Add Folder
                </button>
              </div>
            </div>

            {/* Watched Folders List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-500 uppercase tracking-wider">
                  Configured Directories ({scanFolders.length})
                </span>
                <button
                  type="button"
                  disabled={isScanning}
                  onClick={handleTriggerScan}
                  className="px-3 py-1 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-sky-500/20 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isScanning ? 'animate-spin' : ''}`} />
                  <span>Run Scan Now</span>
                </button>
              </div>

              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {scanFolders.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.06] text-xs"
                  >
                    <span className="font-mono text-[11px] truncate text-slate-700 dark:text-slate-300">
                      {f.path}
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        await KnowledgeService.deleteScanFolder(f.id);
                        loadScanFolders();
                      }}
                      className="p-1 text-slate-400 hover:text-rose-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Discovered Files Table */}
            {discoveredFiles.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-black/[0.04] dark:border-white/[0.06]">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Discovered Archives ({discoveredFiles.length})
                </span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {discoveredFiles.map((d, dIdx) => (
                    <div
                      key={dIdx}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <strong className="block text-slate-800 dark:text-slate-200 truncate">
                          {d.file_name}
                        </strong>
                        <span className="font-mono text-[10px] text-slate-400 truncate block">
                          {d.file_path}
                        </span>
                      </div>
                      {d.is_already_imported ? (
                        <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md shrink-0">
                          Imported
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await KnowledgeService.importLocalZim(d.file_path, false);
                              toast.success(`Imported: ${d.file_name}`);
                              d.is_already_imported = true;
                              onRefresh();
                            } catch (e: any) {
                              toast.error(`Import failed: ${e.message}`);
                            }
                          }}
                          className="px-3 py-1 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold shrink-0"
                        >
                          Import
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowScannerModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collection Manager Modal (LIB-003) */}
      {showCollectionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-xl p-6 rounded-3xl bg-white dark:bg-[#0c1017] border border-black/[0.08] dark:border-white/[0.1] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 flex items-center justify-center shrink-0">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Collection Manager (LIB-003)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Group encyclopedias into personalized knowledge collections
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCollectionsModal(false)}
                className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Create Collection Form */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newCollectionName.trim()) return;
                try {
                  await KnowledgeService.saveCollection({
                    name: newCollectionName.trim(),
                    description: newCollectionDesc.trim() || undefined,
                    color: '#6366f1',
                  });
                  toast.success(`Collection "${newCollectionName.trim()}" created!`);
                  setNewCollectionName('');
                  setNewCollectionDesc('');
                  loadCollections();
                } catch (err: any) {
                  toast.error(`Error creating collection: ${err.message}`);
                }
              }}
              className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06] space-y-2.5"
            >
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Create New Collection
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  placeholder="Collection Name (e.g. Medicine)"
                  className="px-3 py-2 rounded-xl bg-white dark:bg-[#131823] border border-black/[0.06] dark:border-white/[0.08] text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <input
                  type="text"
                  value={newCollectionDesc}
                  onChange={(e) => setNewCollectionDesc(e.target.value)}
                  placeholder="Short Description (optional)"
                  className="px-3 py-2 rounded-xl bg-white dark:bg-[#131823] border border-black/[0.06] dark:border-white/[0.08] text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
                >
                  Create Collection
                </button>
              </div>
            </form>

            {/* Existing Collections List */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Existing Collections ({collections.length})
              </span>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {collections.map((col) => (
                  <div
                    key={col.id}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.06] space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: col.color || '#6366f1' }}
                        />
                        <strong className="text-slate-800 dark:text-slate-200">{col.name}</strong>
                        <span className="text-slate-400">
                          ({col.itemCount || col.archive_count || 0} archives)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          await KnowledgeService.deleteCollection(col.id);
                          toast.success('Collection removed');
                          loadCollections();
                        }}
                        className="p-1 text-slate-400 hover:text-rose-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Quick archive assignment toggle */}
                    <div className="pt-1 border-t border-black/[0.04] dark:border-white/[0.04] max-h-32 overflow-y-auto space-y-1">
                      {archives.map((a) => {
                        const aKey = a.id || a.file_name;
                        const isMember = (archiveCollectionMemberships[aKey] || []).includes(col.id);
                        return (
                          <div
                            key={aKey}
                            onClick={async () => {
                              const action = isMember ? 'remove' : 'add';
                              await KnowledgeService.manageCollectionMember(col.id, aKey, action);
                              loadArchiveMemberships();
                              loadCollections();
                            }}
                            className="flex items-center justify-between p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer text-xs"
                          >
                            <span className="truncate pr-2 text-slate-700 dark:text-slate-300">
                              {a.title}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                isMember
                                  ? 'bg-indigo-500 text-white'
                                  : 'bg-slate-200 dark:bg-white/10 text-slate-500'
                              }`}
                            >
                              {isMember ? 'Included' : '+ Add'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowCollectionsModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Storage Roots & Drive Manager Modal (LIB-008) */}
      {showStorageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-xl p-6 rounded-3xl bg-white dark:bg-[#0c1017] border border-black/[0.08] dark:border-white/[0.1] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Storage Roots & Multi-Location Manager (LIB-008)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Manage storage drives and target locations for offline dumps
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowStorageModal(false)}
                className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Add Custom Storage Root */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06] space-y-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Register Custom Storage Location
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newStoragePath}
                  onChange={(e) => setNewStoragePath(e.target.value)}
                  placeholder="e.g. E:\NoectraZimStorage or /Volumes/ExternalSSD"
                  className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-[#131823] border border-black/[0.06] dark:border-white/[0.08] text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!newStoragePath.trim()) return;
                    try {
                      await KnowledgeService.saveStorageRoot(newStoragePath.trim(), 'linked');
                      toast.success('Storage location registered');
                      setNewStoragePath('');
                      loadStorageRoots();
                    } catch (e: any) {
                      toast.error(`Error: ${e.message}`);
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shrink-0"
                >
                  Register
                </button>
              </div>
            </div>

            {/* Storage Roots List */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Active Storage Locations ({storageRoots.length})
              </span>
              <div className="space-y-2.5 max-h-56 overflow-y-auto">
                {storageRoots.map((root) => (
                  <div
                    key={root.id}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.06] space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <strong className="text-slate-900 dark:text-white">
                          {root.role === 'managed' ? 'Primary Managed Storage' : 'Linked External Drive'}
                        </strong>
                        {(root.role === 'managed' || root.is_default) && (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            Default
                          </span>
                        )}
                      </div>
                      {root.role !== 'managed' && !root.is_default && (
                        <button
                          type="button"
                          onClick={async () => {
                            await KnowledgeService.deleteStorageRoot(root.id);
                            loadStorageRoots();
                          }}
                          className="p-1 text-slate-400 hover:text-rose-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="font-mono text-[11px] text-slate-400 truncate">{root.path}</p>
                    {((root.freeBytes || root.free_bytes || 0) > 0) && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] text-slate-500">
                          <span>
                            Free Space: {formatBytes(root.freeBytes || root.free_bytes || 0)}
                          </span>
                          <span>
                            Total: {formatBytes(root.totalBytes || root.total_bytes || 0)}
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(
                                  5,
                                  (((root.totalBytes || root.total_bytes || 1) -
                                    (root.freeBytes || root.free_bytes || 0)) /
                                    (root.totalBytes || root.total_bytes || 1)) *
                                    100
                                )
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowStorageModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Metadata & Notes Editor Modal (LIB-009) */}
      {archiveForMeta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg p-6 rounded-3xl bg-white dark:bg-[#0c1017] border border-black/[0.08] dark:border-white/[0.1] shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-500 border border-sky-500/20 flex items-center justify-center shrink-0">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Metadata & Notes Editor (LIB-009)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs">
                    {archiveForMeta.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setArchiveForMeta(null)}
                className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMetaEditor} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Custom Display Title (optional):
                </label>
                <input
                  type="text"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  placeholder={archiveForMeta.title}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.08] text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Custom Tags (comma separated):
                </label>
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  placeholder="e.g. pharmacology, cardiology, exam2025"
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.08] text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Personal Research Notes:
                </label>
                <textarea
                  rows={4}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Add your study notes, reminders, or chapter references here..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.08] text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06]">
                <input
                  type="checkbox"
                  id="starFav"
                  checked={editFavorite}
                  onChange={(e) => setEditFavorite(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-amber-500"
                />
                <label htmlFor="starFav" className="font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
                  Star this archive as a Favorite
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setArchiveForMeta(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold shadow-md shadow-sky-500/20"
                >
                  Save Metadata
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Backup & Restore Modal (LIB-010) */}
      {showBackupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-xl p-6 rounded-3xl bg-white dark:bg-[#0c1017] border border-black/[0.08] dark:border-white/[0.1] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20 flex items-center justify-center shrink-0">
                  <FolderSync className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Backup & Restore (LIB-010)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Export library metadata & snapshot or restore on another machine
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBackupModal(false)}
                className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Export Section */}
            <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40 space-y-3">
              <span className="text-xs font-bold text-purple-900 dark:text-purple-300 block">
                Export Library Snapshot (JSON)
              </span>
              <p className="text-xs text-purple-700 dark:text-purple-400">
                Exports all registered archives, collections, and your custom notes.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isBackingUp}
                  onClick={handleGenerateBackup}
                  className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isBackingUp ? 'animate-spin' : ''}`} />
                  <span>Refresh Snapshot</span>
                </button>
                {backupJsonString && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(backupJsonString);
                        toast.success('Backup JSON copied to clipboard!');
                      }}
                      className="px-3.5 py-2 rounded-xl bg-white dark:bg-white/10 text-slate-800 dark:text-white text-xs font-semibold border border-black/[0.06] dark:border-white/[0.08]"
                    >
                      Copy JSON
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadBackupFile}
                      className="px-3.5 py-2 rounded-xl bg-white dark:bg-white/10 text-slate-800 dark:text-white text-xs font-semibold border border-black/[0.06] dark:border-white/[0.08] flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download File</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Restore Section */}
            <form onSubmit={handleRestoreSubmit} className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06] space-y-3">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Restore Library Snapshot
              </span>
              <textarea
                rows={4}
                required
                value={restoreInputText}
                onChange={(e) => setRestoreInputText(e.target.value)}
                placeholder="Paste your JSON backup payload here to restore..."
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#131823] border border-black/[0.06] dark:border-white/[0.08] text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isRestoring || !restoreInputText.trim()}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold disabled:opacity-50"
                >
                  {isRestoring ? 'Restoring...' : 'Restore Library Index'}
                </button>
              </div>
            </form>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowBackupModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
