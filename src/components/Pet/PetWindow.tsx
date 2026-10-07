import React, { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Moon,
  Sun,
  Minimize2,
  Maximize2,
  EyeOff,
  X,
  Compass,
} from 'lucide-react';

export default function PetWindow() {
  const [mood, setMood] = useState<'idle' | 'happy' | 'thinking' | 'sleeping'>('idle');
  const [isMini, setIsMini] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // Enforce true 100% transparent window background (remove any white body artifact)
  useEffect(() => {
    const enforceTransparent = () => {
      document.documentElement.style.backgroundColor = 'transparent';
      document.documentElement.style.background = 'transparent';
      document.body.style.backgroundColor = 'transparent';
      document.body.style.background = 'transparent';
      document.body.classList.remove('bg-white');
      document.body.classList.add('bg-transparent');
    };

    enforceTransparent();
    const interval = setInterval(enforceTransparent, 300);
    return () => clearInterval(interval);
  }, []);

  // Listen to live AI thought updates from useChat
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    listen<{ mood: 'idle' | 'happy' | 'thinking' | 'sleeping' }>('pet-state-update', (event) => {
      if (event.payload?.mood) {
        setMood(event.payload.mood);
      }
    })
      .then((dispose) => {
        unlisten = dispose;
      })
      .catch(console.error);

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const getSvgPath = () => {
    if (isMini) {
      switch (mood) {
        case 'happy':
          return '/pets/clawd/assets/clawd-mini-happy.svg';
        case 'thinking':
          return '/pets/clawd/assets/clawd-mini-typing.svg';
        case 'sleeping':
          return '/pets/clawd/assets/clawd-mini-sleep.svg';
        default:
          return '/pets/clawd/assets/clawd-mini-idle.svg';
      }
    }

    switch (mood) {
      case 'happy':
        return '/pets/clawd/assets/clawd-happy.svg';
      case 'thinking':
        return '/pets/clawd/assets/clawd-working-thinking.svg';
      case 'sleeping':
        return '/pets/clawd/assets/clawd-sleeping.svg';
      default:
        return '/pets/clawd/assets/clawd-idle-living.svg';
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Left-click initiates native OS window dragging
    if (e.button === 0) {
      if (showMenu) setShowMenu(false);
      invoke('start_drag_pet').catch(() => {
        // Fallback to window plugin if available
        import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
          getCurrentWindow().startDragging();
        }).catch(() => {});
      });
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMenu(true);
  };

  const handleHide = () => {
    setShowMenu(false);
    invoke('hide_pet_window').catch(() => {
      import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
        getCurrentWindow().hide();
      }).catch(() => {});
    });
  };

  const circleSizeClass = isMini ? 'w-28 h-28' : 'w-48 h-48';
  const assetSize = isMini ? 70 : 130;

  return (
    <div
      data-tauri-drag-region
      onMouseDown={handleMouseDown}
      onContextMenu={handleContextMenu}
      className="w-full h-full min-h-screen flex items-center justify-center cursor-grab active:cursor-grabbing bg-transparent select-none overflow-hidden relative"
      style={{ background: 'transparent' }}
    >
      {/* =========================================================================
          THE LUXURY CIRCULAR PET ORB (Soft borders, ambient aura, frosted glass)
         ========================================================================= */}
      <div className={`relative flex items-center justify-center ${circleSizeClass} transition-all duration-300 pointer-events-auto`}>
        {/* Soft Ambient Radial Glow / Halo */}
        <div className="absolute -inset-2 rounded-full bg-gradient-to-tr from-cyan-500/25 via-violet-500/15 to-amber-500/15 blur-xl opacity-75 animate-pulse pointer-events-none" />

        {/* Outer Frosted Glass Ring with Soft Border */}
        <div className="absolute inset-0 rounded-full border-2 border-white/40 dark:border-white/15 bg-gradient-to-b from-white/80 via-white/50 to-white/20 dark:from-[#111827]/85 dark:via-[#0c1017]/85 dark:to-[#07090e]/95 backdrop-blur-2xl shadow-[0_12px_36px_rgba(0,0,0,0.18)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.8)] flex items-center justify-center overflow-hidden transition-all duration-300">
          {/* Subtle Inner Highlight */}
          <div className="absolute inset-0 rounded-full shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)] dark:shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)] pointer-events-none" />

          {/* Status Aura Dot */}
          <div
            className={`absolute top-2 w-2 h-2 rounded-full transition-all duration-300 ${
              mood === 'thinking'
                ? 'bg-cyan-400 shadow-[0_0_8px_#38bdf8] animate-ping'
                : mood === 'sleeping'
                ? 'bg-violet-400 shadow-[0_0_6px_#a78bfa]'
                : mood === 'happy'
                ? 'bg-amber-400 shadow-[0_0_6px_#fbbf24]'
                : 'bg-emerald-400 shadow-[0_0_6px_#34d399]'
            }`}
          />

          {/* Pedestal Shadow for Clawd */}
          <div className="absolute bottom-4 w-20 h-3 rounded-full bg-black/10 dark:bg-black/40 blur-xs pointer-events-none" />

          {/* Clawd SVG Animation Asset */}
          <div
            className="flex items-center justify-center pointer-events-none transition-transform duration-300"
            style={{ width: `${assetSize}px`, height: `${assetSize}px` }}
          >
            <object
              data={getSvgPath()}
              type="image/svg+xml"
              style={{
                width: `${assetSize}px`,
                height: `${assetSize}px`,
                pointerEvents: 'none',
              }}
              aria-label="Noectra Desktop Pet"
            />
          </div>
        </div>
      </div>

      {/* =========================================================================
          RIGHT-CLICK CONTEXT MENU (Clamped & Perfectly Centered inside the Window)
         ========================================================================= */}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 5 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            onMouseDown={(e) => e.stopPropagation()}
            className="absolute z-50 w-[210px] p-2 rounded-2xl bg-white/90 dark:bg-[#0c1017]/95 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-[0_16px_48px_rgba(0,0,0,0.35)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.9)] flex flex-col gap-1 text-slate-800 dark:text-white"
          >
            {/* Header with Title & Close Button */}
            <div className="flex items-center justify-between px-2.5 py-1 mb-1 border-b border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Compass className="w-3.5 h-3.5 text-cyan-500" />
                <span>Noectra Pet</span>
              </div>
              <button
                onClick={() => setShowMenu(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Toggle Size (Mini / Standard) */}
            <button
              onClick={() => {
                setIsMini(!isMini);
                setShowMenu(false);
              }}
              className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-medium hover:bg-slate-100 dark:hover:bg-white/10 transition-colors text-left"
            >
              {isMini ? <Maximize2 className="w-3.5 h-3.5 text-cyan-500" /> : <Minimize2 className="w-3.5 h-3.5 text-cyan-500" />}
              <span>{isMini ? 'Standard Size' : 'Compact Mini Size'}</span>
            </button>

            {/* Toggle Sleep / Wake */}
            <button
              onClick={() => {
                setMood(mood === 'sleeping' ? 'idle' : 'sleeping');
                setShowMenu(false);
              }}
              className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-medium hover:bg-slate-100 dark:hover:bg-white/10 transition-colors text-left"
            >
              {mood === 'sleeping' ? <Sun className="w-3.5 h-3.5 text-amber-500" /> : <Moon className="w-3.5 h-3.5 text-violet-500" />}
              <span>{mood === 'sleeping' ? 'Wake Up (Idle)' : 'Put to Sleep'}</span>
            </button>

            {/* Cheer Up / Happy */}
            <button
              onClick={() => {
                setMood('happy');
                setShowMenu(false);
              }}
              className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-medium hover:bg-slate-100 dark:hover:bg-white/10 transition-colors text-left"
            >
              <Sparkles className="w-3.5 h-3.5 text-fuchsia-500" />
              <span>Cheer Up (Happy)</span>
            </button>

            <div className="h-px bg-slate-100 dark:bg-white/10 my-1 mx-1" />

            {/* Hide Pet */}
            <button
              onClick={handleHide}
              className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors text-left"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>Hide Desktop Pet</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
