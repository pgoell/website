import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const contentDir = path.join(process.cwd(), "content");

export interface PostMeta {
  slug: string;
  title: string;
  date: string;
  description: string;
  translationKey?: string;
}

export async function getPostSlugs(locale: string): Promise<string[]> {
  const localeDir = path.join(contentDir, locale);
  if (!fs.existsSync(localeDir)) return [];

  return fs
    .readdirSync(localeDir)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => file.replace(".mdx", ""));
}

export async function getPostBySlug(
  locale: string,
  slug: string,
): Promise<{ meta: PostMeta; content: string } | null> {
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
  };
}

export async function getAllPosts(locale: string): Promise<PostMeta[]> {
  const slugs = await getPostSlugs(locale);
  const posts = await Promise.all(
    slugs.map(async (slug) => {
      const post = await getPostBySlug(locale, slug);
      return post?.meta;
    }),
  );

  return posts
    .filter((p): p is PostMeta => p !== null)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
