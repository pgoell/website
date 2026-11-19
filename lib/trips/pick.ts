/**
 * Swipe: Google finds places near a pin, each person says yes, no or must,
 * and the places everyone wants become the matches. Pure logic, no React.
 *
 * Google's terms: we keep a place's ID for good and its coordinates for 30
 * days. Names, photos, ratings and the rest are fetched live and never stored.
 */

import { metres } from "./geo";
import type { LngLat } from "./types";

export type Vote = "yes" | "no" | "must";
export const VOTES: readonly Vote[] = ["yes", "no", "must"];

/** What kinds of places to ask Google for. */
export type Kind = "sight" | "food" | "shop" | "green" | "museum" | "view";

/**
 * Google's place types for each kind (table A of the Places API). The first
 * type is the safest: if Google refuses the list, the search tries it alone.
 */
export const KINDS: Record<Kind, readonly string[]> = {
  sight: ["tourist_attraction", "historical_landmark"],
  food: ["restaurant", "cafe", "bar"],
  shop: ["market", "shopping_mall", "book_store", "gift_shop"],
  green: ["park", "botanical_garden"],
  museum: ["museum", "art_gallery"],
  view: ["observation_deck"],
};
export const KIND_NAMES = Object.keys(KINDS) as Kind[];

/** Radius choices around the pin, in metres. */
export const RADII = [500, 1000, 2000, 3000] as const;
/** Google answers at most this many places per search. */
export const PER_SEARCH = 20;
/** How long Google lets us keep a place's coordinates. */
export const SPOT_DAYS = 30;

/** A place Google found, as we keep it. */
export type Candidate = {
  id: string;
  kind: Kind;
  /** Google's order in its search, most popular first. */
  rank: number;
  /** Null once the coordinates are older than Google lets us keep them. */
  lat: number | null;
  lng: number | null;
  addedAt: string;
};

export type Person = { email: string; name: string; me: boolean };

/** Everything the swipe page knows, for one person. */
export type PickState = {
  candidates: Candidate[];
  /** My votes by place. */
  mine: Record<string, Vote>;
  /**
   * The others' votes by place and email, only for places I have voted on:
   * nobody sees the other answer before giving their own.
   */
  theirs: Record<string, Record<string, Vote>>;
  people: Person[];
};

export const liked = (v: Vote | undefined): boolean =>
  v === "yes" || v === "must";
export const isVote = (v: unknown): v is Vote =>
  typeof v === "string" && (VOTES as readonly string[]).includes(v);
export const isKind = (v: unknown): v is Kind =>
  typeof v === "string" && v in KINDS;

/** The others in the trip, everyone but me. */
export const others = (s: PickState) => s.people.filter((p) => !p.me);

/** What I have not voted on yet: the newest search first, then Google's order. */
export function deckOf(s: PickState): Candidate[] {
  return s.candidates
    .filter((c) => !s.mine[c.id])
    .sort((a, b) => b.addedAt.localeCompare(a.addedAt) || a.rank - b.rank);
}

/** Places everyone said yes or must to. */
export function matchesOf(s: PickState): Candidate[] {
  return s.candidates.filter(
    (c) =>
      liked(s.mine[c.id]) &&
      others(s).every((p) => liked(s.theirs[c.id]?.[p.email])),
  );
}

/** I want it, and someone else has seen it and does not. */
export function onlyMine(s: PickState): Candidate[] {
  return s.candidates.filter((c) => {
    if (!liked(s.mine[c.id])) return false;
    const t = s.theirs[c.id] ?? {};
    return others(s).some((p) => t[p.email] && !liked(t[p.email]));
  });
}

/** They want it, I said no. */
export function onlyTheirs(s: PickState, email: string): Candidate[] {
  return s.candidates.filter(
    (c) =>
      s.mine[c.id] === "no" &&
      liked(s.theirs[c.id]?.[email] as Vote | undefined),
  );
}

/** I want it, and someone else has not seen it yet. */
export function waiting(s: PickState): Candidate[] {
  return s.candidates.filter(
    (c) =>
      liked(s.mine[c.id]) && others(s).some((p) => !s.theirs[c.id]?.[p.email]),
  );
}

/** Someone called it a must. */
export const isMust = (s: PickState, id: string): boolean =>
  s.mine[id] === "must" ||
  Object.values(s.theirs[id] ?? {}).some((v) => v === "must");

/** A vote is a match once every other person likes it too. */
export function matchAfter(
  vote: Vote,
  theirs: Record<string, Vote>,
  people: Person[],
): boolean {
  const rest = people.filter((p) => !p.me);
  return (
    liked(vote) && rest.length > 0 && rest.every((p) => liked(theirs[p.email]))
  );
}

type Spot = { id: string; lat: number; lng: number };

export type Area = {
  ids: string[];
  center: LngLat;
  /** Metres from the center to the farthest place in it. */
  reach: number;
};

/**
 * Places that lie close together, as one area each: a place within `near`
 * metres of any place of an area belongs to it. Biggest area first.
 */
