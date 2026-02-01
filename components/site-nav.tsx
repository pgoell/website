"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export function SiteNav() {
  const locale = useLocale();
  const t = useTranslations("nav");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);

    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  return (
    <div ref={menuRef} className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setMenuOpen((prev) => !prev)}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
      >
        {t("menu")}
      </Button>

      {menuOpen && (
        <div
          className="absolute right-0 mt-2 w-40 rounded-xl border border-border bg-popover p-2 shadow-md"
          role="menu"
        >
          <Link
            href={`/${locale}`}
            className="block rounded-md px-2 py-1 text-sm hover:bg-accent"
            onClick={() => setMenuOpen(false)}
            role="menuitem"
          >
            {t("home")}
          </Link>
          <Link
            href={`/${locale}/blog`}
            className="block rounded-md px-2 py-1 text-sm hover:bg-accent"
            onClick={() => setMenuOpen(false)}
            role="menuitem"
          >
            {t("blog")}
          </Link>
          <Link
            href={`/${locale}/games`}
            className="block rounded-md px-2 py-1 text-sm hover:bg-accent"
            onClick={() => setMenuOpen(false)}
            role="menuitem"
          >
            {t("games")}
          </Link>
        </div>
      )}
    </div>
  );
}
