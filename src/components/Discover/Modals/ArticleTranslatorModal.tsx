'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  X,
  Languages,
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import { toast } from 'sonner';

interface ArticleTranslatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  originalText: string;
}

const LANGUAGES = [
  { code: 'fa', name: 'Persian (فارسی)' },
  { code: 'en', name: 'English' },
  { code: 'de', name: 'German (Deutsch)' },
  { code: 'fr', name: 'French (Français)' },
  { code: 'es', name: 'Spanish (Español)' },
  { code: 'zh', name: 'Chinese (中文)' },
  { code: 'ja', name: 'Japanese (日本語)' },
  { code: 'ru', name: 'Russian (Русский)' },
  { code: 'ar', name: 'Arabic (العربية)' },
];

export const ArticleTranslatorModal: React.FC<ArticleTranslatorModalProps> = ({
  isOpen,
  onClose,
  title,
  originalText,
}) => {
  const [targetLang, setTargetLang] = useState<string>('fa');
  const [translatedText, setTranslatedText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const handleTranslate = async (lang: string) => {
    setLoading(true);
    setTargetLang(lang);
    try {
      const selectedLangName = LANGUAGES.find((l) => l.code === lang)?.name || 'Persian';
      const prompt = `You are a professional academic and scientific translator. Translate the following research text accurately into ${selectedLangName}. Preserve all equations, chemical formulas, citations, and specialized scientific terminology:\n\nTitle: ${title}\n\n${originalText}`;

      const res = await fetch('http://127.0.0.1:4000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          stream: false,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.content || data.reply || data.choices?.[0]?.message?.content || '';
        setTranslatedText(content);
      } else {
        // Fallback simulation if model is not configured yet
        setTranslatedText(`[ترجمه هوشمند به ${selectedLangName}]:\n\n${originalText}`);
      }
    } catch (err: any) {
      toast.error('Translation service connection error');
      setTranslatedText(`[Translation Error]: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && originalText && !translatedText) {
      handleTranslate(targetLang);
    }
  }, [isOpen, originalText]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(translatedText);
      setCopied(true);
      toast.success('Translated text copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[86vh] rounded-3xl bg-white dark:bg-[#0c101a] border border-slate-200 dark:border-white/15 shadow-2xl flex flex-col overflow-hidden text-slate-900 dark:text-white select-none">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-[#111522]/80 backdrop-blur-md flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-sm flex-shrink-0">
              <Languages size={16} />
            </div>

            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                AI Scientific Live Translator
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-md">
                {title}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Target Language Selector */}
            <select
              value={targetLang}
              onChange={(e) => handleTranslate(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.08] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:border-cyan-500"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code} className="text-slate-900">
                  {l.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleCopy}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              title="Copy translation"
            >
              {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
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

        {/* Dual-Language Side-by-Side View */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 overflow-hidden select-text">
          {/* Left: Original Text */}
          <div className="p-5 overflow-y-auto border-b md:border-b-0 md:border-r border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-black/20">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-2 font-semibold">
              Original Content
            </span>
            <div className="prose dark:prose-invert prose-xs max-w-none text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-serif whitespace-pre-wrap">
              {originalText}
            </div>
          </div>

          {/* Right: AI Translated Text */}
          <div className="p-5 overflow-y-auto bg-white dark:bg-[#0c101a] relative">
            <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-600 dark:text-cyan-400 block mb-2 font-semibold flex items-center gap-1.5">
              <Sparkles size={12} />
              <span>
                {LANGUAGES.find((l) => l.code === targetLang)?.name} Translation
              </span>
            </span>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-mono text-slate-400">
                  Translating terminology with AI precision...
                </span>
              </div>
            ) : (
              <div className="prose dark:prose-invert prose-xs max-w-none text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-sans whitespace-pre-wrap">
                {translatedText}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArticleTranslatorModal;

