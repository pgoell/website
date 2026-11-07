"use client";

import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { CameraFrame, tabIsOn } from "@/components/frame/camera-frame";
import { SITE_SECTIONS } from "@/lib/site/sections";
import s from "./site.module.css";

/**
 * The camera-screen frame around the blog, games and tools. Tailwind tokens
 * inside it switch to dark, so the games keep working on the dark screen.
 */
export function SiteFrame({
  counts,
  children,
}: {
  /** How many entries each section holds, by section id. */
  counts: Partial<Record<(typeof SITE_SECTIONS)[number]["id"], number>>;
  children: React.ReactNode;
}) {
  const t = useTranslations("site");
  const locale = useLocale();
  const pathname = usePathname();
  const current = SITE_SECTIONS.find((sec) =>
    tabIsOn(pathname, `/${locale}${sec.path}`),
  );

  return (
    <CameraFrame
      tabs={SITE_SECTIONS.map((sec) => ({
        path: sec.path,
        label: t(`tabs.${sec.id}`),
        count: counts[sec.id],
      }))}
      tabsLabel={t("sections")}
      folder={current ? t(`tabs.${current.id}`) : t("sections")}
    >
      <div className={`dark ${s.app}`}>{children}</div>
    </CameraFrame>
  );
}
