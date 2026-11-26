import React, { useState } from 'react';
import {
  BookOpen,
  Brain,
  Cloud,
  Cpu,
  FileText,
  SlidersHorizontal,
} from 'lucide-react';
import { useChat } from '@/lib/hooks/useChat';
import { LengthLimit, ReasoningBudget } from '@/lib/localLlm/types';
import MemoryModal from './MemoryModal';
import YourFilesModal from './YourFilesModal';
import InstructionsModal from './InstructionsModal';

const SurvivalControlsBar = () => {
  const {
    modelMode,
    setModelMode,
    useOfflineLibrary,
    setUseOfflineLibrary,
    reasoningBudget,
    setReasoningBudget,
    lengthLimit,
    setLengthLimit,
  } = useChat();

  const [memoryOpen, setMemoryOpen] = useState(false);
  const [filesOpen, setFilesOpen] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        {/* Offline / Online Mode Switch */}
        <div
          className="inline-flex items-center rounded-lg p-0.5 bg-light-200/70 dark:bg-dark-primary border border-light-200 dark:border-white/10"
          title="Switch between Offline local models and Online API models"
        >
          <button
            type="button"
            onClick={() => setModelMode('offline')}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md font-medium transition ${
              modelMode === 'offline'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-700 dark:text-white/70 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            <Cpu size={12} /> Offline
          </button>
          <button
            type="button"
            onClick={() => setModelMode('online')}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md font-medium transition ${
              modelMode === 'online'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-700 dark:text-white/70 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            <Cloud size={12} /> Online
          </button>
        </div>

        {/* Offline ZIM + Personal Library Toggle */}
        <button
          type="button"
          onClick={() => setUseOfflineLibrary(!useOfflineLibrary)}
          title="Search installed ZIM archives and Your Files before answering"
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-medium transition ${
            useOfflineLibrary
              ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
              : 'border-light-200 dark:border-white/10 bg-white dark:bg-dark-primary text-slate-700 dark:text-white/70 hover:bg-light-200 dark:hover:bg-white/10'
          }`}
        >
          <BookOpen size={12} /> Library
        </button>

        {/* Reasoning Budget */}
        <label className="inline-flex items-center gap-1 rounded-lg border border-light-200 dark:border-white/10 bg-white dark:bg-dark-primary px-2 py-1 text-slate-700 dark:text-white/80">
          <span className="text-[10px] text-slate-500 dark:text-white/50">Think</span>
          <select
            value={reasoningBudget}
            onChange={(e) => setReasoningBudget(e.target.value as ReasoningBudget)}
            className="bg-transparent font-medium text-slate-900 dark:text-white focus:outline-none cursor-pointer"
          >
            <option value="off" className="bg-white dark:bg-dark-primary text-slate-900 dark:text-white">Off</option>
            <option value="short" className="bg-white dark:bg-dark-primary text-slate-900 dark:text-white">Short (1k)</option>
            <option value="medium" className="bg-white dark:bg-dark-primary text-slate-900 dark:text-white">Medium (4k)</option>
            <option value="long" className="bg-white dark:bg-dark-primary text-slate-900 dark:text-white">Long (16k)</option>
            <option value="none" className="bg-white dark:bg-dark-primary text-slate-900 dark:text-white">Unlimited</option>
          </select>
        </label>

        {/* Answer Length Limit */}
        <label className="inline-flex items-center gap-1 rounded-lg border border-light-200 dark:border-white/10 bg-white dark:bg-dark-primary px-2 py-1 text-slate-700 dark:text-white/80">
          <span className="text-[10px] text-slate-500 dark:text-white/50">Length</span>
          <select
            value={lengthLimit}
            onChange={(e) => setLengthLimit(e.target.value as LengthLimit)}
            className="bg-transparent font-medium text-slate-900 dark:text-white focus:outline-none cursor-pointer"
          >
            <option value="short" className="bg-white dark:bg-dark-primary text-slate-900 dark:text-white">Short</option>
            <option value="normal" className="bg-white dark:bg-dark-primary text-slate-900 dark:text-white">Normal</option>
            <option value="long" className="bg-white dark:bg-dark-primary text-slate-900 dark:text-white">Long</option>
            <option value="none" className="bg-white dark:bg-dark-primary text-slate-900 dark:text-white">No limit</option>
          </select>
        </label>

        {/* Quick Survival Modals */}
        <button
          type="button"
          onClick={() => setMemoryOpen(true)}
          title="View or edit persistent personal Memory notes"
          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-light-200 dark:border-white/10 bg-white dark:bg-dark-primary text-slate-800 dark:text-white/85 hover:bg-light-200 dark:hover:bg-white/10 font-medium transition"
        >
          <Brain size={12} className="text-emerald-500" /> Memory
        </button>
        <button
          type="button"
          onClick={() => setFilesOpen(true)}
          title="Upload and manage personal offline documents"
          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-light-200 dark:border-white/10 bg-white dark:bg-dark-primary text-slate-800 dark:text-white/85 hover:bg-light-200 dark:hover:bg-white/10 font-medium transition"
        >
          <FileText size={12} className="text-sky-500" /> Your Files
        </button>
        <button
          type="button"
          onClick={() => setInstructionsOpen(true)}
          title="Edit AI system & safety instructions"
          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-light-200 dark:border-white/10 bg-white dark:bg-dark-primary text-slate-800 dark:text-white/85 hover:bg-light-200 dark:hover:bg-white/10 font-medium transition"
        >
          <SlidersHorizontal size={12} className="text-violet-500" /> Instructions
        </button>
      </div>

      <MemoryModal isOpen={memoryOpen} onClose={() => setMemoryOpen(false)} />
      <YourFilesModal isOpen={filesOpen} onClose={() => setFilesOpen(false)} />
      <InstructionsModal isOpen={instructionsOpen} onClose={() => setInstructionsOpen(false)} />
    </>
  );
};

export default SurvivalControlsBar;
