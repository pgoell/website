"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect } from "react";
import { cx } from "@/components/viewfinder/cx";
import { hudFont, monoFont, semiFont } from "@/components/viewfinder/fonts";
import { locales } from "@/i18n/config";
import s from "./frame.module.css";

export interface FrameTab {
  /** Path without the locale prefix, such as "/blog". */
  path: string;
  label: string;
  /** Small number shown top right of the tab, such as how many posts. */
  count?: number;
}

/** True when `pathname` is the tab's page or a page below it. */
export function tabIsOn(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The camera-screen frame: top bar with the pg logo, EN/DE and a way back to
 * the viewfinder, numbered page tabs, corner marks and a DCIM footer.
 */
export function CameraFrame({
  tabs,
  tabsLabel,
  folder,
  children,
}: {
  tabs: readonly FrameTab[];
  tabsLabel: string;
  /** The path shown in the footer, after "DCIM /". */
  folder: string;
  children: React.ReactNode;
}) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("legal");
  const other = locales.find((l) => l !== locale) ?? locale;
  const otherHref = pathname.replace(`/${locale}`, `/${other}`);
  const home = `/${locale}`;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing =
        el?.isContentEditable ||
        el?.tagName === "INPUT" ||
        el?.tagName === "TEXTAREA" ||
        el?.tagName === "SELECT";
      if (
        e.key === "Escape" &&
        !e.defaultPrevented &&
        !typing &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey
      ) {
        router.push(home);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, home]);

  return (
    <div
      className={cx(
        s.root,
        hudFont.variable,
        semiFont.variable,
        monoFont.variable,
      )}
    >
      <div className={s.pix} aria-hidden="true" />
      <header className={s.top}>
        <div className={s.grp}>
          <Link className={s.ro} href={home} aria-label="pgoell.com">
            <span className={s.v}>
              <span className={s.logo}>
                pg
                <i />
              </span>
            </span>
          </Link>
          <Link
            className={cx(s.ro, s.lang)}
            href={otherHref}
            hrefLang={other}
            aria-label={other === "de" ? "Deutsch" : "English"}
          >
            <span className={s.v}>
              {locales.map((l) => (
                <span key={l} className={cx(l === locale && s.cur)}>
                  {l.toUpperCase()}
                </span>
              ))}
            </span>
          </Link>
        </div>
        <Link className={cx(s.ro, s.back)} href={home}>
          <span className={s.v}>
            <svg className={s.i} viewBox="0 0 16 16" aria-hidden="true">
              <path d="M10 3.5 5.5 8l4.5 4.5" />
            </svg>
            {t("back")}
          </span>
          <span className={s.l}>
            <kbd>{t("escHint")}</kbd> {t("backLabel")}
          </span>
        </Link>
      </header>

      <div className={cx(s.corner, s.c1)} aria-hidden="true" />
      <div className={cx(s.corner, s.c2)} aria-hidden="true" />
      <div className={cx(s.corner, s.c3)} aria-hidden="true" />
      <div className={cx(s.corner, s.c4)} aria-hidden="true" />

      <main className={s.main}>
        <nav className={s.tabs} aria-label={tabsLabel}>
          {tabs.map((tab, i) => {
            const href = `/${locale}${tab.path}`;
            const page = pathname === href;
            const on = tabIsOn(pathname, href);
            return (
              <Link
                key={tab.path}
                href={href}
                className={cx(s.tab, on && s.on)}
                aria-current={page ? "page" : on ? "true" : undefined}
              >
                <small>
                  {String(i + 1).padStart(2, "0")}
                  {tab.count !== undefined && (
                    <span className={s.cnt}>{tab.count}</span>
                  )}
                </small>
                <strong>{tab.label}</strong>
              </Link>
            );
          })}
        </nav>
        {children}
      </main>

      <footer className={s.foot}>
        <span>pgoell.com</span>
        <span className={s.dim}>DCIM / {folder.toUpperCase()}</span>
      </footer>
    </div>
  );
}
