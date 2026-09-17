import React, { useEffect, useState } from 'react';
import { UIConfigField } from '@/lib/config/types';
import SettingsField from '../SettingsField';
import { Power, Volume2, VolumeX, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { soundService } from '@/lib/sound/soundService';

const Preferences = ({
  fields,
  values,
}: {
  fields: UIConfigField[];
  values: Record<string, any>;
}) => {
  const [autostartEnabled, setAutostartEnabled] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    import('@tauri-apps/api/core')
      .then(({ invoke }) => {
        invoke<boolean>('get_autostart_status')
          .then((enabled) => {
            setAutostartEnabled(enabled);
          })
          .catch(() => {});
      })
      .catch(() => {});
  }, []);

  const handleToggleAutostart = async () => {
    setIsToggling(true);
    const targetState = !autostartEnabled;
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('set_autostart_status', { enable: targetState });
      setAutostartEnabled(targetState);
      if (targetState) {
        toast.success('Noectra AI will now start automatically on system boot in the system tray.');
      } else {
        toast.info('Automatic system startup disabled.');
      }
    } catch (err: any) {
      console.error('Failed to toggle autostart:', err);
      toast.error('Failed to modify system startup configuration.');
    } finally {
      setIsToggling(false);
    }
  };

  const [soundEnabled, setSoundEnabled] = useState(() => {
    return typeof window !== 'undefined' ? soundService.isEnabled() : true;
  });
  const [soundVolume, setSoundVolume] = useState(() => {
    return typeof window !== 'undefined' ? soundService.getVolume() : 0.7;
  });

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundService.setEnabled(next);
    if (next) {
      soundService.play('pop');
      toast.success('Interface sound effects enabled.');
    } else {
      toast.info('Interface sound effects muted.');
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setSoundVolume(val);
    soundService.setVolume(val);
  };

  const handleTestSound = () => {
    soundService.play('complete');
  };

  return (
    <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
      {/* Launch on Boot Card */}
      <div className="rounded-xl border border-light-200 dark:border-dark-200 bg-light-primary/90 dark:bg-[#0c101a]/70 p-5 backdrop-blur-xl shadow-sm dark:shadow-lg transition-all hover:border-light-300 dark:hover:border-white/[0.12]">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-light-200 dark:border-white/[0.08] bg-light-secondary dark:bg-white/[0.03] text-cyan-600 dark:text-cyan-400 shadow-inner">
              <Power className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-black dark:text-white/90">Launch on System Boot</h3>
                <span
                  className={`rounded px-1.5 py-0.5 text-[9px] font-mono border ${
                    autostartEnabled
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                      : 'border-light-200 dark:border-white/[0.06] bg-light-secondary dark:bg-white/[0.02] text-black/50 dark:text-white/40'
                  }`}
                >
                  {autostartEnabled ? 'ENABLED' : 'DISABLED'}
                </span>
              </div>
              <p className="mt-1 text-xs text-black/60 dark:text-white/50 max-w-md leading-relaxed">
                Automatically initialize Noectra AI silently in the system tray when your system starts, ensuring background neural models are instantly accessible.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isToggling}
            onClick={handleToggleAutostart}
            aria-label="Toggle auto-start on boot"
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              autostartEnabled ? 'bg-cyan-500' : 'bg-black/20 dark:bg-white/[0.12]'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                autostartEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Interface Sound Effects Card */}
      <div className="rounded-xl border border-light-200 dark:border-dark-200 bg-light-primary/90 dark:bg-[#0c101a]/70 p-5 backdrop-blur-xl shadow-sm dark:shadow-lg transition-all hover:border-light-300 dark:hover:border-white/[0.12] space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-light-200 dark:border-white/[0.08] bg-light-secondary dark:bg-white/[0.03] text-cyan-600 dark:text-cyan-400 shadow-inner">
              {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5 text-black/40 dark:text-white/40" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-black dark:text-white/90">Interface Sound Effects</h3>
                <span
                  className={`rounded px-1.5 py-0.5 text-[9px] font-mono border ${
                    soundEnabled
                      ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300'
                      : 'border-light-200 dark:border-white/[0.06] bg-light-secondary dark:bg-white/[0.02] text-black/50 dark:text-white/40'
                  }`}
                >
                  {soundEnabled ? 'ACTIVE' : 'MUTED'}
                </span>
              </div>
              <p className="mt-1 text-xs text-black/60 dark:text-white/50 max-w-md leading-relaxed">
                Experience refined, non-intrusive audio cues for prompt dispatch, live agent discovery, answer completion, and notifications.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggleSound}
            aria-label="Toggle interface sound effects"
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              soundEnabled ? 'bg-cyan-500' : 'bg-black/20 dark:bg-white/[0.12]'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                soundEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Volume Level & Preview Button */}
        {soundEnabled && (
          <div className="pt-3 border-t border-light-200/70 dark:border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 max-w-xs">
              <span className="text-xs text-black/60 dark:text-white/50 font-medium whitespace-nowrap">
                Volume ({Math.round(soundVolume * 100)}%)
              </span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={soundVolume}
                onChange={handleVolumeChange}
                className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            <button
              type="button"
              onClick={handleTestSound}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-light-200 dark:border-white/10 bg-light-secondary dark:bg-white/5 hover:bg-light-300 dark:hover:bg-white/10 text-slate-800 dark:text-neutral-200 transition active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>Preview Sound</span>
            </button>
          </div>
        )}
      </div>

      {fields
        .filter((f) => f.key !== 'soundEffectsEnabled')
        .map((field) => (
          <SettingsField
            key={field.key}
            field={field}
            value={
              (field.scope === 'client'
                ? localStorage.getItem(field.key)
                : values[field.key]) ?? field.default
            }
            dataAdd="preferences"
          />
        ))}
    </div>
  );
};

export default Preferences;
