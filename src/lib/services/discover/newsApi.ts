import { NewsItem, DiscoverApiKeys } from './types';

export async function fetchNewsFromBackend(params: {
  category?: string;
  source?: string;
  query?: string;
}): Promise<NewsItem[]> {
  const { category = 'tech', source, query } = params;
  const searchParams = new URLSearchParams();

  if (category) searchParams.set('category', category);
  if (source && source !== 'all') searchParams.set('source', source);
  if (query && query.trim()) searchParams.set('q', query.trim());

  const res = await fetch(`/api/discover?${searchParams.toString()}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to fetch articles from news server.');
  }

  const data = await res.json();
  const blogs = data.blogs || [];

  return blogs.map((item: any): NewsItem => {
    let img = item.thumbnail;
    if (!img && item.content) {
      const match = item.content.match(/<img[^>]+src=["'](https?:\/\/[^"'>\s]+)["']/i);
      if (match) {
        img = match[1].replace(/&#038;|&amp;/g, '&');
      }
    }
    return {
      id: item.url || String(Math.random()),
      title: item.title,
      description: item.content || item.description || '',
      source: item.source || source || 'Global News',
      url: item.url,
      imageUrl: img && img.trim() ? img.trim() : undefined,
      publishedAt: item.publishedAt || item.date || new Date().toISOString(),
      category: item.category || category,
    };
  });
}

// 1. GNews API
export async function fetchGNews(apiKey: string, params: { category?: string; query?: string; limit?: number }): Promise<NewsItem[]> {
  const { category = 'technology', query, limit = 12 } = params;
  const url = query
    ? `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&max=${limit}&apikey=${apiKey}`
    : `https://gnews.io/api/v4/top-headlines?category=${encodeURIComponent(category)}&lang=en&max=${limit}&apikey=${apiKey}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`GNews API error: ${res.statusText}`);
  const data = await res.json();
  const articles = data.articles || [];

  return articles.map((a: any): NewsItem => ({
    id: a.url,
    title: a.title,
    description: a.description || a.content || '',
    source: a.source?.name || 'GNews',
    url: a.url,
    imageUrl: a.image || undefined,
    publishedAt: a.publishedAt || new Date().toISOString(),
    category: category,
  }));
}

// 2. NewsData.io API
export async function fetchNewsData(apiKey: string, params: { category?: string; query?: string }): Promise<NewsItem[]> {
  const { category = 'technology', query } = params;
  const url = query
    ? `https://newsdata.io/api/1/latest?apikey=${apiKey}&q=${encodeURIComponent(query)}&language=en`
    : `https://newsdata.io/api/1/latest?apikey=${apiKey}&category=${encodeURIComponent(category)}&language=en`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`NewsData API error: ${res.statusText}`);
  const data = await res.json();
  const results = data.results || [];

  return results.map((r: any): NewsItem => ({
    id: r.article_id || r.link,
    title: r.title,
    description: r.description || '',
    source: r.source_name || r.source_id || 'NewsData',
    url: r.link,
    imageUrl: r.image_url || undefined,
    publishedAt: r.pubDate || new Date().toISOString(),
    category: category,
  }));
}

// 3. Currents API
export async function fetchCurrents(apiKey: string, params: { category?: string; query?: string }): Promise<NewsItem[]> {
  const { category = 'technology', query } = params;
  const searchParams = new URLSearchParams();
  searchParams.set('language', 'en');
  searchParams.set('apiKey', apiKey);
  if (query) searchParams.set('keywords', query);
  else if (category) searchParams.set('category', category);

  const res = await fetch(`https://api.currentsapi.services/v1/latest-news?${searchParams.toString()}`);
  if (!res.ok) throw new Error(`Currents API error: ${res.statusText}`);
  const data = await res.json();
  const news = data.news || [];

  return news.map((n: any): NewsItem => ({
    id: n.id || n.url,
    title: n.title,
    description: n.description || '',
    source: n.author || 'Currents News',
    url: n.url,
    imageUrl: n.image && n.image !== 'None' ? n.image : undefined,
    publishedAt: n.published || new Date().toISOString(),
    category: category,
  }));
}

// 4. NewsAPI.org
export async function fetchNewsApiOrg(apiKey: string, params: { category?: string; query?: string }): Promise<NewsItem[]> {
  const { category = 'technology', query } = params;
  const url = query
    ? `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&apiKey=${apiKey}`
    : `https://newsapi.org/v2/top-headlines?category=${encodeURIComponent(category)}&language=en&apiKey=${apiKey}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`NewsAPI.org error: ${res.statusText}`);
  const data = await res.json();
  const articles = data.articles || [];

  return articles.map((a: any): NewsItem => ({
    id: a.url,
    title: a.title,
    description: a.description || '',
    source: a.source?.name || 'NewsAPI',
    url: a.url,
    imageUrl: a.urlToImage || undefined,
    publishedAt: a.publishedAt || new Date().toISOString(),
    category: category,
  }));
}

export function getStoredApiKeys(): DiscoverApiKeys {
  try {
    const raw = localStorage.getItem('vane_discover_api_keys');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveStoredApiKeys(keys: DiscoverApiKeys): void {
  try {
    localStorage.setItem('vane_discover_api_keys', JSON.stringify(keys));
  } catch (err) {
    console.error('Failed to save API keys to localStorage', err);
  }
}
