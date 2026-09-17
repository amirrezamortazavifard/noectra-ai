import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Square,
  Volume2,
  VolumeX,
  FastForward,
  Rewind,
  X,
  Languages,
  Sliders,
} from 'lucide-react';
import { toast } from 'sonner';

interface DocumentTtsBarProps {
  isOpen: boolean;
  textToRead: string;
  documentTitle?: string;
  onClose: () => void;
  onSentenceChange?: (sentence: string, index: number) => void;
}

export const DocumentTtsBar: React.FC<DocumentTtsBarProps> = ({
  isOpen,
  textToRead,
  documentTitle,
  onClose,
  onSentenceChange,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [rate, setRate] = useState(1.0);
  const [volume, setVolume] = useState(1.0);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [sentences, setSentences] = useState<string[]>([]);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load available system voices
  useEffect(() => {
    const updateVoices = () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const availableVoices = window.speechSynthesis.getVoices();
        setVoices(availableVoices);
        if (availableVoices.length > 0 && !selectedVoice) {
          // Default to high quality English or first available voice
          const preferred =
            availableVoices.find((v) => v.lang.startsWith('en') && v.name.includes('Natural')) ||
            availableVoices.find((v) => v.lang.startsWith('en')) ||
            availableVoices[0];
          setSelectedVoice(preferred.name);
        }
      }
    };

    updateVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, [selectedVoice]);

  // Break text into sentences
  useEffect(() => {
    if (!textToRead) {
      setSentences([]);
      return;
    }
    const cleanSentences = textToRead
      .split(/(?<=[.?!؟])\s+|\n+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 1);
    setSentences(cleanSentences);
    setCurrentSentenceIndex(0);
  }, [textToRead]);

  // Stop when closed or text changes
  useEffect(() => {
    if (!isOpen) {
      stopSpeech();
    }
  }, [isOpen]);

  const playSentence = (index: number) => {
    if (!('speechSynthesis' in window)) {
      toast.error('Speech synthesis is not supported on this device');
      return;
    }

    if (index >= sentences.length) {
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentSentenceIndex(0);
      toast.info('Finished narration');
      return;
    }

    window.speechSynthesis.cancel();

    const sentence = sentences[index];
    onSentenceChange?.(sentence, index);
    setCurrentSentenceIndex(index);

    const utterance = new SpeechSynthesisUtterance(sentence);
    utteranceRef.current = utterance;

    if (selectedVoice) {
      const voiceObj = voices.find((v) => v.name === selectedVoice);
      if (voiceObj) utterance.voice = voiceObj;
    }

    utterance.rate = rate;
    utterance.volume = volume;

    utterance.onend = () => {
      playSentence(index + 1);
    };

    utterance.onerror = (e) => {
      if (e.error !== 'canceled' && e.error !== 'interrupted') {
        console.error('TTS speech error:', e);
      }
    };

    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
    setIsPaused(false);
  };

  const handlePlayPause = () => {
    if (!('speechSynthesis' in window)) return;

    if (isPlaying && !isPaused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    } else if (isPlaying && isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    } else {
      if (sentences.length === 0) {
        toast.info('No readable text in current view');
        return;
      }
      playSentence(currentSentenceIndex);
    }
  };

  const stopSpeech = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setIsPaused(false);
  };

  const handleNext = () => {
    if (currentSentenceIndex < sentences.length - 1) {
      playSentence(currentSentenceIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentSentenceIndex > 0) {
      playSentence(currentSentenceIndex - 1);
    }
  };

  const handleRateChange = (newRate: number) => {
    setRate(newRate);
    if (isPlaying && !isPaused) {
      playSentence(currentSentenceIndex);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
      <div className="flex items-center gap-2 sm:gap-3 px-4 py-2.5 rounded-2xl bg-[#0e1219]/95 dark:bg-[#090d14]/95 text-white backdrop-blur-xl border border-white/15 shadow-2xl shadow-black/60 select-none">
        {/* Playback Indicator */}
        <div className="flex items-center gap-2 pr-3 border-r border-white/10">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <div className="min-w-0 max-w-[120px] sm:max-w-[180px]">
            <p className="text-xs font-medium truncate text-white/90">
              {documentTitle || 'Narration'}
            </p>
            <p className="text-[10px] text-white/40 font-mono">
              {sentences.length > 0
                ? `${currentSentenceIndex + 1} / ${sentences.length} sentences`
                : 'Ready'}
            </p>
          </div>
        </div>

        {/* Previous Button */}
        <button
          type="button"
          onClick={handlePrevious}
          disabled={currentSentenceIndex <= 0}
          title="Previous Sentence"
          className="p-1.5 rounded-xl hover:bg-white/10 disabled:opacity-30 transition-colors text-white/80"
        >
          <Rewind size={15} />
        </button>

        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={handlePlayPause}
          title={isPlaying && !isPaused ? 'Pause' : 'Play Narration'}
          className="p-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white shadow-md shadow-sky-500/25 transition-all hover:scale-105 active:scale-95"
        >
          {isPlaying && !isPaused ? <Pause size={16} /> : <Play size={16} className="translate-x-0.5" />}
        </button>

        {/* Stop Button */}
        <button
          type="button"
          onClick={stopSpeech}
          disabled={!isPlaying && !isPaused}
          title="Stop Narration"
          className="p-1.5 rounded-xl hover:bg-white/10 disabled:opacity-30 transition-colors text-white/80"
        >
          <Square size={15} />
        </button>

        {/* Next Button */}
        <button
          type="button"
          onClick={handleNext}
          disabled={currentSentenceIndex >= sentences.length - 1}
          title="Next Sentence"
          className="p-1.5 rounded-xl hover:bg-white/10 disabled:opacity-30 transition-colors text-white/80"
        >
          <FastForward size={15} />
        </button>

        {/* Speed Selector */}
        <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-xl border border-white/10 text-xs">
          {[0.75, 1.0, 1.25, 1.5].map((speed) => (
            <button
              key={speed}
              type="button"
              onClick={() => handleRateChange(speed)}
              className={`px-1.5 py-0.5 rounded text-[11px] font-mono transition-colors ${
                rate === speed
                  ? 'bg-sky-500/30 text-sky-300 font-semibold'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>

        {/* Voice Selector Dropdown */}
        {voices.length > 0 && (
          <select
            value={selectedVoice}
            onChange={(e) => {
              setSelectedVoice(e.target.value);
              if (isPlaying && !isPaused) playSentence(currentSentenceIndex);
            }}
            className="hidden md:block bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 text-xs rounded-xl px-2 py-1 max-w-[130px] truncate focus:outline-none"
            title="Select Voice"
          >
            {voices.map((v) => (
              <option key={v.name} value={v.name} className="bg-[#0e1219] text-white text-xs">
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
        )}

        {/* Close Bar */}
        <button
          type="button"
          onClick={() => {
            stopSpeech();
            onClose();
          }}
          title="Close TTS Audio Bar"
          className="p-1.5 rounded-xl hover:bg-white/10 text-white/50 hover:text-white transition-colors ml-1"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
};
