'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { openExternalLink } from '@/lib/openExternal';
import { cn } from '@/lib/utils';
import {
  X,
  ExternalLink,
  Search,
  Sparkles,
  Copy,
  Check,
  Play,
  Clock,
  BookOpen,
  MessageSquare,
  FileText,
  Video,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface YouTubeIntelligenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrlOrId: string | null;
  videoTitle?: string;
}

interface TranscriptEntry {
  start: number;
  duration: number;
  text: string;
}

interface TranscriptData {
  video_id: string;
  title: string;
  url: string;
  entry_count: number;
  entries: TranscriptEntry[];
  full_text: string;
}

function extractYouTubeId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const match = urlOrId.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (match) return match[1];
  if (urlOrId.length === 11 && /^[a-zA-Z0-9_-]+$/.test(urlOrId)) {
    return urlOrId;
  }
  return null;
}

function formatSeconds(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

export const YouTubeIntelligenceModal: React.FC<YouTubeIntelligenceModalProps> = ({
  isOpen,
  onClose,
  videoUrlOrId,
  videoTitle,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'transcript' | 'summary' | 'raw'>('transcript');
  const [transcriptData, setTranscriptData] = useState<TranscriptData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [selectedTimestamp, setSelectedTimestamp] = useState<number | null>(null);

  const videoId = useMemo(() => {
    return videoUrlOrId ? extractYouTubeId(videoUrlOrId) : null;
  }, [videoUrlOrId]);

  useEffect(() => {
    if (!isOpen || !videoId) return;

    const fetchTranscript = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('http://127.0.0.1:4000/api/youtube/transcript', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ video_id: videoId }),
        });
        const data = await res.json();
        if (res.ok) {
          setTranscriptData(data);
        } else {
          setError(data.error || 'Failed to retrieve transcript');
        }
      } catch (err: any) {
        setError(err.message || 'Error connecting to transcript API');
      } finally {
        setLoading(false);
      }
    };

    fetchTranscript();
  }, [isOpen, videoId]);

  if (!isOpen || !videoId) return null;

  const filteredEntries = useMemo(() => {
    if (!transcriptData?.entries) return [];
    if (!searchQuery.trim()) return transcriptData.entries;
    const q = searchQuery.toLowerCase();
    return transcriptData.entries.filter((e) => e.text.toLowerCase().includes(q));
  }, [transcriptData, searchQuery]);

  const handleCopyFullText = async () => {
    if (!transcriptData?.full_text) return;
    try {
      await navigator.clipboard.writeText(transcriptData.full_text);
      setCopied(true);
      toast.success('Transcript copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleDiscussInChat = () => {
    if (!transcriptData) return;
    const prompt = encodeURIComponent(
      `Please provide an executive summary, main methodology insights, and practical takeaways from this YouTube video titled "${transcriptData.title}":\n\nFull Video Transcript:\n${transcriptData.full_text.slice(0, 4000)}...`
    );
    navigate(`/chat?q=${prompt}`);
  };

  const iframeSrc = selectedTimestamp !== null
    ? `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&start=${Math.floor(selectedTimestamp)}`
    : `https://www.youtube-nocookie.com/embed/${videoId}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl h-[90vh] rounded-3xl bg-white dark:bg-[#0c101a] border border-slate-200 dark:border-white/15 shadow-2xl flex flex-col overflow-hidden text-slate-900 dark:text-white select-none">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-[#111522]/80 backdrop-blur-md flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-red-600 flex items-center justify-center text-white shadow-sm flex-shrink-0">
              <Video size={16} />
            </div>

            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                YouTube Video Intelligence & Transcript
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xl">
                {videoTitle || transcriptData?.title || 'YouTube Lecture / Presentation'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={handleDiscussInChat}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold shadow-sm transition-all"
            >
              <Sparkles size={13} />
              <span>Analyze in AI Chat</span>
            </button>

            <button
              type="button"
              onClick={() => openExternalLink(`https://www.youtube.com/watch?v=${videoId}`)}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              title="Open in YouTube"
            >
              <ExternalLink size={16} />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Main Content: 2 Columns */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Left Column: Embedded Video & Controls (Columns 1-6) */}
          <div className="lg:col-span-6 flex flex-col p-4 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-black/20 overflow-y-auto">
            {/* Embedded Player */}
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-md border border-black/10 dark:border-white/10">
              <iframe
                src={iframeSrc}
                title="YouTube Video Player"
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            {/* Video Metadata Box */}
            <div className="mt-4 p-4 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 flex flex-col gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2">
                {transcriptData?.title || videoTitle || 'YouTube Video'}
              </h3>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-white/5">
                <span className="flex items-center gap-1 font-mono">
                  <Clock size={12} />
                  <span>{transcriptData?.entry_count || 0} transcript segments</span>
                </span>

                <button
                  type="button"
                  onClick={() => openExternalLink(`https://www.youtube.com/watch?v=${videoId}`)}
                  className="text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 font-medium ml-auto"
                >
                  <span>youtube.com/watch?v={videoId}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Transcript, AI Summary & Search (Columns 7-12) */}
          <div className="lg:col-span-6 flex flex-col overflow-hidden bg-white dark:bg-[#0c101a]">
            {/* Tab Navigation */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.02]">
              <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-200/80 dark:bg-white/10">
                <button
                  type="button"
                  onClick={() => setActiveTab('transcript')}
                  className={cn(
                    'px-3 py-1 rounded-lg text-xs font-semibold transition-all',
                    activeTab === 'transcript'
                      ? 'bg-white dark:bg-[#121622] text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
                  )}
                >
                  Timestamped Transcript
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('summary')}
                  className={cn(
                    'px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1',
                    activeTab === 'summary'
                      ? 'bg-white dark:bg-[#121622] text-cyan-600 dark:text-cyan-300 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
                  )}
                >
                  <Sparkles size={12} />
                  <span>AI Summary</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('raw')}
                  className={cn(
                    'px-3 py-1 rounded-lg text-xs font-semibold transition-all',
                    activeTab === 'raw'
                      ? 'bg-white dark:bg-[#121622] text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
                  )}
                >
                  Full Text
                </button>
              </div>

              {transcriptData && (
                <button
                  type="button"
                  onClick={handleCopyFullText}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  title="Copy full text"
                >
                  {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              )}
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-4 select-text">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full py-16 gap-3">
                  <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    Extracting audio tracks and subtitle transcript from YouTube...
                  </p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center h-full py-16 text-center px-6">
                  <Video size={40} className="text-slate-300 dark:text-slate-600 mb-2" />
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
                    Transcript Unavailable
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-4">
                    {error}. You can still watch the video directly or open it on YouTube.
                  </p>
                  <button
                    type="button"
                    onClick={() => openExternalLink(`https://www.youtube.com/watch?v=${videoId}`)}
                    className="px-4 py-1.5 rounded-xl bg-cyan-600 text-white text-xs font-semibold"
                  >
                    Open on YouTube
                  </button>
                </div>
              ) : activeTab === 'transcript' ? (
                /* Timestamped Transcript Tab */
                <div className="flex flex-col gap-3">
                  {/* Search inside transcript */}
                  <div className="relative">
                    <Search
                      size={13}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                    <input
                      type="text"
                      placeholder="Filter transcript keywords..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-4 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  {/* List of timed segments */}
                  <div className="flex flex-col gap-1.5">
                    {filteredEntries.map((entry, idx) => (
                      <button
                        key={`${entry.start}_${idx}`}
                        type="button"
                        onClick={() => setSelectedTimestamp(entry.start)}
                        className="flex items-start gap-3 p-2 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors group cursor-pointer"
                      >
                        <span className="text-[11px] font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded-md flex-shrink-0 group-hover:bg-rose-500/20">
                          {formatSeconds(entry.start)}
                        </span>
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                          {entry.text}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : activeTab === 'summary' ? (
                /* AI Summary Tab */
                <div className="flex flex-col gap-4">
                  <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-800 dark:text-cyan-200 flex items-start gap-2.5">
                    <Sparkles size={16} className="text-cyan-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block mb-0.5">Automated Intelligence Breakdown</span>
                      <span>
                        Extracted from {transcriptData?.entry_count || 0} transcript intervals.
                      </span>
                    </div>
                  </div>

                  <div className="prose dark:prose-invert prose-xs max-w-none text-xs text-slate-700 dark:text-slate-300 space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Core Topics Covered
                    </h4>
                    <p className="leading-relaxed">
                      This lecture / presentation analyzes key technical concepts from {transcriptData?.title}.
                      Click the &ldquo;Analyze in AI Chat&rdquo; button above to generate a full interactive multi-chapter synthesis with follow-up Q&A!
                    </p>

                    <button
                      type="button"
                      onClick={handleDiscussInChat}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm"
                    >
                      <Sparkles size={14} />
                      <span>Start Deep Conversation in AI Chat</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Full Text Tab */
                <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-serif whitespace-pre-wrap">
                  {transcriptData?.full_text}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default YouTubeIntelligenceModal;
