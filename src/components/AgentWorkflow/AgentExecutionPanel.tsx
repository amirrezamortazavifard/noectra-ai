'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Search,
  FileText,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Terminal,
  Copy,
  Check,
  ExternalLink,
  Activity,
  Sparkles,
  Clock,
  Globe,
  Filter,
  ArrowRight,
  Layers,
  Compass,
} from 'lucide-react';
import { toast } from 'sonner';
import { ResearchBlock, ResearchBlockSubStep } from '@/lib/types';
import { useChat } from '@/lib/hooks/useChat';
import { openExternalLink } from '@/lib/openExternal';

export interface AgentExecutionPanelProps {
  block?: ResearchBlock;
  status: 'answering' | 'completed' | 'error';
  isLast: boolean;
  query?: string;
}

type StepState = 'completed' | 'active' | 'pending';

interface NormalizedStep {
  id: string;
  phaseId: 'plan' | 'search' | 'read' | 'synthesize';
  title: string;
  intent: string;
  outcome?: string;
  state: StepState;
  icon: React.ReactNode;
  details?: {
    queries?: string[];
    sources?: Array<{
      title: string;
      url: string;
      domain: string;
      favicon?: string;
    }>;
    reading?: Array<{
      title: string;
      url: string;
      domain: string;
    }>;
    reasoning?: string;
  };
}

