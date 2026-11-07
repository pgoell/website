import { getTranslations } from "next-intl/server";
import { FrameTitle } from "@/components/frame/frame-title";
import { CatalogGrid } from "@/components/site/catalog-grid";
import { TOOLS } from "@/lib/site/catalog";

export default async function ToolsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("tools");

  return (
    <>
      <FrameTitle title={t("title")} sub={t("subtitle")} />
      <CatalogGrid
        locale={locale}
        entries={TOOLS}
        folder={101}
        label={(e) => ({
          title: t(`${e.id}.title`),
          text: t(`${e.id}.description`),
          tag: t(`${e.id}.tag`),
        })}
      />
    </>
  );
}
