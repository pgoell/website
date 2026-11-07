import { getTranslations } from "next-intl/server";
import { BingoCard } from "@/components/bingo";
import { AppPage } from "@/components/site/app-page";

interface BingoPageProps {
  params: Promise<{ locale: string }>;
}

export default async function BingoPage({ params }: BingoPageProps) {
  const { locale } = await params;
  const t = await getTranslations("games");

  return (
    <AppPage
      up={{ href: `/${locale}/games`, label: t("title") }}
      title={t("bingo.title")}
      sub={t("bingo.description")}
      lede={t("bingo.instructions")}
    >
      <BingoCard locale={locale} />
    </AppPage>
  );
}
