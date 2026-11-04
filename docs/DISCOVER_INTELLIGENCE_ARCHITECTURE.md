# Noectra Intelligence — Architecture & Technical Specifications
**Personal Research Intelligence Command Center**
`Your Personal Global Research & Intelligence Network`

---

## 1. System Overview

**Noectra Intelligence** transforms the Discover module from a simple RSS reader and paper search into an editorial, high-signal Personal Research Intelligence Command Center. It unifies:
1. **Instagram-Style Topic Discovery**: Compact, visual, story-inspired topic navigation for rapid context switching.
2. **Bloomberg Terminal-Style Information Density**: Real telemetry, active source ping latency, velocity statistics, and live health metrics.
3. **Professional Scientific Literature Engine**: Verified preprints and peer-reviewed journals (arXiv, Nature, Science, PubMed, OpenAlex, Semantic Scholar, Crossref, Europe PMC, Hugging Face).
4. **Medical AI & Computer Vision Taxonomy**: Dedicated taxonomy spanning Radiology AI, CT/MRI Analysis, Surgical Computer Vision, and Computational Pathology.
5. **AI Research Copilot**: Daily Executive Briefings, Multi-Paper Comparative Matrices, and Multi-Level Explanations ("Explain This Paper", "Research Gap Finder", "Discuss in Noectra Chat").

---

## 2. 3-Zone Architecture

The user interface uses a responsive 3-zone layout:

```
+---------------------------------------------------------------------------------------------------------+
|                                        NOECTRA INTELLIGENCE                                             |
|  [Topic Stories Strip]: (All) (Medical AI) (Radiology) (Pathology) (Surgical) (ViT) (Models) ...        |
|  [Subbar]: [For You | Latest | Following | High Signal | Research Only | Saved | Queue]  [Search / ⌘K]  |
+--------------------------------------------------------------------+------------------------------------+
|  ZONE B: Central Intelligence Feed                                 |  ZONE C: Intelligence Radar        |
|                                                                    |  (Collapsible Right Panel)         |
|  [Featured Intelligence Hero Card]                                 |  - Global Intelligence Pulse       |
|    - Editorial breakthrough banner, DOI, Open Access, reading time |  - AI Daily Briefing Generator     |
|    - "Why you see this" explainable AI signals                     |  - Trending Research Topics        |
|                                                                    |  - Reading Queue Quick Access      |
|  [Dual-Column Card Grid]                                           |  - Followed Research Topics        |
|    - Scientific Paper Cards (Abstract expand, DOI, citations)      |  - Sources Telemetry & Latency     |
|    - Breaking News Cards (Visual thumbnails, verified source pill) |                                    |
|    - Model & Dataset Release Cards (Hugging Face / GitHub)         |                                    |
+--------------------------------------------------------------------+------------------------------------+
```

- **Zone A (Navigation & Subbar)**: View mode switcher, search input with clear trigger, Command Palette (`Ctrl+K`), quick refresh (`R`), and category/source dropdowns.
- **Zone B (Central Intelligence Feed)**: Unified stream supporting editorial priority, deduplication, infinite/paginated load-more, and full card interactions.
- **Zone C (Right Intelligence Panel)**: Real-time telemetry, source health pings, true trend statistics, reading queue management, and AI Daily Briefing generation.

---

## 3. Medical Computer Vision & AI Taxonomy

Noectra Intelligence includes a dedicated professional classification engine matching content against 4 medical AI subdisciplines:
- **Medical Imaging**: Radiology AI, CT Analysis, MRI Analysis, X-ray Analysis, Ultrasound AI, 3D Medical Imaging, Medical Image Segmentation, Lesion Detection.
- **Surgical Computer Vision**: Surgical Instrument Detection, Surgical Video Understanding, Surgical Workflow & Phase Recognition, Real-Time Surgical AI.
- **Computational Pathology**: Whole Slide Image (WSI) Analysis, Digital Histopathology, Cell Detection, Nuclei Segmentation, Pathology Foundation Models.
- **Advanced Medical AI**: Medical Foundation Models (Med-PaLM, Med-Gemini), Vision-Language Models, Medical Diffusion Models, Clinical AI Validation (FDA reader studies, generalizability audits).

---

## 4. Backend Rust & Database Architecture

Built natively on the existing **Rust + Axum + SQLite** architecture:

### 4.1 Idempotent SQLite Schema (`src-tauri/src/db.rs`)

