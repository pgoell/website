import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/*
 * A seatbelt: this repo is public, and bookings live only in the database.
 * Fails when a trips file holds something that looks like a price or a
 * booking number.
 */

const ROOTS = [
  "lib/trips",
  "components/trips",
  "scripts/trips",
  "app/[locale]/(site)/trips",
  "app/api/trips",
  "trips",
];
// Built map styles (long numbers, no bookings) and this file (its own patterns).
const SKIP = /map-style.*\.json$|no-bookings\.test\.ts$/;

const SUSPECT: [string, RegExp][] = [
  ["a price", /[¥€£$]\s?\d/],
  ["a price", /\b\d[\d,.]*\s?(EUR|JPY|USD|TZS|CHF|GBP|CNY)\b/i],
  ["a booking number", /\b\d{8,}\b/],
  ["a PIN", /\bPIN\b/],
];

function files(dir: string): string[] {
  let entries: ReturnType<typeof readdirSync>;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries.flatMap((e) => {
    const path = join(dir, e.name);
    if (e.isDirectory()) return files(path);
    return /\.(ts|tsx|json|md)$/.test(e.name) && !SKIP.test(e.name)
      ? [path]
      : [];
  });
}

describe("no booking data in the public repo", () => {
  it("finds no price, booking number or PIN in a trips file", () => {
    const found: string[] = [];
    for (const file of ROOTS.flatMap(files)) {
      readFileSync(file, "utf8")
        .split("\n")
        .forEach((line, i) => {
          for (const [what, re] of SUSPECT) {
            if (re.test(line)) found.push(`${file}:${i + 1}: ${what}`);
          }
        });
    }
    expect(found).toEqual([]);
  });
});
