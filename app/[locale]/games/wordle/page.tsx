import { getTranslations } from "next-intl/server";
import { WordleGame } from "@/components/wordle";

interface WordlePageProps {
  params: Promise<{ locale: string }>;
}

export default async function WordlePage({ params }: WordlePageProps) {
  const { locale } = await params;
  const t = await getTranslations("games");

  return (
    <div className="flex flex-col items-center space-y-6">
      <h1 className="text-2xl font-bold">{t("wordle.title")}</h1>
      <p className="text-muted-foreground text-center max-w-md">
        {t("wordle.instructions")}
      </p>
      <WordleGame locale={locale} />
    </div>
  );
}
