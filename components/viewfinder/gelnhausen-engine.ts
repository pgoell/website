/* Gelnhausen from the Kinzig: layered poster illustration on canvas.
   Scene space is 1600 x 1000, bottom anchored, cropped like "cover".
   The drawing code below is ported from the design mock as is; only types were added. */

import { mix, rgba, rng, smoothstep as sm } from "@/lib/viewfinder/color";
import { type Palette, paletteAt } from "@/lib/viewfinder/palette";

type Ctx = CanvasRenderingContext2D;
type Blob3 = [number, number, number];
type Face = "L" | "M" | "S";

const at = <T>(a: ArrayLike<T>, i: number): T => a[i] as T;

const SW = 1600;
const SH = 1000;

/* ---------- materials (from the reference: red sandstone, slate, clay, plaster) ---------- */
const MAT = {
  sand: "#b0614a",
  sandP: "#c99078",
  slate: "#3a3e4b",
  clay: "#ad5230",
  clay2: "#843d27",
  clay3: "#9c6049",
  plaster: "#e6dccb",
  ochre: "#d7c29c",
  pink: "#d2b0a4",
  greyR: "#bdb8b0",
  beam: "#5b3a2a",
  stone: "#98857a",
  beech: "#52703d",
  beech2: "#6f8a46",
  spruce: "#2b4030",
  meadow: "#8d9a52",
  meadowD: "#5d6c38",
  willow: "#4b6137",
  win: "#2a2522",
};

