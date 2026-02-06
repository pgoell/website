import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { SolverDemo } from "@/components/wordle/solver/solver-demo";
import { WORDS_DE, WORDS_EN } from "@/lib/wordle";

interface SolverDemoPageProps {
  params: Promise<{ locale: string }>;
}

export default async function SolverDemoPage({ params }: SolverDemoPageProps) {
  const { locale } = await params;
  const t = await getTranslations("games");
  const nav = await getTranslations("nav");
  const wordList = locale === "de" ? WORDS_DE : WORDS_EN;

  return (
    <div className="flex flex-col items-center space-y-6">
      <div className="w-full">
        <Link
          href={`/${locale}/games/wordle`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; {nav("back")}
        </Link>
      </div>
      <h1 className="text-2xl font-bold">{t("wordle.solver.demo.title")}</h1>
      <p className="text-muted-foreground text-center max-w-md">
        {t("wordle.solver.demo.description")}
      </p>
      <SolverDemo wordList={wordList} />
    </div>
  );
}
