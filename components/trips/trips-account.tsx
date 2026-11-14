"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import site from "@/components/site/site.module.css";
import { signInHref, signOutAction } from "@/lib/trips/private";
import { TripRow } from "./trip-row";
import s from "./trips.module.css";
import { usePrivateTrips } from "./use-private-trips";

/** This page's address once the browser knows it, for coming back after sign-in. */
function useHere(fallback: string): string {
  const [here, setHere] = useState(fallback);
  useEffect(() => setHere(window.location.href), []);
  return here;
}

/** Sign in, or sign out of, the trips app; both come back to this page. */
export function SignInOut({ name, locale }: { name?: string; locale: string }) {
  const t = useTranslations("site.trips");
  const here = useHere(`https://pgoell.com/${locale}/trips`);
  if (!name)
    return (
      <p className={s.small}>
        <a href={signInHref(here)}>{t("signIn")}</a>
      </p>
    );
  return (
    <form method="post" action={signOutAction()} className={s.small}>
      <input type="hidden" name="next" value={here} />
      {t("signedInAs", { name })} ·{" "}
      <button type="submit" className={s.linkButton}>
        {t("signOut")}
      </button>
    </form>
  );
}

/**
 * The private trips under the open ones, for someone signed in to the trips
 * app, and the line to sign in or out. The list comes straight from
 * trips.pgoell.com into the browser.
 */
export function PrivateTrips({ locale }: { locale: string }) {
  const t = useTranslations("site.trips");
  const got = usePrivateTrips();
  const mine = got.state === "in" ? got.trips.filter((x) => !x.public) : [];

  return (
    <>
      {mine.length > 0 && (
        <>
          <h2 className={s.group}>{t("privateTitle")}</h2>
          <ol className={site.list}>
            {mine.map((trip, i) => (
              <TripRow
                key={trip.slug}
                trip={trip}
                locale={locale}
                idx={`P${String(mine.length - i).padStart(2, "0")}`}
                file={t("privateFile")}
                to={t("to")}
                days={(count) => t("days", { count })}
              />
            ))}
          </ol>
        </>
      )}
      {got.state === "error" && <p className={s.small}>{t("privateError")}</p>}
      {got.state !== "pending" && (
        <SignInOut
          name={got.state === "in" ? got.name : undefined}
          locale={locale}
        />
      )}
    </>
  );
}
