import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Header } from "@/components/header";

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const t = await getTranslations("impressum");

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">{children}</main>
      <footer className="mx-auto max-w-3xl px-4 py-8 text-sm sm:px-6">
        <Link
          href={`/${locale}/impressum`}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          {t("title")}
        </Link>
      </footer>
    </>
  );
}
