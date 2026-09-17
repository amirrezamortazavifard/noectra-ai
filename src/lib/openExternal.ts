import { openUrl } from '@tauri-apps/plugin-opener';

export async function openExternalLink(
  url: string | undefined | null,
  e?: React.MouseEvent
): Promise<void> {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  if (!url || typeof url !== 'string' || !url.trim()) {
    return;
  }

  const cleanUrl = url.trim();

  // Strategy 1: Call internal backend /api/open_url (OS-level spawn via cmd /C start)
  try {
    const res = await fetch('/api/open_url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: cleanUrl }),
    });
    if (res.ok) {
      return;
    }
  } catch {
    // Continue to next strategy if backend call fails
  }

  // Strategy 2: Tauri v2 desktop opener plugin
  try {
    await openUrl(cleanUrl);
    return;
  } catch {
    // Continue to next strategy if Tauri opener fails
  }

  // Strategy 3: Standard browser window.open
  try {
    window.open(cleanUrl, '_blank', 'noopener,noreferrer');
  } catch (err) {
    console.error('All external link opener strategies failed:', err);
  }
}
