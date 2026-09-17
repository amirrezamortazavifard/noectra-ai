import { ResearchPaper } from './types';

// Helper to reconstruct abstract from OpenAlex inverted index
function reconstructAbstract(invertedIndex: Record<string, number[]> | null | undefined): string {
  if (!invertedIndex) return '';
  try {
    const wordList: [number, string][] = [];
    for (const [word, positions] of Object.entries(invertedIndex)) {
      for (const pos of positions) {
        wordList.push([pos, word]);
      }
    }
    wordList.sort((a, b) => a[0] - b[0]);
    return wordList.map(([, word]) => word).join(' ');
  } catch {
    return '';
  }
}

// 1. OpenAlex API
export async function fetchOpenAlexPapers(params: {
  query?: string;
  conceptId?: string;
  limit?: number;
}): Promise<ResearchPaper[]> {
  const { query, conceptId, limit = 12 } = params;
  const searchParams = new URLSearchParams();
  searchParams.set('per_page', String(limit));
  searchParams.set('mailto', 'user@noectra.ai');

  if (query && query.trim()) {
    searchParams.set('search', query.trim());
  }

  if (conceptId) {
    searchParams.set('filter', `concepts.id:${conceptId}`);
  }

  const res = await fetch(`https://api.openalex.org/works?${searchParams.toString()}`, {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`OpenAlex API error: ${res.statusText}`);
  }

  const data = await res.json();
  const results = data.results || [];

  return results.map((work: any): ResearchPaper => {
    const authors = (work.authorships || [])
      .map((a: any) => a.author?.display_name)
      .filter(Boolean);

    const fieldsOfStudy = (work.concepts || [])
      .map((c: any) => c.display_name)
      .filter(Boolean)
      .slice(0, 4);

    const abstract = reconstructAbstract(work.abstract_inverted_index);

    return {
      id: work.id || work.doi || String(Math.random()),
      title: work.title || 'Untitled Research Paper',
      abstract: abstract || 'No abstract available for this work.',
      authors: authors.length > 0 ? authors : ['Unknown Author'],
      year: work.publication_year || 'N/A',
      venue: work.primary_location?.source?.display_name || work.host_venue?.display_name || 'Academic Venue',
      pdfUrl: work.open_access?.oa_url || undefined,
      fieldsOfStudy: fieldsOfStudy.length > 0 ? fieldsOfStudy : ['Academic Research'],
      citationCount: work.cited_by_count,
      doi: work.doi || undefined,
      url: work.doi || work.id || (work.primary_location?.landing_page_url ?? ''),
      source: 'OpenAlex',
    };
  });
}

