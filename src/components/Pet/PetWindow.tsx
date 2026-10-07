import React, { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';

export default function PetWindow() {
  const [mood, setMood] = useState<'idle' | 'happy' | 'thinking' | 'sleeping'>('idle');
  const [isMini, setIsMini] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });

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

  const handleMouseDown = (e: React.MouseEvent) => {
    if (showMenu) setShowMenu(false);
    if (e.button === 0) { // Left click
      import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
        getCurrentWindow().startDragging();
      }).catch(console.error);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuPos({ x: e.clientX, y: e.clientY });
    setShowMenu(true);
  };

  const hidePet = () => {
    setShowMenu(false);
    import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
      getCurrentWindow().hide();
    }).catch(console.error);
  };

  const petSize = isMini ? 80 : 180;

  return (
    <div 
      data-tauri-drag-region 
      className="w-screen h-screen flex items-center justify-center cursor-grab active:cursor-grabbing bg-transparent"
      onDoubleClick={handleDoubleClick}
      onMouseDown={handleMouseDown}
      onContextMenu={handleContextMenu}
    >
      {showMenu && (
        <div 
          className="absolute z-50 bg-[#0c1017]/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-1.5 flex flex-col min-w-[140px]"
          style={{ top: menuPos.y, left: menuPos.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 text-xs text-white/50 font-medium uppercase tracking-wider mb-1">
            Noectra Pet
          </div>
          <button 
            onClick={() => { setIsMini(!isMini); setShowMenu(false); }}
            className="text-left px-3 py-2 text-sm text-white/90 hover:bg-white/10 rounded-lg transition-colors"
          >
            {isMini ? 'Make Large' : 'Make Mini'}
          </button>
          <button 
            onClick={() => { setMood(mood === 'sleeping' ? 'idle' : 'sleeping'); setShowMenu(false); }}
            className="text-left px-3 py-2 text-sm text-white/90 hover:bg-white/10 rounded-lg transition-colors"
          >
            {mood === 'sleeping' ? 'Wake Up' : 'Sleep'}
          </button>
          <div className="h-px bg-white/10 my-1 mx-2" />
          <button 
            onClick={hidePet}
            className="text-left px-3 py-2 text-sm text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
          >
            Hide Pet
          </button>
        </div>
      )}
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
