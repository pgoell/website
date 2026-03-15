import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BingoCard } from "@/components/bingo";

interface BingoPageProps {
  params: Promise<{ locale: string }>;
}

export default async function BingoPage({ params }: BingoPageProps) {
  const { locale } = await params;
  const t = await getTranslations("games");

  return (
    <div className="flex flex-col items-center space-y-6">
      <div className="w-full max-w-2xl">
        <Link
          href={`/${locale}/games`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← {locale === "de" ? "zurück" : "back"}
        </Link>
      </div>
      <h1 className="text-2xl font-bold">{t("bingo.title")}</h1>
      <p className="text-muted-foreground text-center max-w-md">
        {t("bingo.instructions")}
      </p>
      <BingoCard locale={locale} />
    </div>
  );
}
