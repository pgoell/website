import { getTranslations } from "next-intl/server";
import { PomodoroApp } from "@/components/pomodoro/pomodoro-app";

export default async function PomodoroPage() {
  const t = await getTranslations("pomodoro");

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("instructions")}</p>
      </div>

      <PomodoroApp />
    </div>
  );
}
