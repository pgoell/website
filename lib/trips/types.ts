/** A trip as a visitor sees it, and as the database holds it. */

export type LngLat = [number, number];

export interface TripStop {
  position: number;
  name: string;
  /** IANA zone, such as "Africa/Dar_es_Salaam". */
  tz: string;
  lat: number;
  lng: number;
  /** First and last day at the stop, as YYYY-MM-DD. */
  arrive: string;
  depart: string;
}

export interface TripLeg {
  mode: "flight" | "ground";
  title: string;
  how: string;
  leaveDate: string;
  /** Clock time, or "" when the plan holds none. */
  leave: string;
  leaveTz: string;
  arriveDate: string;
  arrive: string;
  arriveTz: string;
  note: string | null;
  /** A flight holds its two ends, a ground leg the whole line. */
  path: LngLat[];
}

export interface TripPlace {
  name: string;
  url: string | null;
  note: string | null;
  tags: string | null;
  day: string | null;
  dayOrder: number | null;
  lat: number | null;
  lng: number | null;
}

export interface TripCard {
  slug: string;
  name: string;
  startDate: string;
  endDate: string;
  /** The stops' names in order. */
  stops: string[];
}

export interface Trip extends Omit<TripCard, "stops"> {
  stops: TripStop[];
  legs: TripLeg[];
  places: TripPlace[];
  /** A note for a day, by date. */
  dayNotes: Record<string, string>;
}

/*
 * What the database holds. Only signed-in people see a trip whole; a visitor
 * gets the `Trip` above, made by `shownTrip`.
 */

/**
 * A point of a leg's line, and how the stretch from the one before runs:
 * along roads, straight, or along a line drawn by hand.
 */
export type DrawnPoint = { at: LngLat; road: boolean; line?: LngLat[] };

export interface StoredStop extends TripStop {
  id: number;
}

export interface Booking {
  id: number;
  stopPosition: number | null;
  kind: string;
  title: string;
  startAt: string;
  startTz: string;
  endAt: string;
  endTz: string;
  confirmation: string | null;
  detail: Record<string, string>;
}

export interface StoredLeg extends TripLeg {
  id: number;
  cost: string | null;
  /** The line was drawn in the app and stands in for the imported one. */
  drawn: boolean;
  /** The points it was drawn through. Null for a line from before they were kept. */
  points: DrawnPoint[] | null;
}

export type PlaceStatus = "idea" | "confirmed";

export interface StoredPlace extends TripPlace {
  id: number;
  status: PlaceStatus;
  googlePlaceId: string | null;
  createdBy: string;
}

export interface StoredTrip {
  id: number;
  slug: string;
  name: string;
  startDate: string;
  endDate: string;
  /** Anyone may read it. Changes still need a sign-in. */
  public: boolean;
  stops: StoredStop[];
  bookings: Booking[];
  legs: StoredLeg[];
  places: StoredPlace[];
  dayNotes: Record<string, string>;
}

/** What the booking import reads: everything that comes from the vault, nothing people enter. */
export interface TripImport {
  slug: string;
  name: string;
  startDate: string;
  endDate: string;
  public: boolean;
  stops: Omit<StoredStop, "id" | "position">[];
  bookings: Omit<Booking, "id">[];
  legs: Omit<StoredLeg, "id" | "drawn" | "points">[];
  /** Day notes to start with, by date. A note saved in the app wins. */
  dayNotes?: Record<string, string>;
}
