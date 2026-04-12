import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

export default function Home() {
  const t = useTranslations("home");
  const locale = useLocale();

  return (
    <div className="space-y-6">
      <p>{t("intro")}</p>

      {/* <p>{t("mission")}</p> */}

      {/* <p>{t("personal")}</p> */}

      <p>
        {t("cta.prefix")}{" "}
        <Link href={`/${locale}/blog`} className="underline">
          {t("cta.writing")}
        </Link>{" "}
        {t("cta.or")}{" "}
        <a
          href="https://github.com/pgoell"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          {t("cta.code")}
        </a>
        ,{" "}
        <Link href={`/${locale}/games`} className="underline">
          {t("cta.playGames")}
        </Link>
        {t("cta.comma")}{" "}
        <a
          href="https://x.com/pagoell"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          {t("cta.follow")}
        </a>
        {t("cta.period")}{" "}
        <a href="mailto:hello@pascalkraus.com" className="underline">
          {t("cta.reachOut")}
        </a>
        {t("cta.suffix")}
      </p>
    </div>
  );
}