export function areasOf(spots: Spot[], near = 900): Area[] {
  const seen = new Set<string>();
  const areas: Area[] = [];
  for (const s of spots) {
    if (seen.has(s.id)) continue;
    const group: Spot[] = [s];
    seen.add(s.id);
    for (let i = 0; i < group.length; i++) {
      const a = group[i] as Spot;
      for (const b of spots) {
        if (seen.has(b.id)) continue;
        if (metres([a.lng, a.lat], [b.lng, b.lat]) <= near) {
          seen.add(b.id);
          group.push(b);
        }
      }
    }
    const lng = group.reduce((t, g) => t + g.lng, 0) / group.length;
    const lat = group.reduce((t, g) => t + g.lat, 0) / group.length;
    const center: LngLat = [lng, lat];
    areas.push({
      ids: group.map((g) => g.id),
      center,
      reach: Math.max(...group.map((g) => metres(center, [g.lng, g.lat]))),
    });
  }
  return areas.sort((a, b) => b.ids.length - a.ids.length);
}

/** About how long an area takes, by how many places it holds. */
export const areaTime = (n: number): "hours" | "half" | "day" =>
  n <= 2 ? "hours" : n <= 4 ? "half" : "day";

/** Most places one rough day holds. */
export const PER_DAY = 6;

/**
 * A first idea of days: one area a day, a big area split, small areas join
 * the nearest day within 3 km. Not a plan, only where things are.
 */
export function roughDays(areas: Area[]): string[][] {
  const days: { ids: string[]; center: LngLat }[] = [];
  const small: Area[] = [];
  for (const a of areas) {
    if (a.ids.length < 3) {
      small.push(a);
      continue;
    }
    for (let i = 0; i < a.ids.length; i += PER_DAY) {
      days.push({ ids: a.ids.slice(i, i + PER_DAY), center: a.center });
    }
  }
  for (const a of small) {
    let best: (typeof days)[number] | undefined;
    let d = 3000;
    for (const day of days) {
      const k = metres(day.center, a.center);
      if (k <= d && day.ids.length + a.ids.length <= PER_DAY + 2) {
        d = k;
        best = day;
      }
    }
    if (best) best.ids.push(...a.ids);
    else days.push({ ids: [...a.ids], center: a.center });
  }
  return days.map((d) => d.ids);
}

/**
 * The people of a trip: every address in `ALLOWED_EMAILS`, named by their
 * own votes where they have voted, else by the address. Me first.
 */
export function peopleOf(
  allowed: string | undefined,
  me: { email: string; name: string },
  names: Record<string, string>,
): Person[] {
  const emails = (allowed ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const mine = me.email.toLowerCase();
  const rest = [...new Set(emails)].filter((e) => e !== mine);
  const fromEmail = (e: string) => {
    const local = e.split("@")[0] ?? e;
    return local.charAt(0).toUpperCase() + local.slice(1);
  };
  return [
    { email: mine, name: me.name, me: true },
    ...rest.map((e) => ({
      email: e,
      name: names[e] ?? fromEmail(e),
      me: false,
    })),
  ];
}

/** Coordinates Google still lets us keep. */
export const spotFresh = (at: Date | null, now = new Date()): boolean =>
  at !== null && now.getTime() - at.getTime() < SPOT_DAYS * 86_400_000;

/** One found place as the page sends it. */
export type FoundInput = {
  id: string;
  kind: Kind;
  rank: number;
  lat: number;
  lng: number;
};

const GOOGLE_ID = /^[\w-]{1,300}$/;
export const isPlaceId = (v: unknown): v is string =>
  typeof v === "string" && GOOGLE_ID.test(v);
const isLat = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= 90;
const isLng = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= 180;

/** Most places one search adds: every kind at its most. */
export const MOST_FOUND = KIND_NAMES.length * PER_SEARCH;

/** The found places, checked, or null when anything is off. */
export function foundInput(v: unknown): FoundInput[] | null {
  if (!Array.isArray(v) || v.length > MOST_FOUND) return null;
  const out: FoundInput[] = [];
  for (const f of v) {
    if (typeof f !== "object" || f === null) return null;
    const { id, kind, rank, lat, lng } = f as Record<string, unknown>;
    if (!isPlaceId(id) || !isKind(kind) || !isLat(lat) || !isLng(lng)) {
      return null;
    }
    if (
      typeof rank !== "number" ||
      !Number.isInteger(rank) ||
      rank < 0 ||
      rank > 1000
    ) {
      return null;
    }
    out.push({ id, kind, rank, lat, lng });
  }
  return out;
}

/** Fresh coordinates for places, as the page sends them after asking Google. */
export function spotsInput(v: unknown): Spot[] | null {
  if (!Array.isArray(v) || v.length > 200) return null;
  const out: Spot[] = [];
  for (const f of v) {
    if (typeof f !== "object" || f === null) return null;
    const { id, lat, lng } = f as Record<string, unknown>;
    if (!isPlaceId(id) || !isLat(lat) || !isLng(lng)) return null;
    out.push({ id, lat, lng });
  }
  return out;
}
