// Noectra AI - Ultra-low latency UI Sound Engine powered by Web Audio API

export type SoundKey =
  | 'startup'
  | 'dispatch'
  | 'tick'
  | 'complete'
  | 'pop'
  | 'copy'
  | 'page_flip'
  | 'notification';

const SOUND_FILES: Record<SoundKey, string> = {
  startup: '/sounds/startup.wav',
  dispatch: '/sounds/dispatch.wav',
  tick: '/sounds/tick.wav',
  complete: '/sounds/complete.wav',
  pop: '/sounds/pop.wav',
  copy: '/sounds/copy.wav',
  page_flip: '/sounds/page-flip.wav',
  notification: '/sounds/notification.wav',
};

class SoundService {
  private audioCtx: AudioContext | null = null;
  private bufferCache = new Map<SoundKey, AudioBuffer>();
  private isLoading = new Map<SoundKey, Promise<AudioBuffer | null>>();
  private lastPlayTime = new Map<SoundKey, number>();
  private masterGain: GainNode | null = null;

  constructor() {
    // Preload non-intrusively in idle time if window is defined
    if (typeof window !== 'undefined') {
      window.addEventListener(
        'click',
        () => {
          this.initContext();
        },
        { once: true },
      );
    }
  }

  private initContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.audioCtx) {
      const AudioCtxClass =
        window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
        this.masterGain = this.audioCtx.createGain();
        this.masterGain.connect(this.audioCtx.destination);
        this.updateMasterVolume();
      }
    }

    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }

    return this.audioCtx;
  }

  public isEnabled(): boolean {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem('soundEffectsEnabled');
    return stored === null ? true : stored === 'true';
  }

  public setEnabled(enabled: boolean): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('soundEffectsEnabled', enabled ? 'true' : 'false');
    window.dispatchEvent(new Event('client-config-changed'));
  }

  public getVolume(): number {
    if (typeof window === 'undefined') return 0.7;
    const val = localStorage.getItem('soundVolume');
    if (!val) return 0.7;
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0.7 : Math.max(0, Math.min(1, parsed));
  }

  public setVolume(vol: number): void {
    if (typeof window === 'undefined') return;
    const clamped = Math.max(0, Math.min(1, vol));
    localStorage.setItem('soundVolume', clamped.toString());
    this.updateMasterVolume();
    window.dispatchEvent(new Event('client-config-changed'));
  }

  private updateMasterVolume(): void {
    if (this.masterGain && this.audioCtx) {
      const vol = this.getVolume();
      this.masterGain.gain.setValueAtTime(vol, this.audioCtx.currentTime);
    }
  }

  private async loadBuffer(key: SoundKey): Promise<AudioBuffer | null> {
    if (this.bufferCache.has(key)) {
      return this.bufferCache.get(key)!;
    }

    if (this.isLoading.has(key)) {
      return this.isLoading.get(key)!;
    }

    const loadPromise = (async () => {
      try {
        const url = SOUND_FILES[key];
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const arrayBuf = await res.arrayBuffer();

        const ctx = this.initContext();
        if (!ctx) return null;

        const audioBuf = await ctx.decodeAudioData(arrayBuf);
        this.bufferCache.set(key, audioBuf);
        return audioBuf;
      } catch (err) {
        console.warn(`[SoundService] Failed to load audio ${key}:`, err);
        return null;
      } finally {
        this.isLoading.delete(key);
      }
    })();

    this.isLoading.set(key, loadPromise);
    return loadPromise;
  }

  /**
   * Preloads all sound assets into memory for 0ms instant playback
   */
  public async preloadAll(): Promise<void> {
    const keys = Object.keys(SOUND_FILES) as SoundKey[];
    await Promise.all(keys.map((k) => this.loadBuffer(k)));
  }

  /**
   * Plays a UI sound effect with anti-spam debouncing and volume control
   */
  public async play(
    key: SoundKey,
    options?: { volume?: number; playbackRate?: number },
  ): Promise<void> {
    if (!this.isEnabled()) return;

    // Debounce rapid calls to prevent distortion
    const now = Date.now();
    const lastTime = this.lastPlayTime.get(key) || 0;
    const minInterval = key === 'tick' ? 40 : 120;
    if (now - lastTime < minInterval) return;
    this.lastPlayTime.set(key, now);

    try {
      const ctx = this.initContext();
      if (!ctx) return;

      const buffer = await this.loadBuffer(key);
      if (!buffer) return;

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      if (options?.playbackRate) {
        source.playbackRate.value = options.playbackRate;
      }

      const individualGain = ctx.createGain();
      const vol = options?.volume ?? 1.0;
      individualGain.gain.setValueAtTime(vol, ctx.currentTime);

      source.connect(individualGain);
      if (this.masterGain) {
        individualGain.connect(this.masterGain);
      } else {
        individualGain.connect(ctx.destination);
      }

      source.start(0);
    } catch {
      // Audio autoplay policy or hardware muted - fail silently
    }
  }
}

export const soundService = new SoundService();
