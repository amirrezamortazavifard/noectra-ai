import { ArrowRight, BookOpen, Cloud, Cpu } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import Sources from './MessageInputActions/Sources';
import Optimization from './MessageInputActions/Optimization';
import Attach from './MessageInputActions/Attach';
import { useChat } from '@/lib/hooks/useChat';
import ModelSelector from './MessageInputActions/ChatModelSelector';
import WebSearchToggle from './MessageInputActions/WebSearchToggle';
import VoiceInput from './MessageInputActions/VoiceInput';
import SurvivalControlsBar from './Survival/SurvivalControlsBar';
import { uploadDroppedFiles } from '@/lib/services/uploadService';
import { toast } from 'sonner';
import { soundService } from '@/lib/sound/soundService';

const EmptyChatMessageInput = () => {
  const {
    sendMessage,
    files,
    setFiles,
    fileIds,
    setFileIds,
    modelMode,
    setModelMode,
    useOfflineLibrary,
    setUseOfflineLibrary,
  } = useChat();

  const [message, setMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;

      const isInputFocused =
        activeElement?.tagName === 'INPUT' ||
        activeElement?.tagName === 'TEXTAREA' ||
        activeElement?.hasAttribute('contenteditable');

      if (e.key === '/' && !isInputFocused) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    inputRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (message.trim().length > 0) {
          soundService.play('dispatch');
          sendMessage(message);
          setMessage('');
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          if (message.trim().length > 0) {
            soundService.play('dispatch');
            sendMessage(message);
            setMessage('');
          }
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setIsDragging(false);
      }}
      onDrop={async (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          const droppedFiles = Array.from(e.dataTransfer.files);
          try {
            toast.loading('Processing & vectorizing dropped files...', { id: 'drop-upload' });
            const uploaded = await uploadDroppedFiles(droppedFiles);
            setFiles([...files, ...uploaded]);
            setFileIds([...fileIds, ...uploaded.map((f: any) => f.fileId)]);
            toast.success(`Attached ${uploaded.length} file(s)`, { id: 'drop-upload' });
          } catch (err: any) {
            toast.error(err?.message || 'Failed to attach files', { id: 'drop-upload' });
          }
        }
      }}
      className="w-full relative"
    >
      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-sky-500/10 backdrop-blur-[2px] border-2 border-dashed border-sky-500 rounded-2xl pointer-events-none transition-all duration-200">
          <p className="text-sky-500 font-medium text-lg">Drop files to attach</p>
        </div>
      )}
      <div className="flex flex-col bg-light-secondary dark:bg-dark-secondary rounded-2xl w-full border border-light-200 dark:border-dark-200 shadow-sm shadow-black/5 dark:shadow-black/30 transition-all duration-200 focus-within:border-sky-500/40 focus-within:ring-2 focus-within:ring-sky-500/10">
        <div className="px-4 pt-4 pb-2">
          <TextareaAutosize
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            minRows={2}
            className="bg-transparent placeholder:text-[15px] placeholder:text-black/45 dark:placeholder:text-white/45 text-[15px] leading-relaxed text-black dark:text-white resize-none focus:outline-none w-full max-h-36 xl:max-h-48"
            placeholder={
              modelMode === 'offline'
                ? 'Ask offline AI (searches your local ZIM library & files)...'
                : 'Ask anything...'
            }
          />
        </div>

        {/* Row 1: Primary Mode, Search/Library & Model Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 pb-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Offline / Online Segmented Switch */}
            <div
              className="inline-flex items-center h-8 rounded-xl p-0.5 bg-black/[0.04] dark:bg-white/[0.05] border border-light-200/80 dark:border-white/10"
              title="Switch between Offline local models and Online API models"
            >
              <button
                type="button"
                onClick={() => setModelMode('offline')}
                className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[9px] text-xs font-medium transition ${
                  modelMode === 'offline'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-700 dark:text-white/70 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                <Cpu size={13} /> Offline
              </button>
              <button
                type="button"
                onClick={() => setModelMode('online')}
                className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[9px] text-xs font-medium transition ${
                  modelMode === 'online'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-700 dark:text-white/70 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                <Cloud size={13} /> Online
              </button>
            </div>

            {modelMode === 'offline' ? (
              <button
                type="button"
                onClick={() => setUseOfflineLibrary(!useOfflineLibrary)}
                title="Search installed ZIM archives and Your Files before answering"
                className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-xl border text-xs font-medium transition ${
                  useOfflineLibrary
                    ? 'border-emerald-500/35 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300'
                    : 'border-light-200/80 dark:border-white/10 bg-white/75 dark:bg-white/[0.04] text-slate-600 dark:text-white/70 hover:bg-light-200/60 dark:hover:bg-white/10'
                }`}
              >
                <BookOpen size={13} />
                <span>Offline Library</span>
              </button>
            ) : (
              <>
                <WebSearchToggle />
                <Optimization />
                <Sources />
                <button
                  type="button"
                  onClick={() => setUseOfflineLibrary(!useOfflineLibrary)}
                  title="Also search installed offline ZIM archives and Your Files"
                  className={`inline-flex items-center gap-1 h-8 px-2.5 rounded-xl border text-xs font-medium transition ${
                    useOfflineLibrary
                      ? 'border-emerald-500/35 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300'
                      : 'border-light-200/80 dark:border-white/10 bg-white/75 dark:bg-white/[0.04] text-slate-600 dark:text-white/70 hover:bg-light-200/60 dark:hover:bg-white/10'
                  }`}
                >
                  <BookOpen size={13} />
                  <span>Library</span>
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <ModelSelector />
            <Attach />
            <VoiceInput onTranscript={(text) => setMessage((prev) => prev + text)} />
            <button
              disabled={message.trim().length === 0}
              className="h-8 w-8 flex items-center justify-center bg-sky-500 hover:bg-sky-600 text-white disabled:text-black/35 dark:disabled:text-white/35 disabled:bg-black/10 dark:disabled:bg-white/10 transition duration-150 rounded-full shrink-0"
              title="Send message"
            >
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* Row 2: Sleek Utility & Survival Tuning Bar */}
        <div className="px-3 py-1.5 bg-black/[0.02] dark:bg-white/[0.02] border-t border-light-200/60 dark:border-white/[0.06] rounded-b-2xl">
          <SurvivalControlsBar />
        </div>
      </div>
    </form>
  );
};

export default EmptyChatMessageInput;
