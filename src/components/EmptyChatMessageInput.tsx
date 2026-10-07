import { ArrowRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import Sources from './MessageInputActions/Sources';
import Optimization from './MessageInputActions/Optimization';
import Attach from './MessageInputActions/Attach';
import { useChat } from '@/lib/hooks/useChat';
import ModelSelector from './MessageInputActions/ChatModelSelector';
import WebSearchToggle from './MessageInputActions/WebSearchToggle';
import VoiceInput from './MessageInputActions/VoiceInput';
import { uploadDroppedFiles } from '@/lib/services/uploadService';
import { toast } from 'sonner';
import { soundService } from '@/lib/sound/soundService';

const EmptyChatMessageInput = () => {
  const { sendMessage, files, setFiles, fileIds, setFileIds } = useChat();

  /* const [copilotEnabled, setCopilotEnabled] = useState(false); */
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
      <div className="flex flex-col bg-light-secondary dark:bg-dark-secondary px-3 pt-5 pb-3 rounded-2xl w-full border border-light-200 dark:border-dark-200 shadow-sm shadow-light-200/10 dark:shadow-black/20 transition-all duration-200 focus-within:border-light-300 dark:focus-within:border-dark-300">
        <TextareaAutosize
          ref={inputRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          minRows={2}
          className="px-2 bg-transparent placeholder:text-[15px] placeholder:text-black/50 dark:placeholder:text-white/50 text-sm text-black dark:text-white resize-none focus:outline-none w-full max-h-24 lg:max-h-36 xl:max-h-48"
          placeholder="Ask anything..."
        />
        <div className="flex flex-row items-center justify-between mt-4">
          <div className="flex flex-row items-center space-x-1.5">
            <WebSearchToggle />
            <Optimization />
          </div>
          <div className="flex flex-row items-center space-x-2">
            <div className="flex flex-row items-center space-x-1">
              <Sources />
              <ModelSelector />
              <Attach />
              <VoiceInput onTranscript={(text) => setMessage((prev) => prev + text)} />
            </div>
            <button
              disabled={message.trim().length === 0}
              className="bg-sky-500 text-white disabled:text-black/50 dark:disabled:text-white/50 disabled:bg-[#e0e0dc] dark:disabled:bg-[#ececec21] hover:bg-opacity-85 transition duration-100 rounded-full p-2"
            >
              <ArrowRight className="bg-background" size={17} />
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};

export default EmptyChatMessageInput;
