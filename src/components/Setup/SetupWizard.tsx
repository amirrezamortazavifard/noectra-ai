'use client';

import { useEffect, useState } from 'react';
import { UIConfigSections } from '@/lib/config/types';
import { AnimatePresence, motion } from 'framer-motion';
import SetupConfig from './SetupConfig';
import { AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';

interface SetupWizardProps {
  configSections: UIConfigSections;
}

const SetupWizard = ({ configSections }: SetupWizardProps) => {
  const [showWelcome, setShowWelcome] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [setupState, setSetupState] = useState(1);
  const [progress, setProgress] = useState(10);
  const [statusMessage, setStatusMessage] = useState('Initializing system...');
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const startInitialization = async () => {
    try {
      setErrorDetails(null);
      setProgress(15);
      setStatusMessage('Connecting to local Axum backend on port 3001...');

      // 1. Check API server
      await delay(800);
      const pingRes = await fetch('/api/config');
      if (!pingRes.ok) {
        throw new Error(`Failed to load configuration from backend: Status ${pingRes.status}`);
      }
      setProgress(40);
      setStatusMessage('Connected to backend. Validating configuration...');

      // 2. Fetch Providers
      await delay(600);
      setProgress(65);
      setStatusMessage('Connecting to SQLite database and loading AI providers...');
      const provRes = await fetch('/api/providers');
      if (!provRes.ok) {
        throw new Error(`Database connection failed: Status ${provRes.status}`);
      }
      setProgress(85);
      setStatusMessage('Database and providers ready. Loading environment...');

      // 3. Ready
      await delay(500);
      setProgress(100);
      setStatusMessage('Everything is ready! Launching setup...');
      await delay(400);

      setSetupState(2);
    } catch (err: any) {
      console.error('Setup initialization error:', err);
      setErrorDetails(err.message || 'Unknown initialization error');
      setStatusMessage('Failed to connect to backend engine');
    }
  };

  useEffect(() => {
    (async () => {
      await delay(2200);
      setShowWelcome(false);
      await delay(400);
      setShowSetup(true);
      setSetupState(1);
      startInitialization();
    })();
  }, []);

  return (
    <div className="bg-light-primary dark:bg-dark-primary h-screen w-screen fixed inset-0 overflow-hidden text-black dark:text-white select-none">
      <AnimatePresence>
        {showWelcome && (
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
            <motion.div
              className="absolute flex flex-col items-center justify-center h-full"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ duration: 0.6 }}
            >
              <motion.h2
                transition={{ duration: 0.6 }}
                initial={{ opacity: 0, translateY: '30px' }}
                animate={{ opacity: 1, translateY: '0px' }}
                className="text-4xl md:text-6xl xl:text-8xl font-normal font-['Instrument_Serif'] tracking-tight"
              >
                Welcome to{' '}
                <span className="text-[#24A0ED] italic font-['PP_Editorial']">
                  Noectra AI
                </span>
              </motion.h2>
              <motion.p
                transition={{ delay: 0.8, duration: 0.7 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-black/70 dark:text-white/70 text-sm md:text-lg xl:text-2xl mt-2"
              >
                <span className="font-light">Web search,</span>{' '}
                <span className="font-light font-['PP_Editorial'] italic">
                  reimagined
                </span>
              </motion.p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{
                opacity: 0.2,
                scale: 1,
                transition: { delay: 0.8, duration: 0.7 },
              }}
              exit={{ opacity: 0, scale: 1.1, transition: { duration: 0.6 } }}
              className="bg-[#24A0ED] left-50 translate-x-[-50%] h-[250px] w-[250px] rounded-full relative z-40 blur-[100px]"
            />
          </div>
        )}

        {showSetup && (
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
            <AnimatePresence mode="wait">
              {setupState === 1 && (
                <motion.div
                  key="setup-loading-panel"
                  transition={{ duration: 0.5 }}
                  initial={{ opacity: 0, translateY: '20px' }}
                  animate={{ opacity: 1, translateY: '0px' }}
                  exit={{ opacity: 0, translateY: '-20px', transition: { duration: 0.4 } }}
                  className="flex flex-col items-center justify-center max-w-lg w-full px-6 space-y-6 text-center"
                >
                  <div>
                    <h2 className="text-2xl md:text-4xl font-normal font-['Instrument_Serif'] tracking-tight">
                      Preparing{' '}
                      <span className="text-[#24A0ED] italic font-['PP_Editorial']">
                        Noectra AI
                      </span>
                    </h2>
                    <p className="text-xs md:text-sm text-black/60 dark:text-white/60 mt-1">
                      Loading configuration and initializing local Rust engine...
                    </p>
                  </div>

                  {/* Progress Bar Container */}
                  <div className="w-full bg-light-200 dark:bg-dark-200 rounded-full h-3.5 p-0.5 overflow-hidden border border-black/10 dark:border-white/10 shadow-inner">
                    <motion.div
                      className="bg-gradient-to-r from-[#24A0ED] to-[#00d2ff] h-full rounded-full transition-all duration-300 relative"
                      style={{ width: `${progress}%` }}
                    >
                      <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
                    </motion.div>
                  </div>

                  {/* Progress info and Activity logs */}
                  <div className="flex flex-col items-center space-y-2 w-full">
                    <div className="flex justify-between w-full text-xs font-mono text-black/60 dark:text-white/60">
                      <span>{progress}%</span>
                      <span>Initialization</span>
                    </div>

                    <div className="flex items-center space-x-2 text-xs md:text-sm text-black/80 dark:text-white/80 bg-light-secondary dark:bg-dark-secondary px-3 py-2 rounded-lg border border-light-200 dark:border-dark-200 w-full justify-center">
                      <span className="w-2 h-2 rounded-full bg-[#24A0ED] animate-ping flex-shrink-0" />
                      <span className="truncate">{statusMessage}</span>
                    </div>
                  </div>

                  {/* Error state if API fails */}
                  {errorDetails && (
                    <div className="flex flex-col items-center space-y-3 w-full p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span className="font-semibold">{errorDetails}</span>
                      </div>
                      <button
                        onClick={startInitialization}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-medium transition-all"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Retry</span>
                      </button>
                    </div>
                  )}
                </motion.div>
              )}

              {setupState > 1 && (
                <motion.div
                  key="setup-config"
                  initial={{ opacity: 0, translateY: '30px' }}
                  animate={{
                    opacity: 1,
                    translateY: '0px',
                    transition: { duration: 0.6 },
                  }}
                  className="w-full flex justify-center"
                >
                  <SetupConfig
                    configSections={configSections}
                    setupState={setupState}
                    setSetupState={setSetupState}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SetupWizard;
