import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PomodoroApp } from "@/components/pomodoro";

interface PomodoroPageProps {
  params: Promise<{ locale: string }>;
}

export default async function PomodoroPage({ params }: PomodoroPageProps) {
  const { locale } = await params;
  const t = await getTranslations("pomodoro");
  const nav = await getTranslations("nav");

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/${locale}/tools`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; {nav("back")}
        </Link>
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("instructions")}</p>
      </div>

      <PomodoroApp />
    </div>
  );
}