```sql
-- Saved Bookmarks
CREATE TABLE IF NOT EXISTS discover_saved_items (
    id TEXT PRIMARY KEY,
    itemType TEXT NOT NULL,
    title TEXT NOT NULL,
    source TEXT NOT NULL,
    url TEXT NOT NULL,
    dataJson TEXT NOT NULL DEFAULT '{}',
    savedAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_discover_saved_savedAt ON discover_saved_items (savedAt DESC);

-- Reading Queue
CREATE TABLE IF NOT EXISTS discover_reading_queue (
    id TEXT PRIMARY KEY,
    itemType TEXT NOT NULL,
    title TEXT NOT NULL,
    source TEXT NOT NULL,
    url TEXT NOT NULL,
    dataJson TEXT NOT NULL DEFAULT '{}',
    addedAt TEXT NOT NULL,
    isRead INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_discover_queue_addedAt ON discover_reading_queue (addedAt DESC);

-- Followed Research Topics
CREATE TABLE IF NOT EXISTS discover_followed_topics (
    topicId TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    displayName TEXT NOT NULL,
    followedAt TEXT NOT NULL
);

-- User Feedback
CREATE TABLE IF NOT EXISTS discover_user_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    itemId TEXT NOT NULL,
    feedbackType TEXT NOT NULL,
    meta TEXT NOT NULL DEFAULT '{}',
    createdAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_discover_feedback_itemId ON discover_user_feedback (itemId);
```

### 4.2 Axum API Endpoints (`src-tauri/src/api/discover.rs`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/discover` | Unified intelligence feed with mode, category, topic, source, query, and pagination |
| `GET` | `/api/discover/status` | Live ping telemetry, response latency (ms), and online status of all sources |
| `GET` | `/api/discover/trending` | Statistically calculated trend rankings and velocity |
| `GET` | `/api/discover/huggingface` | Proxy to Hugging Face Hub for trending models and datasets |
| `GET` | `/api/discover/saved` | List saved bookmarks from SQLite |
| `POST` | `/api/discover/saved` | Save a bookmark item to SQLite |
| `DELETE` | `/api/discover/saved/:id` | Remove a saved bookmark |
| `GET` | `/api/discover/queue` | List items in reading queue |
| `POST` | `/api/discover/queue` | Add item to reading queue |
| `PATCH` | `/api/discover/queue/:id` | Update read/unread status |
| `DELETE` | `/api/discover/queue/:id` | Remove item from reading queue |
| `GET` | `/api/discover/topics` | List followed research topics |
| `POST` | `/api/discover/topics/follow` | Follow a topic |
| `DELETE` | `/api/discover/topics/unfollow/:id`| Unfollow a topic |
| `POST` | `/api/discover/feedback` | Record user feedback (`useful`, `not_relevant`, `hide_source`) |
| `POST` | `/api/discover/briefing` | Generate AI daily research briefing using active LLM provider |
| `POST` | `/api/discover/compare` | Generate comparative literature matrix for 2-4 selected papers |

---

## 5. Deduplication & Ranking Engine

1. **Deterministic Canonical IDs**:
   - Items with a verified DOI use `doi:<DOI>`.
   - Preprints without a DOI use canonical normalized URLs.
2. **Deduplication Matrix**:
   - Cross-source collisions (e.g. arXiv preprint vs. Nature journal report) are automatically grouped.
   - Alternate links are preserved in the `alternateSources` array.
3. **Explainable Relevance Scoring**:
   - Base score: 50.0.
   - Followed topic match: +35.0 (accompanied by visual reason: *"Matches your followed research topic"*).
   - Recency bonus: Published in last 24h: +20.0; published in last 72h: +10.0.
   - Verified peer-reviewed venue: +10.0.
   - Medical AI breakthrough classification: +15.0.

---

## 6. AI Research Copilot Integration

- **Daily Briefing**: One-click synthesis of global literature in Markdown, providing an Executive Summary, Breakthrough Papers, Medical AI Clinical Advancements, and Open Research Gaps.
- **Literature Comparison Matrix**: Select 2 to 4 papers anywhere in the feed to generate an evidence-grounded comparative markdown table detailing architectures, datasets, metrics, and limitations.
- **Ask Noectra**: Direct transition to `/chat` with full title, authors, DOI, URL, and abstract injected into the prompt context.

---

## 7. Security & Privacy

- All external RSS feeds and API payloads are sanitized.
- No personal reading histories, bookmarks, or API keys leave the local device.
- All database operations are purely local (`vane.db` in `%LOCALAPPDATA%\Noectra AI\data\`).
- Web external links strictly invoke `openExternalLink()` to protect the desktop webview boundary.