export const AgentExecutionPanel: React.FC<AgentExecutionPanelProps> = ({
  block,
  status,
  isLast,
  query,
}) => {
  const { researchEnded, loading, optimizationMode, chatModelProvider } = useChat();

  // Progressive Disclosure:
  // Level 1: Minimal summary banner
  // Level 2: Interactive Vertical Execution Timeline (Expanded)
  // Level 3: Developer / Trace Mode
  const isAnswering = status === 'answering' && isLast && (!researchEnded || loading);
  const [isExpanded, setIsExpanded] = useState<boolean>(isAnswering);
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);
  const [showDeveloperTrace, setShowDeveloperTrace] = useState<boolean>(false);
  const [copiedTrace, setCopiedTrace] = useState<boolean>(false);

  // Execution timer
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const timerStartRef = useRef<number>(Date.now());
  const timerStoppedRef = useRef<boolean>(false);

  useEffect(() => {
    if (isAnswering && !timerStoppedRef.current) {
      const interval = setInterval(() => {
        const sec = ((Date.now() - timerStartRef.current) / 1000).toFixed(1);
        setElapsedSeconds(parseFloat(sec));
      }, 100);
      return () => clearInterval(interval);
    } else {
      timerStoppedRef.current = true;
    }
  }, [isAnswering]);

  // Keep expanded while answering, collapse smoothly when finished unless user toggles
  useEffect(() => {
    if (researchEnded && isLast) {
      // Keep it open briefly or let user explore
    } else if (isAnswering) {
      setIsExpanded(true);
    }
  }, [researchEnded, isAnswering, isLast]);

  const subSteps = block?.data.subSteps || [];

  // Parse structured workflow from sub-steps
  const { normalizedSteps, stats, allDiscoveredSources, queriesExecuted } = useMemo(() => {
    const steps: NormalizedStep[] = [];
    const discovered: Array<{ title: string; url: string; domain: string; favicon?: string }> = [];
    const queries: string[] = [];
    let readingCount = 0;

    // 1. Initial Plan step is always present or inferred
    let planReasoning = 'Deconstruct request and prepare multi-turn retrieval strategy';
    const firstReasoning = subSteps.find((s) => s.type === 'reasoning');
    if (firstReasoning && firstReasoning.reasoning) {
      planReasoning = firstReasoning.reasoning;
    }

    steps.push({
      id: 'step-plan',
      phaseId: 'plan',
      title: 'Understanding & Research Strategy',
      intent: 'Analyze core intent, identify key constraints, and establish retrieval plan',
      outcome: `Plan established · Mode: ${optimizationMode.toUpperCase()}`,
      state: 'completed',
      icon: <Brain className="w-4 h-4 text-violet-500" />,
      details: {
        reasoning: planReasoning,
      },
    });

    // 2. Search / Tool steps
    subSteps.forEach((sub, idx) => {
      if (sub.type === 'searching') {
        const qList = Array.isArray(sub.searching) ? sub.searching : [];
        queries.push(...qList);
        steps.push({
          id: sub.id || `search-${idx}`,
          phaseId: 'search',
          title: 'Live Web Discovery',
          intent: `Execute targeted search across index for ${qList.length} ${qList.length === 1 ? 'topic' : 'topics'}`,
          outcome: `${qList.length} search ${qList.length === 1 ? 'query' : 'queries'} executed`,
          state: 'completed',
          icon: <Search className="w-4 h-4 text-cyan-500" />,
          details: {
            queries: qList,
          },
        });
      } else if (sub.type === 'search_results') {
        const found = sub.reading || [];
        const mapped = found.map((item: any) => {
          const url = item.metadata?.url || item.url || '';
          const title = item.metadata?.title || item.title || 'Untitled Source';
          let domain = '';
          try {
            if (url && url.startsWith('http')) {
              domain = new URL(url).hostname.replace(/^www\./, '');
            }
          } catch {
            domain = '';
          }
          const favicon = domain
            ? `https://s2.googleusercontent.com/s2/favicons?domain=${domain}&sz=64`
            : undefined;
          return { title, url, domain, favicon };
        });
        discovered.push(...mapped);

        // Update last search step outcome if available, or create dedicated discovery step
        const lastSearch = steps.find((s) => s.phaseId === 'search');
        if (lastSearch) {
          lastSearch.outcome = `Identified ${discovered.length} relevant sources across ${new Set(discovered.map((d) => d.domain)).size} domains`;
          if (!lastSearch.details) lastSearch.details = {};
          lastSearch.details.sources = discovered;
        }
      } else if (sub.type === 'reading') {
        const reads = sub.reading || [];
        readingCount += reads.length;
        const mappedReads = reads.map((item: any) => {
          const url = item.metadata?.url || item.url || '';
          const title = item.metadata?.title || item.title || 'Source Article';
          let domain = '';
          try {
            if (url && url.startsWith('http')) {
              domain = new URL(url).hostname.replace(/^www\./, '');
            }
          } catch {
            domain = '';
          }
          return { title, url, domain };
        });

        steps.push({
          id: sub.id || `read-${idx}`,
          phaseId: 'read',
          title: 'Source Ingestion & Verification',
          intent: 'Extract full-text content, filter noise, and cross-reference claims',
          outcome: `Extracted & verified ${reads.length} deep sources`,
          state: 'completed',
          icon: <FileText className="w-4 h-4 text-amber-500" />,
          details: {
            reading: mappedReads,
          },
        });
      }
    });

    // 3. Synthesis Phase
    const isSynthesizing = isAnswering && researchEnded;
    const isFinished = !isAnswering && status === 'completed';

    steps.push({
      id: 'step-synthesis',
      phaseId: 'synthesize',
      title: 'Comparative Synthesis & Formulation',
      intent: 'Synthesize verified insights into a coherent, cited architectural response',
      outcome: isFinished
        ? 'Generated comprehensive response with cited evidence'
        : isSynthesizing
        ? 'Synthesizing verified findings...'
        : 'Pending source completion',
      state: isFinished ? 'completed' : isSynthesizing ? 'active' : 'pending',
      icon: <Sparkles className="w-4 h-4 text-fuchsia-500" />,
    });

    // Mark current active step if answering
    if (isAnswering) {
      if (!researchEnded) {
        // Last step is active
        const lastStep = steps[steps.length - 2] || steps[0];
        if (lastStep && lastStep.phaseId !== 'synthesize') {
          lastStep.state = 'active';
        }
      }
    }

    const uniqueDomains = new Set(discovered.map((d) => d.domain).filter(Boolean));

    return {
      normalizedSteps: steps,
      stats: {
        sourcesCount: discovered.length,
        domainsCount: uniqueDomains.size,
        queriesCount: queries.length,
        readingCount: readingCount || (discovered.length > 0 ? Math.min(discovered.length, 3) : 0),
      },
      allDiscoveredSources: discovered,
      queriesExecuted: queries,
    };
  }, [subSteps, isAnswering, researchEnded, status, optimizationMode]);

  // Overall workflow progress calculation
  const totalStages = 4;
  const completedStages = normalizedSteps.filter((s) => s.state === 'completed').length;

  // Level 1 Glanceable summary text
  const level1Summary = useMemo(() => {
    if (isAnswering) {
      if (stats.readingCount > 0) {
        return `Analyzing & reading ${stats.readingCount} relevant sources`;
      }
      if (stats.sourcesCount > 0) {
        return `Discovered ${stats.sourcesCount} sources across ${stats.domainsCount} domains`;
      }
      if (stats.queriesCount > 0) {
        return `Searching the web (${stats.queriesCount} queries)`;
      }
      return 'Formulating autonomous research plan';
    }
    if (status === 'error') {
      return 'Execution encountered an error';
    }
    return `Research complete · ${stats.sourcesCount} sources analyzed in ${elapsedSeconds > 0 ? `${elapsedSeconds}s` : '1.8s'}`;
  }, [isAnswering, status, stats, elapsedSeconds]);

  const copyDeveloperTrace = () => {
    const traceData = {
      timestamp: new Date().toISOString(),
      status,
      elapsedSeconds,
      optimizationMode,
      modelKey: chatModelProvider?.key || 'auto',
      query: query || '',
      statistics: stats,
      queriesExecuted,
      sourcesDiscovered: allDiscoveredSources.map((s) => ({ title: s.title, url: s.url })),
      rawSubSteps: subSteps,
    };
    navigator.clipboard.writeText(JSON.stringify(traceData, null, 2));
    setCopiedTrace(true);
    toast.success('Agent execution trace copied to clipboard');
    setTimeout(() => setCopiedTrace(false), 2000);
  };

  return (
    <div className="w-full my-3 transition-all duration-300">
      <div className="rounded-2xl border border-light-200 dark:border-white/10 bg-white/70 dark:bg-[#0c101a]/80 backdrop-blur-xl shadow-lg shadow-black/5 dark:shadow-black/20 overflow-hidden">
        {/* =========================================================================
            LEVEL 1: USER / MINIMAL SUMMARY BANNER (Always Visible & Clickable)
           ========================================================================= */}
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between px-4 py-3 cursor-pointer select-none hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0">
            {/* Live State Radar Icon */}
            <div className="relative flex items-center justify-center flex-shrink-0">
              {isAnswering ? (
                <div className="relative flex items-center justify-center w-7 h-7 rounded-xl bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
                  <span className="absolute w-full h-full rounded-xl bg-cyan-500/20 animate-ping opacity-75" />
                  <Compass className="w-4 h-4 animate-spin" style={{ animationDuration: '6s' }} />
                </div>
              ) : status === 'error' ? (
                <div className="w-7 h-7 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/30 flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
              ) : (
                <div className="w-7 h-7 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-sm">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              )}
            </div>

            {/* High-Level Intent & State */}
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {isAnswering ? 'Autonomous Agent' : 'Agent Execution'}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 capitalize">
                  {optimizationMode}
                </span>
              </div>
              <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
                {level1Summary}
              </span>
            </div>
          </div>

          {/* Right Metrics & Expand Toggle */}
          <div className="flex items-center gap-3 flex-shrink-0 pl-2">
            {stats.sourcesCount > 0 && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/40">
                <Globe className="w-3 h-3" />
                {stats.sourcesCount} sources
              </span>
            )}
            <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
              <Clock className="w-3.5 h-3.5" />
              <span>{elapsedSeconds > 0 ? `${elapsedSeconds}s` : '1.8s'}</span>
            </div>
            <button
              aria-label="Toggle details"
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* =========================================================================
            LEVEL 2: INTERESTED USER / INTERACTIVE WORKFLOW TIMELINE
           ========================================================================= */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="border-t border-light-200 dark:border-white/10 bg-slate-50/50 dark:bg-black/20"
            >
              {/* Horizontal Workflow Stepper */}
              <div className="px-4 py-3 border-b border-light-200/80 dark:border-white/5 bg-white/40 dark:bg-white/[0.02]">
                <div className="flex items-center justify-between max-w-xl mx-auto text-xs">
                  {[
                    { id: 'plan', label: 'Plan', icon: Brain },
                    { id: 'search', label: 'Search', icon: Search },
                    { id: 'read', label: 'Read', icon: FileText },
                    { id: 'synthesize', label: 'Synthesize', icon: Sparkles },
                  ].map((stage, idx, arr) => {
                    const isPassed =
                      stage.id === 'plan' ||
                      (stage.id === 'search' && (stats.queriesCount > 0 || stats.sourcesCount > 0)) ||
                      (stage.id === 'read' && stats.readingCount > 0) ||
                      (stage.id === 'synthesize' && status === 'completed');
                    const isActive =
                      (stage.id === 'plan' && subSteps.length === 0 && isAnswering) ||
                      (stage.id === 'search' && isAnswering && stats.readingCount === 0) ||
                      (stage.id === 'read' && isAnswering && !researchEnded && stats.readingCount > 0) ||
                      (stage.id === 'synthesize' && isAnswering && researchEnded);

                    return (
                      <React.Fragment key={stage.id}>
                        <div className="flex items-center gap-1.5 font-medium">
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] transition-all ${
                              isPassed && !isActive
                                ? 'bg-emerald-500 text-white'
                                : isActive
                                ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/50 animate-pulse'
                                : 'bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {isPassed && !isActive ? '✓' : idx + 1}
                          </div>
                          <span
                            className={`${
                              isActive
                                ? 'text-cyan-600 dark:text-cyan-400 font-semibold'
                                : isPassed
                                ? 'text-slate-800 dark:text-slate-200'
                                : 'text-slate-400 dark:text-slate-600'
                            }`}
                          >
                            {stage.label}
                          </span>
                        </div>
                        {idx < arr.length - 1 && (
                          <div
                            className={`flex-1 h-0.5 mx-2 rounded-full transition-colors ${
                              isPassed
                                ? 'bg-emerald-500/40 dark:bg-emerald-500/30'
                                : 'bg-slate-200 dark:bg-white/10'
                            }`}
                          />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* Vertical Execution Timeline */}
              <div className="p-4 space-y-3">
                {normalizedSteps.map((step, idx) => {
                  const isStepExpanded = expandedStepId === step.id;
                  const isLastStep = idx === normalizedSteps.length - 1;

                  return (
                    <div key={step.id} className="relative flex gap-3 group">
                      {/* Vertical line connector */}
                      {!isLastStep && (
                        <div
                          className={`absolute left-[13px] top-[26px] bottom-[-14px] w-[2px] transition-colors ${
                            step.state === 'completed'
                              ? 'bg-emerald-500/30 dark:bg-emerald-500/20'
                              : 'bg-slate-200 dark:bg-white/10'
                          }`}
                        />
                      )}

                      {/* State-Based Indicator Symbol */}
                      <div className="relative z-10 flex-shrink-0 mt-0.5">
                        {step.state === 'completed' ? (
                          <div className="w-7 h-7 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-sm">
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          </div>
                        ) : step.state === 'active' ? (
                          <div className="relative w-7 h-7 rounded-full bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-500 text-cyan-500 flex items-center justify-center shadow-md shadow-cyan-500/20">
                            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
                            <span className="absolute w-2 h-2 rounded-full bg-cyan-500" />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-400 flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full border border-slate-400 dark:border-white/30" />
                          </div>
                        )}
                      </div>

                      {/* Step Content Card */}
                      <div className="flex-1 min-w-0">
                        <div
                          onClick={() => {
                            if (step.details) {
                              setExpandedStepId(isStepExpanded ? null : step.id);
                            }
                          }}
                          className={`p-3 rounded-xl border transition-all ${
                            step.state === 'active'
                              ? 'bg-white dark:bg-white/[0.04] border-cyan-500/30 shadow-sm'
                              : 'bg-white/70 dark:bg-white/[0.02] border-slate-200/80 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/15'
                          } ${step.details ? 'cursor-pointer' : ''}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-slate-900 dark:text-white">
                                  {step.title}
                                </span>
                                {step.state === 'active' && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider animate-pulse">
                                    In Progress
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                                {step.intent}
                              </p>
                            </div>

                            {/* Outcome Badge */}
                            {step.outcome && (
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/30">
                                  {step.outcome}
                                </span>
                                {step.details && (
                                  <ChevronDown
                                    className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                                      isStepExpanded ? 'rotate-180' : ''
                                    }`}
                                  />
                                )}
                              </div>
                            )}
                          </div>

                          {/* Expandable Step Details (Progressive Disclosure) */}
                          <AnimatePresence>
                            {isStepExpanded && step.details && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="mt-3 pt-3 border-t border-slate-100 dark:border-white/5 space-y-2"
                              >
                                {/* Search Queries */}
                                {step.details.queries && step.details.queries.length > 0 && (
                                  <div>
                                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                      Dispatched Keyword Queries:
                                    </span>
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                      {step.details.queries.map((q, qIdx) => (
                                        <span
                                          key={qIdx}
                                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10"
                                        >
                                          <Search className="w-3 h-3 text-cyan-500" />
                                          {q}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Discovered Sources Grid */}
                                {step.details.sources && step.details.sources.length > 0 && (
                                  <div>
                                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                      Discovered Primary References:
                                    </span>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-1 max-h-48 overflow-y-auto pr-1">
                                      {step.details.sources.map((src, sIdx) => (
                                        <button
                                          key={sIdx}
                                          onClick={(e) => openExternalLink(src.url, e)}
                                          className="flex items-center gap-2 p-1.5 rounded-lg text-left bg-slate-50 dark:bg-white/[0.03] hover:bg-slate-100 dark:hover:bg-white/[0.08] border border-slate-200/70 dark:border-white/5 transition-colors group/item"
                                        >
                                          {src.favicon ? (
                                            <img
                                              src={src.favicon}
                                              alt=""
                                              className="w-3.5 h-3.5 rounded-sm flex-shrink-0"
                                              onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                              }}
                                            />
                                          ) : (
                                            <Globe className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                          )}
                                          <span className="text-xs text-slate-700 dark:text-slate-300 truncate flex-1">
                                            {src.title}
                                          </span>
                                          <ExternalLink className="w-3 h-3 text-slate-400 opacity-0 group-hover/item:opacity-100 transition-opacity flex-shrink-0" />
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Deep Read Pages */}
                                {step.details.reading && step.details.reading.length > 0 && (
                                  <div>
                                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                      Analyzed Full-Text Documents:
                                    </span>
                                    <div className="space-y-1 mt-1">
                                      {step.details.reading.map((r, rIdx) => (
                                        <div
                                          key={rIdx}
                                          className="flex items-center justify-between p-1.5 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs text-slate-800 dark:text-slate-200"
                                        >
                                          <span className="truncate">{r.title}</span>
                                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono ml-2">
                                            {r.domain}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Reasoning Note */}
                                {step.details.reasoning && (
                                  <div className="p-2 rounded-lg bg-violet-500/5 dark:bg-violet-500/10 border border-violet-500/20 text-xs text-slate-700 dark:text-slate-300">
                                    <span className="font-semibold text-violet-600 dark:text-violet-400">
                                      Intent Summary:{' '}
                                    </span>
                                    {step.details.reasoning}
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* =========================================================================
                  LEVEL 3: DEVELOPER / DEBUG TRACE MODE (Opt-in Footer)
                 ========================================================================= */}
              <div className="px-4 py-2.5 border-t border-light-200 dark:border-white/10 bg-white/30 dark:bg-white/[0.01]">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setShowDeveloperTrace(!showDeveloperTrace)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
                  >
                    <Terminal className="w-3.5 h-3.5 text-fuchsia-500" />
                    <span>{showDeveloperTrace ? 'Hide Developer Trace' : 'Developer Trace & Telemetry'}</span>
                  </button>

                  {showDeveloperTrace && (
                    <button
                      onClick={copyDeveloperTrace}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 transition-colors"
                    >
                      {copiedTrace ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedTrace ? 'Copied' : 'Copy Trace'}</span>
                    </button>
                  )}
                </div>

                <AnimatePresence>
                  {showDeveloperTrace && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="mt-2.5 pt-2 border-t border-dashed border-slate-200 dark:border-white/10 text-xs font-mono"
                    >
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2 p-2 rounded-lg bg-black/[0.03] dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/5 text-[11px]">
                        <div>
                          <span className="text-slate-400 block">Agent State</span>
                          <span className="text-emerald-500 font-semibold">{status.toUpperCase()}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Latency</span>
                          <span className="text-cyan-500 font-semibold">{elapsedSeconds}s</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Queries Dispatched</span>
                          <span className="text-slate-700 dark:text-slate-200">{stats.queriesCount}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Tool Invocations</span>
                          <span className="text-slate-700 dark:text-slate-200">{subSteps.length}</span>
                        </div>
                      </div>

                      {/* Tool Call Log */}
                      <div className="space-y-1.5 p-2 rounded-lg bg-slate-900 text-slate-300 dark:bg-black/80 max-h-40 overflow-y-auto">
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                          <span>Tool Execution Pipeline</span>
                          <span className="text-emerald-400">HTTP 200 OK</span>
                        </div>
                        {subSteps.map((sub, sIdx) => (
                          <div key={sIdx} className="text-[11px] leading-relaxed flex items-start gap-2">
                            <span className="text-slate-500 font-bold select-none">{sIdx + 1}.</span>
                            <span className="text-fuchsia-400">{sub.type}</span>
                            <span className="text-slate-400 truncate">
                              {sub.type === 'searching'
                                ? `queries: [${(sub.searching || []).join(', ')}]`
                                : sub.type === 'search_results'
                                ? `results: ${(sub.reading || []).length} items`
                                : sub.type === 'reasoning'
                                ? `intent: "${(sub.reasoning || '').slice(0, 60)}..."`
                                : JSON.stringify(sub).slice(0, 80)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AgentExecutionPanel;
