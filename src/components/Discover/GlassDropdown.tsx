import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DropdownItem {
  key: string;
  label: string;
  icon?: string | React.ReactNode;
  badge?: string;
  description?: string;
}

interface GlassDropdownProps {
  label: string;
  icon?: React.ReactNode;
  items: DropdownItem[];
  selectedKey: string;
  onSelect: (key: string) => void;
  widthClass?: string;
  prefix?: string;
}

export const GlassDropdown: React.FC<GlassDropdownProps> = ({
  label,
  icon,
  items,
  selectedKey,
  onSelect,
  widthClass = 'min-w-[210px]',
  prefix,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const selectedItem = items.find((i) => i.key === selectedKey);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 180);
  };

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative inline-block"
    >
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all duration-200 shadow-sm border select-none',
          'bg-light-secondary/60 dark:bg-white/[0.04] hover:bg-light-secondary dark:hover:bg-white/[0.08]',
          'backdrop-blur-md',
          isOpen
            ? 'border-cyan-500/50 text-cyan-700 dark:text-cyan-300 shadow-cyan-500/10'
            : 'border-light-200/80 dark:border-white/[0.08] text-black/75 dark:text-white/80 hover:text-black dark:hover:text-white hover:border-light-300 dark:hover:border-white/20'
        )}
      >
        <span className="flex items-center gap-1.5 text-black/50 dark:text-white/50">
          {icon}
          {prefix && <span className="font-semibold text-black/40 dark:text-white/40">{prefix}:</span>}
        </span>

        <span className="font-semibold text-black/90 dark:text-white truncate max-w-[140px] sm:max-w-[180px]">
          {selectedItem ? (
            <span className="flex items-center gap-1">
              {typeof selectedItem.icon === 'string' ? (
                <span>{selectedItem.icon}</span>
              ) : (
                selectedItem.icon
              )}
              <span className="truncate">{selectedItem.label}</span>
            </span>
          ) : (
            label
          )}
        </span>

        <ChevronDown
          size={14}
          className={cn(
            'text-black/40 dark:text-white/40 transition-transform duration-200 flex-shrink-0',
            isOpen && 'rotate-180 text-cyan-600 dark:text-cyan-400'
          )}
        />
      </button>

      {/* Glassmorphic Dropdown Menu */}
      {isOpen && (
        <div
          className={cn(
            'absolute left-0 top-full mt-1.5 z-40 p-1.5 rounded-2xl shadow-2xl border animate-in fade-in zoom-in-95 duration-150',
            'bg-white/90 dark:bg-[#121316]/95 backdrop-blur-2xl',
            'border-light-200/90 dark:border-white/[0.12]',
            widthClass
          )}
        >
          <div className="max-h-64 overflow-y-auto space-y-0.5 scrollbar-thin scrollbar-thumb-light-300 dark:scrollbar-thumb-neutral-700">
            {items.map((item) => {
              const isSelected = item.key === selectedKey;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    onSelect(item.key);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs text-left transition-all duration-150',
                    isSelected
                      ? 'bg-cyan-500/15 text-cyan-800 dark:text-cyan-200 font-semibold'
                      : 'text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/[0.06] hover:text-black dark:hover:text-white'
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    {item.icon && (
                      <span className="flex-shrink-0 text-xs">
                        {typeof item.icon === 'string' ? item.icon : item.icon}
                      </span>
                    )}
                    <div className="flex flex-col truncate">
                      <span className="truncate">{item.label}</span>
                      {item.description && (
                        <span className="text-[10px] text-black/40 dark:text-white/40 font-normal truncate">
                          {item.description}
                        </span>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <Check size={13} className="text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default GlassDropdown;
