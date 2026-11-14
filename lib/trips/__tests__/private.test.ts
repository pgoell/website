import { describe, expect, it } from "vitest";
import { hasHint, signInHref } from "../private";

describe("hasHint", () => {
  it("finds the sign-in hint among other cookies", () => {
    expect(hasHint("NEXT_LOCALE=de; trips_signed_in=1")).toBe(true);
    expect(hasHint("trips_signed_in=1")).toBe(true);
  });

  it("ignores lookalikes and an empty jar", () => {
    expect(hasHint("")).toBe(false);
    expect(hasHint("NEXT_LOCALE=de")).toBe(false);
    expect(hasHint("trips_signed_in=0")).toBe(false);
    expect(hasHint("xtrips_signed_in=1")).toBe(false);
  });
});

describe("signInHref", () => {
  it("sends the return address along, encoded", () => {
    expect(signInHref("https://pgoell.com/en/trips?x=1")).toBe(
      "/auth/login?next=https%3A%2F%2Fpgoell.com%2Fen%2Ftrips%3Fx%3D1",
    );
  });
});
