import { Settings } from 'lucide-react';
import { useState } from 'react';
import SettingsDialogue from './SettingsDialogue';
import { AnimatePresence } from 'framer-motion';

const SettingsButton = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  return (
    <>
      <button
        type="button"
        className="relative group p-2.5 rounded-2xl bg-black/5 dark:bg-white/[0.04] border border-black/10 dark:border-white/[0.08] text-black/50 dark:text-white/40 hover:text-black/90 dark:hover:text-[#4FC3F7] hover:border-black/20 dark:hover:border-[#4FC3F7]/40 hover:bg-black/10 dark:hover:bg-[#4FC3F7]/10 hover:shadow-[0_0_16px_rgba(79,195,247,0.25)] transition-all duration-300 cursor-pointer active:scale-95"
        onClick={() => setIsOpen(true)}
        title="Settings"
      >
        <Settings size={18} className="transition-transform duration-300 group-hover:rotate-45" />
      </button>
      <AnimatePresence>
        {isOpen && <SettingsDialogue isOpen={isOpen} setIsOpen={setIsOpen} />}
      </AnimatePresence>
    </>
  );
};

export default SettingsButton;
