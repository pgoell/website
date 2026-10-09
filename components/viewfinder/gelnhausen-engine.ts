/* Gelnhausen from the upper town at the Marienkirche: layered poster illustration on canvas.
   Scene space is 1600 x 1000, cropped like "cover". */

import {
  hexToRgb,
  mix,
  rgba,
  rgbToHex,
  rng,
  smoothstep as sm,
} from "@/lib/viewfinder/color";
import { type Palette, paletteFor } from "@/lib/viewfinder/palette";
import { SEASONS, seasonOf } from "@/lib/viewfinder/season";
import { sunAt } from "@/lib/viewfinder/sun";
import { berlinHour } from "@/lib/viewfinder/time";
import type { SceneWeather } from "@/lib/weather/weather";

type Ctx = CanvasRenderingContext2D;
type Face = "L" | "M" | "S";

const at = <T>(a: ArrayLike<T>, i: number): T => a[i] as T;

const SW = 1600;
const SH = 1000;

/* ---------- materials (from the reference: red sandstone, slate, clay, plaster; foliage and fields come from the season table) ---------- */
const MAT = {
  sand: "#a9523f",
  slate: "#363c4e",
  clay: "#b5502c",
  clay2: "#843d27",
  clay3: "#9c6049",
  plaster: "#e6dccb",
  cream: "#e2d3b4",
  ochre: "#d7c29c",
  pink: "#d2b0a4",
  beam: "#5b3a2a",
  win: "#2a2522",
};

/* ---------- light: one source, shared state while a frame is drawn ---------- */
/* ---------- camera: one fixed bearing and field of view, so the real sun lands where it should ---------- */
const BEARING = 234;
const PX_PER_DEG = SW / 75;
const HORIZON = 584;
const INK = "#04060c";

let P: Palette = paletteFor(60, false);
let SEA = SEASONS.summer;
let D = 0;
// sun on screen (it may be far outside the frame), which side it lights, and how far to the side it stands
let SX = 0;
let SY = 0;
let SUN = 1;
let LAT = 1;
// 1 while the sun is above the horizon
let UP = 1;
let AM = false;
let ALT = 0;
// backlight: the low sun stands ahead, behind the buildings
let RIM = 0;
// lit windows: darkness, less the small hours when people sleep
let WIN = 0;
/* weather: null is the calm default, with cloud only around sunrise and sunset */
let WX: SceneWeather | null = null;
// overcast 0 to 1, rain wetness, fog, lying snow
let OV = 0;
let WET = 0;
let FOG = 0;
let SNOW = 0;
let STORM = 0;
// how far bad weather drains every colour, the fog's own colour, and the size of a scene unit on screen
let GREY = 0;
let FOGC = "#ffffff";
let ZOOM = 1;
const WHITE = "#eef2f6";
// a colour drained toward its own grey
const greys = new Map<string, string>();
function drain(col: string, k: number): string {
  if (k <= 0) return col;
  let g = greys.get(col);
  if (!g) {
    const [r, gr, b] = hexToRgb(col);
    const y = 0.3 * r + 0.59 * gr + 0.11 * b;
    g = rgbToHex([y, y, y]);
    greys.set(col, g);
  }
  return mix(col, g, k);
}
// surfaces under snow, remembered so that C can keep them pale after dark
const snowy = new Set<string>();
function snow(col: string, k: number): string {
  if (!SNOW) return col;
  const v = mix(col, WHITE, k);
  snowy.add(v);
  return v;
}
// a roof under the weather: white under snow, darker when wet
const roofCol = (col: string) =>
  SNOW ? snow(col, 0.93) : WET ? mix(col, "#140d0c", 0.25 * WET) : col;
const ground = (col: string, k = 0.75) => snow(col, k);
function setLight(when: Date, weather: SceneWeather | null) {
  const sun = sunAt(when);
  P = paletteFor(sun.alt, sun.rising);
  SEA = SEASONS[seasonOf(when)];
  ALT = sun.alt;
  // the season's cast on daylight; sunsets and nights keep their own colour
  const k = SEA.skyK * sm(2, 12, sun.alt);
  if (k > 0)
    P = {
      ...P,
      skyT: mix(P.skyT, SEA.sky, k * 0.7),
      skyM: mix(P.skyM, SEA.sky, k),
      skyH: mix(P.skyH, SEA.sky, k),
      haze: mix(P.haze, SEA.sky, k),
      light: mix(P.light, SEA.sky, k),
      litMix: P.litMix * (1 - k * 0.5),
    };
  const d = ((sun.az - BEARING + 540) % 360) - 180;
  SX = SW / 2 + d * PX_PER_DEG;
  SY = HORIZON - sun.alt * PX_PER_DEG;
  SUN = d < 0 ? -1 : 1;
  LAT = sm(0, 0.35, Math.abs(Math.sin((d * Math.PI) / 180)));
  UP = sm(-1.5, -0.5, sun.alt);
  AM = sun.rising;
  RIM = Math.abs(d) < 60 ? (1 - LAT) * UP * (1 - sm(4, 12, sun.alt)) : 0;
  const h = berlinHour(when);
  WIN = P.win * (1 - 0.5 * (sm(0, 1.5, h) - sm(4.5, 6, h)));
  WX = weather;
  const wet = weather?.kind === "rain" || weather?.kind === "storm";
  OV = sm(0.7, 1, weather?.cloud ?? 0);
  WET = wet ? (weather?.intensity ?? 0) : 0;
  STORM = weather?.kind === "storm" ? 1 : 0;
  FOG = weather?.kind === "fog" ? weather.intensity : 0;
  SNOW =
    weather?.snowCover || (weather?.kind === "snow" && weather.intensity > 0.7)
      ? 1
      : 0;
  GREY = Math.min(0.8, 0.5 * WET + 0.2 * STORM + 0.25 * OV + 0.3 * FOG);
  if (!weather) return;
  // under cloud the sky closes to a cool grey, the light goes flat and the shadows weak
  const grey = mix(
    mix(drain(mix(P.haze, P.shadow, 0.4), 1), "#56606e", 0.35),
    INK,
    0.22 * WET + 0.25 * STORM,
  );
  // fog is pale by day and takes the hour's tint; at night only the town lights it
  FOGC = mix(
    mix(drain(P.haze, 0.7), P.skyH, 0.3),
    "#ffffff",
    0.4 * (1 - 0.8 * P.flood),
  );
  const veil = sm(0.4, 0.9, weather.cloud);
  const sky = (col: string, k: number, f: number) =>
    mix(mix(col, grey, OV * k), FOGC, FOG * f);
  P = {
    ...P,
    // what sun gets through a closed sky is dull and warm, not yellow
    sun: mix(P.sun, "#c8845a", 0.7 * OV * P.disc),
    skyT: sky(P.skyT, 0.9, 0.75),
    skyM: sky(P.skyM, 0.9, 0.9),
    skyH: sky(P.skyH, 0.85, 1),
    glowA: P.glowA * (1 - 0.5 * OV),
    rays: P.rays * (1 - OV),
    stars: P.stars * (1 - veil),
    moon: P.moon * (1 - veil),
    light: mix(P.light, grey, OV * 0.85),
    litMix: P.litMix * (1 - 0.5 * OV),
    shadeMix: P.shadeMix * (1 - 0.3 * OV),
    dark: P.dark + 0.1 * WET + 0.1 * STORM,
    haze: mix(mix(P.haze, grey, Math.max(0.8 * WET, 0.6 * OV)), FOGC, FOG),
    hazeK: P.hazeK * (1 + 0.8 * WET + 0.8 * FOG),
    mist: P.mist + 0.5 * WET,
    deck: mix(P.deck, mix(grey, INK, 0.15), OV * 0.8),
    // by day a cloud's belly is soft grey-white, not a bright rim
    deckLit: mix(mix(P.deckLit, P.deck, 0.6 * (1 - P.disc)), grey, OV * 0.9),
    deckA: sm(0.15, 0.5, weather.cloud) * (1 - FOG),
    cloud: mix(P.cloud, mix(grey, INK, 0.1), OV * 0.9),
  };
  LAT *= 1 - 0.8 * OV;
  RIM *= 1 - OV;
  UP *= 1 - OV;
}
function C(base: string, f: Face): string {
  const L = mix(base, P.light, P.litMix);
  const S = mix(base, P.shadow, P.shadeMix);
  // with the sun dead ahead or dead behind, neither side is the lit one
  const M = mix(L, S, P.front);
  const c0 = f === "M" ? M : mix(M, f === "L" ? L : S, LAT);
  let c = mix(c0, INK, P.dark);
  // snow stays the palest thing in a dark town
  if (SNOW && snowy.has(base))
    c = mix(
      c,
      f === "L" ? mix("#a9b8d6", P.light, 0.5) : "#a9b8d6",
      0.55 * Math.min(1, P.dark * 1.2),
    );
  c = drain(c, GREY);
  return D ? mix(c, P.haze, Math.min(1, D * P.hazeK)) : c;
}
const side = (left: boolean): Face => (left === SUN < 0 ? "L" : "S");
// floodlit church at night
function CH(base: string, f: Face, k = 1): string {
  const c = C(base, f);
  // a few warm lamps from below: weak overall, and slate takes little of it
  const fl =
    P.flood * k * (base === MAT.slate || snowy.has(base) ? 0.12 : 0.42);
  if (fl <= 0) return c;
  const F =
    f === "L"
      ? mix(base, "#ffc98c", 0.5)
      : f === "S"
        ? mix(mix(base, "#ff9a50", 0.28), "#1c0f08", 0.3)
        : mix(base, "#ffb272", 0.36);
  return mix(c, F, fl);
}

