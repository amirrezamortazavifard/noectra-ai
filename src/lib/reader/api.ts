import { FeedGroup, FeedItem, FeedLog, FeedRule, FeedSource, FeedSyncService, FilterType } from './types';

export async function getSources(): Promise<FeedSource[]> {
  const res = await fetch('/api/reader/sources');
  if (!res.ok) throw new Error('Failed to fetch sources');
  const data = await res.json();
  return data.sources || [];
}

export async function addSource(params: {
  url: string;
  name?: string;
  openTarget?: string;
  textDir?: string;
  fetchFrequency?: number;
}): Promise<FeedSource> {
  const res = await fetch('/api/reader/sources', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Failed to add source');
  }
  const data = await res.json();
  return data.source;
}

export async function updateSource(
  id: string,
  params: Partial<FeedSource>
): Promise<void> {
  const res = await fetch(`/api/reader/sources/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Failed to update source');
}

export async function deleteSource(id: string): Promise<void> {
  const res = await fetch(`/api/reader/sources/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete source');
}

export async function refreshAllSources(): Promise<number> {
  const res = await fetch('/api/reader/sources/refresh', {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to refresh feeds');
  const data = await res.json();
  return data.totalNewItems || 0;
}

export async function refreshSingleSource(id: string): Promise<number> {
  const res = await fetch(`/api/reader/sources/${id}/refresh`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to refresh feed');
  const data = await res.json();
  return data.newItems || 0;
}

export async function getGroups(): Promise<FeedGroup[]> {
  const res = await fetch('/api/reader/groups');
  if (!res.ok) throw new Error('Failed to fetch groups');
  const data = await res.json();
  return data.groups || [];
}

export async function createGroup(name: string, sids: string[] = []): Promise<FeedGroup> {
  const res = await fetch('/api/reader/groups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, sids }),
  });
  if (!res.ok) throw new Error('Failed to create group');
  const data = await res.json();
  return data.group;
}

export async function updateGroup(
  id: string,
  params: { name?: string; expanded?: boolean; sids?: string[] }
): Promise<void> {
  const res = await fetch(`/api/reader/groups/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Failed to update group');
}

export async function deleteGroup(id: string): Promise<void> {
  const res = await fetch(`/api/reader/groups/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete group');
}

export async function getItems(params: {
  filter?: FilterType;
  sourceId?: string;
  groupId?: string;
  query?: string;
  limit?: number;
  offset?: number;
}): Promise<FeedItem[]> {
  const sp = new URLSearchParams();
  if (params.filter) sp.set('filter', params.filter);
  if (params.sourceId) sp.set('sourceId', params.sourceId);
  if (params.groupId) sp.set('groupId', params.groupId);
  if (params.query) sp.set('query', params.query);
  if (params.limit) sp.set('limit', params.limit.toString());
  if (params.offset) sp.set('offset', params.offset.toString());

  const res = await fetch(`/api/reader/items?${sp.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch articles');
  const data = await res.json();
  return data.items || [];
}

export async function updateItemStatus(
  id: string,
  params: { hasRead?: boolean; starred?: boolean; hidden?: boolean }
): Promise<void> {
  const res = await fetch(`/api/reader/items/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Failed to update item status');
}

export async function markAllRead(params: { sourceId?: string; groupId?: string }): Promise<void> {
  const res = await fetch('/api/reader/items/mark-all-read', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Failed to mark all as read');
}

export async function getRules(): Promise<FeedRule[]> {
  const res = await fetch('/api/reader/rules');
  if (!res.ok) throw new Error('Failed to fetch rules');
  const data = await res.json();
  return data.rules || [];
}

export async function saveRule(rule: Partial<FeedRule>): Promise<{ success: boolean; id: string }> {
  const res = await fetch('/api/reader/rules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rule),
  });
  if (!res.ok) throw new Error('Failed to save rule');
  return await res.json();
}

export async function deleteRule(id: string): Promise<void> {
  const res = await fetch(`/api/reader/rules/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete rule');
}

export async function testRule(params: {
  filterField: string;
  pattern: string;
  matchType: boolean;
  sourceId?: string;
}): Promise<{ matchedCount: number; samples: Array<{ id: string; title: string; link: string }> }> {
  const res = await fetch('/api/reader/rules/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Failed to test rule');
  return await res.json();
}

export async function getLogs(): Promise<FeedLog[]> {
  const res = await fetch('/api/reader/logs');
  if (!res.ok) throw new Error('Failed to fetch activity logs');
  const data = await res.json();
  return data.logs || [];
}

export async function clearLogs(): Promise<void> {
  const res = await fetch('/api/reader/logs', {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to clear logs');
}

export async function importOpml(content: string): Promise<number> {
  const res = await fetch('/api/reader/opml/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error('Failed to import OPML');
  const data = await res.json();
  return data.importedSources || 0;
}

export async function exportOpml(): Promise<string> {
  const res = await fetch('/api/reader/opml/export');
  if (!res.ok) throw new Error('Failed to export OPML');
  const data = await res.json();
  return data.opml || '';
}

export async function exportBackup(): Promise<any> {
  const res = await fetch('/api/reader/backup/export');
  if (!res.ok) throw new Error('Failed to export backup');
  return await res.json();
}

export async function importBackup(backupData: any): Promise<void> {
  const res = await fetch('/api/reader/backup/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(backupData),
  });
  if (!res.ok) throw new Error('Failed to import backup');
}

export async function getServices(): Promise<FeedSyncService[]> {
  const res = await fetch('/api/reader/services');
  if (!res.ok) throw new Error('Failed to fetch services');
  const data = await res.json();
  return data.services || [];
}

export async function saveService(stype: string, service: Partial<FeedSyncService>): Promise<void> {
  const res = await fetch(`/api/reader/services/${stype}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(service),
  });
  if (!res.ok) throw new Error('Failed to save service config');
}

export async function syncServiceNow(stype: string): Promise<any> {
  const res = await fetch(`/api/reader/services/${stype}/sync`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Failed to sync service');
  }
  return await res.json();
}

export async function fetchFullContent(url: string): Promise<string> {
  const res = await fetch('/api/article', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error('Failed to extract full article');
  const data = await res.json();
  return data.content || '';
}

