export interface NewsItem {
  id: string;
  title: string;
  description: string;
  source: string;
  url: string;
  imageUrl?: string;
  thumbnail?: string;
  publishedAt: string;
  category: string;
}

export interface ResearchPaper {
  id: string;
  title: string;
  abstract: string;
  authors: string[];
  year: number | string;
  venue: string;
  pdfUrl?: string;
  fieldsOfStudy: string[];
  citationCount?: number;
  doi?: string;
  url: string;
  source: string;
}

export type DiscoverMode = 'news' | 'papers';

export type IntelligenceFeedMode =
  | 'for_you'
  | 'live_buzz'
  | 'latest'
  | 'following'
  | 'high_signal'
  | 'research_only'
  | 'saved'
  | 'queue';

export interface DiscoverCategory {
  key: string;
  display: string;
  icon?: string;
  keyword?: string;
  openAlexConceptId?: string;
  semanticScholarField?: string;
  meshTerm?: string;
}

export interface DiscoverSource {
  key: string;
  display: string;
  type: 'api' | 'rss' | 'academic';
  description?: string;
  requiresKey?: boolean;
}

export interface DiscoverApiKeys {
  gnews?: string;
  newsdata?: string;
  currents?: string;
  newsapi?: string;
}

// ---------------------------------------------------------------------------
// Unified Intelligence Feed Types
// ---------------------------------------------------------------------------

export type IntelligenceItemType =
  | 'paper'
  | 'news'
  | 'breakthrough'
  | 'model'
  | 'dataset'
  | 'conference'
  | 'social';

export interface AlternateSourceRef {
  source: string;
  url: string;
  publishedAt: string;
}

export interface DiscoverFeedItem {
  id: string;
  itemType: IntelligenceItemType;
  title: string;
  description: string;
  url: string;
  source: string;
  sourceId: string;
  thumbnail?: string;
  imageUrl?: string;
  publishedAt: string;
  category: string;
  authors: string[];
  venue?: string;
  doi?: string;
  pdfUrl?: string;
  citationCount?: number;
  openAccess: boolean;
  peerReviewed: boolean;
  readingTimeMin: number;
  tags: string[];
  whyRelevant: string[];
  relevanceScore: number;
  alternateSources?: AlternateSourceRef[];
}

export interface SourceStatusInfo {
  key: string;
  name: string;
  sourceType: string;
  url: string;
  status: 'online' | 'degraded' | 'offline';
  latencyMs: number;
  itemCount: number;
  lastChecked: string;
}

export interface TrendingTopicStat {
  topic: string;
  count: number;
  category: string;
  velocity: string;
}

export interface SavedDiscoverItem {
  id: string;
  itemType: string;
  title: string;
  source: string;
  url: string;
  dataJson: any;
  savedAt: string;
}

export interface QueueDiscoverItem {
  id: string;
  itemType: string;
  title: string;
  source: string;
  url: string;
  dataJson: any;
  addedAt: string;
  isRead: boolean;
}

export interface FollowedTopic {
  topicId: string;
  category: string;
  displayName: string;
  followedAt: string;
}
