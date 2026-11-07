import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  LegalSection,
  LegalTitle,
  legalStyles as s,
} from "@/components/legal/legal-parts";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("impressum");
  return { title: `${t("title")} · Pascal Göllner` };
}

export default async function ImpressumPage() {
  const t = await getTranslations("impressum");

  return (
    <>
      <LegalTitle title={t("title")} sub={t("basis")} />
      <div className={s.stack}>
        <LegalSection n="01" title={t("provider")}>
          <dl className={s.kv}>
            <dt>{t("name")}</dt>
            <dd>Pascal Göllner</dd>
          </dl>
        </LegalSection>
        <LegalSection n="02" title={t("contact")}>
          <dl className={s.kv}>
            <dt>{t("email")}</dt>
            <dd>
              <a href="mailto:hello@pgoell.com">hello@pgoell.com</a>
            </dd>
          </dl>
        </LegalSection>
        <LegalSection n="03" title={t("content")}>
          <p>{t("responsible")}</p>
          <p className={s.note}>{t("private")}</p>
        </LegalSection>
      </div>
    </>
  );
}
