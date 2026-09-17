import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  ArrowRight,
  Maximize2,
  Shield,
  Zap,
  BookOpen,
  FileText,
  Power,
  Activity,
  Cpu,
  Layers,
  Sparkles,
  X,
  History,
  CheckCircle2
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import ModelProviderIcon from '@/components/ui/ModelProviderIcon';

interface RecentSession {
  id: string;
  query: string;
  timestamp: string;
  category: string;
}

export default function TrayHub() {
  const [query, setQuery] = useState('');
  const [privacyShield, setPrivacyShield] = useState(false);
  const [deepMode, setDeepMode] = useState(true);
  const [autostartEnabled, setAutostartEnabled] = useState(false);
  const [activeProvider, setActiveProvider] = useState('openai');
  const [activeModel, setActiveModel] = useState('gpt-4o');
  const [engineLatency, setEngineLatency] = useState('0.04ms');
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);

  useEffect(() => {
    const prov = localStorage.getItem('chatModelProviderId') || 'openai';
    const mod = localStorage.getItem('chatModelKey') || 'gpt-4o';
    setActiveProvider(prov);
    setActiveModel(mod);
  }, []);

  useEffect(() => {
    invoke<boolean>('get_autostart_status')
      .then((enabled) => setAutostartEnabled(enabled))
      .catch(() => {});
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('chats');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const formatted: RecentSession[] = parsed.slice(0, 3).map((item: any) => ({
            id: item.id || item.chatId || Math.random().toString(),
            query: item.title || item.query || item.messages?.[0]?.content || 'Neural Analysis Session',
            timestamp: item.updatedAt ? new Date(item.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently',
            category: item.sources?.includes('academic') ? 'Academic' : 'Synthesis'
          }));
          setRecentSessions(formatted);
        }
      }
    } catch {
      setRecentSessions([
        { id: '1', query: 'Quantum Computing Fault Tolerance Architectures', timestamp: '12m ago', category: 'Research' },
        { id: '2', query: 'Autonomous Agent Frameworks Comparison', timestamp: '1h ago', category: 'Synthesis' }
      ]);
    }
  }, []);

  const handleLaunchSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    invoke('open_route_cmd', { route: `/?q=${encodeURIComponent(query.trim())}` }).catch(() => {});
  };

  const handleOpenWorkspace = () => {
    invoke('open_workspace_cmd').catch(() => {});
  };

  const handleOpenRoute = (route: string) => {
    invoke('open_route_cmd', { route }).catch(() => {});
  };

  const handleExit = () => {
    invoke('exit_app_cmd').catch(() => {});
  };

  const handleDismiss = () => {
    invoke('toggle_tray_hub_cmd').catch(() => {});
  };

  const handleToggleAutostart = async () => {
    const targetState = !autostartEnabled;
    try {
      await invoke('set_autostart_status', { enable: targetState });
      setAutostartEnabled(targetState);
    } catch (err) {
      console.error('Failed to toggle autostart from tray:', err);
    }
  };

  return (
    <div className="relative w-[420px] h-[640px] select-none overflow-hidden rounded-2xl bg-[#07090e]/95 text-white/85 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.9)] border border-white/[0.07] backdrop-blur-2xl flex flex-col justify-between p-5 font-sans">
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-cyan-500/[0.07] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-12 w-64 h-64 rounded-full bg-indigo-500/[0.06] blur-3xl" />

      <div className="relative z-10 space-y-4">
        <header className="flex items-center justify-between border-b border-white/[0.05] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-2.5 w-2.5 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold tracking-wider text-white/90 uppercase">Noectra Core</span>
                <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-mono tracking-normal text-white/40 border border-white/[0.05]">v1.12</span>
              </div>
              <div className="text-[10px] font-mono text-emerald-400/80 tracking-tight">PORT 3001 · {engineLatency}</div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleOpenWorkspace}
              title="Expand to Full Studio"
              className="group flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02] text-white/40 transition-all hover:bg-white/[0.08] hover:text-white/90"
            >
              <Maximize2 className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
            </button>
            <button
              onClick={handleDismiss}
              title="Dismiss Hub"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02] text-white/40 transition-all hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </header>

        <section className="text-center pt-1 pb-1">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[10px] tracking-wide text-white/70">
            <ModelProviderIcon provider={activeProvider} modelKey={activeModel} size={12} />
            <span className="font-mono text-white/80">{activeModel}</span>
          </div>
          <h1 className="mt-2 text-xl font-light tracking-tight text-white/90">
            Neural Research Hub
          </h1>
          <p className="text-[11px] text-white/40 tracking-wide mt-0.5">
            Privacy-Preserving Engine Operating in Background
          </p>
        </section>

        <form onSubmit={handleLaunchSearch} className="relative">
          <div className="group relative flex items-center rounded-xl border border-white/[0.08] bg-[#0b0f19]/80 p-1.5 shadow-inner backdrop-blur-xl transition-all focus-within:border-cyan-500/50 focus-within:ring-1 focus-within:ring-cyan-500/30">
            <ModelProviderIcon provider={activeProvider} modelKey={activeModel} size={15} className="ml-2.5 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Ask ${activeModel} anything...`}
              className="w-full bg-transparent px-2.5 py-1.5 text-xs text-white/90 placeholder-white/25 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!query.trim()}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.08] text-white/60 transition-all hover:bg-cyan-500 hover:text-black disabled:opacity-20 disabled:hover:bg-white/[0.08] disabled:hover:text-white/60"
            >
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </form>

        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Studio', icon: Maximize2, action: handleOpenWorkspace },
            { label: 'Deep Chat', icon: Zap, action: () => handleOpenRoute('/') },
            { label: 'PDF Lab', icon: FileText, action: () => handleOpenRoute('/pdf') },
            { label: 'Library', icon: BookOpen, action: () => handleOpenRoute('/library') },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                onClick={item.action}
                className="group flex flex-col items-center justify-center gap-1.5 rounded-xl border border-white/[0.05] bg-white/[0.02] p-2.5 transition-all hover:border-white/[0.15] hover:bg-white/[0.05]"
              >
                <Icon className="h-4 w-4 text-white/40 transition-all group-hover:scale-110 group-hover:text-cyan-300" />
                <span className="text-[10px] font-medium tracking-tight text-white/50 group-hover:text-white/80">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5 space-y-2">
          <div className="flex items-center justify-between text-[10px] font-medium text-white/40 px-1">
            <span>ENGINE PRESETS</span>
            <span className="font-mono text-cyan-400/80">ACTIVE</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() => setPrivacyShield(!privacyShield)}
              className={`flex flex-col justify-between rounded-lg border p-2 text-left transition-all ${
                privacyShield
                  ? 'border-emerald-500/40 bg-emerald-500/[0.08] text-emerald-300'
                  : 'border-white/[0.06] bg-white/[0.02] text-white/60 hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Shield className={`h-3 w-3 ${privacyShield ? 'text-emerald-400' : 'text-white/30'}`} />
                <span className="text-[10px] font-medium">Privacy</span>
              </div>
              <span className="text-[9px] font-mono mt-1 text-white/40">{privacyShield ? 'LOCAL' : 'WEB'}</span>
            </button>

            <button
              onClick={() => setDeepMode(!deepMode)}
              className={`flex flex-col justify-between rounded-lg border p-2 text-left transition-all ${
                deepMode
                  ? 'border-cyan-500/40 bg-cyan-500/[0.08] text-cyan-300'
                  : 'border-white/[0.06] bg-white/[0.02] text-white/60 hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Cpu className={`h-3 w-3 ${deepMode ? 'text-cyan-400' : 'text-white/30'}`} />
                <span className="text-[10px] font-medium">Neural</span>
              </div>
              <span className="text-[9px] font-mono mt-1 text-white/40">{deepMode ? 'PRO' : 'FAST'}</span>
            </button>

            <button
              onClick={handleToggleAutostart}
              className={`flex flex-col justify-between rounded-lg border p-2 text-left transition-all ${
                autostartEnabled
                  ? 'border-indigo-500/40 bg-indigo-500/[0.08] text-indigo-300'
                  : 'border-white/[0.06] bg-white/[0.02] text-white/60 hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Power className={`h-3 w-3 ${autostartEnabled ? 'text-indigo-400' : 'text-white/30'}`} />
                <span className="text-[10px] font-medium">Boot</span>
              </div>
              <span className="text-[9px] font-mono mt-1 text-white/40">{autostartEnabled ? 'AUTO' : 'OFF'}</span>
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-medium text-white/40 px-1">
            <div className="flex items-center gap-1.5">
              <History className="h-3 w-3 text-white/30" />
              <span>RECENT SESSIONS</span>
            </div>
            <button onClick={() => handleOpenRoute('/library')} className="hover:text-white/80 transition-colors">
              View All
            </button>
          </div>

          <div className="space-y-1">
            {recentSessions.length > 0 ? (
              recentSessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => handleOpenRoute(`/c/${session.id}`)}
                  className="group flex cursor-pointer items-center justify-between rounded-lg border border-white/[0.04] bg-white/[0.015] px-3 py-2 transition-all hover:border-white/[0.1] hover:bg-white/[0.04]"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="h-1.5 w-1.5 rounded-full bg-cyan-400/60 group-hover:bg-cyan-400" />
                    <span className="truncate text-[11px] text-white/70 group-hover:text-white/95">
                      {session.query}
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-white/30 shrink-0 ml-2">{session.timestamp}</span>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-white/[0.04] bg-white/[0.015] p-3 text-center text-[10px] text-white/30">
                No active sessions stored
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="relative z-10 pt-3 border-t border-white/[0.05]">
        <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#0b0f19]/90 px-3 py-1.5 backdrop-blur-xl">
          <div className="flex items-center gap-2 text-[10px] text-white/40">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>SQLite & Axum Active</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenRoute('/library')}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-white/50 hover:bg-white/[0.06] hover:text-white/80 transition-all"
            >
              <Layers className="h-3 w-3" />
              <span>Vault</span>
            </button>
            <button
              onClick={handleExit}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-red-400/70 hover:bg-red-500/10 hover:text-red-300 transition-all"
            >
              <Power className="h-3 w-3" />
              <span>Terminate</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
