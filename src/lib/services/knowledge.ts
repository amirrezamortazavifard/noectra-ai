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
}