/* ---------- drawing helpers ---------- */
function poly(c: Ctx, p: number[], col: string) {
  c.fillStyle = col;
  c.beginPath();
  c.moveTo(at(p, 0), at(p, 1));
  for (let i = 2; i < p.length; i += 2) c.lineTo(at(p, i), at(p, i + 1));
  c.closePath();
  c.fill();
}
function rect(
  c: Ctx,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  col: string,
) {
  c.fillStyle = col;
  c.fillRect(x0, y0, x1 - x0, y1 - y0);
}
function circ(c: Ctx, x: number, y: number, r: number, col: string) {
  c.fillStyle = col;
  c.beginPath();
  c.arc(x, y, r, 0, 6.2832);
  c.fill();
}
function arch(c: Ctx, x: number, y: number, w: number, h: number, col: string) {
  c.fillStyle = col;
  c.beginPath();
  c.moveTo(x, y + h);
  c.lineTo(x, y + w / 2);
  c.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0);
  c.lineTo(x + w, y + h);
  c.closePath();
  c.fill();
}
function line(
  c: Ctx,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  col: string,
  w: number,
) {
  c.strokeStyle = col;
  c.lineWidth = w;
  c.beginPath();
  c.moveTo(x0, y0);
  c.lineTo(x1, y1);
  c.stroke();
}

/* ---------- sky ---------- */
const HZ = 600;
function sky(c: Ctx) {
  const g = c.createLinearGradient(0, 0, 0, HZ);
  g.addColorStop(0, P.skyT);
  g.addColorStop(0.62, P.skyM);
  g.addColorStop(1, P.skyH);
  c.fillStyle = g;
  c.fillRect(-3000, -5000, 8000, 7000);
  const r = rng(5);
  if (P.stars > 0.01) {
    for (let i = 0; i < 260; i++) {
      const x = r() * 1800 - 100;
      const y = r() * 800 - 200;
      const s = r();
      c.fillStyle = rgba(
        "#fff8ee",
        P.stars * (0.25 + 0.75 * s) * (y < 380 ? 1 : 0.5),
      );
      c.fillRect(x, y, s < 0.93 ? 1.1 : 2, s < 0.93 ? 1.1 : 2);
    }
  }
  // glow: a wide flat band along the horizon, brightest at the sun
  if (P.glowA > 0.01) {
    c.save();
    // a sun far outside the frame still warms the nearer edge
    c.translate(Math.max(-300, Math.min(1900, SX)), SY);
    // under a closed sky only a narrow dull band is left on the horizon
    c.scale(1.8, 0.6 - 0.42 * OV * (1 - FOG));
    const R = c.createRadialGradient(0, 0, 0, 0, 0, 640);
    R.addColorStop(0, rgba(mix(P.sun, "#ffffff", 0.4), P.glowA));
    R.addColorStop(0.12, rgba(P.sun, 0.75 * P.glowA));
    R.addColorStop(0.45, rgba(P.sun, 0.25 * P.glowA));
    R.addColorStop(1, rgba(P.sun, 0));
    c.fillStyle = R;
    c.fillRect(-4000, -9000, 8000, 12000);
    c.restore();
  }
  if (P.rays * UP > 0.01) {
    c.save();
    c.globalCompositeOperation = "lighter";
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI * (0.08 + i * 0.1);
      const w = 0.022 + 0.01 * (i % 3);
      c.fillStyle = rgba(P.sun, 0.035 * P.rays * UP);
      c.beginPath();
      c.moveTo(SX, SY);
      c.arc(SX, SY, 1400, a - w, a + w);
      c.closePath();
      c.fill();
    }
    c.restore();
  }
  if (UP > 0.01) {
    // thin bright streaks of cloud close to the sun
    const S: [number, number, number][] = [
      [-190, -46, 150],
      [-60, -92, 210],
      [-260, -124, 120],
      [-120, -22, 90],
    ];
    for (const [dx, dy, w] of S) {
      c.fillStyle = rgba(mix(P.sun, "#ffffff", 0.25), 0.8 * P.disc * UP);
      c.beginPath();
      c.ellipse(SX + dx, SY + dy, w, 3.2, 0, 0, 6.3);
      c.fill();
    }
    // high sun: a small bright disc in one soft glow; the ringed halo belongs to the low sun
    const low = P.disc;
    const G = c.createRadialGradient(SX, SY, 0, SX, SY, 60);
    G.addColorStop(0, rgba("#fffbe6", 0.6 * UP * (1 - low)));
    G.addColorStop(1, rgba("#fffbe6", 0));
    c.fillStyle = G;
    c.fillRect(SX - 60, SY - 60, 120, 120);
    circ(c, SX, SY, 64, rgba(P.sun, 0.3 * UP * low));
    circ(c, SX, SY, 34, rgba(mix(P.sun, "#ffffff", 0.4), 0.55 * UP * low));
    circ(c, SX, SY, 12 + 5 * low, rgba(mix(P.sun, "#ffffff", 0.6), UP));
  }
  if (P.moon > 0.01) {
    const mx = 1290;
    const my = 452;
    circ(c, mx, my, 40, rgba("#dfe6ff", 0.06 * P.moon));
    c.save();
    c.beginPath();
    c.arc(mx, my, 15, 0, 6.3);
    c.clip();
    c.beginPath();
    c.arc(mx, my, 15, 0, 6.3);
    c.arc(mx + 6, my - 4, 13.5, 0, 6.3);
    c.fillStyle = rgba("#f3efe2", P.moon);
    c.fill("evenodd");
    c.restore();
  }
}

/* ---------- cloud deck: a heavy ceiling over the glow band, its underside lit by the low sun ---------- */
const deckY = (x: number) =>
  358 + 32 * Math.sin(x / 240 + 0.4) + 16 * Math.sin(x / 77) - x * 0.02;
// how strongly the low sun reaches a spot under the deck: more low down and toward the sun
const deckK = (x: number, y: number) =>
  sm(0, 320, y) ** 1.5 *
  (1 - 0.8 * sm(300, 1500, Math.abs(x - Math.max(-300, Math.min(1900, SX)))));
function deck(c: Ctx) {
  const r = rng(77);
  const oval = (x: number, y: number, rx: number, ry: number, col: string) => {
    c.fillStyle = col;
    c.beginPath();
    c.ellipse(x, y, rx, ry, 0, 0, 6.3);
    c.fill();
  };
  const lumps: [number, number, number, number][] = [];
  for (let x = -200; x < 1800; x += 40 + r() * 60)
    lumps.push([x, deckY(x) - 14, 55 + r() * 90, 10 + r() ** 2 * 44]);
  // scraps hanging under the edge
  for (let i = 0; i < 7; i++) {
    const x = r() * 1700;
    lumps.push([x, deckY(x) + 14 + r() * 26, 40 + r() * 60, 6 + r() * 8]);
  }
  const lit = mix(P.deckLit, P.sun, 0.35 * P.disc * (1 - OV));
  for (const [x, y, rx, ry] of lumps)
    oval(
      x,
      y + 9 + ry * 0.4,
      rx,
      ry,
      mix(P.deck, lit, 0.25 + 0.75 * deckK(x, 320)),
    );
  for (const [x, y, rx, ry] of lumps)
    oval(
      x,
      y + 4 + ry * 0.2,
      rx,
      ry,
      mix(P.deck, P.deckLit, 0.15 + 0.5 * deckK(x, 320)),
    );
  c.fillStyle = P.deck;
  c.beginPath();
  c.moveTo(-200, -5000);
  for (let x = -200; x <= 1800; x += 20) c.lineTo(x, deckY(x) - 14);
  c.lineTo(1800, -5000);
  c.fill();
  for (const [x, y, rx, ry] of lumps) oval(x, y, rx, ry, P.deck);
  // a cool break in the deck, top right
  const gap = mix(P.deck, P.skyT, 0.75);
  oval(1420, 70, 230, 60, mix(P.deck, gap, 0.5));
  oval(1470, 60, 170, 40, gap);
  oval(1290, 110, 120, 22, mix(P.deck, gap, 0.6));
  oval(1560, 120, 110, 24, gap);
  // rolls inside the deck: each a dark back with a lit belly, redder low down and toward the sun
  const rolls: [number, number, number, number][] = [];
  for (let i = 0; i < 46; i++) {
    const x = r() * 2000 - 200;
    const y = 10 + r() ** 0.7 * (deckY(x) - 70);
    rolls.push([x, y, 60 + r() ** 2 * 420, 8 + r() ** 2 * 46]);
  }
  const top = mix(P.deck, P.skyT, 0.6);
  for (const [x, y, w, h] of rolls.sort((a, b) => a[1] - b[1])) {
    const k = deckK(x, y);
    oval(x, y + 5 + h * 0.3, w, h, mix(P.deck, P.deckLit, 0.1 + 0.8 * k));
    oval(
      x - SUN * 8,
      y + h * 0.12,
      w * 1.02,
      h,
      mix(P.deck, P.deckLit, 0.05 + 0.4 * k),
    );
    oval(
      x - SUN * 16,
      y - h * 0.25,
      w * 0.96,
      h * 0.8,
      mix(P.deck, top, 0.75 - 0.6 * k),
    );
  }
}

