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
}

