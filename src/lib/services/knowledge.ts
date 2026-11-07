export interface CatalogLanguage {
  code: string;
  name: string;
  count?: number;
}

export interface ZimArchive {
  id: string;
  title: string;
  description: string;
  language: string;
  category: string;
  size_bytes: number;
  article_count?: number;
  media_count?: number;
  updated_at?: string;
  download_url?: string;
  sha256?: string;
  illustration_url?: string;
  name?: string;
  tags: string[];
  local_path?: string;
  is_installed: boolean;
}

export interface CatalogResponse {
  total: number;
  start_index: number;
  items_per_page: number;
  entries: ZimArchive[];
}

export interface CatalogFilterParams {
  q?: string;
  category?: string;
  lang?: string;
  tag?: string;
  notag?: string;
  maxsize?: number;
  start?: number;
  count?: number;
}

export interface SavedCatalogSearch {
  id: string;
  name: string;
  query: string;
  filtersJson: CatalogFilterParams;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface DiskSpaceInfo {
  free_bytes: number;
  total_bytes: number;
  destination_path: string;
}

export interface CatalogSource {
  id: string;
  name: string;
  url: string;
  isEnabled: boolean;
  isDefault: boolean;
  priority: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface LibraryCollection {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  itemCount?: number;
  archive_count?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ArchiveUserMetadata {
  archiveId: string;
  archive_id?: string;
  displayName?: string;
  custom_display_name?: string;
  customNotes?: string;
  notes?: string;
  customTags: string[];
  tags?: string[];
  isFavorite: boolean;
  is_favorite?: boolean;
  updatedAt?: string;
}

export interface StorageRoot {
  id: string;
  path: string;
  role: string;
  isActive: boolean;
  is_default?: boolean;
  freeBytes?: number;
  free_bytes?: number;
  totalBytes?: number;
  total_bytes?: number;
  createdAt?: string;
}

export interface ScanDirectory {
  id: string;
  path: string;
  recursive: boolean;
  lastScannedAt?: string;
  createdAt?: string;
}

export interface DownloadBundle {
  id: string;
  name: string;
  archiveIds: string[];
  totalBytes: number;
  totalSizeBytes?: number;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LibraryStats {
  total_archives: number;
  available_archives: number;
  missing_archives: number;
  total_size_bytes: number;
  managed_size_bytes: number;
  linked_size_bytes: number;
  total_articles: number;
}

export interface DuplicateGroup {
  title: string;
  file_size: number;
  count: number;
  items: ZimLibraryItem[];
  archives?: ZimLibraryItem[];
}

export type DownloadStatus =
  | 'queued'
  | 'downloading'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface DownloadTask {
  id: string;
  title: string;
  file_name: string;
  download_url: string;
  total_bytes: number;
  downloaded_bytes: number;
  speed_bps: number;
  progress_pct: number;
  status: DownloadStatus;
  error_message?: string;
  target_path: string;
}

export interface ZimLibraryItem {
  id: string;
  title: string;
  file_name: string;
  file_path: string;
  file_size: number;
  article_count: number;
  cluster_count: number;
  main_page_url?: string;
  is_external: boolean;
  description?: string;
  language?: string;
  modified_at?: string;
  status: 'downloaded' | 'linked' | 'missing' | string;
  is_valid: boolean;
}

export interface ZimArticleSummary {
  url: string;
  title: string;
  namespace: string;
  mime_type: string;
}

export interface ZimArticleContent {
  url: string;
  title: string;
  html: string;
  text: string;
  mime_type: string;
}


// ==========================================
// Types for Items 31 to 70
// ==========================================

export interface ArticleAnnotation {
  id: string;
  archiveId: string;
  articlePath: string;
  selectedText: string;
  noteText?: string;
  color: string;
  startOffset: number;
  endOffset: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReadingHistoryItem {
  id: string;
  archiveId: string;
  archiveTitle: string;
  articlePath: string;
  articleTitle: string;
  scrollPercentage: number;
  readDurationSeconds: number;
  lastReadAt: string;
}

export interface ArticleBookmark {
  id: string;
  archiveId: string;
  articlePath: string;
  title: string;
  category?: string;
  tags?: string;
  createdAt: string;
}

export interface GlobalSearchResult {
  archiveId: string;
  archiveTitle: string;
  articlePath: string;
  title: string;
  snippet: string;
  score: number;
  wordCount: number;
}

export interface IndexingStatus {
  total_indexed_articles: number;
  total_words_indexed: number;
  unique_archives_indexed: number;
  last_indexed_at?: string;
}

export interface MedicalGlossaryTerm {
  id: string;
  termEn: string;
  termFa: string;
  phoneticFa?: string;
  specialty?: string;
  definitionEn?: string;
  definitionFa?: string;
  clinicalSignificance?: string;
  icdCode?: string;
  favorite: boolean;
  createdAt?: string;
}

export interface ClinicalGuideline {
  id: string;
  guidelineCode: string;
  title: string;
  organization: string;
  version: string;
  publicationYear: number;
  specialty: string;
  summary: string;
  recommendationsJson?: string;
  evidenceGrade: string;
  sourceUrl?: string;
  updatedAt?: string;
}

export interface ClinicalConflict {
  id: string;
  topic: string;
  guidelineAId: string;
  guidelineBId: string;
  stanceA: string;
  stanceB: string;
  clinicalImplication: string;
  expertConsensus?: string;
}

export interface ArchiveVersionItem {
  id: string;
  archiveId: string;
  versionTag: string;
  releaseDate: string;
  fileSizeBytes: number;
  sha256?: string;
  changeLog?: string;
  isCurrent: boolean;
  backupPath?: string;
  retentionStatus: string;
}

export interface ArchiveUpdateCheckResult {
  checked_at: string;
  total_archives: number;
  updates_found: number;
  updates: Array<{
    archive_id: string;
    title: string;
    current_date?: string;
    new_version_date?: string;
    download_url?: string;
    size_mb: number;
  }>;
}

export interface RagContextResponse {
  query: string;
  chunks_found: number;
  context_chunks: Array<{
    archive: string;
    article: string;
    path: string;
    snippet: string;
    score: number;
  }>;
  citations: string[];
}


// ==========================================
// Types for Items 71 to 81 (EXT-001 to EXT-007)
// ==========================================

export interface KnowledgeRecommendation {
  id: string;
  title: string;
  description: string;
  category: string;
  language: string;
  size_bytes: number;
  download_url?: string;
  reason: string;
}

export interface KnowledgeGraphEntity {
  id: string;
  archiveId: string;
  articlePath: string;
  entityType: string;
  name: string;
  confidence: number;
  createdAt: string;
}

export interface KnowledgeGraphRelation {
  id: string;
  sourceEntity: string;
  targetEntity: string;
  relationType: string;
  citation: string;
  confidence: number;
  createdAt: string;
}

export interface CrossArchiveLink {
  archive_id: string;
  archive_title: string;
  article_path: string;
  title: string;
  link_type: 'EXACT' | 'REDIRECT' | 'TITLE_MATCH' | 'SEMANTIC';
  snippet: string;
}

export interface PersonalWorkspaceItem {
  id: string;
  itemType: 'article' | 'note' | 'highlight' | 'pdf';
  title: string;
  content: string;
  tags: string;
  sourceRef: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResearchDossier {
  id: string;
  title: string;
  topic: string;
  content: string;
  citations: string;
  createdAt: string;
}

export interface OfflineModelItem {
  id: string;
  name: string;
  modelType: 'translation' | 'embedding' | 'reranker' | 'tts' | 'llm';
  sizeBytes: number;
  license: string;
  languages: string;
  status: 'installed' | 'available' | 'downloading';
  downloadUrl?: string;
  hardwareReqs: string;
  updatedAt: string;
}

export interface KnowledgePackSnapshot {
  pack_name: string;
  exported_at: string;
  schema_version: number;
  collections: any[];
  saved_searches: any[];
  workspace_items: PersonalWorkspaceItem[];
  dossiers: ResearchDossier[];
  knowledge_graph: {
    entities: KnowledgeGraphEntity[];
    relations: KnowledgeGraphRelation[];
  };
}

export class KnowledgeService {
  private static async apiFetch(endpoint: string, options?: RequestInit): Promise<Response> {
    const isTauri =
      typeof window !== 'undefined' &&
      (window.location.protocol === 'tauri:' ||
        window.location.hostname === 'tauri.localhost' ||
        (window as any).__TAURI_INTERNALS__ !== undefined);

    const primaryBase = isTauri ? 'http://127.0.0.1:3001/api/knowledge' : '/api/knowledge';
    const fallbackBase = isTauri ? '/api/knowledge' : 'http://127.0.0.1:3001/api/knowledge';

    try {
      const res = await fetch(`${primaryBase}${endpoint}`, options);
      return res;
    } catch {
      try {
        const fallbackRes = await fetch(`${fallbackBase}${endpoint}`, options);
        return fallbackRes;
      } catch {
        throw new Error(
          'Cannot connect to backend engine on port 3001. Please make sure the Noectra AI backend server is active.'
        );
      }
    }
  }

  static async fetchCatalog(params: CatalogFilterParams = {}): Promise<CatalogResponse> {
    const query = new URLSearchParams();
    if (params.q) query.append('q', params.q);
    if (params.category && params.category !== 'all') query.append('category', params.category);
    if (params.lang && params.lang !== 'all') query.append('lang', params.lang);
    if (params.tag) query.append('tag', params.tag);
    if (params.notag) query.append('notag', params.notag);
    if (params.maxsize) query.append('maxsize', params.maxsize.toString());
    if (params.start !== undefined) query.append('start', params.start.toString());
    if (params.count !== undefined) query.append('count', params.count.toString());

    const res = await this.apiFetch(`/catalog?${query.toString()}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch catalog: ${res.statusText}`);
    }
    return res.json();
  }

  static async fetchCategories(): Promise<string[]> {
    try {
      const res = await this.apiFetch('/categories');
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  }

  static async fetchLanguages(): Promise<CatalogLanguage[]> {
    try {
      const res = await this.apiFetch('/languages');
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  }

  static async browseLocalZimFile(): Promise<string | null> {
    try {
      const res = await this.apiFetch('/browse-file', { method: 'POST' });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.cancelled || !data.file_path) return null;
      return data.file_path;
    } catch (e) {
      console.warn('Failed to open native file dialog:', e);
      return null;
    }
  }

  static async fetchLibrary(): Promise<ZimLibraryItem[]> {
    const res = await this.apiFetch('/library');
    if (!res.ok) {
      throw new Error(`Failed to fetch local archives: ${res.statusText}`);
    }
    return res.json();
  }

  static async importLocalZim(filePath: string, copyToLibrary = false): Promise<ZimLibraryItem> {
    const res = await this.apiFetch('/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_path: filePath, copy_to_library: copyToLibrary }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Failed to import ZIM file');
    }
    return res.json();
  }

  static async deleteArchive(id: string, deleteFile = false): Promise<boolean> {
    const res = await this.apiFetch(
      `/library/${encodeURIComponent(id)}?delete_file=${deleteFile ? 'true' : 'false'}`,
      {
        method: 'DELETE',
      }
    );
    return res.ok;
  }

  static async revealArchive(id: string): Promise<boolean> {
    const res = await this.apiFetch(`/library/${encodeURIComponent(id)}/reveal`, {
      method: 'POST',
    });
    return res.ok;
  }

  static async fetchDownloads(): Promise<DownloadTask[]> {
    try {
      const res = await this.apiFetch('/downloads');
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  }

  static async startDownload(archive: ZimArchive): Promise<DownloadTask> {
    if (!archive.download_url) {
      throw new Error('No download link available for this archive');
    }
    const res = await this.apiFetch('/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: archive.id,
        title: archive.title,
        download_url: archive.download_url,
        total_bytes: archive.size_bytes,
        sha256: archive.sha256,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Failed to start download');
    }
    return res.json();
  }

  static async pauseDownload(id: string): Promise<boolean> {
    const res = await this.apiFetch(`/downloads/${encodeURIComponent(id)}/pause`, {
      method: 'POST',
    });
    return res.ok;
  }

  static async resumeDownload(id: string): Promise<boolean> {
    const res = await this.apiFetch(`/downloads/${encodeURIComponent(id)}/resume`, {
      method: 'POST',
    });
    return res.ok;
  }

  static async cancelDownload(id: string): Promise<boolean> {
    const res = await this.apiFetch(`/downloads/${encodeURIComponent(id)}/cancel`, {
      method: 'POST',
    });
    return res.ok;
  }

  static async searchArticles(archiveId: string, q = '', limit = 60): Promise<ZimArticleSummary[]> {
    const params = new URLSearchParams({ q, limit: limit.toString() });
    const res = await this.apiFetch(`/zim/${encodeURIComponent(archiveId)}/articles?${params.toString()}`);
    if (!res.ok) {
      throw new Error(`Failed to search articles: ${res.statusText}`);
    }
    return res.json();
  }

  static async readArticle(archiveId: string, articleUrl: string): Promise<ZimArticleContent> {
    const params = new URLSearchParams({ url: articleUrl });
    const res = await this.apiFetch(`/zim/${encodeURIComponent(archiveId)}/article?${params.toString()}`);
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Failed to load article content');
    }
    return res.json();
  }

  static async fetchDiskSpace(): Promise<DiskSpaceInfo> {
    const res = await this.apiFetch('/disk-space');
    if (!res.ok) {
      return { free_bytes: 0, total_bytes: 0, destination_path: '' };
    }
    return res.json();
  }

  static async fetchSavedSearches(): Promise<SavedCatalogSearch[]> {
    try {
      const res = await this.apiFetch('/saved-searches');
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  }

  static async saveSearch(
    name: string,
    query?: string,
    filters: CatalogFilterParams = {}
  ): Promise<SavedCatalogSearch> {
    const res = await this.apiFetch('/saved-searches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, query, filters }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Failed to save search preset');
    }
    return res.json();
  }

  static async deleteSavedSearch(id: string): Promise<boolean> {
    const res = await this.apiFetch(`/saved-searches/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return res.ok;
  }

  // --- CAT-006: Multiple Catalog Sources ---
  static async fetchSources(): Promise<CatalogSource[]> {
    try {
      const res = await this.apiFetch('/sources');
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  }

  static async saveSource(source: Partial<CatalogSource>): Promise<CatalogSource> {
    const res = await this.apiFetch('/sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(source),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Failed to save catalog source');
    }
    return res.json();
  }

  static async deleteSource(id: string): Promise<boolean> {
    const res = await this.apiFetch(`/sources/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return res.ok;
  }

  static async testSource(url: string): Promise<{ success: boolean; status: number; message: string }> {
    const res = await this.apiFetch('/sources/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) {
      return { success: false, status: res.status, message: res.statusText };
    }
    return res.json();
  }

  // --- DL-003, DL-009: Download Bulk Controls ---
  static async pauseAllDownloads(): Promise<boolean> {
    const res = await this.apiFetch('/downloads/pause-all', { method: 'POST' });
    return res.ok;
  }

  static async resumeAllDownloads(): Promise<boolean> {
    const res = await this.apiFetch('/downloads/resume-all', { method: 'POST' });
    return res.ok;
  }

  static async clearCompletedDownloads(): Promise<boolean> {
    const res = await this.apiFetch('/downloads/clear-completed', { method: 'POST' });
    return res.ok;
  }

  // --- DL-007: Bundles ---
  static async fetchBundles(): Promise<DownloadBundle[]> {
    try {
      const res = await this.apiFetch('/bundles');
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  }

  static async saveBundle(name: string, archiveIds: string[], totalBytes: number): Promise<DownloadBundle> {
    const res = await this.apiFetch('/bundles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, archive_ids: archiveIds, total_bytes: totalBytes }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Failed to save download bundle');
    }
    return res.json();
  }

  static async deleteBundle(id: string): Promise<boolean> {
    const res = await this.apiFetch(`/bundles/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return res.ok;
  }

  // --- LIB-002, LIB-005, LIB-006, LIB-007: Library Stats, Duplicates, Relink, Health Check ---
  static async fetchLibraryStats(): Promise<LibraryStats> {
    const res = await this.apiFetch('/library/stats');
    if (!res.ok) {
      return {
        total_archives: 0,
        available_archives: 0,
        missing_archives: 0,
        total_size_bytes: 0,
        managed_size_bytes: 0,
        linked_size_bytes: 0,
        total_articles: 0,
      };
    }
    return res.json();
  }

  static async fetchLibraryDuplicates(): Promise<DuplicateGroup[]> {
    try {
      const res = await this.apiFetch('/library/duplicates');
      if (!res.ok) return [];
      const data = await res.json();
      const list = data.duplicates || [];
      return list.map((g: any) => ({
        ...g,
        archives: g.items || [],
      }));
    } catch {
      return [];
    }
  }

  static async fetchDuplicates(): Promise<DuplicateGroup[]> {
    return this.fetchLibraryDuplicates();
  }

  static async healthCheckArchive(
    id: string
  ): Promise<{ status: string; message: string; verified_at: string; article_count?: number; valid?: boolean }> {
    const res = await this.apiFetch(`/library/${encodeURIComponent(id)}/health-check`, { method: 'POST' });
    if (!res.ok) {
      return { status: 'unknown', message: 'Failed to run health check', verified_at: new Date().toISOString(), valid: false };
    }
    const data = await res.json();
    return {
      ...data,
      valid: data.status === 'ok' || data.valid === true,
    };
  }

  static async relinkArchive(id: string, newPath: string): Promise<ZimLibraryItem> {
    const res = await this.apiFetch(`/library/${encodeURIComponent(id)}/relink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ new_path: newPath }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Failed to relink archive');
    }
    return res.json();
  }

  // --- LIB-003: Collections Manager ---
  static async fetchCollections(): Promise<LibraryCollection[]> {
    try {
      const res = await this.apiFetch('/collections');
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  }

  static async saveCollection(col: Partial<LibraryCollection>): Promise<LibraryCollection> {
    const res = await this.apiFetch('/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(col),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Failed to save collection');
    }
    return res.json();
  }

  static async deleteCollection(id: string): Promise<boolean> {
    const res = await this.apiFetch(`/collections/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return res.ok;
  }

  static async manageCollectionMember(collectionId: string, archiveId: string, action: 'add' | 'remove'): Promise<boolean> {
    const res = await this.apiFetch(`/collections/${encodeURIComponent(collectionId)}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archive_id: archiveId, action }),
    });
    return res.ok;
  }

  static async fetchArchiveCollections(archiveId: string): Promise<string[]> {
    try {
      const res = await this.apiFetch(`/library/${encodeURIComponent(archiveId)}/collections`);
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  }

  // --- LIB-004: Scanner Folders ---
  static async fetchScanFolders(): Promise<ScanDirectory[]> {
    try {
      const res = await this.apiFetch('/scanner/folders');
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  }

  static async saveScanFolder(path: string, recursive = true): Promise<ScanDirectory> {
    const res = await this.apiFetch('/scanner/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, recursive }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Failed to save scanner folder');
    }
    return res.json();
  }

  static async deleteScanFolder(id: string): Promise<boolean> {
    const res = await this.apiFetch(`/scanner/folders/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return res.ok;
  }

  static async runScan(): Promise<Array<{ file_name: string; file_path: string; is_already_imported: boolean }>> {
    const res = await this.apiFetch('/scanner/scan', { method: 'POST' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.discovered || [];
  }

  // --- LIB-008: Storage Roots ---
  static async fetchStorageRoots(): Promise<StorageRoot[]> {
    try {
      const res = await this.apiFetch('/storage/roots');
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  }

  static async saveStorageRoot(path: string, role = 'managed'): Promise<StorageRoot> {
    const res = await this.apiFetch('/storage/roots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, role }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Failed to register storage location');
    }
    return res.json();
  }

  static async deleteStorageRoot(id: string): Promise<boolean> {
    const res = await this.apiFetch(`/storage/roots/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return res.ok;
  }

  // --- LIB-009: User Metadata & Personal Tags/Notes ---
  static async fetchArchiveMeta(archiveId: string): Promise<ArchiveUserMetadata | null> {
    try {
      const res = await this.apiFetch(`/library/${encodeURIComponent(archiveId)}/meta`);
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  }

  static async saveArchiveMeta(archiveId: string, meta: Partial<ArchiveUserMetadata>): Promise<ArchiveUserMetadata> {
    const res = await this.apiFetch(`/library/${encodeURIComponent(archiveId)}/meta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(meta),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Failed to save archive metadata');
    }
    return res.json();
  }

  // --- LIB-010: Backup & Restore ---
  static async fetchBackupSnapshot(): Promise<any> {
    const res = await this.apiFetch('/backup');
    if (!res.ok) {
      throw new Error('Failed to generate backup snapshot');
    }
    return res.json();
  }

  static async restoreBackupSnapshot(payload: any): Promise<{ success: boolean; restored_items: number }> {
    const res = await this.apiFetch('/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Failed to restore backup snapshot');
    }
    return res.json();
  }

  // --- READ-001 to READ-012: Reader Annotations, History & Bookmarks ---
  static async fetchAnnotations(archiveId?: string, articlePath?: string): Promise<ArticleAnnotation[]> {
    try {
      const params = new URLSearchParams();
      if (archiveId) params.append('archive_id', archiveId);
      if (articlePath) params.append('article_path', articlePath);
      const res = await this.apiFetch(`/reader/annotations?${params.toString()}`);
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  }

  static async saveAnnotation(annotation: Partial<ArticleAnnotation>): Promise<{ success: boolean; id: string }> {
    const res = await this.apiFetch('/reader/annotations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(annotation),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Failed to save annotation');
    }
    return res.json();
  }

  static async deleteAnnotation(id: string): Promise<boolean> {
    const res = await this.apiFetch(`/reader/annotations/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return res.ok;
  }

  static async fetchReadingHistory(limit: number = 50): Promise<ReadingHistoryItem[]> {
    try {
      const res = await this.apiFetch(`/reader/history?limit=${limit}`);
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  }

  static async recordReadingHistory(item: Partial<ReadingHistoryItem>): Promise<boolean> {
    try {
      const res = await this.apiFetch('/reader/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  static async clearReadingHistory(): Promise<boolean> {
    const res = await this.apiFetch('/reader/history', { method: 'DELETE' });
    return res.ok;
  }

  static async deleteReadingHistoryItem(id: string): Promise<boolean> {
    const res = await this.apiFetch(`/reader/history/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return res.ok;
  }

  static async fetchArticleBookmarks(archiveId?: string): Promise<ArticleBookmark[]> {
    try {
      const params = archiveId ? `?archive_id=${encodeURIComponent(archiveId)}` : '';
      const res = await this.apiFetch(`/reader/bookmarks${params}`);
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  }

  static async saveArticleBookmark(bookmark: Partial<ArticleBookmark>): Promise<{ success: boolean; id: string }> {
    const res = await this.apiFetch('/reader/bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookmark),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Failed to save bookmark');
    }
    return res.json();
  }

  static async deleteArticleBookmark(id: string): Promise<boolean> {
    const res = await this.apiFetch(`/reader/bookmarks/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return res.ok;
  }

  // --- SEARCH-001 to SEARCH-009: Global FTS & Indexing Manager ---
  static async searchGlobalFts(q: string, archiveId?: string, limit: number = 30): Promise<{ query: string; count: number; results: GlobalSearchResult[] }> {
    const params = new URLSearchParams({ q, limit: String(limit) });
    if (archiveId) params.append('archive_id', archiveId);
    const res = await this.apiFetch(`/search/global?${params.toString()}`);
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Search failed');
    }
    return res.json();
  }

  static async fetchIndexingStatus(): Promise<IndexingStatus> {
    const res = await this.apiFetch('/search/index/status');
    if (!res.ok) {
      return { total_indexed_articles: 0, total_words_indexed: 0, unique_archives_indexed: 0 };
    }
    return res.json();
  }

  static async triggerIndexArchive(archiveId: string, maxArticles: number = 200): Promise<{ success: boolean; indexed_count: number }> {
    const res = await this.apiFetch('/search/index/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archive_id: archiveId, max_articles: maxArticles }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Failed to index archive');
    }
    return res.json();
  }

  static async clearSearchIndex(archiveId?: string): Promise<boolean> {
    const res = await this.apiFetch('/search/index/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archive_id: archiveId }),
    });
    return res.ok;
  }

  // --- MED-001 to MED-007: Medical Collections, Glossary, Guidelines & Conflicts ---
  static async fetchMedicalGlossary(q?: string, specialty?: string): Promise<MedicalGlossaryTerm[]> {
    try {
      const params = new URLSearchParams();
      if (q) params.append('q', q);
      if (specialty) params.append('specialty', specialty);
      const res = await this.apiFetch(`/medical/glossary?${params.toString()}`);
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  }

  static async saveMedicalGlossaryTerm(term: Partial<MedicalGlossaryTerm>): Promise<{ success: boolean; id: string }> {
    const res = await this.apiFetch('/medical/glossary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(term),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Failed to save glossary term');
    }
    return res.json();
  }

  static async deleteMedicalGlossaryTerm(id: string): Promise<boolean> {
    const res = await this.apiFetch(`/medical/glossary/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return res.ok;
  }

  static async fetchClinicalGuidelines(): Promise<ClinicalGuideline[]> {
    try {
      const res = await this.apiFetch('/medical/guidelines');
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  }

  static async saveClinicalGuideline(guideline: Partial<ClinicalGuideline>): Promise<{ success: boolean; id: string }> {
    const res = await this.apiFetch('/medical/guidelines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(guideline),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Failed to save clinical guideline');
    }
    return res.json();
  }

  static async fetchClinicalConflicts(): Promise<ClinicalConflict[]> {
    try {
      const res = await this.apiFetch('/medical/conflicts');
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  }

  // --- UPD-001 to UPD-003: Version History & Update Checks ---
  static async fetchArchiveVersionHistory(archiveId?: string): Promise<ArchiveVersionItem[]> {
    try {
      const params = archiveId ? `?archive_id=${encodeURIComponent(archiveId)}` : '';
      const res = await this.apiFetch(`/updates/history${params}`);
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  }

  static async checkArchiveUpdates(): Promise<ArchiveUpdateCheckResult> {
    const res = await this.apiFetch('/updates/check');
    if (!res.ok) {
      return { checked_at: new Date().toISOString(), total_archives: 0, updates_found: 0, updates: [] };
    }
    return res.json();
  }

  // --- AI-001 to AI-006: Local RAG Pipeline Context ---
  static async fetchRagContext(query: string, archiveId?: string, maxChunks: number = 5): Promise<RagContextResponse> {
    const res = await this.apiFetch('/ai/rag-context', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, archive_id: archiveId, max_chunks: maxChunks }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Failed to retrieve RAG context');
    }
    return res.json();
  }

  // --- EXT-001: Knowledge Recommendations ---
  static async fetchRecommendations(): Promise<KnowledgeRecommendation[]> {
    try {
      const res = await this.apiFetch('/recommendations');
      if (!res.ok) return [];
      const data = await res.json();
      return data.recommendations || [];
    } catch {
      return [];
    }
  }

  // --- EXT-002: Knowledge Graph ---
  static async fetchKnowledgeGraph(): Promise<{ entities: KnowledgeGraphEntity[]; relations: KnowledgeGraphRelation[] }> {
    try {
      const res = await this.apiFetch('/graph');
      if (!res.ok) return { entities: [], relations: [] };
      return res.json();
    } catch {
      return { entities: [], relations: [] };
    }
  }

  // --- EXT-003: Cross-Archive Article Linking ---
  static async fetchCrossArchiveLinks(title: string): Promise<CrossArchiveLink[]> {
    try {
      const params = new URLSearchParams({ title });
      const res = await this.apiFetch(`/cross-links?${params.toString()}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.links || [];
    } catch {
      return [];
    }
  }

  // --- EXT-004: Personal Knowledge Workspace ---
  static async fetchWorkspaceItems(): Promise<PersonalWorkspaceItem[]> {
    try {
      const res = await this.apiFetch('/workspace/items');
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  }

  static async saveWorkspaceItem(item: Partial<PersonalWorkspaceItem>): Promise<{ success: boolean; id: string }> {
    const res = await this.apiFetch('/workspace/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Failed to save workspace item');
    }
    return res.json();
  }

  static async deleteWorkspaceItem(id: string): Promise<boolean> {
    const res = await this.apiFetch(`/workspace/items/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return res.ok;
  }

  // --- EXT-005: Exportable Research Dossiers ---
  static async fetchResearchDossiers(): Promise<ResearchDossier[]> {
    try {
      const res = await this.apiFetch('/dossiers');
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  }

  static async saveResearchDossier(dossier: Partial<ResearchDossier>): Promise<{ success: boolean; id: string }> {
    const res = await this.apiFetch('/dossiers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dossier),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Failed to save research dossier');
    }
    return res.json();
  }

  // --- EXT-006: Offline Models Manager ---
  static async fetchOfflineModels(): Promise<OfflineModelItem[]> {
    try {
      const res = await this.apiFetch('/models');
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  }

  static async updateOfflineModelStatus(id: string, status: string): Promise<boolean> {
    const res = await this.apiFetch(`/models/${encodeURIComponent(id)}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    return res.ok;
  }

  // --- EXT-007: Knowledge Pack Export & Import ---
  static async exportKnowledgePack(): Promise<KnowledgePackSnapshot> {
    const res = await this.apiFetch('/pack/export');
    if (!res.ok) {
      throw new Error('Failed to generate Knowledge Pack');
    }
    return res.json();
  }

  static async importKnowledgePack(pack: any): Promise<{ success: boolean; imported_count: number }> {
    const res = await this.apiFetch('/pack/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pack),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Failed to import Knowledge Pack');
    }
    return res.json();
  }

}
