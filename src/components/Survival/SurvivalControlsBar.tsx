import React, { useState } from 'react';
import {
  Brain,
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
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
        {/* Quick Survival Modals (borderless ghost pills for low visual noise) */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMemoryOpen(true)}
            title="View or edit persistent personal Memory notes"
            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-slate-700 dark:text-white/80 hover:bg-black/5 dark:hover:bg-white/10 font-medium transition"
          >
            <Brain size={13} className="text-emerald-600 dark:text-emerald-400" />
            <span>Memory</span>
          </button>
          <button
            type="button"
            onClick={() => setFilesOpen(true)}
            title="Upload and manage personal offline documents"
            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-slate-700 dark:text-white/80 hover:bg-black/5 dark:hover:bg-white/10 font-medium transition"
          >
            <FileText size={13} className="text-sky-600 dark:text-sky-400" />
            <span>Your Files</span>
          </button>
          <button
            type="button"
            onClick={() => setInstructionsOpen(true)}
            title="Edit AI system & safety instructions"
            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-slate-700 dark:text-white/80 hover:bg-black/5 dark:hover:bg-white/10 font-medium transition"
          >
            <SlidersHorizontal size={13} className="text-violet-600 dark:text-violet-400" />
            <span>Instructions</span>
          </button>
        </div>

        {/* Compact Tuning Selectors aligned right */}
        <div className="flex items-center gap-1.5">
          <label className="inline-flex items-center gap-1 h-7 rounded-lg border border-light-200/80 dark:border-white/10 bg-white/75 dark:bg-dark-primary/80 px-2 text-slate-600 dark:text-white/70">
            <span className="text-[10px] font-medium">Think</span>
            <select
              value={reasoningBudget}
              onChange={(e) => setReasoningBudget(e.target.value as ReasoningBudget)}
              className="bg-transparent text-[11px] font-medium text-slate-900 dark:text-white focus:outline-none cursor-pointer"
            >
              <option value="off" className="bg-white dark:bg-dark-primary text-slate-900 dark:text-white">Off</option>
              <option value="short" className="bg-white dark:bg-dark-primary text-slate-900 dark:text-white">Short (1k)</option>
              <option value="medium" className="bg-white dark:bg-dark-primary text-slate-900 dark:text-white">Medium (4k)</option>
              <option value="long" className="bg-white dark:bg-dark-primary text-slate-900 dark:text-white">Long (16k)</option>
              <option value="none" className="bg-white dark:bg-dark-primary text-slate-900 dark:text-white">Unlimited</option>
            </select>
          </label>

          <label className="inline-flex items-center gap-1 h-7 rounded-lg border border-light-200/80 dark:border-white/10 bg-white/75 dark:bg-dark-primary/80 px-2 text-slate-600 dark:text-white/70">
            <span className="text-[10px] font-medium">Length</span>
            <select
              value={lengthLimit}
              onChange={(e) => setLengthLimit(e.target.value as LengthLimit)}
              className="bg-transparent text-[11px] font-medium text-slate-900 dark:text-white focus:outline-none cursor-pointer"
            >
              <option value="short" className="bg-white dark:bg-dark-primary text-slate-900 dark:text-white">Short</option>
              <option value="normal" className="bg-white dark:bg-dark-primary text-slate-900 dark:text-white">Normal</option>
              <option value="long" className="bg-white dark:bg-dark-primary text-slate-900 dark:text-white">Long</option>
              <option value="none" className="bg-white dark:bg-dark-primary text-slate-900 dark:text-white">No limit</option>
            </select>
          </label>
        </div>
      </div>

      <MemoryModal isOpen={memoryOpen} onClose={() => setMemoryOpen(false)} />
      <YourFilesModal isOpen={filesOpen} onClose={() => setFilesOpen(false)} />
      <InstructionsModal isOpen={instructionsOpen} onClose={() => setInstructionsOpen(false)} />
    </>
  );
};

export default SurvivalControlsBar;
