# Noectra AI — Knowledge Store System Audit & Architecture Flow Map
**Document ID:** `CORE-001`  
**Date:** November 2026  
**Auditor:** Antigravity AI  
**Scope:** Knowledge Store, Kiwix ZIM Catalog, Download Manager, Local Library & Reader Engine  

---

## 1. System Architecture & Flow Map (UI → Backend → Storage)

```
┌────────────────────────────────────────────────────────────────────────┐
│                          PRESENTATION LAYER (UI)                       │
├────────────────────────────────────────────────────────────────────────┤
│ • Route: /knowledge (KnowledgeStorePage.tsx)                           │
│   ├── Catalog Tab: CatalogBrowser.tsx                                 │
│   │   ├── Search bar (q, category, language, maxsize filters)         │
│   │   ├── Active filter chips & Reset                                  │
│   │   ├── Archive Card grid & Complete Details Modal                   │
│   │   └── Direct Download Action Button                                │
│   ├── Library Tab: InstalledLibraryView.tsx                            │
│   │   ├── Local archives summary stats (Count, Size, Articles)         │
│   │   ├── Import Local ZIM (Native RFD file picker dialog)             │
│   │   ├── Archive cards (Open Reader, Reveal in Explorer, Remove)      │
│   │   └── Search & filter local library                                │
│   ├── Downloads Drawer: DownloadsManagerDrawer.tsx                     │
│   │   └── Active tasks, progress %, speed (bps), Pause/Resume/Cancel   │
│   └── Reader Modal: ZimArticleReaderModal.tsx                          │
│       ├── Split pane: Article inventory index & live search            │
│       └── Content viewer: HTML rendered & raw text mode                │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / JSON
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND SERVICE LAYER                          │
├────────────────────────────────────────────────────────────────────────┤
│ • KnowledgeService (src/lib/services/knowledge.ts)                     │
│   ├── Dual-base resilience: http://127.0.0.1:3001 & relative /api      │
│   ├── fetchCatalog(params), fetchCategories(), fetchLanguages()       │
│   ├── browseLocalZimFile(), fetchLibrary(), importLocalZim(), reveal() │
│   ├── fetchDownloads(), startDownload(), pause(), resume(), cancel()   │
│   └── searchArticles(archiveId, q), readArticle(archiveId, url)        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Localhost TCP (Port 3001)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         BACKEND ENGINE (Axum)                          │
├────────────────────────────────────────────────────────────────────────┤
│ • Router: create_knowledge_router (src-tauri/src/knowledge_store/mod.rs│
│   ├── State: KnowledgeStoreState                                       │
│   │   ├── catalog_client: KiwixCatalogClient (Reqwest + OPDS XML parser│
│   │   ├── download_manager: DownloadManager (Async streams, Range)     │
│   │   └── library_manager: LibraryManager (ZIM header inspection)      │
│   └── Reader: ZimReader (pure-Rust `zim` crate 0.3)                    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
       ┌────────────────────────────┼────────────────────────────┐
       ▼                            ▼                            ▼
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│  EXTERNAL OPDS   │      │   FILE SYSTEM    │      │ PERSISTENT STATE │
│     CATALOG      │      │  (App Data Dir)  │      │ (SQLite & JSON)  │
├──────────────────┤      ├──────────────────┤      ├──────────────────┤
│ Kiwix Catalog v2 │      │ %LOCALAPPDATA%/  │      │ SQLite `vane.db`:│
│ library.kiwix.org│      │   Noectra AI/    │      │ - zim_archives   │
│ - /entries (OPDS)│      │   ├── data/      │      │ - download_tasks │
│ - /categories    │      │   └── zim/       │      │ - saved_searches │
│ - /languages     │      │       ├── *.zim  │      │ external_archives│
│                  │      │       └── temp/  │      │ .json (Manifest) │
└──────────────────┘      └──────────────────┘      └──────────────────┘
```

---

## 2. API Endpoints: Existing vs Required

