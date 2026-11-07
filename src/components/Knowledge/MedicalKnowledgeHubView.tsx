import React, { useState, useEffect } from 'react';
import {
  KnowledgeService,
  MedicalGlossaryTerm,
  ClinicalGuideline,
  ClinicalConflict,
} from '@/lib/services/knowledge';
import {
  HeartPulse,
  BookOpen,
  AlertTriangle,
  ShieldCheck,
  Search,
  Star,
  ExternalLink,
  Plus,
  Scale,
  Award,
  Filter,
  CheckCircle,
  FileCheck2,
} from 'lucide-react';
import { toast } from 'sonner';

export const MedicalKnowledgeHubView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'glossary' | 'guidelines' | 'conflicts' | 'collections'>('glossary');
  
  // Glossary state
  const [glossaryTerms, setGlossaryTerms] = useState<MedicalGlossaryTerm[]>([]);
  const [glossaryQuery, setGlossaryQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('all');
  const [loadingGlossary, setLoadingGlossary] = useState(false);

  // Guidelines state
  const [guidelines, setGuidelines] = useState<ClinicalGuideline[]>([]);
  const [loadingGuidelines, setLoadingGuidelines] = useState(false);

  // Conflicts state
  const [conflicts, setConflicts] = useState<ClinicalConflict[]>([]);
  const [loadingConflicts, setLoadingConflicts] = useState(false);

  useEffect(() => {
    loadGlossary();
    loadGuidelines();
    loadConflicts();
  }, []);

  const loadGlossary = async (q = '', spec = 'all') => {
    setLoadingGlossary(true);
    try {
      const list = await KnowledgeService.fetchMedicalGlossary(
        q || undefined,
        spec === 'all' ? undefined : spec
      );
      setGlossaryTerms(list);
    } catch (e: any) {
      toast.error(`Failed to load glossary: ${e.message}`);
    } finally {
      setLoadingGlossary(false);
    }
  };

  const loadGuidelines = async () => {
    setLoadingGuidelines(true);
    try {
      const list = await KnowledgeService.fetchClinicalGuidelines();
      setGuidelines(list);
    } catch (e: any) {
      toast.error(`Failed to load guidelines: ${e.message}`);
    } finally {
      setLoadingGuidelines(false);
    }
  };

  const loadConflicts = async () => {
    setLoadingConflicts(true);
    try {
      const list = await KnowledgeService.fetchClinicalConflicts();
      setConflicts(list);
    } catch (e: any) {
      toast.error(`Failed to load conflicts: ${e.message}`);
    } finally {
      setLoadingConflicts(false);
    }
  };

  const handleToggleFavoriteGlossary = async (term: MedicalGlossaryTerm) => {
    try {
      await KnowledgeService.saveMedicalGlossaryTerm({
        ...term,
        favorite: !term.favorite,
      });
      setGlossaryTerms((prev) =>
        prev.map((t) => (t.id === term.id ? { ...t, favorite: !t.favorite } : t))
      );
    } catch (e: any) {
      toast.error(`Failed to update favorite: ${e.message}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 max-w-7xl mx-auto w-full space-y-6 overflow-y-auto">
      
      {/* MED-007: Clinical Safety & Disclaimer Banner */}
      <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-start space-x-3.5">
        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs text-amber-900 dark:text-amber-200">
          <h4 className="font-bold text-sm">
            Clinical Safety & Diagnostic Disclaimer (MED-007)
          </h4>
          <p className="leading-relaxed">
            The medical encyclopedias, guidelines, and drug information in this knowledge store are provided strictly for educational and clinical reference purposes. Final patient dosage calculation and therapeutic decisions must always be confirmed against institutional protocols and certified laboratory values.
          </p>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-white/10 pb-3">
        <button
          onClick={() => setActiveTab('glossary')}
          className={`px-4 py-2 rounded-2xl text-xs font-semibold flex items-center space-x-2 transition ${
            activeTab === 'glossary'
              ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
              : 'bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Medical Glossary & Terminology (MED-004)</span>
        </button>

        <button
          onClick={() => setActiveTab('guidelines')}
          className={`px-4 py-2 rounded-2xl text-xs font-semibold flex items-center space-x-2 transition ${
            activeTab === 'guidelines'
              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
              : 'bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Clinical Guidelines & Evidence (MED-002 & MED-005)</span>
        </button>

        <button
          onClick={() => setActiveTab('conflicts')}
          className={`px-4 py-2 rounded-2xl text-xs font-semibold flex items-center space-x-2 transition ${
            activeTab === 'conflicts'
              ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20'
              : 'bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>Guideline Conflicts & Variances (MED-006)</span>
        </button>
      </div>

      {/* Tab 1: Medical Glossary (MED-004) */}
      {activeTab === 'glossary' && (
        <div className="space-y-4">
          
          {/* Glossary Search & Filters */}
          <div className="p-4 rounded-3xl bg-white dark:bg-[#121622] border border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={glossaryQuery}
                onChange={(e) => {
                  setGlossaryQuery(e.target.value);
                  loadGlossary(e.target.value, selectedSpecialty);
                }}
                placeholder="Search English or Persian medical terms, acronyms, or ICD codes..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
              />
            </div>

            <div className="w-full sm:w-56">
              <select
                value={selectedSpecialty}
                onChange={(e) => {
                  setSelectedSpecialty(e.target.value);
                  loadGlossary(glossaryQuery, e.target.value);
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
              >
                <option value="all">All Specialties</option>
                <option value="Cardiology">Cardiology</option>
                <option value="Pulmonology">Pulmonology</option>
                <option value="Endocrinology">Endocrinology</option>
                <option value="Critical Care">Critical Care</option>
                <option value="Emergency Medicine">Emergency Medicine</option>
              </select>
            </div>
          </div>

          {/* Glossary Terms Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {glossaryTerms.map((term) => (
              <div
                key={term.id}
                className="p-5 rounded-3xl bg-white dark:bg-[#121622] border border-slate-200 dark:border-white/10 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {term.termEn}
                      </h4>
                      {term.specialty && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
                          {term.specialty}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 mt-0.5 text-xs font-semibold text-slate-700 dark:text-slate-300" dir="rtl">
                      <span>{term.termFa}</span>
                      {term.phoneticFa && (
                        <span className="text-[11px] text-slate-400 font-normal">
                          ({term.phoneticFa})
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleFavoriteGlossary(term)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-amber-500 transition"
                  >
                    <Star className={`w-4 h-4 ${term.favorite ? 'fill-current' : ''}`} />
                  </button>
                </div>

                {term.definitionEn && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
                    {term.definitionEn}
                  </p>
                )}

                {term.definitionFa && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-sans" dir="rtl">
                    {term.definitionFa}
                  </p>
                )}

                {term.clinicalSignificance && (
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 text-[11px] text-slate-600 dark:text-slate-400 space-y-0.5">
                    <strong className="text-slate-800 dark:text-slate-200">Clinical Significance:</strong>
                    <p>{term.clinicalSignificance}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Clinical Guidelines & Evidence (MED-002 & MED-005) */}
      {activeTab === 'guidelines' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {guidelines.map((g) => (
              <div
                key={g.id}
                className="p-5 rounded-3xl bg-white dark:bg-[#121622] border border-slate-200 dark:border-white/10 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {g.guidelineCode}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                        Level {g.evidenceGrade}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                      {g.title}
                    </h4>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    {g.publicationYear}
                  </span>
                </div>

                <div className="text-xs text-slate-500 font-medium">
                  {g.organization} • {g.specialty} • {g.version}
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {g.summary}
                </p>

                {g.sourceUrl && (
                  <a
                    href={g.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1.5 text-xs text-sky-500 hover:text-sky-600 font-medium"
                  >
                    <span>Official Protocol Reference</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Clinical Conflicts & Variances (MED-006) */}
      {activeTab === 'conflicts' && (
        <div className="space-y-4">
          <div className="space-y-4">
            {conflicts.map((c) => (
              <div
                key={c.id}
                className="p-6 rounded-3xl bg-white dark:bg-[#121622] border border-slate-200 dark:border-white/10 shadow-sm space-y-4"
              >
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-500">
                    <Scale className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {c.topic}
                  </h4>
                </div>

                {/* Side-by-side stance comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 space-y-1.5">
                    <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400">
                      Standard A ({c.guidelineAId})
                    </span>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      {c.stanceA}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 space-y-1.5">
                    <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400">
                      Standard B ({c.guidelineBId})
                    </span>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      {c.stanceB}
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                  <strong className="font-semibold">Clinical Implication:</strong>
                  <p>{c.clinicalImplication}</p>
                </div>

                {c.expertConsensus && (
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    <strong>Expert Consensus:</strong> {c.expertConsensus}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

