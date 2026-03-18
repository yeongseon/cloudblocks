import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AudioService, type SoundName } from './audioService';

type MockGainNode = {
  gain: { value: number };
  connect: ReturnType<typeof vi.fn>;
};

type MockBufferSourceNode = {
  buffer: object | null;
  connect: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
};

type MockAudioContext = {
  state: string;
  destination: object;
  onstatechange: (() => void) | null;
  createGain: ReturnType<typeof vi.fn>;
  createBufferSource: ReturnType<typeof vi.fn>;
  decodeAudioData: ReturnType<typeof vi.fn>;
  resume: ReturnType<typeof vi.fn>;
};

function makeMockContext(overrides: Partial<MockAudioContext> = {}): MockAudioContext {
  const gainNode: MockGainNode = { gain: { value: 0 }, connect: vi.fn() };
  const bufferSource: MockBufferSourceNode = { buffer: null, connect: vi.fn(), start: vi.fn() };
  const audioBuffer = { duration: 0.5 };

  return {
    state: 'running',
    destination: {},
    onstatechange: null,
    createGain: vi.fn(() => gainNode),
    createBufferSource: vi.fn(() => bufferSource),
    decodeAudioData: vi.fn(() => Promise.resolve(audioBuffer)),
    resume: vi.fn(() => Promise.resolve()),
    ...overrides,
  };
}

function makeBase64(): string {
  return btoa('fake-audio-data');
}

function makeDataUrlBase64(): string {
  return `data:audio/wav;base64,${makeBase64()}`;
}

function makeDataUrlWithParamsBase64(): string {
  return `data:audio/wav;charset=utf-8;codecs=1;base64,${makeBase64()}`;
}

function stubAudioContext(ctx: MockAudioContext) {
  function MockAudioContextCtor(this: unknown) {
    return ctx;
  }
  vi.stubGlobal('AudioContext', MockAudioContextCtor);
  return MockAudioContextCtor;
}

