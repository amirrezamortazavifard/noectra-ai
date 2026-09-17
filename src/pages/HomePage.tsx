'use client';

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  MessageSquare,
  FileText,
  Globe2,
  BookOpenText,
  ArrowRight,
  Search,
  Clock,
  ChevronRight,
  TrendingUp,
  Cpu,
  Newspaper,
  Compass,
  ArrowUpRight,
  Layers,
} from 'lucide-react';
import { openExternalLink } from '@/lib/openExternal';
import { formatTimeDifference } from '@/lib/utils';
import { fetchNewsFromBackend } from '@/lib/services/discover/newsApi';
import { NewsItem } from '@/lib/services/discover/types';
import { soundService } from '@/lib/sound/soundService';
import ArticleReaderModal from '@/components/Discover/ArticleReaderModal';

interface RecentChat {
  id: string;
  title: string;
  createdAt: string;
  sources?: string[];
}

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [recentChats, setRecentChats] = useState<RecentChat[]>([]);
  const [trendingNews, setTrendingNews] = useState<NewsItem[]>([]);
  const [loadingNews, setLoadingNews] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<NewsItem | null>(null);

  // Time-sensitive greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Fetch recent chats and top news preview
  useEffect(() => {
    // 1. Fetch recent chats
    fetch('/api/chats')
      .then((res) => (res.ok ? res.json() : { chats: [] }))
      .then((data) => {
        if (data && data.chats) {
          setRecentChats(data.chats.slice(0, 4));
        }
      })
      .catch(() => {});

    // 2. Fetch top news for dashboard preview
    setLoadingNews(true);
    fetchNewsFromBackend({ category: 'tech' })
      .then((items) => {
        setTrendingNews(items.slice(0, 3));
      })
      .catch(() => {})
      .finally(() => setLoadingNews(false));
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    soundService.play('dispatch');
    navigate(`/chat?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const handlePromptChip = (prompt: string) => {
    soundService.play('dispatch');
    navigate(`/chat?q=${encodeURIComponent(prompt)}`);
  };

  const promptSuggestions = [
    'Synthesize recent breakthrough papers in quantum computing',
    'Summarize current global macroeconomic trends',
    'Analyze technical trade-offs of modern AI architectures',
    'Generate an executive briefing on renewable energy innovation',
  ];

  return (
    <div className="w-full min-h-full px-4 sm:px-6 lg:px-10 pt-6 pb-24 max-w-7xl mx-auto space-y-10">
      {/* Top Header & Greeting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-black/[0.06] dark:border-white/[0.07]">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wider uppercase bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
              Intelligence Workspace
            </span>
            <span className="text-black/30 dark:text-white/30">•</span>
            <span className="text-xs text-black/50 dark:text-white/50 font-medium">
              {new Date().toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
          <h1
            className="text-3xl sm:text-4xl font-light text-black dark:text-white tracking-tight"
            style={{ fontFamily: 'PP Editorial, Georgia, serif' }}
          >
            {getGreeting()}, Researcher
          </h1>
          <p className="text-xs sm:text-sm text-black/50 dark:text-white/50 mt-1">
            Where deep synthesis, real-time discovery, and document intelligence converge.
          </p>
        </div>

        {/* System Status Pill */}
        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/70 dark:bg-[#121620]/80 backdrop-blur-md border border-black/[0.06] dark:border-white/[0.07] text-xs shadow-sm">
            <Cpu size={14} className="text-cyan-500" />
            <span className="text-black/60 dark:text-white/60">Engine Core:</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              Online
            </span>
          </div>
        </div>
      </div>

      {/* Hero Search / Prompt Input */}
      <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-white via-sky-50/70 to-indigo-50/50 dark:from-cyan-950/30 dark:via-[#0f131a]/80 dark:to-indigo-950/30 border border-black/[0.08] dark:border-cyan-500/20 shadow-xl shadow-sky-500/5 dark:shadow-[0_20px_50px_rgba(0,0,0,0.25)] overflow-hidden">
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-cyan-500/10 dark:bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-indigo-500/10 dark:bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white mb-2 tracking-tight">
            Ask Noectra AI or begin deep research
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-white/60 mb-5">
            Query across live web sources, scientific databases, or your local documents with reasoned synthesis.
          </p>

          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <div className="relative flex items-center">
              <Search
                size={18}
                className="absolute left-4 text-cyan-600 dark:text-cyan-400 pointer-events-none"
              />
              <input
                type="text"
                placeholder="Ask anything, compare theories, or search global knowledge..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-28 py-3.5 rounded-2xl bg-white/95 dark:bg-[#161a24]/90 backdrop-blur-md border border-black/[0.12] dark:border-white/[0.12] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/40 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all shadow-sm"
              />
              <button
                type="submit"
                disabled={!searchQuery.trim()}
                className="absolute right-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
              >
                <span>Synthesize</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </form>

          {/* Prompt Suggestion Chips */}
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <span className="text-[11px] font-medium text-slate-500 dark:text-white/40 flex items-center gap-1 mr-1">
              <Sparkles size={11} className="text-cyan-600 dark:text-cyan-400" />
              Try:
            </span>
            {promptSuggestions.map((prompt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handlePromptChip(prompt)}
                className="px-3 py-1 rounded-full text-xs bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.05] dark:hover:bg-white/[0.1] border border-black/[0.08] dark:border-white/[0.08] text-slate-700 dark:text-white/70 hover:text-slate-900 dark:hover:text-white transition-all text-left truncate max-w-[280px] sm:max-w-[340px]"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4 Main Workflow Pillars */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-black/80 dark:text-white/80 flex items-center gap-2">
            <Layers size={16} className="text-cyan-500" />
            Core Workflows
          </h3>
          <span className="text-xs text-black/40 dark:text-white/40">Select a workspace module</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: AI Chat */}
          <div
            onClick={() => navigate('/chat')}
            className="group relative p-5 rounded-2xl bg-white/60 dark:bg-[#11141c]/70 backdrop-blur-md border border-black/[0.06] dark:border-white/[0.07] hover:border-cyan-500/40 dark:hover:border-cyan-500/30 transition-all duration-300 hover:shadow-lg cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <MessageSquare size={20} />
              </div>
              <h4 className="text-sm font-semibold text-black dark:text-white mb-1 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                AI Research & Chat
              </h4>
              <p className="text-xs text-black/50 dark:text-white/50 leading-relaxed">
                Multi-engine research assistant with automated citations, reasoning, and synthesis.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-medium text-cyan-600 dark:text-cyan-400 pt-4 mt-2 border-t border-black/[0.04] dark:border-white/[0.05]">
              <span>Launch Chat</span>
              <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 2: PDF Document Intelligence */}
          <div
            onClick={() => navigate('/pdf')}
            className="group relative p-5 rounded-2xl bg-white/60 dark:bg-[#11141c]/70 backdrop-blur-md border border-black/[0.06] dark:border-white/[0.07] hover:border-indigo-500/40 dark:hover:border-indigo-500/30 transition-all duration-300 hover:shadow-lg cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <FileText size={20} />
              </div>
              <h4 className="text-sm font-semibold text-black dark:text-white mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                PDF Intelligence
              </h4>
              <p className="text-xs text-black/50 dark:text-white/50 leading-relaxed">
                Deep document reader, text-to-speech, interactive AI sidecar, and figure extraction.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 pt-4 mt-2 border-t border-black/[0.04] dark:border-white/[0.05]">
              <span>Open Reader</span>
              <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 3: Global Discover */}
          <div
            onClick={() => navigate('/discover')}
            className="group relative p-5 rounded-2xl bg-white/60 dark:bg-[#11141c]/70 backdrop-blur-md border border-black/[0.06] dark:border-white/[0.07] hover:border-fuchsia-500/40 dark:hover:border-fuchsia-500/30 transition-all duration-300 hover:shadow-lg cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border border-fuchsia-500/20 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Globe2 size={20} />
              </div>
              <h4 className="text-sm font-semibold text-black dark:text-white mb-1 group-hover:text-fuchsia-600 dark:group-hover:text-fuchsia-400 transition-colors">
                Global Discover
              </h4>
              <p className="text-xs text-black/50 dark:text-white/50 leading-relaxed">
                Live international news feeds, arXiv AI preprints, and PubMed scholarly papers.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-medium text-fuchsia-600 dark:text-fuchsia-400 pt-4 mt-2 border-t border-black/[0.04] dark:border-white/[0.05]">
              <span>Explore Feeds</span>
              <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 4: Library */}
          <div
            onClick={() => navigate('/library')}
            className="group relative p-5 rounded-2xl bg-white/60 dark:bg-[#11141c]/70 backdrop-blur-md border border-black/[0.06] dark:border-white/[0.07] hover:border-emerald-500/40 dark:hover:border-emerald-500/30 transition-all duration-300 hover:shadow-lg cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <BookOpenText size={20} />
              </div>
              <h4 className="text-sm font-semibold text-black dark:text-white mb-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                Research Library
              </h4>
              <p className="text-xs text-black/50 dark:text-white/50 leading-relaxed">
                Central archive of prior research sessions, bookmarked queries, and source citations.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 pt-4 mt-2 border-t border-black/[0.04] dark:border-white/[0.05]">
              <span>View History</span>
              <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      {/* Two-Column Section: Trending Intelligence Preview + Recent Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Discover Highlights with 1-Click Summarize */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-black/80 dark:text-white/80 flex items-center gap-2">
              <TrendingUp size={16} className="text-cyan-500" />
              Live Intelligence Highlights
            </h3>
            <button
              onClick={() => navigate('/discover')}
              className="text-xs font-medium text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
            >
              <span>View all in Discover</span>
              <ArrowUpRight size={13} />
            </button>
          </div>

          {loadingNews ? (
            <div className="h-44 flex flex-col items-center justify-center rounded-2xl bg-white/40 dark:bg-[#11141c]/50 border border-black/[0.05] dark:border-white/[0.06] text-xs text-black/40 dark:text-white/40 gap-2">
              <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              <span>Fetching live intelligence...</span>
            </div>
          ) : trendingNews.length === 0 ? (
            <div className="p-6 rounded-2xl bg-white/40 dark:bg-[#11141c]/50 border border-black/[0.05] dark:border-white/[0.06] text-center text-xs text-black/40 dark:text-white/40">
              No live news available right now. Check Discover page for full feeds.
            </div>
          ) : (
            <div className="space-y-3">
              {trendingNews.map((item, idx) => {
                const prompt = encodeURIComponent(
                  `Please summarize this news article in depth:\nTitle: "${item.title}"\nSource: ${item.source}\nURL: ${item.url}\n\nExcerpt:\n${item.description}`
                );

                return (
                  <div
                    key={item.id || idx}
                    className="group p-3.5 rounded-xl bg-white/60 dark:bg-[#11141c]/70 backdrop-blur-md border border-black/[0.06] dark:border-white/[0.07] hover:border-cyan-500/40 dark:hover:border-cyan-500/30 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-[10px] text-black/40 dark:text-white/40 mb-1 font-mono">
                        <span className="font-semibold text-cyan-600 dark:text-cyan-400">{item.source}</span>
                        {item.publishedAt && (
                          <>
                            <span>•</span>
                            <span>{formatTimeDifference(new Date(), item.publishedAt)} ago</span>
                          </>
                        )}
                      </div>
                      <h5
                        onClick={() => setSelectedArticle(item)}
                        className="text-xs sm:text-sm font-medium text-black dark:text-white truncate group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors cursor-pointer"
                        title={item.title}
                      >
                        {item.title}
                      </h5>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => navigate(`/chat?q=${prompt}`)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 transition-all active:scale-95 shadow-sm"
                      >
                        <Sparkles size={11} className="text-cyan-500" />
                        <span>Summarize with AI</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedArticle(item)}
                        className="p-1.5 rounded-lg text-black/40 dark:text-white/40 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                        title="Read story in app"
                      >
                        <ArrowUpRight size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 1 Col: Recent Research Sessions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-black/80 dark:text-white/80 flex items-center gap-2">
              <Clock size={16} className="text-cyan-500" />
              Recent Sessions
            </h3>
            <button
              onClick={() => navigate('/library')}
              className="text-xs font-medium text-cyan-600 dark:text-cyan-400 hover:underline"
            >
              All chats
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-white/60 dark:bg-[#11141c]/70 backdrop-blur-md border border-black/[0.06] dark:border-white/[0.07] space-y-3 shadow-sm">
            {recentChats.length === 0 ? (
              <div className="py-6 text-center text-xs text-black/40 dark:text-white/40">
                <p>No recent sessions yet.</p>
                <button
                  onClick={() => navigate('/chat')}
                  className="mt-2 text-cyan-600 dark:text-cyan-400 font-medium hover:underline inline-block"
                >
                  Start your first chat
                </button>
              </div>
            ) : (
              recentChats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => navigate(`/c/${chat.id}`)}
                  className="group flex items-start justify-between gap-2 p-2.5 rounded-xl hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <h6 className="text-xs font-medium text-black/80 dark:text-white/80 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors truncate">
                      {chat.title}
                    </h6>
                    <span className="text-[10px] text-black/40 dark:text-white/40 font-mono">
                      {formatTimeDifference(new Date(), chat.createdAt)} ago
                    </span>
                  </div>
                  <ChevronRight size={13} className="text-black/30 dark:text-white/30 group-hover:text-cyan-500 group-hover:translate-x-0.5 transition-all mt-1" />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* In-App News Reader & Browser Modal */}
      <ArticleReaderModal
        item={selectedArticle}
        isOpen={!!selectedArticle}
        onClose={() => setSelectedArticle(null)}
      />
    </div>
  );
};

export default HomePage;
