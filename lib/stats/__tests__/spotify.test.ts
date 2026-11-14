import { describe, expect, it } from "vitest";
import { dayTotals, topGenres, toTrack } from "../spotify";

const url = { spotify: "https://open.spotify.com/x" };

describe("toTrack", () => {
  it("joins a song's artists", () => {
    expect(
      toTrack({
        name: "Song",
        artists: [{ name: "A" }, { name: "B" }],
        external_urls: url,
      }),
    ).toEqual({ title: "Song", artist: "A, B", url: url.spotify });
  });

  it("names the show for a podcast episode", () => {
    expect(
      toTrack({
        type: "episode",
        name: "Episode 12",
        show: { name: "The Show" },
        external_urls: url,
      }),
    ).toEqual({ title: "Episode 12", artist: "The Show", url: url.spotify });
  });
});

const artist = (name: string, genres: string[]) => ({
  name,
  url: url.spotify,
  genres,
});

describe("topGenres", () => {
  it("weights genres by artist rank", () => {
    expect(
      topGenres([
        artist("A", ["jazz"]),
        artist("B", ["rock", "pop"]),
        artist("C", ["rock"]),
        artist("D", []),
      ]),
    ).toEqual(["rock", "jazz", "pop"]);
  });

  it("keeps only the first n", () => {
    expect(topGenres([artist("A", ["a", "b", "c"])], 2)).toHaveLength(2);
  });
});

describe("dayTotals", () => {
  const play = (at: string, minutes = 3) => ({
    title: "S",
    artist: "A",
    url: url.spotify,
    at,
    minutes,
  });
  const dayOf = (iso: string) => iso.slice(0, 10);

  it("counts plays and minutes of one day", () => {
    expect(
      dayTotals(
        [play("2026-11-14T08:00Z", 3.4), play("2026-11-13T22:00Z")],
        "2026-11-14",
        dayOf,
      ),
    ).toEqual({ plays: 1, minutes: 3, capped: false });
  });

  it("flags a day that fills every fetched play", () => {
    expect(
      dayTotals([play("2026-11-14T08:00Z")], "2026-11-14", dayOf).capped,
    ).toBe(true);
  });
});
