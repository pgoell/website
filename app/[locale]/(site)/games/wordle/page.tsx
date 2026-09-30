import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { WordleGame } from "@/components/wordle";

interface WordlePageProps {
  params: Promise<{ locale: string }>;
}

export default async function WordlePage({ params }: WordlePageProps) {
  const { locale } = await params;
  const t = await getTranslations("games");
  const nav = await getTranslations("nav");

  return (
    <div className="flex flex-col items-center space-y-6">
      <div className="w-full max-w-lg">
        <Link
          href={`/${locale}/games`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; {nav("back")}
        </Link>
      </div>
      <h1 className="text-2xl font-bold">{t("wordle.title")}</h1>
      <p className="text-muted-foreground text-center max-w-md">
        {t("wordle.instructions")}
      </p>
      <WordleGame />
    </div>
  );
}
