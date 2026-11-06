/** Kasten, Pascal's notebook: the book he is reading now and how far in. */

const HOUR = 3600;
/** A book not opened for this long is no longer "reading now". */
const STALE_DAYS = 60;

export interface Book {
  title: string;
  author: string | null;
  /** Share of the book read, 0 to 1; null when the reader has not said. */
  progress: number | null;
}

/** What Kasten's `GET /agent/reading` answers. */
interface ApiReading {
  title?: unknown;
  author?: unknown;
  progress?: unknown;
  read_at?: unknown;
}

/** The book to show, or null when the answer is malformed or the book went stale. */
export function toBook(raw: unknown, now: Date): Book | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as ApiReading;
  if (typeof r.title !== "string" || r.title.trim() === "") return null;
  if (typeof r.read_at !== "string") return null;
  const readAt = Date.parse(r.read_at);
  if (Number.isNaN(readAt)) return null;
  if (now.getTime() - readAt > STALE_DAYS * 86400_000) return null;
  const progress =
    typeof r.progress === "number" && Number.isFinite(r.progress)
      ? Math.min(1, Math.max(0, r.progress))
      : null;
  const author =
    typeof r.author === "string" && r.author.trim() !== ""
      ? r.author.trim()
      : null;
  return { title: r.title.trim(), author, progress };
}

/** The current book; null without `KASTEN_URL` and `KASTEN_TOKEN`, or when Kasten fails. */
export async function getReading(): Promise<Book | null> {
  const { KASTEN_URL, KASTEN_TOKEN } = process.env;
  if (!KASTEN_URL || !KASTEN_TOKEN) return null;
  try {
    const res = await fetch(new URL("/agent/reading", KASTEN_URL), {
      headers: { Authorization: `Bearer ${KASTEN_TOKEN}` },
      next: { revalidate: HOUR },
    });
    // 204 means no book has a reading position
    if (res.status === 204) return null;
    if (!res.ok) {
      console.error(`Kasten reading failed: ${res.status}`);
      return null;
    }
    return toBook(await res.json(), new Date());
  } catch (err) {
    console.error("Kasten reading failed:", err);
    return null;
  }
}
