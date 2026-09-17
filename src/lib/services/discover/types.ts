export interface NewsItem {
  id: string;
  title: string;
  description: string;
  source: string;
  url: string;
  imageUrl?: string;
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
