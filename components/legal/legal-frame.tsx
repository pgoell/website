"use client";

import { useTranslations } from "next-intl";
import { CameraFrame } from "@/components/frame/camera-frame";

/** The camera-screen frame around the legal pages, with a tab for each. */
export function LegalFrame({ children }: { children: React.ReactNode }) {
  const t = useTranslations("legal");
  const th = useTranslations("home.footer");

  return (
    <CameraFrame
      tabs={[
        { path: "/impressum", label: th("impressum") },
        { path: "/datenschutz", label: th("datenschutz") },
      ]}
      tabsLabel={t("pages")}
      folder={t("folder")}
    >
      {children}
    </CameraFrame>
  );
}
