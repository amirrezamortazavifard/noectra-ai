import React, { createContext, useContext, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface ThemeContextType {
  theme: string;
  setTheme: (theme: string) => void;
  resolvedTheme: string;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  setTheme: () => {},
  resolvedTheme: 'dark',
});

export const ThemeProvider: React.FC<{
  children: React.ReactNode;
  attribute?: string;
  defaultTheme?: string;
  enableSystem?: boolean;
}> = ({ children, defaultTheme = 'dark' }) => {
  const [theme, setThemeState] = useState<string>(() => {
    return localStorage.getItem('theme') || defaultTheme;
  });

  const [resolvedTheme, setResolvedTheme] = useState<string>(() => {
    const saved = localStorage.getItem('theme') || defaultTheme;
    if (saved === 'system') {
      return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }
    return saved;
  });

  const setTheme = (newTheme: string) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  useEffect(() => {
    const computeTheme = () => {
      if (theme === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return theme;
    };

    const effective = computeTheme();
    setResolvedTheme(effective);

    const root = document.documentElement;
    const isDark = effective === 'dark';
    if (isDark) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }

    // Synchronize HTML meta theme-color for webview rendering
    let metaTheme = document.querySelector('meta[name="theme-color"]');
    if (!metaTheme) {
      metaTheme = document.createElement('meta');
      metaTheme.setAttribute('name', 'theme-color');
      document.head.appendChild(metaTheme);
    }
    metaTheme.setAttribute('content', isDark ? '#07090e' : '#ffffff');

    // Synchronize native window titlebar and DWM frame with active theme
    invoke('sync_window_theme', { theme: isDark ? 'dark' : 'light' }).catch(() => {});
  }, [theme]);

  // Listen for system theme changes if theme is set to system
  useEffect(() => {
    if (theme !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      const isDark = media.matches;
      setResolvedTheme(isDark ? 'dark' : 'light');
      const root = document.documentElement;
      if (isDark) {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.classList.add('light');
        root.classList.remove('dark');
      }
      invoke('sync_window_theme', { theme: isDark ? 'dark' : 'light' }).catch(() => {});
    };
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
