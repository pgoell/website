"use client";

import { useTranslations } from "next-intl";
import { type HTMLAttributes, useEffect, useState } from "react";
import s from "./trips.module.css";

// Google's place card from the Places UI Kit, for one opened place. Each card
// that loads is one billed query, so never render this per list row.
// Terms: keep the place ID only, nothing else Google shows. Leave the
// attribution inside the card as it is.

type GooglePlaceEl = {
  id: string;
  location?: { lat(): number; lng(): number };
};
type GoogleEvent = {
  currentTarget: { places: GooglePlaceEl[] };
  place: GooglePlaceEl;
};
type El = HTMLAttributes<HTMLElement> & Record<string, unknown>;

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "gmp-place-details": El;
      "gmp-place-details-place-request": El;
      "gmp-place-search": El;
      "gmp-place-text-search-request": El;
      "gmp-place-all-content": El;
      "gmp-place-content-config": El;
      "gmp-place-media": El;
      "gmp-place-rating": El;
      "gmp-place-type": El;
      "gmp-place-open-now-status": El;
      "gmp-place-opening-hours": El;
      "gmp-place-address": El;
      "gmp-place-attribution": El;
    }
  }
}

type Props = {
  apiKey: string | undefined;
  place: {
    id: number;
    name: string;
    lat: number | null;
    lng: number | null;
    googlePlaceId: string | null;
  };
  /** Called once with Google's place ID when a search result is taken. */
  onMatched: (googlePlaceId: string) => void;
};

// A lone search result this close to our pin is taken without asking.
const SURE_KM = 1;
// Google's card follows the page's colour scheme, dark at night, light by day.
const BOX = s.google;

let library: Promise<unknown> | undefined;

/** Loads Google's script once per page. A failure stays a failure until reload. */
export function load(key: string) {
  library ??= new Promise((resolve, reject) => {
    const w = window as unknown as {
      google: { maps: { importLibrary(name: string): Promise<unknown> } };
      gmReady: () => void;
    };
    w.gmReady = () => resolve(w.google.maps.importLibrary("places"));
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&loading=async&callback=gmReady`;
    script.onerror = reject;
    document.head.append(script);
  });
  return library;
}

function km(a: { lat: number; lng: number }, b: GooglePlaceEl["location"]) {
  if (!b) return Number.POSITIVE_INFINITY;
  const rad = Math.PI / 180;
  const x = (b.lng() - a.lng) * rad * Math.cos(a.lat * rad);
  const y = (b.lat() - a.lat) * rad;
  return Math.hypot(x, y) * 6371;
}

export function GooglePlace({ apiKey, place, onMatched }: Props) {
  const t = useTranslations("site.trips.edit");
  const [ready, setReady] = useState(false);
  // What the search for this place gave: a place ID, "none" or "failed".
  const [seen, setSeen] = useState<{ place: number; result: string }>();

  useEffect(() => {
    if (!apiKey || !navigator.onLine) return;
    load(apiKey).then(
      () => setReady(true),
      () => {},
    );
  }, [apiKey]);

  const { lat, lng } = place;
  const result = seen?.place === place.id ? seen.result : undefined;
  const settle = (r: string) => setSeen({ place: place.id, result: r });
  const fail = () => settle("failed");
  const take = (id: string) => {
    settle(id);
    onMatched(id);
  };

  // A wrong key, a blocked referrer or a dead place ID all end in gmp-error.
  if (!ready || result === "failed") return null;
  if (result === "none") {
    return <p className={s.small}>{t("noGoogle")}</p>;
  }

  const googleId = place.googlePlaceId ?? result;
  if (googleId) {
    return (
      <gmp-place-details key={googleId} class={BOX} ongmp-error={fail}>
        <gmp-place-details-place-request place={googleId} />
        <gmp-place-content-config>
          <gmp-place-media lightbox-preferred />
          <gmp-place-rating />
          <gmp-place-type />
          <gmp-place-open-now-status />
          <gmp-place-opening-hours />
          <gmp-place-address />
          <gmp-place-attribution />
        </gmp-place-content-config>
      </gmp-place-details>
    );
  }

  if (lat === null || lng === null) return null;
  // Details by coordinates alone give the nearest shop, not our place, so
  // search by name near the pin. The user picks when Google is not sure.
  return (
    <gmp-place-search
      key={place.id}
      class={BOX}
      selectable
      ongmp-error={fail}
      ongmp-select={(e: GoogleEvent) => take(e.place.id)}
      ongmp-load={(e: GoogleEvent) => {
        const [first, more] = e.currentTarget.places;
        if (!first) settle("none");
        else if (!more && km({ lat, lng }, first.location) < SURE_KM)
          take(first.id);
      }}
    >
      <gmp-place-all-content />
      <gmp-place-text-search-request
        text-query={place.name}
        location-bias={`${lat},${lng}`}
        max-result-count={3}
      />
    </gmp-place-search>
  );
}