/* ---------- light: one source, shared state while a frame is drawn ---------- */
let P: Palette = paletteAt(12);
let D = 0;
let FGK = 0;
let SUN = 1;
const INK = "#04060c";
function C(base: string, f: Face): string {
  const L = mix(base, P.light, P.litMix);
  const S = mix(base, P.shadow, P.shadeMix);
  let c = f === "L" ? L : f === "S" ? S : mix(L, S, P.front);
  if (FGK) c = mix(c, mix(P.shadow, INK, 0.45), f === "L" ? FGK * 0.4 : FGK);
  c = mix(c, INK, P.dark);
  return D ? mix(c, P.haze, Math.min(1, D * P.hazeK)) : c;
}
const side = (left: boolean): Face => (left === SUN < 0 ? "L" : "S");
// floodlit church at night
function CH(base: string, f: Face, k = 1): string {
  const c = C(base, f);
  const fl = P.flood * k;
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
function crown(
  c: Ctx,
  x: number,
  y: number,
  r: number,
  sh: string,
  li: string,
  mid?: string,
) {
  circ(c, x, y, r, sh);
  if (mid) circ(c, x + SUN * r * 0.12, y - r * 0.12, r * 0.86, mid);
  circ(c, x + SUN * r * 0.26, y - r * 0.26, r * 0.64, li);
}
function mass(c: Ctx, blobs: Blob3[], sh: string, md: string, li: string) {
  const B = blobs.slice().sort((a, b) => a[1] - b[1]);
  for (const [x, y, r] of B) circ(c, x, y, r, sh);
  for (const [x, y, r] of B) {
    c.save();
    c.beginPath();
    c.arc(x, y, r, 0, 6.3);
    c.clip();
    circ(c, x + SUN * r * 0.3, y - r * 0.42, r * 0.95, li);
    circ(c, x + SUN * r * 0.12, y - r * 0.2, r * 0.9, md);
    c.restore();
  }
  B.forEach(([x, y, r], i) => {
    if (i % 3) return;
    c.save();
    c.beginPath();
    c.arc(x, y, r, 0, 6.3);
    c.clip();
    circ(c, x - SUN * r * 0.25, y + r * 0.5, r * 0.7, sh);
    c.restore();
  });
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

/* ---------- terrain profiles ---------- */
const ridgeY = (x: number) =>
  392 +
  236 * (1 - sm(330, 1260, x)) +
  8 * Math.sin(x / 118) +
  4 * Math.sin(x / 37 + 2) -
  (10 * x) / 1600;
const slopeY = (x: number) =>
  x < 470
    ? 640 - (x - 380) * 0.7
    : 572 - (x - 470) * 0.078 + 5 * Math.sin(x / 70) + 3 * Math.sin(x / 23);
const railY = (x: number) => 786 - x * 0.004;
const riverT = (x: number) =>
  850 + 5 * Math.sin(x / 170 + 1) + (800 - x) * 0.008;
const riverB = (x: number) => riverT(x) + 13 + 5 * Math.sin(x / 110 + 0.4);
const bankY = (x: number) => 952 - 9 * Math.sin(x / 230 + 0.5) - x * 0.012;
const ROWB = [584, 626, 668, 708];
const rowB = (k: number, x: number) => at(ROWB, k) + (1130 - x) * 0.05;
const wallY = (x: number) => 724 + (1130 - x) * 0.02;

/* ---------- sky ---------- */
function sky(c: Ctx) {
  const g = c.createLinearGradient(0, -320, 0, 660);
  g.addColorStop(0, P.skyT);
  g.addColorStop(0.6, P.skyM);
  g.addColorStop(1, P.skyH);
  c.fillStyle = g;
  c.fillRect(-3000, -5000, 8000, 7000);
  const r = rng(5);
  if (P.stars > 0.01) {
    for (let i = 0; i < 260; i++) {
      const x = r() * 1800 - 100;
      const y = r() * 900 - 420;
      const s = r();
      c.fillStyle = rgba(
        "#fff8ee",
        P.stars * (0.25 + 0.75 * s) * (y < 300 ? 1 : 0.5),
      );
      c.fillRect(x, y, s < 0.93 ? 1.1 : 2, s < 0.93 ? 1.1 : 2);
    }
  }
  if (P.glowA > 0.01) {
    const R = c.createRadialGradient(P.sunX, P.sunY, 0, P.sunX, P.sunY, 760);
    R.addColorStop(0, rgba(P.sun, 0.9 * P.glowA));
    R.addColorStop(0.08, rgba(P.sun, 0.5 * P.glowA));
    R.addColorStop(0.3, rgba(P.skyH, 0.22 * P.glowA));
    R.addColorStop(1, rgba(P.skyH, 0));
    c.fillStyle = R;
    c.fillRect(-3000, -5000, 8000, 7000);
  }
  if (P.rays > 0.01) {
    c.save();
    c.globalCompositeOperation = "lighter";
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI * (0.08 + i * 0.1);
      const w = 0.022 + 0.01 * (i % 3);
      c.fillStyle = rgba(P.sun, 0.035 * P.rays);
      c.beginPath();
      c.moveTo(P.sunX, P.sunY);
      c.arc(P.sunX, P.sunY, 1400, a - w, a + w);
      c.closePath();
      c.fill();
    }
    c.restore();
  }
  // clouds: long flat poster bands, lit on the sun side
  const CL: [number, number, number, number][] = [
    [1150, 128, 300, 15],
    [1330, 172, 170, 10],
    [1480, 214, 100, 7],
    [60, 446, 230, 12],
    [330, 478, 130, 8],
    [720, 88, 150, 8],
  ];
  CL.forEach(([x, y, w, h], i) => {
    const body = mix(P.cloud, P.skyM, 0.25);
    const lit = mix(P.cloud, P.sun, P.disc * 0.7);
    const shd = mix(P.cloud, P.skyM, 0.55);
    const rr = rng(40 + i);
    const puffs: [number, number][] = [];
    for (let k = 0; k < 7; k++) {
      const t = (k + 0.5) / 7;
      const px = x + w * t;
      const ph = h * (0.7 + 1.3 * Math.sin(Math.PI * t)) * (0.7 + rr() * 0.5);
      puffs.push([px, ph]);
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
    c.fillRect(x + w * 0.08, y + h - 1.8, w * 0.84, 1.8);
  });
  if (P.disc > 0.01) {
    circ(c, P.sunX, P.sunY, 30, rgba(P.sun, 0.35 * P.disc));
    circ(c, P.sunX, P.sunY, 23, rgba(mix(P.sun, "#ffffff", 0.5), P.disc));
  }
  if (P.moon > 0.01) {
    const mx = 1420;
    const my = 150;
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

/* ---------- layer 1: Spessart line, far and pale ---------- */
function far(c: Ctx) {
  c.fillStyle = C(MAT.beech, "M");
  c.beginPath();
  c.moveTo(-300, 1100);
  for (let x = -300; x <= 1900; x += 8)
    c.lineTo(
      x,
      588 +
        14 * Math.sin(x / 210 + 1) +
        6 * Math.sin(x / 71) -
        (x > 900 ? (x - 900) * 0.05 : 0),
    );
  c.lineTo(1900, 1100);
  c.fill();
}

/* ---------- layer 2: Heiligenkopf and Rauenberg, soft wooded domes to the west ---------- */
function domes(c: Ctx) {
  const r = rng(9);
  const D3: [number, number, number, number][] = [
    [140, 498, 250, 720],
    [430, 548, 190, 720],
    [700, 590, 160, 720],
  ];
  for (const [cx, top, hw, base] of D3) {
    const g = c.createLinearGradient(cx - hw, 0, cx + hw, 0);
    const a = C(MAT.beech, SUN < 0 ? "L" : "S");
    const b = C(MAT.beech, SUN < 0 ? "S" : "L");
    g.addColorStop(0, a);
    g.addColorStop(0.5, C(MAT.beech, "M"));
    g.addColorStop(1, b);
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(cx - hw, base);
    const pts: [number, number][] = [];
    for (let i = 0; i <= 80; i++) {
      const t = (i / 80) * 2 - 1;
      const x = cx + t * hw;
      const y = base - (base - top) * Math.max(0, 1 - t * t) ** 0.62;
      pts.push([x, y]);
      c.lineTo(x, y);
    }
    c.closePath();
    c.fill();
    for (let i = 2; i < pts.length - 2; i += 2) {
      const [x, y] = at(pts, i);
      c.beginPath();
      c.arc(x, y + 2.4, 3 + r() * 2.6, 0, 6.3);
      c.fill();
    }
  }
}

/* ---------- layer 3: Büdinger Wald, long flat-topped ridge of beech with spruce ---------- */
function ridge(c: Ctx) {
  const r = rng(21);
  const body = C(mix(MAT.beech, MAT.spruce, 0.35), "M");
  const sh = C(MAT.beech, "S");
  const li = mix(C(MAT.beech2, "L"), C(MAT.beech, "M"), 0.3);
  const md = C(MAT.beech, "M");
  const sp = C(MAT.spruce, "M");
  const spS = C(MAT.spruce, "S");
  c.fillStyle = body;
  c.beginPath();
  c.moveTo(-60, 1100);
  for (let x = -60; x <= 1680; x += 6) c.lineTo(x, ridgeY(x) + 7);
  c.lineTo(1680, 1100);
  c.fill();
  // spruce groups as dark vertical bands (planted stands), under the crowns
  for (let k = 0; k < 16; k++) {
    const x = r() * 1650;
    const w = 24 + r() * 60;
    const y0 = ridgeY(x) + 10;
    c.fillStyle = spS;
    for (let j = 0; j < w / 5; j++) {
      const sx = x + j * 5 + r() * 2;
      const h = 16 + r() * 10;
      const yy = y0 + r() * 40;
      poly(c, [sx - 4, yy + h * 1.6, sx, yy, sx + 4, yy + h * 1.6], spS);
    }
  }
  // inner crowns, sorted back to front
  const inner: Blob3[] = [];
  for (let i = 0; i < 520; i++) {
    const x = r() * 1700 - 50;
    const y = ridgeY(x) + 16 + r() ** 1.6 * 170;
    if (y < 760) inner.push([x, y, 5 + r() * 7]);
  }
  for (const [x, y, rr] of inner.sort((a, b) => a[1] - b[1]))
    crown(c, x, y, rr, sh, mix(md, li, 0.35));
  // skyline crowns and spruce tips poking up
  let x = -50;
  while (x < 1680) {
    const rr = 8 + r() * 7;
    const y = ridgeY(x) + rr * 0.5;
    if (r() < 0.13) {
      const n = 2 + ((r() * 3) | 0);
      for (let k = 0; k < n; k++) {
        const sx = x + k * 6.5 + r() * 2;
        const h = 22 + r() * 16;
        const b = ridgeY(sx) + 10;
        poly(c, [sx - 5.5, b, sx, b - h, sx + 5.5, b], sp);
        poly(c, [sx, b - h, sx + SUN * 5.5, b, sx, b], spS);
      }
      x += n * 6.5 + 5;
      continue;
    }
    crown(c, x, y, rr, sh, li, md);
    x += rr * 1.15 + r() * 4;
  }
  // red sandstone quarry scars above the town
  const Q: [number, number, number, number][] = [
    [1398, 452, 58, 30],
    [1462, 440, 38, 22],
  ];
  for (const [qx, qy, w, h] of Q) {
    poly(
      c,
      [
        qx,
        qy + h,
        qx + 4,
        qy + 4,
        qx + w * 0.4,
        qy,
        qx + w * 0.8,
        qy + 3,
        qx + w,
        qy + h * 0.8,
        qx + w * 0.6,
        qy + h + 4,
      ],
      C("#c4887a", "L"),
    );
    poly(
      c,
      [
        qx + w * 0.4,
        qy,
        qx + w * 0.5,
        qy + h + 3,
        qx + w * 0.6,
        qy + h + 4,
        qx + w,
        qy + h * 0.8,
        qx + w * 0.8,
        qy + 3,
      ],
      C("#a86a60", "S"),
    );
    c.fillStyle = rgba(C("#8a5a52", "S"), 0.5);
    for (let k = 0; k < 6; k++)
      c.fillRect(qx + 6 + (k * w) / 7, qy + 5, 1.2, h - 4);
    for (let k = 0; k < 5; k++)
      crown(c, qx + (k * w) / 4, qy + h + 5 + r() * 3, 5 + r() * 3, sh, li, md);
  }
}

/* ---------- layer 4: plain to the west with Meerholz, orchards ---------- */
function plainW(c: Ctx) {
  const r = rng(31);
  c.fillStyle = C(MAT.meadow, "M");
  c.beginPath();
  c.moveTo(-60, 1100);
  for (let x = -60; x <= 640; x += 10)
    c.lineTo(x, 690 + 4 * Math.sin(x / 40) + (x > 480 ? (x - 480) * 0.3 : 0));
  c.lineTo(640, 1100);
  c.fill();
  // field strips
  for (let k = 0; k < 6; k++) {
    const y = 700 + k * 7;
    c.fillStyle = C(k % 2 ? MAT.meadowD : MAT.beech2, "M");
    c.fillRect(-60 + r() * 40, y, 160 + r() * 260, 3);
  }
  // Meerholz village: tiny roofs, one steeple
  for (let i = 0; i < 22; i++) {
    const x = 40 + r() * 300;
    const y = 688 + r() * 10;
    const w = 8 + r() * 8;
    rect(c, x, y, x + w, y + 6, C(MAT.plaster, "M"));
    poly(
      c,
      [x - 1, y, x + w / 2, y - 5 - r() * 3, x + w + 1, y],
      C(r() < 0.7 ? MAT.clay : MAT.slate, side(true)),
    );
  }
  rect(c, 196, 666, 203, 692, C(MAT.plaster, "M"));
  poly(c, [195, 667, 199.5, 648, 204, 667], C(MAT.slate, "M"));
  for (let i = 0; i < 40; i++) {
    const x = r() * 560;
    const y = 700 + r() * 34;
    crown(c, x, y, 3.5 + r() * 4, C(MAT.beech, "S"), C(MAT.beech2, "L"));
  }
}

/* ---------- layer 5: slope above the old town, old vineyard terraces, villas ---------- */
function slope(c: Ctx) {
  const r = rng(41);
  const base = mix(MAT.beech2, MAT.meadow, 0.55);
  c.fillStyle = C(base, "M");
  c.beginPath();
  c.moveTo(380, 1100);
  for (let x = 380; x <= 1680; x += 6) c.lineTo(x, slopeY(x));
  c.lineTo(1680, 1100);
  c.fill();
  // terraces: thin darker walls following the slope, vine rows as dotted lines
  for (let k = 1; k < 7; k++) {
    c.strokeStyle = C(MAT.meadowD, "S");
    c.lineWidth = 1.1;
    c.beginPath();
    let on = false;
    for (let x = 560; x <= 1660; x += 8) {
      const y = slopeY(x) + k * 12 + 2 * Math.sin(x / 90 + k);
      if (r() < 0.06) on = !on;
      if (!on) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    c.stroke();
    c.fillStyle = C(MAT.beech, "S");
    for (let x = 600 + k * 9; x < 1640; x += 6) {
      if (Math.sin(x / 53 + k * 2) > 0.2)
        c.fillRect(x, slopeY(x) + k * 12 - 3, 1.3, 2.4);
    }
  }
  // treeline along the top of the slope and clumps
  const sh = C(MAT.beech, "S");
  const li = C(MAT.beech2, "L");
  const md = C(MAT.beech2, "M");
  for (let x = 380; x < 1680; x += 7 + r() * 8) {
    if (r() < 0.25) continue;
    const rr = 5 + r() * 8;
    crown(c, x, slopeY(x) + rr * 0.3, rr, sh, li, md);
  }
  for (let i = 0; i < 60; i++) {
    const x = 520 + r() * 1150;
    const y = slopeY(x) + 14 + r() * 70;
    crown(c, x, y, 4 + r() * 7, sh, li, md);
  }
  // villas on the Panoramaweg
  for (let i = 0; i < 14; i++) {
    const x = 640 + r() * 1000;
    const y = slopeY(x) + 18 + r() * 52;
    const w = 13 + r() * 10;
    const h = 8 + r() * 4;
    rect(c, x, y - h, x + w, y, C(r() < 0.6 ? MAT.plaster : MAT.ochre, "M"));
    rect(
      c,
      x + (SUN < 0 ? 0 : w - 3),
      y - h,
      x + (SUN < 0 ? 3 : w),
      y,
      C(MAT.plaster, "L"),
    );
    const rc = r() < 0.6 ? MAT.clay : MAT.slate;
    poly(c, [x - 2, y - h, x + w / 2, y - h - 7, x + w + 2, y - h], C(rc, "M"));
    poly(
      c,
      [
        x + w / 2,
        y - h - 7,
        x + (SUN < 0 ? -2 : w + 2),
        y - h,
        x + w / 2,
        y - h,
      ],
      C(rc, "L"),
    );
    c.fillStyle = mix(C(MAT.win, "S"), "#ffc46b", P.win * 0.9);
    c.fillRect(x + 3, y - h + 3, 2.5, 3);
    if (w > 18) c.fillRect(x + w - 6, y - h + 3, 2.5, 3);
  }
}

/* ---------- church glow at night, behind the town ---------- */
function nightGlow(c: Ctx) {
  if (P.flood < 0.02) return;
  const R = c.createRadialGradient(1120, 420, 10, 1120, 420, 360);
  R.addColorStop(0, rgba("#ff9d55", 0.3 * P.flood));
  R.addColorStop(1, rgba("#ff9d55", 0));
  c.fillStyle = R;
  c.fillRect(600, 0, 1100, 900);
}

/* ---------- valley floor: meadows, railway, alders, the Kinzig, a heron ---------- */
function valley(c: Ctx) {
  const r = rng(51);
  const g = c.createLinearGradient(0, 738, 0, 960);
  g.addColorStop(0, C(mix(MAT.meadow, MAT.beech2, 0.3), "M"));
  g.addColorStop(1, C(MAT.meadowD, "M"));
  c.fillStyle = g;
  c.fillRect(-100, 736, 1900, 400);
  // meadow patches (flat colour fields)
  for (let i = 0; i < 14; i++) {
    const x = r() * 1700 - 80;
    const y = 744 + r() * 26;
    const w = 90 + r() * 260;
    poly(
      c,
      [x, y, x + w, y - 2, x + w + 14, y + 5, x + 8, y + 7],
      C(r() < 0.5 ? MAT.meadow : mix(MAT.meadow, "#c4b25c", 0.35), "L"),
    );
  }
  // Kinzigtalbahn on its embankment
  c.fillStyle = C(mix(MAT.meadowD, MAT.stone, 0.45), "M");
  c.beginPath();
  c.moveTo(-100, railY(-100) + 1);
  for (let x = -100; x <= 1800; x += 50) c.lineTo(x, railY(x) + 1);
  for (let x = 1800; x >= -100; x -= 50) c.lineTo(x, railY(x) + 13);
  c.fill();
  c.fillStyle = C(mix(MAT.meadowD, MAT.stone, 0.45), "S");
  c.beginPath();
  for (let x = -100; x <= 1800; x += 50) c.lineTo(x, railY(x) + 8);
  for (let x = 1800; x >= -100; x -= 50) c.lineTo(x, railY(x) + 13);
  c.fill();
  line(c, -100, railY(-100), 1800, railY(1800), C("#8a8278", "L"), 1.8);
  line(
    c,
    -100,
    railY(-100) - 0.4,
    1800,
    railY(1800) - 0.4,
    C("#3a3632", "S"),
    0.8,
  );
  c.strokeStyle = C("#3a3632", "M");
  c.lineWidth = 1.1;
  c.beginPath();
  for (let x = -40; x < 1760; x += 74) {
    const y = railY(x);
    c.moveTo(x, y);
    c.lineTo(x, y - 20);
    c.moveTo(x, y - 18);
    c.lineTo(x + 7, y - 18);
  }
  c.stroke();
  c.lineWidth = 0.6;
  c.beginPath();
  for (let x = -40; x < 1760; x += 74) {
    c.moveTo(x + 7, railY(x) - 17);
    c.quadraticCurveTo(x + 40, railY(x + 37) - 15, x + 81, railY(x + 74) - 17);
  }
  c.stroke();
  // alders along the far bank
  const sh = C(MAT.willow, "S");
  const li = C(MAT.beech2, "L");
  const md = C(MAT.willow, "M");
  const al: Blob3[] = [];
  for (let i = 0; i < 22; i++) {
    const x = r() * 1700 - 60;
    if (x > 880 && x < 1060) continue;
    const n = 3 + ((r() * 6) | 0);
    const hh = 18 + r() * 26;
    for (let j = 0; j < n; j++) {
      const dx = (r() - 0.5) * n * 9;
      al.push([x + dx, riverT(x + dx) - 2 - r() ** 0.7 * hh, 5 + r() * 9]);
    }
  }
  for (const [x, y, rr] of al.sort((a, b) => a[1] - b[1]))
    crown(c, x, y, rr, sh, li, md);
  // the Kinzig: a ribbon that reflects the sky
  const rg = c.createLinearGradient(0, 842, 0, 878);
  rg.addColorStop(0, mix(P.skyH, P.skyM, 0.15));
  rg.addColorStop(1, mix(P.skyM, P.skyT, 0.45));
  c.fillStyle = rg;
  c.beginPath();
  for (let x = -100; x <= 1800; x += 10) c.lineTo(x, riverT(x));
  for (let x = 1800; x >= -100; x -= 10) c.lineTo(x, riverB(x));
  c.fill();
  // tree reflections along the far edge
  c.fillStyle = rgba(C(MAT.willow, "S"), 0.5);
  for (const [x, y, rr] of al) {
    if (y > riverT(x) - 14)
      c.fillRect(x - rr * 0.8, riverT(x), rr * 1.6, Math.min(6, rr * 0.5));
  }
  c.fillStyle = rgba(mix(P.skyH, "#ffffff", 0.4), 0.55);
  for (let i = 0; i < 40; i++) {
    const x = r() * 1700;
    const y = riverT(x) + 4 + r() * (riverB(x) - riverT(x) - 6);
    c.fillRect(x, y, 8 + r() * 26, 0.9);
  }
  // near meadow
  c.fillStyle = C(MAT.meadowD, "M");
  c.beginPath();
  for (let x = -100; x <= 1800; x += 10) c.lineTo(x, riverB(x) - 1);
  c.lineTo(1800, 1100);
  c.lineTo(-100, 1100);
  c.fill();
  c.fillStyle = C(MAT.meadow, "L");
  for (let x = -100; x < 1800; x += 3) {
    if (Math.sin(x * 0.7) + Math.sin(x * 0.13) > 0.9)
      c.fillRect(x, riverB(x) - 1, 1.2, -3 - r() * 3);
  }
  // mown stripes in the near meadow
  c.fillStyle = rgba(C(MAT.meadow, "L"), 0.35);
  for (let k = 0; k < 7; k++) {
    const y = riverB(600) + 10 + k * 11;
    c.beginPath();
    c.moveTo(460, y);
    c.lineTo(1420, y - 8);
    c.lineTo(1420, y - 4);
    c.lineTo(460, y + 4);
    c.fill();
  }
  // footpath from the ruin to a small wooden footbridge over the Kinzig
  const pth = C(mix(MAT.meadow, "#d8c89a", 0.6), "L");
  c.fillStyle = pth;
  c.beginPath();
  c.moveTo(430, 1000);
  c.bezierCurveTo(560, 930, 640, 900, 716, riverB(716) + 1);
  c.lineTo(728, riverB(728) + 1);
  c.bezierCurveTo(660, 905, 600, 940, 480, 1000);
  c.fill();
  c.beginPath();
  c.moveTo(740, riverT(740) - 1);
  c.bezierCurveTo(790, 820, 860, 800, 900, railY(900) + 12);
  c.lineTo(906, railY(906) + 12);
  c.bezierCurveTo(870, 806, 800, 822, 748, riverT(748) - 1);
  c.fill();
  const wd = C("#6a4a34", "M");
  const wdL = C("#8a6a4a", "L");
  rect(c, 708, riverT(716) - 4, 752, riverT(716) - 1.5, wdL);
  rect(c, 708, riverT(716) - 1.5, 752, riverT(716), wd);
  for (const x of [712, 730, 748])
    line(c, x, riverT(716) - 1, x, riverB(716) + 2, wd, 1.4);
  line(c, 708, riverT(716) - 9, 752, riverT(716) - 9, wd, 1);
  for (const x of [708, 730, 752])
    line(c, x, riverT(716) - 9, x, riverT(716) - 4, wd, 1);
  heron(c, 968, riverB(968) - 4);
}
function heron(c: Ctx, x: number, y: number) {
  c.save();
  c.translate(x, y);
  c.scale(1.5, 1.5);
  c.translate(-x, -y);
  const g = C("#8e979e", "M");
  const gl = C("#b9c0c4", "L");
  const dk = C("#2e3136", "S");
  const bk = C("#d8b04a", "M");
  c.lineCap = "round";
  line(c, x - 1, y, x - 2, y - 8, dk, 0.9);
  line(c, x + 2, y, x + 2, y - 8, dk, 0.9);
  c.fillStyle = g;
  c.beginPath();
  c.ellipse(x, y - 11, 7.5, 3.6, -0.35, 0, 6.3);
  c.fill();
  c.fillStyle = gl;
  c.beginPath();
  c.ellipse(x + 1, y - 12, 5, 2.2, -0.35, 0, 6.3);
  c.fill();
  c.strokeStyle = gl;
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(x + 5, y - 13);
  c.quadraticCurveTo(x + 4, y - 19, x + 7, y - 21);
  c.quadraticCurveTo(x + 10, y - 23, x + 8, y - 25);
  c.stroke();
  circ(c, x + 8.5, y - 25.5, 1.8, gl);
  line(c, x + 10, y - 25.5, x + 15, y - 24.5, bk, 1);
  line(c, x + 8, y - 26.5, x + 4, y - 27, dk, 0.7);
  line(c, x - 6, y - 9, x - 9, y - 7, dk, 1.3);
  c.lineCap = "butt";
  c.restore();
}

/* ---------- town: generated once, drawn per palette ---------- */
interface House {
  x: number;
  w: number;
  base: number;
  wall: number;
  typ: "g" | "h" | "e";
  rh: number;
  rc: string;
  wc: string;
  tim: boolean;
  chim: boolean;
  dorm: boolean;
  s: number;
  row: number;
  smoke?: boolean;
}
interface Town {
  rows: House[][];
  gar: [number, number, number, number][];
  smoke: [number, number] | null;
}
let TOWN: Town | null = null;
function genTown(): Town {
  const r = rng(77);
  const rows: House[][] = [];
  const RX: [number, number][] = [
    [540, 1600],
    [490, 1610],
    [462, 1615],
    [446, 1600],
  ];
  const WALLS = [
    MAT.plaster,
    MAT.plaster,
    MAT.ochre,
    MAT.ochre,
    MAT.pink,
    MAT.greyR,
    MAT.greyR,
    "#d8cdb8",
  ];
  for (let k = 0; k < 4; k++) {
    const hs: House[] = [];
    const [x0, x1] = at(RX, k);
    let x = x0 + r() * 12;
    while (x < x1) {
      const w = 40 + r() * 38;
      const cx = x + w / 2;
      if (k === 0 && ((cx > 960 && cx < 1250) || (cx > 712 && cx < 842))) {
        x += w * 0.7;
        continue;
      }
      if (k === 1 && cx > 985 && cx < 1250 && r() < 0.6) {
        x += w * 0.6;
        continue;
      }
      if (k >= 2 && cx > 1300 && cx < 1405) {
        x += w * 0.8;
        continue;
      }
      const wall = 30 + r() * 20 + (k >= 2 ? 6 : 0);
      const typ = r() < 0.34 ? "g" : r() < 0.25 ? "h" : "e";
      const rc =
        r() < 0.5
          ? MAT.clay
          : r() < 0.5
            ? MAT.clay2
            : r() < 0.55
              ? MAT.slate
              : MAT.clay3;
      const wc = at(WALLS, (r() * WALLS.length) | 0);
      hs.push({
        x,
        w,
        base: rowB(k, cx) + r() * 6,
        wall,
        typ,
        rh: typ === "g" ? w * (0.6 + r() * 0.28) : 22 + r() * 16,
        rc,
        wc,
        tim: wc === MAT.plaster && r() < 0.75,
        chim: r() < 0.4,
        dorm: r() < 0.35,
        s: (r() * 1e6) | 0,
        row: k,
      });
      x += w * (0.74 + r() * 0.22) + (r() < 0.12 ? 18 : 0);
    }
    hs.sort((a, b) => a.base - b.base);
    rows.push(hs);
  }
  // chimney for the smoke: a row-2 house near x 800
  let best: House | null = null;
  for (const h of at(rows, 2))
    if (!best || Math.abs(h.x - 800) < Math.abs(best.x - 800)) best = h;
  if (best) {
    best.chim = true;
    best.smoke = true;
  }
  const gar: [number, number, number, number][] = [];
  for (let i = 0; i < 34; i++) {
    const k = 1 + ((r() * 3) | 0);
    const x = 470 + r() * 1140;
    if (x > 975 && x < 1255 && k < 2) continue;
    const n = 2 + ((r() * 3) | 0);
    const bx = x;
    const by = rowB(k, x) - 14 - r() * 12;
    for (let j = 0; j < n; j++)
      gar.push([bx + (r() - 0.5) * 22, by + (r() - 0.5) * 10, 8 + r() * 9, k]);
  }
  return { rows, gar, smoke: null };
}
function house(c: Ctx, h: House, town: Town) {
  const r = rng(h.s);
  const { x, w, base, wall } = h;
  const top = base - wall;
  const cx = x + w / 2;
  const wM = C(h.wc, "M");
  rect(c, x, top, x + w, base + 22, wM);
  const beam = C(MAT.beam, "M");
  const win = C(MAT.win, "S");
  const lit = mix(win, "#ffc66e", P.win);
  // windows
  const nr = Math.max(1, Math.floor(wall / 15));
  const nc = Math.max(2, Math.floor(w / 15));
  for (let i = 0; i < nr; i++)
    for (let j = 0; j < nc; j++) {
      const wx = x + ((j + 0.5) * w) / nc - 2.5;
      const wy = top + 6 + i * 15;
      c.fillStyle = r() < 0.42 ? lit : win;
      c.fillRect(wx, wy, 5, 6.5);
    }
  if (h.tim) {
    c.strokeStyle = beam;
    c.lineWidth = 1.3;
    c.beginPath();
    for (let i = 0; i <= nr; i++) {
      const y = top + 1.5 + i * 15;
      c.moveTo(x, y);
      c.lineTo(x + w, y);
    }
    const cols = nc;
    for (let j = 0; j <= cols; j++) {
      const X = x + 1 + (j * (w - 2)) / cols;
      c.moveTo(X, top);
      c.lineTo(X, top + wall);
    }
    for (let j = 0; j < cols; j += 2) {
      const X = x + 1 + (j * (w - 2)) / cols;
      const X2 = x + 1 + ((j + 1) * (w - 2)) / cols;
      c.moveTo(X, top + wall);
      c.lineTo(X2, top + wall - 12);
    }
    c.stroke();
  }
  // eave shadow
  rect(c, x, top, x + w, top + 2.5, rgba(C(h.wc, "S"), 0.9));
  const rL = C(h.rc, side(true));
  const rR = C(h.rc, side(false));
  const rM = C(h.rc, "M");
  if (h.typ === "g") {
    const ap = top - h.rh;
    poly(c, [x - 3, top + 1.5, cx, ap - 3.5, cx, top + 1.5], rL);
    poly(c, [cx, ap - 3.5, x + w + 3, top + 1.5, cx, top + 1.5], rR);
    poly(c, [x + 1.2, top, cx, ap + 1.2, x + w - 1.2, top], wM);
    if (h.tim) {
      c.strokeStyle = beam;
      c.lineWidth = 1.3;
      c.beginPath();
      const y1 = top - h.rh * 0.45;
      const hw = (w / 2 - 1.2) * 0.45;
      c.moveTo(cx - (w / 2 - 1.2) + hw, y1);
      c.lineTo(cx + (w / 2 - 1.2) - hw, y1);
      c.moveTo(cx, ap + 2);
      c.lineTo(cx, top);
      c.moveTo(x + 1, top);
      c.lineTo(cx - (w / 2 - 1.2) + hw, y1);
      c.moveTo(x + w - 1, top);
      c.lineTo(cx + (w / 2 - 1.2) - hw, y1);
      c.stroke();
    }
    c.fillStyle = r() < 0.5 ? lit : win;
    c.fillRect(cx - 2, top - h.rh * 0.35, 4, 5);
    if (h.chim)
      rect(
        c,
        cx + w * 0.18,
        ap + h.rh * 0.3 - 9,
        cx + w * 0.18 + 4,
        ap + h.rh * 0.3 + 2,
        C("#6d4a3a", "M"),
      );
  } else {
    const rt = top - h.rh;
    const ins = h.typ === "h" ? w * 0.28 : 4;
    poly(
      c,
      [x - 3, top + 1.5, x + ins, rt, x + w - ins, rt, x + w + 3, top + 1.5],
      rM,
    );
    if (h.typ === "h") {
      poly(c, [x - 3, top + 1.5, x + ins, rt, x + ins, top + 1.5], rL);
      poly(
        c,
        [x + w - ins, rt, x + w + 3, top + 1.5, x + w - ins, top + 1.5],
        rR,
      );
    }
    line(c, x + ins, rt + 0.6, x + w - ins, rt + 0.6, C(h.rc, "L"), 1.1);
    // tile courses
    c.strokeStyle = rgba(C(h.rc, "S"), 0.5);
    c.lineWidth = 0.7;
    c.beginPath();
    for (let y = rt + 5; y < top; y += 4.5) {
      c.moveTo(x, y);
      c.lineTo(x + w, y);
    }
    c.stroke();
    if (h.dorm) {
      const dx = x + w * (0.3 + r() * 0.3);
      rect(c, dx, rt + h.rh * 0.35, dx + 7, rt + h.rh * 0.8, C(h.wc, "M"));
      poly(
        c,
        [
          dx - 1.5,
          rt + h.rh * 0.38,
          dx + 3.5,
          rt + h.rh * 0.12,
          dx + 8.5,
          rt + h.rh * 0.38,
        ],
        C(h.rc, side(true)),
      );
      c.fillStyle = r() < 0.5 ? lit : win;
      c.fillRect(dx + 2, rt + h.rh * 0.5, 3, 3.5);
    }
    if (h.chim)
      rect(c, x + w * 0.7, rt - 8, x + w * 0.7 + 4, rt + 3, C("#6d4a3a", "M"));
    if (h.smoke) town.smoke = [x + w * 0.7 + 2, rt - 8];
  }
}
function garden(c: Ctx, town: Town, k: number) {
  const sh = C(MAT.beech, "S");
  const li = C(MAT.beech2, "L");
  const md = C(MAT.beech2, "M");
  for (const [x, y, rr, kk] of town.gar)
    if (kk === k + 1) crown(c, x, y, rr, sh, li, md);
}
function lime(c: Ctx, x: number, b: number) {
  const r = rng(8);
  const cr: Blob3[] = [];
  for (let i = 0; i < 10; i++) {
    const a = r() * 6.3;
    const d = Math.sqrt(r());
    cr.push([
      x + Math.cos(a) * d * 26,
      b - 70 + Math.sin(a) * d * 30,
      14 + r() * 8,
    ]);
  }
  mass(c, cr, C(MAT.beech, "S"), C(MAT.beech, "M"), C(MAT.beech2, "L"));
}

function peterskirche(c: Ctx) {
  const b = rowB(0, 780) + 6;
  const x0 = 730;
  const x1 = 838;
  const eave = b - 62;
  const ridgeT = b - 86;
  const wM = CH("#ece6da", "M", 0.4);
  const wL = CH("#ece6da", side(true), 0.4);
  const sl = C(MAT.slate, "M");
  rect(c, x0, eave, x1, b + 20, wM);
  poly(
    c,
    [x0 - 3, eave + 1, x0 + 10, ridgeT, x1 - 10, ridgeT, x1 + 3, eave + 1],
    sl,
  );
  line(c, x0 + 10, ridgeT + 0.5, x1 - 10, ridgeT + 0.5, C(MAT.slate, "L"), 1.2);
  for (let i = 0; i < 4; i++)
    arch(c, x0 + 18 + i * 22, eave + 14, 6, 16, C(MAT.win, "S"));
  // two short square towers with small pyramid caps, like rooks
  const T2: [number, number][] = [
    [744, 764],
    [778, 798],
  ];
  for (const [a, z] of T2) {
    const top = b - 104;
    rect(c, a, top, z, eave + 2, wM);
    rect(c, SUN < 0 ? a : z - 5, top, SUN < 0 ? a + 5 : z, eave + 2, wL);
    arch(c, a + 7, top + 10, 4, 9, C(MAT.win, "S"));
    arch(c, a + 13, top + 10, 4, 9, C(MAT.win, "S"));
    poly(c, [a - 2, top + 1, (a + z) / 2, top - 20, z + 2, top + 1], sl);
    poly(
      c,
      [
        (a + z) / 2,
        top - 20,
        SUN < 0 ? a - 2 : z + 2,
        top + 1,
        (a + z) / 2,
        top + 1,
      ],
      C(MAT.slate, "L"),
    );
  }
}

/* ---------- the Marienkirche ---------- */
function marienkirche(c: Ctx) {
  const G = 590;
  const sand = MAT.sand;
  const sandP = MAT.sandP;
  const sl = MAT.slate;
  const win = CH(MAT.win, "S", 0.3);
  const cross = (x: number, y: number, h: number) => {
    line(c, x, y, x, y - h, CH(sl, "M"), 1.6);
    line(c, x - 3.2, y - h * 0.62, x + 3.2, y - h * 0.62, CH(sl, "M"), 1.4);
    circ(c, x, y - 1, 1.9, CH("#b8923e", "L"));
  };
  // octagonal spire as three facets meeting at the tip
  const spire = (cx: number, base: number, tip: number, hw: number) => {
    const a = cx - hw;
    const b = cx - hw * 0.4;
    const d = cx + hw * 0.4;
    const e = cx + hw;
    poly(c, [a, base, cx, tip, b, base], CH(sl, side(true)));
    poly(c, [b, base, cx, tip, d, base], CH(sl, "M"));
    poly(c, [d, base, cx, tip, e, base], CH(sl, side(false)));
    line(c, cx, tip, SUN < 0 ? b : d, base, rgba(CH("#8a93a8", "L"), 0.55), 1);
  };
  const octo = (
    x0: number,
    x1: number,
    y0: number,
    y1: number,
    base: string,
  ) => {
    const w = x1 - x0;
    const a = x0 + w * 0.26;
    const b = x1 - w * 0.26;
    rect(c, x0, y0, a, y1, CH(base, side(true)));
    rect(c, a, y0, b, y1, CH(base, "M"));
    rect(c, b, y0, x1, y1, CH(base, side(false)));
  };
  const gables = (x0: number, x1: number, y: number, n: number, h: number) => {
    const w = (x1 - x0) / n;
    for (let i = 0; i < n; i++) {
      const a = x0 + i * w;
      poly(
        c,
        [a, y, a + w / 2, y - h, a + w, y],
        CH(sand, i < n / 2 ? side(true) : side(false)),
      );
      poly(
        c,
        [a + w * 0.5, y - h, a + w, y, a + w * 0.5, y],
        CH(sand, side(false)),
      );
    }
  };

  // choir and apse (east end), behind the east towers
  rect(c, 1206, 466, 1262, G, CH(sand, "M"));
  rect(
    c,
    SUN < 0 ? 1206 : 1250,
    466,
    SUN < 0 ? 1216 : 1262,
    G,
    CH(sand, side(SUN < 0)),
  );
  poly(c, [1202, 470, 1234, 430, 1266, 470], CH(sl, "M"));
  poly(c, [1234, 430, SUN < 0 ? 1202 : 1266, 470, 1234, 470], CH(sl, "L"));
  for (let i = 0; i < 3; i++) arch(c, 1214 + i * 15, 488, 5, 26, win);
  // north-east tower: slender octagon, needle spire (behind)
  octo(1208, 1228, 430, G, sand);
  gables(1206, 1230, 430, 2, 9);
  spire(1218, 426, 250, 11);
  cross(1218, 250, 12);
  for (let i = 0; i < 2; i++) arch(c, 1211 + i * 9, 446, 4, 11, win);
  // choir bay between crossing and towers
  rect(c, 1164, 468, 1210, G, CH(sand, "M"));
  poly(c, [1160, 470, 1166, 452, 1208, 452, 1212, 470], CH(sl, "M"));
  // crossing tower: stone octagon ringed by small gables, fat steep slate spire (tallest point)
  octo(1086, 1146, 398, G, sand);
  gables(1084, 1148, 400, 4, 13);
  for (let i = 0; i < 2; i++) arch(c, 1102 + i * 16, 408, 6, 16, win);
  spire(1116, 392, 212, 26);
  cross(1116, 212, 17);
  // nave: long dark roof between west tower and transept
  rect(c, 1040, 500, 1092, G, CH(sand, "M"));
  poly(c, [1036, 504, 1044, 452, 1094, 452, 1094, 504], CH(sl, "M"));
  line(c, 1044, 452.5, 1094, 452.5, CH("#6d7486", "L"), 1.2);
  for (let i = 0; i < 3; i++) {
    const dx = 1050 + i * 14;
    poly(c, [dx, 480, dx + 4, 470, dx + 8, 480], CH(sl, side(true)));
    c.fillStyle = win;
    c.fillRect(dx + 3, 474, 2, 4);
  }
  for (let i = 0; i < 3; i++) arch(c, 1048 + i * 14, 518, 5, 22, win);
  // south transept gable with rose window, in front of the crossing tower
  rect(c, 1090, 470, 1142, G, CH(sand, "M"));
  poly(c, [1086, 472, 1116, 430, 1146, 472], CH(sl, side(false)));
  poly(c, [1090, 472, 1116, 436, 1142, 472], CH(sand, "M"));
  poly(c, [1116, 436, 1142, 472, 1134, 472], CH(sand, side(false)));
  circ(c, 1116, 480, 9, CH(sand, "S"));
  circ(c, 1116, 480, 7, win);
  for (let a = 0; a < 8; a++) {
    const t = (a * Math.PI) / 4;
    line(
      c,
      1116,
      480,
      1116 + Math.cos(t) * 7,
      480 + Math.sin(t) * 7,
      CH(sand, "M"),
      0.9,
    );
  }
  for (let i = 0; i < 2; i++) arch(c, 1105 + i * 16, 498, 6, 24, win);
  line(c, 1090, 470, 1142, 470, CH(sand, "L"), 1.2);
  // south-east tower in front
  octo(1162, 1184, 428, G, sand);
  gables(1160, 1186, 428, 2, 9);
  spire(1173, 424, 236, 12);
  cross(1173, 236, 12);
  for (let i = 0; i < 2; i++) arch(c, 1165 + i * 9, 442, 4, 11, win);
  for (let k = 0; k < 4; k++) arch(c, 1164 + k * 5, 470, 3, 7, win);
  // west tower: broad square box of paler stone, Rhenish rhomb roof, lantern and spike
  const x0 = 986;
  const x1 = 1050;
  const cxw = 1018;
  const yTop = 406;
  const yA = 372;
  const yT = 348;
  rect(c, x0, yTop, x1, G, CH(sandP, "M"));
  rect(c, x0 - 8, yTop + 2, x0, G, CH(sandP, side(true)));
  for (const y of [452, 498, 544])
    rect(c, x0 - 8, y, x1, y + 2.4, CH(sandP, "S"));
  const WIN: [number, number, number, number][] = [
    [414, 2, 7, 17],
    [462, 2, 6, 16],
    [508, 2, 6, 15],
    [552, 1, 8, 14],
  ];
  for (const [y, n, w, h] of WIN) {
    for (let k = 0; k < n; k++)
      arch(c, n === 1 ? cxw - w / 2 : cxw - 11 + k * 16, y, w, h, win);
  }
  // rhomb roof: two diamond faces, stone front gable with the clock
  poly(c, [x0, yTop, cxw, yA, cxw, yT, x0, yA], CH(sl, side(true)));
  poly(c, [x1, yTop, cxw, yA, cxw, yT, x1, yA], CH(sl, side(false)));
  poly(
    c,
    [x0 - 8, yTop + 2, x0, yTop, x0, yA, x0 - 8, yA + 6],
    CH(sandP, side(true)),
  );
  poly(c, [x0, yTop + 0.5, cxw, yA, x1, yTop + 0.5], CH(sandP, "M"));
  poly(
    c,
    [cxw, yA, x1, yTop + 0.5, x1 - 6, yTop + 0.5],
    CH(sandP, side(false)),
  );
  circ(c, cxw, 394, 6, CH("#efe3c4", "L"));
  line(c, cxw, 394, cxw, 390, CH(sl, "S"), 1);
  line(c, cxw, 394, cxw + 3, 395, CH(sl, "S"), 1);
  // lantern and spike
  rect(c, cxw - 5, yT - 12, cxw + 5, yT + 2, CH(sl, "M"));
  rect(c, cxw - 5, yT - 12, cxw - 1, yT + 2, CH(sl, side(true)));
  poly(c, [cxw - 6, yT - 11, cxw, yT - 34, cxw + 6, yT - 11], CH(sl, "M"));
  poly(
    c,
    [cxw, yT - 34, SUN < 0 ? cxw - 6 : cxw + 6, yT - 11, cxw, yT - 11],
    CH("#5a6070", "L"),
  );
  cross(cxw, yT - 34, 11);
  // string course and plinth shadow
  line(c, x0 - 8, G - 40, x1, G - 40, CH(sandP, "S"), 2);
}

function hexenturm(c: Ctx) {
  const cx = 1352;
  const st = mix(MAT.stone, "#6f6358", 0.35);
  const r = rng(3);
  const cyl = (w: number, y0: number, y1: number, base: string) => {
    const x0 = cx - w / 2;
    const a = x0 + w * 0.34;
    const b = x0 + w * 0.7;
    rect(c, x0, y0, a, y1, CH(base, side(true), 0.7));
    rect(c, a, y0, b, y1, CH(base, "M", 0.7));
    rect(c, b, y0, x0 + w, y1, CH(base, side(false), 0.7));
  };
  cyl(70, 622, 760, st);
  // rough stone courses
  c.fillStyle = rgba(CH(st, "S", 0.7), 0.45);
  for (let i = 0; i < 70; i++) {
    const y = 630 + r() * 120;
    const x = cx - 33 + r() * 60;
    c.fillRect(x, y, 4 + r() * 7, 1.5);
  }
  // corbel ring (machicolation)
  cyl(78, 604, 626, st);
  for (let x = cx - 37; x < cx + 35; x += 8) {
    c.fillStyle = CH(st, "S", 0.7);
    c.beginPath();
    c.moveTo(x, 626);
    c.lineTo(x, 619);
    c.arc(x + 3.5, 619, 3.5, Math.PI, 0);
    c.lineTo(x + 7, 626);
    c.fill();
  }
  line(c, cx - 39, 604, cx + 39, 604, CH(st, "L", 0.7), 1.4);
  // upper drum and narrow stone cone
  cyl(72, 590, 605, st);
  const tip = 500;
  const hw = 21;
  poly(c, [cx - hw, 592, cx, tip, cx - hw * 0.3, 592], CH(st, side(true), 0.7));
  poly(c, [cx - hw * 0.3, 592, cx, tip, cx + hw * 0.4, 592], CH(st, "M", 0.7));
  poly(
    c,
    [cx + hw * 0.4, 592, cx, tip, cx + hw, 592],
    CH(st, side(false), 0.7),
  );
  line(c, cx, tip, cx, tip - 7, CH(MAT.slate, "M"), 1.3);
  const win = C(MAT.win, "S");
  const lit = mix(win, "#ffc66e", P.win);
  c.fillStyle = win;
  c.fillRect(cx - 12, 648, 4, 10);
  c.fillRect(cx + 8, 690, 4, 9);
  c.fillStyle = lit;
  c.fillRect(cx - 4, 598, 4, 6);
}

function townWall(c: Ctx) {
  const st = mix(MAT.stone, "#a07868", 0.2);
  c.fillStyle = C(st, "M");
  c.beginPath();
  c.moveTo(430, wallY(430));
  for (let x = 430; x <= 1640; x += 20) c.lineTo(x, wallY(x));
  c.lineTo(1640, 760);
  c.lineTo(430, 760);
  c.fill();
  line(c, 430, wallY(430) + 1, 1640, wallY(1640) + 1, C(st, "L"), 1.6);
  c.fillStyle = rgba(C(st, "S"), 0.6);
  for (let x = 440; x < 1640; x += 58) c.fillRect(x, wallY(x) + 3, 5, 28);
  // gate tower
  const gx = 640;
  const gy = wallY(gx);
  rect(c, gx, gy - 78, gx + 34, gy + 30, C(st, "M"));
  rect(
    c,
    SUN < 0 ? gx : gx + 28,
    gy - 78,
    SUN < 0 ? gx + 6 : gx + 34,
    gy + 30,
    C(st, side(SUN < 0)),
  );
  poly(
    c,
    [gx - 3, gy - 77, gx + 17, gy - 108, gx + 37, gy - 77],
    C(MAT.slate, "M"),
  );
  poly(
    c,
    [gx + 17, gy - 108, SUN < 0 ? gx - 3 : gx + 37, gy - 77, gx + 17, gy - 77],
    C(MAT.slate, "L"),
  );
  arch(c, gx + 10, gy + 6, 14, 24, C(MAT.win, "S"));
  c.fillStyle = mix(C(MAT.win, "S"), "#ffc66e", P.win);
  c.fillRect(gx + 15, gy - 60, 4, 6);
  // street lamps at night
  if (P.win > 0.05) {
    for (let x = 470; x < 1620; x += 64) {
      const y = wallY(x) - 4;
      const R = c.createRadialGradient(x, y, 0, x, y, 12);
      R.addColorStop(0, rgba("#ffd28a", 0.7 * P.win));
      R.addColorStop(1, rgba("#ffd28a", 0));
      c.fillStyle = R;
      c.fillRect(x - 12, y - 12, 24, 24);
    }
  }
}

function getTown(): Town {
  if (!TOWN) TOWN = genTown();
  return TOWN;
}
function town(c: Ctx) {
  const t = getTown();
  for (const h of at(t.rows, 0)) house(c, h, t);
  peterskirche(c);
  garden(c, t, 0);
}
function townFront(c: Ctx) {
  const t = getTown();
  for (let k = 1; k < 4; k++) {
    garden(c, t, k);
    for (const h of at(t.rows, k)) house(c, h, t);
  }
  lime(c, 952, rowB(1, 952) - 4);
  const r = rng(17);
  const sh = C(MAT.beech, "S");
  const md = C(MAT.beech, "M");
  const li = C(MAT.beech2, "L");
  const bh: Blob3[] = [];
  for (let i = 0; i < 16; i++)
    bh.push([1300 + r() * 110, 600 + r() * 90, 14 + r() * 14]);
  mass(c, bh, C(MAT.spruce, "S"), C(MAT.spruce, "M"), C(MAT.beech, "M"));
  hexenturm(c);
  townWall(c);
  // gardens and trees between the wall and the railway
  const G: [number, number][] = [
    [470, 3],
    [560, 4],
    [760, 2],
    [900, 5],
    [1050, 3],
    [1180, 2],
    [1250, 4],
    [1470, 3],
    [1560, 5],
  ];
  for (const [x0, n] of G) {
    const b: Blob3[] = [];
    for (let i = 0; i < n * 3; i++)
      b.push([x0 + r() * n * 22, 748 + r() * 14 - r() ** 2 * 28, 9 + r() * 12]);
    mass(c, b, sh, md, li);
  }
  c.fillStyle = C(MAT.meadowD, "S");
  for (let x = 440; x < 1620; x += 3) {
    const h = 2 + Math.abs(Math.sin(x * 0.21) * 4);
    c.fillRect(x, 766 - h, 3, h + 6);
  }
}

function mist(c: Ctx) {
  if (P.mist < 0.02) return;
  const col = mix(P.haze, "#ffffff", 0.25);
  const M: [number, number, number][] = [
    [748, 806, 0.8],
    [814, 850, 0.55],
    [690, 740, 0.35],
  ];
  for (const [y0, y1, a] of M) {
    const g = c.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, rgba(col, 0));
    g.addColorStop(0.5, rgba(col, a * P.mist * 0.75));
    g.addColorStop(1, rgba(col, 0));
    c.fillStyle = g;
    c.fillRect(-100, y0, 1900, y1 - y0);
  }
}

/* ---------- foreground: Palas arcade, alders, reeds, a photographer ---------- */
function fore(c: Ctx) {
  const r = rng(61);
  // bank
  const bk = C(MAT.meadowD, "S");
  c.fillStyle = bk;
  c.beginPath();
  c.moveTo(-100, 1200);
  for (let x = -100; x <= 1800; x += 10) c.lineTo(x, bankY(x));
  c.lineTo(1800, 1200);
  c.fill();
  c.fillStyle = C(MAT.meadowD, "M");
  for (let x = -100; x < 1800; x += 4) {
    const h = 3 + r() * 9;
    poly(
      c,
      [x, bankY(x) + 2, x + 1.5 + r() * 2, bankY(x) - h, x + 3, bankY(x) + 2],
      C(MAT.meadowD, r() < 0.3 ? "L" : "M"),
    );
  }
  for (let i = 0; i < 120; i++) {
    const x = r() * 1700 - 50;
    const y = bankY(x) + 4 + r() * 40;
    circ(c, x, y, 1.1, rgba(C(r() < 0.5 ? "#f2ede0" : "#e8c860", "L"), 0.8));
  }
  c.strokeStyle = C(MAT.meadowD, "S");
  c.lineWidth = 1.4;
  for (let i = 0; i < 160; i++) {
    const x = r() * 1700 - 50;
    const b = 1010;
    const h = 30 + r() * 70;
    c.beginPath();
    c.moveTo(x, b);
    c.quadraticCurveTo(x + 4, b - h * 0.6, x + (r() - 0.5) * 24, b - h);
    c.stroke();
  }
  // reeds with a few bulrush heads
  const rc = C(mix(MAT.meadowD, "#7a7440", 0.5), "S");
  const rl = C(mix(MAT.meadow, "#b0a060", 0.4), "L");
  const clumps: number[] = [];
  for (let k = 0; k < 16; k++) clumps.push(470 + r() * 980);
  for (let i = 0; i < 260; i++) {
    const x = at(clumps, i % 16) + (r() - 0.5) * 50;
    const b = bankY(x) + 6;
    const h = 16 + r() * 46 * (1 - Math.abs(r() - 0.5));
    const bend = (r() - 0.35) * 14;
    c.strokeStyle = r() < 0.3 ? rl : rc;
    c.lineWidth = 1 + r() * 0.8;
    c.beginPath();
    c.moveTo(x, b);
    c.quadraticCurveTo(x + bend * 0.3, b - h * 0.6, x + bend, b - h);
    c.stroke();
    if (r() < 0.1) {
      c.fillStyle = C("#5a3a24", "M");
      c.beginPath();
      c.ellipse(x + bend * 0.92, b - h * 0.93, 1.8, 5, bend * 0.02, 0, 6.3);
      c.fill();
    }
  }
  // Kaiserpfalz, the Palas: long red sandstone wall, arcade of round arches on paired columns
  const s = MAT.sand;
  const fM = C(s, "M");
  const fL = C(s, "L");
  const fS = C(s, "S");
  {
    const tb: Blob3[] = [];
    for (let i = 0; i < 9; i++)
      tb.push([10 + r() * 260, 752 + r() * 30, 22 + r() * 22]);
    mass(c, tb, C(MAT.beech, "S"), C(MAT.beech, "M"), C(MAT.beech2, "L"));
  }
  const outer = [
    -30, 1200, -30, 772, 6, 770, 8, 758, 40, 756, 42, 774, 120, 778, 166, 775,
    170, 768, 236, 770, 238, 781, 318, 778, 322, 770, 390, 773, 394, 784, 418,
    790, 424, 812, 436, 818, 440, 846, 452, 852, 458, 1200,
  ];
  const A = [
    [54, 86, 118],
    [180, 212, 244],
    [306, 338, 370],
  ];
  c.beginPath();
  c.moveTo(at(outer, 0), at(outer, 1));
  for (let i = 2; i < outer.length; i += 2)
    c.lineTo(at(outer, i), at(outer, i + 1));
  c.closePath();
  const hole = (x: number, w: number, sp: number, b: number) => {
    c.moveTo(x, b);
    c.lineTo(x, sp);
    c.arc(x + w / 2, sp, w / 2, Math.PI, 0, false);
    c.lineTo(x + w, b);
    c.closePath();
  };
  for (const x of A.flat()) hole(x, 26, 846, 900);
  hole(200, 50, 964, 1200);
  c.fillStyle = fM;
  c.fill("evenodd");
  // arch reveals: wall thickness seen on the inner right jamb and soffit
  const holeP = (
    x: number,
    w: number,
    sp: number,
    b: number,
    dx: number,
    dy: number,
  ) => {
    c.moveTo(x + dx, b + dy);
    c.lineTo(x + dx, sp + dy);
    c.arc(x + w / 2 + dx, sp + dy, w / 2, Math.PI, 0, false);
    c.lineTo(x + w + dx, b + dy);
    c.closePath();
  };
  for (const x of A.flat()) {
    c.save();
    c.beginPath();
    holeP(x, 26, 846, 900, 0, 0);
    c.clip();
    c.beginPath();
    holeP(x, 26, 846, 900, 0, 0);
    holeP(x, 26, 846, 900, -6, 5);
    c.fillStyle = SUN < 0 ? fL : fS;
    c.fill("evenodd");
    c.restore();
  }
  // paired columns with capitals
  for (const g of A) {
    for (let i = 0; i < g.length - 1; i++) {
      const x = at(g, i) + 26;
      rect(c, x - 1, 840, x + 7, 845, fL);
      rect(c, x - 1, 896, x + 7, 901, fL);
      line(c, x + 3, 845, x + 3, 896, fS, 1.2);
    }
  }
  for (const g of A) {
    const a = at(g, 0) - 8;
    const z = at(g, g.length - 1) + 34;
    c.strokeStyle = fL;
    c.lineWidth = 1.3;
    c.beginPath();
    c.moveTo(a, 902);
    c.lineTo(z, 902);
    c.stroke();
  }
  // string courses, blocks, piers
  line(c, -30, 818, 446, 818, fS, 2);
  line(c, -30, 914, 446, 914, fS, 2.5);
  line(c, -30, 912, 446, 912, fL, 1);
  c.fillStyle = rgba(fS, 0.35);
  for (let y = 790; y < 1000; y += 9) c.fillRect(-30, y, 476, 1);
  c.fillStyle = rgba(fS, 0.5);
  for (let i = 0; i < 120; i++) {
    const x = r() * 470 - 20;
    const y = 800 + r() * 170;
    c.fillRect(x, y, 6 + r() * 10, 1.4);
  }
  poly(c, [452, 852, 462, 858, 468, 1200, 458, 1200], C(s, side(false)));
  c.strokeStyle = fL;
  c.lineWidth = 1.6;
  c.beginPath();
  c.moveTo(at(outer, 2), at(outer, 3));
  for (let i = 4; i < outer.length - 2; i += 2)
    c.lineTo(at(outer, i), at(outer, i + 1));
  c.stroke();
  // grass on the ruin top
  for (let x = -30; x < 446; x += 4) {
    if (r() < 0.35) continue;
    let y = 800;
    for (let i = 2; i < outer.length - 2; i += 2) {
      if (at(outer, i) >= x) {
        y = at(outer, i + 1);
        break;
      }
    }
    poly(
      c,
      [x, y + 3, x + 2, y - 3 - r() * 7, x + 4, y + 3],
      C(MAT.meadow, r() < 0.3 ? "L" : "M"),
    );
  }
  // alders and willows, right foreground
  const sh = C(MAT.willow, "S");
  const li = C(mix(MAT.willow, MAT.beech2, 0.6), "L");
  const md = C(MAT.willow, "M");
  const TR: [number, number, number, number][] = [
    [1500, 960, 1486, 720],
    [1580, 960, 1596, 700],
    [1650, 960, 1640, 740],
  ];
  for (const [a, b, x2, y2] of TR) line(c, a, b, x2, y2, C(MAT.beam, "S"), 7);
  const cr: Blob3[] = [];
  for (let i = 0; i < 34; i++) {
    const a = r();
    const x = 1440 + a * 260;
    const y = 700 + r() ** 0.9 * 230 + (1 - a) * 50;
    cr.push([x, y, 22 + r() * 28]);
  }
  mass(c, cr, sh, md, li);
  c.strokeStyle = md;
  c.lineWidth = 1.2;
  for (let i = 0; i < 70; i++) {
    const x = 1440 + r() * 260;
    const y = 760 + r() * 170;
    const h = 16 + r() * 30;
    c.beginPath();
    c.moveTo(x, y);
    c.quadraticCurveTo(x + SUN * -3, y + h * 0.6, x + SUN * -2, y + h);
    c.stroke();
  }
  // a photographer on the bank with a tripod (a small nod)
  const px = 530;
  const py = bankY(530) + 2;
  const fk = C("#2a2b31", "S");
  line(c, px - 2, py, px - 1, py - 15, fk, 3);
  line(c, px + 3, py, px + 2, py - 15, fk, 3);
  poly(
    c,
    [px - 5, py - 14, px - 4, py - 31, px + 6, py - 31, px + 7, py - 14],
    fk,
  );
  circ(c, px + 1, py - 35, 4.2, fk);
  line(c, px + 4, py - 27, px + 12, py - 31, fk, 2.2);
  rect(c, px + 10, py - 35, px + 17, py - 29, fk);
  line(c, px + 13, py - 29, px + 9, py, fk, 1.1);
  line(c, px + 14, py - 29, px + 19, py, fk, 1.1);
  line(c, px + 13, py - 29, px + 14, py, fk, 1.1);
}

/* ---------- layers: back to front, each with an aerial haze wash at its base ---------- */
type Wash = [number, number, number, number, string?];
interface Layer {
  g: 1 | 2 | 3;
  d: number;
  f: (c: Ctx) => void;
  m?: () => Wash;
}
const LAYERS: Layer[] = [
  { g: 1, d: 0.82, f: far, m: () => [570, 660, 0, 0.5] },
  { g: 1, d: 0.6, f: domes, m: () => [500, 690, 0, 0.6] },
  { g: 1, d: 0.4, f: ridge, m: () => [430, 700, 0, 0.6] },
  { g: 1, d: 0.3, f: plainW, m: () => [660, 760, 0.1, 0.35] },
  { g: 1, d: 0.24, f: slope, m: () => [520, 700, 0, 0.4] },
  { g: 1, d: 0, f: nightGlow },
  { g: 2, d: 0.1, f: valley, m: () => [736, 820, 0.35, 0] },
  { g: 2, d: 0.12, f: town, m: () => [480, 640, 0, 0.18] },
  {
    g: 2,
    d: 0.1,
    f: marienkirche,
    m: () => [590, 340, 0.5 * P.flood, 0, "#ffb46e"],
  },
  { g: 2, d: 0.07, f: townFront, m: () => [600, 760, 0, 0.14] },
  { g: 2, d: 0, f: mist },
  { g: 3, d: 0, f: fore },
];

/* ---------- living details: a train, chimney smoke, swifts round the spires, glints on the Kinzig ---------- */
function train(c: Ctx, x0: number) {
  const y = railY(x0 + 120);
  const cars = 6;
  const cl = 44;
  const body = C("#eceae4", "L");
  const bodyS = C("#c9c7c2", "M");
  const red = C("#c8322e", "M");
  const win = mix(C("#2d333b", "S"), "#ffe3a8", P.win * 0.9);
  for (let i = 0; i < cars; i++) {
    const x = x0 + i * (cl + 2);
    const yy = railY(x + cl / 2);
    rect(c, x, yy - 11, x + cl, yy - 1.5, body);
    rect(c, x, yy - 4.5, x + cl, yy - 1.5, bodyS);
    rect(c, x, yy - 4, x + cl, yy - 3, red);
    rect(c, x + 3, yy - 9, x + cl - 3, yy - 6.8, win);
    if (i === 0) {
      c.fillStyle = body;
      c.beginPath();
      c.moveTo(x + 0.5, yy - 11);
      c.quadraticCurveTo(x - 12, yy - 10, x - 13, yy - 2);
      c.lineTo(x + 0.5, yy - 1.5);
      c.fill();
      rect(c, x - 11, yy - 4, x, yy - 3, red);
    }
    if (i === 2) {
      line(c, x + 18, yy - 11, x + 24, yy - 15, C("#3a3a3a", "M"), 0.8);
      line(c, x + 24, yy - 15, x + 30, yy - 15, C("#3a3a3a", "M"), 0.8);
    }
  }
  if (P.win > 0.2) {
    const R = c.createRadialGradient(x0 - 13, y - 5, 0, x0 - 13, y - 5, 26);
    R.addColorStop(0, rgba("#fff2c8", 0.6 * P.win));
    R.addColorStop(1, rgba("#fff2c8", 0));
    c.fillStyle = R;
    c.fillRect(x0 - 40, y - 30, 54, 50);
  }
}

function details(c: Ctx, t: number) {
  // train: Frankfurt bound, right to left, every ~40 s
  const cyc = 42;
  const tt = (t + 6.2) % cyc;
  const x0 = 1780 - tt * 150;
  if (x0 > -320 && x0 < 1800) train(c, x0);
  // smoke
  if (TOWN?.smoke) {
    const [sx, sy] = TOWN.smoke;
    const col = mix(P.haze, "#ffffff", 0.35);
    for (let i = 0; i < 14; i++) {
      const a = (t * 0.09 + i / 14) % 1;
      c.fillStyle = rgba(col, (1 - a) * (0.34 - P.dark * 0.2));
      c.beginPath();
      c.arc(
        sx + a * a * 70 + Math.sin(a * 7 + i) * 3,
        sy - a * 80,
        1.6 + a * 8,
        0,
        6.3,
      );
      c.fill();
    }
  }
  // swifts round the spires
  if (P.dark < 0.4) {
    c.strokeStyle = C("#22242a", "S");
    c.lineWidth = 1.1;
    for (let i = 0; i < 5; i++) {
      const w = 0.5 + i * 0.13;
      const a = t * w + i * 1.7;
      const x = 1130 + Math.cos(a) * (70 + i * 22);
      const y = 300 + Math.sin(a) * (26 + i * 6) + Math.sin(a * 3) * 6;
      const f = Math.sin(t * 14 + i) * 1.3;
      c.beginPath();
      c.moveTo(x - 4, y - 1.5 + f);
      c.quadraticCurveTo(x - 1.5, y - 1, x, y + 0.6);
      c.quadraticCurveTo(x + 1.5, y - 1, x + 4, y - 1.5 + f);
      c.stroke();
    }
  }
  // glints and, at night, the floodlit church drawn out on the water
  const gl = mix(P.sun, "#ffffff", 0.5);
  const r = rng(7);
  for (let i = 0; i < 22; i++) {
    const x = r() * 1600;
    const y = riverT(x) + 3 + r() * 9;
    const a = Math.max(0, Math.sin(t * (1 + r() * 2) + i * 2.1)) ** 10;
    c.fillStyle = rgba(gl, a * (0.9 - P.dark * 0.6));
    c.fillRect(x, y, 5 + r() * 9, 1.1);
  }
  if (P.flood > 0.05) {
    for (let i = 0; i < 16; i++) {
      const x = 990 + i * 16 + Math.sin(t * 2 + i) * 2;
      const y = riverT(x) + 2 + (i % 3) * 3;
      c.fillStyle = rgba(
        "#ffb46e",
        0.35 * P.flood * (0.6 + 0.4 * Math.sin(t * 3 + i)),
      );
      c.fillRect(x, y, 7, 1.4);
    }
  }
}

/* ---------- mounting ---------- */
export interface SceneOptions {
  hour: number;
  /** Scene x that stays in view when the frame is narrower than the drawing. */
  focusX?: number;
  /** Where focusX sits across the visible width, 0 left to 1 right. */
  anchorX?: number;
  /** Animate the train, smoke, swifts and glints. */
  motion?: boolean;
  portraitK?: number;
}

export interface Scene {
  setHour(h: number): void;
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
    focusX: 1130,
    anchorX: 0.66,
    motion: true,
    portraitK: 0.62,
    ...opt,
  };
  el.style.overflow = "hidden";
  el.style.isolation = "isolate";
  // sky, back, mid, anim, front
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
  let W = 1;
  let XF: [number, number, number] | null = null;
  let hour = o.hour;

  function layout() {
    W = el.clientWidth || 1;
    const H = el.clientHeight || 1;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const portrait = W / H < 0.9;
    const s = Math.max(W / SW, (H * (portrait ? o.portraitK : 1)) / SH);
    const vw = W / s;
    const left = Math.max(0, Math.min(SW - vw, o.focusX - vw * o.anchorX));
    const top = H - SH * s;
    for (const c of cv) {
      c.width = Math.round(W * DPR);
      c.height = Math.round(H * DPR);
    }
    tmp.width = canvas(0).width;
    tmp.height = canvas(0).height;
    XF = [DPR * s, DPR * (-left * s), DPR * top];
  }
  function xf(c: Ctx) {
    if (XF) c.setTransform(XF[0], 0, 0, XF[0], XF[1], XF[2]);
  }
  function renderTo(targets: Ctx[], T: HTMLCanvasElement) {
    SUN = P.sunX < 800 ? -1 : 1;
    for (const c of targets) {
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, c.canvas.width, c.canvas.height);
    }
    const s0 = at(targets, 0);
    xf(s0);
    D = 0;
    FGK = 0;
    sky(s0);
    const t = T.getContext("2d") as Ctx;
    for (const L of LAYERS) {
      t.setTransform(1, 0, 0, 1, 0, 0);
      t.clearRect(0, 0, T.width, T.height);
      xf(t);
      D = L.d;
      FGK = L.g === 3 ? 0.58 : 0;
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
      T2.drawImage(T, 0, 0);
    }
    D = 0;
    FGK = 0;
  }
  function render() {
    P = paletteAt(hour);
    renderTo([ctx(0), ctx(1), ctx(2), ctx(4)], tmp);
    // depth of field: the frame's edges slightly soft
    canvas(4).style.filter =
      `blur(${Math.max(0.4, Math.min(1, W / 2000)).toFixed(2)}px)`;
    canvas(1).style.filter = `blur(${(W / 2600).toFixed(2)}px)`;
    anim(performance.now());
  }
  const ax = ctx(3);
  const t0 = performance.now();
  let raf = 0;
  let last = 0;
  let running = false;
  function anim(now: number) {
    if (!XF) return;
    const t = (now - t0) / 1000;
    ax.setTransform(1, 0, 0, 1, 0, 0);
    ax.clearRect(0, 0, canvas(3).width, canvas(3).height);
    xf(ax);
    D = 0.08;
    FGK = 0;
    details(ax, t);
    D = 0;
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
    setHour(h) {
      if (h === hour) return;
      hour = h;
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
