export const TIME_ZONE = "Europe/Berlin";

function parts(date: Date, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    ...options,
  }).formatToParts(date);
}

/** Local hour in Gelnhausen as a fraction, e.g. 18.5 for half past six. */
export function berlinHour(date: Date): number {
  const p = parts(date, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const get = (type: string) => Number(p.find((x) => x.type === type)?.value);
  return get("hour") + get("minute") / 60;
}

/** Berlin-local month, 1 to 12. */
export function berlinMonth(date: Date): number {
  return Number(parts(date, { month: "numeric" })[0]?.value);
}

/** Berlin wall-clock time of an instant, read as if it were UTC. */
function wallAsUtc(date: Date): number {
  const p = parts(date, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  });
  const get = (type: string) => Number(p.find((x) => x.type === type)?.value);
  return Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
  );
}

/** The instant of a Berlin-local `?date=YYYY-MM-DD` and `?time=HH[:MM]`; a missing part is taken from `now`. */
export function berlinInstant(
  date: string | null,
  time: string | null,
  now: Date,
): Date {
  const wall = new Date(wallAsUtc(now));
  if (date) {
    const [y, m, d] = date.split("-").map(Number);
    wall.setUTCFullYear(y || wall.getUTCFullYear(), (m || 1) - 1, d || 1);
  }
  if (time) {
    const [h, m] = time.split(":").map(Number);
    wall.setUTCHours(h || 0, m || 0);
  }
  // two passes settle the CET or CEST offset on the target day
  let t = wall.getTime();
  for (let i = 0; i < 2; i++) t = wall.getTime() - (wallAsUtc(new Date(t)) - t);
  return new Date(t);
}

/** "CET" in winter, "CEST" in summer. */
export function berlinZoneName(date: Date): string {
  const p = parts(date, { timeZoneName: "short" });
  const name = p.find((x) => x.type === "timeZoneName")?.value ?? "CET";
  return name === "GMT+1" ? "CET" : name === "GMT+2" ? "CEST" : name;
}

/** Time since `iso` as a shutter-style readout: "40M", "2H", "3D". */
export function sinceLabel(iso: string, now: Date): string {
  const min = Math.max(
    0,
    Math.floor((now.getTime() - Date.parse(iso)) / 60000),
  );
  if (min < 60) return `${min}M`;
  if (min < 60 * 24) return `${Math.floor(min / 60)}H`;
  return `${Math.floor(min / 1440)}D`;
}
