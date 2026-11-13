/** An open trip as the trips app hands it out (`GET /api/trips/{slug}`). */

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
