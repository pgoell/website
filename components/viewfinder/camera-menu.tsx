"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  actionFor,
  type MenuAction,
  type MenuEntry,
  type MenuTabDef,
  searchMenu,
} from "@/lib/viewfinder/menu";
import { cx } from "./cx";
import { MenuIcon } from "./icons";
import type { MenuRequest } from "./use-viewfinder";
import s from "./viewfinder.module.css";

interface Props {
  tabs: MenuTabDef[];
  request: MenuRequest;
  onClose: () => void;
  onAction: (a: MenuAction) => void;
  onTab: (id: MenuTabDef["id"]) => void;
}

/** Sony-style camera menu: tabs down the side, groups, items; type anywhere to search everything. */
export function CameraMenu({ tabs, request, onClose, onAction, onTab }: Props) {
  const t = useTranslations("home.menu");
  const startTab = Math.max(
    0,
    tabs.findIndex((x) => x.id === request.tab),
  );
  const [tab, setTab] = useState(request.tab === "search" ? 0 : startTab);
  const [grp, setGrp] = useState(request.group ?? 0);
  const [sel, setSel] = useState(0);
  const [q, setQ] = useState(request.query ?? "");
  const qRef = useRef<HTMLInputElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const itemsRef = useRef<HTMLDivElement | null>(null);

  const resolve = (
    def: MenuEntry["def"],
    ti: number,
    groupId: string,
  ): MenuEntry => {
    const tabDef = tabs[ti] as MenuTabDef;
    return {
      def,
      title: def.title ?? t(`items.${def.id}.t`),
      value: def.value ?? t(`items.${def.id}.v`),
      tab: ti,
      tabName: t(`tabs.${tabDef.id}`),
      group: t(`groups.${groupId}`),
    };
  };
  // biome-ignore lint/correctness/useExhaustiveDependencies: resolve only depends on tabs and t
  const all = useMemo(
    () =>
      tabs.flatMap((tb, ti) =>
        tb.groups.flatMap((g) => g.items.map((it) => resolve(it, ti, g.id))),
      ),
    [tabs, t],
  );

  const qs = q.trim();
  const tabDef = tabs[tab] as MenuTabDef;
  const group = tabDef.groups[grp] ?? tabDef.groups[0];
  const list: MenuEntry[] = qs
    ? searchMenu(all, qs)
    : (group?.items.map((it) => resolve(it, tab, group.id)) ?? []);
  const cur = Math.max(0, Math.min(sel, list.length - 1));
  const item = list[cur];

  const goTab = (i: number) => {
    const n = tabs.length;
    const next = ((i % n) + n) % n;
    setTab(next);
    setGrp(0);
    setSel(0);
    setQ("");
    onTab((tabs[next] as MenuTabDef).id);
  };
  const enter = (e?: MenuEntry) => {
    const it = e ?? item;
    if (!it) return;
    const action = actionFor(it.def);
    if (action) onAction(action);
  };

  // focus: the search field when searching, else the dialog itself
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    if (request.tab === "search") qRef.current?.focus();
    else dialogRef.current?.focus();
    return () => previous?.focus?.();
  }, [request.tab]);

  useEffect(() => {
    itemsRef.current
      ?.querySelector(`[data-s="${cur}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [cur]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const groups = tabDef.groups;
    if (e.key === "Escape") {
      e.preventDefault();
      if (q) {
        setQ("");
        setSel(0);
      } else onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (cur < list.length - 1) setSel(cur + 1);
      else if (!qs && grp < groups.length - 1) {
        setGrp(grp + 1);
        setSel(0);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (cur > 0) setSel(cur - 1);
      else if (!qs && grp > 0) {
        setGrp(grp - 1);
        setSel((groups[grp - 1]?.items.length ?? 1) - 1);
      }
    } else if (e.key === "ArrowRight" && !qs) goTab(tab + 1);
    else if (e.key === "ArrowLeft" && !qs) goTab(tab - 1);
    else if (e.key === "Enter") {
      e.preventDefault();
      enter();
    } else if (e.key === "Tab") {
      // keep focus inside the dialog
      const f =
        dialogRef.current?.querySelectorAll<HTMLElement>("button, input");
      if (!f?.length) return;
      const first = f[0] as HTMLElement;
      const last = f[f.length - 1] as HTMLElement;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    } else if (
      e.key.length === 1 &&
      document.activeElement !== qRef.current &&
      !e.metaKey &&
      !e.ctrlKey &&
      !e.altKey
    )
      qRef.current?.focus();
  };

  const color = qs ? "#f08a00" : tabDef.color;
  const tag = (f?: string) =>
    f === "soon" ? (
      <i>{t("soon")}</i>
    ) : f === "ph" ? (
      <i>{t("ph")}</i>
    ) : f === "ok" ? (
      <i>●</i>
    ) : null;
  const help = (e: MenuEntry) => {
    const key = `items.${e.def.id}.help`;
    if (!e.def.title && t.has(key)) return t(key);
    if (e.def.flag === "ph") return t("helpPh");
    if (e.def.flag === "soon") return t("helpSoon");
    return `${e.title}, ${e.value}.`;
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: backdrop click closes the menu
    // biome-ignore lint/a11y/useKeyWithClickEvents: Escape closes the menu
    <div
      className={s.scrim}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className={s.menu}
        role="dialog"
        aria-modal="true"
        aria-label={t("label")}
        tabIndex={-1}
        onKeyDown={onKeyDown}
      >
        <div className={s.mh}>
          <div className={s.tabic} style={{ background: color }}>
            <MenuIcon name={qs ? "box" : tabDef.icon} size={26} color="#000" />
          </div>
          <div className={s.title}>
            {qs ? (
              <>
                {t("search")} <em>{t("found", { count: list.length })}</em>
              </>
            ) : (
              <>
                {t(`tabs.${tabDef.id}`)}{" "}
                <em>/ {group ? t(`groups.${group.id}`) : ""}</em>
              </>
            )}
          </div>
          <label className={s.search}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              aria-hidden="true"
            >
              <circle cx="10" cy="10" r="7" />
              <path d="M15 15l6 6" />
            </svg>
            <input
              ref={qRef}
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setSel(0);
              }}
              placeholder={t("placeholder")}
              aria-label={t("placeholder")}
              autoComplete="off"
            />
            <kbd>Ctrl K</kbd>
          </label>
        </div>
        <div className={s.mb}>
          <nav className={s.tabs} aria-label={t("label")}>
            {tabs.map((tb, i) => (
              <button
                type="button"
                key={tb.id}
                className={!qs && i === tab ? s.on : undefined}
                style={{ "--tc": tb.color } as React.CSSProperties}
                aria-label={t(`tabs.${tb.id}`)}
                aria-current={!qs && i === tab}
                title={t(`tabs.${tb.id}`)}
                onClick={() => goTab(i)}
              >
                <MenuIcon name={tb.icon} />
              </button>
            ))}
          </nav>
          <div className={s.groups}>
            {qs
              ? tabs.map((tb, ti) => {
                  const n = list.filter((l) => l.tab === ti).length;
                  return n ? (
                    <div
                      key={tb.id}
                      className={s.on}
                      style={{ "--tc": tb.color } as React.CSSProperties}
                    >
                      {t(`tabs.${tb.id}`)}
                      <b>{n}</b>
                    </div>
                  ) : null;
                })
              : tabDef.groups.map((g, i) => (
                  <button
                    type="button"
                    key={g.id}
                    className={i === grp ? s.on : undefined}
                    style={{ "--tc": tabDef.color } as React.CSSProperties}
                    onClick={() => {
                      setGrp(i);
                      setSel(0);
                    }}
                  >
                    {t(`groups.${g.id}`)}
                    <b>{g.items.length}</b>
                  </button>
                ))}
          </div>
          <div className={s.items} ref={itemsRef}>
            {list.length ? (
              list.map((it, i) => (
                <button
                  type="button"
                  key={`${it.tab}-${it.def.id}`}
                  data-s={i}
                  className={cx(
                    s.it,
                    i === cur && s.on,
                    it.def.flag === "soon" && s.off,
                  )}
                  aria-disabled={it.def.flag === "soon"}
                  onMouseMove={() => i !== cur && setSel(i)}
                  onFocus={() => setSel(i)}
                  onClick={() => enter(it)}
                >
                  <span className={s.n}>{String(i + 1).padStart(2, "0")}</span>
                  <span className={s.t}>{it.title}</span>
                  <span className={s.v}>
                    {qs ? `${it.tabName} / ` : ""}
                    {it.value}
                    {tag(it.def.flag)}
                  </span>
                  <span className={s.ch}>›</span>
                </button>
              ))
            ) : (
              <div className={s.empty}>{t("empty")}</div>
            )}
          </div>
        </div>
        <div className={s.mf}>
          <span className={s.help} aria-live="polite">
            {item ? (
              <>
                <b>{item.tabName.toUpperCase()}</b>
                {help(item)}
              </>
            ) : null}
          </span>
          <span className={s.keys2}>
            <kbd>←→</kbd>
            {t("tab")} <kbd>↑↓</kbd>
            {t("select")} <kbd>↵</kbd>
            {t("open")} <kbd>esc</kbd>
            {t("back")}
          </span>
          <span className={s.pg}>
            {qs ? t("all") : `${tab + 1}/${tabs.length}`}
          </span>
        </div>
      </div>
    </div>
  );
}
