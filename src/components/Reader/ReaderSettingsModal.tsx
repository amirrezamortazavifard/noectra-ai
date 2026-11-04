import React, { useState, useEffect } from 'react';
import {
  X,
  Rss,
  FolderPlus,
  Sliders,
  Cloud,
  Eye,
  Plus,
  Trash2,
  Upload,
  Download,
  Play,
  Check,
  RefreshCw,
  Folder,
  Sparkles,
  MessageSquare,
  Share2,
  Compass,
} from 'lucide-react';
import {
  resolveSocialInput,
  POPULAR_SOCIAL_PRESETS,
  PopularSocialPreset,
} from '@/lib/services/socialResolver';
import {
  FeedGroup,
  FeedRule,
  FeedSource,
  FeedSyncService,
  ReaderSettings,
  SourceOpenTarget,
  SourceTextDirection,
  ViewType,
} from '@/lib/reader/types';
import {
  addSource,
  createGroup,
  deleteGroup,
  deleteRule,
  deleteSource,
  exportBackup,
  exportOpml,
  getRules,
  getServices,
  importBackup,
  importOpml,
  saveRule,
  saveService,
  syncServiceNow,
  testRule,
  updateGroup,
  updateSource,
} from '@/lib/reader/api';
import { toast } from 'sonner';

interface ReaderSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sources: FeedSource[];
  groups: FeedGroup[];
  onRefreshData: () => void;
  settings: ReaderSettings;
  onUpdateSettings: (s: ReaderSettings) => void;
}

