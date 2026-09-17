import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Download,
  ExternalLink,
  Sparkles,
  Monitor,
  Apple,
  Terminal,
  ArrowUpRight,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { openExternalLink } from '@/lib/openExternal';
import { soundService } from '@/lib/sound/soundService';

export const CURRENT_VERSION = '1.0.1';
export const GITHUB_REPO_URL = 'https://github.com/amirrezamortazavifard/noectra-ai';
export const GITHUB_API_LATEST = 'https://api.github.com/repos/amirrezamortazavifard/noectra-ai/releases/latest';

export interface ReleaseAsset {
  id: number;
  name: string;
  size: number;
  browser_download_url: string;
  content_type: string;
}

export interface ReleaseInfo {
  tag_name: string;
  name: string;
  body: string;
  html_url: string;
  published_at: string;
  assets: ReleaseAsset[];
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

const detectPlatform = (): 'windows' | 'macos' | 'linux' => {
  if (typeof window === 'undefined') return 'windows';
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('mac') || ua.includes('darwin')) return 'macos';
  if (ua.includes('linux') || ua.includes('x11')) return 'linux';
  return 'windows';
};

const compareVersions = (current: string, latest: string): boolean => {
  // Normalize strings like "v1.0.1" -> "1.0.1"
  const cleanCurrent = current.replace(/^v/, '').trim();
  const cleanLatest = latest.replace(/^v/, '').trim();

  const cParts = cleanCurrent.split('.').map((n) => parseInt(n, 10) || 0);
  const lParts = cleanLatest.split('.').map((n) => parseInt(n, 10) || 0);

  for (let i = 0; i < Math.max(cParts.length, lParts.length); i++) {
    const c = cParts[i] || 0;
    const l = lParts[i] || 0;
    if (l > c) return true; // newer version available
    if (l < c) return false;
  }
  return false;
};

