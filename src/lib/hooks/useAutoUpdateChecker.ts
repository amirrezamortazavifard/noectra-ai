import { useEffect } from 'react';
import { toast } from 'sonner';
import { CURRENT_VERSION, GITHUB_API_LATEST } from '@/components/Settings/Sections/Updates';
import { soundService } from '@/lib/sound/soundService';

const compareVersions = (current: string, latest: string): boolean => {
  const cleanCurrent = current.replace(/^v/, '').trim();
  const cleanLatest = latest.replace(/^v/, '').trim();

  const cParts = cleanCurrent.split('.').map((n) => parseInt(n, 10) || 0);
  const lParts = cleanLatest.split('.').map((n) => parseInt(n, 10) || 0);

  for (let i = 0; i < Math.max(cParts.length, lParts.length); i++) {
    const c = cParts[i] || 0;
    const l = lParts[i] || 0;
    if (l > c) return true;
    if (l < c) return false;
  }
  return false;
};

export function useAutoUpdateChecker() {
  useEffect(() => {
    // Only check if user hasn't explicitly disabled auto-updates
    const isAutoUpdateEnabled = localStorage.getItem('noectra_auto_update') !== 'false';
    if (!isAutoUpdateEnabled) return;

    // Check once per session on startup after a gentle delay
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(GITHUB_API_LATEST, {
          headers: { Accept: 'application/vnd.github.v3+json' },
        });
        if (!response.ok) return;

        const data = await response.json();
        if (data && data.tag_name) {
          const isNewer = compareVersions(CURRENT_VERSION, data.tag_name);
          if (isNewer) {
            soundService.play('notification');
            toast.info(`🎉 New version ${data.tag_name} is available!`, {
              description: 'Click to open the Update Center and download the latest version for your system.',
              action: {
                label: 'View Update',
                onClick: () => {
                  window.dispatchEvent(
                    new CustomEvent('open-settings', { detail: { section: 'updates' } })
                  );
                },
              },
              duration: 10000,
            });
          }
        }
      } catch {
        // Silently ignore network failures on startup
      }
    }, 4000);

    return () => clearTimeout(timer);
  }, []);
}
