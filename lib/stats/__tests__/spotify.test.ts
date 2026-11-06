import { describe, expect, it } from "vitest";
import { toTrack } from "../spotify";

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
