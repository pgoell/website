import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { getKastenPost, getKastenPosts } from "@/lib/blog/kasten";

const contentDir = path.join(process.cwd(), "content");

export interface PostMeta {
  slug: string;
  title: string;
  date: string;
  description: string;
  translationKey?: string;
}

export interface Post {
  meta: PostMeta;
  content: string;
  /** Repo posts are MDX; Kasten posts are plain markdown, so nothing in a note runs as code. */
  format: "mdx" | "md";
}

/** Slugs of the MDX posts in the repo; Kasten posts render on first request. */
export async function getPostSlugs(locale: string): Promise<string[]> {
  const localeDir = path.join(contentDir, locale);
  if (!fs.existsSync(localeDir)) return [];

  return fs
    .readdirSync(localeDir)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => file.replace(".mdx", ""));
}

function getRepoPost(locale: string, slug: string): Post | null {
  const filePath = path.join(contentDir, locale, `${slug}.mdx`);

  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);

  const date =
    data.date instanceof Date
      ? data.date.toISOString().split("T")[0]
      : data.date;

  return {
    meta: { slug, ...data, date } as PostMeta,
    content,
    format: "mdx",
  };
}

/** A repo post first, then a post from Kasten. */
export async function getPostBySlug(
  locale: string,
  slug: string,
): Promise<Post | null> {
  const repo = getRepoPost(locale, slug);
  if (repo) return repo;

  const post = await getKastenPost(locale, slug);
  if (!post) return null;
  const { body, lang: _, ...meta } = post;
  return { meta, content: body, format: "md" };
}

/** Repo and Kasten posts, newest first. A repo post wins a shared slug. */
export async function getAllPosts(locale: string): Promise<PostMeta[]> {
  const slugs = await getPostSlugs(locale);
  const repo = slugs
    .map((slug) => getRepoPost(locale, slug)?.meta)
    .filter((p): p is PostMeta => p !== undefined);
  const taken = new Set(repo.map((p) => p.slug));
  const kasten = (await getKastenPosts(locale))
    .filter((p) => !taken.has(p.slug))
    .map(({ lang: _, ...meta }) => meta);

  return [...repo, ...kasten].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}
