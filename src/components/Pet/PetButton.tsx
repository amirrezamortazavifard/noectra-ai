import { cn } from '@/lib/utils';
import { invoke } from '@tauri-apps/api/core';
import { Cat } from 'lucide-react';
import React, { useState } from 'react';

const PetButton = () => {
  const [active, setActive] = useState(false);

  const togglePet = async () => {
    setActive(!active);
    try {
      await invoke('toggle_pet_window');
    } catch (e) {
      console.error('Failed to toggle pet window:', e);
    }
  };

  return (
    <div
      onClick={togglePet}
      title="Toggle Desktop Pet"
      className={cn(
        'group relative flex items-center justify-center w-8 h-8 rounded-xl cursor-pointer transition-all duration-300',
        active
          ? 'bg-sky-500/20 text-sky-500 shadow-[0_0_12px_rgba(14,165,233,0.3)]'
          : 'bg-black/[0.04] dark:bg-white/[0.03] text-black/50 dark:text-white/50 hover:bg-black/[0.08] dark:hover:bg-white/[0.08] hover:text-black dark:hover:text-white',
      )}
    >
      <Cat size={16} strokeWidth={active ? 2 : 1.5} className="transition-transform group-hover:scale-110 group-active:scale-95" />
    </div>
  );
};

export default PetButton;
