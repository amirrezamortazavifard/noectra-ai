import {
  DiscoverFeedItem,
  SourceStatusInfo,
  TrendingTopicStat,
  SavedDiscoverItem,
  QueueDiscoverItem,
  FollowedTopic,
  IntelligenceFeedMode,
} from './types';

// ---------------------------------------------------------------------------
// Unified Discover Feed Fetcher
// ---------------------------------------------------------------------------

export interface FetchFeedParams {
  mode?: IntelligenceFeedMode;
  category?: string;
  topic?: string;
  source?: string;
  query?: string;
  limit?: number;
  offset?: number;
}

export interface FeedResponse {
  success: boolean;
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
  items: DiscoverFeedItem[];
}

export async function fetchDiscoverFeed(params: FetchFeedParams = {}): Promise<FeedResponse> {
  const {
    mode = 'for_you',
    category = 'all',
    topic,
    source,
    query,
    limit = 24,
    offset = 0,
  } = params;

  const searchParams = new URLSearchParams();
  if (mode) searchParams.set('mode', mode);
  if (category && category !== 'all') searchParams.set('category', category);
  if (topic && topic !== 'all') searchParams.set('topic', topic);
  if (source && source !== 'all') searchParams.set('source', source);
  if (query && query.trim()) searchParams.set('q', query.trim());
  searchParams.set('limit', String(limit));
  searchParams.set('offset', String(offset));

  const res = await fetch(`/api/discover?${searchParams.toString()}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch Noectra Intelligence feed.');
  }

  const data = await res.json();
  return {
    success: data.success ?? true,
    total: data.total ?? (data.items || []).length,
    offset: data.offset ?? 0,
    limit: data.limit ?? limit,
    hasMore: data.hasMore ?? false,
    items: data.items || [],
  };
}

// ---------------------------------------------------------------------------
// Real Source Status Health Monitor
// ---------------------------------------------------------------------------

export interface StatusResponse {
  success: boolean;
  timestamp: string;
  onlineCount: number;
  totalCount: number;
  sources: SourceStatusInfo[];
}

export async function fetchDiscoverStatus(): Promise<StatusResponse> {
  const res = await fetch('/api/discover/status', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    throw new Error('Failed to retrieve intelligence source health.');
  }

  return await res.json();
}

// ---------------------------------------------------------------------------
// Real Trend Radar
// ---------------------------------------------------------------------------

export async function fetchDiscoverTrending(): Promise<{
  success: boolean;
  timeRange: string;
  trends: TrendingTopicStat[];
}> {
  const res = await fetch('/api/discover/trending', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    throw new Error('Failed to retrieve trending topics.');
  }

  return await res.json();
}

// ---------------------------------------------------------------------------
// Hugging Face Trending Models & Datasets
// ---------------------------------------------------------------------------

export async function fetchHuggingFaceItems(
  type: 'models' | 'datasets' = 'models',
  q?: string,
  limit: number = 15
): Promise<any[]> {
  const searchParams = new URLSearchParams();
  searchParams.set('type', type);
  if (q && q.trim()) searchParams.set('q', q.trim());
  searchParams.set('limit', String(limit));

  const res = await fetch(`/api/discover/huggingface?${searchParams.toString()}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch Hugging Face ${type}.`);
  }

  const data = await res.json();
  return data.data || [];
}

// ---------------------------------------------------------------------------
// Saved Items (Bookmarks)
// ---------------------------------------------------------------------------

export async function fetchSavedItems(): Promise<SavedDiscoverItem[]> {
  const res = await fetch('/api/discover/saved');
  if (!res.ok) return [];
  const data = await res.json();
  return data.items || [];
}

export async function saveDiscoverItem(item: DiscoverFeedItem): Promise<boolean> {
  const payload: SavedDiscoverItem = {
    id: item.id,
    itemType: item.itemType,
    title: item.title,
    source: item.source,
    url: item.url,
    dataJson: item,
    savedAt: new Date().toISOString(),
  };

  const res = await fetch('/api/discover/saved', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return res.ok;
}

export async function deleteSavedItem(id: string): Promise<boolean> {
  const res = await fetch(`/api/discover/saved/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  return res.ok;
}

// ---------------------------------------------------------------------------
// Reading Queue
// ---------------------------------------------------------------------------

export async function fetchReadingQueue(): Promise<QueueDiscoverItem[]> {
  const res = await fetch('/api/discover/queue');
  if (!res.ok) return [];
  const data = await res.json();
  return data.items || [];
}

export async function addToReadingQueue(item: DiscoverFeedItem): Promise<boolean> {
  const payload: QueueDiscoverItem = {
    id: item.id,
    itemType: item.itemType,
    title: item.title,
    source: item.source,
    url: item.url,
    dataJson: item,
    addedAt: new Date().toISOString(),
    isRead: false,
  };

  const res = await fetch('/api/discover/queue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return res.ok;
}

export async function updateQueueStatus(id: string, isRead: boolean): Promise<boolean> {
  const res = await fetch(`/api/discover/queue/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isRead }),
  });
  return res.ok;
}

export async function removeFromReadingQueue(id: string): Promise<boolean> {
  const res = await fetch(`/api/discover/queue/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  return res.ok;
}

// ---------------------------------------------------------------------------
// Followed Topics
// ---------------------------------------------------------------------------

export async function fetchFollowedTopics(): Promise<FollowedTopic[]> {
  const res = await fetch('/api/discover/topics');
  if (!res.ok) return [];
  const data = await res.json();
  return data.topics || [];
}

export async function followTopic(topic: {
  topicId: string;
  category: string;
  displayName: string;
}): Promise<boolean> {
  const payload: FollowedTopic = {
    topicId: topic.topicId,
    category: topic.category,
    displayName: topic.displayName,
    followedAt: new Date().toISOString(),
  };

  const res = await fetch('/api/discover/topics/follow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return res.ok;
}

export async function unfollowTopic(topicId: string): Promise<boolean> {
  const res = await fetch(`/api/discover/topics/unfollow/${encodeURIComponent(topicId)}`, {
    method: 'DELETE',
  });
  return res.ok;
}

// ---------------------------------------------------------------------------
// Feedback Actions ('useful' | 'not_relevant' | 'hide_source')
// ---------------------------------------------------------------------------

export async function sendUserFeedback(
  itemId: string,
  feedbackType: 'useful' | 'not_relevant' | 'hide_source',
  meta: Record<string, any> = {}
): Promise<boolean> {
  const res = await fetch('/api/discover/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      itemId,
      feedbackType,
      meta,
    }),
  });

  return res.ok;
}

// ---------------------------------------------------------------------------
// AI Research Copilot: Daily Briefing
// ---------------------------------------------------------------------------

export async function generateDailyBriefing(focusTopics?: string[]): Promise<string> {
  const res = await fetch('/api/discover/briefing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ focus_topics: focusTopics }),
  });

  if (!res.ok) {
    throw new Error('Failed to generate daily AI research briefing.');
  }

  const data = await res.json();
  return data.briefingMarkdown || '';
}

// ---------------------------------------------------------------------------
// AI Research Copilot: Paper Comparison Matrix
// ---------------------------------------------------------------------------

export async function generatePaperComparison(papers: any[]): Promise<string> {
  const res = await fetch('/api/discover/compare', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ papers }),
  });

  if (!res.ok) {
    throw new Error('Failed to generate research paper comparison.');
  }

  const data = await res.json();
  return data.comparisonMarkdown || '';
}
