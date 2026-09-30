"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { PROJECTS } from "@/lib/viewfinder/projects";
import {
  altitudeAt,
  buildField,
  contour,
  type Field,
  formatPosition,
  river,
  tint,
} from "@/lib/viewfinder/terrain";
import { cls, cx } from "./cx";
import s from "./viewfinder.module.css";

const CELL = 4;

interface Props {
  pick: number;
  onPick: (i: number) => void;
  onOpen: (i: number) => void;
  onReady: () => void;
  monoFamily: string;
}

interface Pin {
  x: number;
  y: number;
  alt: number;
}

function drawMap(canvas: HTMLCanvasElement, f: Field) {
  const { width: MW, height: MH, nx: NX, ny: NY } = f;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = MW * dpr;
  canvas.height = MH * dpr;
  const x = canvas.getContext("2d");
  if (!x) return;
  x.setTransform(dpr, 0, 0, dpr, 0, 0);
  // banded tint with a soft hillshade, drawn at grid resolution and scaled up
  const oc = document.createElement("canvas");
  oc.width = NX;
  oc.height = NY;
  const ox = oc.getContext("2d");
  if (!ox) return;
  const id = ox.createImageData(NX, NY);
  const F = (i: number, j: number) => f.data[j * NX + i] as number;
  for (let j = 0; j < NY; j++)
    for (let i = 0; i < NX; i++) {
      const e = F(i, j);
      const c = tint(Math.floor(e / 20) * 20 + 10);
      const dx = F(Math.min(NX - 1, i + 1), j) - F(Math.max(0, i - 1), j);
      const dy = F(i, Math.min(NY - 1, j + 1)) - F(i, Math.max(0, j - 1));
      const sh = Math.max(0.72, Math.min(1.25, 1 - (dx + dy) * 0.012));
      const p = (j * NX + i) * 4;
      id.data[p] = (c[0] as number) * sh;
      id.data[p + 1] = (c[1] as number) * sh;
      id.data[p + 2] = (c[2] as number) * sh;
      id.data[p + 3] = 255;
    }
  ox.putImageData(id, 0, 0);
  x.imageSmoothingEnabled = true;
  x.drawImage(oc, 0, 0, NX * CELL, NY * CELL);
  // contours, index line every 100 m
  for (let t = 120; t <= 480; t += 20) {
    const idx = t % 100 === 0;
    const seg = contour(f, t);
    x.beginPath();
    for (let k = 0; k < seg.length; k += 4) {
      x.moveTo(seg[k] as number, seg[k + 1] as number);
      x.lineTo(seg[k + 2] as number, seg[k + 3] as number);
    }
    x.lineWidth = idx ? 1.1 : 0.55;
    x.strokeStyle = idx ? "rgba(230,238,230,.48)" : "rgba(215,228,218,.2)";
    x.stroke();
  }
  // graticule
  x.setLineDash([1, 5]);
  x.strokeStyle = "rgba(242,243,239,.08)";
  x.beginPath();
  for (let k = 1; k < 5; k++) {
    x.moveTo((k * MW) / 5, 0);
    x.lineTo((k * MW) / 5, MH);
    x.moveTo(0, (k * MH) / 5);
    x.lineTo(MW, (k * MH) / 5);
  }
  x.stroke();
  x.setLineDash([]);
  // railway (Kinzigtalbahn) and the Kinzig
  x.beginPath();
  for (let a = 0; a <= MW; a += 6) {
    const b = (river(a / MW) - 0.035) * MH;
    if (a) x.lineTo(a, b);
    else x.moveTo(a, b);
  }
  x.setLineDash([7, 5]);
  x.lineWidth = 1.4;
  x.strokeStyle = "rgba(242,243,239,.35)";
  x.stroke();
  x.setLineDash([]);
  x.beginPath();
  for (let a = 0; a <= MW; a += 4) {
    const b = river(a / MW) * MH;
    if (a) x.lineTo(a, b);
    else x.moveTo(a, b);
  }
  x.lineWidth = 2.6;
  x.strokeStyle = "rgba(127,195,214,.85)";
  x.stroke();
  // town block for Gelnhausen
  const gx = 0.5 * MW;
  const gy = (river(0.5) - 0.06) * MH;
  x.fillStyle = "rgba(242,243,239,.12)";
  x.strokeStyle = "rgba(242,243,239,.5)";
  x.lineWidth = 1;
  x.beginPath();
  x.ellipse(gx, gy, MW * 0.04, MH * 0.035, -0.2, 0, 7);
  x.fill();
  x.stroke();
}

