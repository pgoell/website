"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addFound,
  reload,
  saveSpots,
  unvote,
  vote,
} from "@/app/[locale]/(site)/trips/pick-actions";
import { metres } from "@/lib/trips/geo";
import { DEFAULT_LOOK, isLook, LOOK_KEY, type Look } from "@/lib/trips/look";
import {
  type Area,
  areasOf,
  type Candidate,
  deckOf,
  type FoundInput,
  type Kind,
  matchAfter,
  matchesOf,
  onlyMine,
  onlyTheirs,
  type PickState,
  type Vote,
  waiting,
} from "@/lib/trips/pick";
import { known, lookUp, type PlaceInfo, searchNear } from "./google-places";

export type Tab = "area" | "swipe" | "matches";
/** Which list the matches step shows: all of us, only me, waiting, or one other person's email. */
export type Filter = "both" | "mine" | "wait" | string;
export type PickProblem =
  | "signedOut"
  | "badInput"
  | "noTrip"
  | "noPlace"
  | "noKey"
  | "searchFailed"
  | "nothingFound";

type LatLng = { lat: number; lng: number };

/**
 * The swipe page: where the pin is, what Google found, the deck, my votes
 * and the matches. Google's answers live in this tab only.
 */
export function usePick({
  slug,
  initial,
  mapsKey,
  start,
}: {
  slug: string;
  initial: PickState;
  mapsKey: string | undefined;
  start: LatLng;
}) {
  const [state, setState] = useState(initial);
  const [tab, setTabState] = useState<Tab>(() =>
    deckOf(initial).length > 0
      ? "swipe"
      : initial.candidates.length > 0
        ? "matches"
        : "area",
  );
  const [pin, setPin] = useState<LatLng>(start);
  const [radius, setRadius] = useState(1000);
  const [kinds, setKinds] = useState<Kind[]>([
    "sight",
    "green",
    "museum",
    "view",
  ]);
  const [look, setLookState] = useState<Look>(DEFAULT_LOOK);
  const [infos, setInfos] = useState<Record<string, PlaceInfo>>({});
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<PickProblem | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [toast, setToast] = useState<{ id: string; must: boolean } | null>(
    null,
  );
  const [filter, setFilter] = useState<Filter>("both");
  const [selected, setSelected] = useState<string | null>(null);
  const asked = useRef(new Set<string>());

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(LOOK_KEY);
      if (isLook(stored)) setLookState(stored);
    } catch {
      // No storage here. The default look stays.
    }
    const h = window.location.hash.slice(1);
    if (h === "area" || h === "swipe" || h === "matches") setTabState(h);
  }, []);

  const setLook = useCallback((next: Look) => {
    setLookState(next);
    try {
      window.localStorage.setItem(LOOK_KEY, next);
    } catch {
      // The look still changes for this visit.
    }
  }, []);

  const setTab = useCallback((next: Tab) => {
    setTabState(next);
    setProblem(null);
    window.history.replaceState(null, "", `#${next}`);
  }, []);

  const byId = useMemo(
    () => new Map(state.candidates.map((c) => [c.id, c])),
    [state.candidates],
  );

  /** Where a place lies: our coordinates, or Google's from this visit. */
  const spotOf = useCallback(
    (id: string): LatLng | null => {
      const c = byId.get(id);
      if (c && c.lat !== null && c.lng !== null)
        return { lat: c.lat, lng: c.lng };
      const i = infos[id];
      return i ? { lat: i.lat, lng: i.lng } : null;
    },
    [byId, infos],
  );

  /** Asks Google for places not here yet, and keeps coordinates that ran out again. */
  const ensure = useCallback(
    async (ids: string[], full: boolean) => {
      if (!mapsKey) return;
      const want = ids.filter((id) => {
        const have = known(id);
        const tag = `${id}:${full}`;
        if ((have && (have.full || !full)) || asked.current.has(tag))
          return false;
        asked.current.add(tag);
        return true;
      });
      const cached = ids.map(known).filter((i): i is PlaceInfo => !!i);
      if (want.length === 0) {
        if (cached.some((i) => !infos[i.id])) {
          setInfos((m) => ({
            ...m,
            ...Object.fromEntries(cached.map((i) => [i.id, i])),
          }));
        }
        return;
      }
      const got = (
        await Promise.all(
          want.map((id) => lookUp(mapsKey, id, full).catch(() => null)),
        )
      ).filter((i): i is PlaceInfo => !!i);
      setInfos((m) => ({
        ...m,
        ...Object.fromEntries([...cached, ...got].map((i) => [i.id, i])),
      }));
      const stale = got.filter((i) => {
        const c = byId.get(i.id);
        return c && c.lat === null;
      });
      if (stale.length > 0) {
        await saveSpots(
          slug,
          stale.map((i) => ({ id: i.id, lat: i.lat, lng: i.lng })),
        );
        setState((s) => ({
          ...s,
          candidates: s.candidates.map((c) => {
            const i = stale.find((x) => x.id === c.id);
            return i ? { ...c, lat: i.lat, lng: i.lng } : c;
          }),
        }));
      }
    },
    [mapsKey, slug, byId, infos],
  );

  const deck = useMemo(() => deckOf(state), [state]);
  const top: Candidate | undefined = deck[0];

  // The card on top and the two under it, with everything a card shows.
  useEffect(() => {
    if (tab === "swipe")
      ensure(
        deck.slice(0, 3).map((c) => c.id),
        true,
      );
  }, [tab, deck, ensure]);

  const lists = useMemo(() => {
    const others = state.people.filter((p) => !p.me);
    return {
      both: matchesOf(state),
      mine: onlyMine(state),
      wait: waiting(state),
      ...Object.fromEntries(
        others.map((p) => [p.email, onlyTheirs(state, p.email)]),
      ),
    } as Record<Filter, Candidate[]> &
      Record<"both" | "mine" | "wait", Candidate[]>;
  }, [state]);
  const list = lists[filter] ?? [];

  useEffect(() => {
    if (tab === "matches")
      ensure(
        list.map((c) => c.id),
        false,
      );
  }, [tab, list, ensure]);

  /** The listed places that have a pin, grouped by where they lie. */
  const areas: Area[] = useMemo(() => {
    const spots = list.flatMap((c) => {
      const s = spotOf(c.id);
      return s ? [{ id: c.id, ...s }] : [];
    });
    return areasOf(spots);
  }, [list, spotOf]);

  /** Places we already keep within the circle around the pin. */
  const inCircle = useMemo(
    () =>
      state.candidates.filter((c) => {
        const s = spotOf(c.id);
        return s && metres([s.lng, s.lat], [pin.lng, pin.lat]) <= radius;
      }),
    [state.candidates, spotOf, pin, radius],
  );

  const search = useCallback(async () => {
    if (!mapsKey) return setProblem("noKey");
    if (kinds.length === 0) return;
    setBusy(true);
    setProblem(null);
    try {
      const found: FoundInput[] = [];
      const seen = new Set<string>();
      const answers = await Promise.allSettled(
        kinds.map((k) => searchNear(mapsKey, pin, radius, k)),
      );
      if (answers.every((a) => a.status === "rejected")) {
        return setProblem("searchFailed");
      }
      answers.forEach((a, i) => {
        if (a.status !== "fulfilled") return;
        a.value.forEach((p, rank) => {
          if (seen.has(p.id)) return;
          seen.add(p.id);
          found.push({
            id: p.id,
            kind: kinds[i] as Kind,
            rank,
            lat: p.lat,
            lng: p.lng,
          });
        });
      });
      if (found.length === 0) return setProblem("nothingFound");
      const r = await addFound(slug, found);
      if ("error" in r) return setProblem(r.error);
      setInfos((m) => ({
        ...m,
        ...Object.fromEntries(
          found.map((f) => [f.id, known(f.id) as PlaceInfo]),
        ),
      }));
      setState(r.state);
      setTab("swipe");
    } catch {
      setProblem("searchFailed");
    } finally {
      setBusy(false);
    }
  }, [mapsKey, kinds, pin, radius, slug, setTab]);

  const cast = useCallback(
    async (v: Vote) => {
      if (!top) return;
      const id = top.id;
      setState((s) => ({ ...s, mine: { ...s.mine, [id]: v } }));
      setHistory((h) => [...h, id]);
      const r = await vote(slug, id, v);
      if ("error" in r) {
        setProblem(r.error);
        setState((s) => {
          const mine = { ...s.mine };
          delete mine[id];
          return { ...s, mine };
        });
        return;
      }
      setState((s) => ({ ...s, theirs: { ...s.theirs, [id]: r.theirs } }));
      if (matchAfter(v, r.theirs, state.people)) {
        setToast({ id, must: Object.values(r.theirs).includes("must") });
        window.setTimeout(() => setToast(null), 1600);
      }
    },
    [top, slug, state.people],
  );

  const undo = useCallback(async () => {
    const id = history.at(-1);
    if (!id) return;
    setHistory((h) => h.slice(0, -1));
    setState((s) => {
      const mine = { ...s.mine };
      delete mine[id];
      // Back to the top of the deck.
      return {
        ...s,
        mine,
        candidates: s.candidates.map((c) =>
          c.id === id
            ? { ...c, addedAt: new Date().toISOString(), rank: -1 }
            : c,
        ),
      };
    });
    const r = await unvote(slug, id);
    if (r?.error) setProblem(r.error);
  }, [history, slug]);

  const refresh = useCallback(async () => {
    const r = await reload(slug);
    if ("error" in r) setProblem(r.error);
    else setState(r.state);
  }, [slug]);

  // Coming back to the tab: the other person may have swiped meanwhile.
  useEffect(() => {
    const on = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, [refresh]);

  return {
    state,
    tab,
    setTab,
    pin,
    setPin,
    radius,
    setRadius,
    kinds,
    toggleKind: (k: Kind) =>
      setKinds((ks) =>
        ks.includes(k) ? ks.filter((x) => x !== k) : [...ks, k],
      ),
    look,
    setLook,
    infos,
    busy,
    problem,
    search,
    deck,
    top,
    cast,
    undo,
    canUndo: history.length > 0,
    toast,
    filter,
    setFilter: (f: Filter) => {
      setFilter(f);
      setSelected(null);
    },
    lists,
    list,
    areas,
    selected,
    setSelected,
    spotOf,
    inCircle,
    hasKey: !!mapsKey,
  };
}

export type Pick = ReturnType<typeof usePick>;