| Method | Endpoint Path | Implementation Status | Handler / File | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/knowledge/catalog` | **IMPLEMENTED** | `get_catalog_handler` | Fetches OPDS entries with filters & cross-checks local installs |
| `GET` | `/api/knowledge/categories` | **IMPLEMENTED** | `get_categories_handler` | Retrieves catalog categories |
| `GET` | `/api/knowledge/languages` | **IMPLEMENTED** | `get_languages_handler` | Retrieves available languages with ISO codes |
| `GET` | `/api/knowledge/entry/:id` | **IMPLEMENTED** | `get_entry_handler` | Detailed metadata for individual archive |
| `POST` | `/api/knowledge/browse-file`| **IMPLEMENTED** | `browse_zim_file_handler` | Native OS file picker dialog via `rfd` |
| `GET` | `/api/knowledge/library` | **IMPLEMENTED** | `get_library_handler` | Scans `zim/` and linked external files |
| `POST` | `/api/knowledge/import` | **IMPLEMENTED** | `import_zim_handler` | Validates & links external ZIM file |
| `DELETE` | `/api/knowledge/library/:id`| **IMPLEMENTED** | `delete_library_item_handler`| Unlinks or deletes archive |
| `POST` | `/api/knowledge/library/:id/reveal` | **IMPLEMENTED** | `reveal_library_item_handler` | Highlights file in OS Explorer/Finder |
| `GET` | `/api/knowledge/downloads` | **IMPLEMENTED** | `get_downloads_handler` | Returns list of active & completed download tasks |
| `POST` | `/api/knowledge/download` | **IMPLEMENTED** | `start_download_handler` | Initiates HTTP download task with partial `.part` support |
| `POST` | `/api/knowledge/downloads/:id/pause` | **IMPLEMENTED** | `pause_download_handler` | Pauses active download worker |
| `POST` | `/api/knowledge/downloads/:id/resume` | **IMPLEMENTED** | `resume_download_handler` | Resumes download using HTTP Range header |
| `POST` | `/api/knowledge/downloads/:id/cancel` | **IMPLEMENTED** | `cancel_download_handler` | Cancels task and cleans up temp files |
| `GET` | `/api/knowledge/zim/:id/articles` | **IMPLEMENTED** | `get_zim_articles_handler` | Iterates article directory inside ZIM file |
| `GET` | `/api/knowledge/zim/:id/article` | **IMPLEMENTED** | `get_zim_article_content_handler` | Extracts & decompresses HTML/text content |
| `GET` | `/api/knowledge/saved-searches` | **NEW (CORE-004/CAT-004)** | Needs addition | Stores user catalog search presets |
| `POST` | `/api/knowledge/saved-searches` | **NEW (CORE-004/CAT-004)** | Needs addition | Saves new search preset |
| `DELETE`| `/api/knowledge/saved-searches/:id` | **NEW (CORE-004/CAT-004)** | Needs addition | Deletes saved search preset |
| `GET` | `/api/knowledge/disk-space` | **NEW (CAT-005/DL-008)** | Needs addition | Returns available disk space on ZIM destination drive |

---

## 3. Capabilities Evaluation & Gap Analysis

1. **Catalog Search & Filtering (`CAT-001` - `CAT-003`):**
   - **Current:** Basic OPDS search works with queries and categories.
   - **Gaps to Address:**
     - Client-side and server-side pagination (`start` / `count`) needs explicit "Load More" to go beyond the first batch.
     - Relevance sorting (exact title match > partial title > summary match) needs enhancement so high-relevance items appear on top.
     - Active filter chips with individual dismiss buttons and "Reset All".
2. **Saved Searches (`CAT-004`):**
   - **Current:** Not implemented.
   - **Required:** Ability to save current query + filter combination with custom name, view saved presets, execute with 1 click, and delete.
3. **Archive Details & Disk Space Pre-Check (`CAT-005`):**
   - **Current:** Details modal exists with title, description, size, updated date.
   - **Gaps to Address:**
     - Display available disk space vs required size (plus 10% safety buffer).
     - Warn if available disk space is insufficient before user begins download.
4. **Security & Reader Sanitization (`CORE-005`):**
   - **Current:** `ZimArticleReaderModal.tsx` renders HTML with `dangerouslySetInnerHTML`.
   - **Risk:** Embedded `<script>` tags, inline `onload`/`onerror`, unescaped event handlers, or malicious iframe references inside offline archives could compromise the WebView context.
   - **Remediation:** Comprehensive HTML sanitizer to strip dangerous executable tags, block `javascript:` links, and restrict external resource queries.
5. **Database Persistence (`CORE-004`):**
   - **Current:** Library paths are stored in `external_archives.json`; active downloads are kept in in-memory `RwLock<HashMap>`.
   - **Risk:** Restarting application loses past download task records and history.
   - **Remediation:** Introduce tables in `vane.db` (`zim_archives`, `download_tasks`, `saved_catalog_searches`) to persist state across app lifecycles.

---

## 4. Security Risks & Failure Modes

1. **Untrusted HTML Execution:**
   - *Risk:* ZIM files contain arbitrary HTML from third-party sources. If malicious or malformed scripts execute in the webview, they can access local IPC or cookies.
   - *Fix:* Sanitize all extracted HTML in frontend or before serving; block `javascript:`, inline scripts, external styles that breach containment.
2. **Path Traversal in Archive URLs:**
   - *Risk:* Malicious article URL containing `../../` could attempt to escape the ZIM or file boundary.
   - *Fix:* Strictly enforce namespace isolation in `zim_reader.rs` and sanitize URL parameters.
3. **Download Interruption & Disk Full:**
   - *Risk:* User starts a 40GB Wikipedia download on a drive with 10GB free, crashing or filling the OS drive.
   - *Fix:* Verify free disk space before download starts and handle write errors gracefully.

---

## 5. Remediation Plan & Execution Sequence

1. **Step 1 (CORE-002):** Verify routing, sidebar active state, 404 fallback.
2. **Step 2 (CORE-004):** Add `zim_archives`, `download_tasks`, `saved_catalog_searches` tables and migration to `src-tauri/src/db.rs`.
3. **Step 3 (CORE-003):** Enhance Axum API router and `KnowledgeService` with endpoints for saved searches and disk space pre-check.
4. **Step 4 (CORE-005):** Add robust HTML sanitization to `ZimArticleReaderModal` to eliminate XSS, script injection, and path traversal vulnerabilities.
5. **Step 5 (CAT-001):** Enhance Catalog search UI with active chips, tag/keyword filters, and safe parameter building.
6. **Step 6 (CAT-002):** Implement pagination and "Load More" infinite loading.
7. **Step 7 (CAT-003):** Implement multi-tier relevance ranking and sorting selector (Relevance, Title, Size, Date).
8. **Step 8 (CAT-004):** Implement Saved Searches UI and backend persistence.
9. **Step 9 (CAT-005):** Enhance Archive Details modal with preview metadata, download destination path, and live disk space check.
10. **Step 10:** Comprehensive test, `npm run build` verification, and updating `KNOWLEDGE_IMPLEMENTATION_PROGRESS.md`.

