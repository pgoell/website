import { getTranslations } from "next-intl/server";
import { WordleGame } from "@/components/wordle/wordle-game";

export default async function WordlePage() {
  const t = await getTranslations("wordle");

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("instructions")}</p>
      </div>

      <WordleGame />
    </div>
  );
}