/* ---------- drifting clouds: flat poster bands in the glow band, lit from below at sunset ---------- */
const CL: [number, number, number, number][] = [
  [1010, 386, 110, 9],
  [1180, 380, 70, 7],
  [40, 392, 150, 11],
  [1330, 478, 190, 6],
  [1480, 432, 120, 8],
  [610, 440, 90, 6],
  [300, 470, 120, 6],
];
const mod = (a: number, n: number) => ((a % n) + n) % n;
function clouds(c: Ctx, t: number) {
  const body = mix(P.cloud, P.skyM, 0.2);
  const lit = mix(P.cloud, P.sun, P.disc * 0.8 * (1 - OV));
  const shd = mix(P.cloud, P.skyM, 0.5);
  // a clear sky keeps a few scraps; they drift with the wind
  const n = FOG ? 0 : WX ? Math.round(2 + 5 * sm(0, 0.5, WX.cloud)) : CL.length;
  const drift = WX ? WX.wind * 0.5 : 2;
  CL.slice(0, n).forEach(([x0, y, w, h], i) => {
    const x = mod(x0 + t * (drift + (i % 3)) + 300, 2200) - 300;
    const rr = rng(40 + i);
    const puffs: [number, number][] = [];
    for (let k = 0; k < 7; k++) {
      const f = (k + 0.5) / 7;
      puffs.push([
        x + w * f,
        h * (0.7 + 1.3 * Math.sin(Math.PI * f)) * (0.7 + rr() * 0.5),
      ]);
    }
    c.save();
    c.beginPath();
    c.rect(x - 60, y - 80, w + 120, 80 + h);
    c.clip();
    c.fillStyle = rgba(shd, 0.95);
    for (const [px, ph] of puffs) {
      c.beginPath();
      c.ellipse(px, y + h, (w / 7) * 0.95, ph, 0, 0, 6.3);
      c.fill();
    }
    c.fillStyle = rgba(body, 0.97);
    for (const [px, ph] of puffs) {
      c.beginPath();
      c.ellipse(px - SUN * 2, y + h - 2.5, (w / 7) * 0.85, ph * 0.9, 0, 0, 6.3);
      c.fill();
    }
    c.restore();
    c.fillStyle = rgba(lit, 0.9);
    c.fillRect(x + w * 0.08, y + h - 2.2, w * 0.84, 2.2);
  });
}

/* ---------- hills: three wooded ranges, a village on the far slope ---------- */
const hillA = (x: number) =>
  554 +
  8 * Math.sin(x / 230 + 1) +
  3 * Math.sin(x / 53) +
  30 * sm(1100, 1500, x);
const hillB = (x: number) =>
  548 +
  18 * Math.sin(x / 109 - 0.48) +
  5 * Math.sin(x / 43) +
  56 * sm(1290, 1520, x);
const hillC = (x: number) =>
  606 + 5 * Math.sin(x / 90 + 1) + 3 * Math.sin(x / 31);
function range(
  c: Ctx,
  f: (x: number) => number,
  seed: number,
  bump: number,
  patches: string[] = [],
) {
  const r = rng(seed);
  c.beginPath();
  c.moveTo(-100, 1100);
  for (let x = -100; x <= 1700; x += 8) c.lineTo(x, f(x));
  c.lineTo(1700, 1100);
  c.fill();
  // treeline: small crowns breaking the edge
  for (let x = -100; x < 1700; x += bump * (0.8 + r())) {
    c.beginPath();
    c.arc(x, f(x) + bump * 0.3, bump * (0.6 + r() * 0.6), 0, 6.3);
    c.fill();
  }
  // stands of another colour on the slope: conifers in winter, turning trees in autumn
  for (let i = 0; i < patches.length * 44; i++) {
    const x = r() * 1800 - 100;
    const y = f(x) + 6 + r() * 46;
    c.fillStyle = C(
      at(patches, (r() * patches.length) | 0),
      r() < 0.5 ? "S" : "M",
    );
    for (let k = 0; k < 3 + r() * 4; k++) {
      c.beginPath();
      c.arc(
        x + (r() - 0.5) * 22,
        y + (r() - 0.5) * 7,
        bump * (0.5 + r() * 0.6),
        0,
        6.3,
      );
      c.fill();
    }
  }
}
function hills(c: Ctx) {
  D = 0.86;
  c.fillStyle = C(ground(SEA.leaf), "M");
  range(c, hillA, 9, 3);
  D = 0.3;
  c.fillStyle = C(ground(SEA.wood, 0.55), "S");
  range(c, hillB, 11, 4.5, SEA.patches);
  // village on the slope: pale specks, lit after dark
  const r = rng(13);
  for (let i = 0; i < 170; i++) {
    const x = i < 110 ? 1190 + r() * 400 : r() * 540;
    const top = hillB(x) + 12;
    const y = top + r() * Math.max(4, 612 - top);
    const on = r() < WIN * 0.8;
    c.fillStyle = on ? "#ffc46b" : C(r() < 0.7 ? MAT.plaster : MAT.clay, "L");
    c.fillRect(x, y, 2 + r() * 3, 1.6 + r());
  }
  D = 0.2;
  c.fillStyle = C(ground(SEA.wood, 0.55), "S");
  range(c, hillC, 12, 5, SEA.patches);
}

/* ---------- valley floor: fields, tree clumps and the lower town, small and hazy ---------- */
function valley(c: Ctx) {
  const r = rng(51);
  D = 0.42;
  const g = c.createLinearGradient(0, 610, 0, 760);
  g.addColorStop(0, C(ground(SEA.field), "M"));
  g.addColorStop(1, C(ground(SEA.leaf), "S"));
  c.fillStyle = g;
  c.fillRect(-100, 612, 1900, 500);
  for (let i = 0; i < 9; i++) {
    const x = 1200 + r() * 450;
    const y = 616 + r() * 22;
    const w = 80 + r() * 200;
    poly(
      c,
      [x, y, x + w, y - 2, x + w + 12, y + 4, x + 8, y + 6],
      C(ground(i % 2 ? SEA.field : SEA.field2), "L"),
    );
  }
  const items: [number, number, number][] = [];
  for (let i = 0; i < 330; i++)
    items.push([r() * 1700 - 50, 614 + r() ** 1.3 * 130, r()]);
  for (const [x, y, q] of items.sort((a, b) => a[1] - b[1])) {
    const k = (y - 610) / 130;
    D = 0.42 - k * 0.22;
    if (q < 0.55) {
      const rr = 3 + k * 10;
      tree(c, x, y - rr, rr * 2.8, rr * 2.4, (q * 1000) | 0);
      continue;
    }
    const w = (8 + k * 20) * (q > 0.95 ? 3 : 1);
    const h = 4 + k * 9;
    rect(c, x, y - h, x + w, y, C(q > 0.8 ? MAT.plaster : MAT.cream, "M"));
    rect(
      c,
      SUN < 0 ? x : x + w * 0.75,
      y - h,
      SUN < 0 ? x + w * 0.25 : x + w,
      y,
      C(MAT.plaster, "L"),
    );
    if (q <= 0.95)
      poly(
        c,
        [x - 1, y - h, x + w / 2, y - h * 1.9, x + w + 1, y - h],
        C(roofCol(q < 0.72 ? MAT.clay : MAT.slate), "M"),
      );
    if (q * 7 - 4 < WIN) {
      c.fillStyle = "#ffc46b";
      c.fillRect(x + w * 0.3, y - h * 0.7, 1.4 + k * 2, 1.4 + k * 2);
    }
  }
}

/* ---------- church glow at night, behind the towers ---------- */
function nightGlow(c: Ctx) {
  if (P.flood < 0.02) return;
  const R = c.createRadialGradient(830, 780, 10, 830, 780, 260);
  R.addColorStop(0, rgba("#ff9d55", 0.12 * P.flood));
  R.addColorStop(1, rgba("#ff9d55", 0));
  c.fillStyle = R;
  c.fillRect(200, 0, 1200, 1000);
}

