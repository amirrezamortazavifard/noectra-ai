import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Brain, Compass, Cpu } from 'lucide-react';

interface SplashScreenProps {
  onAnimationComplete?: () => void;
  isReady?: boolean;
}

const statusMessages = [
  { icon: Cpu, text: 'Initializing neural core & runtime...' },
  { icon: Compass, text: 'Connecting resilient web search engine...' },
  { icon: Brain, text: 'Preparing intelligent research workspace...' },
  { icon: Sparkles, text: 'Welcome to Noectra AI' },
];

export default function SplashScreen({ isReady = false }: SplashScreenProps) {
  const [currentStatusIndex, setCurrentStatusIndex] = useState(0);
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    const statusInterval = setInterval(() => {
      setCurrentStatusIndex((prev) => {
        if (prev < statusMessages.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 700);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (isReady) return 100;
        if (prev < 90) {
          return prev + Math.floor(Math.random() * 8 + 4);
        }
        return prev;
      });
    }, 120);

    return () => {
      clearInterval(statusInterval);
      clearInterval(progressInterval);
    };
  }, [isReady]);

  useEffect(() => {
    if (isReady) {
      setProgress(100);
      setCurrentStatusIndex(statusMessages.length - 1);
    }
  }, [isReady]);

  const CurrentIcon = statusMessages[currentStatusIndex].icon;

  // Generate fixed background star coordinates for a celestial aesthetic
  const ambientParticles = [
    { top: '15%', left: '20%', size: 3, delay: 0 },
    { top: '25%', left: '75%', size: 4, delay: 0.8 },
    { top: '65%', left: '15%', size: 2.5, delay: 1.2 },
    { top: '75%', left: '80%', size: 3.5, delay: 0.4 },
    { top: '40%', left: '85%', size: 2, delay: 1.6 },
    { top: '80%', left: '35%', size: 3, delay: 1.0 },
    { top: '20%', left: '45%', size: 2.5, delay: 1.4 },
    { top: '55%', left: '60%', size: 3, delay: 0.6 },
  ];

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.03, filter: 'blur(6px)' }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#07090e] text-white overflow-hidden select-none"
    >
      {/* Dynamic Ambient Aurora Lights */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.18, 0.28, 0.18],
            x: [-20, 20, -20],
            y: [-15, 15, -15],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-[20%] -left-[15%] w-[550px] h-[550px] rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-600/10 blur-[130px]"
        />
        <motion.div
          animate={{
            scale: [1.1, 0.95, 1.1],
            opacity: [0.15, 0.26, 0.15],
            x: [25, -25, 25],
            y: [20, -20, 20],
          }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute -bottom-[20%] -right-[15%] w-[600px] h-[600px] rounded-full bg-gradient-to-tl from-indigo-600/30 to-purple-600/10 blur-[140px]"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.06)_0%,transparent_70%)]" />
      </div>

      {/* Floating Ambient Star Dust */}
      {ambientParticles.map((pt, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0.2, scale: 0.8 }}
          animate={{
            opacity: [0.2, 0.8, 0.2],
            scale: [0.8, 1.2, 0.8],
            y: [-10, 10, -10],
          }}
          transition={{
            duration: 4 + i,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: pt.delay,
          }}
          style={{
            top: pt.top,
            left: pt.left,
            width: `${pt.size}px`,
            height: `${pt.size}px`,
          }}
          className="absolute rounded-full bg-cyan-200/60 blur-[0.5px] pointer-events-none"
        />
      ))}

      {/* Central Visual Showcase: Holographic AI Prism & Orbitals */}
      <div className="relative flex items-center justify-center mb-10">
        {/* Deep Aura Glow Behind Core */}
        <motion.div
          animate={{
            scale: [0.95, 1.15, 0.95],
            opacity: [0.4, 0.7, 0.4],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute w-44 h-44 rounded-full bg-gradient-to-tr from-cyan-500/30 via-indigo-500/25 to-purple-500/20 blur-3xl"
        />

        {/* Outer Orbital Ring 1 (Rotating Clockwise) */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
          className="absolute w-36 h-36 rounded-full border border-cyan-500/20 border-t-cyan-400/80 border-r-indigo-400/40"
        />

        {/* Outer Orbital Particle */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
          className="absolute w-36 h-36 rounded-full pointer-events-none"
        >
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-300 shadow-[0_0_12px_#38bdf8] -top-1 left-1/2 -translate-x-1/2 absolute" />
        </motion.div>

        {/* Inner Orbital Ring 2 (Rotating Counter-Clockwise) */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
          className="absolute w-28 h-28 rounded-full border border-dashed border-indigo-400/30 border-b-purple-400/70"
        />

        {/* Center Glass Sphere / Core Shield */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-white/10 via-white/5 to-white/0 backdrop-blur-xl border border-white/15 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] flex items-center justify-center overflow-hidden group"
        >
          {/* Inner Light Sweep Effect */}
          <motion.div
            animate={{
              x: ['-100%', '200%'],
            }}
            transition={{
              duration: 2.4,
              repeat: Infinity,
              ease: 'easeInOut',
              repeatDelay: 1,
            }}
            className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 pointer-events-none"
          />

          {/* Central Animated Prism Icon */}
          <motion.div
            animate={{
              scale: [1, 1.08, 1],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="relative flex items-center justify-center"
          >
            <div className="absolute inset-0 bg-cyan-400/20 rounded-full blur-md" />
            <Sparkles className="w-9 h-9 text-cyan-300 drop-shadow-[0_0_14px_rgba(56,189,248,0.8)]" />
          </motion.div>
        </motion.div>
      </div>

      {/* Typography: Brand Title & Tagline */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.15 }}
        className="flex flex-col items-center text-center space-y-1.5 z-10"
      >
        <div className="relative">
          <h1 className="text-2xl font-bold tracking-[0.25em] uppercase bg-clip-text text-transparent bg-gradient-to-r from-white via-cyan-100 to-indigo-200 drop-shadow-[0_2px_12px_rgba(255,255,255,0.15)]">
            Noectra AI
          </h1>
        </div>
        <p className="text-[11px] font-light tracking-[0.2em] text-cyan-200/60 uppercase">
          The Spectrum of Intellect
        </p>
      </motion.div>

      {/* Modern Progress Bar & Status Stepper */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.3 }}
        className="w-72 mt-8 flex flex-col items-center space-y-3 z-10"
      >
        {/* Progress Track */}
        <div className="w-full h-1.5 bg-white/5 rounded-full p-[1px] border border-white/10 overflow-hidden relative backdrop-blur-sm">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-sky-400 to-indigo-500 shadow-[0_0_12px_rgba(56,189,248,0.6)]"
            style={{ width: `${Math.min(progress, 100)}%` }}
            transition={{ ease: 'easeOut', duration: 0.2 }}
          />
        </div>

        {/* Live Status Message & Percentage */}
        <div className="w-full flex items-center justify-between text-[11px] text-white/50 px-1 font-mono">
          <motion.div
            key={currentStatusIndex}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-1.5 text-cyan-200/70 truncate max-w-[200px]"
          >
            <CurrentIcon className="w-3.5 h-3.5 text-cyan-400 animate-pulse flex-shrink-0" />
            <span className="truncate">{statusMessages[currentStatusIndex].text}</span>
          </motion.div>

          <span className="text-cyan-400/80 font-semibold tracking-wider flex-shrink-0 ml-2">
            {Math.min(progress, 100)}%
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}
