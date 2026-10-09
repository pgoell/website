import { getTranslations } from "next-intl/server";

export default async function DatenschutzPage() {
  const t = await getTranslations("datenschutz");
  const ti = await getTranslations("impressum");
  const sections: { title: string; text: string[] }[] = t.raw("sections");

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("date")}</p>
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold">{t("controller")}</h2>
        <address className="whitespace-pre-line not-italic">
          Pascal Göllner{"\n"}
          {ti("address")}
          {"\n"}
          {ti("email")}:{" "}
          <a href="mailto:hello@pgoell.com" className="hover:underline">
            hello@pgoell.com
          </a>
        </address>
        <p>{t("private")}</p>
      </div>

      {sections.map((section) => (
        <div key={section.title} className="space-y-2">
          <h2 className="text-xl font-semibold">{section.title}</h2>
          {section.text.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      ))}
    </div>
  );
}
