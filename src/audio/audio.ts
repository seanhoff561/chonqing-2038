// Web Audio engine: buses for master, voice, effects, ambience and music. Starts on the first user gesture.
export type Bus = 'voice' | 'effects' | 'ambience' | 'music';

export class Audio {
  ctx: AudioContext | null = null;
  master!: GainNode;
  readonly bus = {} as Record<Bus, GainNode>;
  private noiseBuf!: AudioBuffer;
  readonly volumes: Record<'master' | Bus, number> = { master: 0.8, voice: 1, effects: 1, ambience: 0.8, music: 0.6 };

  constructor() {
    const start = () => this.start();
    addEventListener('pointerdown', start);
    addEventListener('keydown', start);
  }

  start() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const C = (window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
    if (!C) return;
    const ctx = (this.ctx = new C());
    this.master = ctx.createGain();
    this.master.connect(ctx.destination);
    for (const b of ['voice', 'effects', 'ambience', 'music'] as Bus[]) {
      this.bus[b] = ctx.createGain();
      this.bus[b].connect(this.master);
    }
    this.applyVolumes();
    // Two seconds of white noise, shared by every noisy sound.
    this.noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    let s = 12345;
    for (let i = 0; i < d.length; i++) { s = (s * 1103515245 + 12345) >>> 0; d[i] = (s / 2147483648) - 1; }
  }

  applyVolumes() {
    if (!this.ctx) return;
    this.master.gain.value = this.volumes.master;
    for (const b of Object.keys(this.bus) as Bus[]) this.bus[b].gain.value = this.volumes[b];
  }

  get ready() { return !!this.ctx && this.ctx.state === 'running'; }

  /** A noise burst through a filter with an attack/decay envelope. */
  noise(at: number, dur: number, gain: number, type: BiquadFilterType, freq: number, q = 1, freqEnd?: number, out?: AudioNode) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.playbackRate.value = 0.8 + ((at * 997) % 0.4);
    const f = ctx.createBiquadFilter();
    f.type = type; f.frequency.setValueAtTime(freq, at); f.Q.value = q;
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, at + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(gain, at + Math.min(0.01, dur / 4));
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(f).connect(g).connect(out ?? this.bus.effects);
    src.start(at, (at * 0.37) % 1.5, dur + 0.05);
  }

  /** A pitched tone with a pitch sweep and decay. */
  tone(at: number, dur: number, gain: number, f0: number, f1: number, type: OscillatorType = 'sine', out?: AudioNode) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, at);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), at + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(gain, at + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g).connect(out ?? this.bus.effects);
    o.start(at);
    o.stop(at + dur + 0.02);
  }
}
