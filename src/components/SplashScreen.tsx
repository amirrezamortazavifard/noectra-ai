import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { soundService } from '@/lib/sound/soundService';

interface SplashScreenProps {
  onAnimationComplete?: () => void;
  isReady?: boolean;
}

interface PhaseMessage {
  title: string;
  subtitle?: string;
}

const PHASES: PhaseMessage[] = [
  {
    title: 'Hi',
    subtitle: 'Welcome to your intelligent workspace',
  },
  {
    title: 'Getting things ready for you...',
    subtitle: 'Calibrating neural engine & local environment',
  },
  {
    title: 'Almost there...',
    subtitle: 'Preparing research canvas',
  },
];

export default function SplashScreen({ isReady = false, onAnimationComplete }: SplashScreenProps) {
  const [currentPhase, setCurrentPhase] = useState(0);
  const startupPlayedRef = useRef(false);

  useEffect(() => {
    // Phase 0 -> Phase 1 after 750ms
    const t1 = setTimeout(() => {
      setCurrentPhase(1);
    }, 750);

    // Phase 1 -> Phase 2 after 1650ms
    const t2 = setTimeout(() => {
      setCurrentPhase(2);
      if (!startupPlayedRef.current) {
        startupPlayedRef.current = true;
        soundService.play('startup');
      }
    }, 1650);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // If external system signals ready late and sound hasn't played
  useEffect(() => {
    if (isReady && currentPhase === 2 && !startupPlayedRef.current) {
      startupPlayedRef.current = true;
      soundService.play('startup');
    }
  }, [isReady, currentPhase]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{
        opacity: 0,
        scale: 1.02,
        filter: 'blur(10px)',
        transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] },
      }}
      onAnimationComplete={onAnimationComplete}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-50 dark:bg-[#07090e] text-slate-900 dark:text-white overflow-hidden select-none transition-colors duration-700"
    >
      {/* Serene Ambient Glow Meshes (Dual-Theme Calibrated) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Top-left soft celestial glow */}
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.15, 0.25, 0.15],
            x: [-15, 15, -15],
            y: [-10, 10, -10],
          }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full bg-cyan-400/20 dark:bg-cyan-500/15 blur-[120px]"
        />

        {/* Bottom-right soft indigo glow */}
        <motion.div
          animate={{
            scale: [1.1, 0.95, 1.1],
            opacity: [0.12, 0.22, 0.12],
            x: [15, -15, 15],
            y: [10, -10, 10],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute -bottom-32 -right-32 w-[560px] h-[560px] rounded-full bg-indigo-400/20 dark:bg-indigo-600/15 blur-[130px]"
        />

        {/* Subtle radial focus vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.04)_0%,transparent_75%)] dark:bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.06)_0%,transparent_75%)]" />
      </div>

      {/* Centerpiece: Rhythmic Breathing Core (ضربان ملایم و ارگانیک) */}
      <div className="relative flex items-center justify-center mb-10 z-10">
        {/* Outermost rhythmic breathing halo */}
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{
            duration: 2.8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute w-56 h-56 rounded-full bg-gradient-to-tr from-cyan-400/30 via-sky-400/25 to-indigo-500/30 dark:from-cyan-500/25 dark:via-sky-500/20 dark:to-indigo-600/25 blur-3xl pointer-events-none"
        />

        {/* Inner subtle heartbeat pulse */}
        <motion.div
          animate={{
            scale: [0.96, 1.1, 0.96],
            opacity: [0.35, 0.7, 0.35],
          }}
          transition={{
            duration: 2.2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute w-36 h-36 rounded-full bg-cyan-400/25 dark:bg-cyan-400/20 blur-xl pointer-events-none"
        />

        {/* Floating Glassmorphic Emblem Container with gentle respiratory rhythm */}
        <motion.div
          animate={{
            scale: [1, 1.035, 1],
          }}
          transition={{
            duration: 2.2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-3xl p-1.5 bg-white/80 dark:bg-white/[0.07] backdrop-blur-2xl border border-slate-200/80 dark:border-white/15 shadow-[0_12px_36px_rgba(0,0,0,0.06)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.55)] flex items-center justify-center overflow-hidden"
        >
          {/* Subtle soft ambient sheen */}
          <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 via-transparent to-indigo-500/10 pointer-events-none" />

          {/* Real Application Brand Icon */}
          <img
            src="/icon.png"
            alt="Noectra AI"
            className="w-full h-full object-cover rounded-2xl select-none pointer-events-none shadow-sm"
          />
        </motion.div>
      </div>

      {/* Windows-Style Minimalist Typography Sequence ("Hi" -> "Getting things ready..." -> "Almost there...") */}
      <div className="min-h-[90px] flex items-center justify-center z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPhase}
            initial={{ opacity: 0, y: 8, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -8, filter: 'blur(6px)' }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center text-center px-6"
          >
            <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-slate-800 dark:text-white/95">
              {PHASES[currentPhase].title}
            </h1>
            {PHASES[currentPhase].subtitle && (
              <p className="mt-2 text-xs sm:text-sm font-normal text-slate-500 dark:text-slate-400/80 tracking-wide">
                {PHASES[currentPhase].subtitle}
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Minimalist Zen Breathing Line (Replaces noisy spinners and percentage numbers) */}
      <div className="mt-8 relative w-44 h-[2px] rounded-full overflow-hidden bg-slate-200/80 dark:bg-white/10 z-10">
        <motion.div
          animate={{
            x: ['-100%', '100%'],
            opacity: [0.3, 0.9, 0.3],
          }}
          transition={{
            duration: 2.2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="w-1/2 h-full rounded-full bg-gradient-to-r from-transparent via-cyan-500 dark:via-cyan-400 to-transparent"
        />
      </div>

      {/* Understated Bottom Watermark */}
      <div className="absolute bottom-8 flex flex-col items-center text-center space-y-1 opacity-40 hover:opacity-75 transition-opacity z-10 pointer-events-none">
        <span className="text-[10px] font-semibold tracking-[0.3em] uppercase text-slate-500 dark:text-slate-400">
          Noectra AI
        </span>
        <span className="text-[8.5px] tracking-[0.2em] uppercase text-slate-400 dark:text-slate-600">
          The Spectrum of Intellect
        </span>
      </div>
    </motion.div>
  );
}
