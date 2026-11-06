import { describe, expect, it } from "vitest";
import { blurFor, PLANES, restBlur } from "../focus";

describe("blurFor", () => {
  it("keeps the focused plane sharp", () => {
    for (const p of PLANES) expect(blurFor(p.id, p.id, 1440)).toBe(0);
  });

  it("blurs a plane more the further it lies from the focus", () => {
    expect(blurFor("near", "hills", 1440)).toBeGreaterThan(
      blurFor("church", "hills", 1440),
    );
    expect(blurFor("church", "hills", 1440)).toBeGreaterThan(
      blurFor("town", "hills", 1440),
    );
  });

  it("caps the blur and scales it with the frame width", () => {
    expect(blurFor("sky", "near", 1440)).toBeLessThanOrEqual(6);
    expect(blurFor("sky", "near", 720)).toBeCloseTo(
      blurFor("sky", "near", 1440) / 2,
    );
  });
});

describe("restBlur", () => {
  it("softens only the hills", () => {
    expect(restBlur("hills", 2600)).toBe(1);
    expect(restBlur("church", 2600)).toBe(0);
  });
});
