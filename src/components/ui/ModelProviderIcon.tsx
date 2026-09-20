import React from 'react';
import {
  SiOpenai,
  SiAnthropic,
  SiGooglegemini,
  SiOllama,
  SiNvidia,
  SiHuggingface,
  SiX,
} from '@icons-pack/react-simple-icons';
import { Cpu, Sparkles, Terminal } from 'lucide-react';

interface ModelProviderIconProps {
  provider?: string;
  modelKey?: string;
  size?: number;
  className?: string;
  showBackground?: boolean;
}

// Pixel-perfect SVG for Groq
const GroqIcon = ({ size = 16, className = '' }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.5h-2v-5h2v5zm-1-6.75c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25z" fill="none"/>
    <path d="M21.27 10.3c-.6-3.8-3.67-6.8-7.47-7.4C7.54 1.89 2.1 6.8 2.01 13.06c-.09 6.27 4.9 11.44 11.17 11.44 3.8 0 7.21-1.92 9.23-4.88l-2.48-1.55c-1.46 2.14-3.92 3.53-6.75 3.53-4.52 0-8.19-3.67-8.19-8.19 0-4.52 3.67-8.19 8.19-8.19 3.82 0 7.02 2.62 7.91 6.22l2.18-.74z" />
    <polygon points="12,7 12,13 16,13" fill="currentColor"/>
  </svg>
);

// Pixel-perfect SVG for Mistral AI (the iconic pixel M)
const MistralIcon = ({ size = 16, className = '' }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <rect x="2" y="3" width="4" height="4" rx="0.5" />
    <rect x="18" y="3" width="4" height="4" rx="0.5" />
    <rect x="2" y="7" width="8" height="4" rx="0.5" />
    <rect x="14" y="7" width="8" height="4" rx="0.5" />
    <rect x="2" y="11" width="20" height="4" rx="0.5" />
    <rect x="2" y="15" width="4" height="4" rx="0.5" />
    <rect x="10" y="15" width="4" height="4" rx="0.5" />
    <rect x="18" y="15" width="4" height="4" rx="0.5" />
    <rect x="2" y="19" width="4" height="4" rx="0.5" />
    <rect x="18" y="19" width="4" height="4" rx="0.5" />
  </svg>
);

