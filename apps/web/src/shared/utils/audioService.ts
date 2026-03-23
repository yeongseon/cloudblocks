import logger from './logger';

export type SoundName = 'block-snap' | 'delete' | 'validation-success' | 'validation-error';

export class AudioService {
  private ctx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private bufferCache: Map<string, AudioBuffer> = new Map();
  private muted: boolean = true; // Default OFF per Oracle constraint

  private async ensureContext(): Promise<AudioContext> {
    if (this.ctx) return this.ctx;

    try {
      // Support Safari's prefixed AudioContext
      const AudioCtx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

      if (!AudioCtx) {
        throw new Error('AudioContext not supported in this browser');
      }

      this.ctx = new AudioCtx();
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.value = this.muted ? 0 : 1;
      this.gainNode.connect(this.ctx.destination);

      // Handle iOS interrupted state
      this.ctx.onstatechange = () => {
        if (
          this.ctx &&
          (this.ctx.state === 'suspended' || (this.ctx.state as string) === 'interrupted')
        ) {
          this.ctx.resume().catch(() => {
            // Silently ignore — audio is non-critical
          });
        }
      };
    } catch (err) {
      logger.warn('[AudioService] Failed to create AudioContext:', err);
      throw err;
    }

    return this.ctx!;
  }

  private async resumeIfSuspended(): Promise<void> {
    if (!this.ctx) return;
    try {
      if (this.ctx.state === 'suspended' || (this.ctx.state as string) === 'interrupted') {
        await this.ctx.resume();
      }
    } catch (err) {
      logger.warn('[AudioService] Failed to resume AudioContext:', err);
    }
  }

  private normalizeBase64(input: string): string {
    const trimmed = input.trim();
    const commaIndex = trimmed.indexOf(',');
    const withoutPrefix =
      trimmed.startsWith('data:') && commaIndex >= 0 ? trimmed.slice(commaIndex + 1) : trimmed;

    return withoutPrefix.replace(/\s+/g, '');
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const normalized = this.normalizeBase64(base64);
    const binaryString = atob(normalized);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  async loadSound(name: SoundName, base64Data: string): Promise<void> {
    try {
      const ctx = await this.ensureContext();
      const arrayBuffer = this.base64ToArrayBuffer(base64Data);
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      this.bufferCache.set(name, audioBuffer);
    } catch (err) {
      logger.warn(`[AudioService] Failed to load sound "${name}":`, err);
    }
  }

  async playSound(name: SoundName): Promise<void> {
    if (this.muted) return;

    const buffer = this.bufferCache.get(name);
    if (!buffer) return;

    try {
      const ctx = await this.ensureContext();
      await this.resumeIfSuspended();

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.gainNode!);
      source.start(0);
    } catch (err) {
      logger.warn(`[AudioService] Failed to play sound "${name}":`, err);
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.gainNode) {
      this.gainNode.gain.value = muted ? 0 : 1;
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  async preloadAll(sounds: Record<SoundName, string>): Promise<void> {
    const entries = Object.entries(sounds) as [SoundName, string][];
    await Promise.all(entries.map(([name, data]) => this.loadSound(name, data)));
  }
}

export const audioService = new AudioService();