/* ---------- the Marienkirche and the lighter tower beside it, drawn in the reference photo's pixel space ---------- */
function church(c: Ctx) {
  c.save();
  c.transform(0.97, 0, 0, 0.94, 450, 60);
  const sand = MAT.sand;
  // the spires are too steep for snow; it lies on their skirts and on the lower roofs
  const sl = snow(MAT.slate, 0.8);
  const pink = MAT.pink;
  const win = CH(MAT.win, "S", 0.3);
  const lit = (k: number, b = 0.9) => mix(win, "#ffc46b", WIN > k ? b : 0);
  const cross = (x: number, y: number, h: number) => {
    line(c, x, y, x, y - h, CH(sl, "S"), 3);
    line(
      c,
      x - h * 0.28,
      y - h * 0.62,
      x + h * 0.28,
      y - h * 0.62,
      CH(sl, "S"),
      2,
    );
    circ(c, x, y - 2, 3.2, CH("#c9a24a", "L"));
  };
  // octagonal spire as three facets meeting at the tip
  // `tw` and `top` give the skirt that widens to the tower's own width and top
  const spire = (
    cx: number,
    base: number,
    tip: number,
    hw: number,
    tw: number,
    top: number,
  ) => {
    const a = cx - hw;
    const b = cx - hw * 0.36;
    const d = cx + hw * 0.36;
    const e = cx + hw;
    // slate stays dark even on its sunny facet; the lit edge lines carry the light
    const m = CH(MAT.slate, "M");
    const sh = CH(MAT.slate, "S");
    const mid = mix(m, sh, 0.5);
    poly(c, [a, base, cx, tip, e, base, cx + tw, top, cx - tw, top], mid);
    if (SNOW)
      poly(c, [a, base, e, base, cx + tw, top, cx - tw, top], CH(sl, "M"));
    poly(c, [a, base, cx, tip, b, base], SUN < 0 ? m : sh);
    poly(c, [d, base, cx, tip, e, base], SUN < 0 ? sh : m);
    line(c, cx, tip, SUN < 0 ? b : d, base, rgba(CH("#8a93a8", "L"), 0.6), 1.4);
    line(c, cx, tip, SUN < 0 ? a : e, base, rgba(CH("#8a93a8", "L"), 0.8), 1.6);
  };
  const octo = (
    x0: number,
    x1: number,
    y0: number,
    y1: number,
    base: string,
  ) => {
    const w = x1 - x0;
    const a = x0 + w * 0.24;
    const b = x1 - w * 0.24;
    rect(c, x0, y0, x1, y1, CH(base, "M"));
    rect(c, x0, y0, a, y1, CH(base, side(true)));
    rect(c, b, y0, x1, y1, CH(base, side(false)));
  };
  // ring of steep gablets where a spire meets its tower, a pinnacle at each end
  const gablets = (x0: number, x1: number, y: number, n: number, h: number) => {
    const w = (x1 - x0) / n;
    for (let i = 0; i < n; i++) {
      const a = x0 + i * w;
      poly(c, [a, y, a + w / 2, y - h, a + w, y], CH(sand, "M"));
      poly(
        c,
        [a + w / 2, y - h, a + w, y, a + w / 2, y],
        CH(sand, side(false)),
      );
      arch(c, a + w / 2 - 3, y - h * 0.55, 6, h * 0.4, win);
    }
    for (const x of [x0, x1]) {
      rect(c, x - 2.5, y - h * 0.9, x + 2.5, y, CH(sand, "S"));
      poly(
        c,
        [x - 4, y - h * 0.9, x, y - h * 1.5, x + 4, y - h * 0.9],
        CH(sl, "S"),
      );
    }
  };
  const course = (x0: number, x1: number, y: number, base: string) => {
    rect(c, x0 - 3, y, x1 + 3, y + 5, CH(base, "S"));
    rect(c, x0 - 3, y - 2, x1 + 3, y, CH(base, "L"));
  };

  // slim north tower, far left
  octo(187, 281, 478, 700, sand);
  for (let i = 0; i < 3; i++) arch(c, 199 + i * 27, 500, 12, 40, win);
  course(187, 281, 548, sand);
  spire(234, 458, 110, 38, 48, 492);
  gablets(185, 283, 490, 3, 48);
  cross(234, 110, 42);

  // rear spire of the pair and the pink belfry stage under it
  spire(404, 440, 130, 76, 89, 452);
  cross(398, 130, 40);
  octo(418, 492, 446, 620, pink);
  rect(c, 486, 446, 492, 620, CH(sand, side(false)));
  gablets(420, 492, 448, 2, 44);
  arch(c, 436, 490, 40, 60, CH(sand, "S"));
  arch(c, 440, 494, 14, 56, win);
  arch(c, 458, 494, 14, 56, win);
  course(418, 492, 555, sand);

  // the lighter tower: cream plaster, two gabled faces, slate helm, lantern and vane.
  // The faces meet at x 717; every opening sits on its face's axis, under the gable apex.
  const cream = MAT.cream;
  const AX = [677, 757] as const;
  rect(c, 637, 535, 797, 1000, CH(cream, side(true), 0.6));
  rect(c, 717, 535, 797, 1000, CH(cream, side(false), 0.6));
  poly(c, [677, 445, 705, 400, 729, 400, 757, 445, 717, 534], CH(sl, "M", 0.6));
  poly(c, [717, 400, 729, 400, 757, 445, 717, 534], CH(sl, side(false), 0.6));
  poly(c, [632, 540, 677, 443, 722, 540], CH(cream, side(true), 0.6));
  poly(c, [712, 540, 757, 443, 802, 540], CH(cream, side(false), 0.6));
  line(c, 631, 541, 677, 441, CH(sl, "S", 0.6), 5);
  line(c, 677, 441, 717, 534, CH(sl, "S", 0.6), 3);
  line(c, 717, 534, 757, 441, CH(sl, "S", 0.6), 3);
  line(c, 757, 441, 803, 541, CH(sl, "L", 0.6), 5);
  rect(c, 705, 352, 729, 402, CH(sl, "M", 0.6));
  rect(c, 722, 352, 729, 402, CH(sl, side(false), 0.6));
  for (let i = 0; i < 3; i++) rect(c, 708 + i * 7, 358, 712 + i * 7, 374, win);
  poly(c, [697, 354, 717, 300, 737, 354], CH(sl, "M", 0.6));
  poly(c, [717, 300, 737, 354, 724, 354], CH(sl, side(false), 0.6));
  line(c, 717, 302, 717, 272, CH(sl, "S"), 1.8);
  circ(c, 717, 296, 3, CH("#c9a24a", "L"));
  poly(c, [717, 274, 727, 271, 717, 280], CH(sl, "S"));
  for (const y of [538, 600, 668]) {
    rect(c, 637, y, 797, y + 4, CH(sand, "S", 0.6));
  }
  // quoins on the three corners
  for (let y = 546; y < 780; y += 16) {
    rect(c, 637, y, 644, y + 9, CH(sand, "M", 0.6));
    rect(c, 713, y, 721, y + 9, CH(sand, "M", 0.6));
    rect(c, 790, y, 797, y + 9, CH(sand, "M", 0.6));
  }
  circ(c, AX[1], 480, 12, CH("#c9a24a", "L", 0.6));
  circ(c, AX[1], 480, 9.5, CH("#2a2622", "M", 0.3));
  line(c, AX[1], 480, AX[1], 473, CH("#e8d9a8", "L"), 1.6);
  line(c, AX[1], 480, AX[1] + 5, 483, CH("#e8d9a8", "L"), 1.6);
  circ(c, AX[0], 482, 7, CH(sand, "S", 0.6));
  circ(c, AX[0], 482, 4.5, win);
  const pair = (cx: number, y: number, w: number, h: number, k: number) => {
    arch(c, cx - w - 5, y - 3, w * 2 + 10, h + 5, CH(sand, "M", 0.6));
    arch(c, cx - w - 2, y, w, h, lit(k));
    arch(c, cx + 2, y, w, h, lit(k));
  };
  pair(AX[0], 503, 13, 28, 2);
  pair(AX[1], 503, 13, 28, 0.9);
  pair(AX[0], 558, 14, 34, 0.5);
  pair(AX[1], 558, 14, 34, 2);
  arch(c, AX[1] - 11, 606, 22, 44, CH(sand, "M", 0.6));
  arch(c, AX[1] - 7, 610, 14, 40, win);
  rect(c, AX[1] - 4, 682, AX[1] + 4, 698, win);

  // transept roof between the slim tower and the pair
  poly(c, [248, 720, 248, 610, 298, 584, 316, 604, 316, 720], CH(sl, "M"));
  cross(298, 584, 26);

  // front tower of the pair: red sandstone octagon, belfry arches, string courses
  octo(310, 420, 478, 1000, sand);
  for (let i = 0; i < 3; i++) {
    arch(c, 322 + i * 33, 492, 20, 50, CH(sand, "S"));
    arch(c, 326 + i * 33, 497, 12, 45, win);
  }
  c.fillStyle = rgba(CH(sand, "S"), 0.45);
  for (let y = 565; y < 1000; y += 13) c.fillRect(310, y, 110, 1.2);
  for (const y of [478, 548, 628, 735]) course(310, 420, y, sand);
  for (let i = 0; i < 7; i++) arch(c, 314 + i * 15, 742, 9, 12, CH(sand, "S"));
  spire(366, 446, 65, 47, 56, 482);
  gablets(310, 420, 478, 3, 50);
  cross(366, 65, 50);

  // choir: polygonal apse under a steep slate cone, gablets, two tiers of arched windows
  poly(c, [84, 668, 205, 515, 306, 664, 306, 704, 84, 704], CH(sl, "S"));
  poly(c, [84, 668, 205, 515, 148, 672], CH(sl, SUN < 0 ? "M" : "S"));
  poly(c, [148, 672, 205, 515, 252, 672], mix(CH(sl, "M"), CH(sl, "S"), 0.5));
  poly(c, [252, 672, 205, 515, 306, 664], CH(sl, SUN < 0 ? "S" : "M"));
  line(c, 205, 515, 252, 672, rgba(CH("#8a93a8", "L"), 0.6), 1.4);
  line(c, 205, 517, 205, 492, CH(sl, "S"), 2);
  circ(c, 205, 492, 3, CH("#c9a24a", "L"));
  const faces: [number, number, Face][] = [
    [86, 150, side(true)],
    [150, 250, "M"],
    [250, 304, side(false)],
  ];
  // one wall behind the three faces, lapping onto the tower so no gap can open
  rect(c, 86, 700, 312, 1000, CH(pink, "M"));
  for (const [x0, x1, f] of faces) {
    rect(c, x0, 700, x1, 1000, CH(pink, f));
    const n = f === "M" ? 2 : 1;
    const w = (x1 - x0) / n;
    for (let i = 0; i < n; i++) {
      const a = x0 + i * w;
      // gablet with a slate cap over each bay
      poly(c, [a, 702, a + w / 2, 640, a + w, 702], CH(sl, "S"));
      poly(c, [a + 4, 702, a + w / 2, 650, a + w - 4, 702], CH(sand, f));
      poly(c, [a + 11, 702, a + w / 2, 664, a + w - 11, 702], CH(pink, f));
      // upper tier: paired lancets
      for (let k = 0; k < 2; k++) {
        arch(c, a + w / 2 - 15 + k * 17, 708, 13, 48, CH(sand, "S"));
        arch(c, a + w / 2 - 12 + k * 17, 712, 7, 44, lit(0.6, 0.35));
      }
      // lower tier: one tall arch
      arch(c, a + w / 2 - 17, 786, 34, 84, CH(sand, "M"));
      arch(c, a + w / 2 - 11, 793, 22, 77, lit(0.75, f === "M" ? 0.75 : 0.4));
    }
  }
  for (const y of [700, 764]) course(86, 304, y, sand);
  for (const x of [84, 146, 248, 298]) {
    rect(c, x - 2, 690, x + 10, 1000, CH(sand, x < 200 ? side(true) : "M"));
    rect(c, x + 6, 690, x + 10, 1000, CH(sand, side(false)));
  }

  // nave roof and south aisle, running right to the lighter tower
  poly(c, [430, 592, 700, 590, 738, 680, 430, 690], CH(sl, "M"));
  poly(c, [700, 590, 738, 680, 692, 681], CH(sl, side(false)));
  line(c, 440, 591, 700, 590, CH("#6d7486", "L"), 2);
  rect(c, 600, 681, 736, 752, CH(pink, "M"));
  rect(c, 728, 681, 737, 752, CH(sand, side(false)));
  rect(c, 600, 681, 737, 688, CH(sand, "S"));
  for (const x of [644, 684]) {
    arch(c, x - 4, 696, 22, 50, CH(sand, "M"));
    arch(c, x, 700, 14, 46, lit(0.75, 0.45));
  }
  poly(c, [596, 752, 738, 748, 770, 840, 596, 840], CH(sl, "S"));

  // stair turret tucked between the tower and the gable
  rect(c, 420, 600, 446, 1000, CH(pink, "M"));
  poly(c, [418, 602, 433, 572, 448, 602], CH(sl, "S"));

  // pink gabled front with the rose window
  poly(c, [436, 708, 528, 592, 630, 708], CH(sl, "S"));
  poly(c, [440, 708, 528, 598, 626, 708, 622, 1000, 444, 1000], CH(sand, "M"));
  poly(c, [454, 708, 528, 616, 612, 708, 610, 1000, 456, 1000], CH(pink, "M"));
  poly(c, [600, 720, 612, 708, 610, 1000, 600, 1000], CH(pink, side(false)));
  // stepped trim under the slopes
  for (let i = 0; i < 7; i++) {
    const f = (i + 0.5) / 7;
    rect(
      c,
      456 + f * 68,
      704 - f * 86,
      464 + f * 68,
      712 - f * 86,
      CH(sand, "S"),
    );
    rect(
      c,
      603 - f * 72,
      704 - f * 86,
      611 - f * 72,
      712 - f * 86,
      CH(sand, "S"),
    );
  }
  cross(528, 594, 30);
  arch(c, 508, 640, 40, 60, CH(sand, "M"));
  arch(c, 513, 662, 13, 36, lit(0.6, 0.4));
  arch(c, 530, 662, 13, 36, lit(0.6, 0.4));
  circ(c, 528, 652, 6, win);
  circ(c, 524, 740, 33, CH(sand, "M"));
  circ(c, 524, 740, 27, lit(0.6, 0.6));
  for (let a = 0; a < 8; a++) {
    const t = (a * Math.PI) / 4;
    line(
      c,
      524,
      740,
      524 + Math.cos(t) * 27,
      740 + Math.sin(t) * 27,
      CH(sand, "M"),
      2.4,
    );
    circ(
      c,
      524 + Math.cos(t + 0.39) * 19,
      740 + Math.sin(t + 0.39) * 19,
      4.5,
      lit(0.6, 0.6),
    );
  }
  circ(c, 524, 740, 8, CH(sand, "M"));
  circ(c, 524, 740, 4.5, win);
  for (const x of [482, 566]) {
    circ(c, x, 792, 19, CH(sand, "M"));
    circ(c, x, 792, 14, win);
  }
  // porch gable in front of the lower roses
  poly(c, [472, 870, 522, 764, 576, 870], CH(sl, "S"));
  poly(c, [484, 870, 522, 786, 564, 870], CH(sand, "M"));
  for (let i = 0; i < 3; i++)
    arch(c, 503 + i * 14, 822 - (i === 1 ? 14 : 0), 9, 60, win);
  rect(c, 440, 700, 456, 1000, CH(sand, side(true)));
  rect(c, 610, 700, 626, 1000, CH(sand, side(false)));
  c.restore();
}

