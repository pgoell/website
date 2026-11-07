import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { MDXRemote } from "next-mdx-remote/rsc";
import { isValidElement, type ReactNode } from "react";
import { FrameTitle } from "@/components/frame/frame-title";
import s from "@/components/site/site.module.css";
import { cx } from "@/components/viewfinder/cx";
import { locales } from "@/i18n/config";
import { getAllPosts, getPostBySlug, getPostSlugs } from "@/lib/posts";
import { headings, readingMinutes, slugify } from "@/lib/site/sections";

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = await getPostBySlug(locale, slug);
  if (!post) return {};
  return {
    title: `${post.meta.title} · Pascal Göllner`,
    description: post.meta.description,
  };
}

/** The plain text inside a heading, for its id. */
function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return `${node}`;
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement<{ children?: ReactNode }>(node))
    return textOf(node.props.children);
  return "";
}

const components = {
  h2: ({ children }: { children?: ReactNode }) => (
    <h2 id={slugify(textOf(children))}>{children}</h2>
  ),
};

export default async function BlogPost({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const post = await getPostBySlug(locale, slug);
  if (!post) notFound();

  const t = await getTranslations("site.blog");
  const all = await getAllPosts(locale);
  const at = all.findIndex((p) => p.slug === slug);
  const newer = at > 0 ? all[at - 1] : undefined;
  const older = at >= 0 ? all[at + 1] : undefined;
  const n = at >= 0 ? all.length - at : 1;
  const toc = headings(post.content);

  return (
    <>
      <FrameTitle
        long
        title={post.meta.title}
        sub={post.meta.description ?? ""}
      />
      <div className={s.strip}>
        <span>
          {t("date")}
          <b>
            <time dateTime={post.meta.date}>{post.meta.date}</time>
          </b>
        </span>
        <span>
          {t("read")}
          <b>{t("minutes", { count: readingMinutes(post.content) })}</b>
        </span>
        <span>
          {t("file")}
          <b>DSC_{String(n).padStart(4, "0")}</b>
        </span>
      </div>
      <div className={cx(s.post, toc.length < 2 && s.solo)}>
        <article>
          <div className={s.prose}>
            <MDXRemote source={post.content} components={components} />
          </div>
          {(older || newer) && (
            <nav className={s.pager} aria-label={t("more")}>
              {older && (
                <Link href={`/${locale}/blog/${older.slug}`}>
                  <small>◂ {t("older")}</small>
                  <strong>{older.title}</strong>
                </Link>
              )}
              {newer && (
                <Link
                  href={`/${locale}/blog/${newer.slug}`}
                  className={s.newer}
                >
                  <small>{t("newer")} ▸</small>
                  <strong>{newer.title}</strong>
                </Link>
              )}
            </nav>
          )}
        </article>
        {toc.length >= 2 && (
          <nav className={s.contents} aria-label={t("contents")}>
            <ol>
              {toc.map((h, i) => (
                <li key={h.id}>
                  <a href={`#${h.id}`}>
                    <span className={s.idx}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {h.text}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}
      </div>
    </>
  );
}
