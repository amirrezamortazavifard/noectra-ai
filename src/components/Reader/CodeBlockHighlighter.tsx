'use client';

import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Check, Copy } from 'lucide-react';

interface CodeBlockHighlighterProps {
  code: string;
  language?: string;
  isDark?: boolean;
}

export const CodeBlockHighlighter: React.FC<CodeBlockHighlighterProps> = ({
  code,
  language = 'text',
  isDark = true,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const detectedLang = language.toLowerCase().replace(/^language-/, '') || 'typescript';

  return (
    <div className="relative my-4 rounded-2xl overflow-hidden border border-slate-200/80 dark:border-white/10 shadow-sm bg-slate-950 font-mono text-xs">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/90 dark:bg-black/60 border-b border-white/[0.08] text-slate-400 select-none">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan-400">
          {detectedLang}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] text-slate-400 hover:text-white bg-white/[0.06] hover:bg-white/[0.1] transition-colors"
          title="Copy Code"
        >
          {copied ? (
            <>
              <Check size={12} className="text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Syntax Highlighting Container */}
      <div className="p-3 overflow-x-auto text-xs leading-relaxed scrollbar-thin">
        <SyntaxHighlighter
          language={detectedLang}
          style={isDark ? oneDark : oneLight}
          customStyle={{
            margin: 0,
            padding: 0,
            background: 'transparent',
            fontSize: '12px',
          }}
          wrapLongLines={false}
        >
          {code.trim()}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

export default CodeBlockHighlighter;

