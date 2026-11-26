import React, { useEffect, useState } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { Check, Loader2, RotateCcw, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';

interface InstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const InstructionsModal = ({ isOpen, onClose }: InstructionsModalProps) => {
  const [instructions, setInstructions] = useState('');
  const [defaultInstructions, setDefaultInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/survival/state');
        if (res.ok) {
          const data = await res.json();
          const def = data.defaultInstructions ?? '';
          setDefaultInstructions(def);
          setInstructions(data.settings?.customInstructions || def);
        }
      } catch {
        toast.error('Failed to load instructions.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isOpen]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payloadValue =
        instructions.trim() === '' || instructions.trim() === defaultInstructions.trim()
          ? null
          : instructions;
      const res = await fetch('/api/survival/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customInstructions: payloadValue }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success('AI Instructions saved.');
      onClose();
    } catch (e: any) {
      toast.error(`Save failed: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-2xl rounded-2xl border border-light-200 dark:border-dark-200 bg-light-primary dark:bg-dark-primary shadow-2xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-light-200 dark:border-dark-200">
            <div className="flex items-center gap-2">
              <Sparkles size={17} className="text-sky-500" />
              <DialogTitle className="text-sm font-semibold text-slate-900 dark:text-white">
                AI System Instructions (Offline & Survival Rules)
              </DialogTitle>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-600 dark:text-white/60 hover:bg-light-200 dark:hover:bg-dark-200"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-5 space-y-3">
            <p className="text-xs text-slate-600 dark:text-white/65">
              Customize how the assistant behaves, prioritizes life-safety warnings, or structures medical & technical answers. Today&apos;s date, your uploaded file names, and Memory notes are appended automatically.
            </p>

            {loading ? (
              <div className="py-10 flex items-center justify-center text-slate-600 dark:text-white/60 text-xs">
                <Loader2 size={16} className="animate-spin mr-2" /> Loading instructions...
              </div>
            ) : (
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={12}
                className="w-full rounded-xl border border-light-200 dark:border-white/15 bg-white dark:bg-[#0c1017] p-3 text-xs leading-relaxed text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/30 font-mono"
              />
            )}
          </div>

          <div className="flex items-center justify-between px-5 py-3 border-t border-light-200 dark:border-dark-200 bg-light-secondary/40 dark:bg-dark-secondary/40">
            <button
              type="button"
              onClick={() => setInstructions(defaultInstructions)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-white/80 hover:bg-light-200 dark:hover:bg-dark-200 transition"
            >
              <RotateCcw size={13} /> Reset to Survival Default
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-light-200 dark:border-white/15 text-slate-700 dark:text-white/80 hover:bg-light-200 dark:hover:bg-dark-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-sky-600 hover:bg-sky-700 text-white transition"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                Save Instructions
              </button>
            </div>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
};

export default InstructionsModal;
