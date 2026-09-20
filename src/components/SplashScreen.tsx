import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { soundService } from '@/lib/sound/soundService';

interface SplashScreenProps {
  onAnimationComplete?: () => void;
  isReady?: boolean;
}

export default function SplashScreen({ isReady = false, onAnimationComplete }: SplashScreenProps) {
  const [isSynthesized, setIsSynthesized] = useState(false);
  const soundPlayedRef = useRef(false);

  useEffect(() => {
    // Transition to synthesized/ready state smoothly after 800ms
    const timer = setTimeout(() => {
      setIsSynthesized(true);
      if (!soundPlayedRef.current) {
        soundPlayedRef.current = true;
        soundService.play('startup');
      }
    }, 850);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isReady && !soundPlayedRef.current) {
      soundPlayedRef.current = true;
      soundService.play('startup');
    }
  }, [isReady]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{
        opacity: 0,
        scale: 1.025,
        filter: 'blur(10px)',
        transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
      }}
      onAnimationComplete={onAnimationComplete}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-50 dark:bg-[#07090e] text-slate-900 dark:text-white overflow-hidden select-none transition-colors duration-700"
    >
      {/* Soft Ambient Background Auras (Calm & Serene, Zero Clutter) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.12, 0.22, 0.12],
          }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full bg-cyan-400/20 dark:bg-cyan-500/15 blur-[120px]"
        />
        <motion.div
          animate={{
            scale: [1.1, 0.95, 1.1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute -bottom-32 -right-32 w-[560px] h-[560px] rounded-full bg-indigo-400/20 dark:bg-indigo-600/15 blur-[130px]"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.04)_0%,transparent_75%)] dark:bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.05)_0%,transparent_75%)]" />
      </div>

      {/* Central Visual: Living Breathing Emblem (ضربان ملایم و تنفس ارگانیک) */}
      <div className="relative flex items-center justify-center mb-7 z-10">
        {/* Outer Radiant Respiration Glow */}
        <motion.div
          animate={{
            scale: [1, 1.28, 1],
            opacity: [0.25, 0.6, 0.25],
          }}
          transition={{
            duration: 2.4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute w-56 h-56 rounded-full bg-gradient-to-tr from-cyan-400/30 via-sky-400/25 to-indigo-500/30 dark:from-cyan-500/30 dark:via-sky-500/20 dark:to-indigo-600/30 blur-3xl pointer-events-none"
        />

        {/* Inner Heartbeat Wave */}
        <motion.div
          animate={{
            scale: [0.95, 1.1, 0.95],
            opacity: [0.35, 0.75, 0.35],
          }}
          transition={{
            duration: 2.0,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute w-36 h-36 rounded-full bg-cyan-400/25 dark:bg-cyan-400/20 blur-xl pointer-events-none"
        />

        {/* Glassmorphic Brand Container with Micro-Breath */}
        <motion.div
          animate={{
            scale: [1, 1.035, 1],
          }}
          transition={{
            duration: 2.0,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-3xl p-1.5 bg-white/80 dark:bg-white/[0.08] backdrop-blur-2xl border border-slate-200/80 dark:border-white/15 shadow-[0_12px_36px_rgba(0,0,0,0.06)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.55)] flex items-center justify-center overflow-hidden"
        >
          {/* Subtle Ambient Sheen */}
          <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 via-transparent to-indigo-500/10 pointer-events-none" />

          {/* Official Application Brand Icon */}
          <img
            src="/icon.png"
            alt="Noectra AI"
            className="w-full h-full object-cover rounded-2xl select-none pointer-events-none shadow-sm"
          />
        </motion.div>
      </div>

      {/* Brand Identity & Typography */}
      <div className="flex flex-col items-center text-center space-y-2 z-10">
        <h1 className="text-xl sm:text-2xl font-medium tracking-[0.3em] uppercase text-slate-900 dark:text-white/95">
          Noectra AI
        </h1>
        <p className="text-[11px] font-light tracking-[0.25em] uppercase text-cyan-700/80 dark:text-cyan-300/70">
          The Spectrum of Intellect
        </p>
      </div>

      {/* Minimalist Zen Breathing Line (Calm Rhythm, No Mechanical Spinners) */}
      <div className="mt-7 relative w-36 sm:w-44 h-[2px] rounded-full overflow-hidden bg-slate-200/80 dark:bg-white/10 z-10">
        <motion.div
          animate={{
            x: ['-100%', '100%'],
            opacity: [0.3, 0.9, 0.3],
          }}
          transition={{
            duration: 2.0,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="w-1/2 h-full rounded-full bg-gradient-to-r from-transparent via-cyan-500 dark:via-cyan-400 to-transparent"
        />
      </div>

      {/* Subtle Living Status Indicator */}
      <div className="mt-4 min-h-[20px] flex items-center justify-center z-10">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-1.5 text-[11px] font-normal tracking-wider text-slate-500 dark:text-slate-400"
        >
          <motion.span
            animate={{
              opacity: [0.4, 1, 0.4],
              scale: [0.85, 1.15, 0.85],
            }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className={`w-1.5 h-1.5 rounded-full ${
              isSynthesized ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-cyan-400 shadow-[0_0_8px_#38bdf8]'
            }`}
          />
          <span>{isSynthesized ? 'Workspace Ready' : 'Initializing Workspace'}</span>
        </motion.div>
      </div>
    </motion.div>
  );
}
