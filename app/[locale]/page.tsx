import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

export default function Home() {
  const t = useTranslations("home");
  const locale = useLocale();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t("greeting")}</h1>

      <p>{t("intro")}</p>

      <p>
        {t.rich("cta", {
          writing: (chunks) => (
            <Link href={`/${locale}/blog`} className="underline">
              {chunks}
            </Link>
          ),
          code: (chunks) => (
            <a
              href="https://github.com/pgoell"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              {chunks}
            </a>
          ),
          games: (chunks) => (
            <Link href={`/${locale}/games`} className="underline">
              {chunks}
            </Link>
          ),
          follow: (chunks) => (
            <a
              href="https://x.com/pagoell"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              {chunks}
            </a>
          ),
          reachOut: (chunks) => (
            <a href="mailto:hello@pascalkraus.com" className="underline">
              {chunks}
            </a>
          ),
        })}
      </p>
    </div>
  );
}