/* ---------- trees: three flat lobes, lit along the sun edge; bare branches where the season says so ---------- */
function branches(
  c: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  i: number,
) {
  const r = rng(300 + i);
  const col = C("#3a2c24", "S");
  const grow = (
    x0: number,
    y0: number,
    a: number,
    len: number,
    wd: number,
    n: number,
  ) => {
    const x1 = x0 + Math.sin(a) * len;
    const y1 = y0 - Math.cos(a) * len;
    line(c, x0, y0, x1, y1, col, Math.max(1.1, wd));
    if (SNOW && n < 4)
      line(
        c,
        x0,
        y0 - 1.2,
        x1,
        y1 - 1.2,
        C(WHITE, "L"),
        Math.max(0.9, wd * 0.5),
      );
    if (n === 0) return;
    for (const s of [-1, 1])
      grow(
        x1,
        y1,
        a + s * (0.28 + r() * 0.34),
        len * (0.62 + r() * 0.14),
        wd * 0.64,
        n - 1,
      );
  };
  grow(x, y + h * 0.5, 0, h * 0.42, w * 0.07, h < 40 ? 3 : 5);
}
function tree(c: Ctx, x: number, y: number, w: number, h: number, i: number) {
  // each tree's place in the season: the late ones are bare or thin, the early ones carry the accent colour
  const u = (i * 0.37 + 0.55) % 1;
  const bare = u > 1 - SEA.bareK;
  if (bare) branches(c, x, y, w, h, i);
  if (SEA.bareK === 1) return;
  const acc =
    u < SEA.accentK && w <= SEA.accentMax
      ? at(SEA.accents, i % SEA.accents.length)
      : null;
  const leaf = acc ? mix(acc, SEA.leaf, 0.22) : SEA.leaf;
  const size = bare ? 0.6 : 1;
  const lobes: [number, number, number, number][] = [
    [-0.27, 0.16, 0.3, 0.3],
    [0.28, 0.2, 0.27, 0.27],
    [0.02, -0.12, 0.36, 0.4],
  ];
  const oval = (k: number, dx: number, dy: number, col: string) => {
    c.fillStyle = col;
    for (const [ox, oy, rx, ry] of lobes) {
      c.beginPath();
      c.ellipse(
        x + ox * w + dx,
        y + oy * h + dy,
        rx * w * k * size,
        ry * h * k * size,
        0,
        0,
        6.3,
      );
      c.fill();
    }
  };
  oval(1, 0, 0, C(ground(acc ?? SEA.leafLit, 0.85), "L"));
  oval(0.94, -SUN * w * 0.035, h * 0.03, C(leaf, "M"));
  oval(0.6, -SUN * w * 0.12, h * 0.14, C(leaf, "S"));
}

