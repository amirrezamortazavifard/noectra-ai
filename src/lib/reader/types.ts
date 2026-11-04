export type ViewType = 'cards' | 'list' | 'magazine' | 'compact';

export type FilterType = 'all' | 'unread' | 'starred';

export type SourceOpenTarget = 'local' | 'full' | 'webpage' | 'external';

export type SourceTextDirection = 'ltr' | 'rtl' | 'vertical';

export interface ViewConfigs {
  showCover: boolean;
  showSnippet: boolean;
  fadeRead: boolean;
}

export interface FeedSource {
  id: string;
  url: string;
  name: string;
  iconUrl?: string | null;
  openTarget: SourceOpenTarget;
  unreadCount: number;
  lastFetched?: string | null;
  fetchFrequency: number; // in minutes
  textDir: SourceTextDirection;
  hidden: boolean;
  serviceRef?: string | null;
}

export interface FeedGroup {
  id: string;
  name: string;
  expanded: boolean;
  isMultiple: boolean;
  sids: string[];
}

export interface FeedItem {
  id: string;
  sourceId: string;
  guid?: string | null;
  title: string;
  link: string;
  author?: string | null;
  content?: string | null;
  snippet?: string | null;
  thumbUrl?: string | null;
  pubDate: string;
  hasRead: boolean;
  starred: boolean;
  hidden: boolean;
  notify: boolean;
  serviceRef?: string | null;
}

export interface FeedRule {
  id: string;
  targetType: 'all' | 'group' | 'source';
  targetId: string;
  filterField: 'title' | 'content' | 'author' | 'link';
  pattern: string;
  matchType: boolean;
  actions: string[]; // 'read' | 'star' | 'hide' | 'notify'
}

export interface FeedLog {
  id?: number;
  logType: 'info' | 'warning' | 'failure' | 'article';
  title: string;
  details?: string | null;
  createdAt: string;
}

export interface FeedSyncService {
  serviceType: 'fever' | 'greader' | 'miniflux' | 'feedbin';
  enabled: boolean;
  endpoint?: string | null;
  username?: string | null;
  password?: string | null;
  apiKey?: string | null;
  lastSynced?: string | null;
}

export interface ReaderSettings {
  defaultView: ViewType;
  defaultOpenTarget: SourceOpenTarget;
  fontSize: number;
  fontFamily: string;
  viewConfigs: ViewConfigs;
}

