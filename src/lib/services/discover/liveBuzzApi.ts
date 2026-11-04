export interface LiveBuzzItem {
  id: string;
  rank: number;
  title: string;
  url: string;
  snippet?: string | null;
  author?: string | null;
  extraInfo?: string | null;
  publishedAt?: string | null;
}

export interface LiveBuzzSourceMeta {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  color: string;
}

export async function fetchLiveBuzzSources(): Promise<LiveBuzzSourceMeta[]> {
  const res = await fetch('/api/discover/live-buzz/sources');
  if (!res.ok) throw new Error('Failed to fetch live buzz sources');
  const data = await res.json();
  return data.sources || [];
}

export async function fetchLiveBuzzStream(sourceId: string, force = false): Promise<LiveBuzzItem[]> {
  const res = await fetch(`/api/discover/live-buzz/stream?source=${encodeURIComponent(sourceId)}${force ? '&force=true' : ''}`);
  if (!res.ok) throw new Error(`Failed to stream live buzz for ${sourceId}`);
  const data = await res.json();
  return data.items || [];
}

