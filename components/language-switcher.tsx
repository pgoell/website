"use client";

import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchTo = locale === "en" ? "de" : "en";
  const newPath = pathname.replace(`/${locale}`, `/${switchTo}`);

  return (
    <Button variant="ghost" size="icon" onClick={() => router.push(newPath)}>
      {switchTo.toUpperCase()}
    </Button>
  );
}