// Pixel-perfect SVG for OpenRouter (neural mesh / nodes)
const OpenRouterIcon = ({ size = 16, className = '' }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <circle cx="6" cy="6" r="3" />
    <circle cx="18" cy="6" r="3" />
    <circle cx="12" cy="18" r="3" />
    <path
      d="M8.5 7.5l7 0M7.5 8.5l3.5 7M16.5 8.5l-3.5 7"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

// Pixel-perfect SVG for Microsoft Azure
const AzureIcon = ({ size = 16, className = '' }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M13.05 2.15a1 1 0 0 0-1.22.68L7.1 19.33a.75.75 0 0 0 .96.92l10.2-3.71a.75.75 0 0 0 .46-.5l2.4-9.6a1 1 0 0 0-.68-1.2l-7.39-3.09zm-2.2 13.9 2.5-6.5 2.5 5.5-5 1z" />
  </svg>
);

// Pixel-perfect SVG for LM Studio
const LMStudioIcon = ({ size = 16, className = '' }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
);

// Pixel-perfect SVG for DeepSeek (whale fin curve)
const DeepSeekIcon = ({ size = 16, className = '' }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M12 2C6.48 2 2 6.48 2 12c0 3.54 1.84 6.66 4.63 8.44L8 16c-1.24-1.1-2-2.71-2-4.5 0-3.31 2.69-6 6-6s6 2.69 6 6c0 1.79-.76 3.4-2 4.5l1.37 4.44C20.16 18.66 22 15.54 22 12c0-5.52-4.48-10-10-10zm0 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
  </svg>
);

// Pixel-perfect SVG for MiniMax
const MiniMaxIcon = ({ size = 16, className = '' }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M4 6h3v12H4zm5 3h3v9H9zm5-5h3v14h-3zm5 4h3v10h-3z" />
  </svg>
);

const NineRouterIcon = ({ size = 16, className = '' }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect width="20" height="8" x="2" y="14" rx="2" />
    <path d="M6 18h.01" />
    <path d="M10 18h.01" />
    <path d="M15 10v4" />
    <path d="M17.8 7.2a4 4 0 0 0-5.6 0" />
    <path d="M20.6 4.4a8 8 0 0 0-11.2 0" />
  </svg>
);

export function getProviderMeta(rawKey?: string, modelKey?: string) {
  const key = (rawKey || '').toLowerCase().trim();
  const model = (modelKey || '').toLowerCase().trim();

  // 1. Check direct provider key
  if (key.includes('openai') || model.startsWith('gpt') || model.startsWith('o1') || model.startsWith('o3')) {
    return { id: 'openai', name: 'OpenAI', color: '#10a37f', bg: 'rgba(16, 163, 127, 0.12)' };
  }
  if (key.includes('anthropic') || key.includes('claude') || model.includes('claude')) {
    return { id: 'anthropic', name: 'Anthropic', color: '#d4a574', bg: 'rgba(212, 165, 116, 0.12)' };
  }
  if (key.includes('gemini') || key.includes('google') || model.includes('gemini')) {
    return { id: 'gemini', name: 'Google Gemini', color: '#4285f4', bg: 'rgba(66, 133, 244, 0.12)' };
  }
  if (key.includes('deepseek') || model.includes('deepseek')) {
    return { id: 'deepseek', name: 'DeepSeek', color: '#4d6bfe', bg: 'rgba(77, 107, 254, 0.12)' };
  }
  if (key.includes('groq')) {
    return { id: 'groq', name: 'Groq', color: '#f55036', bg: 'rgba(245, 80, 54, 0.12)' };
  }
  if (key.includes('mistral') || model.includes('mistral') || model.includes('codestral') || model.includes('pixtral')) {
    return { id: 'mistral', name: 'Mistral AI', color: '#ff7000', bg: 'rgba(255, 112, 0, 0.12)' };
  }
  if (key.includes('openrouter')) {
    return { id: 'openrouter', name: 'OpenRouter', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.12)' };
  }
  if (key.includes('ollama')) {
    return { id: 'ollama', name: 'Ollama', color: '#f3f4f6', bg: 'rgba(255, 255, 255, 0.1)' };
  }
  if (key.includes('xai') || key.includes('grok') || model.includes('grok')) {
    return { id: 'xai', name: 'xAI', color: '#1d9bf0', bg: 'rgba(29, 155, 240, 0.12)' };
  }
  if (key.includes('nvidia')) {
    return { id: 'nvidia', name: 'NVIDIA NIM', color: '#76b900', bg: 'rgba(118, 185, 0, 0.12)' };
  }
  if (key.includes('huggingface') || key.includes('hf')) {
    return { id: 'huggingface', name: 'Hugging Face', color: '#ffd21e', bg: 'rgba(255, 210, 30, 0.12)' };
  }
  if (key.includes('azure')) {
    return { id: 'azure', name: 'Azure OpenAI', color: '#0078d4', bg: 'rgba(0, 120, 212, 0.12)' };
  }
  if (key.includes('lmstudio')) {
    return { id: 'lmstudio', name: 'LM Studio', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.12)' };
  }
  if (key.includes('minimax')) {
    return { id: 'minimax', name: 'MiniMax', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)' };
  }
  if (key.includes('9router')) {
    return { id: '9router', name: '9Router', color: '#818cf8', bg: 'rgba(129, 140, 248, 0.14)' };
  }

  return { id: 'custom', name: 'Custom AI', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.12)' };
}

export default function ModelProviderIcon({
  provider,
  modelKey,
  size = 16,
  className = '',
  showBackground = false,
}: ModelProviderIconProps) {
  const meta = getProviderMeta(provider, modelKey);

  const renderIcon = () => {
    switch (meta.id) {
      case 'openai':
        return <SiOpenai size={size} color={meta.color} className={className} />;
      case 'anthropic':
        return <SiAnthropic size={size} color={meta.color} className={className} />;
      case 'gemini':
        return <SiGooglegemini size={size} color={meta.color} className={className} />;
      case 'deepseek':
        return <DeepSeekIcon size={size} className={className} />;
      case 'groq':
        return <GroqIcon size={size} className={className} />;
      case 'mistral':
        return <MistralIcon size={size} className={className} />;
      case 'openrouter':
        return <OpenRouterIcon size={size} className={className} />;
      case 'ollama':
        return <SiOllama size={size} color={meta.color} className={className} />;
      case 'xai':
        return <SiX size={size} color={meta.color} className={className} />;
      case 'nvidia':
        return <SiNvidia size={size} color={meta.color} className={className} />;
      case 'huggingface':
        return <SiHuggingface size={size} color={meta.color} className={className} />;
      case 'azure':
        return <AzureIcon size={size} className={className} />;
      case 'lmstudio':
        return <LMStudioIcon size={size} className={className} />;
      case 'minimax':
        return <MiniMaxIcon size={size} className={className} />;
      case '9router':
        return <NineRouterIcon size={size} className={className} />;
      default:
        return <Cpu size={size} className={className} style={{ color: meta.color }} />;
    }
  };

  if (showBackground) {
    const boxSize = Math.max(size + 8, 24);
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-white/[0.06] shadow-sm shrink-0 transition-transform"
        style={{
          width: boxSize,
          height: boxSize,
          backgroundColor: meta.bg,
          color: meta.color,
        }}
      >
        {renderIcon()}
      </div>
    );
  }

  return (
    <span
      className="inline-flex items-center justify-center shrink-0"
      style={{ color: meta.color }}
    >
      {renderIcon()}
    </span>
  );
}
