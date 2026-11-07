import React, { useState, useEffect } from 'react';
import {
  KnowledgeService,
  KnowledgeRecommendation,
  KnowledgeGraphEntity,
  KnowledgeGraphRelation,
  PersonalWorkspaceItem,
  ResearchDossier,
  OfflineModelItem,
} from '@/lib/services/knowledge';
import {
  Compass,
  Network,
  Briefcase,
  FileText,
  Cpu,
  Package,
  Plus,
  Trash2,
  Download,
  Share2,
  CheckCircle2,
  Search,
  ExternalLink,
  Sparkles,
  ArrowRight,
  Database,
  Layers,
  Copy,
} from 'lucide-react';
import { toast } from 'sonner';

export const KnowledgeWorkspaceAndExtensionsView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'workspace' | 'graph' | 'recommendations' | 'models' | 'packs'>('workspace');

  // EXT-004: Workspace state
  const [workspaceItems, setWorkspaceItems] = useState<PersonalWorkspaceItem[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newItemType, setNewItemType] = useState<'note' | 'article' | 'highlight' | 'pdf'>('note');
  const [isAddingItem, setIsAddingItem] = useState(false);

  // EXT-005: Research Dossiers
  const [dossiers, setDossiers] = useState<ResearchDossier[]>([]);

  // EXT-002: Knowledge Graph
  const [graphEntities, setGraphEntities] = useState<KnowledgeGraphEntity[]>([]);
  const [graphRelations, setGraphRelations] = useState<KnowledgeGraphRelation[]>([]);
  const [graphFilter, setGraphFilter] = useState('');

  // EXT-001: Recommendations
  const [recommendations, setRecommendations] = useState<KnowledgeRecommendation[]>([]);

  // EXT-006: Offline Models
  const [offlineModels, setOfflineModels] = useState<OfflineModelItem[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [ws, dos, graph, recs, models] = await Promise.all([
        KnowledgeService.fetchWorkspaceItems(),
        KnowledgeService.fetchResearchDossiers(),
        KnowledgeService.fetchKnowledgeGraph(),
        KnowledgeService.fetchRecommendations(),
        KnowledgeService.fetchOfflineModels(),
      ]);
      setWorkspaceItems(ws);
      setDossiers(dos);
      setGraphEntities(graph.entities);
      setGraphRelations(graph.relations);
      setRecommendations(recs);
      setOfflineModels(models);
    } catch (e: any) {
      toast.error(`Failed to load workspace data: ${e.message}`);
    }
  };

  const handleCreateWorkspaceItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.warning('Please enter a title');
      return;
    }

    try {
      const id = `item-${Date.now()}`;
      await KnowledgeService.saveWorkspaceItem({
        id,
        title: newTitle.trim(),
        content: newContent.trim(),
        itemType: newItemType,
        tags: '[]',
        sourceRef: 'User Note',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      toast.success('Workspace item added');
      setNewTitle('');
      setNewContent('');
      setIsAddingItem(false);
      const updated = await KnowledgeService.fetchWorkspaceItems();
      setWorkspaceItems(updated);
    } catch (e: any) {
      toast.error(`Failed to save item: ${e.message}`);
    }
  };

  const handleDeleteWorkspaceItem = async (id: string) => {
    try {
      await KnowledgeService.deleteWorkspaceItem(id);
      setWorkspaceItems((prev) => prev.filter((i) => i.id !== id));
      toast.info('Item removed from workspace');
    } catch (e: any) {
      toast.error(`Failed to delete item: ${e.message}`);
    }
  };

  const handleExportKnowledgePack = async () => {
    try {
      const pack = await KnowledgeService.exportKnowledgePack();
      const jsonStr = JSON.stringify(pack, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `noectra-knowledge-pack-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Knowledge Pack snapshot exported!');
    } catch (e: any) {
      toast.error(`Export failed: ${e.message}`);
    }
  };

  const handleToggleModelStatus = async (model: OfflineModelItem) => {
    const nextStatus = model.status === 'installed' ? 'available' : 'installed';
    try {
      await KnowledgeService.updateOfflineModelStatus(model.id, nextStatus);
      setOfflineModels((prev) =>
        prev.map((m) => (m.id === model.id ? { ...m, status: nextStatus } : m))
      );
      toast.success(`Model status updated to ${nextStatus}`);
    } catch (e: any) {
      toast.error(`Failed to update model: ${e.message}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 max-w-7xl mx-auto w-full space-y-6 overflow-y-auto">
      
      {/* Sub-tab Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-3">
        <button
          onClick={() => setActiveSubTab('workspace')}
          className={`px-4 py-2 rounded-2xl text-xs font-semibold flex items-center space-x-2 transition ${
            activeSubTab === 'workspace'
              ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
              : 'bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Personal Workspace (EXT-004)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('graph')}
          className={`px-4 py-2 rounded-2xl text-xs font-semibold flex items-center space-x-2 transition ${
            activeSubTab === 'graph'
              ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20'
              : 'bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
          }`}
        >
          <Network className="w-4 h-4" />
          <span>Knowledge Graph (EXT-002)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('recommendations')}
          className={`px-4 py-2 rounded-2xl text-xs font-semibold flex items-center space-x-2 transition ${
            activeSubTab === 'recommendations'
              ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
              : 'bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>Recommendations (EXT-001)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('models')}
          className={`px-4 py-2 rounded-2xl text-xs font-semibold flex items-center space-x-2 transition ${
            activeSubTab === 'models'
              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
              : 'bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>Offline Models (EXT-006)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('packs')}
          className={`px-4 py-2 rounded-2xl text-xs font-semibold flex items-center space-x-2 transition ${
            activeSubTab === 'packs'
              ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
              : 'bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Knowledge Packs (EXT-007)</span>
        </button>
      </div>

      {/* EXT-004: Workspace & Dossier */}
      {activeSubTab === 'workspace' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Personal Knowledge Workspace
              </h3>
              <p className="text-xs text-slate-500">
                Collect articles, custom notes, and highlights into unified research workspaces.
              </p>
            </div>

            <button
              onClick={() => setIsAddingItem(!isAddingItem)}
              className="px-4 py-2 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold flex items-center space-x-1.5 transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Research Note</span>
            </button>
          </div>

          {/* Add form */}
          {isAddingItem && (
            <form
              onSubmit={handleCreateWorkspaceItem}
              className="p-5 rounded-3xl bg-white dark:bg-[#121622] border border-slate-200 dark:border-white/10 shadow-sm space-y-3"
            >
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Note or topic title..."
                  className="flex-1 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                />
                <select
                  value={newItemType}
                  onChange={(e: any) => setNewItemType(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-800 dark:text-slate-200"
                >
                  <option value="note">Note</option>
                  <option value="article">Article Ref</option>
                  <option value="highlight">Highlight</option>
                </select>
              </div>

              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Write your research summary, hypotheses, or extracted passages..."
                rows={3}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
              />

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddingItem(false)}
                  className="px-3 py-1.5 rounded-xl text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold"
                >
                  Save Item
                </button>
              </div>
            </form>
          )}

          {/* Items grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workspaceItems.length === 0 ? (
              <div className="col-span-full py-16 text-center text-xs text-slate-400">
                No items in your workspace. Click &ldquo;Add Research Note&rdquo; to begin organizing.
              </div>
            ) : (
              workspaceItems.map((item) => (
                <div
                  key={item.id}
                  className="p-5 rounded-3xl bg-white dark:bg-[#121622] border border-slate-200 dark:border-white/10 shadow-sm space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
                        {item.itemType}
                      </span>
                      <button
                        onClick={() => handleDeleteWorkspaceItem(item.id)}
                        className="p-1 text-slate-400 hover:text-red-500 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {item.title}
                    </h4>

                    <p className="text-xs text-slate-600 dark:text-slate-300 font-sans leading-relaxed whitespace-pre-wrap">
                      {item.content}
                    </p>
                  </div>

                  <div className="text-[10px] text-slate-400 border-t border-slate-100 dark:border-white/5 pt-2">
                    Updated: {new Date(item.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* EXT-002: Knowledge Graph Explorer */}
      {activeSubTab === 'graph' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Medical & Scientific Knowledge Graph
            </h3>
            <p className="text-xs text-slate-500">
              Extracted medical entities (Diseases, Drugs, Procedures) and evidence-backed relationships with verifiable citations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Entities list */}
            <div className="p-5 rounded-3xl bg-white dark:bg-[#121622] border border-slate-200 dark:border-white/10 shadow-sm space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                Entities ({graphEntities.length})
              </h4>
              <div className="space-y-2">
                {graphEntities.map((ent) => (
                  <div
                    key={ent.id}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {ent.name}
                      </span>
                      <p className="text-[11px] text-slate-400">
                        {ent.entityType} • {ent.articlePath}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400 font-semibold">
                      {(ent.confidence * 100).toFixed(0)}% Conf
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Relations list */}
            <div className="p-5 rounded-3xl bg-white dark:bg-[#121622] border border-slate-200 dark:border-white/10 shadow-sm space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                Evidence-Backed Relations ({graphRelations.length})
              </h4>
              <div className="space-y-2">
                {graphRelations.map((rel) => (
                  <div
                    key={rel.id}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 space-y-1 text-xs"
                  >
                    <div className="flex items-center space-x-2 font-semibold text-slate-800 dark:text-slate-200">
                      <span className="text-purple-500 font-bold">{rel.sourceEntity}</span>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10">
                        {rel.relationType}
                      </span>
                      <span className="text-sky-500 font-bold">{rel.targetEntity}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 italic">
                      &ldquo;{rel.citation}&rdquo;
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EXT-001: Recommendations */}
      {activeSubTab === 'recommendations' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Recommended Knowledge Archives
            </h3>
            <p className="text-xs text-slate-500">
              Local companion archives based on your collections and search interests (100% private, zero cloud telemetry).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                className="p-5 rounded-3xl bg-white dark:bg-[#121622] border border-slate-200 dark:border-white/10 shadow-sm space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                    {rec.category || 'Reference'}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {rec.title}
                  </h4>
                  <p className="text-xs text-slate-500 line-clamp-2">
                    {rec.description}
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/5">
                  <p className="text-[11px] text-slate-400 italic">
                    Reason: {rec.reason}
                  </p>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {(rec.size_bytes / (1024 * 1024)).toFixed(1)} MB • {rec.language}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EXT-006: Offline Models Manager */}
      {activeSubTab === 'models' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Offline AI & Inference Models
            </h3>
            <p className="text-xs text-slate-500">
              Manage local ONNX runtime models for neural embeddings, reranking, translation, and text-to-speech.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {offlineModels.map((mod) => (
              <div
                key={mod.id}
                className="p-5 rounded-3xl bg-white dark:bg-[#121622] border border-slate-200 dark:border-white/10 shadow-sm space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                      {mod.modelType}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      mod.status === 'installed'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-slate-100 dark:bg-white/10 text-slate-500'
                    }`}>
                      {mod.status}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {mod.name}
                  </h4>

                  <p className="text-xs text-slate-500">
                    Hardware: {mod.hardwareReqs} • License: {mod.license}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/5">
                  <span className="text-xs font-mono text-slate-400">
                    {(mod.sizeBytes / (1024 * 1024)).toFixed(0)} MB
                  </span>

                  <button
                    onClick={() => handleToggleModelStatus(mod)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 transition"
                  >
                    {mod.status === 'installed' ? 'Deactivate' : 'Enable Local'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EXT-007: Knowledge Packs */}
      {activeSubTab === 'packs' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-[#121622] border border-slate-200 dark:border-white/10 shadow-sm space-y-4 max-w-2xl">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Knowledge Pack Management (EXT-007)
              </h3>
              <p className="text-xs text-slate-500">
                Export your entire research environment (collections, metadata, workspace notes, and knowledge graph) to share or restore.
              </p>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={handleExportKnowledgePack}
              className="px-5 py-2.5 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold flex items-center space-x-2 transition shadow-md shadow-indigo-500/20"
            >
              <Share2 className="w-4 h-4" />
              <span>Export Knowledge Pack (.json)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

