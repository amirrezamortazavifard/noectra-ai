export interface PredefinedProviderDef {
  key: string;
  name: string;
  color: string;
  baseUrl: string;
  docsUrl: string;
  apiKeyPlaceholder: string;
  defaultChatModels: { key: string; name: string }[];
  defaultEmbeddingModels?: { key: string; name: string }[];
  description: string;
}

export const PREDEFINED_PROVIDERS: PredefinedProviderDef[] = [
  {
    key: 'openai',
    name: 'OpenAI',
    color: '#10a37f',
    baseUrl: 'https://api.openai.com/v1',
    docsUrl: 'https://platform.openai.com/account/api-keys',
    apiKeyPlaceholder: 'sk-proj-...',
    defaultChatModels: [
      { key: 'gpt-4o', name: 'GPT-4o (Flagship Omni)' },
      { key: 'gpt-4o-mini', name: 'GPT-4o Mini (Fast & Efficient)' },
      { key: 'o3-mini', name: 'o3-mini (High-tier Reasoning)' },
      { key: 'gpt-4.5-preview', name: 'GPT-4.5 Preview' },
    ],
    defaultEmbeddingModels: [
      { key: 'text-embedding-3-small', name: 'Text Embedding 3 Small' },
      { key: 'text-embedding-3-large', name: 'Text Embedding 3 Large' },
    ],
    description: 'Industry standard multimodal models by OpenAI.',
  },
  {
    key: 'anthropic',
    name: 'Anthropic (Claude)',
    color: '#d4a574',
    baseUrl: 'https://api.anthropic.com/v1',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    apiKeyPlaceholder: 'sk-ant-api03-...',
    defaultChatModels: [
      { key: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet (Hybrid Reasoning)' },
      { key: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
      { key: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
    ],
    description: 'Deep reasoning, coding mastery, and nuanced comprehension.',
  },
  {
    key: 'gemini',
    name: 'Google Gemini',
    color: '#4285f4',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    docsUrl: 'https://aistudio.google.com/apikey',
    apiKeyPlaceholder: 'AIzaSy...',
    defaultChatModels: [
      { key: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
      { key: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
      { key: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
      { key: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (2M Context)' },
    ],
    defaultEmbeddingModels: [
      { key: 'text-embedding-004', name: 'Text Embedding 004' },
    ],
    description: 'Ultra-long context windows and high-speed processing by Google.',
  },
  {
    key: 'openrouter',
    name: 'OpenRouter',
    color: '#6366f1',
    baseUrl: 'https://openrouter.ai/api/v1',
    docsUrl: 'https://openrouter.ai/settings/keys',
    apiKeyPlaceholder: 'sk-or-v1-...',
    defaultChatModels: [
      { key: 'deepseek/deepseek-r1:free', name: 'DeepSeek-R1 (Free)' },
      { key: 'deepseek/deepseek-chat', name: 'DeepSeek-V3' },
      { key: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
      { key: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B' },
      { key: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash' },
      { key: 'qwen/qwen3-30b-a3b:free', name: 'Qwen 3 30B (Free)' },
    ],
    description: 'Unified gateway to hundreds of open-source and proprietary models.',
  },
  {
    key: 'groq',
    name: 'Groq (LPU Inference)',
    color: '#f55036',
    baseUrl: 'https://api.groq.com/openai/v1',
    docsUrl: 'https://console.groq.com/keys',
    apiKeyPlaceholder: 'gsk_...',
    defaultChatModels: [
      { key: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile' },
      { key: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant (Ultra-fast)' },
      { key: 'qwen-2.5-32b', name: 'Qwen 2.5 32B' },
      { key: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 Distill 70B' },
    ],
    description: 'Hardware-accelerated real-time token streaming with near-zero latency.',
  },
  {
    key: 'xai',
    name: 'xAI (Grok)',
    color: '#1d9bf0',
    baseUrl: 'https://api.x.ai/v1',
    docsUrl: 'https://console.x.ai/',
    apiKeyPlaceholder: 'xai-...',
    defaultChatModels: [
      { key: 'grok-2-latest', name: 'Grok 2' },
      { key: 'grok-2-vision-1212', name: 'Grok 2 Vision' },
      { key: 'grok-beta', name: 'Grok Beta' },
    ],
    description: 'Direct frontier reasoning and real-time knowledge synthesis.',
  },
  {
    key: 'mistral',
    name: 'Mistral AI',
    color: '#ff7000',
    baseUrl: 'https://api.mistral.ai/v1',
    docsUrl: 'https://console.mistral.ai/api-keys/',
    apiKeyPlaceholder: '...',
    defaultChatModels: [
      { key: 'mistral-large-latest', name: 'Mistral Large' },
      { key: 'mistral-small-latest', name: 'Mistral Small' },
      { key: 'codestral-latest', name: 'Codestral (Code Specialist)' },
      { key: 'pixtral-large-latest', name: 'Pixtral Large (Multimodal)' },
    ],
    defaultEmbeddingModels: [
      { key: 'mistral-embed', name: 'Mistral Embed' },
    ],
    description: 'European frontier models renowned for efficiency and multilingual power.',
  },
  {
    key: 'minimax',
    name: 'MiniMax',
    color: '#8b5cf6',
    baseUrl: 'https://api.minimax.io/v1',
    docsUrl: 'https://platform.minimax.io/user-center/basic-information/interface-key',
    apiKeyPlaceholder: 'eyJhbGciOi...',
    defaultChatModels: [
      { key: 'MiniMax-M2.7', name: 'MiniMax-M2.7 (Flagship Reasoning)' },
      { key: 'MiniMax-M2.7-highspeed', name: 'MiniMax-M2.7 HighSpeed' },
      { key: 'MiniMax-M2.5', name: 'MiniMax-M2.5 (204K Context)' },
    ],
    description: 'State-of-the-art Chinese & English bilingual reasoning with 204K context.',
  },
  {
    key: 'huggingface',
    name: 'Hugging Face (Inference Endpoints)',
    color: '#ffd21e',
    baseUrl: 'https://router.huggingface.co/v1',
    docsUrl: 'https://huggingface.co/settings/tokens',
    apiKeyPlaceholder: 'hf_...',
    defaultChatModels: [
      { key: 'deepseek-ai/DeepSeek-R1', name: 'DeepSeek-R1 (Hugging Face)' },
      { key: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek-V3' },
      { key: 'meta-llama/Llama-3.3-70B-Instruct', name: 'Llama 3.3 70B Instruct' },
    ],
    description: 'Open-weight ecosystem and community model router.',
  },
  {
    key: 'nvidia',
    name: 'NVIDIA NIM',
    color: '#76b900',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    docsUrl: 'https://build.nvidia.com/models',
    apiKeyPlaceholder: 'nvapi-...',
    defaultChatModels: [
      { key: 'meta/llama-3.3-70b-instruct', name: 'Llama 3.3 70B (NIM)' },
      { key: 'deepseek-ai/deepseek-r1', name: 'DeepSeek-R1 (NIM)' },
      { key: 'nvidia/llama-3.1-nemotron-70b-instruct', name: 'Nemotron 70B' },
    ],
    description: 'Enterprise GPU-optimized microservices for high throughput.',
  },
  {
    key: 'azure',
    name: 'Azure OpenAI',
    color: '#0078d4',
    baseUrl: 'https://YOUR-RESOURCE-NAME.openai.azure.com/openai/v1',
    docsUrl: 'https://oai.azure.com/',
    apiKeyPlaceholder: 'Azure API Key',
    defaultChatModels: [
      { key: 'gpt-4o', name: 'GPT-4o (Azure Deployment)' },
      { key: 'gpt-4o-mini', name: 'GPT-4o Mini (Azure Deployment)' },
    ],
    description: 'Enterprise-grade security, private endpoints and compliance SLAs.',
  },
  {
    key: 'ollama',
    name: 'Ollama (Local Engine)',
    color: '#f3f4f6',
    baseUrl: 'http://localhost:11434',
    docsUrl: 'https://ollama.com/',
    apiKeyPlaceholder: 'Not needed (Offline)',
    defaultChatModels: [
      { key: 'llama3.2', name: 'Llama 3.2' },
      { key: 'deepseek-r1', name: 'DeepSeek R1 (Local)' },
      { key: 'qwen2.5', name: 'Qwen 2.5' },
      { key: 'mistral', name: 'Mistral' },
    ],
    defaultEmbeddingModels: [
      { key: 'nomic-embed-text', name: 'Nomic Embed Text' },
    ],
    description: 'Run completely offline models locally on your GPU/CPU with zero cost.',
  },
  {
    key: 'lmstudio',
    name: 'LM Studio (Local Server)',
    color: '#22c55e',
    baseUrl: 'http://localhost:1234/v1',
    docsUrl: 'https://lmstudio.ai/',
    apiKeyPlaceholder: 'Not needed (Offline)',
    defaultChatModels: [
      { key: 'local-model', name: 'Active Loaded Model' },
    ],
    description: 'Run any local GGUF model via LM Studio local server.',
  },
  {
    key: 'custom',
    name: 'Custom OpenAI-Compatible / 9router',
    color: '#0ea5e9',
    baseUrl: 'http://localhost:8000/v1',
    docsUrl: '',
    apiKeyPlaceholder: 'Optional API Key',
    defaultChatModels: [
      { key: 'default-model', name: 'Default Model' },
    ],
    description: 'Any custom reverse proxy, vLLM, LiteLLM, or self-hosted endpoint.',
  },
];
