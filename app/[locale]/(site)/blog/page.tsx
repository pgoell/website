import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { FrameTitle } from "@/components/frame/frame-title";
import s from "@/components/site/site.module.css";
import { getAllPosts, getPostBySlug } from "@/lib/posts";
import { readingMinutes } from "@/lib/site/sections";

/** Camera-style file name for the nth post: DSC_0001.MDX. */
const fileName = (n: number) => `DSC_${String(n).padStart(4, "0")}.MDX`;

export default async function BlogIndex({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("site.blog");
  const posts = await getAllPosts(locale);
  const minutes = await Promise.all(
    posts.map(async (p) => {
      const post = await getPostBySlug(locale, p.slug);
      return readingMinutes(post?.content ?? "");
    }),
  );

  return (
    <>
      <FrameTitle
        title={t("title")}
        sub={`${t("subtitle")} · ${t("count", { count: posts.length })}`}
      />
      {posts.length ? (
        <ol className={s.list}>
          {posts.map((post, i) => {
            const n = posts.length - i;
            return (
              <li key={post.slug}>
                <Link href={`/${locale}/blog/${post.slug}`} className={s.row}>
                  <span className={s.idx}>{String(n).padStart(3, "0")}</span>
                  <div>
                    <h2>{post.title}</h2>
                    {post.description && (
                      <p className={s.ex}>{post.description}</p>
                    )}
                  </div>
                  <div className={s.meta}>
                    <time dateTime={post.date}>{post.date}</time>
                    <br />
                    {t("minutes", { count: minutes[i] ?? 1 })}
                    <span className={s.file}>{fileName(n)}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className={s.empty}>{t("empty")}</p>
      )}
    </>
  );
}