/* ---------- houses: a roof seen from above, eave to the viewer, gable end to the right unless flipped ---------- */
interface House {
  x: number;
  y: number;
  /** Ridge length, roof face height, wall height, all before scale k. */
  w: number;
  rh: number;
  wh: number;
  /** Eave offset against the ridge and drop of the ridge along its length. */
  sk: number;
  dy: number;
  /** Depth of the gable end; 0 hides it. */
  gd: number;
  k: number;
  mat: string;
  wall: string;
  tim?: boolean;
  sky?: number;
  dorm?: number;
  chim?: number[];
  flip?: boolean;
  smoke?: boolean;
  seed: number;
}
let SMOKE: [number, number] = [0, 0];
function house(c: Ctx, h: House) {
  const mat = roofCol(h.mat);
  const { w, rh, wh, sk, dy, gd } = h;
  const r = rng(h.seed);
  const gf = side(!!h.flip);
  const glass = () =>
    r() < WIN * 0.7 ? "#ffc46b" : mix(C("#3d4654", "S"), P.skyM, 0.12);
  const beam = C(MAT.beam, "S");
  c.save();
  c.translate(h.flip ? h.x + w * h.k : h.x, h.y);
  c.scale(h.flip ? -h.k : h.k, h.k);
  // a roof leaning toward the sun catches it
  const roofM =
    side(!h.flip) === "L" ? mix(C(mat, "M"), C(mat, "L"), 0.55) : C(mat, "M");
  const roofS = C(mat, "S");
  // eaves and verges show the tile under the snow
  const edge = C(h.mat, "S");
  const ax = w + sk;
  const ay = rh + dy;
  if (gd) {
    const bx = w + gd;
    const by = dy + rh * 0.86;
    poly(c, [ax, ay, w, dy, bx, by, bx, by + wh, ax, ay + wh], C(h.wall, gf));
    if (h.tim) {
      line(c, ax, ay, bx, by, beam, 3);
      line(c, ax, ay + wh * 0.5, bx, by + wh * 0.5, beam, 3);
      const mx = (ax + bx) / 2;
      const my = (ay + by) / 2;
      line(c, w, dy + 6, mx, my + wh, beam, 3);
      line(c, w, dy + 6, ax + 4, ay, beam, 2.4);
      line(c, w, dy + 6, bx - 4, by, beam, 2.4);
      for (const f of [0.25, 0.75])
        line(
          c,
          ax + (bx - ax) * f,
          ay + (by - ay) * f - rh * 0.3,
          ax + (bx - ax) * f,
          ay + wh,
          beam,
          2.4,
        );
    }
    const gx = (ax + bx) / 2;
    c.fillStyle = glass();
    c.fillRect(gx - 6, ay - rh * 0.32, 12, 16);
    for (let y = ay + 14; y < ay + wh - 22; y += 44) {
      for (const f of [0.3, 0.7]) {
        c.fillStyle = glass();
        c.fillRect(ax + (bx - ax) * f - 6, y, 12, 18);
      }
    }
    line(c, w, dy, ax - 3, ay + 3, edge, 5);
    line(c, w, dy, bx + 3, by + 2, edge, 4);
  }
  // wall under the eave
  poly(c, [sk, rh, ax, ay, ax, ay + wh, sk, rh + wh], C(h.wall, "M"));
  const n = Math.max(1, (w / 46) | 0);
  for (let i = 0; i < n; i++) {
    const f = (i + 0.5) / n;
    for (let y = 12; y < wh - 20; y += 44) {
      c.fillStyle = glass();
      c.fillRect(sk + w * f - 6, rh + dy * f + y, 12, 18);
    }
  }
  if (h.tim) {
    for (let y = 4; y < wh; y += 44) line(c, sk, rh + y, ax, ay + y, beam, 3);
    for (let i = 0; i <= n * 2; i++) {
      const f = i / (n * 2);
      line(c, sk + w * f, rh + dy * f, sk + w * f, rh + dy * f + wh, beam, 2.4);
    }
  }
  poly(c, [sk, rh, ax, ay, ax, ay + 5, sk, rh + 5], mix(edge, INK, 0.35));
  // roof face with tile courses
  poly(c, [0, 0, w, dy, ax, ay, sk, rh], roofM);
  c.strokeStyle = mix(roofM, INK, 0.2);
  c.lineWidth = 1;
  c.beginPath();
  for (let v = 8; v < rh; v += 8) {
    const f = v / rh;
    c.moveTo(sk * f, v);
    c.lineTo(w + sk * f, dy + v);
  }
  c.stroke();
  // weathered patches
  for (let i = 0; i < w / 40; i++) {
    const f = r();
    const v = 0.1 + r() * 0.7;
    const pw = 14 + r() * 30;
    c.fillStyle = rgba(r() < 0.5 ? C(mat, "L") : roofS, 0.22);
    c.fillRect(w * f * 0.9 + sk * v, dy * f + rh * v, pw, 7);
  }
  line(c, 0, 0, w, dy, C(mat, "L"), 3);
  const sl = sk / rh;
  for (let i = 0; i < (h.sky ?? 0); i++) {
    const f = (i + 0.6 + r() * 0.3) / ((h.sky ?? 0) + 0.6);
    const v = 0.22 + r() * 0.2;
    const x = w * f + sk * v;
    const y = dy * f + rh * v;
    const q = [x, y, x + 22, y, x + 22 + sl * 24, y + 24, x + sl * 24, y + 24];
    poly(c, q, glass());
    c.strokeStyle = mix(roofS, INK, 0.4);
    c.lineWidth = 3;
    c.stroke();
  }
  for (let i = 0; i < (h.dorm ?? 0); i++) {
    const f = (i + 0.5) / (h.dorm ?? 1);
    const x = w * f + sk * 0.5 - 20;
    const y = dy * f + rh * 0.5;
    poly(c, [x - 5, y - 26, x + 20, y - 46, x + 45, y - 26], roofS);
    poly(
      c,
      [x + 20, y - 46, x + 45, y - 26, x + 62, y - 44, x + 36, y - 58],
      roofM,
    );
    rect(c, x, y - 26, x + 40, y + 4, C(h.wall, "M"));
    c.fillStyle = glass();
    c.fillRect(x + 6, y - 20, 12, 18);
    c.fillStyle = glass();
    c.fillRect(x + 22, y - 20, 12, 18);
  }
  for (const f of h.chim ?? []) {
    const x = w * f;
    const y = dy * f + 4;
    rect(c, x - 8, y - 34, x + 8, y + 6, C("#8a5040", "M"));
    rect(
      c,
      h.flip === SUN > 0 ? x - 8 : x + 3,
      y - 34,
      h.flip === SUN > 0 ? x - 3 : x + 8,
      y + 6,
      C("#8a5040", "L"),
    );
    rect(c, x - 10, y - 39, x + 10, y - 33, C(MAT.plaster, "S"));
    if (h.smoke)
      SMOKE = [h.x + (h.flip ? w - x : x) * h.k, h.y + (y - 40) * h.k];
  }
  c.restore();
}

/* a street of smaller houses, generated; `k` sets their size */
function row(
  c: Ctx,
  y: number,
  x0: number,
  x1: number,
  k: number,
  seed: number,
) {
  const r = rng(seed);
  const mats = [MAT.clay, MAT.clay2, MAT.slate, MAT.clay, MAT.clay3];
  const walls = [MAT.plaster, MAT.cream, MAT.plaster, MAT.ochre];
  for (let x = x0; x < x1; ) {
    const w = 70 + r() * 90;
    const sk = -18 - r() * 16;
    const gd = r() < 0.7 ? -sk * (1.1 + r() * 0.4) : 0;
    house(c, {
      x,
      y: y + (r() - 0.5) * 26 * k,
      w,
      rh: 46 + r() * 26,
      wh: 70,
      sk,
      dy: (r() - 0.5) * 10,
      gd,
      k,
      mat: at(mats, (r() * mats.length) | 0),
      wall: at(walls, (r() * walls.length) | 0),
      tim: r() < 0.25,
      sky: r() < 0.5 ? 1 + ((r() * 2) | 0) : 0,
      chim: r() < 0.6 ? [0.2 + r() * 0.6] : [],
      flip: r() < 0.4,
      seed: seed * 100 + x,
    });
    x += (w + gd) * k * (0.8 + r() * 0.25);
  }
}

/* ---------- the upper town: streets stepping down toward the viewer ---------- */
function town(c: Ctx) {
  D = 0.22;
  row(c, 668, 1220, 1700, 0.34, 3);
  row(c, 676, -40, 450, 0.34, 4);
  D = 0.17;
  row(c, 694, 1210, 1700, 0.5, 5);
  // hipped slate roof with the small onion turret
  const tx = 1470;
  rect(c, tx - 9, 626, tx + 9, 668, C(MAT.slate, "M"));
  rect(c, tx + 3, 626, tx + 9, 668, C(MAT.slate, side(false)));
  c.fillStyle = C(MAT.slate, "S");
  c.beginPath();
  c.moveTo(tx - 13, 628);
  c.bezierCurveTo(tx - 20, 606, tx - 5, 606, tx, 590);
  c.bezierCurveTo(tx + 5, 606, tx + 20, 606, tx + 13, 628);
  c.fill();
  line(c, tx, 592, tx, 566, C(MAT.slate, "S"), 1.6);
  circ(c, tx, 574, 2.2, C(MAT.slate, "S"));
  poly(
    c,
    [tx - 80, 700, tx - 44, 660, tx + 50, 660, tx + 92, 700],
    C(MAT.slate, "M"),
  );
  poly(
    c,
    [tx + 50, 660, tx + 92, 700, tx + 40, 700],
    C(MAT.slate, side(false)),
  );
  // trees between the houses and at the edge of the roof field
  const T: [number, number, number, number][] = [
    [1262, 668, 56, 60],
    [1375, 664, 56, 60],
    [1570, 668, 64, 60],
    [150, 668, 60, 60],
    [395, 672, 66, 64],
    [520, 690, 50, 56],
  ];
  T.forEach(([x, y, w, h], i) => {
    tree(c, x, y, w, h, 10 + i);
  });
  D = 0.12;
  tree(c, 1282, 700, 140, 130, 0);
  tree(c, 1640, 716, 110, 110, 4);
  row(c, 732, 1200, 1700, 0.7, 7);
  tree(c, 60, 722, 120, 90, 1);
  tree(c, 468, 740, 110, 120, 2);
  tree(c, 215, 716, 64, 66, 5);
  row(c, 742, -60, 390, 0.8, 8);
  tree(c, 300, 760, 90, 80, 3);
}