describe('AudioService', () => {
  let mockCtx: MockAudioContext;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    mockCtx = makeMockContext();
    stubAudioContext(mockCtx);
  });

  it('starts muted by default', () => {
    const svc = new AudioService();
    expect(svc.isMuted()).toBe(true);
  });

  it('setMuted(false) sets gain.value to 1 after context is created', async () => {
    const svc = new AudioService();
    await svc.loadSound('block-snap', makeBase64());
    svc.setMuted(false);
    const gainNode = mockCtx.createGain.mock.results[0]?.value as MockGainNode;
    expect(gainNode.gain.value).toBe(1);
  });

  it('setMuted(true) sets gain.value to 0 after context is created', async () => {
    const svc = new AudioService();
    await svc.loadSound('block-snap', makeBase64());
    svc.setMuted(false);
    svc.setMuted(true);
    const gainNode = mockCtx.createGain.mock.results[0]?.value as MockGainNode;
    expect(gainNode.gain.value).toBe(0);
  });

  it('playSound when muted does not create a BufferSourceNode', async () => {
    const svc = new AudioService();
    await svc.loadSound('block-snap', makeBase64());
    await svc.playSound('block-snap');
    expect(mockCtx.createBufferSource).not.toHaveBeenCalled();
  });

  it('playSound when unmuted and buffer loaded calls BufferSourceNode.start', async () => {
    const svc = new AudioService();
    await svc.loadSound('block-snap', makeBase64());
    svc.setMuted(false);
    await svc.playSound('block-snap');
    const source = mockCtx.createBufferSource.mock.results[0]?.value as MockBufferSourceNode;
    expect(source.start).toHaveBeenCalledWith(0);
  });

  it('playSound with unloaded sound name does not throw', async () => {
    const svc = new AudioService();
    svc.setMuted(false);
    await expect(svc.playSound('delete')).resolves.toBeUndefined();
    expect(mockCtx.createBufferSource).not.toHaveBeenCalled();
  });

  it('loadSound decodes base64 and caches the buffer', async () => {
    const svc = new AudioService();
    await svc.loadSound('validation-success', makeBase64());
    expect(mockCtx.decodeAudioData).toHaveBeenCalledTimes(1);
    svc.setMuted(false);
    await svc.playSound('validation-success');
    expect(mockCtx.createBufferSource).toHaveBeenCalledTimes(1);
  });

  it('loadSound decodes data URL base64 and caches the buffer', async () => {
    const svc = new AudioService();
    await svc.loadSound('validation-error', makeDataUrlBase64());

    expect(mockCtx.decodeAudioData).toHaveBeenCalledTimes(1);

    svc.setMuted(false);
    await svc.playSound('validation-error');
    expect(mockCtx.createBufferSource).toHaveBeenCalledTimes(1);
  });

  it('loadSound decodes data URL base64 with metadata parameters', async () => {
    const svc = new AudioService();
    await svc.loadSound('delete', makeDataUrlWithParamsBase64());

    expect(mockCtx.decodeAudioData).toHaveBeenCalledTimes(1);

    svc.setMuted(false);
    await svc.playSound('delete');
    expect(mockCtx.createBufferSource).toHaveBeenCalledTimes(1);
  });

  it('preloadAll loads multiple sounds', async () => {
    const svc = new AudioService();
    const sounds: Record<SoundName, string> = {
      'block-snap': makeBase64(),
      'delete': makeBase64(),
      'validation-success': makeBase64(),
      'validation-error': makeBase64(),
    };
    await svc.preloadAll(sounds);
    expect(mockCtx.decodeAudioData).toHaveBeenCalledTimes(4);
    svc.setMuted(false);
    await svc.playSound('block-snap');
    await svc.playSound('delete');
    await svc.playSound('validation-success');
    await svc.playSound('validation-error');
    expect(mockCtx.createBufferSource).toHaveBeenCalledTimes(4);
  });

  it('handles AudioContext creation failure gracefully', async () => {
    function FailingCtor(this: unknown) { throw new Error('no audio'); }
    vi.stubGlobal('AudioContext', FailingCtor);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const svc = new AudioService();
    await expect(svc.loadSound('block-snap', makeBase64())).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[AudioService] Failed to load sound'),
      expect.any(Error)
    );
  });

  it('resumes suspended context before playing', async () => {
    mockCtx = makeMockContext({ state: 'suspended' });
    stubAudioContext(mockCtx);

    const svc = new AudioService();
    await svc.loadSound('block-snap', makeBase64());
    svc.setMuted(false);
    await svc.playSound('block-snap');
    expect(mockCtx.resume).toHaveBeenCalled();
  });

  it('handles resume failure gracefully', async () => {
    mockCtx = makeMockContext({
      state: 'suspended',
      resume: vi.fn(() => Promise.reject(new Error('resume failed'))),
    });
    stubAudioContext(mockCtx);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const svc = new AudioService();
    await svc.loadSound('block-snap', makeBase64());
    svc.setMuted(false);
    await expect(svc.playSound('block-snap')).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[AudioService] Failed to resume AudioContext'),
      expect.any(Error)
    );
  });

  it('reuses existing context on subsequent calls', async () => {
    let callCount = 0;
    function CountingCtor(this: unknown) {
      callCount++;
      return mockCtx;
    }
    vi.stubGlobal('AudioContext', CountingCtor);

    const svc = new AudioService();
    await svc.loadSound('block-snap', makeBase64());
    await svc.loadSound('delete', makeBase64());
    expect(callCount).toBe(1);
  });

  it('onstatechange resumes context when state becomes suspended', async () => {
    const svc = new AudioService();
    await svc.loadSound('block-snap', makeBase64());

    mockCtx.state = 'suspended';
    mockCtx.onstatechange?.();

    expect(mockCtx.resume).toHaveBeenCalledTimes(1);
  });

  it('onstatechange resumes context when state becomes interrupted', async () => {
    const svc = new AudioService();
    await svc.loadSound('block-snap', makeBase64());

    mockCtx.state = 'interrupted';
    mockCtx.onstatechange?.();

    expect(mockCtx.resume).toHaveBeenCalledTimes(1);
  });

  it('onstatechange silently ignores resume rejection', async () => {
    mockCtx = makeMockContext({
      resume: vi.fn(() => Promise.reject(new Error('resume rejected'))),
    });
    stubAudioContext(mockCtx);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const svc = new AudioService();
    await svc.loadSound('block-snap', makeBase64());

    mockCtx.state = 'suspended';
    mockCtx.onstatechange?.();
    await Promise.resolve();

    expect(mockCtx.resume).toHaveBeenCalledTimes(1);
    expect(warnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('[AudioService] Failed to resume AudioContext'),
      expect.any(Error),
    );
  });

  it('playSound catches errors when createBufferSource throws', async () => {
    mockCtx = makeMockContext({
      createBufferSource: vi.fn(() => {
        throw new Error('source failed');
      }),
    });
    stubAudioContext(mockCtx);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const svc = new AudioService();
    await svc.loadSound('block-snap', makeBase64());
    svc.setMuted(false);
    await expect(svc.playSound('block-snap')).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[AudioService] Failed to play sound "block-snap"'),
      expect.any(Error),
    );
  });

  it('playSound catches errors when ensureContext fails', async () => {
    function FailingCtor(this: unknown) {
      throw new Error('no audio context');
    }
    vi.stubGlobal('AudioContext', FailingCtor);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const svc = new AudioService();
    const internals = svc as unknown as { bufferCache: Map<SoundName, AudioBuffer> };
    internals.bufferCache.set('delete', {} as AudioBuffer);
    svc.setMuted(false);

    await expect(svc.playSound('delete')).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[AudioService] Failed to play sound "delete"'),
      expect.any(Error),
    );
  });
});
