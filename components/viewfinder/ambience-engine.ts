/**
 * Ambient sound for the viewfinder, made entirely in the browser with Web Audio: noise for wind and
 * rain, short bursts for drops and thunder, swept tones for birds. No sound files, so nothing to license.
 */

import type { AmbienceMix } from "@/lib/viewfinder/ambience";

export interface Ambience {
  setMix(mix: AmbienceMix): void;
  /** Fades in, or out and then suspends the audio so it costs nothing while muted. */
  setOn(on: boolean): Promise<void>;
  destroy(): void;
}

const FADE = 1.2;
const VOLUME = 0.55;

type Noise = "white" | "pink" | "brown";

function noiseBuffer(ctx: AudioContext, kind: Noise, seconds: number) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      if (kind === "white") d[i] = white;
      else if (kind === "pink") {
        // Paul Kellet's economy filter
        b0 = 0.99765 * b0 + white * 0.099046;
        b1 = 0.963 * b1 + white * 0.2965164;
        b2 = 0.57 * b2 + white * 1.0526913;
        d[i] = (b0 + b1 + b2 + white * 0.1848) * 0.2;
      } else {
        last = (last + 0.02 * white) / 1.02;
        d[i] = last * 3.5;
      }
    }
  }
  return buf;
}

export function createAmbience(): Ambience {
  const ctx = new AudioContext();
  const now = () => ctx.currentTime;
  const glide = (p: AudioParam, v: number, tc = 1.5) =>
    p.setTargetAtTime(v, now(), tc);

  const white = noiseBuffer(ctx, "white", 3);
  const pink = noiseBuffer(ctx, "pink", 6);
  const brown = noiseBuffer(ctx, "brown", 10);

  const master = ctx.createGain();
  master.gain.value = 0;
  const muffle = ctx.createBiquadFilter();
  muffle.type = "lowpass";
  muffle.frequency.value = 9000;
  master.connect(muffle).connect(ctx.destination);

  const loop = (buf: AudioBuffer) => {
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.start();
    return src;
  };
  const lfo = (hz: number, depth: number, target: AudioParam) => {
    const o = ctx.createOscillator();
    o.frequency.value = hz;
    const g = ctx.createGain();
    g.gain.value = depth;
    o.connect(g).connect(target);
    o.start();
    return o;
  };

  // wind: pink noise through a wandering band, its level breathing in gusts
  const windBand = ctx.createBiquadFilter();
  windBand.type = "bandpass";
  windBand.Q.value = 0.9;
  windBand.frequency.value = 400;
  const windGain = ctx.createGain();
  windGain.gain.value = 0;
  const gust = ctx.createGain();
  gust.gain.value = 1;
  loop(pink).connect(windBand).connect(gust).connect(windGain).connect(master);
  const lfos = [
    lfo(0.07, 0.35, gust.gain),
    lfo(0.19, 0.15, gust.gain),
    lfo(0.05, 120, windBand.frequency),
  ];

  // rain: bright hiss
  const rainHp = ctx.createBiquadFilter();
  rainHp.type = "highpass";
  rainHp.frequency.value = 700;
  const rainLp = ctx.createBiquadFilter();
  rainLp.type = "lowpass";
  rainLp.frequency.value = 6500;
  const rainGain = ctx.createGain();
  rainGain.gain.value = 0;
  loop(white).connect(rainHp).connect(rainLp).connect(rainGain).connect(master);
  lfos.push(lfo(0.11, 0.06, rainGain.gain));

  // one-shots ride their own bus so they can be cut at once
  const shots = ctx.createGain();
  shots.connect(master);

  /** A panned way into the shots bus, let go once the last source through it has ended. */
  const pan = (x: number) => {
    const p = ctx.createStereoPanner();
    p.pan.value = x;
    p.connect(shots);
    return p;
  };
  const release = (src: AudioScheduledSourceNode, out: AudioNode) => {
    src.onended = () => out.disconnect();
  };

  const drop = (t: number) => {
    const src = ctx.createBufferSource();
    src.buffer = white;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1800 + Math.random() * 4200;
    bp.Q.value = 6 + Math.random() * 10;
    const g = ctx.createGain();
    const peak = 0.12 + Math.random() * 0.25;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.002);
    g.gain.exponentialRampToValueAtTime(
      0.0001,
      t + 0.03 + Math.random() * 0.05,
    );
    const out = pan(Math.random() * 1.6 - 0.8);
    src.connect(bp).connect(g).connect(out);
    release(src, out);
    src.start(t, Math.random() * 2, 0.1);
  };

  const thunderClap = (t: number) => {
    const src = ctx.createBufferSource();
    src.buffer = brown;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    const near = Math.random();
    lp.frequency.setValueAtTime(220 + near * 500, t);
    lp.frequency.exponentialRampToValueAtTime(90, t + 4);
    const g = ctx.createGain();
    const peak = 0.5 + near * 0.6;
    const len = 4 + Math.random() * 4;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.08 + (1 - near) * 0.6);
    // a second roll as the sound comes back off the hills
    g.gain.setTargetAtTime(peak * 0.45, t + 0.6, 0.3);
    g.gain.linearRampToValueAtTime(peak * 0.7, t + 1.4 + Math.random());
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    const out = pan(Math.random() * 1.2 - 0.6);
    src.connect(lp).connect(g).connect(out);
    release(src, out);
    src.start(t, Math.random() * 1.5, len + 0.1);
  };

  const birdCall = (t: number) => {
    const out = pan(Math.random() * 1.8 - 0.9);
    const level = 0.03 + Math.random() * 0.05;
    const base = 2600 + Math.random() * 2400;
    const notes = 2 + Math.floor(Math.random() * 5);
    const kind = Math.random();
    let at = t;
    for (let n = 0; n < notes; n++) {
      const o = ctx.createOscillator();
      o.type = "sine";
      const g = ctx.createGain();
      const len = 0.05 + Math.random() * 0.09;
      const f0 = base * (0.85 + Math.random() * 0.3);
      // a rising chirp, a falling whistle, or a trill
      const f1 = kind < 0.4 ? f0 * 1.5 : kind < 0.75 ? f0 * 0.7 : f0 * 1.08;
      o.frequency.setValueAtTime(f0, at);
      o.frequency.exponentialRampToValueAtTime(f1, at + len);
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(level, at + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, at + len);
      o.connect(g).connect(out);
      o.start(at);
      o.stop(at + len + 0.02);
      if (n === notes - 1) release(o, out);
      at += len + (kind < 0.75 ? 0.06 + Math.random() * 0.1 : 0.015);
    }
  };

  let mix: AmbienceMix | null = null;
  let on = false;
  let nextThunder = 0;
  let nextBird = 0;
  // schedules drops, thunder and birds a little ahead of the audio clock
  const tick = () => {
    if (!on || !mix || ctx.state !== "running") return;
    const t = now();
    const ahead = 0.25;
    if (mix.drops > 0) {
      const n = Math.round(mix.drops * ahead * (0.5 + Math.random()));
      for (let i = 0; i < n; i++) drop(t + 0.05 + Math.random() * ahead);
    }
    if (mix.thunder > 0) {
      if (nextThunder === 0) nextThunder = t + 2 + Math.random() * 4;
      if (t >= nextThunder) {
        thunderClap(t + 0.05);
        nextThunder = t + mix.thunder * (0.4 + Math.random() * 1.2);
      }
    } else nextThunder = 0;
    if (mix.birds > 0) {
      if (nextBird === 0) nextBird = t + Math.random() * 2;
      if (t >= nextBird) {
        birdCall(t + 0.05);
        nextBird = t + (1.5 + Math.random() * 5) / mix.birds;
      }
    } else nextBird = 0;
  };
  const timer = window.setInterval(tick, 250);

  return {
    setMix(m) {
      mix = m;
      glide(windGain.gain, m.wind * 0.9);
      glide(windBand.frequency, m.windTone);
      glide(rainGain.gain, m.rain * 0.35);
      glide(muffle.frequency, m.muffle, 0.8);
    },
    async setOn(next) {
      on = next;
      if (next) {
        await ctx.resume();
        master.gain.cancelScheduledValues(now());
        master.gain.setValueAtTime(master.gain.value, now());
        master.gain.linearRampToValueAtTime(VOLUME, now() + FADE);
        return;
      }
      master.gain.cancelScheduledValues(now());
      master.gain.setValueAtTime(master.gain.value, now());
      master.gain.linearRampToValueAtTime(0, now() + FADE / 2);
      await new Promise((r) => window.setTimeout(r, (FADE / 2) * 1000 + 50));
      if (!on) await ctx.suspend();
    },
    destroy() {
      on = false;
      clearInterval(timer);
      for (const o of lfos) o.stop();
      void ctx.close();
    },
  };
}
