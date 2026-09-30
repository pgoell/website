import { lcg } from "@/lib/viewfinder/color";
import type { ArtKind } from "@/lib/viewfinder/projects";

const PAL: Record<ArtKind, [string, string]> = {
  grid: ["#10302d", "#07100f"],
  mail: ["#2d1a14", "#0c0706"],
  slides: ["#1a2034", "#07080e"],
  pitch: ["#13301a", "#050d07"],
  dice: ["#2e2812", "#0d0b05"],
};

export interface ArtFonts {
  mono: string;
  hud: string;
}

/** Placeholder "photo" for a project in the playback window. */
export function drawProjectArt(
  cv: HTMLCanvasElement,
  kind: ArtKind,
  seed: number,
  fonts: ArtFonts,
) {
  const w = cv.width;
  const h = cv.height;
  const x = cv.getContext("2d");
  if (!x) return;
  const r = lcg(seed + 3);
  const u = w / 100;
  const pal = PAL[kind];
  const g = x.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, pal[0]);
  g.addColorStop(1, pal[1]);
  x.fillStyle = g;
  x.fillRect(0, 0, w, h);
  x.lineWidth = Math.max(1, w / 420);
  x.textAlign = "start";
  if (kind === "grid") {
    x.strokeStyle = "rgba(255,255,255,.14)";
    for (let c = 0; c < 5; c++)
      for (let q = 0; q < 7; q++) {
        const X = 12 * u + c * 15.5 * u;
        const Y = 9 * u + q * h * 0.105;
        x.strokeRect(X, Y, 14.5 * u, h * 0.105 - u * 0.8);
        if (r() < 0.62) {
          x.fillStyle = ["#2ec4b6", "#5cf07c", "#f08a00", "#8fb3ff", "#e8d27a"][
            (r() * 5) | 0
          ] as string;
          x.globalAlpha = 0.55 + r() * 0.3;
          x.fillRect(X + u * 0.5, Y + u * 0.5, 13.5 * u, h * 0.105 - 1.8 * u);
          x.globalAlpha = 1;
        }
      }
  }
  if (kind === "mail") {
    for (let i = 0; i < 7; i++) {
      const Y = h * 0.14 + i * h * 0.1;
      x.fillStyle = "rgba(255,255,255,.1)";
      x.fillRect(10 * u, Y, 80 * u, h * 0.07);
      x.fillStyle = "rgba(255,255,255,.35)";
      x.fillRect(13 * u, Y + h * 0.025, (20 + r() * 40) * u, h * 0.02);
    }
    x.strokeStyle = "#f08a00";
    x.lineWidth = u * 0.6;
    x.strokeRect(54 * u, h * 0.3, 38 * u, h * 0.44);
    x.fillStyle = "rgba(240,138,0,.18)";
    x.fillRect(54 * u, h * 0.3, 38 * u, h * 0.44);
    x.fillStyle = "rgba(255,255,255,.75)";
    for (let i = 0; i < 5; i++)
      x.fillRect(
        58 * u,
        h * 0.36 + i * h * 0.07,
        (18 + r() * 12) * u,
        h * 0.022,
      );
  }
  if (kind === "slides") {
    for (let i = 4; i >= 0; i--) {
      x.fillStyle = i
        ? `rgba(255,255,255,${0.06 + 0.03 * (4 - i)})`
        : "#e9ecf5";
      x.fillRect(18 * u + i * 5 * u, h * 0.2 + i * h * 0.06, 52 * u, h * 0.42);
    }
    x.fillStyle = "#1a2034";
    x.fillRect(22 * u, h * 0.26, 26 * u, h * 0.05);
    x.fillRect(22 * u, h * 0.35, 40 * u, h * 0.022);
    x.fillRect(22 * u, h * 0.4, 34 * u, h * 0.022);
    x.font = `600 ${14 * u}px ${fonts.mono}`;
    x.fillStyle = "rgba(143,179,255,.8)";
    x.fillText("</>", 70 * u, h * 0.86);
  }
  if (kind === "pitch") {
    x.strokeStyle = "rgba(255,255,255,.35)";
    x.strokeRect(8 * u, h * 0.12, 84 * u, h * 0.76);
    x.beginPath();
    x.moveTo(50 * u, h * 0.12);
    x.lineTo(50 * u, h * 0.88);
    x.stroke();
    x.beginPath();
    x.arc(50 * u, h * 0.5, 10 * u, 0, 7);
    x.stroke();
    let X = 20 * u;
    for (const [c, v] of [
      ["#5cf07c", 0.46],
      ["#e8d27a", 0.27],
      ["#f08a00", 0.27],
    ] as const) {
      x.fillStyle = c;
      x.fillRect(X, h * 0.93 - u * 1.2, 60 * u * v, u * 1.8);
      X += 60 * u * v;
    }
  }
  if (kind === "dice") {
    const s = 13 * u;
    "KNIFF".split("").forEach((ch, i) => {
      const X = 12 * u + i * (s + 2 * u);
      const Y = h * 0.2;
      x.fillStyle = ["#5cf07c", "#e8d27a", "#3a3d40", "#5cf07c", "#3a3d40"][
        i
      ] as string;
      x.fillRect(X, Y, s, s);
      x.fillStyle = "#fff";
      x.font = `600 ${8 * u}px ${fonts.hud}`;
      x.textAlign = "center";
      x.fillText(ch, X + s / 2, Y + s * 0.72);
    });
    x.textAlign = "start";
    for (const [X, Y] of [
      [30, 0.62],
      [52, 0.66],
    ] as const) {
      const s2 = 16 * u;
      x.save();
      x.translate(X * u, h * Y);
      x.rotate((r() - 0.5) * 0.5);
      x.fillStyle = "#f2efe6";
      x.fillRect(0, 0, s2, s2);
      x.fillStyle = "#111";
      for (const [a, b] of [
        [0.25, 0.25],
        [0.75, 0.75],
        [0.5, 0.5],
      ] as const) {
        x.beginPath();
        x.arc(a * s2, b * s2, s2 * 0.08, 0, 7);
        x.fill();
      }
      x.restore();
    }
  }
}

function bins(cv: HTMLCanvasElement, ch: number): number[] {
  const d = cv.getContext("2d")?.getImageData(0, 0, cv.width, cv.height).data;
  const b = new Array<number>(64).fill(0);
  if (!d) return b;
  for (let i = 0; i < d.length; i += 32) {
    const k = Math.min(63, (d[i + ch] as number) >> 2);
    b[k] = (b[k] as number) + 1;
  }
  return b;
}

/** RGB histogram of the art, like the camera's playback screen. */
export function drawRgbHistogram(
  hc: HTMLCanvasElement,
  src: HTMLCanvasElement,
) {
  const x = hc.getContext("2d");
  if (!x) return;
  const W = hc.width;
  const H = hc.height;
  x.clearRect(0, 0, W, H);
  x.fillStyle = "rgba(255,255,255,.14)";
  for (const k of [1, 2, 3]) x.fillRect((W * k) / 4, 0, 1, H);
  for (const [col, ch] of [
    ["rgba(255,80,80,.55)", 0],
    ["rgba(80,255,120,.5)", 1],
    ["rgba(90,140,255,.55)", 2],
  ] as const) {
    const b = bins(src, ch);
    const m = Math.max(...b);
    x.fillStyle = col;
    x.beginPath();
    x.moveTo(0, H);
    b.forEach((v, i) => {
      x.lineTo((i / 63) * W, H - (v / m) ** 0.8 * (H - 6));
    });
    x.lineTo(W, H);
    x.fill();
  }
}
