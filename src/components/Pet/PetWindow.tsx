import React, { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';

export default function PetWindow() {
  const [mood, setMood] = useState<'idle' | 'happy' | 'thinking' | 'sleeping'>('idle');
  const [isMini, setIsMini] = useState(false);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    listen<{ mood: 'idle' | 'happy' | 'thinking' | 'sleeping' }>('pet-state-update', (event) => {
      if (event.payload?.mood) {
        setMood(event.payload.mood);
      }
    }).then(dispose => {
      unlisten = dispose;
    }).catch(console.error);

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const getSvgPath = () => {
    if (isMini) {
       switch (mood) {
          case 'happy': return '/pets/clawd/assets/clawd-mini-happy.svg';
          case 'thinking': return '/pets/clawd/assets/clawd-mini-typing.svg';
          case 'sleeping': return '/pets/clawd/assets/clawd-mini-sleep.svg';
          default: return '/pets/clawd/assets/clawd-mini-idle.svg';
       }
    }

    switch (mood) {
      case 'happy': return '/pets/clawd/assets/clawd-happy.svg';
      case 'thinking': return '/pets/clawd/assets/clawd-working-thinking.svg';
      case 'sleeping': return '/pets/clawd/assets/clawd-sleeping.svg';
      default: return '/pets/clawd/assets/clawd-idle-living.svg';
    }
  };

  const handleDoubleClick = () => setIsMini(!isMini);
  const petSize = isMini ? 80 : 180;

  return (
    <div 
      data-tauri-drag-region 
      className="w-screen h-screen flex items-center justify-center cursor-grab active:cursor-grabbing bg-transparent"
      onDoubleClick={handleDoubleClick}
    >
      <div 
        className="flex items-center justify-center pointer-events-none transition-all duration-300"
        style={{ width: `${petSize}px`, height: `${petSize}px` }}
      >
        <object
            data={getSvgPath()}
            type="image/svg+xml"
            style={{ width: `${petSize}px`, height: `${petSize}px`, pointerEvents: 'none' }}
            aria-label="Noectra Pet"
        />
      </div>
    </div>
  );
}
