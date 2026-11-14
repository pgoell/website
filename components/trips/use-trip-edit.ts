"use client";

import { unstable_isUnrecognizedActionError, useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import {
  type Failed,
  savePlace,
  type TripError,
} from "@/app/[locale]/(site)/trips/actions";
import { metres } from "@/lib/trips/geo";
import { filterPlaces, type PlaceInput } from "@/lib/trips/places";
import type { LngLat, StoredPlace, StoredTrip } from "@/lib/trips/types";

export const TABS = ["plan", "places", "ideas", "bookings"] as const;
export type Tab = (typeof TABS)[number];

/** A place or a stop opened on its own in the card. */
export type Detail = { place: number } | { stop: number };

/** What went wrong, as a key of `site.trips.error`. */
export type EditError =
  | TripError
  | "offline"
  | "updatedForm"
  | "failed"
  | "noPosition";

function onConnection(change: () => void) {
  window.addEventListener("online", change);
  window.addEventListener("offline", change);
  return () => {
    window.removeEventListener("online", change);
    window.removeEventListener("offline", change);
  };
}

/**
 * What someone signed in does to a trip, besides the day that is picked: the
 * tab, a place opened on its own, the form, a pin to set, near me and the
 * filter, and every change sent to the server.
 */
export function useTripEdit(trip: StoredTrip) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("plan");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [editing, setEditing] = useState<PlaceInput | null>(null);
  const [picking, setPicking] = useState<PlaceInput | null>(null);
  const [error, setError] = useState<EditError | null>(null);
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState("");
  const [near, setNear] = useState(false);
  const [here, setHere] = useState<LngLat | null>(null);
  // The server and the first client render count as online.
  const offline = useSyncExternalStore(
    onConnection,
    () => !navigator.onLine,
    () => false,
  );

  // The other person may have added something since this tab was last open.
  useEffect(() => {
    const refresh = () =>
      document.visibilityState === "visible" &&
      navigator.onLine &&
      router.refresh();
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("online", refresh);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("online", refresh);
    };
  }, [router]);

  // Near me: watch the position only while the toggle is on.
  useEffect(() => {
    if (!near) return;
    const watch = navigator.geolocation.watchPosition(
      (p) => setHere([p.coords.longitude, p.coords.latitude]),
      (e) => {
        // A lost signal comes back by itself. Only a refusal ends the watch.
        if (e.code !== e.PERMISSION_DENIED) return;
        setNear(false);
        setError("noPosition");
      },
      { enableHighAccuracy: true },
    );
    return () => {
      navigator.geolocation.clearWatch(watch);
      setHere(null);
    };
  }, [near]);

  // The phone's back button closes a detail or the form, not the page.
  const overlay = detail !== null || editing !== null;
  useEffect(() => {
    const mine = history.state?.overlay === true;
    if (overlay && !mine) history.pushState({ overlay: true }, "");
    if (!overlay && mine) history.back();
  }, [overlay]);
  useEffect(() => {
    const close = () => {
      setDetail(null);
      setEditing(null);
    };
    window.addEventListener("popstate", close);
    return () => window.removeEventListener("popstate", close);
  }, []);

  // Safari on a phone does not shrink the page for the keyboard. It scrolls
  // the page up to the field, and can leave it there once the keyboard is gone.
  useEffect(() => {
    const settle = () => window.scrollTo(0, 0);
    window.addEventListener("focusout", settle);
    return () => window.removeEventListener("focusout", settle);
  }, []);

  /** Sends a change. `done` runs only after the server has taken it. */
  const run = (action: () => Promise<Failed>, done?: () => void) => {
    if (!navigator.onLine) {
      setError("offline");
      return;
    }
    startTransition(async () => {
      try {
        setError(null);
        const failed = await action();
        if (failed) setError(failed.error);
        else done?.();
      } catch (e) {
        // A deploy since this page was loaded: its actions are gone from the
        // server. A fresh page has the new ones. With the form open, leave the
        // reload to the person, so typed text can still be copied.
        if (unstable_isUnrecognizedActionError(e)) {
          if (editing) setError("updatedForm");
          else window.location.reload();
          return;
        }
        // A request that never reached the server throws a TypeError.
        setError(e instanceof TypeError ? "offline" : "failed");
      }
    });
  };

  const save = (input: PlaceInput, done?: () => void) =>
    run(() => savePlace(trip.slug, input), done);

  const shown = useMemo(
    () => filterPlaces(trip.places, filter),
    [trip.places, filter],
  );

  /** Metres from here, when near me is on and the place has a pin. */
  const away = (p: StoredPlace) =>
    here && p.lat !== null && p.lng !== null
      ? metres(here, [p.lng, p.lat])
      : null;
  // Places without a pin go last.
  const byDistance = (places: StoredPlace[]) =>
    [...places].sort((a, b) => (away(a) ?? 1e9) - (away(b) ?? 1e9));

  const count = (status: StoredPlace["status"]) =>
    trip.places.filter((p) => p.status === status).length;

  return {
    tab,
    setTab,
    detail,
    setDetail,
    editing,
    setEditing,
    picking,
    setPicking,
    error,
    pending,
    busy: pending || offline,
    offline,
    filter,
    setFilter,
    near,
    setNear,
    here,
    shown,
    away,
    byDistance,
    count,
    run,
    save,
  };
}
