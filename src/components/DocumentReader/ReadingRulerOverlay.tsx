import React, { useState, useEffect } from 'react';
import { Sliders, X, Minus, Plus } from 'lucide-react';

interface ReadingRulerOverlayProps {
  enabled: boolean;
  onClose: () => void;
}

export const ReadingRulerOverlay: React.FC<ReadingRulerOverlayProps> = ({
  enabled,
  onClose,
}) => {
  const [mouseY, setMouseY] = useState<number>(window.innerHeight / 2);
  const [rulerHeight, setRulerHeight] = useState<number>(40);
  const [dimOpacity, setDimOpacity] = useState<number>(0.55);
  const [tintColor, setTintColor] = useState<'amber' | 'cyan' | 'slate'>('amber');

  // Track mouse movements across the window
  useEffect(() => {
    if (!enabled) return;

    const handleMouseMove = (e: MouseEvent) => {
      setMouseY(e.clientY);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.altKey && e.key === 'ArrowUp') {
        e.preventDefault();
        setMouseY((prev) => Math.max(50, prev - 24));
      } else if (e.altKey && e.key === 'ArrowDown') {
        e.preventDefault();
        setMouseY((prev) => Math.min(window.innerHeight - 50, prev + 24));
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, onClose]);

  if (!enabled) return null;

  const halfHeight = rulerHeight / 2;
  const topCutoff = Math.max(0, mouseY - halfHeight);
  const bottomCutoff = Math.min(window.innerHeight, mouseY + halfHeight);

  const tintBorders = {
    amber: 'border-amber-400/40 shadow-amber-400/10 bg-amber-400/[0.03]',
    cyan: 'border-cyan-400/40 shadow-cyan-400/10 bg-cyan-400/[0.03]',
    slate: 'border-white/30 shadow-white/10 bg-white/[0.02]',
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-40 select-none overflow-hidden">
      {/* Top Dimmed Area */}
      <div
        className="absolute top-0 left-0 right-0 transition-[height] duration-75 ease-out"
        style={{
          height: `${topCutoff}px`,
          backgroundColor: `rgba(0, 0, 0, ${dimOpacity})`,
        }}
      />

      {/* Focus Slot / Reading Ruler */}
      <div
        className={`absolute left-0 right-0 border-y-2 shadow-2xl transition-[top,height] duration-75 ease-out ${tintBorders[tintColor]}`}
        style={{
          top: `${topCutoff}px`,
          height: `${rulerHeight}px`,
        }}
      >
        {/* Subtle center hairline guide */}
        <div className="w-full h-full flex items-center justify-center opacity-30">
          <div className="w-12 h-0.5 rounded-full bg-white/50" />
        </div>
      </div>

      {/* Bottom Dimmed Area */}
      <div
        className="absolute left-0 right-0 bottom-0 transition-[top] duration-75 ease-out"
        style={{
          top: `${bottomCutoff}px`,
          backgroundColor: `rgba(0, 0, 0, ${dimOpacity})`,
        }}
      />

      {/* Floating Control Pill (pointer events enabled) */}
      <div className="absolute top-20 right-6 pointer-events-auto z-50">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0f131a]/95 text-white/90 backdrop-blur-xl border border-white/15 shadow-xl text-xs">
          <span className="text-[11px] font-medium text-white/60">Ruler:</span>

          <button
            type="button"
            onClick={() => setRulerHeight((h) => Math.max(24, h - 8))}
            title="Decrease Height"
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            <Minus size={12} />
          </button>
          <span className="font-mono text-[11px] w-6 text-center">{rulerHeight}px</span>
          <button
            type="button"
            onClick={() => setRulerHeight((h) => Math.min(80, h + 8))}
            title="Increase Height"
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            <Plus size={12} />
          </button>

          <div className="w-px h-3.5 bg-white/15 mx-1" />

          {/* Color Tint Buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setTintColor('amber')}
              className={`w-3.5 h-3.5 rounded-full bg-amber-400 transition-transform ${
                tintColor === 'amber' ? 'scale-125 ring-2 ring-white/50' : 'opacity-60'
              }`}
            />
            <button
              type="button"
              onClick={() => setTintColor('cyan')}
              className={`w-3.5 h-3.5 rounded-full bg-cyan-400 transition-transform ${
                tintColor === 'cyan' ? 'scale-125 ring-2 ring-white/50' : 'opacity-60'
              }`}
            />
          </div>

          <div className="w-px h-3.5 bg-white/15 mx-1" />

          <button
            type="button"
            onClick={onClose}
            title="Close Reading Ruler (Esc)"
            className="p-1 hover:bg-white/10 rounded text-white/60 hover:text-white transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};
