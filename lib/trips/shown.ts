/** What of a stored trip a visitor or the trip pages may see. Pure. */

import type { TripHead } from "./store";
import type { StoredTrip, Trip, TripCard } from "./types";

export type ShownCard = TripCard & { public: boolean };

export const shownCard = ({ public: open, ...card }: TripHead): ShownCard => ({
  ...card,
  public: open,
});

/**
 * The plan as made: no bookings, no ideas, no prices, and no names of who
 * added what. Links in places are web links only, since the text comes from
 * a form.
 */
export function shownTrip(trip: StoredTrip): Trip {
  return {
    slug: trip.slug,
    name: trip.name,
    startDate: trip.startDate,
    endDate: trip.endDate,
    stops: trip.stops.map(({ id: _, ...s }) => s),
    legs: trip.legs.map(
      ({ id: _, cost: __, drawn: ___, points: ____, own: _____, ...l }) => l,
    ),
    places: trip.places
      .filter((p) => p.status === "confirmed")
      .map(({ name, url, note, tags, day, dayOrder, lat, lng }) => ({
        name,
        url: url && /^https?:\/\//.test(url) ? url : null,
        note,
        tags,
        day,
        dayOrder,
        lat,
        lng,
      })),
    dayNotes: trip.dayNotes,
  };
}
