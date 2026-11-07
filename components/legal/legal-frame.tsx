"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect } from "react";
import { cx } from "@/components/viewfinder/cx";
import { hudFont, monoFont, semiFont } from "@/components/viewfinder/fonts";
import { locales } from "@/i18n/config";
import s from "./legal.module.css";

const PAGES = ["impressum", "datenschutz"] as const;

/** The camera-screen frame around the legal pages: top bar, page tabs, corner marks. */
export function LegalFrame({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("legal");
  const th = useTranslations("home.footer");
  const other = locales.find((l) => l !== locale) ?? locale;
  const otherHref = pathname.replace(`/${locale}`, `/${other}`);
  const home = `/${locale}`;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.metaKey && !e.ctrlKey && !e.altKey) {
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
        <nav className={s.tabs} aria-label={t("pages")}>
          {PAGES.map((p, i) => {
            const href = `/${locale}/${p}`;
            const on = pathname === href;
            return (
              <Link
                key={p}
                href={href}
                className={cx(s.tab, on && s.on)}
                aria-current={on ? "page" : undefined}
              >
                <small>{String(i + 1).padStart(2, "0")}</small>
                <strong>{th(p)}</strong>
              </Link>
            );
          })}
        </nav>
        {children}
      </main>

      <footer className={s.foot}>
        <span>pgoell.com</span>
        <span className={s.dim}>DCIM / {t("folder").toUpperCase()}</span>
      </footer>
    </div>
  );
}
