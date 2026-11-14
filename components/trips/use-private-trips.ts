"use client";

import { useEffect, useState } from "react";
import {
  hasHint,
  type PrivateCard,
  type Reading,
  readPrivateTrip,
  readPrivateTrips,
} from "@/lib/trips/private";
import type { Trip } from "@/lib/trips/types";

/** Before the browser has looked: render as signed out, change nothing yet. */
export type Pending = { state: "pending" };

/**
 * Who is signed in to the trips app and every trip they may see. Without the
 * trips app's hint cookie this asks nobody, so a visitor's browser never
 * contacts trips.pgoell.com.
 */
export function usePrivateTrips():
  | Pending
  | Reading<{
      name: string;
      trips: PrivateCard[];
    }> {
  const [got, setGot] = useState<
    Pending | Reading<{ name: string; trips: PrivateCard[] }>
  >({ state: "pending" });
  useEffect(() => {
    if (!hasHint(document.cookie)) {
      setGot({ state: "out" });
      return;
    }
    let live = true;
    readPrivateTrips().then((r) => live && setGot(r));
    return () => {
      live = false;
    };
  }, []);
  return got;
}

/** One trip that the open feed does not have, asked of the trips app. */
export function usePrivateTrip(
  slug: string,
): Pending | Reading<{ trip: Trip }> {
  const [got, setGot] = useState<Pending | Reading<{ trip: Trip }>>({
    state: "pending",
  });
  useEffect(() => {
    if (!hasHint(document.cookie)) {
      setGot({ state: "out" });
      return;
    }
    let live = true;
    readPrivateTrip(slug).then((r) => live && setGot(r));
    return () => {
      live = false;
    };
  }, [slug]);
  return got;
}