function drawProfile(
  canvas: HTMLCanvasElement,
  f: Field,
  pin: Pin,
  monoFamily: string,
) {
  const x = canvas.getContext("2d");
  if (!x) return;
  const w = canvas.width;
  const h = canvas.height;
  x.clearRect(0, 0, w, h);
  const n = 120;
  const vals: number[] = [];
  for (let k = 0; k <= n; k++)
    vals.push(altitudeAt(f, (k / n) * f.width, pin.y));
  const lo = 100;
  const hi = 520;
  const Y = (v: number) => h - 4 - ((v - lo) / (hi - lo)) * (h - 10);
  x.beginPath();
  x.moveTo(0, h);
  vals.forEach((v, k) => {
    x.lineTo((k / n) * w, Y(v));
  });
  x.lineTo(w, h);
  x.fillStyle = "rgba(92,240,124,.1)";
  x.fill();
  x.beginPath();
  vals.forEach((v, k) => {
    if (k) x.lineTo((k / n) * w, Y(v));
    else x.moveTo(0, Y(v));
  });
  x.strokeStyle = "rgba(242,243,239,.8)";
  x.lineWidth = 2;
  x.stroke();
  x.fillStyle = "#5cf07c";
  x.fillRect((pin.x / f.width) * w - 1.5, 0, 3, h);
  x.font = `18px ${monoFamily}`;
  x.fillStyle = "rgba(242,243,239,.5)";
  x.fillText("W", 6, 22);
  x.fillText("E", w - 20, 22);
}

