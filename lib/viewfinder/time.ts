export const TIME_ZONE = "Europe/Berlin";

/** Parses a `?time=HH` or `?time=HH:MM` override into a fractional hour. */
export function parseTimeOverride(value: string | null): number | null {
  if (value === null) return null;
  const [h, m] = value.split(":");
  return (Number(h) || 0) + (Number(m) || 0) / 60;
}

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

/** "CET" in winter, "CEST" in summer. */
export function berlinZoneName(date: Date): string {
  const p = parts(date, { timeZoneName: "short" });
  const name = p.find((x) => x.type === "timeZoneName")?.value ?? "CET";
  return name === "GMT+1" ? "CET" : name === "GMT+2" ? "CEST" : name;
}

export function formatHour(hour: number): string {
  const total = Math.round(hour * 60);
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
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
