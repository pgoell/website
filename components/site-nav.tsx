"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function SiteNav() {
  const locale = useLocale();
  const t = useTranslations("nav");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          {t("menu")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/${locale}`}>{t("home")}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/${locale}/blog`}>{t("blog")}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/${locale}/games`}>{t("games")}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/${locale}/tools`}>{t("tools")}</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
