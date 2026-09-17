import { cn } from '@/lib/utils';
import { ArrowUp, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import AttachSmall from './MessageInputActions/AttachSmall';
import ModelSelector from './MessageInputActions/ChatModelSelector';
import Optimization from './MessageInputActions/Optimization';
import Sources from './MessageInputActions/Sources';
import { useChat } from '@/lib/hooks/useChat';

const MessageInput = () => {
  const { loading, sendMessage } = useChat();
  const [message, setMessage] = useState('');
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

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSend = () => {
    if (loading || message.trim().length === 0) return;
    sendMessage(message);
    setMessage('');
  };

  return (
    <div className="w-full relative flex flex-col gap-2">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
        className={cn(
          'relative flex flex-col w-full bg-light-secondary dark:bg-dark-secondary border border-light-200 dark:border-dark-200 shadow-sm shadow-light-200/20 dark:shadow-black/40 rounded-2xl transition-all duration-300 focus-within:border-light-300 dark:focus-within:border-dark-300 focus-within:ring-2 focus-within:ring-light-300/20 dark:focus-within:ring-dark-300/20',
        )}
      >
        {/* Text Area */}
        <div className="flex-1 w-full p-4 pb-2">
          <TextareaAutosize
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full resize-none bg-transparent focus:outline-none text-base text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40 max-h-[40vh] overflow-y-auto scrollbar-hide"
            placeholder="Ask anything or type '/' for commands..."
            minRows={1}
          />
        </div>

        {/* Bottom Toolbar */}
        <div className="flex flex-row items-center justify-between w-full px-3 py-2 bg-light-secondary/50 dark:bg-dark-secondary/50 border-t border-light-200/50 dark:border-dark-200/50 rounded-b-2xl">

          {/* Left Actions (Optimization Mode) */}
          <div className="flex flex-row items-center space-x-1.5">
            <Optimization placement="top" />
          </div>

          {/* Right Actions (Sources, Model Selector, Attach, Send/Stop) */}
          <div className="flex flex-row items-center space-x-2">
            <div className="flex flex-row items-center space-x-1">
              <Sources placement="top" />
              <ModelSelector placement="top" />
              <AttachSmall />
            </div>

            {loading ? (
              <button
                type="button"
                className="flex items-center justify-center p-2 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all duration-200"
              >
                <Square size={16} fill="currentColor" strokeWidth={0} />
              </button>
            ) : (
              <button
                disabled={message.trim().length === 0}
                type="submit"
                className="flex items-center justify-center p-2 rounded-full bg-[#24A0ED] text-white disabled:bg-light-200 dark:disabled:bg-dark-200 disabled:text-black/30 dark:disabled:text-white/30 hover:bg-blue-500 transition-all duration-200"
              >
                <ArrowUp size={18} strokeWidth={2.5} />
              </button>
            )}
          </div>

        </div>
      </form>
    </div>
  );
};

export default MessageInput;
