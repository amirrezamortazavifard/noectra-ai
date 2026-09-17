import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Brain, Compass, Cpu, CheckCircle2 } from 'lucide-react';
import { soundService } from '@/lib/sound/soundService';

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
  const [progress, setProgress] = useState(18);

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

  const startupPlayedRef = useRef(false);

  useEffect(() => {
    if (isReady || progress >= 100) {
      setProgress(100);
      setCurrentStatusIndex(statusMessages.length - 1);
      if (!startupPlayedRef.current) {
        startupPlayedRef.current = true;
        soundService.play('startup');
      }
    }
  }, [isReady, progress]);

  const CurrentIcon = statusMessages[currentStatusIndex].icon;

  // Circle Geometry
  const radius = 64;
  const circumference = 2 * Math.PI * radius; // ~402.12
  const currentProgress = Math.min(progress, 100);
  const strokeDashoffset = circumference - (currentProgress / 100) * circumference;
  const rotationAngle = (currentProgress / 100) * 360;

  // Fixed ambient star dust coordinates
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

      {/* Central Visual Showcase: Application Icon with Circular Loading Ring */}
      <div className="relative flex items-center justify-center mb-8">
        {/* Ambient Halo Glow */}
        <motion.div
          animate={{
            scale: currentProgress === 100 ? [1.1, 1.3, 1.2] : [0.95, 1.12, 0.95],
            opacity: currentProgress === 100 ? [0.6, 0.9, 0.7] : [0.35, 0.65, 0.35],
          }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute w-48 h-48 rounded-full bg-gradient-to-tr from-cyan-500/30 via-indigo-500/25 to-purple-500/25 blur-3xl pointer-events-none"
        />

        {/* Circular SVG Loading Line rotating around App Icon */}
        <div className="relative w-40 h-40 flex items-center justify-center">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 160 160">
            <defs>
              <linearGradient id="splash-progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="50%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#c084fc" />
              </linearGradient>
              <filter id="splash-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Subtle Circular Background Track */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth="3.5"
            />

            {/* Active Rotating / Drawing Progress Circle */}
            <motion.circle
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke="url(#splash-progress-gradient)"
              strokeWidth={currentProgress === 100 ? 4.5 : 4}
              strokeLinecap="round"
              strokeDasharray={circumference}
              animate={{ strokeDashoffset }}
              transition={{ ease: 'easeOut', duration: 0.2 }}
              filter="url(#splash-glow)"
              style={{
                transformOrigin: '80px 80px',
                transform: 'rotate(-90deg)',
              }}
            />
          </svg>

          {/* Rotating Orbital Spark at Leading Head of Progress Line */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              transform: `rotate(${rotationAngle - 90}deg)`,
              transformOrigin: 'center center',
              transition: 'transform 0.2s ease-out',
            }}
          >
            <div
              className="absolute w-3.5 h-3.5 rounded-full bg-white shadow-[0_0_14px_#38bdf8,0_0_24px_#818cf8]"
              style={{
                top: `calc(50% - ${radius}px - 7px)`,
                left: 'calc(50% - 7px)',
              }}
            />
          </div>

          {/* Center Brand Icon Container */}
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="absolute w-24 h-24 rounded-2xl p-1 bg-gradient-to-br from-white/15 via-white/5 to-white/0 backdrop-blur-xl border border-white/20 shadow-[0_12px_40px_rgba(0,0,0,0.6)] flex items-center justify-center overflow-hidden group"
          >
            {/* Inner Light Sweep Effect */}
            <motion.div
              animate={{
                x: ['-120%', '220%'],
              }}
              transition={{
                duration: 2.8,
                repeat: Infinity,
                ease: 'easeInOut',
                repeatDelay: 1.2,
              }}
              className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/25 to-transparent skew-x-12 pointer-events-none z-10"
            />

            {/* Real Application Icon */}
            <img
              src="/icon.png"
              alt="Noectra AI"
              className="w-full h-full object-cover rounded-xl shadow-inner select-none pointer-events-none"
            />
          </motion.div>
        </div>
      </div>

      {/* Typography: Brand Title & Tagline */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15 }}
        className="flex flex-col items-center text-center space-y-1.5 z-10"
      >
        <h1 className="text-2xl font-bold tracking-[0.25em] uppercase bg-clip-text text-transparent bg-gradient-to-r from-white via-cyan-100 to-indigo-200 drop-shadow-[0_2px_12px_rgba(255,255,255,0.15)]">
          Noectra AI
        </h1>
        <p className="text-[11px] font-light tracking-[0.22em] text-cyan-200/60 uppercase">
          The Spectrum of Intellect
        </p>
      </motion.div>

      {/* Progress Status & Percentage Pill */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.25 }}
        className="mt-6 flex flex-col items-center space-y-2 z-10"
      >
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-sm">
          <CurrentIcon className="w-3.5 h-3.5 text-cyan-400 animate-pulse flex-shrink-0" />
          <span className="text-xs text-cyan-100/80 font-medium">
            {statusMessages[currentStatusIndex].text}
          </span>
          <span className="text-xs font-mono font-semibold text-cyan-400 pl-1 border-l border-white/10">
            {currentProgress}%
          </span>
        </div>

        {/* Completion Confirmation Notice */}
        {currentProgress === 100 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono font-medium"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Ready</span>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
