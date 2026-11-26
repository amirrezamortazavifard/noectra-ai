import React, { useEffect, useState } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { Brain, Check, Loader2, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

interface MemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MemoryModal = ({ isOpen, onClose }: MemoryModalProps) => {
  const [text, setText] = useState('');
  const [baseText, setBaseText] = useState('');
  const [aiWrites, setAiWrites] = useState(true);
  const [maxChars, setMaxChars] = useState(6000);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadMemory = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/survival/memory');
      if (res.ok) {
        const data = await res.json();
        setText(data.text ?? '');
        setBaseText(data.text ?? '');
        setAiWrites(data.aiWrites ?? true);
        setMaxChars(data.maxChars ?? 6000);
      }
    } catch {
      toast.error('Failed to load Memory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadMemory();
    }
  }, [isOpen]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/survival/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, base: baseText, aiWrites }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setText(data.text ?? '');
      setBaseText(data.text ?? '');
      if (data.kept?.length > 0) {
        toast.success(`Memory saved (preserved ${data.kept.length} new AI note).`);
      } else {
        toast.success('Memory saved.');
      }
      onClose();
    } catch (e: any) {
      toast.error(`Failed to save Memory: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    try {
      const res = await fetch('/api/survival/memory/clear', { method: 'POST' });
      if (res.ok) {
        setText('');
        setBaseText('');
        toast.success('Memory cleared.');
      }
    } catch {
      toast.error('Failed to clear Memory.');
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-xl rounded-2xl border border-light-200 dark:border-dark-200 bg-light-primary dark:bg-dark-primary shadow-2xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-light-200 dark:border-dark-200">
            <div className="flex items-center gap-2">
              <Brain size={17} className="text-emerald-500" />
              <DialogTitle className="text-sm font-semibold text-slate-900 dark:text-white">
                Persistent Memory
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

          <div className="p-5 space-y-4">
            <p className="text-xs text-slate-600 dark:text-white/65">
              One note per line. Stored privately on disk (`survival-memory.txt`) and shared across chats so the assistant remembers allergies, medications, household members, or equipment.
            </p>

            {loading ? (
              <div className="py-10 flex items-center justify-center text-slate-600 dark:text-white/60 text-xs">
                <Loader2 size={16} className="animate-spin mr-2" /> Loading notes...
              </div>
            ) : (
              <>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={10}
                  placeholder="Example:&#10;Allergic to penicillin.&#10;Has a 2000W inverter generator and Sawyer Squeeze filter."
                  className="w-full rounded-xl border border-light-200 dark:border-white/15 bg-white dark:bg-[#0c1017] p-3 text-xs leading-relaxed text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/30 font-mono"
                />

                <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-white/60">
                  <label className="inline-flex items-center gap-2 cursor-pointer text-slate-800 dark:text-white/85">
                    <input
                      type="checkbox"
                      checked={aiWrites}
                      onChange={(e) => setAiWrites(e.target.checked)}
                    />
                    <span>Allow AI to remember / update facts after answers</span>
                  </label>
                  <span>
                    {text.length} / {maxChars} chars
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center justify-between px-5 py-3 border-t border-light-200 dark:border-dark-200 bg-light-secondary/40 dark:bg-dark-secondary/40">
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition"
            >
              <Trash2 size={13} /> Clear All
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
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                Save Memory
              </button>
            </div>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
};

export default MemoryModal;
