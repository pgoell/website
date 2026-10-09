/** Where the sun stands over Gelnhausen: a low-precision solar position, good to about 0.01 degrees. */

export const GELNHAUSEN = { lat: 50.2, lon: 9.19 };

export interface SunPosition {
  /** Degrees above the horizon, without refraction. */
  alt: number;
  /** Degrees clockwise from north. */
  az: number;
  /** True before solar noon. */
  rising: boolean;
}

const RAD = Math.PI / 180;

export function sunAt(date: Date, place = GELNHAUSEN): SunPosition {
  // days since J2000.0
  const d = date.getTime() / 86400000 + 2440587.5 - 2451545;
  const anomaly = (357.529 + 0.98560028 * d) * RAD;
  const longitude =
    (280.459 +
      0.98564736 * d +
      1.915 * Math.sin(anomaly) +
      0.02 * Math.sin(2 * anomaly)) *
    RAD;
  const tilt = (23.439 - 0.00000036 * d) * RAD;
  const ra = Math.atan2(
    Math.cos(tilt) * Math.sin(longitude),
    Math.cos(longitude),
  );
  const dec = Math.asin(Math.sin(tilt) * Math.sin(longitude));
  const sidereal = (280.46061837 + 360.98564736629 * d + place.lon) * RAD;
  const h = sidereal - ra;
  const lat = place.lat * RAD;
  const alt = Math.asin(
    Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(h),
  );
  const az = Math.atan2(
    Math.sin(h),
    Math.cos(h) * Math.sin(lat) - Math.tan(dec) * Math.cos(lat),
  );
  return {
    alt: alt / RAD,
    az: (((az / RAD + 180) % 360) + 360) % 360,
    rising: Math.sin(h) < 0,
  };
}
