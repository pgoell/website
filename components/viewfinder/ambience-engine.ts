/**
 * Ambient sound for the viewfinder: soft CC0 field recordings of rain, wind, birds and thunder, a slow
 * electric piano, and a lo-fi chain over all of it (gentle saturation, a low-pass, tape wobble and vinyl
 * crackle). The recordings live in public/sounds/ambience and load only when a visitor turns sound on.
 */

import type { AmbienceMix, Mood } from "@/lib/viewfinder/ambience";

export interface Ambience {
  setMix(mix: AmbienceMix): void;
  /** Fades in, or out and then suspends the audio so it costs nothing while muted. */
  setOn(on: boolean): Promise<void>;
  destroy(): void;
}

const FADE = 1.5;
const VOLUME = 0.5;
const BASE = "/sounds/ambience/";
const LOOPS = ["rain", "rain-heavy", "wind", "birds"] as const;
type Loop = (typeof LOOPS)[number];
/** How loud each recording sits at full level: about half the piano and crackle, so the weather stays in the background. */
const LEVEL: Record<Loop, number> = {
  rain: 0.25,
  "rain-heavy": 0.2,
  wind: 0.18,
  birds: 0.2,
};

/** Seventh and ninth chords, voiced around middle C, with a bass note under each. */
const CHORDS: Record<Mood, Array<{ notes: number[]; bass: number }>> = {
  bright: [
    { notes: [53, 57, 60, 64, 67], bass: 41 },
    { notes: [52, 55, 59, 62], bass: 40 },
    { notes: [50, 53, 57, 60, 64], bass: 38 },
    { notes: [48, 55, 59, 64], bass: 36 },
  ],
  gray: [
    { notes: [57, 60, 64, 67, 71], bass: 45 },
    { notes: [53, 57, 60, 64], bass: 41 },
    { notes: [50, 53, 57, 60, 64], bass: 38 },
    { notes: [52, 55, 59, 62], bass: 40 },
  ],
};
/** One chord every four beats at 68 bpm. */
const BAR = (60 / 68) * 4;
/** The fog drone: root, fifth and octave. */
const DRONE = [0, 7, 12] as const;
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

/** A loop of soft hiss with sparse clicks, like a quiet record between songs. */
function crackle(ctx: BaseAudioContext) {
  const len = ctx.sampleRate * 5;
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      lp += 0.08 * (Math.random() * 2 - 1 - lp);
      d[i] = lp * 0.05;
    }
    const clicks = 30 + Math.floor(Math.random() * 20);
    for (let k = 0; k < clicks; k++) {
      const at = Math.floor(Math.random() * (len - 200));
      const amp = (Math.random() < 0.15 ? 0.5 : 0.15) * Math.random();
      const sign = Math.random() < 0.5 ? -1 : 1;
      for (let j = 0; j < 60; j++)
        d[at + j] = (d[at + j] ?? 0) + sign * amp * Math.exp(-j / 8);
    }
  }
  return buf;
}

/** A generated room: three and a half seconds of falling, darkening noise, a little different per ear. */
function hall(ctx: BaseAudioContext) {
  const len = Math.floor(ctx.sampleRate * 3.5);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / len;
      // the tail loses its highs as it fades
      const k = 0.5 * (1 - t) + 0.04;
      lp += k * (Math.random() * 2 - 1 - lp);
      d[i] = lp * (1 - t) ** 2.5 * 0.5;
    }
  }
  return buf;
}

