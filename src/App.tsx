import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ThemeProvider } from 'next-themes';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from '@/components/Sidebar';
import HomePage from '@/pages/HomePage';
import ChatWindow from '@/components/ChatWindow';
import DiscoverPage from '@/pages/DiscoverPage';
import PdfReaderPage from '@/pages/PdfReaderPage';
import LibraryPage from '@/pages/LibraryPage';
import SetupWizard from '@/components/Setup/SetupWizard';
import SplashScreen from '@/components/SplashScreen';
import { ChatProvider } from '@/lib/hooks/useChat';
import { UIConfigSections } from '@/lib/config/types';
import ErrorBoundary from '@/components/ErrorBoundary';
import TrayHub from '@/components/Tray/TrayHub';
import { useAutoUpdateChecker } from '@/lib/hooks/useAutoUpdateChecker';
import '@/app/globals.css';

const defaultFallbackSections: UIConfigSections = {
  preferences: [],
  personalization: [],
  search: [],
  modelProviders: [
    { key: 'openai', name: 'OpenAI', fields: [] },
    { key: 'ollama', name: 'Ollama', fields: [] },
    { key: 'groq', name: 'Groq', fields: [] },
    { key: 'anthropic', name: 'Anthropic', fields: [] },
    { key: 'gemini', name: 'Google Gemini', fields: [] },
    { key: 'lmstudio', name: 'LM Studio', fields: [] },
    { key: 'openrouter', name: 'OpenRouter', fields: [] },
    { key: 'custom', name: '9router / Custom (Local OpenAI)', fields: [] },
  ],
};

function TrayEventListener() {
  const navigate = useNavigate();

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    import('@tauri-apps/api/event')
      .then(({ listen }) => {
        listen<string>('navigate-to', (event) => {
          if (event.payload) {
            navigate(event.payload);
          }
        }).then((dispose) => {
          unlisten = dispose;
        });
      })
      .catch(() => {});

    return () => {
      if (unlisten) unlisten();
    };
  }, [navigate]);

  return null;
}

export default function App() {
  useAutoUpdateChecker();

  const [isTrayHub, setIsTrayHub] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return (
        window.location.hash.includes('tray') ||
        window.location.pathname.includes('tray')
      );
    }
    return false;
  });

  useEffect(() => {
    import('@tauri-apps/api/webviewWindow')
      .then(({ getCurrentWebviewWindow }) => {
        const appWindow = getCurrentWebviewWindow();
        if (appWindow.label === 'tray-hub') {
          setIsTrayHub(true);
        }
      })
      .catch(() => {});
  }, []);

  const [setupComplete, setSetupComplete] = useState<boolean | null>(null);
  const [configSections, setConfigSections] = useState<UIConfigSections | null>(null);
  const [showSplash, setShowSplash] = useState(true);

  const fetchConfig = async () => {
    const startTime = Date.now();
    try {
      let data: any = null;

      // Retry loop to gracefully wait for local Axum server to bind port 3001
      for (let attempt = 0; attempt < 12; attempt++) {
        try {
          const res = await fetch('/api/config');
          if (res.ok) {
            data = await res.json();
            break;
          }
        } catch {
          // Axum internal server still initializing
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
      }

      if (data) {
        setSetupComplete(data.values?.setupComplete ?? false);
        setConfigSections(data.fields || defaultFallbackSections);
      } else {
        setSetupComplete(false);
        setConfigSections(defaultFallbackSections);
      }
    } catch {
      setSetupComplete(false);
      setConfigSections(defaultFallbackSections);
    } finally {
      // Ensure smooth, pleasant splash duration (~2.5s) for the serene Windows-style sequence to breathe naturally
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 2500 - elapsed);
      setTimeout(() => {
        setShowSplash(false);
      }, remaining);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  if (isTrayHub) {
    return (
      <ErrorBoundary>
        <ThemeProvider defaultTheme="dark">
          <div className="flex h-screen w-screen items-center justify-center bg-transparent p-0 m-0 overflow-hidden select-none">
            <TrayHub />
          </div>
        </ThemeProvider>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        {/* Creative Cinematic Splash Screen */}
        <AnimatePresence mode="wait">
          {showSplash && (
            <SplashScreen
              key="noectra-splash"
              isReady={setupComplete !== null}
            />
          )}
        </AnimatePresence>

        {/* Main Application Container */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: showSplash ? 0 : 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="h-full w-full"
        >
          <BrowserRouter>
            <TrayEventListener />
            {setupComplete ? (
              <ChatProvider>
                <Sidebar>
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/chat" element={<ChatWindow />} />
                    <Route path="/c/:chatId" element={<ChatWindow />} />
                    <Route path="/discover" element={<DiscoverPage />} />
                    <Route path="/pdf" element={<PdfReaderPage />} />
                    <Route path="/library" element={<LibraryPage />} />
                    <Route path="/tray" element={<TrayHub />} />
                  </Routes>
                </Sidebar>
                <Toaster
                  toastOptions={{
                    unstyled: true,
                    classNames: {
                      toast:
                        'bg-light-secondary dark:bg-dark-secondary dark:text-white/70 text-black/70 rounded-lg p-4 flex flex-row items-center space-x-2',
                    },
                  }}
                />
              </ChatProvider>
            ) : (
              <SetupWizard configSections={configSections || defaultFallbackSections} />
            )}
          </BrowserRouter>
        </motion.div>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
