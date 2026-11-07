import { getTranslations } from "next-intl/server";
import { FrameTitle } from "@/components/frame/frame-title";
import { CatalogGrid } from "@/components/site/catalog-grid";
import { GAMES } from "@/lib/site/catalog";

export default async function GamesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("games");

  return (
    <>
      <FrameTitle title={t("title")} sub={t("subtitle")} />
      <CatalogGrid
        locale={locale}
        entries={GAMES}
        folder={100}
        label={(e) => ({
          title: t(`${e.id}.title`),
          text: t(`${e.id}.description`),
          tag: t(`${e.id}.tag`),
        })}
      />
    </>
  );
}
