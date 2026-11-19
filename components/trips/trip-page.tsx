"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import site from "@/components/site/site.module.css";
import type { Trip } from "@/lib/trips/types";
import { TripView } from "./trip-view";
import { SignInOut } from "./trips-account";
import { usePrivateTrip } from "./use-private-trips";

/** A trip's page. The same for an open and a private trip. */
export function TripPage({
  trip,
  locale,
  mapsKey,
}: {
  trip: Trip;
  locale: string;
  mapsKey: string | undefined;
}) {
  return <TripView trip={trip} locale={locale} mapsKey={mapsKey} />;
}

/**
 * A trip that is not open: asked of `/api/trips/private` from the browser,
 * so it shows only to someone signed in.
 */
export function PrivateTripPage({
  slug,
  locale,
  mapsKey,
}: {
  slug: string;
  locale: string;
  mapsKey: string | undefined;
}) {
  const t = useTranslations("site.trips");
  const got = usePrivateTrip(slug);
  if (got.state === "in")
    return <TripPage trip={got.trip} locale={locale} mapsKey={mapsKey} />;
  return (
    <>
      <Link href={`/${locale}/trips`} className={site.up}>
        ◂ {t("up")}
      </Link>
      {got.state === "pending" ? (
        <p className={site.empty}>{t("loading")}</p>
      ) : got.state === "out" ? (
        <>
          <p className={site.empty}>{t("privateNeedsSignIn")}</p>
          <SignInOut locale={locale} />
        </>
      ) : (
        <p className={site.empty}>{t("notFound")}</p>
      )}
    </>
  );
}
