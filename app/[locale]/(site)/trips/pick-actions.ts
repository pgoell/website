"use server";

import { cookies } from "next/headers";
import type { Sql } from "postgres";
import { readSession, SESSION_COOKIE, type User } from "@/lib/trips/auth";
import { db } from "@/lib/trips/db";
import { tripIdOf } from "@/lib/trips/edit";
import { isSlug } from "@/lib/trips/input";
import {
  foundInput,
  isPlaceId,
  isVote,
  type PickState,
  spotsInput,
  type Vote,
} from "@/lib/trips/pick";
import * as pick from "@/lib/trips/pick-db";

/*
 * Swipe actions for someone signed in. As in actions.ts, each reads the
 * session cookie itself, and a failure the page can name comes back as a code.
 */

export type PickError = "signedOut" | "badInput" | "noTrip" | "noPlace";

type Ready = { sql: Sql; tripId: number; user: User };

async function begin(slug: unknown): Promise<Ready | { error: PickError }> {
  const user = await readSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!user) return { error: "signedOut" };
  if (!isSlug(slug)) return { error: "badInput" };
  const sql = await db();
  const tripId = await tripIdOf(sql, slug);
  if (!tripId) return { error: "noTrip" };
  return { sql, tripId, user };
}

const state = (r: Ready) =>
  pick.loadPick(r.sql, r.tripId, r.user, process.env.ALLOWED_EMAILS);

/** Keeps what a search near a pin found, and answers with the whole state. */
export async function addFound(
  slug: string,
  found: unknown,
): Promise<{ error: PickError } | { state: PickState }> {
  const r = await begin(slug);
  if ("error" in r) return r;
  const list = foundInput(found);
  if (!list) return { error: "badInput" };
  await pick.addFound(r.sql, r.tripId, r.user.email, list);
  return { state: await state(r) };
}

/** My yes, no or must on a place, answered with the others' votes on it. */
export async function vote(
  slug: string,
  placeId: unknown,
  value: unknown,
): Promise<{ error: PickError } | { theirs: Record<string, Vote> }> {
  const r = await begin(slug);
  if ("error" in r) return r;
  if (!isPlaceId(placeId) || !isVote(value)) return { error: "badInput" };
  const theirs = await pick.castVote(r.sql, r.tripId, r.user, placeId, value);
  return theirs ? { theirs } : { error: "noPlace" };
}

/** Takes my vote on a place back. */
export async function unvote(
  slug: string,
  placeId: unknown,
): Promise<{ error: PickError } | undefined> {
  const r = await begin(slug);
  if ("error" in r) return r;
  if (!isPlaceId(placeId)) return { error: "badInput" };
  await pick.takeBack(r.sql, r.tripId, r.user.email, placeId);
}

/** Coordinates Google just gave again, kept for another 30 days. */
export async function saveSpots(
  slug: string,
  spots: unknown,
): Promise<{ error: PickError } | undefined> {
  const r = await begin(slug);
  if ("error" in r) return r;
  const list = spotsInput(spots);
  if (!list) return { error: "badInput" };
  await pick.saveSpots(r.sql, r.tripId, list);
}

/** The state again, for a page that has been open a while. */
export async function reload(
  slug: string,
): Promise<{ error: PickError } | { state: PickState }> {
  const r = await begin(slug);
  if ("error" in r) return r;
  return { state: await state(r) };
}