/* ---------- foreground roofs, close and cut by the frame ---------- */
const NEAR: House[] = [
  // slate roofs under the lighter tower, cream gable end
  {
    x: 1050,
    y: 742,
    w: 250,
    rh: 80,
    wh: 90,
    sk: -40,
    dy: -12,
    gd: 52,
    k: 1.3,
    mat: MAT.slate,
    wall: MAT.cream,
    chim: [0.5],
    sky: 2,
    seed: 21,
  },
  // half-timbered gable and white walls at right
  {
    x: 1320,
    y: 700,
    w: 80,
    rh: 60,
    wh: 120,
    sk: -40,
    dy: 0,
    gd: 52,
    k: 1.4,
    mat: MAT.clay2,
    wall: MAT.plaster,
    tim: true,
    seed: 22,
  },
  {
    x: 40,
    y: 772,
    w: 220,
    rh: 80,
    wh: 90,
    sk: -38,
    dy: 8,
    gd: 50,
    k: 1.3,
    mat: MAT.slate,
    wall: MAT.plaster,
    chim: [0.3],
    sky: 2,
    seed: 23,
  },
  {
    x: 1370,
    y: 800,
    w: 210,
    rh: 100,
    wh: 110,
    sk: -30,
    dy: -6,
    gd: 0,
    k: 1.5,
    mat: MAT.slate,
    wall: MAT.cream,
    dorm: 2,
    chim: [0.2],
    flip: true,
    seed: 25,
  },
  // the long red roof below the church
  {
    x: 730,
    y: 802,
    w: 320,
    rh: 104,
    wh: 80,
    sk: -50,
    dy: 16,
    gd: 0,
    k: 1.55,
    mat: MAT.clay,
    wall: MAT.plaster,
    chim: [0.14, 0.86],
    sky: 3,
    smoke: true,
    flip: true,
    seed: 24,
  },
  // white gable house with a dark roof, left of the red roof
  {
    x: 400,
    y: 806,
    w: 120,
    rh: 86,
    wh: 150,
    sk: -40,
    dy: 6,
    gd: 52,
    k: 1.5,
    mat: MAT.clay2,
    wall: MAT.plaster,
    sky: 1,
    flip: true,
    seed: 26,
  },
  {
    x: 150,
    y: 826,
    w: 190,
    rh: 100,
    wh: 100,
    sk: 26,
    dy: -8,
    gd: 0,
    k: 1.6,
    mat: MAT.clay,
    wall: MAT.plaster,
    dorm: 1,
    chim: [0.7],
    seed: 27,
  },
  {
    x: -140,
    y: 836,
    w: 210,
    rh: 96,
    wh: 100,
    sk: -20,
    dy: 10,
    gd: 0,
    k: 1.6,
    mat: MAT.clay,
    wall: MAT.ochre,
    sky: 2,
    seed: 28,
  },
  {
    x: 1200,
    y: 832,
    w: 170,
    rh: 80,
    wh: 100,
    sk: -30,
    dy: 10,
    gd: 0,
    k: 1.6,
    mat: MAT.slate,
    wall: MAT.plaster,
    sky: 2,
    chim: [0.5],
    seed: 29,
  },
  {
    x: 930,
    y: 884,
    w: 150,
    rh: 80,
    wh: 80,
    sk: 30,
    dy: 0,
    gd: 0,
    k: 1.9,
    mat: MAT.clay2,
    wall: MAT.plaster,
    sky: 1,
    flip: true,
    seed: 31,
  },
  {
    x: 1240,
    y: 896,
    w: 220,
    rh: 70,
    wh: 60,
    sk: -14,
    dy: 6,
    gd: 0,
    k: 1.9,
    mat: MAT.clay,
    wall: MAT.plaster,
    sky: 2,
    chim: [0.6],
    seed: 32,
  },
  {
    x: 520,
    y: 894,
    w: 210,
    rh: 70,
    wh: 60,
    sk: -20,
    dy: -6,
    gd: 0,
    k: 1.9,
    mat: MAT.slate,
    wall: MAT.plaster,
    sky: 2,
    seed: 33,
  },
  {
    x: -20,
    y: 902,
    w: 260,
    rh: 70,
    wh: 60,
    sk: 16,
    dy: 4,
    gd: 0,
    k: 1.9,
    mat: MAT.clay2,
    wall: MAT.plaster,
    chim: [0.5],
    seed: 34,
  },
];
function near(c: Ctx) {
  for (const h of NEAR) house(c, h);
}

// fog lies in the valley as a bright bank: it takes the hill feet and thins upward, so the towers stand clear
function fog(c: Ctx, a: number, top: number) {
  if (!FOG) return;
  const g = c.createLinearGradient(0, top, 0, top + 130);
  g.addColorStop(0, rgba(FOGC, 0));
  g.addColorStop(1, rgba(FOGC, Math.min(1, a * FOG)));
  c.fillStyle = g;
  c.fillRect(-100, top, 1900, 900);
}
function mist(c: Ctx) {
  const k = P.mist * (AM ? SEA.mistAM : 1);
  fog(c, 1.2, 440);
  if (k < 0.02) return;
  const col = mix(P.haze, "#ffffff", 0.25);
  const M: [number, number, number][] = [
    [600, 660, 0.7],
    [640, 720, 0.45],
  ];
  for (const [y0, y1, a] of M) {
    const g = c.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, rgba(col, 0));
    g.addColorStop(0.5, rgba(col, Math.min(1, a * k * 0.75)));
    g.addColorStop(1, rgba(col, 0));
    c.fillStyle = g;
    c.fillRect(-100, y0, 1900, y1 - y0);
  }
}

/* ---------- layers: back to front, each with an aerial haze wash at its base ---------- */
type Wash = [number, number, number, number, string?];
interface Layer {
  /** Target canvas: 0 sky, 1 back, 2 mid. */
  g: 0 | 1 | 2;
  f: (c: Ctx) => void;
  /** Opacity of the whole layer. */
  a?: () => number;
  /** Warm outline when the low sun stands behind the layer. */
  rim?: boolean;
  m?: () => Wash;
}
const LAYERS: Layer[] = [
  {
    g: 0,
    f: deck,
    a: () => (WX ? P.deckA : P.deckA * (AM ? 1 - sm(0, 4, ALT) : 1)),
  },
  {
    g: 1,
    f: hills,
    m: () => [
      520,
      630,
      0.5 * FOG + 0.45 * WET,
      Math.min(1, 0.5 + 0.5 * FOG + 0.3 * WET),
    ],
  },
  { g: 1, f: valley, m: () => [610, 700, 0.3 + 0.4 * WET, 0.3 * WET] },
  { g: 1, f: mist },
  { g: 1, f: nightGlow },
  {
    g: 2,
    f: church,
    rim: true,
    m: () => [900, 600, 0.4 * P.flood, 0, "#ffb46e"],
  },
  { g: 2, f: (c) => fog(c, 0.55, 520) },
  {
    g: 2,
    f: town,
    m: () => [640, 760, 0.25 + 0.7 * FOG + 0.2 * WET, 0.4 * FOG],
  },
  { g: 2, f: near, m: () => [760, 1000, 0.3 * FOG, 0.1 * FOG] },
];

/* ---------- living details: chimney smoke and swifts round the spires ---------- */
function details(c: Ctx, t: number) {
  const [sx, sy] = SMOKE;
  const lean = WX ? Math.max(-170, Math.min(170, WX.wind * 7)) : 70;
  const col = mix(P.haze, "#ffffff", 0.35);
  for (let i = 0; i < 14; i++) {
    const a = (t * 0.09 + i / 14) % 1;
    c.fillStyle = rgba(
      col,
      (1 - a) * (0.34 - P.dark * 0.2) * Math.min(2, SEA.smoke),
    );
    c.beginPath();
    c.arc(
      sx + a * a * lean + Math.sin(a * 7 + i) * 3,
      sy - a * 90,
      (2 + a * 10) * (0.75 + 0.25 * SEA.smoke),
      0,
      6.3,
    );
    c.fill();
  }
  if (SEA.swifts && P.dark < 0.4 && !WX?.intensity) {
    c.strokeStyle = C("#22242a", "S");
    c.lineWidth = 1.3;
    for (let i = 0; i < 6; i++) {
      const w = 0.5 + i * 0.13;
      const a = t * w + i * 1.7;
      const x = 830 + Math.cos(a) * (90 + i * 30);
      const y = 300 + Math.sin(a) * (40 + i * 9) + Math.sin(a * 3) * 8;
      const f = Math.sin(t * 14 + i) * 1.6;
      c.beginPath();
      c.moveTo(x - 5, y - 2 + f);
      c.quadraticCurveTo(x - 2, y - 1, x, y + 0.8);
      c.quadraticCurveTo(x + 2, y - 1, x + 5, y - 2 + f);
      c.stroke();
    }
  }
}

