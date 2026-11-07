import { getTranslations } from "next-intl/server";
import { KniffelGame } from "@/components/kniffel";
import { AppPage } from "@/components/site/app-page";

interface KniffelPageProps {
  params: Promise<{ locale: string }>;
}

export default async function KniffelPage({ params }: KniffelPageProps) {
  const { locale } = await params;
  const t = await getTranslations("games");

  return (
    <AppPage
      up={{ href: `/${locale}/games`, label: t("title") }}
      title={t("kniffel.title")}
      sub={t("kniffel.description")}
      lede={t("kniffel.instructions")}
    >
      <KniffelGame locale={locale} />
    </AppPage>
  );
}
