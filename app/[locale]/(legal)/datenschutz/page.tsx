import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  LegalContents,
  LegalSection,
  LegalTitle,
  legalStyles as s,
  splitNumber,
} from "@/components/legal/legal-parts";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("datenschutz");
  return { title: `${t("title")} · Pascal Göllner` };
}

export default async function DatenschutzPage() {
  const t = await getTranslations("datenschutz");
  const ti = await getTranslations("impressum");
  const tl = await getTranslations("legal");
  const sections: { title: string; text: string[] }[] = t.raw("sections");

  const controller = { id: "s1", ...splitNumber(t("controller")) };
  const rest = sections.map((sec, i) => ({
    id: `s${i + 2}`,
    ...splitNumber(sec.title),
    paragraphs: sec.text,
  }));

  return (
    <>
      <LegalTitle title={t("title")} sub={t("date")} />
      <div className={s.grid}>
        <LegalContents
          label={tl("contents")}
          items={[controller, ...rest].map(({ id, n, text }) => ({
            id,
            n,
            text,
          }))}
        />
        <div>
          <LegalSection
            id={controller.id}
            n={controller.n}
            title={controller.text}
          >
            <dl className={s.kv}>
              <dt>{ti("name")}</dt>
              <dd>Pascal Göllner</dd>
              <dt>{ti("email")}</dt>
              <dd>
                <a href="mailto:hello@pgoell.com">hello@pgoell.com</a>
              </dd>
            </dl>
            <p>{t("private")}</p>
          </LegalSection>
          {rest.map((sec) => (
            <LegalSection key={sec.id} id={sec.id} n={sec.n} title={sec.text}>
              {sec.paragraphs.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </LegalSection>
          ))}
        </div>
      </div>
    </>
  );
}