export default function ReaderSettingsModal({
  isOpen,
  onClose,
  sources,
  groups,
  onRefreshData,
  settings,
  onUpdateSettings,
}: ReaderSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'sources' | 'groups' | 'rules' | 'services' | 'reading'>('sources');

  // New Source State
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceOpenTarget, setNewSourceOpenTarget] = useState<SourceOpenTarget>('local');
  const [newSourceTextDir, setNewSourceTextDir] = useState<SourceTextDirection>('ltr');
  const [isAddingSource, setIsAddingSource] = useState(false);

  // Groups State
  const [newGroupName, setNewGroupName] = useState('');

  // Rules State
  const [rules, setRules] = useState<FeedRule[]>([]);
  const [ruleTargetType, setRuleTargetType] = useState<'all' | 'group' | 'source'>('all');
  const [ruleTargetId, setRuleTargetId] = useState('all');
  const [ruleFilterField, setRuleFilterField] = useState<'title' | 'content' | 'author' | 'link'>('title');
  const [rulePattern, setRulePattern] = useState('');
  const [ruleMatchType, setRuleMatchType] = useState(true);
  const [ruleActions, setRuleActions] = useState<Record<string, boolean>>({
    read: true,
    star: false,
    hide: false,
    notify: false,
  });
  const [rulePreviewResult, setRulePreviewResult] = useState<{ matchedCount: number; samples: any[] } | null>(null);
  const [isPreviewingRule, setIsPreviewingRule] = useState(false);

  // Sync Services State
  const [services, setServices] = useState<FeedSyncService[]>([]);
  const [selectedServiceType, setSelectedServiceType] = useState<string>('fever');
  const [serviceEndpoint, setServiceEndpoint] = useState('');
  const [serviceUsername, setServiceUsername] = useState('');
  const [servicePassword, setServicePassword] = useState('');
  const [serviceApiKey, setServiceApiKey] = useState('');
  const [serviceEnabled, setServiceEnabled] = useState(false);
  const [isSyncingService, setIsSyncingService] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadRules();
      loadServices();
    }
  }, [isOpen]);

  const loadRules = async () => {
    try {
      const data = await getRules();
      setRules(data);
    } catch {}
  };

  const loadServices = async () => {
    try {
      const data = await getServices();
      setServices(data);
      const active = data.find((s) => s.serviceType === selectedServiceType);
      if (active) {
        setServiceEndpoint(active.endpoint || '');
        setServiceUsername(active.username || '');
        setServicePassword(active.password || '');
        setServiceApiKey(active.apiKey || '');
        setServiceEnabled(active.enabled || false);
      }
    } catch {}
  };

  if (!isOpen) return null;

  // Add Source Handler with smart social resolver
  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceUrl.trim()) return;
    setIsAddingSource(true);
    try {
      const resolved = resolveSocialInput(newSourceUrl);
      const targetUrl = resolved.isSocial ? resolved.feedUrl : newSourceUrl.trim();
      const targetName = newSourceName.trim() || (resolved.isSocial ? resolved.suggestedTitle : undefined);

      await addSource({
        url: targetUrl,
        name: targetName,
        openTarget: newSourceOpenTarget,
        textDir: newSourceTextDir,
      });
      toast.success(
        resolved.isSocial
          ? `Subscribed to ${resolved.platformName} channel!`
          : 'Feed subscription added successfully'
      );
      setNewSourceUrl('');
      setNewSourceName('');
      onRefreshData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add feed');
    } finally {
      setIsAddingSource(false);
    }
  };

  const handleSubscribePreset = async (preset: PopularSocialPreset) => {
    setIsAddingSource(true);
    try {
      await addSource({
        url: preset.feedUrl,
        name: preset.name,
        openTarget: 'local',
        textDir: 'ltr',
      });
      toast.success(`Subscribed to ${preset.name}!`);
      onRefreshData();
    } catch (err: any) {
      toast.error(err.message || `Failed to subscribe to ${preset.name}`);
    } finally {
      setIsAddingSource(false);
    }
  };

  // Delete Source Handler
  const handleDeleteSource = async (id: string) => {
    if (!confirm('Are you sure you want to unsubscribe from this feed?')) return;
    try {
      await deleteSource(id);
      toast.success('Feed removed');
      onRefreshData();
    } catch {
      toast.error('Failed to remove feed');
    }
  };

  // OPML Import / Export Handlers
  const handleImportOpmlFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.opml,.xml';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (re) => {
        const text = re.target?.result as string;
        try {
          const count = await importOpml(text);
          toast.success(`Successfully imported ${count} feeds from OPML!`);
          onRefreshData();
        } catch {
          toast.error('Failed to parse OPML file');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleExportOpmlFile = async () => {
    try {
      const opmlXml = await exportOpml();
      const blob = new Blob([opmlXml], { type: 'text/xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Noectra_Reader_Feeds_${new Date().toISOString().slice(0, 10)}.opml`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('OPML exported successfully');
    } catch {
      toast.error('Failed to export OPML');
    }
  };

  // Full Backup Export / Import Handlers
  const handleExportBackupJson = async () => {
    try {
      const backup = await exportBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Noectra_Reader_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Full database backup exported');
    } catch {
      toast.error('Failed to export backup');
    }
  };

  const handleImportBackupJson = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (re) => {
        try {
          const json = JSON.parse(re.target?.result as string);
          await importBackup(json);
          toast.success('Backup restored successfully');
          onRefreshData();
          loadRules();
        } catch {
          toast.error('Failed to restore backup');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // Groups Handlers
  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      await createGroup(newGroupName.trim());
      setNewGroupName('');
      toast.success('Folder created');
      onRefreshData();
    } catch {
      toast.error('Failed to create folder');
    }
  };

  const handleDeleteGroup = async (gid: string) => {
    if (!confirm('Delete this folder? (Feeds inside will not be deleted)')) return;
    try {
      await deleteGroup(gid);
      toast.success('Folder deleted');
      onRefreshData();
    } catch {
      toast.error('Failed to delete folder');
    }
  };

  const handleToggleFeedInGroup = async (group: FeedGroup, sid: string) => {
    const has = group.sids.includes(sid);
    const newSids = has ? group.sids.filter((s) => s !== sid) : [...group.sids, sid];
    try {
      await updateGroup(group.id, { sids: newSids });
      onRefreshData();
    } catch {}
  };

  // Rules Handlers
  const handleTestRule = async () => {
    if (!rulePattern.trim()) return;
    setIsPreviewingRule(true);
    try {
      const res = await testRule({
        filterField: ruleFilterField,
        pattern: rulePattern.trim(),
        matchType: ruleMatchType,
        sourceId: ruleTargetType === 'source' ? ruleTargetId : undefined,
      });
      setRulePreviewResult(res);
    } catch {
      toast.error('Invalid regular expression pattern');
    } finally {
      setIsPreviewingRule(false);
    }
  };

  const handleSaveRule = async () => {
    if (!rulePattern.trim()) {
      toast.error('Please enter a pattern or regex');
      return;
    }
    const actions = Object.entries(ruleActions)
      .filter(([_, v]) => v)
      .map(([k]) => k);

    try {
      await saveRule({
        targetType: ruleTargetType,
        targetId: ruleTargetId,
        filterField: ruleFilterField,
        pattern: rulePattern.trim(),
        matchType: ruleMatchType,
        actions,
      });
      toast.success('Automation rule saved');
      setRulePattern('');
      setRulePreviewResult(null);
      loadRules();
    } catch {
      toast.error('Failed to save rule');
    }
  };

  const handleDeleteRule = async (id: string) => {
    try {
      await deleteRule(id);
      toast.success('Rule removed');
      loadRules();
    } catch {}
  };

  // Service Handlers
  const handleSaveServiceConfig = async () => {
    try {
      await saveService(selectedServiceType, {
        enabled: serviceEnabled,
        endpoint: serviceEndpoint.trim(),
        username: serviceUsername.trim(),
        password: servicePassword,
        apiKey: serviceApiKey.trim(),
      });
      toast.success(`${selectedServiceType.toUpperCase()} service settings saved`);
      loadServices();
    } catch {
      toast.error('Failed to save service');
    }
  };

  const handleSyncService = async () => {
    setIsSyncingService(true);
    try {
      const res = await syncServiceNow(selectedServiceType);
      toast.success(res.message || 'Service synced successfully');
      loadServices();
      onRefreshData();
    } catch (e: any) {
      toast.error(e.message || 'Service sync failed');
    } finally {
      setIsSyncingService(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md select-none text-xs">
      <div className="relative w-[900px] max-w-[95vw] h-[650px] max-h-[90vh] bg-white dark:bg-[#10141d] rounded-3xl border border-black/10 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Top Bar */}
        <div className="px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-2xl bg-sky-500/10 text-sky-500">
              <Rss size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Reader Feeds Studio & Settings
              </h2>
              <p className="text-[11px] text-black/50 dark:text-white/50">
                Manage RSS subscriptions, folder groups, regex automation rules & cloud sync
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body with Sidebar Tabs */}
        <div className="flex-1 flex overflow-hidden">
          {/* Navigation Sidebar */}
          <div className="w-52 border-r border-black/[0.06] dark:border-white/[0.08] p-3 space-y-1 bg-black/[0.015] dark:bg-white/[0.01] shrink-0">
            <button
              onClick={() => setActiveTab('sources')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl transition-all ${
                activeTab === 'sources'
                  ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 font-semibold'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.04]'
              }`}
            >
              <Rss size={15} />
              <span>Subscriptions</span>
            </button>
            <button
              onClick={() => setActiveTab('groups')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl transition-all ${
                activeTab === 'groups'
                  ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 font-semibold'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.04]'
              }`}
            >
              <FolderPlus size={15} />
              <span>Folder Groups</span>
            </button>
            <button
              onClick={() => setActiveTab('rules')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl transition-all ${
                activeTab === 'rules'
                  ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 font-semibold'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.04]'
              }`}
            >
              <Sliders size={15} />
              <span>Regex Rules</span>
            </button>
            <button
              onClick={() => setActiveTab('services')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl transition-all ${
                activeTab === 'services'
                  ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 font-semibold'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.04]'
              }`}
            >
              <Cloud size={15} />
              <span>Cloud Sync</span>
            </button>
            <button
              onClick={() => setActiveTab('reading')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl transition-all ${
                activeTab === 'reading'
                  ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 font-semibold'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.04]'
              }`}
            >
              <Eye size={15} />
              <span>Reading & Layout</span>
            </button>
          </div>

          {/* Active Tab Content */}
          <div className="flex-1 overflow-y-auto p-6 text-slate-800 dark:text-slate-200">
            {/* --- TAB 1: SOURCES --- */}
            {activeTab === 'sources' && (
              <div className="space-y-6">
                {/* Add Feed Form */}
                <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.08] space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Rss size={15} className="text-sky-500" />
                      <span>Subscribe to Feed or Social Stream</span>
                    </h4>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                      Supports RSS, Atom, Reddit (r/...), X/Twitter, Bluesky
                    </span>
                  </div>

                  <form onSubmit={handleAddSource} className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-black/50 dark:text-white/50 mb-1">
                          Feed URL or Social Handle
                        </label>
                        <input
                          type="text"
                          required
                          value={newSourceUrl}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNewSourceUrl(val);
                            const res = resolveSocialInput(val);
                            if (res.isSocial && !newSourceName) {
                              setNewSourceName(res.suggestedTitle);
                            }
                          }}
                          placeholder="e.g. r/MachineLearning, x.com/OpenAI, or https://..."
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-black/20 border border-black/10 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-black/50 dark:text-white/50 mb-1">
                          Custom Title (Optional)
                        </label>
                        <input
                          type="text"
                          value={newSourceName}
                          onChange={(e) => setNewSourceName(e.target.value)}
                          placeholder="Auto-detected from feed"
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-black/20 border border-black/10 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                        />
                      </div>
                    </div>

                    {/* Live Social Resolution Badge */}
                    {(() => {
                      const res = resolveSocialInput(newSourceUrl);
                      if (!res.isSocial) return null;
                      return (
                        <div className="flex items-center justify-between p-2 rounded-xl bg-gradient-to-r from-cyan-500/10 via-sky-500/10 to-transparent border border-cyan-500/20 text-xs">
                          <div className="flex items-center gap-2 truncate">
                            <Sparkles size={13} className="text-cyan-500 shrink-0 animate-pulse" />
                            <span className="font-semibold text-cyan-700 dark:text-cyan-300">
                              {res.platformName} detected:
                            </span>
                            <span className="text-slate-600 dark:text-slate-300 font-mono text-[11px] truncate">
                              {res.feedUrl}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-700 dark:text-cyan-300">
                            Auto-Bridged
                          </span>
                        </div>
                      );
                    })()}

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center space-x-1.5 text-[11px]">
                          <span>Default Target:</span>
                          <select
                            value={newSourceOpenTarget}
                            onChange={(e) => setNewSourceOpenTarget(e.target.value as any)}
                            className="px-2 py-1 rounded-lg bg-white dark:bg-[#121721] border border-black/10 dark:border-white/10 text-slate-900 dark:text-white font-medium"
                          >
                            <option value="local">Local RSS</option>
                            <option value="full">Full Content</option>
                            <option value="webpage">Webpage</option>
                            <option value="external">External Browser</option>
                          </select>
                        </label>
                        <label className="flex items-center space-x-1.5 text-[11px]">
                          <span>Text Direction:</span>
                          <select
                            value={newSourceTextDir}
                            onChange={(e) => setNewSourceTextDir(e.target.value as any)}
                            className="px-2 py-1 rounded-lg bg-white dark:bg-[#121721] border border-black/10 dark:border-white/10 text-slate-900 dark:text-white font-medium"
                          >
                            <option value="ltr">LTR (Left to Right)</option>
                            <option value="rtl">RTL (Persian / Arabic)</option>
                            <option value="vertical">Vertical</option>
                          </select>
                        </label>
                      </div>

                      <button
                        type="submit"
                        disabled={isAddingSource}
                        className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-sky-500 text-white font-semibold hover:bg-sky-600 transition-all disabled:opacity-50 active:scale-95 shadow-sm"
                      >
                        <Plus size={14} />
                        <span>{isAddingSource ? 'Subscribing...' : 'Add Feed'}</span>
                      </button>
                    </div>
                  </form>
                </div>

                {/* Popular Social Intelligence Channels (1-Click Subscribe) */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-500/5 via-violet-500/5 to-transparent border border-black/[0.06] dark:border-white/[0.08] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles size={15} className="text-cyan-500" />
                      <h4 className="font-semibold text-slate-900 dark:text-white text-xs">
                        Popular Social Intelligence Channels
                      </h4>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      1-Click Instant Subscription
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {POPULAR_SOCIAL_PRESETS.map((preset) => {
                      const isAlreadySubbed = sources.some(
                        (s) => s.url === preset.feedUrl || s.name === preset.name
                      );

                      return (
                        <div
                          key={preset.id}
                          className="flex flex-col justify-between p-2.5 rounded-xl bg-white dark:bg-[#111622] border border-black/[0.06] dark:border-white/[0.08] hover:border-cyan-500/30 transition-all"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-[11px] text-slate-900 dark:text-white truncate">
                                {preset.name}
                              </span>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                  preset.platform === 'reddit'
                                    ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
                                    : preset.platform === 'x'
                                    ? 'bg-slate-900/10 text-slate-900 dark:bg-white/10 dark:text-white'
                                    : preset.platform === 'bluesky'
                                    ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
                                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                }`}
                              >
                                {preset.platform}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                              {preset.description}
                            </p>
                          </div>

                          <div className="pt-2 mt-2 border-t border-black/[0.04] dark:border-white/[0.04] flex items-center justify-between">
                            <span className="text-[9px] text-slate-400 font-medium">
                              {preset.category}
                            </span>
                            <button
                              type="button"
                              disabled={isAlreadySubbed || isAddingSource}
                              onClick={() => handleSubscribePreset(preset)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                                isAlreadySubbed
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 cursor-default'
                                  : 'bg-sky-500 text-white hover:bg-sky-600 active:scale-95'
                              }`}
                            >
                              {isAlreadySubbed ? 'Subscribed' : 'Subscribe'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* OPML & Full Backup Utilities */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleImportOpmlFile}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-all text-[11px] font-medium"
                  >
                    <Upload size={13} />
                    <span>Import OPML</span>
                  </button>
                  <button
                    onClick={handleExportOpmlFile}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-all text-[11px] font-medium"
                  >
                    <Download size={13} />
                    <span>Export OPML</span>
                  </button>
                  <button
                    onClick={handleExportBackupJson}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-all text-[11px] font-medium"
                  >
                    <Download size={13} />
                    <span>Export Full Backup</span>
                  </button>
                  <button
                    onClick={handleImportBackupJson}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-all text-[11px] font-medium"
                  >
                    <Upload size={13} />
                    <span>Restore Backup</span>
                  </button>
                </div>

                {/* Subscriptions List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-900 dark:text-white">
                    <span>Your Subscriptions ({sources.length})</span>
                  </div>
                  <div className="rounded-2xl border border-black/10 dark:border-white/10 overflow-hidden divide-y divide-black/5 dark:divide-white/5">
                    {sources.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between p-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                      >
                        <div className="flex items-center space-x-3 min-w-0 flex-1 pr-4">
                          {s.iconUrl ? (
                            <img
                              src={s.iconUrl}
                              alt=""
                              className="w-4 h-4 rounded object-contain shrink-0"
                            />
                          ) : (
                            <Rss size={14} className="text-orange-500 shrink-0" />
                          )}
                          <div className="truncate">
                            <div className="font-semibold text-slate-900 dark:text-white truncate">
                              {s.name}
                            </div>
                            <div className="text-[10px] text-black/40 dark:text-white/40 truncate">
                              {s.url}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          {/* Direction toggle */}
                          <button
                            onClick={() =>
                              updateSource(s.id, {
                                textDir: s.textDir === 'ltr' ? 'rtl' : 'ltr',
                              }).then(onRefreshData)
                            }
                            className="px-2 py-1 rounded-lg border border-black/10 dark:border-white/10 text-[10px] uppercase font-semibold text-black/60 dark:text-white/60"
                          >
                            {s.textDir}
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteSource(s.id)}
                            className="p-1.5 rounded-lg text-black/40 dark:text-white/40 hover:text-rose-500 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* --- TAB 2: GROUPS --- */}
            {activeTab === 'groups' && (
              <div className="space-y-6">
                {/* Create Group */}
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="New Folder Name (e.g. AI News, Tech, Finance)..."
                    className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-black/20 border border-black/10 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                  <button
                    onClick={handleCreateGroup}
                    className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-sky-500 text-white font-semibold hover:bg-sky-600 transition-all"
                  >
                    <Plus size={14} />
                    <span>Create Folder</span>
                  </button>
                </div>

                {/* Groups list */}
                <div className="space-y-4">
                  {groups.map((group) => (
                    <div
                      key={group.id}
                      className="p-4 rounded-2xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 font-semibold text-slate-900 dark:text-white text-sm">
                          <Folder size={16} className="text-amber-500" />
                          <span>{group.name}</span>
                          <span className="text-[11px] text-black/40 dark:text-white/40 font-normal">
                            ({group.sids.length} feeds)
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteGroup(group.id)}
                          className="p-1.5 rounded-lg text-black/40 dark:text-white/40 hover:text-rose-500 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* Feeds checklist */}
                      <div className="pt-2 border-t border-black/[0.04] dark:border-white/[0.04] grid grid-cols-2 gap-2">
                        {sources.map((s) => {
                          const isIn = group.sids.includes(s.id);
                          return (
                            <label
                              key={s.id}
                              className={`flex items-center space-x-2 p-2 rounded-xl border transition-all cursor-pointer ${
                                isIn
                                  ? 'bg-sky-500/10 border-sky-500/30 text-sky-600 dark:text-sky-300 font-medium'
                                  : 'bg-white dark:bg-[#121721] border-black/5 dark:border-white/5 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isIn}
                                onChange={() => handleToggleFeedInGroup(group, s.id)}
                                className="rounded text-sky-500 focus:ring-0 cursor-pointer"
                              />
                              <span className="truncate text-[11px]">{s.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* --- TAB 3: REGEX RULES --- */}
            {activeTab === 'rules' && (
              <div className="space-y-6">
                {/* Rule Creator */}
                <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.08] space-y-4">
                  <h4 className="font-semibold text-slate-900 dark:text-white">
                    Create Automation Rule
                  </h4>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] text-black/50 dark:text-white/50 mb-1">
                        Scope
                      </label>
                      <select
                        value={ruleTargetType}
                        onChange={(e) => {
                          setRuleTargetType(e.target.value as any);
                          setRuleTargetId(e.target.value === 'all' ? 'all' : sources[0]?.id || 'all');
                        }}
                        className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-[#121721] border border-black/10 dark:border-white/10 text-slate-900 dark:text-white font-medium"
                      >
                        <option value="all">All Articles</option>
                        <option value="group">Specific Folder</option>
                        <option value="source">Specific Feed</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-black/50 dark:text-white/50 mb-1">
                        Target Field
                      </label>
                      <select
                        value={ruleFilterField}
                        onChange={(e) => setRuleFilterField(e.target.value as any)}
                        className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-[#121721] border border-black/10 dark:border-white/10 text-slate-900 dark:text-white font-medium"
                      >
                        <option value="title">Article Title</option>
                        <option value="content">Full Content</option>
                        <option value="author">Author</option>
                        <option value="link">URL / Link</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-black/50 dark:text-white/50 mb-1">
                        Condition
                      </label>
                      <select
                        value={ruleMatchType ? 'matches' : 'not_matches'}
                        onChange={(e) => setRuleMatchType(e.target.value === 'matches')}
                        className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-[#121721] border border-black/10 dark:border-white/10 text-slate-900 dark:text-white font-medium"
                      >
                        <option value="matches">Matches Regex</option>
                        <option value="not_matches">Does NOT Match</option>
                      </select>
                    </div>
                  </div>

                  {/* Regex Pattern Input */}
                  <div>
                    <label className="block text-[11px] text-black/50 dark:text-white/50 mb-1">
                      Regex Pattern (e.g. (?i)sponsored|advertisement or /LLM|AI/ )
                    </label>
                    <input
                      type="text"
                      value={rulePattern}
                      onChange={(e) => setRulePattern(e.target.value)}
                      placeholder="Enter regex pattern..."
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-black/20 border border-black/10 dark:border-white/10 font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>

                  {/* Actions Checkboxes */}
                  <div>
                    <label className="block text-[11px] text-black/50 dark:text-white/50 mb-1.5">
                      Automated Actions
                    </label>
                    <div className="flex flex-wrap items-center gap-4">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={ruleActions.read}
                          onChange={(e) =>
                            setRuleActions({ ...ruleActions, read: e.target.checked })
                          }
                          className="rounded text-sky-500"
                        />
                        <span>Mark as Read</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={ruleActions.star}
                          onChange={(e) =>
                            setRuleActions({ ...ruleActions, star: e.target.checked })
                          }
                          className="rounded text-sky-500"
                        />
                        <span>Star Article</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={ruleActions.hide}
                          onChange={(e) =>
                            setRuleActions({ ...ruleActions, hide: e.target.checked })
                          }
                          className="rounded text-sky-500"
                        />
                        <span>Auto-Hide (AdBlock/Spam)</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={ruleActions.notify}
                          onChange={(e) =>
                            setRuleActions({ ...ruleActions, notify: e.target.checked })
                          }
                          className="rounded text-sky-500"
                        />
                        <span>Desktop Notification</span>
                      </label>
                    </div>
                  </div>

                  {/* Test & Save Buttons */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={handleTestRule}
                      disabled={isPreviewingRule || !rulePattern.trim()}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-all text-xs font-semibold disabled:opacity-40"
                    >
                      <Play size={13} />
                      <span>{isPreviewingRule ? 'Testing...' : 'Live Preview Regex'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveRule}
                      className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-sky-500 text-white font-semibold hover:bg-sky-600 transition-all shadow-sm"
                    >
                      <Check size={14} />
                      <span>Save Rule</span>
                    </button>
                  </div>

                  {/* Live Preview Result Box */}
                  {rulePreviewResult && (
                    <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 space-y-2">
                      <div className="font-semibold text-sky-600 dark:text-sky-300">
                        Match Preview: {rulePreviewResult.matchedCount} matching articles in database
                      </div>
                      <div className="space-y-1">
                        {rulePreviewResult.samples.map((s, idx) => (
                          <div key={idx} className="truncate text-[11px] text-slate-700 dark:text-slate-300">
                            • {s.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Existing Rules List */}
                <div className="space-y-2">
                  <div className="font-semibold text-slate-900 dark:text-white">
                    Active Rules ({rules.length})
                  </div>
                  {rules.length === 0 ? (
                    <p className="text-black/40 dark:text-white/40 italic">
                      No automation rules created yet.
                    </p>
                  ) : (
                    <div className="rounded-2xl border border-black/10 dark:border-white/10 divide-y divide-black/5 dark:divide-white/5 overflow-hidden">
                      {rules.map((r) => (
                        <div
                          key={r.id}
                          className="flex items-center justify-between p-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded text-[11px] font-semibold">
                                {r.pattern}
                              </span>
                              <span className="text-[10px] text-black/50 dark:text-white/50 uppercase">
                                on {r.filterField}
                              </span>
                            </div>
                            <div className="text-[10px] text-sky-600 dark:text-sky-400">
                              Actions: {r.actions.join(', ')}
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteRule(r.id)}
                            className="p-1.5 text-black/40 dark:text-white/40 hover:text-rose-500 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* --- TAB 4: CLOUD SYNC SERVICES --- */}
            {activeTab === 'services' && (
              <div className="space-y-6">
                {/* Service Selector */}
                <div className="flex items-center space-x-2 p-1 rounded-2xl bg-black/[0.04] dark:bg-white/[0.05] border border-black/5 dark:border-white/5">
                  {(['fever', 'greader', 'miniflux', 'feedbin'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => {
                        setSelectedServiceType(st);
                        const found = services.find((s) => s.serviceType === st);
                        if (found) {
                          setServiceEndpoint(found.endpoint || '');
                          setServiceUsername(found.username || '');
                          setServicePassword(found.password || '');
                          setServiceApiKey(found.apiKey || '');
                          setServiceEnabled(found.enabled || false);
                        } else {
                          setServiceEndpoint('');
                          setServiceUsername('');
                          setServicePassword('');
                          setServiceApiKey('');
                          setServiceEnabled(false);
                        }
                      }}
                      className={`flex-1 py-2 text-center rounded-xl font-semibold capitalize transition-all ${
                        selectedServiceType === st
                          ? 'bg-white dark:bg-white/15 text-black dark:text-white shadow-sm'
                          : 'text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white'
                      }`}
                    >
                      {st === 'greader' ? 'Google Reader API' : st}
                    </button>
                  ))}
                </div>

                {/* Service Configuration Form */}
                <div className="p-4 rounded-2xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white capitalize">
                        {selectedServiceType === 'greader' ? 'Google Reader API' : selectedServiceType} Sync
                      </h4>
                      <p className="text-[11px] text-black/50 dark:text-white/50">
                        Compatible with FreshRSS, TT-RSS, Inoreader, The Old Reader, BazQux
                      </p>
                    </div>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <span className="text-[11px] font-semibold">Enable Sync</span>
                      <input
                        type="checkbox"
                        checked={serviceEnabled}
                        onChange={(e) => setServiceEnabled(e.target.checked)}
                        className="rounded text-sky-500"
                      />
                    </label>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] text-black/50 dark:text-white/50 mb-1">
                        API Endpoint URL
                      </label>
                      <input
                        type="url"
                        value={serviceEndpoint}
                        onChange={(e) => setServiceEndpoint(e.target.value)}
                        placeholder="https://your-freshrss.com/api/greader.php"
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-black/20 border border-black/10 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-black/50 dark:text-white/50 mb-1">
                          Username
                        </label>
                        <input
                          type="text"
                          value={serviceUsername}
                          onChange={(e) => setServiceUsername(e.target.value)}
                          placeholder="admin"
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-black/20 border border-black/10 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-black/50 dark:text-white/50 mb-1">
                          API Password / Token
                        </label>
                        <input
                          type="password"
                          value={servicePassword}
                          onChange={(e) => setServicePassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-black/20 border border-black/10 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={handleSyncService}
                      disabled={isSyncingService || !serviceEndpoint.trim()}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-all text-xs font-semibold disabled:opacity-40"
                    >
                      <RefreshCw size={13} className={isSyncingService ? 'animate-spin text-sky-500' : ''} />
                      <span>{isSyncingService ? 'Testing...' : 'Test & Sync Now'}</span>
                    </button>

                    <button
                      onClick={handleSaveServiceConfig}
                      className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-sky-500 text-white font-semibold hover:bg-sky-600 transition-all shadow-sm"
                    >
                      <Check size={14} />
                      <span>Save Configuration</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* --- TAB 5: READING & LAYOUT --- */}
            {activeTab === 'reading' && (
              <div className="space-y-6">
                <div className="p-4 rounded-2xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] space-y-4">
                  <h4 className="font-semibold text-slate-900 dark:text-white">
                    Default View & Reader Preferences
                  </h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] text-black/50 dark:text-white/50 mb-1">
                        Default Feed Layout
                      </label>
                      <select
                        value={settings.defaultView}
                        onChange={(e) =>
                          onUpdateSettings({ ...settings, defaultView: e.target.value as ViewType })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#121721] border border-black/10 dark:border-white/10 text-slate-900 dark:text-white font-medium"
                      >
                        <option value="cards">Cards View</option>
                        <option value="list">Split List View</option>
                        <option value="magazine">Magazine View</option>
                        <option value="compact">Compact View</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-black/50 dark:text-white/50 mb-1">
                        Default Open Mode
                      </label>
                      <select
                        value={settings.defaultOpenTarget}
                        onChange={(e) =>
                          onUpdateSettings({
                            ...settings,
                            defaultOpenTarget: e.target.value as SourceOpenTarget,
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#121721] border border-black/10 dark:border-white/10 text-slate-900 dark:text-white font-medium"
                      >
                        <option value="local">Local RSS</option>
                        <option value="full">Mercury Full Content Extractor</option>
                        <option value="webpage">Proxied Webpage</option>
                        <option value="external">External System Browser</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-black/[0.04] dark:border-white/[0.04]">
                    <label className="flex items-center justify-between py-1 cursor-pointer">
                      <span>Show Cover Images</span>
                      <input
                        type="checkbox"
                        checked={settings.viewConfigs.showCover}
                        onChange={(e) =>
                          onUpdateSettings({
                            ...settings,
                            viewConfigs: { ...settings.viewConfigs, showCover: e.target.checked },
                          })
                        }
                        className="rounded text-sky-500 cursor-pointer"
                      />
                    </label>
                    <label className="flex items-center justify-between py-1 cursor-pointer">
                      <span>Show Article Snippets</span>
                      <input
                        type="checkbox"
                        checked={settings.viewConfigs.showSnippet}
                        onChange={(e) =>
                          onUpdateSettings({
                            ...settings,
                            viewConfigs: { ...settings.viewConfigs, showSnippet: e.target.checked },
                          })
                        }
                        className="rounded text-sky-500 cursor-pointer"
                      />
                    </label>
                    <label className="flex items-center justify-between py-1 cursor-pointer">
                      <span>Fade Read Articles</span>
                      <input
                        type="checkbox"
                        checked={settings.viewConfigs.fadeRead}
                        onChange={(e) =>
                          onUpdateSettings({
                            ...settings,
                            viewConfigs: { ...settings.viewConfigs, fadeRead: e.target.checked },
                          })
                        }
                        className="rounded text-sky-500 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

