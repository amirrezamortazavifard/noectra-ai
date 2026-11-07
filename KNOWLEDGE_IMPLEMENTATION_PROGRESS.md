# Knowledge Store Implementation Progress

This document tracks the implementation progress of all capabilities specified in `all_options.md` (`all_options (1).md`) for the Noectra AI Knowledge Store / Offline Knowledge Hub.

## Current Batch: Batch 1 (Items 1 to 10) — COMPLETED
- [x] **CORE-001**: Audit & current flow map of Knowledge Store
- [x] **CORE-002**: Complete routing integration for Knowledge page
- [x] **CORE-003**: API completion & Frontend-Backend bridge contract
- [x] **CORE-004**: Database & persistent Knowledge schema migrations
- [x] **CORE-005**: Security hardening & HTML sanitization for ZIM Reader
- [x] **CAT-001**: Advanced Catalog Search (queries, filters, reset, active chips)
- [x] **CAT-002**: Pagination & Load More for catalog results
- [x] **CAT-003**: Relevance ranking & multi-field sorting (Match, Title, Size, Date)
- [x] **CAT-004**: Saved Searches (persistence, 1-click execution, deletion)
- [x] **CAT-005**: Archive Details modal, preview info, disk space pre-check

---

## Complete Capabilities Registry

| ID | Title | Status | Evidence / Notes |
| :--- | :--- | :--- | :--- |
| **CORE-001** | Audit & current flow map | **DONE** | Created comprehensive audit in `docs/knowledge-store-audit.md` mapping UI -> Service -> Axum -> SQLite -> ZIM storage. |
| **CORE-002** | Complete routing integration | **DONE** | Validated `/knowledge` route in `App.tsx`, active indicator in `Sidebar.tsx`, added 404 fallback route. |
| **CORE-003** | API completion & contract | **DONE** | Axum router expanded with endpoints for catalog, downloads, library, internal resources, saved searches, and disk space. |
| **CORE-004** | Database & Migration schema | **DONE** | SQLite schema migrations added to `db.rs` creating `zim_archives`, `download_tasks`, `saved_catalog_searches`, and `indexing_jobs`. |
| **CORE-005** | ZIM Reader security hardening | **DONE** | Built `zimSanitizer.ts` for script removal, inline event handler stripping, protocol sanitization, and internal link routing; added traversal checks in `zim_reader.rs`. |
| **CAT-001** | Advanced Catalog Search | **DONE** | Enhanced `CatalogBrowser.tsx` with active filter chips, individual chip dismiss, reset all, query clearing, and safe parameter construction. |
| **CAT-002** | Catalog Pagination & Load More | **DONE** | Implemented `start`/`count` pagination with "Load More" control, loading indicator, deduplication, and remaining items counter. |
| **CAT-003** | Relevance Ranking & Sorting | **DONE** | Multi-tier scoring (exact title match > prefix > contains > tags > description) + 6 sorting options with `Best Match` and `Title Match` badges. |
| **CAT-004** | Saved Searches | **DONE** | Save search preset modal, persistent storage in SQLite `saved_catalog_searches`, dropdown menu, 1-click apply, and delete presets. |
| **CAT-005** | Archive Details & Space Check | **DONE** | Full archive metadata sheet, human readable bytes, acquisition link, tags, live target drive free space check, and low disk space alert. |
| **CAT-006** | Multiple Catalog Sources | PENDING | Next Batch (Batch 2) |
| **DL-001** | Persistent Download Queue | PENDING | Next Batch (Batch 2) |
| **DL-002** | Integrity Verification SHA-256 | PENDING | Next Batch (Batch 2) |
| **DL-003** | Bandwidth & Concurrency Control | PENDING | Next Batch (Batch 2) |
| **DL-004** | Resume with HTTP Range | PENDING | Next Batch (Batch 2) |
| **DL-005** | Retry and Recovery | PENDING | Next Batch (Batch 2) |
| **DL-006** | Download Scheduler | PENDING | Next Batch (Batch 2) |
| **DL-007** | Download Bundles | PENDING | Next Batch (Batch 2) |
| **DL-008** | Target Storage & Disk Space | PENDING | Next Batch (Batch 2) |
| **DL-009** | Notifications & Download Center | PENDING | Next Batch (Batch 2) |
| **LIB-001** | Import Local ZIM | PENDING | Batch 3 |
| **LIB-002** | Library Overview & Real Stats | PENDING | Batch 3 |
| **LIB-003** | Collection Manager | PENDING | Batch 3 |
| **LIB-004** | Auto Scanner | PENDING | Batch 3 |
| **LIB-005** | Duplicate Detection | PENDING | Batch 3 |
| **LIB-006** | Missing File Recovery & Relink | PENDING | Batch 3 |
| **LIB-007** | Archive Health Check | PENDING | Batch 3 |
| **LIB-008** | Multi-location Storage Manager | PENDING | Batch 3 |
| **LIB-009** | Metadata Editor | PENDING | Batch 3 |
| **LIB-010** | Backup & Restore | PENDING | Batch 3 |
| **READ-001** | Article Outline & TOC | PENDING | Batch 4 |
| **READ-002** | Highlights & Annotations | PENDING | Batch 4 |
| **READ-003** | Multi-tab Reading | PENDING | Batch 4 |
| **READ-004** | Image & Media Viewer | PENDING | Batch 4 |
| **READ-005** | Citation & Export | PENDING | Batch 4 |
| **READ-006** | Internal Link Navigation | PENDING | Batch 4 |
| **READ-007** | Reading History & Continue | PENDING | Batch 4 |
| **READ-008** | Bookmarks & Favorites | PENDING | Batch 4 |
| **READ-009** | Split Reading & Compare | PENDING | Batch 4 |
| **READ-010** | Article Pagination in Index | PENDING | Batch 4 |
| **READ-011** | Offline Translation in Reader | PENDING | Batch 5 |
| **READ-012** | Offline Text-to-Speech | PENDING | Batch 5 |
| **SEARCH-001** | Metadata & Article Inventory | PENDING | Batch 5 |
| **SEARCH-002** | Text Extraction & Content Clean | PENDING | Batch 5 |
| **SEARCH-003** | SQLite FTS5 Full-text Search | PENDING | Batch 5 |
| **SEARCH-004** | Global Search UI | PENDING | Batch 5 |
| **SEARCH-005** | BM25 & Advanced Ranking | PENDING | Batch 5 |
| **SEARCH-006** | Hybrid & Vector Search | PENDING | Batch 5 |
| **SEARCH-007** | Reranking | PENDING | Batch 5 |
| **SEARCH-008** | Indexing Manager | PENDING | Batch 5 |
| **SEARCH-009** | Index Storage & Cache Purge | PENDING | Batch 6 |
| **AI-001** | Local RAG Pipeline | PENDING | Batch 6 |
| **AI-002** | Agent Tools for ZIM | PENDING | Batch 6 |
| **AI-003** | Knowledge Scope in Chat | PENDING | Batch 6 |
| **AI-004** | Source Panel & Citation Explorer| PENDING | Batch 6 |
| **AI-005** | Related Knowledge Suggestions | PENDING | Batch 6 |
| **AI-006** | Knowledge Answer Evaluation | PENDING | Batch 6 |
| **MED-001** | Medical Knowledge Collections | PENDING | Batch 7 |
| **MED-002** | Evidence Classification | PENDING | Batch 7 |
| **MED-003** | Source Trust Metadata | PENDING | Batch 7 |
| **MED-004** | Medical Glossary | PENDING | Batch 7 |
| **MED-005** | Guideline Version Tracker | PENDING | Batch 7 |
| **MED-006** | Conflict Detection | PENDING | Batch 7 |
| **MED-007** | Medical Safety & Warnings | PENDING | Batch 7 |
| **UPD-001** | Check New Archive Version | PENDING | Batch 8 |
| **UPD-002** | Safe Update & Replace | PENDING | Batch 8 |
| **UPD-003** | Archive Version History | PENDING | Batch 8 |
| **UX-001** | Layout & Responsive Grid | PENDING | Batch 8 |
| **UX-002** | Archive Cards Redesign | PENDING | Batch 8 |
| **UX-003** | Search & Filter Design | PENDING | Batch 8 |
| **UX-004** | Empty / Loading / Error States | PENDING | Batch 8 |
| **UX-005** | Micro-interactions & A11y | PENDING | Batch 8 |
| **UX-006** | Download Center UI | PENDING | Batch 9 |
| **UX-007** | Library Dashboard | PENDING | Batch 9 |
| **EXT-001** | Knowledge Recommendations | PENDING | Batch 9 |
| **EXT-002** | Knowledge Graph | PENDING | Batch 9 |
| **EXT-003** | Cross-Archive Article Linking | PENDING | Batch 9 |
| **EXT-004** | Personal Knowledge Workspace | PENDING | Batch 9 |
| **EXT-005** | Exportable Research Dossier | PENDING | Batch 9 |
| **EXT-006** | Offline Model Manager | PENDING | Batch 9 |
| **EXT-007** | Knowledge Pack Bundler | PENDING | Batch 9 |
