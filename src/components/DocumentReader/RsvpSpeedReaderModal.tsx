import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Rewind,
  X,
  Gauge,
  Sliders,
  Check,
} from 'lucide-react';

interface RsvpSpeedReaderModalProps {
  isOpen: boolean;
  text: string;
  documentTitle?: string;
  onClose: () => void;
}

export const RsvpSpeedReaderModal: React.FC<RsvpSpeedReaderModalProps> = ({
  isOpen,
  text,
  documentTitle,
  onClose,
}) => {
  const [words, setWords] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [wpm, setWpm] = useState<number>(350);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Parse text into words
  useEffect(() => {
    if (!text) {
      setWords([]);
      return;
    }
    const parsed = text
      .trim()
      .split(/\s+/)
      .map((w) => w.trim())
      .filter((w) => w.length > 0);
    setWords(parsed);
    setCurrentIndex(0);
    setIsPlaying(false);
  }, [text, isOpen]);

  // Handle Playback Interval
  useEffect(() => {
    if (!isPlaying || words.length === 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const currentWord = words[currentIndex] || '';
    // Pause slightly longer on sentence-ending punctuation for natural comprehension
    const isPunctuation = /[.?!؟;:]$/.test(currentWord);
    const delayMs = Math.round((60000 / wpm) * (isPunctuation ? 1.7 : 1.0));

    timerRef.current = setTimeout(() => {
      if (currentIndex < words.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        setIsPlaying(false);
      }
    }, delayMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, currentIndex, words, wpm]);

  // Keyboard shortcuts (Space to toggle, arrows to step, Esc to close)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        setCurrentIndex((prev) => Math.max(0, prev - 10));
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        setCurrentIndex((prev) => Math.min(words.length - 1, prev + 10));
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, words.length, onClose]);

  if (!isOpen) return null;

  const currentWord = words[currentIndex] || '';

  // Calculate Optical Recognition Point (ORP) - the optimal eye fixation index
  const getOrpComponents = (word: string) => {
    if (!word) return { left: '', pivot: '', right: '' };
    const len = word.length;
    let pivotIndex = 0;
    if (len === 1) pivotIndex = 0;
    else if (len <= 5) pivotIndex = 1;
    else if (len <= 9) pivotIndex = 2;
    else if (len <= 13) pivotIndex = 3;
    else pivotIndex = 4;

    return {
      left: word.substring(0, pivotIndex),
      pivot: word[pivotIndex] || '',
      right: word.substring(pivotIndex + 1),
    };
  };

  const { left, pivot, right } = getOrpComponents(currentWord);
  const wordsLeft = words.length - currentIndex;
  const minutesLeft = Math.ceil(wordsLeft / wpm);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md animate-in fade-in duration-200 select-none p-4">
      <div className="w-full max-w-2xl rounded-3xl bg-[#0e1219] border border-white/15 shadow-2xl shadow-black/80 flex flex-col overflow-hidden text-white">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Gauge size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white/90">
                RSVP Speed Reader
              </h3>
              <p className="text-[11px] text-white/50 truncate max-w-[280px]">
                {documentTitle || 'Speed reading mode'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-white/40">
              ~{minutesLeft} min left ({words.length} words)
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Speed Reading Presentation Chamber */}
        <div className="relative h-64 flex flex-col items-center justify-center bg-radial-gradient from-white/[0.03] to-transparent px-8">
          {/* Centered Guide Hairlines */}
          <div className="absolute top-12 left-1/2 -translate-x-1/2 w-8 h-1 bg-white/20 rounded-full" />
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-8 h-1 bg-white/20 rounded-full" />

          {/* Focal Word Display */}
          <div className="flex items-center justify-center text-4xl sm:text-5xl font-mono tracking-wide font-medium">
            <span className="text-white/70 text-right w-44">{left}</span>
            <span className="text-amber-400 font-bold px-0.5">{pivot}</span>
            <span className="text-white/70 text-left w-44">{right}</span>
          </div>

          {/* Context Snippet (faded around word) */}
          <p className="absolute bottom-4 text-xs text-white/30 font-mono max-w-lg truncate text-center">
            {words.slice(Math.max(0, currentIndex - 3), currentIndex).join(' ')}{' '}
            <span className="text-white/70 font-semibold">{currentWord}</span>{' '}
            {words.slice(currentIndex + 1, currentIndex + 4).join(' ')}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-white/5 h-1.5 relative overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-sky-500 to-blue-500 transition-all duration-100"
            style={{
              width: `${words.length > 0 ? (currentIndex / words.length) * 100 : 0}%`,
            }}
          />
        </div>

        {/* Controls Footer */}
        <div className="px-6 py-4 bg-white/[0.02] border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Step & Play Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 10))}
              title="Back 10 words (Left Arrow)"
              className="p-2 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            >
              <Rewind size={16} />
            </button>

            <button
              type="button"
              onClick={() => setIsPlaying((p) => !p)}
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-medium shadow-lg shadow-sky-500/25 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} className="translate-x-0.5" />}
              <span>{isPlaying ? 'Pause' : 'Start'}</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentIndex((prev) => Math.min(words.length - 1, prev + 10))}
              title="Forward 10 words (Right Arrow)"
              className="p-2 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            >
              <FastForward size={16} />
            </button>

            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                setCurrentIndex(0);
              }}
              title="Restart"
              className="p-2 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition-colors ml-1"
            >
              <RotateCcw size={15} />
            </button>
          </div>

          {/* Speed Presets */}
          <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-2xl border border-white/10">
            {[250, 350, 450, 600].map((speed) => (
              <button
                key={speed}
                type="button"
                onClick={() => setWpm(speed)}
                className={`px-2.5 py-1 rounded-xl text-xs font-mono font-medium transition-colors ${
                  wpm === speed
                    ? 'bg-sky-500/30 text-sky-300 font-bold border border-sky-500/40'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {speed} WPM
              </button>
            ))}
          </div>

          {/* Word Counter */}
          <div className="text-xs font-mono text-white/50">
            {currentIndex + 1} / {words.length || 1}
          </div>
        </div>
      </div>
    </div>
  );
};
