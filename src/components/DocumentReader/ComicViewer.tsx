import React, { useEffect, useState, useRef } from 'react';
import JSZip from 'jszip';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Columns,
  Rows,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

interface ComicViewerProps {
  data: ArrayBuffer;
  onPageChange?: (page: number, total: number) => void;
}

export const ComicViewer: React.FC<ComicViewerProps> = ({ data, onPageChange }) => {
  const [images, setImages] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [isWebtoonMode, setIsWebtoonMode] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const objectUrlsRef = useRef<string[]>([]);

  // Load and unzip CBZ archive
  useEffect(() => {
    if (!data) return;

    let isCancelled = false;
    setLoading(true);

    const loadCbz = async () => {
      try {
        const zip = await JSZip.loadAsync(data);
        const imageFiles: { name: string; file: JSZip.JSZipObject }[] = [];

        zip.forEach((relativePath, file) => {
          if (!file.dir && /\.(jpe?g|png|webp|gif|bmp)$/i.test(relativePath)) {
            imageFiles.push({ name: relativePath, file });
          }
        });

        // Natural sort files by name
        imageFiles.sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
        );

        const urls: string[] = [];
        for (const item of imageFiles) {
          const blob = await item.file.async('blob');
          const url = URL.createObjectURL(blob);
          urls.push(url);
        }

        if (!isCancelled) {
          objectUrlsRef.current = urls;
          setImages(urls);
          setCurrentPage(1);
          onPageChange?.(1, urls.length);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to unpack CBZ file:', err);
        toast.error('Failed to read comic archive');
        setLoading(false);
      }
    };

    loadCbz();

    return () => {
      isCancelled = true;
      // Revoke created blob URLs to avoid memory leaks
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [data]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= images.length) {
      setCurrentPage(page);
      onPageChange?.(page, images.length);
      containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-[#090d14] text-white">
        <Loader2 size={28} className="animate-spin text-sky-400" />
        <p className="text-sm font-medium text-white/70">Unpacking Comic Archive...</p>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#090d14] text-white/60 text-sm">
        No images found in comic archive.
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex flex-col bg-[#070a0f] overflow-hidden select-none">
      {/* Floating Toolbar */}
      <div className="absolute top-4 right-8 z-30 flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-[#0f131a]/95 backdrop-blur-xl border border-white/10 shadow-2xl text-white text-xs">
        {/* Webtoon / Paginated Toggle */}
        <button
          type="button"
          onClick={() => setIsWebtoonMode((m) => !m)}
          title={isWebtoonMode ? 'Switch to Paginated Mode' : 'Switch to Continuous Webtoon Scroll'}
          className={`p-1.5 rounded-xl transition-colors ${
            isWebtoonMode ? 'bg-sky-500 text-white' : 'hover:bg-white/10 text-white/70'
          }`}
        >
          {isWebtoonMode ? <Rows size={15} /> : <Columns size={15} />}
        </button>

        <div className="w-px h-3.5 bg-white/15" />

        {/* Zoom */}
        <button
          type="button"
          onClick={() => setScale((s) => Math.max(0.6, s - 0.15))}
          title="Zoom Out"
          className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
        >
          <ZoomOut size={14} />
        </button>
        <span className="font-mono text-[11px] px-1">{Math.round(scale * 100)}%</span>
        <button
          type="button"
          onClick={() => setScale((s) => Math.min(2.5, s + 0.15))}
          title="Zoom In"
          className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
        >
          <ZoomIn size={14} />
        </button>

        {!isWebtoonMode && (
          <>
            <div className="w-px h-3.5 bg-white/15" />
            <button
              type="button"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="p-1 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="font-mono text-[11px]">
              {currentPage} / {images.length}
            </span>
            <button
              type="button"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= images.length}
              className="p-1 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </>
        )}
      </div>

      {/* Main Image Display Area */}
      <div
        ref={containerRef}
        className="flex-1 w-full h-full overflow-auto flex items-center justify-center p-4"
      >
        {isWebtoonMode ? (
          // Continuous Webtoon scroll mode
          <div
            className="flex flex-col items-center gap-2 max-w-3xl mx-auto"
            style={{ width: `${scale * 100}%` }}
          >
            {images.map((src, idx) => (
              <img
                key={idx}
                src={src}
                alt={`Page ${idx + 1}`}
                className="w-full object-contain rounded-lg shadow-xl"
                loading="lazy"
              />
            ))}
          </div>
        ) : (
          // Single page mode
          <div
            className="flex items-center justify-center transition-transform duration-150"
            style={{ transform: `scale(${scale})` }}
          >
            <img
              src={images[currentPage - 1]}
              alt={`Page ${currentPage}`}
              className="max-h-[85vh] max-w-[85vw] object-contain rounded-xl shadow-2xl shadow-black/80"
            />
          </div>
        )}
      </div>
    </div>
  );
};