export function createAmbience(): Ambience {
  const ctx = new AudioContext();
  const now = () => ctx.currentTime;
  const glide = (p: AudioParam, v: number, tc = 2) =>
    p.setTargetAtTime(v, now(), tc);
  const lfo = (freq: number, depth: number, target: AudioParam) => {
    const o = ctx.createOscillator();
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = depth;
    o.connect(g).connect(target);
    o.start();
    return o;
  };

  // lo-fi chain: everything goes through warm saturation, then a wobbling tape delay, then the master
  const bus = ctx.createGain();
  const shaper = ctx.createWaveShaper();
  const curve = new Float32Array(1024);
  for (let i = 0; i < curve.length; i++) {
    const x = (i / (curve.length - 1)) * 2 - 1;
    curve[i] = Math.tanh(1.6 * x) / Math.tanh(1.6);
  }
  shaper.curve = curve;
  shaper.oversample = "2x";
  const tape = ctx.createDelay(0.05);
  tape.delayTime.value = 0.012;
  const lfos = [
    lfo(0.33, 0.0014, tape.delayTime),
    lfo(5.2, 0.00007, tape.delayTime),
  ];
  const master = ctx.createGain();
  master.gain.value = 0;
  bus.connect(shaper).connect(tape).connect(master).connect(ctx.destination);

  // echo: a dark, generated room the piano and weather send into, wide in fog and close on a dry day
  const room = ctx.createConvolver();
  room.buffer = hall(ctx);
  const space = ctx.createGain();
  space.gain.value = 0.15;
  space.connect(room).connect(tape);

  // the recordings share one low-pass, so snow and fog can soften them all at once
  const muffle = ctx.createBiquadFilter();
  muffle.type = "lowpass";
  muffle.frequency.value = 4200;
  muffle.Q.value = 0.5;
  // and one high-pass, so the wind's rumble stays out of small speakers
  const rumble = ctx.createBiquadFilter();
  rumble.type = "highpass";
  rumble.frequency.value = 110;
  muffle.connect(rumble).connect(bus);
  rumble.connect(space);

  const gains = {} as Record<Loop, GainNode>;
  for (const name of LOOPS) {
    const g = ctx.createGain();
    g.gain.value = 0;
    g.connect(muffle);
    gains[name] = g;
  }

  const vinyl = ctx.createBufferSource();
  vinyl.buffer = crackle(ctx);
  vinyl.loop = true;
  const vinylTone = ctx.createBiquadFilter();
  vinylTone.type = "bandpass";
  vinylTone.frequency.value = 2400;
  vinylTone.Q.value = 0.4;
  const vinylGain = ctx.createGain();
  vinylGain.gain.value = 0.35;
  vinyl.connect(vinylTone).connect(vinylGain).connect(bus);
  vinyl.start();

  // electric piano: a sine with a quiet octave tine, soft attack and a long fall, kept dark
  const keysTone = ctx.createBiquadFilter();
  keysTone.type = "lowpass";
  keysTone.frequency.value = 1500;
  const keysGain = ctx.createGain();
  keysGain.gain.value = 0;
  keysTone.connect(keysGain).connect(bus);
  keysGain.connect(space);

  // snow: high music-box notes; fog: a still drone and a far-off bell. Each has its own level.
  const sparkleGain = ctx.createGain();
  sparkleGain.gain.value = 0;
  sparkleGain.connect(bus);
  sparkleGain.connect(space);
  const droneGain = ctx.createGain();
  droneGain.gain.value = 0;
  const droneTone = ctx.createBiquadFilter();
  droneTone.type = "lowpass";
  droneTone.frequency.value = 380;
  droneTone.connect(droneGain).connect(bus);
  droneGain.connect(space);
  const drones = DRONE.map((semi, i) => {
    const o = ctx.createOscillator();
    o.type = "triangle";
    o.frequency.value = hz(33 + semi);
    o.detune.value = (i - 1) * 4;
    const g = ctx.createGain();
    g.gain.value = i === 1 ? 0.5 : 0.8;
    o.connect(g).connect(droneTone);
    o.start();
    return o;
  });
  lfos.push(...drones);
  const bellBus = ctx.createGain();
  bellBus.gain.value = 0.25;
  const bellTone = ctx.createBiquadFilter();
  bellTone.type = "lowpass";
  bellTone.frequency.value = 1100;
  bellBus.connect(bellTone);
  bellTone.connect(bus);
  // the bell is mostly echo: it should sound like it comes through the fog from the town
  const bellFar = ctx.createGain();
  bellFar.gain.value = 3;
  bellTone.connect(bellFar).connect(room);

  const note = (midi: number, t: number, len: number, level: number) => {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + 0.02);
    g.gain.setTargetAtTime(level * 0.35, t + 0.02, 0.6);
    g.gain.setTargetAtTime(0, t + len, 0.5);
    g.connect(keysTone);
    for (const [mult, amt] of [
      [1, 1],
      [2, 0.18],
    ] as const) {
      const o = ctx.createOscillator();
      o.frequency.value = hz(midi) * mult;
      o.detune.value = (Math.random() - 0.5) * 8;
      const a = ctx.createGain();
      a.gain.value = amt;
      o.connect(a).connect(g);
      o.start(t);
      o.stop(t + len + 3);
      if (mult === 1) o.onended = () => g.disconnect();
    }
  };

  let step = 0;
  let current = CHORDS.gray[0]?.notes ?? [57];
  const chord = (mood: Mood, t: number) => {
    const c = CHORDS[mood][step % 4];
    if (!c) return;
    step++;
    current = c.notes;
    drones.forEach((o, i) => {
      o.frequency.setTargetAtTime(hz(c.bass - 12 + (DRONE[i] ?? 0)), t, 1.2);
    });
    // a lazy strum, low to high
    c.notes.forEach((n, i) => {
      note(n, t + i * 0.035 + Math.random() * 0.01, BAR * 0.95, 0.07);
    });
    note(c.bass, t, BAR * 0.9, 0.1);
  };

  /** One music-box note two octaves over the chord: a pure tone with a glassy overtone and a long ring. */
  const twinkle = (t: number) => {
    const midi =
      (current[Math.floor(Math.random() * current.length)] ?? 64) + 24;
    const out = ctx.createStereoPanner();
    out.pan.value = Math.random() * 1.4 - 0.7;
    out.connect(sparkleGain);
    const level = 0.035 + Math.random() * 0.025;
    for (const [mult, amt, ring] of [
      [1, 1, 1.4],
      [4.2, 0.12, 0.25],
    ] as const) {
      const o = ctx.createOscillator();
      o.frequency.value = hz(midi) * mult;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(level * amt, t + 0.004);
      g.gain.setTargetAtTime(0, t + 0.004, ring / 3);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + ring * 2);
      if (mult === 1) o.onended = () => out.disconnect();
    }
  };

  /** A church bell: inharmonic partials with long, uneven decays, struck two or three times. */
  const toll = (t: number) => {
    const base = 196;
    const strikes = 2 + Math.floor(Math.random() * 2);
    for (let k = 0; k < strikes; k++) {
      const at = t + k * 2.6;
      for (const [ratio, amt, decay] of [
        [0.5, 0.5, 6],
        [1, 1, 4.5],
        [1.19, 0.45, 3],
        [1.5, 0.3, 2.6],
        [2, 0.4, 2.2],
        [2.52, 0.2, 1.6],
      ] as const) {
        const o = ctx.createOscillator();
        o.frequency.value = base * ratio;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, at);
        g.gain.linearRampToValueAtTime(0.12 * amt, at + 0.01);
        g.gain.setTargetAtTime(0, at + 0.01, decay / 3);
        o.connect(g).connect(bellBus);
        o.start(at);
        o.stop(at + decay * 2);
        o.onended = () => g.disconnect();
      }
    }
  };

  const buffers: Partial<Record<Loop | "thunder", AudioBuffer>> = {};
  const load = async (name: Loop | "thunder") => {
    try {
      const res = await fetch(`${BASE}${name}.mp3`);
      buffers[name] = await ctx.decodeAudioData(await res.arrayBuffer());
    } catch {
      // a missing recording leaves that layer silent
    }
  };
  const ready = Promise.all([...LOOPS, "thunder" as const].map(load)).then(
    () => {
      for (const name of LOOPS) {
        const buf = buffers[name];
        if (!buf) continue;
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        src.connect(gains[name]);
        src.start(0, Math.random() * buf.duration);
      }
    },
  );

  const thunderRoll = (t: number) => {
    const buf = buffers.thunder;
    if (!buf) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = 0.85 + Math.random() * 0.2;
    const g = ctx.createGain();
    g.gain.value = 0.18 + Math.random() * 0.15;
    const p = ctx.createStereoPanner();
    p.pan.value = Math.random() * 1.2 - 0.6;
    src.connect(g).connect(p).connect(muffle);
    src.onended = () => p.disconnect();
    src.start(t);
  };

  let mix: AmbienceMix | null = null;
  let on = false;
  let nextChord = 0;
  let nextThunder = 0;
  let nextTwinkle = 0;
  let nextBell = 0;
  // schedules chords and thunder a little ahead of the audio clock
  const tick = () => {
    if (!on || !mix || ctx.state !== "running") return;
    const t = now();
    if (mix.keys > 0) {
      if (nextChord < t) nextChord = t + 0.3;
      if (nextChord < t + 0.6) {
        chord(mix.mood, nextChord);
        nextChord += BAR;
      }
    }
    if (mix.thunder > 0) {
      if (nextThunder === 0) nextThunder = t + 4 + Math.random() * 6;
      if (t >= nextThunder) {
        thunderRoll(t + 0.05);
        nextThunder = t + mix.thunder * (0.6 + Math.random() * 0.8);
      }
    } else nextThunder = 0;
    if (mix.sparkle > 0) {
      if (nextTwinkle === 0) nextTwinkle = t + 1 + Math.random() * 2;
      if (t >= nextTwinkle) {
        twinkle(t + 0.05);
        // now and then a second note close behind, like a music box running down
        if (Math.random() < 0.35) twinkle(t + 0.3 + Math.random() * 0.3);
        nextTwinkle = t + (1.2 + Math.random() * 3) / mix.sparkle;
      }
    } else nextTwinkle = 0;
    if (mix.bell > 0) {
      if (nextBell === 0) nextBell = t + 6 + Math.random() * 8;
      if (t >= nextBell) {
        toll(t + 0.05);
        nextBell = t + mix.bell * (0.7 + Math.random() * 0.6);
      }
    } else nextBell = 0;
  };
  const timer = window.setInterval(tick, 200);

  return {
    setMix(m) {
      mix = m;
      glide(gains.rain.gain, m.rain * LEVEL.rain);
      glide(gains["rain-heavy"].gain, m.heavy * LEVEL["rain-heavy"]);
      glide(gains.wind.gain, m.wind * LEVEL.wind);
      glide(gains.birds.gain, m.birds * LEVEL.birds);
      glide(muffle.frequency, m.muffle, 1);
      glide(keysGain.gain, m.keys);
      glide(sparkleGain.gain, m.sparkle > 0 ? 1 : 0);
      glide(droneGain.gain, m.drone * 0.06, 3);
      glide(space.gain, m.space, 2);
    },
    async setOn(next) {
      on = next;
      if (next) {
        await ctx.resume();
        await ready;
        if (!on) return;
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
