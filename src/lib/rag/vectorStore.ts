import { DocumentChunk } from './documentChunker';

export interface IndexedDocumentMeta {
  documentId: string;
  title: string;
  pageCount: number;
  chunkCount: number;
  indexedAt: number;
}

export interface StoredChunk extends DocumentChunk {
  terms: Record<string, number>; // Term frequencies for instant BM25/TF-IDF scoring
  vector?: number[]; // Optional neural dense embedding
}

export interface DocumentVectorIndex {
  meta: IndexedDocumentMeta;
  chunks: StoredChunk[];
  idfMap: Record<string, number>;
  avgChunkLength: number;
}

const DB_NAME = 'vane_rag_vector_db';
const DB_VERSION = 1;
const STORE_META = 'document_meta';
const STORE_INDEXES = 'document_indexes';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'documentId' });
      }
      if (!db.objectStoreNames.contains(STORE_INDEXES)) {
        db.createObjectStore(STORE_INDEXES, { keyPath: 'documentId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveDocumentIndex(index: DocumentVectorIndex): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_META, STORE_INDEXES], 'readwrite');

    tx.objectStore(STORE_META).put(index.meta);
    tx.objectStore(STORE_INDEXES).put({
      documentId: index.meta.documentId,
      chunks: index.chunks,
      idfMap: index.idfMap,
      avgChunkLength: index.avgChunkLength,
    });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getDocumentIndex(documentId: string): Promise<DocumentVectorIndex | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_META, STORE_INDEXES], 'readonly');
    const metaReq = tx.objectStore(STORE_META).get(documentId);
    const indexReq = tx.objectStore(STORE_INDEXES).get(documentId);

    tx.oncomplete = () => {
      if (!metaReq.result || !indexReq.result) {
        resolve(null);
      } else {
        resolve({
          meta: metaReq.result,
          chunks: indexReq.result.chunks,
          idfMap: indexReq.result.idfMap,
          avgChunkLength: indexReq.result.avgChunkLength,
        });
      }
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function isDocumentIndexed(documentId: string): Promise<boolean> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_META], 'readonly');
    const req = tx.objectStore(STORE_META).count(IDBKeyRange.only(documentId));
    req.onsuccess = () => resolve(req.result > 0);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteDocumentIndex(documentId: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_META, STORE_INDEXES], 'readwrite');
    tx.objectStore(STORE_META).delete(documentId);
    tx.objectStore(STORE_INDEXES).delete(documentId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
