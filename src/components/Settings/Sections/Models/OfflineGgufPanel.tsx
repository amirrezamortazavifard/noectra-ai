import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Cpu,
  Download,
  FilePlus2,
  FolderOpen,
  HardDrive,
  Loader2,
  Package,
  Play,
  RefreshCw,
  Search,
  Server,
  Sparkles,
  Square,
  Terminal,
  Trash2,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  CustomBuild,
  DownloadProgress,
  HfFile,
  HfModel,
  LocalLlmConfig,
  LocalModelInfo,
  RecommendedModel,
  ReleaseInfo,
  RuntimeOverview,
  ScanResult,
  ServerConfig,
  ServerStateSnapshot,
  SystemInfo,
} from '@/lib/localLlm/types';
import { useChat } from '@/lib/hooks/useChat';

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i >= 2 ? 2 : 0)} ${units[i]}`;
}

const OfflineGgufPanel = ({
  onModelsUpdated,
}: {
  onModelsUpdated?: () => void;
}) => {
  const { setChatModelProvider, setModelMode } = useChat();

  const [hardware, setHardware] = useState<SystemInfo | null>(null);
  const [config, setConfig] = useState<LocalLlmConfig | null>(null);
  const [serverConfig, setServerConfig] = useState<ServerConfig | null>(null);
  const [runtime, setRuntime] = useState<RuntimeOverview | null>(null);
  const [releaseInfo, setReleaseInfo] = useState<ReleaseInfo | null>(null);
  const [selectedAssetName, setSelectedAssetName] = useState<string>('');
  const [installedModels, setInstalledModels] = useState<LocalModelInfo[]>([]);
  const [recommendedModels, setRecommendedModels] = useState<RecommendedModel[]>([]);
  const [serverSnapshot, setServerSnapshot] = useState<ServerStateSnapshot | null>(null);
  const [downloads, setDownloads] = useState<DownloadProgress[]>([]);

  const [hfQuery, setHfQuery] = useState('Qwen3.5 GGUF');
  const [hfResults, setHfResults] = useState<HfModel[]>([]);
  const [expandedRepo, setExpandedRepo] = useState<string | null>(null);
  const [repoFiles, setRepoFiles] = useState<Record<string, HfFile[]>>({});
  const [hfSearching, setHfSearching] = useState(false);

  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingRelease, setLoadingRelease] = useState(false);
  const [startingServer, setStartingServer] = useState(false);
  const [startingModelPath, setStartingModelPath] = useState<string | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [customBuilds, setCustomBuilds] = useState<CustomBuild[] | null>(null);
  const [showAllAssets, setShowAllAssets] = useState(false);
  const [scanningRuntime, setScanningRuntime] = useState(false);
  const prevStatusRef = useRef<string>('stopped');

  const loadAll = useCallback(async () => {
    try {
      const [hwRes, cfgRes, rtRes, modRes, srvRes] = await Promise.all([
        fetch('/api/local-llm/hardware'),
        fetch('/api/local-llm/config'),
        fetch('/api/local-llm/runtime'),
        fetch('/api/local-llm/models'),
        fetch('/api/local-llm/server/status'),
      ]);
      if (hwRes.ok) setHardware(await hwRes.json());
      if (cfgRes.ok) {
        const c: LocalLlmConfig = await cfgRes.json();
        setConfig(c);
        setServerConfig(c.server_config);
      }
      if (rtRes.ok) setRuntime(await rtRes.json());
      if (modRes.ok) {
        const m = await modRes.json();
        setInstalledModels(m.installed ?? []);
        setRecommendedModels(m.recommended ?? []);
      }
      if (srvRes.ok) setServerSnapshot(await srvRes.json());
    } catch (err) {
      console.error('Failed loading Local GGUF state:', err);
    } finally {
      setLoadingInit(false);
    }
  }, []);

  useEffect(() => {
    loadAll().then(() => {
      fetch('/api/local-llm/runtime/latest')
        .then((r) => (r.ok ? r.json() : null))
        .then((rel: ReleaseInfo | null) => {
          if (rel) {
            setReleaseInfo(rel);
            if (rel.available_assets?.length > 0) {
              setSelectedAssetName(rel.available_assets[0].name);
            }
          }
        })
        .catch(() => {});
    });
  }, [loadAll]);

  // Poll downloads and server status while active
  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const [dlRes, srvRes] = await Promise.all([
          fetch('/api/local-llm/downloads'),
          fetch('/api/local-llm/server/status'),
        ]);
        if (dlRes.ok) {
          const list: DownloadProgress[] = await dlRes.json();
          setDownloads(list);
          if (list.some((d) => d.status === 'completed')) {
            loadAll();
            onModelsUpdated?.();
          }
        }
        if (srvRes.ok) {
          const snap: ServerStateSnapshot = await srvRes.json();
          setServerSnapshot(snap);
          if (snap.status.type !== 'starting') {
            setStartingModelPath(null);
            setStartingServer(false);
          }
          if (snap.status.type === 'running' && prevStatusRef.current === 'starting') {
            toast.success(`Model loaded and ready on port ${snap.status.port}!`);
          } else if (snap.status.type === 'error' && prevStatusRef.current === 'starting') {
            toast.error(`Server failed: ${snap.status.message}`);
            setShowLogs(true);
          }
          prevStatusRef.current = snap.status.type;
        }
      } catch {
        // ignore transient poll failures
      }
    }, 900);
    return () => clearInterval(timer);
  }, [loadAll, onModelsUpdated]);

  const handleFetchLatestRelease = async () => {
    setLoadingRelease(true);
    try {
      const res = await fetch('/api/local-llm/runtime/latest');
      if (!res.ok) throw new Error(await res.text());
      const rel: ReleaseInfo = await res.json();
      setReleaseInfo(rel);
      if (rel.available_assets.length > 0) {
        setSelectedAssetName(rel.available_assets[0].name);
      }
    } catch (e: any) {
      toast.error(`Failed to fetch llama.cpp release: ${e.message}`);
    } finally {
      setLoadingRelease(false);
    }
  };

  const handleDownloadRuntime = async () => {
    if (!releaseInfo) return;
    const asset = releaseInfo.available_assets.find((a) => a.name === selectedAssetName) ?? releaseInfo.available_assets[0];
    if (!asset) return;
    try {
      const res = await fetch('/api/local-llm/runtime/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset, tag_name: releaseInfo.tag_name }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success(`Downloading llama.cpp ${releaseInfo.tag_name} (${asset.backend_label})...`);
    } catch (e: any) {
      toast.error(`Runtime download error: ${e.message}`);
    }
  };

  const handleBrowseRuntime = async () => {
    try {
      const res = await fetch('/api/local-llm/runtime/browse', { method: 'POST' });
      const data = await res.json();
      if (!data.cancelled) {
        toast.success('Custom llama-server binary added & activated.');
        await loadAll();
        window.dispatchEvent(new CustomEvent('providers-updated'));
      }
    } catch (e: any) {
      toast.error(`Failed to browse runtime: ${e.message}`);
    }
  };

  const handleBrowseRuntimeFolder = async () => {
    setScanningRuntime(true);
    try {
      const res = await fetch('/api/local-llm/runtime/browse-dir', { method: 'POST' });
      const data: { cancelled: boolean; result?: ScanResult } = await res.json();
      if (data.cancelled) return;
      const result = data.result;
      if (!result || result.builds.length === 0) {
        setCustomBuilds(null);
        toast.error('No llama-server binary found inside the selected directory.');
      } else if (result.is_source_distribution || result.builds.length === 1) {
        setCustomBuilds(null);
        toast.success('llama.cpp build added & activated.');
        await loadAll();
        window.dispatchEvent(new CustomEvent('providers-updated'));
      } else {
        setCustomBuilds(result.builds);
        toast.info(`Found ${result.builds.length} builds — choose which build to activate.`);
      }
    } catch (e: any) {
      toast.error(`Folder scan failed: ${e.message}`);
    } finally {
      setScanningRuntime(false);
    }
  };

  const handleAutoDiscoverRuntime = async () => {
    setScanningRuntime(true);
    try {
      const res = await fetch('/api/local-llm/runtime/auto-discover', { method: 'POST' });
      const data = await res.json();
      await loadAll();
      window.dispatchEvent(new CustomEvent('providers-updated'));
      if (data.info?.installed) {
        toast.success(`Detected & activated llama-server (${data.info.backend || 'Custom'}).`);
      } else {
        toast.info('No pre-installed llama-server found on disk. Click Check / Download llama.cpp below.');
      }
    } catch (e: any) {
      toast.error(`Auto-detect failed: ${e.message}`);
    } finally {
      setScanningRuntime(false);
    }
  };

  const handleSelectCustomBuild = async (build: CustomBuild) => {
    try {
      const res = await fetch('/api/local-llm/runtime/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runtime_type: 'custom', custom_path: build.binary_path }),
      });
      if (!res.ok) throw new Error(await res.text());
      setCustomBuilds(null);
      toast.success(`Activated ${build.label}.`);
      await loadAll();
    } catch (e: any) {
      toast.error(`Failed activating build: ${e.message}`);
    }
  };

  const handleAddAllCustomBuilds = async () => {
    if (!customBuilds || customBuilds.length === 0) return;
    try {
      const res = await fetch('/api/local-llm/runtime/custom/add-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ builds: customBuilds }),
      });
      if (!res.ok) throw new Error(await res.text());
      setCustomBuilds(null);
      toast.success('All discovered builds added.');
      await loadAll();
    } catch (e: any) {
      toast.error(`Failed adding builds: ${e.message}`);
    }
  };

  const handleActivateManaged = async (build: number, backend_id: string) => {
    try {
      const res = await fetch('/api/local-llm/runtime/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runtime_type: 'managed', build, backend_id }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success(`Activated llama.cpp b${build}.`);
      await loadAll();
    } catch (e: any) {
      toast.error(`Activate failed: ${e.message}`);
    }
  };

  const handleActivateCustomIndex = async (index: number) => {
    try {
      const res = await fetch('/api/local-llm/runtime/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runtime_type: 'custom', custom_index: index }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success('Custom runtime activated.');
      await loadAll();
    } catch (e: any) {
      toast.error(`Activate failed: ${e.message}`);
    }
  };

  const handleDeleteManaged = async (build: number, backend_id: string) => {
    try {
      const res = await fetch(
        `/api/local-llm/runtime/managed?build=${build}&backend_id=${encodeURIComponent(backend_id)}`,
        { method: 'DELETE' },
      );
      if (!res.ok) throw new Error(await res.text());
      toast.success(`Deleted build b${build}.`);
      await loadAll();
    } catch (e: any) {
      toast.error(`Delete failed: ${e.message}`);
    }
  };

  const handleDeleteCustom = async (index: number) => {
    try {
      const res = await fetch(`/api/local-llm/runtime/custom?index=${index}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success('Removed custom runtime.');
      await loadAll();
    } catch (e: any) {
      toast.error(`Remove failed: ${e.message}`);
    }
  };

  const handleToggleAutoDelete = async (enabled: boolean) => {
    try {
      const res = await fetch('/api/local-llm/runtime/auto-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) throw new Error(await res.text());
      await loadAll();
    } catch (e: any) {
      toast.error(`Update failed: ${e.message}`);
    }
  };

  const handleBrowseGgufFile = async () => {
    try {
      const res = await fetch('/api/local-llm/models/browse-file', { method: 'POST' });
      const data = await res.json();
      if (!data.cancelled) {
        toast.success('GGUF model added to local library.');
        await loadAll();
        onModelsUpdated?.();
        window.dispatchEvent(new CustomEvent('providers-updated'));
      }
    } catch (e: any) {
      toast.error(`Failed to add GGUF file: ${e.message}`);
    }
  };

  const handleBrowseModelsDir = async () => {
    try {
      const res = await fetch('/api/local-llm/models/browse-dir', { method: 'POST' });
      const data = await res.json();
      if (!data.cancelled) {
        toast.success('GGUF scan directory added.');
        await loadAll();
        onModelsUpdated?.();
        window.dispatchEvent(new CustomEvent('providers-updated'));
      }
    } catch (e: any) {
      toast.error(`Failed to add folder: ${e.message}`);
    }
  };

  const handleRemoveModelsDir = async (dirPath: string) => {
    try {
      const res = await fetch('/api/local-llm/models/dirs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', path: dirPath }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success('Scan directory removed.');
      await loadAll();
      onModelsUpdated?.();
      window.dispatchEvent(new CustomEvent('providers-updated'));
    } catch (e: any) {
      toast.error(`Failed to remove folder: ${e.message}`);
    }
  };

  const handleDeleteModel = async (path: string) => {
    try {
      const res = await fetch(`/api/local-llm/models?path=${encodeURIComponent(path)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success('Model removed.');
      await loadAll();
      onModelsUpdated?.();
    } catch (e: any) {
      toast.error(`Delete failed: ${e.message}`);
    }
  };

  const handleSelectModelForChat = (model: LocalModelInfo) => {
    localStorage.setItem('chatModelProviderId', 'local-gguf');
    localStorage.setItem('chatModelKey', model.path);
    localStorage.setItem('modelMode', 'offline');
    setChatModelProvider({ providerId: 'local-gguf', key: model.path });
    setModelMode('offline');
    if (serverConfig) {
      setServerConfig({ ...serverConfig, model_path: model.path, mmproj_path: model.mmproj_path });
    }
    toast.success(`Selected ${model.name} for Offline Chat.`);
  };

  const handleAutoSuggestConfig = async () => {
    if (!serverConfig?.model_path) {
      toast.error('Select a GGUF model first so optimal GPU layers & context can be calculated.');
      return;
    }
    try {
      const res = await fetch('/api/local-llm/config/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_path: serverConfig.model_path }),
      });
      if (!res.ok) throw new Error(await res.text());
      const sug = await res.json();
      setServerConfig((prev) =>
        prev
          ? {
              ...prev,
              n_gpu_layers: sug.n_gpu_layers,
              n_ctx: sug.n_ctx,
              parallel: sug.parallel,
            }
          : prev,
      );
      toast.success(`Auto-tuned: ${sug.n_gpu_layers === -1 ? 'All' : sug.n_gpu_layers} GPU layers, ${sug.n_ctx} ctx. ${sug.notes}`);
    } catch (e: any) {
      toast.error(`Auto-tune failed: ${e.message}`);
    }
  };

  const handleSaveServerConfig = async (cfgToSave?: ServerConfig) => {
    const payloadCfg = cfgToSave ?? serverConfig;
    if (!payloadCfg) return;
    setSavingConfig(true);
    try {
      const res = await fetch('/api/local-llm/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ server_config: payloadCfg }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success('GGUF engine settings saved.');
    } catch (e: any) {
      toast.error(`Save failed: ${e.message}`);
    } finally {
      setSavingConfig(false);
    }
  };

  const handleStartServer = async (modelPath?: string) => {
    const targetPath = modelPath || serverConfig?.model_path || installedModels[0]?.path;
    if (!targetPath) {
      toast.error('Please add or download a GGUF model first.');
      return;
    }
    setStartingServer(true);
    setStartingModelPath(targetPath);
    prevStatusRef.current = 'starting';
    setServerConfig((prev) => (prev ? { ...prev, model_path: targetPath } : prev));
    try {
      const res = await fetch('/api/local-llm/server/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_path: targetPath,
          server_config: serverConfig,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.info('Starting llama-server and loading model weights...');
      const srvRes = await fetch('/api/local-llm/server/status');
      if (srvRes.ok) setServerSnapshot(await srvRes.json());
    } catch (e: any) {
      toast.error(`Failed to start server: ${e.message}`);
      setStartingServer(false);
      setStartingModelPath(null);
    }
  };

  const handleStopServer = async () => {
    try {
      await fetch('/api/local-llm/server/stop', { method: 'POST' });
      toast.success('llama-server stopped.');
      await loadAll();
    } catch (e: any) {
      toast.error(`Failed to stop server: ${e.message}`);
    }
  };

  const handleSearchHf = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!hfQuery.trim()) return;
    setHfSearching(true);
    try {
      const res = await fetch(`/api/local-llm/hf/search?q=${encodeURIComponent(hfQuery.trim())}`);
      if (!res.ok) throw new Error(await res.text());
      const data: HfModel[] = await res.json();
      setHfResults(data);
    } catch (err: any) {
      toast.error(`HuggingFace search error: ${err.message}`);
    } finally {
      setHfSearching(false);
    }
  };

  const handleInspectRepoFiles = async (repoId: string) => {
    if (expandedRepo === repoId) {
      setExpandedRepo(null);
      return;
    }
    setExpandedRepo(repoId);
    if (!repoFiles[repoId]) {
      try {
        const res = await fetch(`/api/local-llm/hf/files?repo_id=${encodeURIComponent(repoId)}`);
        if (!res.ok) throw new Error(await res.text());
        const files: HfFile[] = await res.json();
        setRepoFiles((prev) => ({ ...prev, [repoId]: files }));
      } catch (err: any) {
        toast.error(`Failed listing files: ${err.message}`);
      }
    }
  };

  const handleDownloadHfFile = async (repoId: string, file: HfFile) => {
    try {
      const res = await fetch('/api/local-llm/hf/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_id: repoId, file }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success(`Downloading ${file.filename}...`);
    } catch (err: any) {
      toast.error(`Download failed: ${err.message}`);
    }
  };

  const handleDownloadRecommended = async (rec: RecommendedModel) => {
    try {
      const res = await fetch(`/api/local-llm/hf/files?repo_id=${encodeURIComponent(rec.repo_id)}`);
      if (!res.ok) throw new Error(await res.text());
      const files: HfFile[] = await res.json();
      const target =
        files.find((f) => f.filename === rec.filename) ||
        files.find((f) => f.quant?.toUpperCase() === rec.quant.toUpperCase() && !f.is_mmproj) ||
        files.find((f) => !f.is_mmproj);
      if (!target) throw new Error('No downloadable GGUF file found in repository.');
      await handleDownloadHfFile(rec.repo_id, target);
    } catch (e: any) {
      toast.error(`Download setup failed: ${e.message}`);
    }
  };

  if (loadingInit) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-600 dark:text-white/70">
        <Loader2 className="animate-spin mr-2" size={18} />
        <span className="text-sm">Loading Offline GGUF Engine...</span>
      </div>
    );
  }

  const runtimeDl = downloads.find((d) => d.id === 'runtime');
  const activeDownloads = downloads.filter((d) => d.id !== 'runtime' && d.status !== 'completed');
  const serverStatus = serverSnapshot?.status ?? { type: 'stopped' };
  const isRunning = serverStatus.type === 'running';

  return (
    <div className="space-y-6 px-6 pb-8">
      {/* 1. Hardware Summary + Runtime Engine */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-light-200 dark:border-white/10 bg-white dark:bg-[#0c1017] p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold text-sm">
              <Cpu size={16} className="text-sky-500" />
              Hardware Profile
            </div>
            {hardware && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 font-medium">
                {hardware.recommended_backend.toUpperCase()} Recommended
              </span>
            )}
          </div>
          {hardware && (
            <div className="text-xs text-slate-700 dark:text-white/75 space-y-1">
              <p className="truncate font-medium text-slate-900 dark:text-white">{hardware.cpu_name}</p>
              <p>
                {hardware.cpu_cores} cores / {hardware.cpu_threads} threads · RAM:{' '}
                {(hardware.available_ram_mb / 1024).toFixed(1)} GB free /{' '}
                {(hardware.total_ram_mb / 1024).toFixed(1)} GB total
              </p>
              {hardware.gpus.length > 0 ? (
                hardware.gpus.map((g, idx) => (
                  <p key={idx} className="text-emerald-700 dark:text-emerald-400">
                    GPU: {g.name} ({(g.vram_mb / 1024).toFixed(1)} GB VRAM)
                  </p>
                ))
              ) : (
                <p className="text-amber-600 dark:text-amber-400">No discrete GPU detected — CPU inference active</p>
              )}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-light-200 dark:border-white/10 bg-white dark:bg-[#0c1017] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold text-sm">
              <Server size={16} className="text-emerald-500" />
              llama.cpp Runtime
            </div>
            {runtime?.info.installed ? (
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-medium">
                <CheckCircle2 size={12} />{' '}
                {runtime.info.build ? `b${runtime.info.build}` : 'Ready'} (
                {runtime.info.backend || runtime.info.runtime_type})
              </span>
            ) : (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-medium">
                Not Installed
              </span>
            )}
          </div>

          <p className="text-[11px] font-mono text-slate-600 dark:text-white/60 truncate" title={runtime?.info.server_binary || ''}>
            {runtime?.info.server_binary || 'Download llama.cpp, Auto-Detect, or scan a local folder containing llama-server.'}
          </p>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={handleFetchLatestRelease}
              disabled={loadingRelease}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-sky-600 hover:bg-sky-700 text-white transition"
            >
              {loadingRelease ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
              {releaseInfo ? `Latest: ${releaseInfo.tag_name}` : 'Download llama.cpp'}
            </button>
            <button
              type="button"
              onClick={handleAutoDiscoverRuntime}
              disabled={scanningRuntime}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 transition"
              title="Scan system PATH, LLM launcher folder, LM Studio, and common directories"
            >
              {scanningRuntime ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              Auto-Detect
            </button>
            <button
              type="button"
              onClick={handleBrowseRuntimeFolder}
              disabled={scanningRuntime}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-light-200 dark:border-white/15 bg-light-secondary dark:bg-dark-secondary text-slate-900 dark:text-white hover:bg-light-200 dark:hover:bg-white/10 transition"
            >
              <FolderOpen size={12} />
              Scan Folder
            </button>
            <button
              type="button"
              onClick={handleBrowseRuntime}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-light-200 dark:border-white/15 bg-light-secondary dark:bg-dark-secondary text-slate-900 dark:text-white hover:bg-light-200 dark:hover:bg-white/10 transition"
            >
              Pick .exe
            </button>
          </div>

          {customBuilds && customBuilds.length > 1 && (
            <div className="pt-2 border-t border-light-200 dark:border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  Multiple Builds Found ({customBuilds.length})
                </span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={handleAddAllCustomBuilds}
                    className="px-2 py-0.5 rounded bg-sky-600 text-white text-[11px] font-medium"
                  >
                    Add All
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomBuilds(null)}
                    className="px-2 py-0.5 rounded border border-light-200 dark:border-white/15 text-[11px]"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {customBuilds.map((b) => (
                  <button
                    key={b.binary_path}
                    type="button"
                    onClick={() => handleSelectCustomBuild(b)}
                    className="w-full text-left flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border border-light-200 dark:border-white/10 hover:bg-sky-500/10 text-xs"
                  >
                    <span className="font-medium text-slate-900 dark:text-white truncate">{b.label}</span>
                    <span className="text-[10px] font-mono text-slate-500 truncate max-w-[180px]">{b.binary_path}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {releaseInfo && releaseInfo.available_assets.length > 0 && (
            <div className="pt-2 border-t border-light-200 dark:border-white/10 space-y-2">
              <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                {(showAllAssets ? releaseInfo.available_assets : releaseInfo.available_assets.slice(0, 5)).map((a) => (
                  <button
                    key={a.name}
                    type="button"
                    onClick={() => setSelectedAssetName(a.name)}
                    className={`w-full text-left flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border text-xs transition ${
                      selectedAssetName === a.name
                        ? 'border-sky-500 bg-sky-500/10 text-slate-900 dark:text-white'
                        : 'border-light-200 dark:border-white/10 bg-light-secondary/40 dark:bg-white/[0.02] text-slate-700 dark:text-white/80 hover:bg-light-200/60 dark:hover:bg-white/10'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium truncate">{a.backend_label}</span>
                        {a.score >= 90 && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-medium">
                            Recommended
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-mono text-slate-500 dark:text-white/50 truncate">{a.name}</p>
                    </div>
                    <span className="text-[11px] font-mono shrink-0">{a.size_mb} MB</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between gap-2">
                {releaseInfo.available_assets.length > 5 && (
                  <button
                    type="button"
                    onClick={() => setShowAllAssets((v) => !v)}
                    className="text-[11px] text-sky-600 dark:text-sky-400 hover:underline"
                  >
                    {showAllAssets ? 'Show fewer' : `Show all ${releaseInfo.available_assets.length} builds`}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleDownloadRuntime}
                  className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition"
                >
                  <Download size={12} /> Download & Install
                </button>
              </div>
            </div>
          )}

          {runtime && (runtime.managed_runtimes.length > 0 || runtime.custom_runtimes.length > 0) && (
            <div className="pt-2 border-t border-light-200 dark:border-white/10 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-white/60">
                <span className="font-medium inline-flex items-center gap-1">
                  <Package size={12} /> Installed Runtimes
                </span>
                {runtime.managed_runtimes.length > 0 && (
                  <label className="inline-flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={runtime.auto_delete_old_runtimes}
                      onChange={(e) => handleToggleAutoDelete(e.target.checked)}
                    />
                    <span>Auto-delete old</span>
                  </label>
                )}
              </div>
              <div className="space-y-1 max-h-28 overflow-y-auto">
                {runtime.managed_runtimes.map((mr) => {
                  const isActive =
                    runtime.active_runtime?.type === 'managed' &&
                    runtime.active_runtime.build === mr.build &&
                    runtime.active_runtime.backend_id === mr.backend_id;
                  return (
                    <div
                      key={`${mr.build}-${mr.backend_id}`}
                      className="flex items-center justify-between gap-2 px-2 py-1 rounded-lg border border-light-200 dark:border-white/10 text-[11px]"
                    >
                      <span className="font-mono text-slate-900 dark:text-white truncate">
                        b{mr.build} · {mr.backend_label}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {isActive ? (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-medium">
                            Active
                          </span>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleActivateManaged(mr.build, mr.backend_id)}
                              className="p-1 rounded hover:bg-sky-500/15 text-sky-600 dark:text-sky-400"
                              title="Activate"
                            >
                              <Play size={11} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteManaged(mr.build, mr.backend_id)}
                              className="p-1 rounded hover:bg-rose-500/15 text-rose-600 dark:text-rose-400"
                              title="Delete"
                            >
                              <Trash2 size={11} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
                {runtime.custom_runtimes.map((cr, idx) => {
                  const isActive =
                    runtime.active_runtime?.type === 'custom' &&
                    runtime.active_runtime.index === idx;
                  return (
                    <div
                      key={`${cr.binary_path}-${idx}`}
                      className="flex items-center justify-between gap-2 px-2 py-1 rounded-lg border border-light-200 dark:border-white/10 text-[11px]"
                    >
                      <span className="truncate text-slate-900 dark:text-white" title={cr.binary_path}>
                        {cr.label} — <span className="font-mono text-slate-500">{cr.binary_path}</span>
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {isActive ? (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-medium">
                            Active
                          </span>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleActivateCustomIndex(idx)}
                              className="p-1 rounded hover:bg-sky-500/15 text-sky-600 dark:text-sky-400"
                              title="Activate"
                            >
                              <Play size={11} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCustom(idx)}
                              className="p-1 rounded hover:bg-rose-500/15 text-rose-600 dark:text-rose-400"
                              title="Remove"
                            >
                              <Trash2 size={11} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {runtimeDl && runtimeDl.status !== 'completed' && (
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-700 dark:text-white/75">
                <span>Runtime: {runtimeDl.status}</span>
                <span>{runtimeDl.percent.toFixed(1)}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-light-200 dark:bg-white/10 overflow-hidden">
                <div className="h-full bg-sky-500 transition-all" style={{ width: `${Math.min(100, runtimeDl.percent)}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Installed Offline GGUF Models */}
      <div className="rounded-xl border border-light-200 dark:border-white/10 bg-white dark:bg-[#0c1017] p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold text-sm">
            <HardDrive size={16} className="text-violet-500" />
            Installed GGUF Models ({installedModels.length})
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleBrowseGgufFile}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-light-200 dark:border-white/15 bg-light-secondary dark:bg-dark-secondary text-slate-900 dark:text-white hover:bg-light-200 dark:hover:bg-white/10 transition"
            >
              <FilePlus2 size={13} />
              Add .gguf File
            </button>
            <button
              type="button"
              onClick={handleBrowseModelsDir}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-light-200 dark:border-white/15 bg-light-secondary dark:bg-dark-secondary text-slate-900 dark:text-white hover:bg-light-200 dark:hover:bg-white/10 transition"
            >
              <FolderOpen size={13} />
              Add Scan Folder
            </button>
            <button
              type="button"
              onClick={loadAll}
              className="p-1.5 rounded-lg border border-light-200 dark:border-white/15 text-slate-700 dark:text-white/75 hover:bg-light-200 dark:hover:bg-white/10"
              title="Refresh models list"
            >
              <RefreshCw size={13} />
            </button>
          </div>
        </div>

        {config && config.model_dirs.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="text-slate-500 dark:text-white/50 font-medium">Scan Folders:</span>
            {config.model_dirs.map((dir) => (
              <span
                key={dir}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-light-200 dark:border-white/10 bg-light-secondary/70 dark:bg-white/[0.04] text-slate-700 dark:text-white/80 font-mono max-w-[280px]"
                title={dir}
              >
                <span className="truncate">{dir}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveModelsDir(dir)}
                  className="text-slate-400 hover:text-rose-500 ml-0.5"
                  title="Remove folder"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {serverStatus.type === 'starting' && (
          <div className="p-2.5 rounded-lg border border-sky-500/30 bg-sky-500/10 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 text-sky-800 dark:text-sky-200">
              <Loader2 size={14} className="animate-spin shrink-0" />
              <span className="truncate font-medium">
                {serverSnapshot?.logs?.slice(-1)[0] || 'Starting llama-server and loading model...'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleStopServer}
              className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-medium shrink-0"
            >
              Cancel
            </button>
          </div>
        )}

        {serverStatus.type === 'error' && (
          <div className="p-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between gap-2">
            <span className="truncate">{serverStatus.message}</span>
            <button
              type="button"
              onClick={() => setShowLogs(true)}
              className="px-2 py-0.5 rounded border border-rose-500/30 text-[11px] font-medium shrink-0"
            >
              View Logs
            </button>
          </div>
        )}

        {installedModels.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-600 dark:text-white/60 border border-dashed border-light-200 dark:border-white/10 rounded-lg">
            No `.gguf` models found yet. Add an existing `.gguf` file or download one below.
          </div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {installedModels.map((m) => {
              const isLoaded = isRunning && serverSnapshot?.loaded_model_path === m.path;
              const isThisStarting =
                (serverStatus.type === 'starting' && serverSnapshot?.loaded_model_path === m.path) ||
                (startingServer && startingModelPath === m.path);
              return (
                <div
                  key={m.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg border border-light-200 dark:border-white/10 bg-light-secondary/50 dark:bg-white/[0.03]"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                        {m.name}
                      </span>
                      {m.quant && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 text-slate-800 dark:text-white/80 font-mono">
                          {m.quant}
                        </span>
                      )}
                      {m.params_b && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-700 dark:text-sky-300">
                          {m.params_b}
                        </span>
                      )}
                      {m.is_vision && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-700 dark:text-purple-300">
                          Vision
                        </span>
                      )}
                      {isLoaded && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-medium">
                          Loaded
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-white/55 truncate mt-0.5">
                      {formatBytes(m.size_bytes)}
                      {m.context_length ? ` · ${m.context_length.toLocaleString()} ctx` : ''} · {m.path}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleSelectModelForChat(m)}
                      className="px-2.5 py-1 rounded-md text-xs font-medium bg-sky-600 hover:bg-sky-700 text-white transition"
                    >
                      Use in Chat
                    </button>
                    {isLoaded ? (
                      <button
                        type="button"
                        onClick={handleStopServer}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white transition"
                      >
                        <Square size={11} /> Stop
                      </button>
                    ) : isThisStarting ? (
                      <button
                        type="button"
                        onClick={handleStopServer}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white transition"
                        title="Loading model — click to cancel"
                      >
                        <Loader2 size={11} className="animate-spin" /> Loading...
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleStartServer(m.path)}
                        disabled={startingServer || serverStatus.type === 'starting'}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white transition"
                      >
                        <Play size={11} /> Start
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteModel(m.path)}
                      className="p-1.5 rounded-md text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition"
                      title="Delete model"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Engine Inference & Performance Settings */}
      {serverConfig && (
        <div className="rounded-xl border border-light-200 dark:border-white/10 bg-white dark:bg-[#0c1017] p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold text-sm">
              <Zap size={16} className="text-amber-500" />
              Engine Server & Inference Parameters
              <span
                className={`ml-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${
                  isRunning
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                    : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-white/70'
                }`}
              >
                {serverStatus.type === 'running'
                  ? `Running on :${serverStatus.port}`
                  : serverStatus.type === 'starting'
                  ? 'Starting...'
                  : 'Stopped'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleAutoSuggestConfig}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border border-light-200 dark:border-white/15 bg-light-secondary dark:bg-dark-secondary text-slate-900 dark:text-white hover:bg-light-200 dark:hover:bg-white/10"
              >
                <Sparkles size={12} /> Auto-Optimize
              </button>
              <button
                type="button"
                onClick={() => setShowLogs((v) => !v)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border border-light-200 dark:border-white/15 bg-light-secondary dark:bg-dark-secondary text-slate-900 dark:text-white hover:bg-light-200 dark:hover:bg-white/10"
              >
                <Terminal size={12} /> {showLogs ? 'Hide Logs' : 'Logs'}
              </button>
              <button
                type="button"
                onClick={() => handleSaveServerConfig()}
                disabled={savingConfig}
                className="px-3 py-1 rounded-lg text-xs font-medium bg-sky-600 hover:bg-sky-700 text-white transition"
              >
                {savingConfig ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <label className="space-y-1">
              <span className="text-slate-700 dark:text-white/75 font-medium block">Port</span>
              <input
                type="number"
                value={serverConfig.port}
                onChange={(e) => setServerConfig({ ...serverConfig, port: Number(e.target.value) || 8081 })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-light-200 dark:border-white/15 bg-white dark:bg-dark-secondary text-slate-900 dark:text-white font-medium"
              />
            </label>

            <label className="space-y-1">
              <span className="text-slate-700 dark:text-white/75 font-medium block">Context Size (0=auto)</span>
              <input
                type="number"
                value={serverConfig.n_ctx}
                onChange={(e) => setServerConfig({ ...serverConfig, n_ctx: Number(e.target.value) || 0 })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-light-200 dark:border-white/15 bg-white dark:bg-dark-secondary text-slate-900 dark:text-white font-medium"
              />
            </label>

            <label className="space-y-1">
              <span className="text-slate-700 dark:text-white/75 font-medium block">GPU Layers (-1=all)</span>
              <input
                type="number"
                value={serverConfig.n_gpu_layers}
                onChange={(e) => setServerConfig({ ...serverConfig, n_gpu_layers: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-light-200 dark:border-white/15 bg-white dark:bg-dark-secondary text-slate-900 dark:text-white font-medium"
              />
            </label>

            <label className="space-y-1">
              <span className="text-slate-700 dark:text-white/75 font-medium block">CPU Threads (blank=auto)</span>
              <input
                type="number"
                value={serverConfig.n_threads ?? ''}
                placeholder="Auto"
                onChange={(e) =>
                  setServerConfig({
                    ...serverConfig,
                    n_threads: e.target.value === '' ? null : Number(e.target.value),
                  })
                }
                className="w-full px-2.5 py-1.5 rounded-lg border border-light-200 dark:border-white/15 bg-white dark:bg-dark-secondary text-slate-900 dark:text-white font-medium"
              />
            </label>

            <label className="space-y-1">
              <span className="text-slate-700 dark:text-white/75 font-medium block">Batch Size</span>
              <input
                type="number"
                value={serverConfig.n_batch}
                onChange={(e) => setServerConfig({ ...serverConfig, n_batch: Number(e.target.value) || 512 })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-light-200 dark:border-white/15 bg-white dark:bg-dark-secondary text-slate-900 dark:text-white font-medium"
              />
            </label>

            <label className="space-y-1">
              <span className="text-slate-700 dark:text-white/75 font-medium block">Flash Attention</span>
              <select
                value={serverConfig.flash_attn}
                onChange={(e) => setServerConfig({ ...serverConfig, flash_attn: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-light-200 dark:border-white/15 bg-white dark:bg-dark-secondary text-slate-900 dark:text-white font-medium"
              >
                <option value="auto">Auto</option>
                <option value="on">On</option>
                <option value="off">Off</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-slate-700 dark:text-white/75 font-medium block">KV Cache (K)</span>
              <select
                value={serverConfig.cache_type_k}
                onChange={(e) => setServerConfig({ ...serverConfig, cache_type_k: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-light-200 dark:border-white/15 bg-white dark:bg-dark-secondary text-slate-900 dark:text-white font-medium"
              >
                <option value="f16">f16</option>
                <option value="q8_0">q8_0</option>
                <option value="q4_0">q4_0</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-slate-700 dark:text-white/75 font-medium block">KV Cache (V)</span>
              <select
                value={serverConfig.cache_type_v}
                onChange={(e) => setServerConfig({ ...serverConfig, cache_type_v: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-light-200 dark:border-white/15 bg-white dark:bg-dark-secondary text-slate-900 dark:text-white font-medium"
              >
                <option value="f16">f16</option>
                <option value="q8_0">q8_0</option>
                <option value="q4_0">q4_0</option>
              </select>
            </label>
          </div>

          <div className="flex flex-wrap gap-4 text-xs pt-1 text-slate-800 dark:text-white/85">
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={serverConfig.mlock}
                onChange={(e) => setServerConfig({ ...serverConfig, mlock: e.target.checked })}
              />
              <span>mlock (keep in RAM)</span>
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={serverConfig.cont_batching}
                onChange={(e) => setServerConfig({ ...serverConfig, cont_batching: e.target.checked })}
              />
              <span>Continuous Batching</span>
            </label>
          </div>

          {showLogs && serverSnapshot?.logs && (
            <pre className="mt-2 p-2.5 rounded-lg bg-slate-950 text-emerald-300 text-[11px] font-mono max-h-40 overflow-y-auto whitespace-pre-wrap">
              {serverSnapshot.logs.length > 0 ? serverSnapshot.logs.join('\n') : 'No llama-server logs yet.'}
            </pre>
          )}
        </div>
      )}

      {/* 4. HuggingFace GGUF Browser & Recommended Models */}
      <div className="rounded-xl border border-light-200 dark:border-white/10 bg-white dark:bg-[#0c1017] p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold text-sm">
            <Download size={16} className="text-sky-500" />
            Download Offline GGUF Models (HuggingFace)
          </div>
        </div>

        <form onSubmit={handleSearchHf} className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={hfQuery}
              onChange={(e) => setHfQuery(e.target.value)}
              placeholder="Search HuggingFace GGUF models (e.g. Qwen3.5, Gemma 3, Llama 3.2)..."
              className="w-full pl-9 pr-3 py-1.5 text-xs font-medium rounded-lg border border-light-200 dark:border-white/15 bg-white dark:bg-dark-secondary text-slate-900 dark:text-white"
            />
          </div>
          <button
            type="submit"
            disabled={hfSearching}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-sky-600 hover:bg-sky-700 text-white transition"
          >
            {hfSearching ? 'Searching...' : 'Search'}
          </button>
        </form>

        {activeDownloads.length > 0 && (
          <div className="space-y-2">
            {activeDownloads.map((dl) => (
              <div key={dl.id} className="p-2 rounded-lg border border-sky-500/20 bg-sky-500/5 text-xs space-y-1">
                <div className="flex justify-between font-medium text-slate-900 dark:text-white">
                  <span className="truncate">{dl.id}</span>
                  <span>
                    {formatBytes(dl.bytes_downloaded)} / {formatBytes(dl.total_bytes)} ({dl.percent.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-light-200 dark:bg-white/10 overflow-hidden">
                  <div className="h-full bg-sky-500 transition-all" style={{ width: `${Math.min(100, dl.percent)}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {hfResults.length > 0 ? (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {hfResults.map((repo) => (
              <div
                key={repo.repo_id}
                className="rounded-lg border border-light-200 dark:border-white/10 bg-light-secondary/40 dark:bg-white/[0.02] p-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{repo.repo_id}</p>
                    <p className="text-[11px] text-slate-600 dark:text-white/60">
                      {repo.downloads.toLocaleString()} downloads · {repo.likes} likes
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleInspectRepoFiles(repo.repo_id)}
                    className="px-2.5 py-1 rounded-md text-xs font-medium border border-light-200 dark:border-white/15 bg-white dark:bg-dark-secondary text-slate-900 dark:text-white hover:bg-light-200 dark:hover:bg-white/10"
                  >
                    {expandedRepo === repo.repo_id ? 'Hide Files' : 'View GGUF Files'}
                  </button>
                </div>

                {expandedRepo === repo.repo_id && (
                  <div className="mt-2 pt-2 border-t border-light-200 dark:border-white/10 space-y-1 max-h-44 overflow-y-auto">
                    {(repoFiles[repo.repo_id] ?? []).filter((f) => !f.is_mmproj).map((f) => (
                      <div key={f.filename} className="flex items-center justify-between gap-2 text-[11px] py-1">
                        <span className="truncate text-slate-800 dark:text-white/85 font-mono">
                          {f.filename} ({formatBytes(f.size_bytes)})
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDownloadHfFile(repo.repo_id, f)}
                          className="shrink-0 px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                        >
                          Download
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {recommendedModels.map((rec) => (
              <div
                key={rec.id}
                className="p-3 rounded-lg border border-light-200 dark:border-white/10 bg-light-secondary/40 dark:bg-white/[0.02] flex flex-col justify-between gap-2"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">{rec.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-700 dark:text-sky-300 font-mono">
                      {rec.quant}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-white/60 mt-1">{rec.description}</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 dark:text-white/45">{rec.repo_id}</span>
                  {rec.installed ? (
                    <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Installed</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleDownloadRecommended(rec)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-sky-600 hover:bg-sky-700 text-white transition"
                    >
                      <Download size={11} /> Download
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OfflineGgufPanel;
