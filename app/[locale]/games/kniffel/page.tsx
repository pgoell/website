import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { KniffelGame } from "@/components/kniffel";

interface KniffelPageProps {
  params: Promise<{ locale: string }>;
}

export default async function KniffelPage({ params }: KniffelPageProps) {
  const { locale } = await params;
  const t = await getTranslations("games");

  return (
    <div className="flex flex-col items-center space-y-6">
      <div className="w-full max-w-lg">
        <Link
          href={`/${locale}/games`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← {locale === "de" ? "zurück" : "back"}
        </Link>
      </div>
      <h1 className="text-2xl font-bold">{t("kniffel.title")}</h1>
      <p className="text-muted-foreground text-center max-w-md">
        {t("kniffel.instructions")}
      </p>
      <KniffelGame locale={locale} />
    </div>
  );
}
