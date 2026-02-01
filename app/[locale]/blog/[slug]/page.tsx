import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { locales } from "@/i18n/config";
import { getPostBySlug, getPostSlugs } from "@/lib/posts";

export async function generateStaticParams() {
  const params: { locale: string; slug: string }[] = [];
  for (const locale of locales) {
    const slugs = await getPostSlugs(locale);
    for (const slug of slugs) {
      params.push({ locale, slug });
    }
  }
  return params;
}

export default async function BlogPost({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const post = await getPostBySlug(locale, slug);

  if (!post) notFound();

  return (
    <article>
      <Link
        href={`/${locale}/blog`}
        className="text-sm text-muted-foreground hover:text-foreground mb-1 inline-block"
      >
        ← go back
      </Link>
      <h1 className="text-3xl font-bold">{post.meta.title}</h1>
      <p className="text-sm text-muted-foreground mt-2 mb-8">
        {post.meta.date}
      </p>
      <div className="space-y-4">
        <MDXRemote source={post.content} />
      </div>
    </article>
  );
}
