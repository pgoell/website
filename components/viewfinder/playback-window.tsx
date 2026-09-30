"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { PROJECTS } from "@/lib/viewfinder/projects";
import { type ArtFonts, drawProjectArt, drawRgbHistogram } from "./project-art";
import s from "./viewfinder.module.css";

interface Props {
  index: number;
  onClose: () => void;
  onGo: (i: number) => void;
  fonts: ArtFonts;
}

/** Draggable playback window: a project as if it were a photo on the camera. */
export function PlaybackWindow({ index, onClose, onGo, fonts }: Props) {
  const t = useTranslations("home");
  const locale = useLocale();
  const pwRef = useRef<HTMLDivElement | null>(null);
  const artRef = useRef<HTMLCanvasElement | null>(null);
  const histRef = useRef<HTMLCanvasElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const p = PROJECTS[index];

  useEffect(() => {
    if (!p || !artRef.current || !histRef.current) return;
    drawProjectArt(artRef.current, p.art, index * 7 + 1, fonts);
    drawRgbHistogram(histRef.current, artRef.current);
  }, [p, index, fonts]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => previous?.focus?.();
  }, []);

  if (!p) return null;
  const n = PROJECTS.length;

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as Element).closest("button") || !pwRef.current) return;
    const b = pwRef.current.getBoundingClientRect();
    drag.current = { dx: e.clientX - b.left, dy: e.clientY - b.top };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onDrag = (e: React.PointerEvent) => {
    const pw = pwRef.current;
    if (!drag.current || !pw) return;
    pw.style.transform = "none";
    pw.style.left = `${e.clientX - drag.current.dx}px`;
    pw.style.top = `${e.clientY - drag.current.dy}px`;
  };

  const open = p.route ? (
    <Link href={`/${locale}${p.route}`}>{t("playback.open")}</Link>
  ) : p.href ? (
    <a href={p.href} target="_blank" rel="noopener noreferrer">
      {t("playback.open")}
    </a>
  ) : (
    <span className={s.na}>{t("playback.private")}</span>
  );

  return (
    <div
      className={s.pw}
      ref={pwRef}
      role="dialog"
      aria-label={`${t("playback.label")}: ${p.name}`}
    >
      <div
        className={s.tb}
        onPointerDown={onDown}
        onPointerMove={onDrag}
        onPointerUp={() => {
          drag.current = null;
        }}
      >
        <span>DSC0000{index + 1}.ARW</span>
        <span className={s.sp} />
        <span>
          {index + 1}/{n}
        </span>
        <button
          type="button"
          ref={closeRef}
          onClick={onClose}
          aria-label={t("playback.close")}
        >
          ✕
        </button>
      </div>
      <div className={s.bd}>
        <div className={s.img}>
          <canvas ref={artRef} width={840} height={560} />
          <span>{t("playback.illustration")}</span>
        </div>
        <div className={s.inf}>
          <h3>{p.name}</h3>
          <canvas ref={histRef} width={480} height={120} />
          <dl>
            <dt>{t("playback.what")}</dt>
            <dd>{t(`projects.${p.id}.d`)}</dd>
            <dt>{t("playback.type")}</dt>
            <dd>{t(`projects.${p.id}.k`)}</dd>
            <dt>{t("playback.repo")}</dt>
            <dd>{p.href ? p.repo : `${p.repo} (${t("playback.private")})`}</dd>
            <dt>{t("playback.status")}</dt>
            <dd className={s.dim}>{t("playback.placeholder")}</dd>
          </dl>
          <div className={s.nav}>
            <button type="button" onClick={() => onGo(index - 1)}>
              {t("playback.prev")}
            </button>
            <button type="button" onClick={() => onGo(index + 1)}>
              {t("playback.next")}
            </button>
            {open}
          </div>
        </div>
      </div>
    </div>
  );
}
