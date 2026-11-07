import { getTranslations } from "next-intl/server";
import { PomodoroApp } from "@/components/pomodoro";
import { AppPage } from "@/components/site/app-page";

interface PomodoroPageProps {
  params: Promise<{ locale: string }>;
}

export default async function PomodoroPage({ params }: PomodoroPageProps) {
  const { locale } = await params;
  const t = await getTranslations("pomodoro");
  const tt = await getTranslations("tools");

  return (
    <AppPage
      up={{ href: `/${locale}/tools`, label: tt("title") }}
      title={t("title")}
      sub={tt("pomodoro.description")}
      lede={t("instructions")}
    >
      <div className="w-full">
        <PomodoroApp />
      </div>
    </AppPage>
  );
}
