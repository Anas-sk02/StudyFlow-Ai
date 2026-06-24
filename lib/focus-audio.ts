// =====================================================================
//  Procedural ambient sound engine (Web Audio API)
//  Generates believable ambience for each sound with ZERO audio assets,
//  so it works fully offline. Browser-only — instantiate lazily.
// =====================================================================
import type { AmbientSoundId } from "@/lib/focus";

type NoiseType = "white" | "pink" | "brown";

function makeNoiseBuffer(ctx: AudioContext, type: NoiseType): AudioBuffer {
  const length = ctx.sampleRate * 2; // 2-second loop
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  if (type === "white") {
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  } else if (type === "pink") {
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
  } else {
    // brown
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
  }
  return buffer;
}

export class AmbientEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private active: AudioNode[] = [];
  private sources: AudioBufferSourceNode[] = [];
  private oscillators: OscillatorNode[] = [];
  private timers: ReturnType<typeof setTimeout>[] = [];
  private current: AmbientSoundId | null = null;
  private volume = 0.5;

  get currentSound(): AmbientSoundId | null {
    return this.current;
  }

  private ensure(): AudioContext {
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  private noiseSource(type: NoiseType): AudioBufferSourceNode {
    const ctx = this.ensure();
    const src = ctx.createBufferSource();
    src.buffer = makeNoiseBuffer(ctx, type);
    src.loop = true;
    this.sources.push(src);
    return src;
  }

  private track<T extends AudioNode>(node: T): T {
    this.active.push(node);
    return node;
  }

  /** Recurring randomly-spaced event scheduler (for chirps / crackles). */
  private scheduleLoop(fn: () => void, minMs: number, maxMs: number) {
    const tick = () => {
      fn();
      const delay = minMs + Math.random() * (maxMs - minMs);
      const id = setTimeout(tick, delay);
      this.timers.push(id);
    };
    const id = setTimeout(tick, minMs + Math.random() * (maxMs - minMs));
    this.timers.push(id);
  }

  /** One-shot tone with a short attack/decay envelope. */
  private blip(opts: {
    freq: number; type?: OscillatorType; attack?: number; decay?: number;
    gain?: number; sweepTo?: number; destination?: AudioNode;
  }) {
    const ctx = this.ensure();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = opts.type ?? "sine";
    osc.frequency.setValueAtTime(opts.freq, now);
    if (opts.sweepTo) osc.frequency.linearRampToValueAtTime(opts.sweepTo, now + (opts.attack ?? 0.04) + (opts.decay ?? 0.1));
    const peak = opts.gain ?? 0.15;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(peak, now + (opts.attack ?? 0.02));
    g.gain.exponentialRampToValueAtTime(0.0001, now + (opts.attack ?? 0.02) + (opts.decay ?? 0.12));
    osc.connect(g);
    g.connect(opts.destination ?? this.master!);
    osc.start(now);
    osc.stop(now + (opts.attack ?? 0.02) + (opts.decay ?? 0.12) + 0.05);
  }

  private buildRain() {
    const ctx = this.ensure();
    const noise = this.noiseSource("pink");
    const hp = this.track(ctx.createBiquadFilter());
    hp.type = "highpass"; hp.frequency.value = 800;
    const lp = this.track(ctx.createBiquadFilter());
    lp.type = "lowpass"; lp.frequency.value = 9000;
    const g = this.track(ctx.createGain()); g.gain.value = 0.85;
    noise.connect(hp); hp.connect(lp); lp.connect(g); g.connect(this.master!);
    noise.start();
    // occasional heavier drops
    this.scheduleLoop(() => this.blip({ freq: 2400, type: "triangle", gain: 0.04, attack: 0.005, decay: 0.05 }), 120, 600);
  }

  private buildOcean() {
    const ctx = this.ensure();
    const noise = this.noiseSource("brown");
    const lp = this.track(ctx.createBiquadFilter());
    lp.type = "lowpass"; lp.frequency.value = 700;
    const g = this.track(ctx.createGain()); g.gain.value = 0.0;
    noise.connect(lp); lp.connect(g); g.connect(this.master!);
    // slow swell LFO ~0.09Hz
    const lfo = ctx.createOscillator(); this.oscillators.push(lfo);
    const lfoGain = this.track(ctx.createGain());
    lfo.frequency.value = 0.09; lfoGain.gain.value = 0.5;
    lfo.connect(lfoGain); lfoGain.connect(g.gain);
    g.gain.value = 0.55;
    noise.start(); lfo.start();
  }

  private buildWhiteNoise() {
    const ctx = this.ensure();
    const noise = this.noiseSource("white");
    const lp = this.track(ctx.createBiquadFilter());
    lp.type = "lowpass"; lp.frequency.value = 12000;
    const g = this.track(ctx.createGain()); g.gain.value = 0.4;
    noise.connect(lp); lp.connect(g); g.connect(this.master!);
    noise.start();
  }

  private buildFireplace() {
    const ctx = this.ensure();
    const noise = this.noiseSource("brown");
    const lp = this.track(ctx.createBiquadFilter());
    lp.type = "lowpass"; lp.frequency.value = 500;
    const g = this.track(ctx.createGain()); g.gain.value = 0.5;
    noise.connect(lp); lp.connect(g); g.connect(this.master!);
    noise.start();
    // crackles: short filtered noise bursts
    const crackleHp = this.track(ctx.createBiquadFilter());
    crackleHp.type = "highpass"; crackleHp.frequency.value = 1500;
    crackleHp.connect(this.master!);
    this.scheduleLoop(() => {
      const burst = ctx.createBufferSource();
      burst.buffer = makeNoiseBuffer(ctx, "white");
      const bg = ctx.createGain();
      const now = ctx.currentTime;
      bg.gain.setValueAtTime(0.0001, now);
      bg.gain.exponentialRampToValueAtTime(0.25 + Math.random() * 0.3, now + 0.005);
      bg.gain.exponentialRampToValueAtTime(0.0001, now + 0.06 + Math.random() * 0.08);
      burst.connect(bg); bg.connect(crackleHp);
      burst.start(now); burst.stop(now + 0.2);
    }, 90, 450);
  }

  private buildForest() {
    const ctx = this.ensure();
    // wind bed
    const noise = this.noiseSource("pink");
    const bp = this.track(ctx.createBiquadFilter());
    bp.type = "bandpass"; bp.frequency.value = 500; bp.Q.value = 0.6;
    const g = this.track(ctx.createGain()); g.gain.value = 0.3;
    noise.connect(bp); bp.connect(g); g.connect(this.master!);
    noise.start();
    // bird chirps
    this.scheduleLoop(() => {
      const reps = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < reps; i++) {
        const base = 1800 + Math.random() * 1600;
        const id = setTimeout(() => this.blip({
          freq: base, type: "sine", sweepTo: base + 400, gain: 0.05, attack: 0.02, decay: 0.12,
        }), i * 130);
        this.timers.push(id);
      }
    }, 1500, 5000);
  }

  private buildCoffee() {
    const ctx = this.ensure();
    // murmur of chatter
    const noise = this.noiseSource("brown");
    const bp = this.track(ctx.createBiquadFilter());
    bp.type = "bandpass"; bp.frequency.value = 320; bp.Q.value = 0.8;
    const g = this.track(ctx.createGain()); g.gain.value = 0.5;
    noise.connect(bp); bp.connect(g); g.connect(this.master!);
    noise.start();
    // occasional cup clinks
    this.scheduleLoop(() => this.blip({
      freq: 1500 + Math.random() * 900, type: "sine", gain: 0.05, attack: 0.004, decay: 0.18,
    }), 2500, 7000);
  }

  private buildCrickets() {
    const ctx = this.ensure();
    // quiet low bed
    const noise = this.noiseSource("brown");
    const lp = this.track(ctx.createBiquadFilter());
    lp.type = "lowpass"; lp.frequency.value = 300;
    const g = this.track(ctx.createGain()); g.gain.value = 0.18;
    noise.connect(lp); lp.connect(g); g.connect(this.master!);
    noise.start();
    // chirping
    this.scheduleLoop(() => {
      const pulses = 3 + Math.floor(Math.random() * 4);
      for (let i = 0; i < pulses; i++) {
        const id = setTimeout(() => this.blip({
          freq: 4300 + Math.random() * 300, type: "square", gain: 0.03, attack: 0.003, decay: 0.03,
        }), i * 60);
        this.timers.push(id);
      }
    }, 700, 2200);
  }

  async play(id: AmbientSoundId) {
    this.stop();
    const ctx = this.ensure();
    if (ctx.state === "suspended") {
      try { await ctx.resume(); } catch { /* ignore */ }
    }
    this.current = id;
    switch (id) {
      case "rain": this.buildRain(); break;
      case "ocean": this.buildOcean(); break;
      case "white_noise": this.buildWhiteNoise(); break;
      case "fireplace": this.buildFireplace(); break;
      case "forest": this.buildForest(); break;
      case "coffee": this.buildCoffee(); break;
      case "crickets": this.buildCrickets(); break;
    }
  }

  stop() {
    this.timers.forEach((t) => clearTimeout(t));
    this.timers = [];
    this.sources.forEach((s) => { try { s.stop(); } catch { /* already stopped */ } try { s.disconnect(); } catch { /* noop */ } });
    this.oscillators.forEach((o) => { try { o.stop(); } catch { /* noop */ } try { o.disconnect(); } catch { /* noop */ } });
    this.active.forEach((n) => { try { n.disconnect(); } catch { /* noop */ } });
    this.sources = [];
    this.oscillators = [];
    this.active = [];
    this.current = null;
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.master) this.master.gain.value = this.volume;
  }

  dispose() {
    this.stop();
    if (this.ctx) {
      try { void this.ctx.close(); } catch { /* noop */ }
      this.ctx = null;
      this.master = null;
    }
  }
}
