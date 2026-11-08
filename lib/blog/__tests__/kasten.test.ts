import { describe, expect, it } from "vitest";
import { showsIn, toPost, toPostMeta } from "../kasten";

const base = {
  slug: "how-this-site-was-made",
  title: "How this site was made",
  date: "2026-11-08",
  description: "The viewfinder home page",
  lang: "EN",
  translation_key: "viewfinder",
};

describe("toPostMeta", () => {
  it("keeps the fields the blog shows", () => {
    expect(toPostMeta(base)).toEqual({
      slug: "how-this-site-was-made",
      title: "How this site was made",
      date: "2026-11-08",
      description: "The viewfinder home page",
      lang: "en",
      translationKey: "viewfinder",
    });
  });

  it("fills a missing description and language", () => {
    const meta = toPostMeta({ ...base, description: null, lang: null });
    expect(meta?.description).toBe("");
    expect(meta?.lang).toBeNull();
  });

  it("refuses a bad slug, title or date", () => {
    expect(toPostMeta({ ...base, slug: "../etc" })).toBeNull();
    expect(toPostMeta({ ...base, title: " " })).toBeNull();
    expect(toPostMeta({ ...base, date: "yesterday" })).toBeNull();
    expect(toPostMeta(null)).toBeNull();
  });
});

describe("toPost", () => {
  it("needs a body", () => {
    expect(toPost(base)).toBeNull();
    expect(toPost({ ...base, body: "Hi" })?.body).toBe("Hi");
  });
});

describe("showsIn", () => {
  it("shows a post with no language on both blogs", () => {
    expect(showsIn({ lang: null }, "de")).toBe(true);
    expect(showsIn({ lang: "en" }, "de")).toBe(false);
    expect(showsIn({ lang: "de" }, "de")).toBe(true);
  });
});
