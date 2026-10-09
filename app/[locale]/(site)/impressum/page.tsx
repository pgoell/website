import { getTranslations } from "next-intl/server";

export default async function ImpressumPage() {
  const t = await getTranslations("impressum");

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("basis")}</p>
      </div>

      <address className="whitespace-pre-line not-italic">
        Pascal Göllner{"\n"}
        {t("address")}
      </address>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold">{t("contact")}</h2>
        <p>
          {t("email")}:{" "}
          <a href="mailto:hello@pgoell.com" className="hover:underline">
            hello@pgoell.com
          </a>
        </p>
      </div>

      <p>{t("responsible")}</p>
      <p className="text-muted-foreground">{t("private")}</p>
    </div>
  );
}