/** Playback, location view: the work as pins on a contour map of the Kinzigtal. */
export function LocationMap({
  pick,
  onPick,
  onOpen,
  onReady,
  monoFamily,
}: Props) {
  const t = useTranslations("home");
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<HTMLCanvasElement | null>(null);
  const profRef = useRef<HTMLCanvasElement | null>(null);
  const curRef = useRef<HTMLSpanElement | null>(null);
  const fieldRef = useRef<Field | null>(null);
  const [pins, setPins] = useState<Pin[] | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  const build = useCallback(() => {
    const wrap = wrapRef.current;
    const canvas = mapRef.current;
    if (!wrap || !canvas) return;
    const MW = wrap.clientWidth;
    const MH = wrap.clientHeight;
    if (!MW || !MH) return;
    const f = buildField(MW, MH, CELL, PROJECTS);
    fieldRef.current = f;
    drawMap(canvas, f);
    setSize({ w: MW, h: MH });
    setPins(
      PROJECTS.map((p) => {
        const px = p.x * MW;
        const py = p.y * MH;
        return { x: px, y: py, alt: Math.round(altitudeAt(f, px, py) / 5) * 5 };
      }),
    );
    onReady();
  }, [onReady]);

  // build the map only when it comes near the viewport, rebuild on resize
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    let built = false;
    let timer = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!built && entries.some((e) => e.isIntersecting)) {
          built = true;
          io.disconnect();
          build();
        }
      },
      { rootMargin: "300px" },
    );
    io.observe(wrap);
    let lastW = wrap.clientWidth;
    let lastH = wrap.clientHeight;
    const ro = new ResizeObserver(() => {
      if (!built || (wrap.clientWidth === lastW && wrap.clientHeight === lastH))
        return;
      lastW = wrap.clientWidth;
      lastH = wrap.clientHeight;
      clearTimeout(timer);
      timer = window.setTimeout(build, 150);
    });
    ro.observe(wrap);
    return () => {
      io.disconnect();
      ro.disconnect();
      clearTimeout(timer);
    };
  }, [build]);

  const pin = pins?.[pick];
  useEffect(() => {
    if (pin && fieldRef.current && profRef.current)
      drawProfile(profRef.current, fieldRef.current, pin, monoFamily);
  }, [pin, monoFamily]);

  const onMove = (e: React.MouseEvent) => {
    const f = fieldRef.current;
    const wrap = wrapRef.current;
    if (!f || !wrap || !curRef.current) return;
    const b = wrap.getBoundingClientRect();
    const a = e.clientX - b.left;
    const c = e.clientY - b.top;
    curRef.current.textContent = `${formatPosition(a, c, f.width, f.height)}, ${Math.round(altitudeAt(f, a, c))} m`;
  };

  const project = PROJECTS[pick] ?? PROJECTS[0];
  if (!project) return null;
  const file = (i: number) => `100-000${i + 1}`;

  const labels: Array<{ text: string; u: number; v: number; cls: string }> = [];
  if (pins) {
    for (const [text, u] of [
      ["Langenselbold", 0.07],
      ["Meerholz", 0.3],
      ["Wächtersbach", 0.92],
    ] as const) {
      if (size.w > 520 || (u > 0.2 && u < 0.8))
        labels.push({ text, u, v: river(u) + 0.045, cls: cls(s.town) });
    }
    labels.push({
      text: "Gelnhausen",
      u: 0.5,
      v: river(0.5) - 0.12,
      cls: cx(s.town, s.home),
    });
    labels.push({
      text: "Kinzig",
      u: 0.4,
      v: river(0.4) + 0.03,
      cls: cls(s.town),
    });
    labels.push({
      text: "Büdinger Wald",
      u: 0.44,
      v: 0.06,
      cls: cls(s.region),
    });
    labels.push({ text: "Spessart", u: 0.5, v: 0.95, cls: cls(s.region) });
  }

  return (
    <div className={s.screen}>
      <div className={s.side}>
        <div className={s.stab}>
          <span>
            <b>100MSDCF</b>, {t("map.work")}
          </span>
          <span>
            {pick + 1}/{PROJECTS.length}
          </span>
        </div>
        <ul className={s.files}>
          {PROJECTS.map((p, i) => (
            <li key={p.id}>
              <button
                type="button"
                className={i === pick ? s.on : undefined}
                aria-current={i === pick}
                onMouseEnter={() => onPick(i)}
                onFocus={() => onPick(i)}
                onClick={() => {
                  onPick(i);
                  onOpen(i);
                }}
              >
                <u>{i + 1}</u>
                <span>
                  <b>{p.name}</b>
                  <em>{t(`projects.${p.id}.d`)}</em>
                </span>
                <small>{file(i)}</small>
              </button>
            </li>
          ))}
        </ul>
        <div className={s.info}>
          <div className={s.top}>
            <span>{file(pick)}</span>
            <span>{t("map.detail")}</span>
          </div>
          <h3>{project.name}</h3>
          <div className={s.dim}>{t(`projects.${project.id}.d`)}</div>
          <dl>
            <dt>POS</dt>
            <dd>
              {pin && size.w
                ? formatPosition(pin.x, pin.y, size.w, size.h)
                : "-"}
            </dd>
            <dt>ALT</dt>
            <dd>{pin ? `${pin.alt} m` : "-"}</dd>
            <dt>TAG</dt>
            <dd>{t(`projects.${project.id}.k`)}</dd>
          </dl>
          <canvas ref={profRef} className={s.prof} width={600} height={88} />
          <div className={s.act}>
            <button type="button" onClick={() => onOpen(pick)}>
              {t("map.play")}
            </button>
            {project.href ? (
              <a href={project.href} target="_blank" rel="noopener noreferrer">
                {t("map.repo")}
              </a>
            ) : null}
          </div>
        </div>
      </div>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: pointer-only coordinate readout */}
      <div className={s.mapwrap} ref={wrapRef} onMouseMove={onMove}>
        <canvas
          ref={mapRef}
          className={s.map}
          role="img"
          aria-label={t("map.label")}
        />
        <div>
          {pins?.map((p, i) => {
            const pr = PROJECTS[i];
            if (!pr) return null;
            return (
              <button
                type="button"
                key={pr.id}
                className={cx(s.mpin, pr.x > 0.66 && s.l, i === pick && s.on)}
                style={{ left: p.x, top: p.y }}
                onMouseEnter={() => onPick(i)}
                onClick={() => {
                  onPick(i);
                  onOpen(i);
                }}
                aria-label={pr.name}
              >
                {i + 1}
                <span>{pr.name}</span>
              </button>
            );
          })}
          {labels.map((l) => (
            <span
              key={l.text}
              className={cx(s.mlab, l.cls)}
              style={{ left: l.u * size.w, top: l.v * size.h }}
            >
              {l.text}
            </span>
          ))}
        </div>
        <div
          className={s.maf}
          style={
            pin
              ? { transform: `translate(${pin.x - 36}px,${pin.y - 28}px)` }
              : undefined
          }
        >
          <i />
          <i />
          <i />
          <i />
          <small>{pin ? `AF ● ${pin.alt} m` : "AF"}</small>
        </div>
        <div className={s.mhud}>
          <span className={s.tl}>{t("map.sheet")}</span>
          <span className={s.tr} ref={curRef}>
            N 50°12.0′ E 9°11.3′
          </span>
          <span className={s.north}>
            <svg viewBox="0 0 14 20" aria-hidden="true">
              <path d="M7 1l5 17-5-4-5 4z" fill="#f2f3ef" />
            </svg>
            N
          </span>
          <span className={s.bl}>
            <span className={s.sbar} />
            {t("map.scale")}
          </span>
          <span className={s.br}>{t("map.contour")}</span>
        </div>
      </div>
    </div>
  );
}
