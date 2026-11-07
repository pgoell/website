import { isHiddenPage } from "@/lib/hidden-pages";

/** The sections that share the camera-screen frame, in tab order. */
export const ALL_SITE_SECTIONS = [
  { id: "writing", path: "/blog" },
  { id: "games", path: "/games" },
  { id: "tools", path: "/tools" },
] as const;

/** The sections that are switched on; hidden ones get no tab. */
export const SITE_SECTIONS = ALL_SITE_SECTIONS.filter(
  (sec) => !isHiddenPage(sec.path),
);

/** About 200 words a minute, never less than one minute. */
export function readingMinutes(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Turns a heading into a URL id: "Why the real sun" becomes "why-the-real-sun". */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** The level-two headings of a markdown text, in order, with their ids. */
export function headings(markdown: string): { id: string; text: string }[] {
  const out: { id: string; text: string }[] = [];
  let fence = false;
  for (const line of markdown.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) fence = !fence;
    if (fence) continue;
    const m = /^##\s+(.+?)\s*#*\s*$/.exec(line);
    if (m) {
      const text = (m[1] as string).replace(/[*_`]/g, "");
      out.push({ id: slugify(text), text });
    }
  }
  return out;
}
