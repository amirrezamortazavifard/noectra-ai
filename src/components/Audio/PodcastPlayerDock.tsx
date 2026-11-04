'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAudioPlayer } from '@/context/AudioPlayerContext';
import { cn } from '@/lib/utils';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  X,
  ChevronDown,
  ChevronUp,
  Headphones,
  Moon,
  Gauge,
  Radio,
} from 'lucide-react';

function formatSeconds(sec: number): string {
  if (isNaN(sec) || sec < 0) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

export const PodcastPlayerDock: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    volume,
    isMuted,
    isDockOpen,
    isMinimized,
    sleepRemainingSeconds,
    togglePlay,
    seekTo,
    skipBy,
    setPlaybackRate,
    setVolume,
    toggleMute,
    setSleepTimer,
    setIsMinimized,
    closePlayer,
  } = useAudioPlayer();

  const [isSpeedOpen, setIsSpeedOpen] = useState(false);
  const [isSleepOpen, setIsSleepOpen] = useState(false);

  const speedMenuRef = useRef<HTMLDivElement | null>(null);
  const sleepMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (speedMenuRef.current && !speedMenuRef.current.contains(e.target as Node)) {
        setIsSpeedOpen(false);
      }
      if (sleepMenuRef.current && !sleepMenuRef.current.contains(e.target as Node)) {
        setIsSleepOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isDockOpen || !currentTrack) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Minimized Floating Pill View
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
        <div className="flex items-center gap-3 p-2 pr-3.5 rounded-full bg-slate-900/95 dark:bg-[#0c101a]/95 text-white border border-cyan-500/40 shadow-2xl backdrop-blur-xl">
          <button
            type="button"
            onClick={togglePlay}
            className="w-8 h-8 rounded-full bg-cyan-500 hover:bg-cyan-400 text-black flex items-center justify-center transition-all flex-shrink-0"
          >
            {isPlaying ? <Pause size={14} className="fill-current" /> : <Play size={14} className="fill-current ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            className="flex items-center gap-2 max-w-[200px] text-left truncate cursor-pointer"
          >
            <Headphones size={14} className="text-cyan-400 flex-shrink-0" />
            <span className="text-xs font-semibold truncate">{currentTrack.title}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            className="text-slate-400 hover:text-white p-1"
            title="Expand player"
          >
            <ChevronUp size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4 max-w-5xl mx-auto pointer-events-none select-none">
      <div className="relative pointer-events-auto flex flex-col gap-2 p-3 sm:p-4 rounded-3xl bg-white/95 dark:bg-[#0c101a]/95 border border-slate-200/90 dark:border-white/15 shadow-2xl backdrop-blur-2xl text-slate-900 dark:text-white transition-all animate-in fade-in slide-in-from-bottom-4 duration-200">
        {/* Top Scrubber Bar */}
        <div className="flex items-center gap-3 w-full">
          <span className="text-[11px] font-mono text-slate-400 w-10 text-right">
            {formatSeconds(currentTime)}
          </span>

          <div className="relative flex-1 group cursor-pointer py-1">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={(e) => seekTo(parseFloat(e.target.value))}
              className="w-full h-1.5 rounded-lg appearance-none bg-slate-200 dark:bg-white/10 accent-cyan-500 cursor-pointer focus:outline-none"
            />
          </div>

          <span className="text-[11px] font-mono text-slate-400 w-10">
            {formatSeconds(duration)}
          </span>
        </div>

        {/* Main Controls Row */}
        <div className="flex items-center justify-between gap-4">
          {/* Left: Track Information */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-violet-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0 text-cyan-600 dark:text-cyan-400 shadow-sm overflow-hidden">
              {currentTrack.imageUrl ? (
                <img
                  src={currentTrack.imageUrl}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Radio size={20} className="animate-pulse" />
              )}
            </div>

            <div className="flex flex-col min-w-0">
              <span className="text-xs sm:text-sm font-bold truncate text-slate-900 dark:text-white">
                {currentTrack.title}
              </span>
              <span className="text-[11px] text-cyan-600 dark:text-cyan-400 font-medium truncate flex items-center gap-1.5">
                <Headphones size={11} />
                <span>{currentTrack.source}</span>
                {sleepRemainingSeconds !== null && (
                  <span className="text-amber-500 font-mono text-[10px]">
                    • 🌙 {Math.ceil(sleepRemainingSeconds / 60)}m left
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Center: Playback Transport Buttons */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Skip Back 15s */}
            <button
              type="button"
              onClick={() => skipBy(-15)}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              title="Jump back 15s"
            >
              <RotateCcw size={16} />
            </button>

            {/* Play / Pause Primary Button */}
            <button
              type="button"
              onClick={togglePlay}
              className="w-11 h-11 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all"
            >
              {isPlaying ? (
                <Pause size={18} className="fill-current" />
              ) : (
                <Play size={18} className="fill-current ml-0.5" />
              )}
            </button>

            {/* Skip Forward 30s */}
            <button
              type="button"
              onClick={() => skipBy(30)}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              title="Jump forward 30s"
            >
              <RotateCw size={16} />
            </button>
          </div>

          {/* Right: Rate, Sleep, Volume & Dock Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* Playback Rate Dropdown */}
            <div ref={speedMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setIsSpeedOpen((p) => !p)}
                className="px-2 py-1 rounded-xl bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 transition-colors"
                title="Playback Speed"
              >
                {playbackRate}x
              </button>

              {isSpeedOpen && (
                <div className="absolute right-0 bottom-full mb-2 w-24 p-1 rounded-2xl bg-white dark:bg-[#121622] border border-slate-200 dark:border-white/10 shadow-xl z-50 animate-in fade-in zoom-in-95">
                  {[0.75, 1.0, 1.25, 1.5, 2.0].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => {
                        setPlaybackRate(rate);
                        setIsSpeedOpen(false);
                      }}
                      className={cn(
                        'w-full px-2.5 py-1 text-xs text-left rounded-lg transition-colors font-mono',
                        playbackRate === rate
                          ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 font-bold'
                          : 'hover:bg-black/5 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400'
                      )}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Sleep Timer */}
            <div ref={sleepMenuRef} className="relative hidden sm:block">
              <button
                type="button"
                onClick={() => setIsSleepOpen((p) => !p)}
                className={cn(
                  'p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors',
                  sleepRemainingSeconds !== null && 'text-amber-500'
                )}
                title="Sleep Timer"
              >
                <Moon size={15} />
              </button>

              {isSleepOpen && (
                <div className="absolute right-0 bottom-full mb-2 w-32 p-1 rounded-2xl bg-white dark:bg-[#121622] border border-slate-200 dark:border-white/10 shadow-xl z-50 animate-in fade-in zoom-in-95">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 px-2 py-1 block">
                    Sleep Timer
                  </span>
                  {[null, 15, 30, 45, 60].map((mins) => (
                    <button
                      key={mins ?? 0}
                      type="button"
                      onClick={() => {
                        setSleepTimer(mins);
                        setIsSleepOpen(false);
                      }}
                      className={cn(
                        'w-full px-2.5 py-1 text-xs text-left rounded-lg transition-colors font-medium',
                        sleepRemainingSeconds !== null && Math.ceil(sleepRemainingSeconds / 60) === mins
                          ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 font-bold'
                          : 'hover:bg-black/5 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400'
                      )}
                    >
                      {mins ? `${mins} minutes` : 'Turn Off'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Volume Slider */}
            <div className="hidden md:flex items-center gap-1.5 pl-1">
              <button
                type="button"
                onClick={toggleMute}
                className="text-slate-500 hover:text-black dark:hover:text-white transition-colors"
              >
                {isMuted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-16 h-1 rounded-lg appearance-none bg-slate-200 dark:bg-white/10 accent-cyan-500 cursor-pointer"
              />
            </div>

            {/* Minimize to Pill */}
            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              className="p-2 rounded-xl text-slate-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              title="Minimize player"
            >
              <ChevronDown size={16} />
            </button>

            {/* Close Audio Player */}
            <button
              type="button"
              onClick={closePlayer}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
              title="Close Player"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PodcastPlayerDock;
