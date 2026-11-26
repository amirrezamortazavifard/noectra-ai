import { cn } from '@/lib/utils';
import { ArrowUp, BookOpen, Cloud, Cpu, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import AttachSmall from './MessageInputActions/AttachSmall';
import ModelSelector from './MessageInputActions/ChatModelSelector';
import Optimization from './MessageInputActions/Optimization';
import Sources from './MessageInputActions/Sources';
import WebSearchToggle from './MessageInputActions/WebSearchToggle';
import VoiceInput from './MessageInputActions/VoiceInput';
import SurvivalControlsBar from './Survival/SurvivalControlsBar';
import { useChat } from '@/lib/hooks/useChat';
import { uploadDroppedFiles } from '@/lib/services/uploadService';
import { toast } from 'sonner';
import { soundService } from '@/lib/sound/soundService';

const MessageInput = () => {
  const {
    loading,
    sendMessage,
    stopGeneration,
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
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto">
      <form
        onSubmit={(e) => {
          if (loading) return;
          e.preventDefault();
          if (message.trim().length > 0) {
            soundService.play('dispatch');
            sendMessage(message);
            setMessage('');
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !loading) {
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
        className={cn(
          'relative flex flex-col w-full bg-light-secondary dark:bg-dark-secondary border border-light-200 dark:border-dark-200 shadow-sm shadow-black/5 dark:shadow-black/40 rounded-2xl transition-all duration-200 focus-within:border-sky-500/40 focus-within:ring-2 focus-within:ring-sky-500/10',
        )}
      >
        {isDragging && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-sky-500/10 backdrop-blur-[2px] border-2 border-dashed border-sky-500 rounded-2xl pointer-events-none transition-all duration-200">
            <p className="text-sky-500 font-medium text-lg">Drop files to attach</p>
          </div>
        )}

        <div className="flex-1 w-full px-4 pt-3.5 pb-2">
          <TextareaAutosize
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full resize-none bg-transparent focus:outline-none text-[15px] leading-relaxed text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40 max-h-[40vh] overflow-y-auto scrollbar-hide"
            placeholder={
              modelMode === 'offline'
                ? 'Ask offline AI (searches your local ZIM library & files)...'
                : "Ask anything or type '/' for focus..."
            }
            minRows={1}
          />
        </div>

        {/* Row 1: Primary Mode, Search/Library & Model Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 w-full px-3 pb-2.5">
          <div className="flex flex-row items-center gap-1.5 flex-wrap">
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
                <Optimization placement="top" />
                <Sources placement="top" />
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

          <div className="flex flex-row items-center gap-1.5 ml-auto">
            <ModelSelector placement="top" />
            <AttachSmall />
            <VoiceInput onTranscript={(text) => setMessage((prev) => prev + text)} />

            {loading ? (
              <button
                type="button"
                onClick={stopGeneration}
                title="Stop generation"
                className="h-8 w-8 flex items-center justify-center rounded-full bg-red-500/15 text-red-500 hover:bg-red-500/25 transition-all duration-150 shrink-0"
              >
                <Square size={14} fill="currentColor" strokeWidth={0} />
              </button>
            ) : (
              <button
                disabled={message.trim().length === 0}
                type="submit"
                className="h-8 w-8 flex items-center justify-center rounded-full bg-[#24A0ED] text-white disabled:bg-black/10 dark:disabled:bg-white/10 disabled:text-black/30 dark:disabled:text-white/30 hover:bg-blue-500 transition-all duration-150 shrink-0"
                title="Send message"
              >
                <ArrowUp size={17} strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Sleek Utility & Survival Tuning Bar */}
        <div className="px-3 py-1.5 bg-black/[0.02] dark:bg-white/[0.02] border-t border-light-200/60 dark:border-white/[0.06] rounded-b-2xl">
          <SurvivalControlsBar />
        </div>
      </form>
    </div>
  );
};

export default MessageInput;
