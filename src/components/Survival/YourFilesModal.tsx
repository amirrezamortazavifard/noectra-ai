import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import {
  FileText,
  FolderOpen,
  Loader2,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { toast } from 'sonner';
import { PersonalFileInfo } from '@/lib/localLlm/types';
import { useChat } from '@/lib/hooks/useChat';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

async function extractPdfText(file: globalThis.File): Promise<string> {
  const buf = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items
      .map((item: any) => ('str' in item ? item.str : ''))
      .filter(Boolean);
    const joined = strings.join(' ').trim();
    if (joined) {
      pages.push(`## Page ${i}\n\n${joined}`);
    }
  }
  return pages.join('\n\n');
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

interface YourFilesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const YourFilesModal = ({ isOpen, onClose }: YourFilesModalProps) => {
  const { setActiveOfflineDocId } = useChat();
  const [files, setFiles] = useState<PersonalFileInfo[]>([]);
  const [folder, setFolder] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/survival/files');
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files ?? []);
        setFolder(data.folder ?? '');
      }
    } catch {
      toast.error('Failed to load personal library files.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadFiles();
    }
  }, [isOpen, loadFiles]);

  const processUpload = async (fileList: FileList | globalThis.File[]) => {
    const arr = Array.from(fileList);
    if (arr.length === 0) return;
    setUploading(true);
    try {
      for (const f of arr) {
        const isPdf = f.name.toLowerCase().endsWith('.pdf');
        const buf = await f.arrayBuffer();
        const extractedText = isPdf ? await extractPdfText(f) : undefined;
        const contentBase64 = arrayBufferToBase64(buf);
        const res = await fetch('/api/survival/files/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: f.name,
            contentBase64,
            extractedText,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Upload failed' }));
          toast.error(`${f.name}: ${err.error || 'Failed'}`);
        }
      }
      toast.success(`Indexed ${arr.length} file(s) into Offline Library.`);
      await loadFiles();
    } catch (e: any) {
      toast.error(`Upload error: ${e.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (name: string) => {
    try {
      const res = await fetch(`/api/survival/files/${encodeURIComponent(name)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success(`Removed ${name}.`);
        await loadFiles();
      }
    } catch {
      toast.error('Delete failed.');
    }
  };

  const handlePickFolder = async () => {
    try {
      const res = await fetch('/api/survival/files/pick-folder', { method: 'POST' });
      const data = await res.json();
      if (data.folder) {
        toast.success('Updated personal library folder.');
        await loadFiles();
      }
    } catch {
      toast.error('Failed to change folder.');
    }
  };

  const handleOpenFolder = async () => {
    try {
      await fetch('/api/survival/files/open-folder', { method: 'POST' });
    } catch {
      toast.error('Could not open folder.');
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-2xl rounded-2xl border border-light-200 dark:border-dark-200 bg-light-primary dark:bg-dark-primary shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-light-200 dark:border-dark-200">
            <div className="flex items-center gap-2">
              <FileText size={17} className="text-sky-500" />
              <DialogTitle className="text-sm font-semibold text-slate-900 dark:text-white">
                Your Offline Files ({files.length})
              </DialogTitle>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-600 dark:text-white/60 hover:bg-light-200 dark:hover:bg-dark-200"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-5 space-y-4 overflow-y-auto">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-slate-600 dark:text-white/65 truncate max-w-md font-mono">
                Folder: {folder || 'Default AppData'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePickFolder}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-light-200 dark:border-white/15 bg-white dark:bg-dark-secondary text-slate-800 dark:text-white hover:bg-light-200 dark:hover:bg-white/10"
                >
                  <FolderOpen size={12} /> Choose Folder
                </button>
                <button
                  type="button"
                  onClick={handleOpenFolder}
                  className="px-2.5 py-1 rounded-lg border border-light-200 dark:border-white/15 bg-white dark:bg-dark-secondary text-slate-800 dark:text-white hover:bg-light-200 dark:hover:bg-white/10"
                >
                  Open Folder
                </button>
                <button
                  type="button"
                  onClick={loadFiles}
                  className="p-1.5 rounded-lg border border-light-200 dark:border-white/15 text-slate-700 dark:text-white/75 hover:bg-light-200 dark:hover:bg-white/10"
                  title="Sync folder"
                >
                  <RefreshCw size={12} />
                </button>
              </div>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                if (e.dataTransfer.files) {
                  processUpload(e.dataTransfer.files);
                }
              }}
              onClick={() => inputRef.current?.click()}
              className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition ${
                dragging
                  ? 'border-sky-500 bg-sky-500/10'
                  : 'border-light-200 dark:border-white/15 bg-white dark:bg-[#0c1017] hover:border-sky-500/50'
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                multiple
                accept=".pdf,.txt,.md,.markdown,.csv,.tsv,.html,.htm,.json,.log,.rst"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) processUpload(e.target.files);
                  e.target.value = '';
                }}
              />
              {uploading ? (
                <div className="flex items-center justify-center gap-2 text-xs text-sky-600 dark:text-sky-400">
                  <Loader2 size={16} className="animate-spin" /> Extracting & indexing passages...
                </div>
              ) : (
                <div className="space-y-1">
                  <Upload size={20} className="mx-auto text-sky-500" />
                  <p className="text-xs font-medium text-slate-900 dark:text-white">
                    Drop PDF, Markdown, TXT, HTML, CSV, or JSON files here (or click to browse)
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-white/55">
                    Personal documents are prioritized alongside ZIM encyclopedias during Offline Library search.
                  </p>
                </div>
              )}
            </div>

            {loading ? (
              <div className="py-8 flex items-center justify-center text-xs text-slate-600 dark:text-white/60">
                <Loader2 size={15} className="animate-spin mr-2" /> Syncing files...
              </div>
            ) : files.length === 0 ? (
              <p className="text-center py-6 text-xs text-slate-600 dark:text-white/55">
                No personal files added yet.
              </p>
            ) : (
              <div className="space-y-2">
                {files.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl border border-light-200 dark:border-white/10 bg-white dark:bg-[#0c1017]"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setActiveOfflineDocId(`myfile://${f.id}`);
                        onClose();
                      }}
                      className="min-w-0 text-left flex-1 group"
                    >
                      <p className="text-xs font-semibold text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 truncate">
                        {f.title || f.name}
                      </p>
                      <p className="text-[11px] text-slate-600 dark:text-white/55 truncate">
                        {f.name} · {(f.sizeBytes / 1024).toFixed(1)} KB · {f.passageCount} passage(s)
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(f.name)}
                      className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition"
                      title="Delete file"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
};

export default YourFilesModal;