/* ---------- falling rain and snow, and the storm's soft flash: cheap, capped, on the animated layers ---------- */
function precipitation(c: Ctx, t: number) {
  if (!WX || !WX.intensity || WX.kind === "fog") return;
  const r = rng(17);
  const k = WX.intensity;
  const n = Math.round((40 + 200 * k) * (1 + 0.6 * STORM));
  // on a small screen the scene shrinks; streaks and flakes must not
  const z = Math.max(1, 0.8 / ZOOM);
  c.beginPath();
  if (WX.kind === "snow") {
    for (let i = 0; i < n; i++) {
      const v = 50 + r() * 70;
      const sway = Math.sin(t * (0.5 + r()) + i) * 14;
      const x = mod(r() * 1900 + t * WX.wind * 4 + sway, 1900) - 150;
      const y = mod(r() * 1100 + t * v, 1100) - 50;
      const d = (1.2 + r() * 2.2) * z;
      c.moveTo(x + d, y);
      c.arc(x, y, d, 0, 6.3);
    }
    c.fillStyle = rgba("#ffffff", 0.85 - P.dark * 0.4);
    c.fill();
    return;
  }
  const slant = Math.max(-0.5, Math.min(0.5, WX.wind / 60));
  const len = (24 + 34 * k) * (1 + 0.5 * STORM) * z;
  for (let i = 0; i < n; i++) {
    const v = 900 + r() * 500;
    const x = mod(r() * 1900 + t * v * slant, 1900) - 150;
    const y = mod(r() * 1100 + t * v, 1100) - 50;
    c.moveTo(x, y);
    c.lineTo(x - slant * len, y - len);
  }
  c.strokeStyle = rgba(mix(P.haze, "#ffffff", 0.6), 0.2 + 0.25 * k);
  c.lineWidth = (1.4 + 0.5 * STORM) * z;
  c.stroke();
}
// one slow pulse every eleven seconds, behind the hills and the town
function flash(c: Ctx, t: number) {
  if (WX?.kind !== "storm") return;
  const ph = t % 11;
  const f = ph < 0.15 ? ph / 0.15 : Math.max(0, 1 - (ph - 0.15) / 0.7);
  if (f <= 0) return;
  c.fillStyle = rgba("#dfe6ff", 0.2 * f);
  c.fillRect(-3000, -3000, 8000, 8000);
}

/* ---------- mounting ---------- */
export interface SceneOptions {
  /** The instant to draw: sun, light and season all follow from it. */
  at: Date;
  /** Scene x that stays in view when the frame is narrower than the drawing. */
  focusX?: number;
  /** Where focusX sits across the visible width, 0 left to 1 right. */
  anchorX?: number;
  /** Live weather; null or absent keeps the calm default. */
  weather?: SceneWeather | null;
  /** Animate the clouds, smoke, swifts, rain and snow. Without it the storm does not flash. */
  motion?: boolean;
  portraitK?: number;
}

export interface Scene {
  setTime(d: Date): void;
  setWeather(w: SceneWeather | null): void;
  /** Starts or stops the animation loop, e.g. when the scene scrolls out of view. */
  setRunning(on: boolean): void;
  destroy(): void;
}

const FILL =
  "position:absolute;left:0;top:0;width:100%;height:100%;display:block";

export function createGelnhausenScene(
  el: HTMLElement,
  opt: SceneOptions,
): Scene {
  const o = {
    focusX: 860,
    anchorX: 0.38,
    motion: true,
    portraitK: 0.62,
    ...opt,
  };
  el.style.overflow = "hidden";
  el.style.isolation = "isolate";
  // sky, clouds, back, mid, anim
  const cv = [0, 1, 2, 3, 4].map(() => {
    const c = document.createElement("canvas");
    c.style.cssText = FILL;
    el.appendChild(c);
    return c;
  });
  const canvas = (i: number) => at(cv, i);
  const ctx = (i: number) => canvas(i).getContext("2d") as Ctx;

  const grain = document.createElement("div");
  grain.style.cssText =
    "position:absolute;inset:-60px;pointer-events:none;mix-blend-mode:overlay;opacity:.2";
  el.appendChild(grain);
  const vig = document.createElement("div");
  vig.style.cssText =
    "position:absolute;inset:0;pointer-events:none;background:radial-gradient(125% 95% at 62% 48%,transparent 58%,rgba(8,6,14,.34) 100%)";
  el.appendChild(vig);
  // grain tile
  {
    const n = document.createElement("canvas");
    n.width = n.height = 160;
    const x = n.getContext("2d") as Ctx;
    const id = x.createImageData(160, 160);
    const r = rng(99);
    for (let i = 0; i < id.data.length; i += 4) {
      const v = r() * 255;
      id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
      id.data[i + 3] = 255;
    }
    x.putImageData(id, 0, 0);
    grain.style.backgroundImage = `url(${n.toDataURL()})`;
  }
  const tmp = document.createElement("canvas");
  const edge = document.createElement("canvas");
  let W = 1;
  let XF: [number, number, number] | null = null;
  let when = o.at;
  let weather = o.weather ?? null;

  function layout() {
    W = el.clientWidth || 1;
    const H = el.clientHeight || 1;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const portrait = W / H < 0.9;
    const s = Math.max(W / SW, (H * (portrait ? o.portraitK : 1)) / SH);
    const vw = W / s;
    ZOOM = s;
    const left = Math.max(0, Math.min(SW - vw, o.focusX - vw * o.anchorX));
    // crop mostly off the bottom, so the spires keep their sky
    const top = (H - SH * s) * 0.2;
    for (const c of cv) {
      c.width = Math.round(W * DPR);
      c.height = Math.round(H * DPR);
    }
    tmp.width = canvas(0).width;
    tmp.height = canvas(0).height;
    edge.width = tmp.width;
    edge.height = tmp.height;
    XF = [DPR * s, DPR * (-left * s), DPR * top];
  }
  function xf(c: Ctx) {
    if (XF) c.setTransform(XF[0], 0, 0, XF[0], XF[1], XF[2]);
  }
  function renderTo(targets: Ctx[], T: HTMLCanvasElement) {
    for (const c of targets) {
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, c.canvas.width, c.canvas.height);
    }
    const s0 = at(targets, 0);
    xf(s0);
    D = 0;
    sky(s0);
    const t = T.getContext("2d") as Ctx;
    for (const L of LAYERS) {
      t.setTransform(1, 0, 0, 1, 0, 0);
      t.clearRect(0, 0, T.width, T.height);
      xf(t);
      D = 0;
      L.f(t);
      if (L.m) {
        const m = L.m();
        if (m[2] > 0 || m[3] > 0) {
          t.globalCompositeOperation = "source-atop";
          const g = t.createLinearGradient(0, m[0], 0, m[1]);
          const col = m[4] || P.haze;
          g.addColorStop(0, rgba(col, m[2]));
          g.addColorStop(1, rgba(col, m[3]));
          t.fillStyle = g;
          t.fillRect(-3000, -3000, 8000, 8000);
          t.globalCompositeOperation = "source-over";
        }
      }
      const T2 = at(targets, L.g);
      T2.setTransform(1, 0, 0, 1, 0, 0);
      // backlight: the layer's silhouette in sun colour, peeking out a pixel or two on each side
      const rim = L.rim ? RIM : 0;
      if (rim > 0.02) {
        const e = edge.getContext("2d") as Ctx;
        e.globalCompositeOperation = "copy";
        e.drawImage(T, 0, 0);
        e.globalCompositeOperation = "source-in";
        e.fillStyle = mix(P.sun, "#ff9a3c", 0.4);
        e.fillRect(0, 0, edge.width, edge.height);
        const px = (XF?.[0] ?? 1) * 1.4;
        T2.globalAlpha = rim * 0.85;
        for (const [dx, dy] of [
          [-px, 0],
          [px, 0],
          [0, -px],
        ] as const)
          T2.drawImage(edge, dx, dy);
      }
      T2.globalAlpha = L.a ? L.a() : 1;
      T2.drawImage(T, 0, 0);
      T2.globalAlpha = 1;
    }
    D = 0;
  }
  function render() {
    setLight(when, weather);
    renderTo([ctx(0), ctx(2), ctx(3)], tmp);
    // depth of field: the distance slightly soft
    canvas(2).style.filter = `blur(${(W / 2600).toFixed(2)}px)`;
    anim(performance.now());
  }
  const cx = ctx(1);
  const ax = ctx(4);
  const t0 = performance.now();
  let raf = 0;
  let last = 0;
  let running = false;
  function anim(now: number) {
    if (!XF) return;
    const t = (now - t0) / 1000;
    for (const c of [cx, ax]) {
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, c.canvas.width, c.canvas.height);
      xf(c);
    }
    clouds(cx, t);
    if (o.motion) flash(cx, t);
    details(ax, t);
    // frozen streaks in mid air would look wrong, so no falling particles without motion
    if (o.motion) precipitation(ax, t);
  }
  function loop(now: number) {
    raf = requestAnimationFrame(loop);
    if (now - last < 33 || document.hidden) return;
    last = now;
    anim(now);
  }
  function setRunning(on: boolean) {
    const want = on && o.motion;
    if (want === running) return;
    running = want;
    if (want) raf = requestAnimationFrame(loop);
    else cancelAnimationFrame(raf);
  }
  function resize() {
    layout();
    render();
  }
  let pending = 0;
  const ro = new ResizeObserver(() => {
    cancelAnimationFrame(pending);
    pending = requestAnimationFrame(resize);
  });
  ro.observe(el);
  layout();
  render();
  setRunning(true);
  return {
    setTime(d) {
      if (d.getTime() === when.getTime()) return;
      when = d;
      render();
    },
    setWeather(w) {
      weather = w;
      render();
    },
    setRunning,
    destroy() {
      setRunning(false);
      cancelAnimationFrame(pending);
      ro.disconnect();
      el.replaceChildren();
    },
  };
}
