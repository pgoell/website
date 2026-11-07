import { getTranslations } from "next-intl/server";
import { AppPage } from "@/components/site/app-page";
import { SolverDemo } from "@/components/wordle/solver/solver-demo";
import { WORDS_DE, WORDS_EN } from "@/lib/wordle";

interface SolverDemoPageProps {
  params: Promise<{ locale: string }>;
}

export default async function SolverDemoPage({ params }: SolverDemoPageProps) {
  const { locale } = await params;
  const t = await getTranslations("games");
  const wordList = locale === "de" ? WORDS_DE : WORDS_EN;

  return (
    <AppPage
      up={{ href: `/${locale}/games/wordle`, label: t("wordle.title") }}
      title={t("wordle.solver.demo.title")}
      sub={t("wordle.solver.demo.description")}
    >
      <SolverDemo wordList={wordList} />
    </AppPage>
  );
}
