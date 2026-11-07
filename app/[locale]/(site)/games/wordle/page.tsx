import { getTranslations } from "next-intl/server";
import { AppPage } from "@/components/site/app-page";
import { WordleGame } from "@/components/wordle";

interface WordlePageProps {
  params: Promise<{ locale: string }>;
}

export default async function WordlePage({ params }: WordlePageProps) {
  const { locale } = await params;
  const t = await getTranslations("games");

  return (
    <AppPage
      up={{ href: `/${locale}/games`, label: t("title") }}
      title={t("wordle.title")}
      sub={t("wordle.description")}
      lede={t("wordle.instructions")}
    >
      <WordleGame />
    </AppPage>
  );
}
