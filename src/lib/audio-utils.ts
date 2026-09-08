export function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatFriendlyDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export class ScreenWakeLockManager {
  private sentinel: any = null;
  private isEnabled: boolean = false;
  private visibilityHandler: (() => void) | null = null;

  async request(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    this.isEnabled = true;

    if ('wakeLock' in navigator) {
      try {
        this.sentinel = await (navigator as any).wakeLock.request('screen');
        this.sentinel.addEventListener('release', () => {
          this.sentinel = null;
        });

        if (!this.visibilityHandler) {
          this.visibilityHandler = async () => {
            if (this.isEnabled && document.visibilityState === 'visible' && !this.sentinel) {
              try {
                this.sentinel = await (navigator as any).wakeLock.request('screen');
              } catch (e) {}
            }
          };
          document.addEventListener('visibilitychange', this.visibilityHandler);
        }

        return true;
      } catch (err) {
        console.warn('[WakeLock] Screen Wake Lock failed to activate:', err);
        return false;
      }
    }
    return false;
  }

  async release(): Promise<void> {
    this.isEnabled = false;
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
    if (this.sentinel) {
      try {
        await this.sentinel.release();
      } catch (err) {
        console.warn('[WakeLock] Error releasing wake lock:', err);
      }
      this.sentinel = null;
    }
  }

  isActive(): boolean {
    return this.sentinel !== null;
  }
}

// Audio Level Analyser for visualizer
export class AudioMeter {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private source: MediaStreamAudioSourceNode | null = null;

  start(stream: MediaStream): void {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      this.audioContext = new AudioCtx();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      this.analyser.smoothingTimeConstant = 0.8;

      this.source = this.audioContext.createMediaStreamSource(stream);
      this.source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
    } catch (err) {
      console.warn('[AudioMeter] Could not initialize audio meter:', err);
    }
  }

  getLevel(): number {
    if (!this.analyser || !this.dataArray) return 0;

    this.analyser.getByteFrequencyData(this.dataArray as any);
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i];
    }
    const avg = sum / this.dataArray.length;
    // Normalize to 0-100 percentage
    return Math.min(100, Math.round((avg / 128) * 100));
  }

  stop(): void {
    if (this.source) {
      try {
        this.source.disconnect();
      } catch (e) {}
      this.source = null;
    }
    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch (e) {}
      this.audioContext = null;
    }
    this.analyser = null;
    this.dataArray = null;
  }
}
