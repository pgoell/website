import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Every change to a trip needs a valid session cookie. Without one, each
 * server action and the road lookup refuse before they touch the database
 * or the router.
 */

const jar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      jar.has(name) ? { name, value: jar.get(name) } : undefined,
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
const db = vi.fn();
vi.mock("@/lib/trips/db", () => ({ db }));
const roadsThrough = vi.fn();
vi.mock("@/lib/trips/road", () => ({ roadsThrough }));

const actions = await import("@/app/[locale]/(site)/trips/actions");
const road = await import("@/app/api/trips/road/route");

const calls: [string, () => Promise<unknown>][] = [
  ["savePlace", () => actions.savePlace("one", { name: "x", status: "idea" })],
  ["deletePlace", () => actions.deletePlace("one", 1)],
  ["orderDay", () => actions.orderDay("one", "2027-03-21", [1, 2])],
  ["saveDayNote", () => actions.saveDayNote("one", "2027-03-21", "x")],
  ["setGooglePlaceId", () => actions.setGooglePlaceId("one", 1, "none")],
  ["drawLeg", () => actions.drawLeg("one", "2027-03-21", "x", [])],
];

describe("signed out", () => {
  beforeEach(() => {
    jar.clear();
    vi.stubEnv("AUTH_SECRET", "a secret only this test knows, long enough");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    db.mockClear();
    roadsThrough.mockClear();
  });

  it.each(calls)("%s refuses without a session", async (_, call) => {
    expect(await call()).toEqual({ error: "signedOut" });
    expect(db).not.toHaveBeenCalled();
  });

  it.each(calls)("%s refuses with only the hint cookie", async (_, call) => {
    jar.set("trips_signed_in", "1");
    expect(await call()).toEqual({ error: "signedOut" });
    expect(db).not.toHaveBeenCalled();
  });

  it.each(calls)("%s refuses a forged session", async (_, call) => {
    jar.set("trips_session", "eyJhbGciOiJIUzI1NiJ9.e30.forged");
    expect(await call()).toEqual({ error: "signedOut" });
    expect(db).not.toHaveBeenCalled();
  });

  it("the road lookup answers 401 and asks no router", async () => {
    const res = await road.GET(
      new Request("http://localhost/api/trips/road?through=1,2;3,4"),
    );
    expect(res.status).toBe(401);
    expect(roadsThrough).not.toHaveBeenCalled();
  });
});