// 2. Semantic Scholar API
export async function fetchSemanticScholarPapers(params: {
  query?: string;
  fieldOfStudy?: string;
  limit?: number;
}): Promise<ResearchPaper[]> {
  const { query = 'artificial intelligence', fieldOfStudy, limit = 12 } = params;
  const searchParams = new URLSearchParams();
  
  let q = query.trim() || 'research';
  if (fieldOfStudy && !q.toLowerCase().includes(fieldOfStudy.toLowerCase())) {
    q = `${fieldOfStudy} ${q}`;
  }
  searchParams.set('query', q);
  searchParams.set('limit', String(limit));
  searchParams.set(
    'fields',
    'paperId,title,abstract,authors,year,venue,openAccessPdf,fieldsOfStudy,citationCount,externalIds,url'
  );

  try {
    const res = await fetch(`https://api.semanticscholar.org/graph/v1/paper/search?${searchParams.toString()}`, {
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      console.warn(`Semantic Scholar API returned ${res.status}. Falling back to OpenAlex.`);
      return await fetchOpenAlexPapers({ query: q, limit });
    }

    const data = await res.json();
    const papers = data.data || [];
    if (papers.length === 0) {
      return await fetchOpenAlexPapers({ query: q, limit });
    }

  return papers.map((p: any): ResearchPaper => {
    const authors = (p.authors || []).map((a: any) => a.name).filter(Boolean);
    const doi = p.externalIds?.DOI;

      return {
        id: p.paperId || doi || String(Math.random()),
        title: p.title || 'Untitled Research Paper',
        abstract: p.abstract || 'No abstract provided by authors.',
        authors: authors.length > 0 ? authors : ['Unknown Author'],
        year: p.year || 'N/A',
        venue: p.venue || 'Semantic Scholar',
        pdfUrl: p.openAccessPdf?.url || undefined,
        fieldsOfStudy: p.fieldsOfStudy || ['Computer Science'],
        citationCount: p.citationCount,
        doi,
        url: p.url || (doi ? `https://doi.org/${doi}` : `https://www.semanticscholar.org/paper/${p.paperId}`),
        source: 'Semantic Scholar',
      };
    });
  } catch (err) {
    console.warn('Semantic Scholar error, falling back to OpenAlex:', err);
    return await fetchOpenAlexPapers({ query: q, limit });
  }
}

// 3. Crossref REST API
export async function fetchCrossrefPapers(params: {
  query?: string;
  limit?: number;
}): Promise<ResearchPaper[]> {
  const { query = 'science', limit = 12 } = params;
  const searchParams = new URLSearchParams();
  searchParams.set('query', query.trim() || 'science');
  searchParams.set('rows', String(limit));
  searchParams.set('mailto', 'developer@noectra.ai');

  const res = await fetch(`https://api.crossref.org/works?${searchParams.toString()}`, {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`Crossref API error: ${res.statusText}`);
  }

  const data = await res.json();
  const items = data.message?.items || [];

  return items.map((item: any): ResearchPaper => {
    const authors = (item.author || [])
      .map((a: any) => `${a.given || ''} ${a.family || ''}`.trim())
      .filter(Boolean);

    let abstract = item.abstract || '';
    if (abstract) {
      // Strip XML/HTML tags from JATS abstract
      abstract = abstract.replace(/<[^>]*>/g, '').trim();
    }
    if (!abstract && item.title?.[0]) {
      abstract = `Published in ${item['container-title']?.[0] || item.publisher || 'Crossref'}.`;
    }

    const year =
      item.created?.['date-parts']?.[0]?.[0] ||
      item.published?.['date-parts']?.[0]?.[0] ||
      'N/A';

    const pdfLink = (item.link || []).find((l: any) => l['content-type'] === 'application/pdf');

    return {
      id: item.DOI || String(Math.random()),
      title: item.title?.[0] || 'Scholarly Publication',
      abstract: abstract || 'No abstract text returned by Crossref.',
      authors: authors.length > 0 ? authors : [item.publisher || 'Research Consortium'],
      year,
      venue: item['container-title']?.[0] || item.publisher || 'Crossref Registry',
      pdfUrl: pdfLink?.URL || undefined,
      fieldsOfStudy: (item.subject || []).slice(0, 4),
      citationCount: item['is-referenced-by-count'] ?? undefined,
      doi: item.DOI,
      url: item.URL || (item.DOI ? `https://doi.org/${item.DOI}` : ''),
      source: 'Crossref',
    };
  });
}

// 4. NCBI E-utilities (PubMed API)
export async function fetchPubMedPapers(params: {
  query?: string;
  limit?: number;
}): Promise<ResearchPaper[]> {
  const { query = 'medicine', limit = 12 } = params;
  const term = encodeURIComponent(query.trim() || 'biomedicine');

  // Stage 1: E-Search
  const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${term}&retmode=json&retmax=${limit}`;
  const searchRes = await fetch(searchUrl);
  if (!searchRes.ok) {
    throw new Error(`PubMed Search error: ${searchRes.statusText}`);
  }

  const searchData = await searchRes.json();
  const idList = searchData.esearchresult?.idlist || [];

  if (idList.length === 0) {
    return [];
  }

  // Stage 2: E-Summary
  const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${idList.join(',')}&retmode=json`;
  const summaryRes = await fetch(summaryUrl);
  if (!summaryRes.ok) {
    throw new Error(`PubMed Summary error: ${summaryRes.statusText}`);
  }

  const summaryData = await summaryRes.json();
  const result = summaryData.result || {};

  return idList.map((id: string): ResearchPaper => {
    const doc = result[id] || {};
    const authors = (doc.authors || []).map((a: any) => a.name).filter(Boolean);
    const doiObj = (doc.articleids || []).find((a: any) => a.idtype === 'doi');
    const doi = doiObj ? doiObj.value : undefined;

    let year = 'N/A';
    if (doc.pubdate) {
      const match = doc.pubdate.match(/\b(19\d{2}|20\d{2})\b/);
      if (match) year = match[0];
    }

    return {
      id: `PMID:${id}`,
      title: doc.title?.replace(/<[^>]*>/g, '') || `PubMed Article #${id}`,
      abstract: doc.sortfirstauthor
        ? `Biomedical research published in ${doc.source || 'NLM/PubMed'}. Lead investigator: ${doc.sortfirstauthor}.`
        : `Biomedical research published in ${doc.source || 'NLM/PubMed'}.`,
      authors: authors.length > 0 ? authors : ['Biomedical Authors'],
      year,
      venue: doc.source || 'PubMed / NLM',
      pdfUrl: undefined,
      fieldsOfStudy: ['Medicine', 'Biomedicine', 'Healthcare'],
      doi,
      url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
      source: 'NCBI PubMed',
    };
  });
}
