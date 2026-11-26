export type ModelMode = 'offline' | 'online';

export interface GpuInfo {
  name: string;
  vram_mb: number;
  vendor: string;
}

export interface BackendInfo {
  id: string;
  name: string;
  available: boolean;
  description: string;
}

export interface SystemInfo {
  cpu_name: string;
  cpu_cores: number;
  cpu_threads: number;
  total_ram_mb: number;
  available_ram_mb: number;
  gpus: GpuInfo[];
  os: string;
  arch: string;
  available_backends: BackendInfo[];
  recommended_backend: string;
}

export interface SuggestedConfig {
  n_gpu_layers: number;
  n_ctx: number;
  parallel: number;
  can_fit_fully_in_vram: boolean;
  estimated_vram_usage_mb: number;
  notes: string;
}

export interface ServerConfig {
  model_path: string;
  mmproj_path: string | null;
  host: string;
  port: number;
  n_ctx: number;
  n_gpu_layers: number;
  n_threads: number | null;
  flash_attn: string;
  cache_type_k: string;
  cache_type_v: string;
  temperature: number;
  top_k: number;
  min_p: number;
  top_p: number;
  n_predict: number;
  n_batch: number;
  n_ubatch: number;
  cont_batching: boolean;
  mlock: boolean;
  no_mmap: boolean;
  seed: number | null;
  rope_freq_scale: number | null;
  rope_freq_base: number | null;
  grp_attn_n: number | null;
  grp_attn_w: number | null;
  parallel: number;
  no_mmproj_offload: boolean;
  extra_params: Record<string, string>;
}

export interface ManagedRuntime {
  build: number;
  tag_name: string;
  backend_id: string;
  backend_label: string;
  asset_name: string;
  dir_name: string;
  installed_at: number;
}

export interface CustomRuntime {
  label: string;
  binary_path: string;
}

export type ActiveRuntime =
  | { type: 'managed'; build?: number; backend_id?: string }
  | { type: 'custom'; binary_path?: string }
  | { type: 'none' };

export interface LocalLlmConfig {
  base_dir: string;
  model_dirs: string[];
  download_dir: string | null;
  server_config: ServerConfig;
  selected_model_id: string | null;
  managed_runtimes: ManagedRuntime[];
  custom_runtimes: CustomRuntime[];
  active_runtime: ActiveRuntime;
  auto_delete_old_runtimes: boolean;
  extra_model_files: string[];
}

export interface RuntimeInfo {
  installed: boolean;
  build: number | null;
  backend: string | null;
  path: string | null;
  server_binary: string | null;
  runtime_type: string;
}

export interface RuntimeOverview {
  info: RuntimeInfo;
  managed_runtimes: ManagedRuntime[];
  custom_runtimes: CustomRuntime[];
  auto_delete_old_runtimes: boolean;
}

export interface AssetOption {
  name: string;
  backend_id: string;
  backend_label: string;
  platform: string;
  download_url: string;
  size_mb: number;
  score: number;
}

export interface ReleaseInfo {
  tag_name: string;
  build: number;
  published_at: string;
  available_assets: AssetOption[];
}

export interface DownloadProgress {
  id: string;
  bytes_downloaded: number;
  total_bytes: number;
  percent: number;
  status: string;
}

export interface LocalModelInfo {
  id: string;
  name: string;
  repo_id: string;
  filename: string;
  path: string;
  size_bytes: number;
  quant: string | null;
  params_b: string | null;
  context_length: number | null;
  is_vision: boolean;
  mmproj_path: string | null;
  split_files: string[];
}

export interface HfFilePart {
  filename: string;
  size_bytes: number;
  download_url: string;
}

export interface HfFile {
  filename: string;
  size_bytes: number;
  quant: string | null;
  download_url: string;
  is_split: boolean;
  split_parts: HfFilePart[];
  is_mmproj: boolean;
}

export interface HfModel {
  repo_id: string;
  name: string;
  author: string;
  tags: string[];
  files: HfFile[];
  downloads: number;
  likes: number;
}

export interface RecommendedModel {
  id: string;
  name: string;
  repo_id: string;
  filename: string;
  description: string;
  params_b: number;
  family: string;
  quant: string;
  installed: boolean;
  installed_path: string | null;
}

export type ServerStatus =
  | { type: 'stopped' }
  | { type: 'starting' }
  | { type: 'running'; port: number; pid: number; host: string }
  | { type: 'error'; message: string };

export interface ServerStateSnapshot {
  status: ServerStatus;
  loaded_model_path: string | null;
  logs: string[];
}

export type ReasoningBudget = 'off' | 'short' | 'medium' | 'long' | 'none';
export type LengthLimit = 'short' | 'normal' | 'long' | 'none';

export interface SurvivalSettings {
  memoryAiWrites: boolean;
  customInstructions: string | null;
  reasoningBudget: ReasoningBudget;
  lengthLimit: LengthLimit;
  filesDir: string | null;
  offlineLibraryEnabled: boolean;
  modelMode: ModelMode;
}

export interface MemoryEvent {
  type: string;
  action: 'add' | 'change' | 'delete' | 'full';
  note: string;
  old: string;
  at?: number | null;
  before?: string[];
  after?: string[];
}

export interface PersonalFileInfo {
  id: string;
  name: string;
  title: string;
  sizeBytes: number;
  modifiedTs: number;
  passageCount: number;
}

export interface LibrarySearchHit {
  id: string;
  title: string;
  sourceLabel: string;
  sourceKey: string;
  url: string;
  snippet: string;
  authority: number;
  score: number;
}

export interface LibraryPassageView {
  id: string;
  ordinal: number;
  heading: string;
  text: string;
}

export interface LibraryDocumentView {
  id: string;
  title: string;
  sourceLabel: string;
  url: string;
  highlightPassageId: string | null;
  highlightText: string | null;
  text: string;
  passages: LibraryPassageView[];
}
