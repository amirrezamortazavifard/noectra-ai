import React, { useEffect, useState } from 'react';
import { BookOpen, ExternalLink, Loader2, X } from 'lucide-react';
import { LibraryDocumentView } from '@/lib/localLlm/types';

interface OfflineSourceDrawerProps {
  docId: string | null;
  onClose: () => void;
}

const OfflineSourceDrawer = ({ docId, onClose }: OfflineSourceDrawerProps) => {
  const [doc, setDoc] = useState<LibraryDocumentView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!docId) {
      setDoc(null);
      return;
    }
    const fetchDoc = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/survival/library/document?id=${encodeURIComponent(docId)}`,
        );
        if (!res.ok) {
          throw new Error('Could not open offline document.');
        }
        const data = await res.json();
        setDoc(data.document ?? null);
      } catch (e: any) {
        setError(e.message || 'Failed to read document.');
      } finally {
        setLoading(false);
      }
    };
    fetchDoc();
  }, [docId]);

  if (!docId) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/35 backdrop-blur-[2px]">
      <div className="w-full max-w-2xl h-full bg-light-primary dark:bg-dark-primary border-l border-light-200 dark:border-dark-200 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-light-200 dark:border-dark-200">
          <div className="min-w-0 pr-3">
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              <BookOpen size={14} />
              <span className="truncate">{doc?.sourceLabel || 'Offline Library Source'}</span>
            </div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white truncate mt-0.5">
              {doc?.title || 'Loading source...'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-600 dark:text-white/60 hover:bg-light-200 dark:hover:bg-dark-200"
            title="Close reader"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-xs text-slate-600 dark:text-white/65">
              <Loader2 size={18} className="animate-spin mr-2" /> Reading offline passage...
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-xs text-rose-700 dark:text-rose-300">
              {error}
            </div>
          ) : doc ? (
            doc.passages && doc.passages.length > 0 ? (
              doc.passages.map((p) => {
                const isHighlighted =
                  doc.highlightPassageId === p.id ||
                  (doc.highlightText && p.text === doc.highlightText);
                return (
                  <div
                    key={p.id}
                    className={`rounded-xl p-4 border text-sm leading-relaxed whitespace-pre-wrap ${
                      isHighlighted
                        ? 'border-amber-500/50 bg-amber-500/10 text-slate-900 dark:text-white shadow-sm'
                        : 'border-light-200 dark:border-white/10 bg-white dark:bg-[#0c1017] text-slate-800 dark:text-white/90'
                    }`}
                  >
                    {p.heading && (
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-sky-700 dark:text-sky-400 mb-2">
                        {p.heading}
                      </h3>
                    )}
                    {p.text}
                  </div>
                );
              })
            ) : (
              <div className="rounded-xl p-4 border border-light-200 dark:border-white/10 bg-white dark:bg-[#0c1017] text-sm leading-relaxed whitespace-pre-wrap text-slate-800 dark:text-white/90">
                {doc.text}
              </div>
            )
          ) : null}
        </div>

        <div className="px-5 py-2.5 border-t border-light-200 dark:border-dark-200 flex items-center justify-between text-[11px] text-slate-600 dark:text-white/55">
          <span className="truncate font-mono">{doc?.url || docId}</span>
          <span className="inline-flex items-center gap-1 shrink-0">
            <ExternalLink size={11} /> Verified Offline Citation
          </span>
        </div>
      </div>
    </div>
  );
};

export default OfflineSourceDrawer;
