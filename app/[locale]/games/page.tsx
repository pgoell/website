import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";

export default async function GamesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("games");

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="rounded-2xl border border-border bg-card/60 p-4 shadow-sm">
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">{t("wordle.title")}</h2>
          <p className="text-muted-foreground">{t("wordle.description")}</p>
          <Button asChild>
            <Link href={`/${locale}/games/wordle`}>{t("wordle.play")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
