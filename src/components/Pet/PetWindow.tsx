import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { listen } from '@tauri-apps/api/event';

export default function PetWindow() {
  const [mood, setMood] = useState<'idle' | 'happy' | 'thinking' | 'sleeping'>('idle');

  useEffect(() => {
    // Listen for pet mood changes from the main window via Tauri events
    let unlisten: (() => void) | undefined;
    listen<{ mood: 'idle' | 'happy' | 'thinking' | 'sleeping' }>('pet-state-update', (event) => {
      if (event.payload?.mood) {
        setMood(event.payload.mood);
      }
    }).then(dispose => {
      unlisten = dispose;
    }).catch(console.error);

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const getEmoji = () => {
    switch (mood) {
      case 'happy': return '😸';
      case 'thinking': return '🤔';
      case 'sleeping': return '💤';
      default: return '🐾';
    }
  };

  const getAnimation = () => {
    switch (mood) {
      case 'happy': return { y: [0, -10, 0], rotate: [0, 10, -10, 0] };
      case 'thinking': return { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] };
      case 'sleeping': return { scale: [1, 0.95, 1], opacity: [1, 0.7, 1] };
      default: return { y: [0, -5, 0] };
    }
  };

  return (
    <div 
      data-tauri-drag-region 
      className="w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing"
    >
      <motion.div
        animate={getAnimation()}
        transition={{
          duration: mood === 'idle' ? 2 : 1,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="w-[120px] h-[120px] rounded-full bg-light-primary/80 dark:bg-dark-primary/80 backdrop-blur-md border-2 border-sky-500 shadow-[0_0_15px_rgba(14,165,233,0.5)] flex items-center justify-center text-6xl shadow-sky-500/50 pointer-events-none select-none"
      >
        {getEmoji()}
      </motion.div>
    </div>
  );
}