const Updates: React.FC = () => {
  const [isChecking, setIsChecking] = useState(false);
  const [autoCheckEnabled, setAutoCheckEnabled] = useState<boolean>(() => {
    return localStorage.getItem('noectra_auto_update') !== 'false';
  });
  const [releaseInfo, setReleaseInfo] = useState<ReleaseInfo | null>(null);
  const [hasUpdate, setHasUpdate] = useState<boolean | null>(null);
  const [lastCheckedTime, setLastCheckedTime] = useState<string | null>(() => {
    return localStorage.getItem('noectra_last_update_check');
  });
  const [showAllAssets, setShowAllAssets] = useState(false);

  const platform = detectPlatform();

  const checkForUpdates = async (silent = false) => {
    setIsChecking(true);
    try {
      const response = await fetch(GITHUB_API_LATEST, {
        headers: {
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data: ReleaseInfo = await response.json();
      setReleaseInfo(data);

      const isNewer = compareVersions(CURRENT_VERSION, data.tag_name);
      setHasUpdate(isNewer);

      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastCheckedTime(nowStr);
      localStorage.setItem('noectra_last_update_check', nowStr);

      if (!silent) {
        if (isNewer) {
          soundService.play('notification');
          toast.success(`New update found: ${data.tag_name}!`);
        } else {
          soundService.play('pop');
          toast.info(`You are running the latest version (v${CURRENT_VERSION}).`);
        }
      } else if (isNewer) {
        soundService.play('notification');
      }
    } catch (err: any) {
      console.error('Failed to check for updates:', err);
      if (!silent) {
        toast.error('Unable to connect to GitHub update server.');
      }
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    // Initial silent check if auto check is enabled and not checked yet
    checkForUpdates(true);
  }, []);

  const handleToggleAutoCheck = (e: React.ChangeEvent<HTMLInputElement>) => {
    soundService.play('pop');
    const val = e.target.checked;
    setAutoCheckEnabled(val);
    localStorage.setItem('noectra_auto_update', val ? 'true' : 'false');
    toast.success(val ? 'Automatic update checks enabled.' : 'Automatic update checks disabled.');
  };

  // Find best matching asset for user's platform
  const getRecommendedAsset = (): ReleaseAsset | null => {
    if (!releaseInfo || !releaseInfo.assets) return null;
    const assets = releaseInfo.assets;

    if (platform === 'windows') {
      return (
        assets.find((a) => a.name.endsWith('-setup.exe')) ||
        assets.find((a) => a.name.endsWith('.msi')) ||
        assets.find((a) => a.name.endsWith('.exe')) ||
        null
      );
    }
    if (platform === 'macos') {
      return (
        assets.find((a) => a.name.endsWith('.dmg')) ||
        assets.find((a) => a.name.endsWith('.app.tar.gz')) ||
        null
      );
    }
    if (platform === 'linux') {
      return (
        assets.find((a) => a.name.endsWith('.AppImage')) ||
        assets.find((a) => a.name.endsWith('.deb')) ||
        null
      );
    }
    return assets[0] || null;
  };

  const recommendedAsset = getRecommendedAsset();

  const getPlatformIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('.exe') || lower.includes('.msi')) {
      return <Monitor className="w-4 h-4 text-blue-400" />;
    }
    if (lower.includes('.dmg') || lower.includes('.app')) {
      return <Apple className="w-4 h-4 text-neutral-300" />;
    }
    return <Terminal className="w-4 h-4 text-emerald-400" />;
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* Current Version & Status Header Card */}
      <div className="relative overflow-hidden rounded-2xl border border-light-200 dark:border-white/10 bg-gradient-to-br from-white via-slate-50 to-sky-50/50 dark:from-neutral-900/90 dark:via-neutral-900/50 dark:to-neutral-950 p-6 shadow-sm dark:shadow-none backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Noectra AI
              </span>
              <span className="px-2.5 py-0.5 text-xs font-mono font-semibold rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                v{CURRENT_VERSION}
              </span>
              {hasUpdate === false && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3" />
                  Latest Version
                </span>
              )}
              {hasUpdate === true && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse">
                  <Sparkles className="w-3 h-3" />
                  New Version Available
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 dark:text-neutral-400">
              Desktop Research, Document Intelligence & Reading Platform
            </p>
            {lastCheckedTime && (
              <p className="text-[11px] text-slate-500 dark:text-neutral-500">
                Last checked today at {lastCheckedTime}
              </p>
            )}
          </div>

          <button
            onClick={() => checkForUpdates(false)}
            disabled={isChecking}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 hover:border-cyan-500/50 font-medium text-xs transition duration-200 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'Checking...' : 'Check for Updates'}</span>
          </button>
        </div>
      </div>

      {/* When Update is Available Banner */}
      {hasUpdate === true && releaseInfo && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  {releaseInfo.name || releaseInfo.tag_name} is now available!
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-neutral-400">
                Released on {new Date(releaseInfo.published_at).toLocaleDateString()}
              </p>
            </div>

            {recommendedAsset && (
              <a
                href={recommendedAsset.browser_download_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => openExternalLink(recommendedAsset.browser_download_url, e)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs shadow-lg shadow-cyan-500/20 transition duration-200 active:scale-95 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download for {platform === 'windows' ? 'Windows' : platform === 'macos' ? 'macOS' : 'Linux'}</span>
              </a>
            )}
          </div>

          {/* Release Notes */}
          {releaseInfo.body && (
            <div className="mt-4 p-4 rounded-xl bg-light-secondary dark:bg-black/40 border border-light-200 dark:border-white/5 space-y-2">
              <p className="text-xs font-semibold text-slate-800 dark:text-neutral-300">Changelog & Highlights:</p>
              <div className="text-xs text-slate-700 dark:text-neutral-400 max-h-48 overflow-y-auto whitespace-pre-wrap font-mono leading-relaxed">
                {releaseInfo.body}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Update Preferences Card */}
      <div className="rounded-2xl border border-light-200 dark:border-white/10 bg-light-primary/90 dark:bg-neutral-900/40 p-6 space-y-4 shadow-sm dark:shadow-none">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Update Preferences</h3>
        
        <div className="flex items-center justify-between py-2 border-b border-light-200 dark:border-white/5">
          <div className="space-y-0.5">
            <label htmlFor="auto-update-toggle" className="text-xs font-medium text-slate-800 dark:text-neutral-200 cursor-pointer">
              Automatic Update Checks
            </label>
            <p className="text-[11px] text-slate-500 dark:text-neutral-400">
              Silently verify new releases from GitHub when launching the application.
            </p>
          </div>
          <input
            id="auto-update-toggle"
            type="checkbox"
            checked={autoCheckEnabled}
            onChange={handleToggleAutoCheck}
            className="w-4 h-4 rounded bg-white dark:bg-neutral-800 border-light-200 dark:border-white/20 text-cyan-500 focus:ring-cyan-500/30 cursor-pointer accent-cyan-500"
          />
        </div>

        <div className="flex items-center justify-between py-2">
          <div className="space-y-0.5">
            <span className="text-xs font-medium text-slate-800 dark:text-neutral-200">
              Release Channel
            </span>
            <p className="text-[11px] text-slate-500 dark:text-neutral-400">
              Stable releases verified and tested through GitHub Actions.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-lg text-xs bg-light-secondary dark:bg-white/5 border border-light-200 dark:border-white/10 text-slate-700 dark:text-neutral-300 font-mono">
            Stable (Official)
          </span>
        </div>
      </div>

      {/* Available Platform Downloads & Assets */}
      {releaseInfo && releaseInfo.assets && releaseInfo.assets.length > 0 && (
        <div className="rounded-2xl border border-light-200 dark:border-white/10 bg-light-primary/90 dark:bg-neutral-900/40 p-6 space-y-4 shadow-sm dark:shadow-none">
          <button
            onClick={() => setShowAllAssets(!showAllAssets)}
            className="flex items-center justify-between w-full text-left"
          >
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Platform Installers ({releaseInfo.tag_name})
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                Direct downloads for Windows, macOS, and Linux
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white">
              <span>{showAllAssets ? 'Hide Assets' : 'Show All Packages'}</span>
              {showAllAssets ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          {showAllAssets && (
            <div className="space-y-2 pt-2">
              {releaseInfo.assets.map((asset) => {
                const isRecommended = recommendedAsset?.id === asset.id;
                return (
                  <div
                    key={asset.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition duration-200 ${
                      isRecommended
                        ? 'border-cyan-500/40 bg-cyan-500/10 dark:bg-cyan-500/5'
                        : 'border-light-200 dark:border-white/5 bg-light-secondary/60 dark:bg-black/20 hover:border-light-300 dark:hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-light-primary dark:bg-white/5 border border-light-200/60 dark:border-transparent">
                        {getPlatformIcon(asset.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-mono text-slate-800 dark:text-neutral-200 truncate">
                            {asset.name}
                          </p>
                          {isRecommended && (
                            <span className="px-1.5 py-0.2 text-[10px] rounded bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 font-medium">
                              Your OS
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-neutral-500">
                          {formatBytes(asset.size)}
                        </p>
                      </div>
                    </div>

                    <a
                      href={asset.browser_download_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => openExternalLink(asset.browser_download_url, e)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-light-primary dark:bg-white/5 hover:bg-light-secondary dark:hover:bg-white/10 text-slate-700 hover:text-slate-900 dark:text-neutral-300 dark:hover:text-white text-xs border border-light-200 dark:border-white/10 transition active:scale-95 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Official GitHub Repository Links */}
      <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-xl border border-light-200 dark:border-white/5 bg-light-secondary/50 dark:bg-white/[0.02] gap-3 text-xs text-slate-600 dark:text-neutral-400">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
          <span>All packages are cryptographically built & signed via GitHub Actions.</span>
        </div>
        <a
          href={`${GITHUB_REPO_URL}/releases`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => openExternalLink(`${GITHUB_REPO_URL}/releases`, e)}
          className="flex items-center gap-1 text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 font-medium transition cursor-pointer"
        >
          <span>View all releases on GitHub</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
};

export default Updates;
