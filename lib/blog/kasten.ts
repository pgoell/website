/** Blog posts Pascal writes in Kasten and marks `publish: true`. */

const TEN_MINUTES = 600;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export interface KastenPostMeta {
  slug: string;
  title: string;
  date: string;
  description: string;
  /** null means the post shows on both the English and the German blog. */
  lang: string | null;
  translationKey?: string;
}

export interface KastenPost extends KastenPostMeta {
  /** Plain markdown; Kasten has already turned wikilinks into links or words. */
  body: string;
}

const text = (v: unknown): string | null =>
  typeof v === "string" && v.trim() !== "" ? v.trim() : null;

/** One entry of `GET /agent/posts`, or null when it is malformed. */
export function toPostMeta(raw: unknown): KastenPostMeta | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const slug = text(r.slug);
  const title = text(r.title);
  const date = text(r.date);
  if (!slug || !SLUG.test(slug) || !title || !date || !DATE.test(date))
    return null;
  const key = text(r.translation_key);
  return {
    slug,
    title,
    date,
    description: text(r.description) ?? "",
    lang: text(r.lang)?.toLowerCase() ?? null,
    ...(key ? { translationKey: key } : {}),
  };
}

/** The answer of `GET /agent/posts/{slug}`, or null when it is malformed. */
export function toPost(raw: unknown): KastenPost | null {
  const meta = toPostMeta(raw);
  const body = (raw as { body?: unknown } | null)?.body;
  return meta && typeof body === "string" ? { ...meta, body } : null;
}

/** Whether a post belongs on the blog in `locale`. */
export const showsIn = (post: { lang: string | null }, locale: string) =>
  post.lang === null || post.lang === locale;

async function kasten(path: string): Promise<unknown> {
  const { KASTEN_URL, KASTEN_TOKEN } = process.env;
  if (!KASTEN_URL || !KASTEN_TOKEN) return null;
  try {
    const res = await fetch(new URL(path, KASTEN_URL), {
      headers: { Authorization: `Bearer ${KASTEN_TOKEN}` },
      next: { revalidate: TEN_MINUTES },
    });
    if (res.status === 404) return null;
    if (!res.ok) {
      console.error(`Kasten posts failed: ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error("Kasten posts failed:", err);
    return null;
  }
}

/** Published posts for `locale`; none without `KASTEN_URL` and `KASTEN_TOKEN`, or when Kasten fails. */
export async function getKastenPosts(
  locale: string,
): Promise<KastenPostMeta[]> {
  const raw = await kasten("/agent/posts");
  if (!Array.isArray(raw)) return [];
  return raw
    .map(toPostMeta)
    .filter((p): p is KastenPostMeta => p !== null && showsIn(p, locale));
}

/** One published post in `locale`, or null. */
export async function getKastenPost(
  locale: string,
  slug: string,
): Promise<KastenPost | null> {
  if (!SLUG.test(slug)) return null;
  const post = toPost(
    await kasten(`/agent/posts/${slug}?lang=${encodeURIComponent(locale)}`),
  );
  return post && showsIn(post, locale) ? post : null;
}
