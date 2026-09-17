import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { NewsItem } from '@/lib/services/discover/types';
import { ExternalLink, Sparkles, Newspaper, Calendar, ArrowUpRight } from 'lucide-react';
import { openExternalLink } from '@/lib/openExternal';
import { formatTimeDifference } from '@/lib/utils';

interface MajorNewsCardProps {
  item: NewsItem;
  isLeft?: boolean;
  onSelectArticle?: (item: NewsItem) => void;
}

export const MajorNewsCard: React.FC<MajorNewsCardProps> = ({
  item,
  isLeft = true,
  onSelectArticle,
}) => {
  const [imageError, setImageError] = useState(false);
  const imageUrl = item.imageUrl;

  const chatPrompt = encodeURIComponent(
    `Please summarize this news article in depth:\nTitle: "${item.title}"\nSource: ${item.source}\nURL: ${item.url}\n\nExcerpt:\n${item.description}`
  );

  const handleOpenLink = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onSelectArticle) {
      onSelectArticle(item);
    } else {
      openExternalLink(item.url, e);
    }
  };

  const getGradientTheme = (source: string = '', cat: string = '') => {
    const s = source.toLowerCase();
    const c = cat.toLowerCase();
    if (s.includes('wired') || s.includes('verge') || c.includes('tech') || c.includes('ai')) {
      return 'from-cyan-950/60 via-blue-950/40 to-[#0c1017] border-cyan-500/30 text-cyan-400';
    }
    if (s.includes('nature') || c.includes('science')) {
      return 'from-purple-950/60 via-violet-950/40 to-[#0c1017] border-purple-500/30 text-purple-400';
    }
    if (s.includes('finance') || c.includes('business')) {
      return 'from-emerald-950/60 via-teal-950/40 to-[#0c1017] border-emerald-500/30 text-emerald-400';
    }
    return 'from-sky-950/60 via-slate-900/50 to-[#0c1017] border-sky-500/30 text-sky-400';
  };

  const themeClass = getGradientTheme(item.source, item.category);

  const imageSection = (
    <div
      onClick={handleOpenLink}
      className="relative w-full md:w-72 lg:w-80 h-44 md:h-auto overflow-hidden rounded-xl flex-shrink-0 bg-[#0a0d13] flex items-center justify-center cursor-pointer select-none"
    >
      {imageUrl && !imageError ? (
        <img
          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
          src={imageUrl}
          alt={item.title}
          loading="lazy"
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className={`w-full h-full p-4 flex flex-col justify-between bg-gradient-to-br ${themeClass} relative overflow-hidden`}>
          {/* Ambient Glow Orb */}
          <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-cyan-500/10 blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between z-10">
            <span className="text-[11px] font-semibold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-white/10 dark:bg-white/5 backdrop-blur-md border border-white/10 text-white/90">
              {item.source}
            </span>
            <Newspaper size={18} className="opacity-60 text-white" />
          </div>
          <div className="z-10">
            <div className="text-xs font-medium text-white/70 line-clamp-2 leading-snug">
              {item.title}
            </div>
          </div>
        </div>
      )}

      {/* Source Pill on top */}
      {imageUrl && !imageError && (
        <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-black/75 backdrop-blur-md text-white border border-white/10 shadow-sm">
          {item.source}
        </span>
      )}
    </div>
  );

  const textSection = (
    <div className="flex flex-col justify-between flex-1 py-1">
      <div>
        <div className="flex items-center gap-2 mb-2 text-xs">
          <span className="px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 font-semibold border border-cyan-500/20 tracking-wide text-[10px] uppercase">
            Featured Story
          </span>
          <span className="text-black/30 dark:text-white/30">•</span>
          <span className="text-black/60 dark:text-white/60 font-medium text-xs">{item.source}</span>
          {item.publishedAt && (
            <>
              <span className="text-black/30 dark:text-white/30">•</span>
              <span className="text-black/40 dark:text-white/40 text-[11px] flex items-center gap-1 font-mono">
                <Calendar size={11} />
                {formatTimeDifference(new Date(), item.publishedAt)} ago
              </span>
            </>
          )}
        </div>

        <h2
          className="text-lg md:text-xl font-medium mb-2 leading-snug text-black dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors cursor-pointer"
          onClick={handleOpenLink}
        >
          <span className="hover:underline">
            {item.title}
          </span>
        </h2>

        <p className="text-black/60 dark:text-white/60 text-xs md:text-sm leading-relaxed line-clamp-2 md:line-clamp-3 mb-3">
          {item.description}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-black/[0.06] dark:border-white/[0.06] mt-auto">
        <Link
          to={`/chat?q=${chatPrompt}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 hover:shadow-[0_0_12px_rgba(56,189,248,0.25)] transition-all active:scale-95"
        >
          <Sparkles size={13} className="text-cyan-500" />
          <span>Summarize with AI</span>
        </Link>

        <button
          type="button"
          onClick={handleOpenLink}
          className="inline-flex items-center gap-1 text-xs text-black/50 dark:text-white/50 hover:text-cyan-600 dark:hover:text-cyan-400 hover:underline transition-colors"
        >
          <span>Read Story</span>
          <ArrowUpRight size={13} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="w-full group flex flex-col md:flex-row items-stretch gap-4 p-3.5 rounded-2xl bg-white/60 dark:bg-[#101319]/70 backdrop-blur-md border border-black/[0.07] dark:border-white/[0.08] hover:border-cyan-500/40 dark:hover:border-cyan-500/30 transition-all duration-300 shadow-sm hover:shadow-md">
      {isLeft ? (
        <>
          {imageSection}
          {textSection}
        </>
      ) : (
        <>
          {textSection}
          {imageSection}
        </>
      )}
    </div>
  );
};

export default MajorNewsCard;
