import { useState, useEffect, useCallback } from 'react';
import { Mic, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { soundService } from '@/lib/sound/soundService';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  isListening?: boolean;
  onListeningChange?: (listening: boolean) => void;
}

const VoiceInput = ({ onTranscript, isListening, onListeningChange }: VoiceInputProps) => {
  const [internalListening, setInternalListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  
  const listening = isListening !== undefined ? isListening : internalListening;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        const recog = new SpeechRecognition();
        recog.continuous = true;
        recog.interimResults = true;
        recog.lang = 'en-US'; // Default, could be made configurable

        recog.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              onTranscript(event.results[i][0].transcript + ' ');
            }
          }
        };

        recog.onerror = (event: any) => {
          console.error('Speech recognition error', event.error);
          stopListening();
        };

        recog.onend = () => {
          setInternalListening(false);
          onListeningChange?.(false);
        };

        setRecognition(recog);
      }
    }
  }, [onTranscript, onListeningChange]);

  const startListening = useCallback(() => {
    if (recognition) {
      try {
        recognition.start();
        setInternalListening(true);
        onListeningChange?.(true);
        soundService.play('dispatch'); // Optional sound cue
      } catch (e) {
        console.error('Failed to start recognition', e);
      }
    }
  }, [recognition, onListeningChange]);

  const stopListening = useCallback(() => {
    if (recognition) {
      recognition.stop();
      setInternalListening(false);
      onListeningChange?.(false);
    }
  }, [recognition, onListeningChange]);

  const toggleListening = () => {
    if (listening) {
      stopListening();
    } else {
      startListening();
    }
  };

  if (!recognition) {
    return null; // Not supported in this browser/environment
  }

  return (
    <button
      type="button"
      onClick={toggleListening}
      title={listening ? 'Stop dictation' : 'Start voice input'}
      className={cn(
        'flex items-center justify-center p-2 rounded-xl transition duration-200 focus:outline-none active:scale-95',
        listening
          ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
          : 'text-black/50 dark:text-white/50 hover:bg-light-200 dark:hover:bg-dark-200 hover:text-black dark:hover:text-white'
      )}
    >
      {listening ? (
        <span className="relative flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 items-center justify-center">
             <Mic size={12} className="text-white" />
          </span>
        </span>
      ) : (
        <Mic size={18} />
      )}
    </button>
  );
};

export default VoiceInput;
