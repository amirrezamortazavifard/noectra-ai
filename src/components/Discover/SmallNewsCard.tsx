import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { NewsItem } from '@/lib/services/discover/types';
import { ExternalLink, Sparkles, Newspaper, Calendar, ArrowUpRight } from 'lucide-react';
import { openExternalLink } from '@/lib/openExternal';
import { formatTimeDifference } from '@/lib/utils';

interface SmallNewsCardProps {
  item: NewsItem;
  onSelectArticle?: (item: NewsItem) => void;
}

export const SmallNewsCard: React.FC<SmallNewsCardProps> = ({
  item,
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
      return 'from-cyan-950/50 via-slate-900 to-[#0c1017] text-cyan-400';
    }
    if (s.includes('nature') || c.includes('science')) {
      return 'from-purple-950/50 via-slate-900 to-[#0c1017] text-purple-400';
    }
    if (s.includes('finance') || c.includes('business')) {
      return 'from-emerald-950/50 via-slate-900 to-[#0c1017] text-emerald-400';
    }
    return 'from-sky-950/50 via-slate-900 to-[#0c1017] text-sky-400';
  };

  const themeClass = getGradientTheme(item.source, item.category);

  return (
    <div className="flex flex-col rounded-xl overflow-hidden bg-white/60 dark:bg-[#101319]/70 backdrop-blur-md border border-black/[0.06] dark:border-white/[0.08] hover:border-cyan-500/40 dark:hover:border-cyan-500/30 shadow-sm hover:shadow-md transition-all duration-300 group">
      {/* Thumbnail or Stylized Fallback */}
      <div
        onClick={handleOpenLink}
        className="relative h-36 w-full overflow-hidden bg-[#0a0d13] flex items-center justify-center cursor-pointer select-none"
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
          <div className={`w-full h-full p-3.5 flex flex-col justify-between bg-gradient-to-br ${themeClass} relative overflow-hidden`}>
            <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-cyan-500/10 blur-xl pointer-events-none" />
            <div className="flex items-center justify-between z-10">
              <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-white/10 dark:bg-white/5 backdrop-blur-md border border-white/10 text-white/90">
                {item.source}
              </span>
              <Newspaper size={15} className="opacity-60 text-white" />
            </div>
            <div className="z-10">
              <div className="text-[11px] font-medium text-white/70 line-clamp-2 leading-snug">
                {item.title}
              </div>
            </div>
          </div>
        )}

        {/* Source Badge on Image */}
        {imageUrl && !imageError && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-medium bg-black/75 backdrop-blur-md text-white border border-white/10 shadow-sm">
            {item.source}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-3.5 flex flex-col flex-1">
        <div className="flex items-center justify-between gap-1 text-[11px] text-black/40 dark:text-white/40 mb-1.5 font-mono">
          <span>{item.source}</span>
          {item.publishedAt && (
            <span className="flex items-center gap-1">
              <Calendar size={10} />
              {formatTimeDifference(new Date(), item.publishedAt)} ago
            </span>
          )}
        </div>

        <h3
          onClick={handleOpenLink}
          className="font-medium text-[13px] mb-1.5 leading-snug line-clamp-2 text-black dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors cursor-pointer"
        >
          <span className="hover:underline">
            {item.title}
          </span>
        </h3>

        <p className="text-black/60 dark:text-white/60 text-xs leading-relaxed line-clamp-2 mb-3 flex-1">
          {item.description}
        </p>

        {/* Actions Footer */}
        <div className="flex items-center justify-between pt-2.5 border-t border-black/[0.05] dark:border-white/[0.06] mt-auto">
          <Link
            to={`/chat?q=${chatPrompt}`}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 transition-colors group/btn"
          >
            <Sparkles size={12} className="group-hover/btn:rotate-12 transition-transform" />
            <span>Summarize with AI</span>
          </Link>

          <button
            type="button"
            onClick={handleOpenLink}
            className="inline-flex items-center gap-0.5 text-[11px] text-black/50 dark:text-white/50 hover:text-cyan-600 dark:hover:text-cyan-400 hover:underline transition-colors"
          >
            <span>Read</span>
            <ArrowUpRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SmallNewsCard;
